/**
 * Evaluation Reporter
 *
 * 評価結果をMarkdownレポートに出力するユーティリティ
 *
 * @requirement REQ-EVAL-103
 */

import type { EvaluationResult, EvaluationMetadata } from '../types.js';

/**
 * レポート設定
 */
export interface EvaluationReportConfig {
  /** レポートタイトル */
  title?: string;
  /** 説明 */
  description?: string;
  /** スコアしきい値（合格基準） */
  passThreshold?: number;
  /** 詳細表示 */
  includeDetails?: boolean;
  /** メタデータ表示 */
  includeMetadata?: boolean;
  /** タイムスタンプ表示 */
  includeTimestamp?: boolean;
  /** サマリー統計表示 */
  includeSummary?: boolean;
  /** 言語 */
  language?: 'en' | 'ja';
}

/**
 * レポートセクション
 */
export interface ReportSection {
  /** セクションタイトル */
  title: string;
  /** コンテンツ */
  content: string;
}

/**
 * 評価レポートデータ
 */
export interface EvaluationReportData {
  /** 評価結果一覧 */
  results: EvaluationResult[];
  /** データセット名 */
  datasetName?: string;
  /** 実行日時 */
  executedAt?: string;
  /** 実行時間（ミリ秒） */
  durationMs?: number;
  /** 追加セクション */
  additionalSections?: ReportSection[];
}

/**
 * サマリー統計
 */
export interface SummaryStatistics {
  /** 総件数 */
  total: number;
  /** 合格件数 */
  passed: number;
  /** 不合格件数 */
  failed: number;
  /** 合格率 */
  passRate: number;
  /** 平均スコア */
  avgScore: number;
  /** 最小スコア */
  minScore: number;
  /** 最大スコア */
  maxScore: number;
  /** 標準偏差 */
  stdDev: number;
  /** 評価器別スコア */
  byEvaluator: Map<string, { avg: number; count: number }>;
}

/**
 * デフォルト設定
 */
export const DEFAULT_REPORT_CONFIG: Required<EvaluationReportConfig> = {
  title: 'Evaluation Report',
  description: '',
  passThreshold: 0.7,
  includeDetails: true,
  includeMetadata: true,
  includeTimestamp: true,
  includeSummary: true,
  language: 'en',
};

/**
 * 評価レポーター
 */
export class EvaluationReporter {
  private config: Required<EvaluationReportConfig>;

  constructor(config: EvaluationReportConfig = {}) {
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config };
  }

  /**
   * Markdownレポートを生成
   */
  generate(data: EvaluationReportData): string {
    const sections: string[] = [];

    // ヘッダー
    sections.push(this.generateHeader(data));

    // サマリー
    if (this.config.includeSummary) {
      const stats = this.calculateStatistics(data.results);
      sections.push(this.generateSummary(stats));
    }

    // 評価結果テーブル
    sections.push(this.generateResultsTable(data.results));

    // 詳細
    if (this.config.includeDetails) {
      sections.push(this.generateDetails(data.results));
    }

    // 追加セクション
    if (data.additionalSections) {
      for (const section of data.additionalSections) {
        sections.push(`## ${section.title}\n\n${section.content}`);
      }
    }

    // フッター
    if (this.config.includeTimestamp) {
      sections.push(this.generateFooter(data));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * 統計情報を計算
   */
  calculateStatistics(results: EvaluationResult[]): SummaryStatistics {
    if (results.length === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        stdDev: 0,
        byEvaluator: new Map(),
      };
    }

    const scores = results.map((r) => r.normalizedScore);
    const passed = results.filter(
      (r) => r.passed ?? r.normalizedScore >= this.config.passThreshold,
    ).length;

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

    // 評価器別集計
    const byEvaluator = new Map<string, { avg: number; count: number }>();
    for (const result of results) {
      const existing = byEvaluator.get(result.evaluator);
      if (existing) {
        existing.avg =
          (existing.avg * existing.count + result.normalizedScore) /
          (existing.count + 1);
        existing.count++;
      } else {
        byEvaluator.set(result.evaluator, {
          avg: result.normalizedScore,
          count: 1,
        });
      }
    }

    return {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: passed / results.length,
      avgScore,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      stdDev: Math.sqrt(variance),
      byEvaluator,
    };
  }

  /**
   * ヘッダーセクション生成
   */
  private generateHeader(data: EvaluationReportData): string {
    const lines: string[] = [];

    lines.push(`# ${this.config.title}`);

    if (this.config.description) {
      lines.push('');
      lines.push(this.config.description);
    }

    if (data.datasetName) {
      lines.push('');
      lines.push(
        this.config.language === 'ja'
          ? `**データセット**: ${data.datasetName}`
          : `**Dataset**: ${data.datasetName}`,
      );
    }

    return lines.join('\n');
  }

  /**
   * サマリーセクション生成
   */
  private generateSummary(stats: SummaryStatistics): string {
    const isJa = this.config.language === 'ja';
    const lines: string[] = [];

    lines.push(isJa ? '## 📊 サマリー' : '## 📊 Summary');
    lines.push('');

    // メトリクステーブル
    lines.push(isJa ? '| 指標 | 値 |' : '| Metric | Value |');
    lines.push('|------|-----|');
    lines.push(
      isJa
        ? `| 総件数 | ${stats.total} |`
        : `| Total | ${stats.total} |`,
    );
    lines.push(
      isJa
        ? `| 合格 | ${stats.passed} (${(stats.passRate * 100).toFixed(1)}%) |`
        : `| Passed | ${stats.passed} (${(stats.passRate * 100).toFixed(1)}%) |`,
    );
    lines.push(
      isJa
        ? `| 不合格 | ${stats.failed} |`
        : `| Failed | ${stats.failed} |`,
    );
    lines.push(
      isJa
        ? `| 平均スコア | ${stats.avgScore.toFixed(3)} |`
        : `| Avg Score | ${stats.avgScore.toFixed(3)} |`,
    );
    lines.push(
      isJa
        ? `| 最小/最大 | ${stats.minScore.toFixed(3)} / ${stats.maxScore.toFixed(3)} |`
        : `| Min/Max | ${stats.minScore.toFixed(3)} / ${stats.maxScore.toFixed(3)} |`,
    );
    lines.push(
      isJa
        ? `| 標準偏差 | ${stats.stdDev.toFixed(3)} |`
        : `| Std Dev | ${stats.stdDev.toFixed(3)} |`,
    );

    // 評価器別
    if (stats.byEvaluator.size > 1) {
      lines.push('');
      lines.push(isJa ? '### 評価器別スコア' : '### Scores by Evaluator');
      lines.push('');
      lines.push(
        isJa
          ? '| 評価器 | 平均スコア | 件数 |'
          : '| Evaluator | Avg Score | Count |',
      );
      lines.push('|--------|------------|-------|');

      for (const [evaluator, data] of stats.byEvaluator) {
        lines.push(`| ${evaluator} | ${data.avg.toFixed(3)} | ${data.count} |`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 結果テーブル生成
   */
  private generateResultsTable(results: EvaluationResult[]): string {
    const isJa = this.config.language === 'ja';
    const lines: string[] = [];

    lines.push(isJa ? '## 📋 評価結果' : '## 📋 Results');
    lines.push('');

    if (results.length === 0) {
      lines.push(isJa ? '_結果がありません_' : '_No results_');
      return lines.join('\n');
    }

    lines.push(
      isJa
        ? '| # | 評価器 | スコア | 正規化 | 結果 |'
        : '| # | Evaluator | Score | Normalized | Status |',
    );
    lines.push('|---|--------|-------|----------|--------|');

    results.forEach((result, index) => {
      const passed = result.passed ?? result.normalizedScore >= this.config.passThreshold;
      const statusIcon = passed ? '✅' : '❌';
      lines.push(
        `| ${index + 1} | ${result.evaluator} | ${result.score.toFixed(3)} | ${result.normalizedScore.toFixed(3)} | ${statusIcon} |`,
      );
    });

    return lines.join('\n');
  }

  /**
   * 詳細セクション生成
   */
  private generateDetails(results: EvaluationResult[]): string {
    const isJa = this.config.language === 'ja';
    const lines: string[] = [];

    lines.push(isJa ? '## 📝 詳細' : '## 📝 Details');

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result) continue;

      lines.push('');
      lines.push(`### ${i + 1}. ${result.evaluator}`);
      lines.push('');

      const passed = result.passed ?? result.normalizedScore >= this.config.passThreshold;
      lines.push(
        isJa
          ? `- **スコア**: ${result.score.toFixed(3)} (正規化: ${result.normalizedScore.toFixed(3)})`
          : `- **Score**: ${result.score.toFixed(3)} (normalized: ${result.normalizedScore.toFixed(3)})`,
      );
      lines.push(
        isJa
          ? `- **結果**: ${passed ? '✅ 合格' : '❌ 不合格'}`
          : `- **Status**: ${passed ? '✅ Passed' : '❌ Failed'}`,
      );

      if (result.reasoning) {
        lines.push('');
        lines.push(isJa ? '**理由**:' : '**Reasoning**:');
        lines.push('');
        lines.push(`> ${result.reasoning}`);
      }

      if (this.config.includeMetadata && result.metadata) {
        lines.push('');
        lines.push(this.formatMetadata(result.metadata));
      }
    }

    return lines.join('\n');
  }

  /**
   * メタデータをフォーマット
   */
  private formatMetadata(metadata: EvaluationMetadata): string {
    const isJa = this.config.language === 'ja';
    const lines: string[] = [];

    lines.push('<details>');
    lines.push(`<summary>${isJa ? 'メタデータ' : 'Metadata'}</summary>`);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(metadata, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('</details>');

    return lines.join('\n');
  }

  /**
   * フッター生成
   */
  private generateFooter(data: EvaluationReportData): string {
    const isJa = this.config.language === 'ja';
    const lines: string[] = [];

    lines.push('---');
    lines.push('');

    const timestamp = data.executedAt ?? new Date().toISOString();
    lines.push(
      isJa
        ? `_生成日時: ${timestamp}_`
        : `_Generated at: ${timestamp}_`,
    );

    if (data.durationMs !== undefined) {
      lines.push(
        isJa
          ? `_実行時間: ${data.durationMs}ms_`
          : `_Duration: ${data.durationMs}ms_`,
      );
    }

    lines.push('');
    lines.push('_Powered by KATASHIRO Evaluation Framework_');

    return lines.join('\n');
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<EvaluationReportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): Required<EvaluationReportConfig> {
    return { ...this.config };
  }
}

/**
 * 簡易レポート生成ヘルパー
 */
export function generateEvaluationReport(
  results: EvaluationResult[],
  config?: EvaluationReportConfig,
): string {
  const reporter = new EvaluationReporter(config);
  return reporter.generate({ results });
}
