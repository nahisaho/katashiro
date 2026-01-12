/**
 * NewsSearchAgent - ニュース検索エージェント
 *
 * Web検索を使用してニュースを検索する。
 * NewsAPIなどの専用APIがある場合は、それを使用することを推奨。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import { WebSearchClient } from '../../web-search/index.js';
import type { ISearchAgent, AgentSearchQuery, AgentSearchResult } from './types.js';
import type { Finding, SourceType } from '../types.js';

/** ニュースドメインリスト */
const NEWS_DOMAINS = [
  'reuters.com',
  'bbc.com',
  'bbc.co.uk',
  'nytimes.com',
  'theguardian.com',
  'wsj.com',
  'cnn.com',
  'apnews.com',
  'bloomberg.com',
  'techcrunch.com',
  'wired.com',
  'theverge.com',
  'arstechnica.com',
  'nhk.or.jp',
  'asahi.com',
  'nikkei.com',
  'yomiuri.co.jp',
  'mainichi.jp',
];

/**
 * ニュース検索エージェント
 *
 * @example
 * ```typescript
 * const agent = new NewsSearchAgent();
 * const result = await agent.search({
 *   query: 'AI regulation',
 *   maxResults: 10,
 *   timeout: 30000,
 * });
 * ```
 */
export class NewsSearchAgent implements ISearchAgent {
  readonly type: SourceType = 'news';
  readonly name = 'News Search';

  private searchClient: WebSearchClient;

  constructor() {
    this.searchClient = new WebSearchClient();
  }

  async search(query: AgentSearchQuery): Promise<AgentSearchResult> {
    const startTime = Date.now();

    try {
      // "news" キーワードを追加してニュース寄りの結果を取得
      const newsQuery = `${query.query} news`;

      const results = await this.searchClient.search({
        query: newsQuery,
        maxResults: query.maxResults * 2, // フィルタリングのため多めに取得
      });

      // ニュースドメインのフィルタリングと優先
      const findings: Finding[] = results
        .map((result, index) => {
          const domain = this.extractDomain(result.url);
          const isNewsSite = this.isNewsDomain(domain);

          return {
            id: `news-${Date.now()}-${index}`,
            title: result.title,
            summary: result.snippet || '',
            url: result.url,
            sourceType: 'news' as SourceType,
            sourceName: domain,
            relevanceScore: this.calculateRelevance(
              result.title,
              result.snippet || '',
              query.query,
              isNewsSite
            ),
            credibilityScore: this.assessNewsCredibility(domain),
            metadata: {
              isVerifiedNews: isNewsSite,
              originalPosition: index,
            },
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, query.maxResults);

      return {
        findings,
        status: 'success',
        processingTime: Date.now() - startTime,
        metadata: {
          newsSourcesFound: findings.filter((f) => f.metadata?.isVerifiedNews).length,
        },
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
    return true;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private isNewsDomain(domain: string): boolean {
    return NEWS_DOMAINS.some((nd) => domain.includes(nd));
  }

  private calculateRelevance(
    title: string,
    snippet: string,
    query: string,
    isNewsSite: boolean
  ): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const snippetLower = snippet.toLowerCase();

    const titleMatch = titleLower.includes(queryLower) ? 0.3 : 0;
    const snippetMatch = snippetLower.includes(queryLower) ? 0.2 : 0;
    const newsBonus = isNewsSite ? 0.2 : 0;
    const baseScore = 0.3;

    return Math.min(titleMatch + snippetMatch + newsBonus + baseScore, 1);
  }

  private assessNewsCredibility(domain: string): number {
    // 信頼性の高いニュースソース
    const tier1 = ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nhk.or.jp'];
    const tier2 = [
      'nytimes.com',
      'theguardian.com',
      'wsj.com',
      'bloomberg.com',
      'nikkei.com',
    ];
    const tier3 = NEWS_DOMAINS;

    if (tier1.some((d) => domain.includes(d))) return 0.95;
    if (tier2.some((d) => domain.includes(d))) return 0.85;
    if (tier3.some((d) => domain.includes(d))) return 0.75;

    return 0.5;
  }
}
