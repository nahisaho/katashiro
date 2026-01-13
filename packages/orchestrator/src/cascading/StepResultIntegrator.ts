/**
 * KATASHIRO v1.4.0 - Step Result Integrator
 *
 * 複数ステップの結果を統合し、矛盾検出と最終レポート生成を行う
 * v1.2.0のReportScorerのロジックを再利用
 */

import type {
  StepResult,
  Finding,
  CascadingSource,
  Contradiction,
  StepFocus,
} from './types.js';
import { generateContradictionId } from './types.js';

/**
 * 統合設定
 */
export interface IntegrationConfig {
  /** 矛盾検出の類似度閾値 */
  contradictionThreshold: number;
  /** 重複除去の類似度閾値 */
  deduplicationThreshold: number;
  /** 最終レポートに含める最大発見事項数 */
  maxFindingsInReport: number;
  /** 最終レポートに含める最大ソース数 */
  maxSourcesInReport: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  contradictionThreshold: 0.7,
  deduplicationThreshold: 0.8,
  maxFindingsInReport: 30,
  maxSourcesInReport: 20,
};

/**
 * 統合結果
 */
export interface IntegrationResult {
  /** 統合された発見事項 */
  findings: Finding[];
  /** 統合されたソース */
  sources: CascadingSource[];
  /** 検出された矛盾 */
  contradictions: Contradiction[];
  /** 残存ギャップ */
  remainingGaps: string[];
  /** 統合信頼度 */
  overallConfidence: number;
  /** 統合レポート */
  finalReport: string;
}

/**
 * ステップ結果統合クラス
 */
export class StepResultIntegrator {
  private readonly config: IntegrationConfig;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
  }

  /**
   * 全ステップの結果を統合
   */
  integrate(topic: string, stepResults: StepResult[]): IntegrationResult {
    // 1. 全発見事項を収集・重複除去
    const allFindings = this.collectAndDeduplicateFindings(stepResults);

    // 2. 全ソースを収集・重複除去
    const allSources = this.collectAndDeduplicateSources(stepResults);

    // 3. 矛盾を検出
    const contradictions = this.detectContradictions(allFindings);

    // 4. 残存ギャップを特定
    const remainingGaps = this.identifyRemainingGaps(stepResults);

    // 5. 全体信頼度を計算
    const overallConfidence = this.calculateOverallConfidence(stepResults, contradictions);

    // 6. 最終レポートを生成
    const finalReport = this.generateFinalReport(
      topic,
      stepResults,
      allFindings,
      allSources,
      contradictions,
      remainingGaps,
      overallConfidence
    );

    return {
      findings: allFindings.slice(0, this.config.maxFindingsInReport),
      sources: allSources.slice(0, this.config.maxSourcesInReport),
      contradictions,
      remainingGaps,
      overallConfidence,
      finalReport,
    };
  }

  /**
   * 発見事項を収集・重複除去
   */
  private collectAndDeduplicateFindings(stepResults: StepResult[]): Finding[] {
    // 全発見事項を収集
    const allFindings = stepResults.flatMap(sr => sr.findings);

    // 信頼度でソート
    allFindings.sort((a, b) => b.confidence - a.confidence);

    // 重複除去
    const deduplicated: Finding[] = [];
    for (const finding of allFindings) {
      const isDuplicate = deduplicated.some(
        existing => this.calculateSimilarity(existing.content, finding.content) > this.config.deduplicationThreshold
      );
      if (!isDuplicate) {
        deduplicated.push(finding);
      }
    }

    return deduplicated;
  }

  /**
   * ソースを収集・重複除去
   */
  private collectAndDeduplicateSources(stepResults: StepResult[]): CascadingSource[] {
    const allSources = stepResults.flatMap(sr => sr.sources);

    // URL重複除去
    const seen = new Map<string, CascadingSource>();
    for (const source of allSources) {
      if (!seen.has(source.url)) {
        seen.set(source.url, source);
      }
    }

    // 信頼度でソート
    return [...seen.values()].sort((a, b) => b.credibility - a.credibility);
  }

  /**
   * 矛盾を検出
   */
  private detectContradictions(findings: Finding[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // ペアごとに比較
    for (let i = 0; i < findings.length; i++) {
      for (let j = i + 1; j < findings.length; j++) {
        const f1 = findings[i];
        const f2 = findings[j];

        if (!f1 || !f2) continue;

        const contradictionScore = this.detectContradictionScore(f1.content, f2.content);
        if (contradictionScore > this.config.contradictionThreshold) {
          contradictions.push({
            id: generateContradictionId(),
            finding1: f1,
            finding2: f2,
            description: `発見事項間の矛盾を検出 (スコア: ${(contradictionScore * 100).toFixed(0)}%)`,
            severity: contradictionScore > 0.9 ? 'high' : contradictionScore > 0.8 ? 'medium' : 'low',
            resolved: false,
            resolution: this.suggestResolution(f1, f2),
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * 矛盾スコアを計算
   */
  private detectContradictionScore(text1: string, text2: string): number {
    // 否定パターンの検出
    const negationPatterns = [
      { positive: /増加|上昇|成長/, negative: /減少|下降|縮小/ },
      { positive: /賛成|支持|推進/, negative: /反対|批判|懸念/ },
      { positive: /成功|達成|実現/, negative: /失敗|未達|断念/ },
      { positive: /安全|安定|信頼/, negative: /危険|不安定|不信/ },
    ];

    let contradictionScore = 0;

    for (const pattern of negationPatterns) {
      const match1Positive = pattern.positive.test(text1);
      const match1Negative = pattern.negative.test(text1);
      const match2Positive = pattern.positive.test(text2);
      const match2Negative = pattern.negative.test(text2);

      if ((match1Positive && match2Negative) || (match1Negative && match2Positive)) {
        contradictionScore += 0.3;
      }
    }

    // 数値の矛盾検出
    const numbers1: string[] = text1.match(/\d+(?:\.\d+)?%?/g) ?? [];
    const numbers2: string[] = text2.match(/\d+(?:\.\d+)?%?/g) ?? [];

    if (numbers1.length > 0 && numbers2.length > 0) {
      // 同じトピックで異なる数値が報告されている場合
      const topicSimilarity = this.calculateSimilarity(
        text1.replace(/\d+(?:\.\d+)?%?/g, ''),
        text2.replace(/\d+(?:\.\d+)?%?/g, '')
      );

      // トピックが似ているが数値が異なる
      if (topicSimilarity > 0.7) {
        // トピックが似ているが数値が異なる
        const hasNumberDifference = !numbers1.some(n1 => numbers2.includes(n1));
        if (hasNumberDifference) {
          contradictionScore += 0.2;
        }
      }
    }

    return Math.min(contradictionScore, 1.0);
  }

  /**
   * テキスト類似度を計算（Jaccard係数）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * テキストをトークン化
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  /**
   * 矛盾解決の提案
   */
  private suggestResolution(f1: Finding, f2: Finding): string {
    // 信頼度の高い方を優先
    if (f1.confidence > f2.confidence + 0.2) {
      return `より信頼度の高い「${f1.source.title}」の情報を優先することを推奨`;
    }
    if (f2.confidence > f1.confidence + 0.2) {
      return `より信頼度の高い「${f2.source.title}」の情報を優先することを推奨`;
    }

    // 日付の新しい方を優先
    const date1 = new Date(f1.timestamp);
    const date2 = new Date(f2.timestamp);
    if (date1 > date2) {
      return `より新しい情報である「${f1.source.title}」を優先することを推奨`;
    }
    if (date2 > date1) {
      return `より新しい情報である「${f2.source.title}」を優先することを推奨`;
    }

    return '両方のソースを確認し、追加調査を推奨';
  }

  /**
   * 残存ギャップを特定
   */
  private identifyRemainingGaps(stepResults: StepResult[]): string[] {
    // 最後のステップまでに解決されなかったギャップを収集
    const allGaps = new Set<string>();
    const addressedTopics = new Set<string>();

    // 各ステップのギャップと発見事項を収集
    for (const result of stepResults) {
      for (const gap of result.gaps) {
        allGaps.add(gap);
      }
      for (const finding of result.findings) {
        // 発見事項のトピックをアドレス済みとしてマーク
        const words = this.tokenize(finding.content);
        words.forEach(w => addressedTopics.add(w));
      }
    }

    // 解決されていないギャップを特定
    const remainingGaps: string[] = [];
    for (const gap of allGaps) {
      const gapWords = this.tokenize(gap);
      const addressed = gapWords.some(w => addressedTopics.has(w));
      if (!addressed) {
        remainingGaps.push(gap);
      }
    }

    return remainingGaps;
  }

  /**
   * 全体信頼度を計算
   */
  private calculateOverallConfidence(stepResults: StepResult[], contradictions: Contradiction[]): number {
    if (stepResults.length === 0) {
      return 0;
    }

    // 各ステップの信頼度の加重平均
    const stepWeights = [0.15, 0.2, 0.2, 0.2, 0.25]; // 後半のステップを重視
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < stepResults.length; i++) {
      const weight = stepWeights[i] || 0.2;
      const result = stepResults[i];
      if (result) {
        weightedSum += result.confidence * weight;
        totalWeight += weight;
      }
    }

    let confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // 矛盾によるペナルティ
    const highSeverityCount = contradictions.filter(c => c.severity === 'high').length;
    const mediumSeverityCount = contradictions.filter(c => c.severity === 'medium').length;
    const contradictionPenalty = highSeverityCount * 0.1 + mediumSeverityCount * 0.05;

    confidence = Math.max(0, confidence - contradictionPenalty);

    return Math.round(confidence * 100) / 100;
  }

  /**
   * 最終レポートを生成
   */
  private generateFinalReport(
    topic: string,
    stepResults: StepResult[],
    findings: Finding[],
    sources: CascadingSource[],
    contradictions: Contradiction[],
    remainingGaps: string[],
    overallConfidence: number
  ): string {
    const sections: string[] = [];

    // ヘッダー
    sections.push(`# ${topic} - カスケード型リサーチレポート\n`);
    sections.push(`生成日時: ${new Date().toISOString()}\n`);
    sections.push(`総合信頼度: ${(overallConfidence * 100).toFixed(0)}%\n\n`);

    // エグゼクティブサマリー
    sections.push(`## エグゼクティブサマリー\n`);
    sections.push(this.generateExecutiveSummary(stepResults, findings, overallConfidence));
    sections.push('\n');

    // ステップ別サマリー
    sections.push(`## 調査プロセス概要\n`);
    for (const result of stepResults) {
      const focusLabel = this.getFocusLabel(result.focus);
      sections.push(`### Step ${result.stepNumber}: ${focusLabel}\n`);
      sections.push(`- 発見事項: ${result.findings.length}件\n`);
      sections.push(`- ソース数: ${result.sources.length}件\n`);
      sections.push(`- 信頼度: ${(result.confidence * 100).toFixed(0)}%\n`);
      sections.push(`- 処理時間: ${(result.durationMs / 1000).toFixed(1)}秒\n\n`);
    }

    // 主要な発見事項
    sections.push(`## 主要な発見事項\n`);
    const topFindings = findings.slice(0, 10);
    for (let i = 0; i < topFindings.length; i++) {
      const finding = topFindings[i];
      if (!finding) continue;
      sections.push(`### ${i + 1}. ${finding.category === 'fact' ? '事実' : finding.category === 'analysis' ? '分析' : finding.category === 'opinion' ? '意見' : '情報'}\n`);
      sections.push(`${finding.content.slice(0, 300)}${finding.content.length > 300 ? '...' : ''}\n`);
      sections.push(`- ソース: ${finding.source.title}\n`);
      sections.push(`- 信頼度: ${(finding.confidence * 100).toFixed(0)}%\n\n`);
    }

    // 矛盾情報
    if (contradictions.length > 0) {
      sections.push(`## 検出された矛盾・不整合\n`);
      sections.push(`⚠️ ${contradictions.length}件の矛盾が検出されました。\n\n`);
      for (const contradiction of contradictions.slice(0, 5)) {
        sections.push(`- **${contradiction.severity.toUpperCase()}**: ${contradiction.description}\n`);
        sections.push(`  - 解決提案: ${contradiction.resolution}\n\n`);
      }
    }

    // 残存ギャップ
    if (remainingGaps.length > 0) {
      sections.push(`## 未解決のギャップ\n`);
      sections.push(`以下の点についてはさらなる調査が必要です:\n\n`);
      for (const gap of remainingGaps) {
        sections.push(`- ${gap}\n`);
      }
      sections.push('\n');
    }

    // ソース一覧
    sections.push(`## 参考ソース\n`);
    const topSources = sources.slice(0, this.config.maxSourcesInReport);
    for (const source of topSources) {
      sections.push(`- [${source.title}](${source.url}) (信頼度: ${(source.credibility * 100).toFixed(0)}%)\n`);
    }

    return sections.join('');
  }

  /**
   * エグゼクティブサマリーを生成
   */
  private generateExecutiveSummary(
    stepResults: StepResult[],
    findings: Finding[],
    overallConfidence: number
  ): string {
    const totalFindings = findings.length;
    const factCount = findings.filter(f => f.category === 'fact').length;
    const analysisCount = findings.filter(f => f.category === 'analysis').length;
    const totalSteps = stepResults.length;
    const totalDuration = stepResults.reduce((sum, r) => sum + r.durationMs, 0);

    let summary = `本レポートは${totalSteps}段階のカスケード型リサーチにより、`;
    summary += `計${totalFindings}件の発見事項を収集・統合したものです。\n\n`;
    summary += `- **事実情報**: ${factCount}件\n`;
    summary += `- **分析・考察**: ${analysisCount}件\n`;
    summary += `- **総調査時間**: ${(totalDuration / 1000).toFixed(1)}秒\n`;
    summary += `- **総合信頼度**: ${(overallConfidence * 100).toFixed(0)}%\n`;

    return summary;
  }

  /**
   * フォーカスラベルを取得
   */
  private getFocusLabel(focus: StepFocus): string {
    const labels: Record<StepFocus, string> = {
      overview: '概要調査',
      detail: '詳細調査',
      gap: 'ギャップ分析',
      verify: '検証',
      integrate: '統合',
    };
    return labels[focus] || focus;
  }
}
