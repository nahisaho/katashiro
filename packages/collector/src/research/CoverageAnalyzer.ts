/**
 * CoverageAnalyzer - カバレッジ分析
 *
 * 検索結果のソースカバレッジと品質を分析する。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type {
  CoverageReport,
  SourceType,
  TemporalCoverage,
  CoverageGap,
  TimeDistribution,
} from './types.js';
import type { AgentExecutionResult } from './agents/types.js';

/**
 * カバレッジ分析クラス
 *
 * @example
 * ```typescript
 * const analyzer = new CoverageAnalyzer();
 * const coverage = analyzer.analyze(results, ['web', 'news', 'academic']);
 * ```
 */
export class CoverageAnalyzer {
  /**
   * カバレッジを分析
   */
  analyze(results: AgentExecutionResult[], expectedSources: SourceType[]): CoverageReport {
    const coveredSources = results
      .filter((r) => r.result.status === 'success' || r.result.status === 'partial')
      .map((r) => r.agent.type);

    const failedSources = results
      .filter((r) => r.result.status === 'failed' || r.result.status === 'timeout')
      .map((r) => r.agent.type);

    // カバレッジ率を計算
    const coverageRate = coveredSources.length / Math.max(expectedSources.length, 1);

    // 観点の多様性を計算
    const perspectiveDiversity = this.calculatePerspectiveDiversity(coveredSources);

    // 時間的カバレッジを分析
    const temporalCoverage = this.analyzeTemporalCoverage(results);

    // ギャップを識別
    const gaps = this.identifyGaps(expectedSources, coveredSources, results);

    // 追加推奨ソースを提案
    const suggestedSources = this.suggestAdditionalSources(coveredSources, expectedSources);

    return {
      coveredSources,
      failedSources,
      coverageRate,
      perspectiveDiversity,
      temporalCoverage,
      suggestedSources,
      gaps,
    };
  }

  /**
   * 観点の多様性を計算
   *
   * ソースタイプの多様性に基づいてスコアを算出。
   * 異なるカテゴリ（web, news, academic, encyclopedia）をカバーするほど高スコア。
   */
  private calculatePerspectiveDiversity(coveredSources: SourceType[]): number {
    // ソースタイプを大カテゴリに分類
    const categories = {
      general: ['web'] as SourceType[],
      news: ['news'] as SourceType[],
      academic: ['academic'] as SourceType[],
      reference: ['encyclopedia', 'government'] as SourceType[],
      social: ['social'] as SourceType[],
    };

    // カバーしているカテゴリ数を計算
    let coveredCategories = 0;
    const totalCategories = Object.keys(categories).length;

    for (const [, sourceTypes] of Object.entries(categories)) {
      if (sourceTypes.some((st) => coveredSources.includes(st))) {
        coveredCategories++;
      }
    }

    return coveredCategories / totalCategories;
  }

  /**
   * 時間的カバレッジを分析
   */
  private analyzeTemporalCoverage(
    results: AgentExecutionResult[]
  ): TemporalCoverage | undefined {
    const allFindings = results.flatMap((r) => r.result.findings);
    const datedFindings = allFindings.filter((f) => f.publishedAt);

    if (datedFindings.length === 0) {
      return undefined;
    }

    const dates = datedFindings
      .map((f) => f.publishedAt!)
      .sort((a, b) => a.getTime() - b.getTime());

    const distribution = this.calculateTimeDistribution(dates);

    return {
      oldestResult: dates[0],
      newestResult: dates[dates.length - 1],
      distribution,
    };
  }

  /**
   * 時間分布を計算
   */
  private calculateTimeDistribution(dates: Date[]): TimeDistribution[] {
    const now = new Date();
    const periods = [
      { label: 'Last 24h', days: 1 },
      { label: 'Last week', days: 7 },
      { label: 'Last month', days: 30 },
      { label: 'Last year', days: 365 },
      { label: 'Older', days: Infinity },
    ];

    const distribution: TimeDistribution[] = [];

    for (const period of periods) {
      const cutoff = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const count = dates.filter((d) => {
        if (period.days === Infinity) {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return d < yearAgo;
        }
        const prevCutoff =
          periods[periods.indexOf(period) - 1]?.days ?? 0;
        const prevDate = new Date(now.getTime() - prevCutoff * 24 * 60 * 60 * 1000);
        return d >= cutoff && d < prevDate;
      }).length;

      distribution.push({ period: period.label, count });
    }

    return distribution;
  }

  /**
   * ギャップを識別
   */
  private identifyGaps(
    expectedSources: SourceType[],
    coveredSources: SourceType[],
    results: AgentExecutionResult[]
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    // ソースギャップ
    const missingSources = expectedSources.filter((s) => !coveredSources.includes(s));
    if (missingSources.length > 0) {
      gaps.push({
        type: 'source',
        description: `Missing sources: ${missingSources.join(', ')}`,
        suggestion: `Add ${missingSources[0]} agent or retry failed sources`,
      });
    }

    // 結果数が少ない場合
    const totalResults = results.reduce((sum, r) => sum + r.result.findings.length, 0);
    if (totalResults < 5) {
      gaps.push({
        type: 'perspective',
        description: 'Very few results found',
        suggestion: 'Try broadening the search query or using different keywords',
      });
    }

    // 学術ソースがない場合
    if (!coveredSources.includes('academic') && expectedSources.includes('academic')) {
      gaps.push({
        type: 'perspective',
        description: 'No academic/research perspective',
        suggestion: 'Consider adding academic sources for authoritative information',
      });
    }

    return gaps;
  }

  /**
   * 追加推奨ソースを提案
   */
  private suggestAdditionalSources(
    coveredSources: SourceType[],
    expectedSources: SourceType[]
  ): SourceType[] {
    const allPossibleSources: SourceType[] = [
      'web',
      'news',
      'academic',
      'encyclopedia',
    ];

    // まだカバーしていないソースを提案
    return allPossibleSources.filter(
      (s) => !coveredSources.includes(s) && !expectedSources.includes(s)
    );
  }
}
