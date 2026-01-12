/**
 * QualityGate
 * 品質基準自動チェック
 *
 * @module workflow/quality-gate
 */

import { QualityCheck, QualityCheckResult, QualityGateResult } from './types.js';

/**
 * 品質ゲート
 * コンテンツの品質を複数の基準でチェックし、通過判定を行う
 */
export class QualityGate {
  private checks: Map<string, QualityCheck> = new Map();
  private defaultThreshold = 70;

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * デフォルトの品質チェックを登録
   */
  private registerDefaultChecks(): void {
    // 長さチェック
    this.registerCheck({
      name: 'length',
      weight: 1,
      enabled: true,
      check: async (content: string, options?: unknown) => {
        const opts = options as { minLength?: number; maxLength?: number } | undefined;
        const minLength = opts?.minLength ?? 100;
        const maxLength = opts?.maxLength ?? 50000;
        const length = content.length;

        let score = 100;
        let passed = true;
        let message = '適切な長さです';

        if (length < minLength) {
          score = Math.floor((length / minLength) * 100);
          passed = false;
          message = `コンテンツが短すぎます（${length}文字 / 最小${minLength}文字）`;
        } else if (length > maxLength) {
          score = Math.max(0, 100 - Math.floor(((length - maxLength) / maxLength) * 100));
          passed = false;
          message = `コンテンツが長すぎます（${length}文字 / 最大${maxLength}文字）`;
        }

        return {
          name: 'length',
          passed,
          score,
          threshold: this.defaultThreshold,
          message,
          suggestions: passed ? undefined : ['コンテンツの長さを調整してください'],
        };
      },
    });

    // 可読性チェック
    this.registerCheck({
      name: 'readability',
      weight: 2,
      enabled: true,
      check: async (content: string) => {
        const score = this.calculateReadabilityScore(content);
        const passed = score >= this.defaultThreshold;

        return {
          name: 'readability',
          passed,
          score,
          threshold: this.defaultThreshold,
          message: passed
            ? '読みやすいコンテンツです'
            : '可読性に改善の余地があります',
          suggestions: passed
            ? undefined
            : [
                '文章を短くしてください',
                '難しい単語を避けてください',
                '箇条書きを活用してください',
              ],
        };
      },
    });

    // 構造チェック
    this.registerCheck({
      name: 'structure',
      weight: 1.5,
      enabled: true,
      check: async (content: string) => {
        const result = this.analyzeStructure(content);
        return {
          name: 'structure',
          passed: result.passed,
          score: result.score,
          threshold: this.defaultThreshold,
          message: result.message,
          suggestions: result.suggestions,
        };
      },
    });

    // 重複チェック
    this.registerCheck({
      name: 'duplication',
      weight: 1,
      enabled: true,
      check: async (content: string) => {
        const result = this.checkDuplication(content);
        return {
          name: 'duplication',
          passed: result.passed,
          score: result.score,
          threshold: this.defaultThreshold,
          message: result.message,
          suggestions: result.suggestions,
        };
      },
    });

    // 完全性チェック
    this.registerCheck({
      name: 'completeness',
      weight: 2,
      enabled: true,
      check: async (content: string) => {
        const result = this.checkCompleteness(content);
        return {
          name: 'completeness',
          passed: result.passed,
          score: result.score,
          threshold: this.defaultThreshold,
          message: result.message,
          suggestions: result.suggestions,
        };
      },
    });
  }

  /**
   * 品質チェックを登録
   */
  registerCheck(check: QualityCheck): void {
    this.checks.set(check.name, check);
  }

  /**
   * 品質チェックを削除
   */
  unregisterCheck(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * 品質チェックを有効/無効化
   */
  setCheckEnabled(name: string, enabled: boolean): void {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = enabled;
    }
  }

  /**
   * 品質ゲートを実行
   */
  async evaluate(
    content: string,
    options?: {
      threshold?: number;
      checks?: string[];
      checkOptions?: Record<string, unknown>;
    }
  ): Promise<QualityGateResult> {
    const threshold = options?.threshold ?? this.defaultThreshold;
    const enabledChecks = options?.checks
      ? Array.from(this.checks.values()).filter(
          (c) => c.enabled && options.checks?.includes(c.name)
        )
      : Array.from(this.checks.values()).filter((c) => c.enabled);

    const results: QualityCheckResult[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of enabledChecks) {
      const result = await check.check(content, options?.checkOptions?.[check.name]);
      results.push({
        ...result,
        threshold,
      });
      totalWeight += check.weight;
      weightedScore += result.score * check.weight;
    }

    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const passed = overallScore >= threshold && results.every((r) => r.passed || r.score >= threshold * 0.5);

    const failedChecks = results.filter((r) => !r.passed);
    const summary =
      failedChecks.length === 0
        ? `全${results.length}項目の品質チェックに合格しました（スコア: ${overallScore}点）`
        : `${failedChecks.length}/${results.length}項目で改善が必要です（スコア: ${overallScore}点）`;

    return {
      passed,
      overallScore,
      checks: results,
      checkedAt: new Date(),
      summary,
    };
  }

  /**
   * 可読性スコアを計算
   */
  private calculateReadabilityScore(content: string): number {
    // 簡易的な可読性スコア計算
    const sentences = content.split(/[。！？\.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

    if (sentences.length === 0) return 0;

    // 平均文長（文字数）
    const avgSentenceLength = content.length / sentences.length;

    // スコア計算（文が短いほど高スコア）
    let score = 100;

    // 平均文長が60文字を超えると減点
    if (avgSentenceLength > 60) {
      score -= Math.min(30, (avgSentenceLength - 60) * 0.5);
    }

    // 段落が少ないと減点
    if (paragraphs.length < 3 && content.length > 500) {
      score -= 10;
    }

    // 極端に長い文があると減点
    const longSentences = sentences.filter((s) => s.length > 100);
    if (longSentences.length > 0) {
      score -= Math.min(20, longSentences.length * 5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 構造を分析
   */
  private analyzeStructure(content: string): {
    passed: boolean;
    score: number;
    message: string;
    suggestions?: string[];
  } {
    const lines = content.split('\n');
    const headings = lines.filter((l) => /^#{1,6}\s/.test(l));
    const lists = lines.filter((l) => /^[\s]*[-*•]\s/.test(l) || /^[\s]*\d+\.\s/.test(l));
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

    let score = 100;
    const suggestions: string[] = [];

    // 見出しがない
    if (headings.length === 0 && content.length > 500) {
      score -= 20;
      suggestions.push('見出しを追加してください');
    }

    // リストがない
    if (lists.length === 0 && content.length > 1000) {
      score -= 10;
      suggestions.push('箇条書きを活用してください');
    }

    // 段落が少ない
    if (paragraphs.length < 3 && content.length > 500) {
      score -= 15;
      suggestions.push('適切に段落を分けてください');
    }

    // 見出しレベルの飛び
    const headingLevels = headings.map((h) => {
      const match = h.match(/^(#{1,6})/);
      return match?.[1]?.length ?? 0;
    });
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i] ?? 0;
      const prev = headingLevels[i - 1] ?? 0;
      if (current > prev + 1) {
        score -= 10;
        suggestions.push('見出しレベルを順番に使用してください');
        break;
      }
    }

    const passed = score >= this.defaultThreshold;
    const message = passed
      ? '良い構造のコンテンツです'
      : '構造に改善の余地があります';

    return { passed, score, message, suggestions: suggestions.length > 0 ? suggestions : undefined };
  }

  /**
   * 重複をチェック
   */
  private checkDuplication(content: string): {
    passed: boolean;
    score: number;
    message: string;
    suggestions?: string[];
  } {
    const sentences = content.split(/[。！？\.!?]+/).filter((s) => s.trim().length > 10);
    const normalizedSentences = sentences.map((s) => s.trim().toLowerCase());
    const duplicates = new Set<string>();

    for (let i = 0; i < normalizedSentences.length; i++) {
      for (let j = i + 1; j < normalizedSentences.length; j++) {
        const s1 = normalizedSentences[i] ?? '';
        const s2 = normalizedSentences[j] ?? '';
        if (s1 && s2 && this.isSimilar(s1, s2)) {
          duplicates.add(sentences[i] ?? '');
        }
      }
    }

    const duplicationRate = sentences.length > 0 ? duplicates.size / sentences.length : 0;
    const score = Math.round((1 - duplicationRate) * 100);
    const passed = score >= this.defaultThreshold;

    return {
      passed,
      score,
      message: passed
        ? '重複は検出されませんでした'
        : `${duplicates.size}件の類似/重複文が検出されました`,
      suggestions: passed ? undefined : ['重複した内容を統合または削除してください'],
    };
  }

  /**
   * 文が類似しているかチェック
   */
  private isSimilar(s1: string, s2: string): boolean {
    // 完全一致
    if (s1 === s2) return true;

    // 長さが大きく異なる場合は類似ではない
    if (Math.abs(s1.length - s2.length) > s1.length * 0.3) return false;

    // 簡易的なLCS（Longest Common Subsequence）で類似度を判定
    const lcsLength = this.lcsLength(s1, s2);
    const similarity = (2 * lcsLength) / (s1.length + s2.length);

    return similarity > 0.8;
  }

  /**
   * LCS長を計算
   */
  private lcsLength(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
        } else {
          dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
        }
      }
    }

    return dp[m]?.[n] ?? 0;
  }

  /**
   * 完全性をチェック
   */
  private checkCompleteness(content: string): {
    passed: boolean;
    score: number;
    message: string;
    suggestions?: string[];
  } {
    let score = 100;
    const suggestions: string[] = [];

    // 導入がない
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0]!;
      if (firstPara.length < 50 && !firstPara.startsWith('#')) {
        score -= 10;
        suggestions.push('適切な導入文を追加してください');
      }
    }

    // 結論がない
    if (paragraphs.length > 0) {
      const lastPara = paragraphs[paragraphs.length - 1]!;
      const conclusionKeywords = ['まとめ', '結論', '終わりに', 'conclusion', 'summary'];
      const hasConclusion = conclusionKeywords.some(
        (k) =>
          lastPara.toLowerCase().includes(k) ||
          content.toLowerCase().includes(`# ${k}`) ||
          content.toLowerCase().includes(`## ${k}`)
      );
      if (!hasConclusion && content.length > 1000) {
        score -= 15;
        suggestions.push('まとめや結論を追加してください');
      }
    }

    // 参考文献がない（学術的なコンテンツの場合）
    const hasReferences =
      content.includes('参考文献') ||
      content.includes('References') ||
      content.includes('参照') ||
      /\[\d+\]/.test(content) ||
      /\[.*?\]\(http/.test(content);
    if (!hasReferences && content.length > 2000) {
      score -= 10;
      suggestions.push('参考文献やリンクを追加してください');
    }

    // TODO/FIXMEが残っている
    if (/TODO|FIXME|XXX/i.test(content)) {
      score -= 20;
      suggestions.push('未完成の部分（TODO/FIXME）を完成させてください');
    }

    const passed = score >= this.defaultThreshold;

    return {
      passed,
      score,
      message: passed ? 'コンテンツは完全です' : 'コンテンツに不足があります',
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * 登録済みチェックを取得
   */
  getChecks(): QualityCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * デフォルト閾値を設定
   */
  setDefaultThreshold(threshold: number): void {
    this.defaultThreshold = Math.max(0, Math.min(100, threshold));
  }
}

/**
 * 品質チェッカーを作成
 */
export function createQualityCheck(
  name: string,
  check: (content: string, options?: unknown) => Promise<QualityCheckResult>,
  options?: { weight?: number; enabled?: boolean }
): QualityCheck {
  return {
    name,
    check,
    weight: options?.weight ?? 1,
    enabled: options?.enabled ?? true,
  };
}
