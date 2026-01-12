/**
 * WebSearchAgent - Web検索エージェント
 *
 * 既存のWebSearchClientを使用して一般Web検索を実行する。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import { WebSearchClient } from '../../web-search/index.js';
import type { ISearchAgent, AgentSearchQuery, AgentSearchResult } from './types.js';
import type { Finding, SourceType } from '../types.js';

/**
 * Web検索エージェント
 *
 * @example
 * ```typescript
 * const agent = new WebSearchAgent();
 * const result = await agent.search({
 *   query: 'TypeScript best practices',
 *   maxResults: 10,
 *   timeout: 30000,
 * });
 * ```
 */
export class WebSearchAgent implements ISearchAgent {
  readonly type: SourceType = 'web';
  readonly name = 'Web Search';

  private searchClient: WebSearchClient;

  constructor() {
    this.searchClient = new WebSearchClient();
  }

  async search(query: AgentSearchQuery): Promise<AgentSearchResult> {
    const startTime = Date.now();

    try {
      const results = await this.searchClient.search({
        query: query.query,
        maxResults: query.maxResults,
      });

      const findings: Finding[] = results.map((result, index) => ({
        id: `web-${Date.now()}-${index}`,
        title: result.title,
        summary: result.snippet || '',
        url: result.url,
        sourceType: 'web' as SourceType,
        sourceName: this.extractDomain(result.url),
        relevanceScore: this.calculateRelevance(result.title, result.snippet || '', query.query),
        credibilityScore: this.assessCredibility(result.url),
        metadata: {
          source: result.source,
          position: index,
        },
      }));

      return {
        findings,
        status: 'success',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        findings: [],
        status: 'failed',
        error: (error as Error).message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // WebSearchClientは常に利用可能（DuckDuckGo APIはキー不要）
    return true;
  }

  /**
   * URLからドメイン名を抽出
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 関連性スコアを計算
   */
  private calculateRelevance(title: string, snippet: string, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const snippetLower = snippet.toLowerCase();

    // タイトルにクエリが含まれる場合
    const titleMatch = titleLower.includes(queryLower) ? 0.35 : 0;

    // スニペットにクエリが含まれる場合
    const snippetMatch = snippetLower.includes(queryLower) ? 0.25 : 0;

    // クエリの単語単位でマッチング
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
    const titleWordMatch =
      queryWords.filter((w) => titleLower.includes(w)).length / Math.max(queryWords.length, 1);
    const snippetWordMatch =
      queryWords.filter((w) => snippetLower.includes(w)).length / Math.max(queryWords.length, 1);

    const baseScore = 0.3;

    return Math.min(
      titleMatch + snippetMatch + titleWordMatch * 0.2 + snippetWordMatch * 0.15 + baseScore,
      1
    );
  }

  /**
   * ドメインベースの信頼度スコアリング
   */
  private assessCredibility(url: string): number {
    const domain = this.extractDomain(url).toLowerCase();

    // 高信頼度ドメイン
    const highCredibility = [
      '.gov',
      '.edu',
      '.ac.jp',
      '.ac.uk',
      'wikipedia.org',
      'reuters.com',
      'bbc.com',
      'bbc.co.uk',
      'nature.com',
      'science.org',
      'arxiv.org',
    ];

    // 中信頼度ドメイン
    const mediumCredibility = [
      '.org',
      'github.com',
      'stackoverflow.com',
      'medium.com',
      'dev.to',
      'mozilla.org',
    ];

    if (highCredibility.some((d) => domain.includes(d))) return 0.9;
    if (mediumCredibility.some((d) => domain.includes(d))) return 0.7;

    return 0.5;
  }
}
