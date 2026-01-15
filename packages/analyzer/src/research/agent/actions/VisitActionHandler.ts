/**
 * VisitActionHandler - URLアクセスアクション
 *
 * @requirement REQ-DR-001
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { WebScraper, ScrapingResult } from '@nahisaho/katashiro-collector';
import { isOk } from '@nahisaho/katashiro-core';
import type { VisitParams } from '../types.js';
import { BaseActionHandler, type ExecutionContext, type ActionResult, type ActionHandlerOptions } from './BaseActionHandler.js';

/**
 * 訪問アクションハンドラのオプション
 */
export interface VisitActionHandlerOptions extends ActionHandlerOptions {
  /** Webスクレイパー */
  scraper: WebScraper;
}

/**
 * URLを訪問してコンテンツを取得するアクションハンドラ
 */
export class VisitActionHandler extends BaseActionHandler<VisitParams> {
  readonly actionType = 'visit' as const;

  private scraper: WebScraper;

  constructor(options: VisitActionHandlerOptions) {
    super(options);
    this.scraper = options.scraper;
  }

  /**
   * URLを訪問してコンテンツを取得
   */
  async execute(params: VisitParams, context: ExecutionContext): Promise<ActionResult> {
    const { urlTargets } = params;
    const knowledgeItems: ActionResult['knowledgeItems'] = [];
    const visitedUrls: string[] = [];
    const errors: string[] = [];

    // urlTargetsはインデックスなので、実際のURLに変換
    const targetUrls = urlTargets
      .map((index) => context.searchResultUrls.find((u) => u.index === index))
      .filter((u): u is { index: number; url: string; title: string } => u !== undefined);

    for (const target of targetUrls) {
      // 既に訪問済みの場合はスキップ
      if (context.visitedUrls.includes(target.url)) {
        continue;
      }

      try {
        const result = await this.scraper.scrape(target.url);

        if (isOk(result)) {
          const page = result.value;

          // ページコンテンツからナレッジアイテムを生成
          const item = this.createKnowledgeItem(
            this.formatPageContent(page),
            {
              url: target.url,
              title: page.title || target.title,
              type: 'web',
            }
          );
          knowledgeItems.push(item);
          visitedUrls.push(target.url);
        } else {
          errors.push(`Failed to scrape ${target.url}: ${result.error.message}`);
        }
      } catch (error) {
        errors.push(
          `Error visiting ${target.url}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: knowledgeItems.length > 0,
      knowledgeItems,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      metadata: {
        visitedUrls,
        errorCount: errors.length,
      },
    };
  }

  /**
   * ページコンテンツをフォーマット
   */
  private formatPageContent(page: ScrapingResult): string {
    const parts: string[] = [];

    if (page.title) {
      parts.push(`Title: ${page.title}`);
    }

    if (page.content) {
      // コンテンツを制限（5000文字）
      const content = page.content.slice(0, 5000);
      parts.push(`Content: ${content}`);
    }

    return parts.join('\n\n');
  }
}
