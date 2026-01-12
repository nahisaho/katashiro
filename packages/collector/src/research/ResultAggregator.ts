/**
 * ResultAggregator - 結果集約
 *
 * 複数エージェントの結果を集約・重複排除・ランキングする。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type { Finding } from './types.js';
import type { AgentSearchResult } from './agents/types.js';

/**
 * 結果集約クラス
 *
 * @example
 * ```typescript
 * const aggregator = new ResultAggregator();
 * const findings = aggregator.aggregate(results, 'AI ethics');
 * ```
 */
export class ResultAggregator {
  /**
   * 結果を集約
   */
  aggregate(results: AgentSearchResult[], originalQuery: string): Finding[] {
    // 全結果をフラット化
    const allFindings = results.flatMap((r) => r.findings);

    // 重複排除
    const deduplicated = this.deduplicate(allFindings);

    // 関連性でソート
    const sorted = this.rankByRelevance(deduplicated, originalQuery);

    return sorted;
  }

  /**
   * URL/タイトルベースで重複排除
   */
  private deduplicate(findings: Finding[]): Finding[] {
    const seen = new Map<string, Finding>();

    for (const finding of findings) {
      const key = this.normalizeUrl(finding.url);

      if (!seen.has(key)) {
        seen.set(key, finding);
      } else {
        // 既存の結果とマージ（より高いスコアを採用）
        const existing = seen.get(key)!;
        if (finding.relevanceScore > existing.relevanceScore) {
          seen.set(key, {
            ...existing,
            ...finding,
            // 最高スコアを維持
            relevanceScore: Math.max(existing.relevanceScore, finding.relevanceScore),
            credibilityScore: Math.max(existing.credibilityScore, finding.credibilityScore),
          });
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * URLを正規化
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // クエリパラメータとフラグメントを除去
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * 関連性でランキング
   */
  private rankByRelevance(findings: Finding[], _query: string): Finding[] {
    return findings
      .map((f) => ({
        ...f,
        // 複合スコアを計算
        _compositeScore: f.relevanceScore * 0.6 + f.credibilityScore * 0.4,
      }))
      .sort((a, b) => b._compositeScore - a._compositeScore)
      .map(({ _compositeScore, ...finding }) => finding as Finding);
  }
}
