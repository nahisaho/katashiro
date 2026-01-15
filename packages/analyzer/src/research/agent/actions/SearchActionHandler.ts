/**
 * SearchActionHandler - Web検索アクション
 *
 * @requirement REQ-DR-001
 * @requirement REQ-DR-009
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { WebSearchClient } from '@nahisaho/katashiro-collector';
import type { SearchParams } from '../types.js';
import { BaseActionHandler, type ExecutionContext, type ActionResult, type ActionHandlerOptions } from './BaseActionHandler.js';

/**
 * 検索アクションハンドラのオプション
 */
export interface SearchActionHandlerOptions extends ActionHandlerOptions {
  /** Web検索クライアント */
  searchClient: WebSearchClient;
}

/**
 * Web検索を実行するアクションハンドラ
 */
export class SearchActionHandler extends BaseActionHandler<SearchParams> {
  readonly actionType = 'search' as const;

  private searchClient: WebSearchClient;

  constructor(options: SearchActionHandlerOptions) {
    super(options);
    this.searchClient = options.searchClient;
  }

  /**
   * 検索を実行
   */
  async execute(params: SearchParams, _context: ExecutionContext): Promise<ActionResult> {
    const { searchQueries } = params;
    const knowledgeItems: ActionResult['knowledgeItems'] = [];
    const allUrls: { index: number; url: string; title: string }[] = [];
    let urlIndex = 0;

    try {
      // 各クエリで検索を実行
      for (const query of searchQueries) {
        const provider = this.config.searchOptions?.providers?.[0] ?? 'duckduckgo';
        const results = await this.searchClient.search(
          {
            query,
            maxResults: this.config.searchOptions?.maxResultsPerQuery ?? 10,
          },
          { provider: provider as 'duckduckgo' | 'searxng' | 'google' | 'bing' }
        );

        // 検索結果からナレッジアイテムを生成
        for (const result of results) {
          // URLリストに追加
          allUrls.push({
            index: urlIndex++,
            url: result.url,
            title: result.title,
          });

          // スニペットからナレッジアイテムを生成
          if (result.snippet) {
            const item = this.createKnowledgeItem(
              `Title: ${result.title}\nSnippet: ${result.snippet}`,
              {
                url: result.url,
                title: result.title,
                type: 'web',
              }
            );
            knowledgeItems.push(item);
          }
        }
      }

      return {
        success: true,
        knowledgeItems,
        metadata: {
          searchQueries,
          resultCount: allUrls.length,
          urls: allUrls,
        },
      };
    } catch (error) {
      return {
        success: false,
        knowledgeItems: [],
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }
}
