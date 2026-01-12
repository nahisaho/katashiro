/**
 * WebScraper - Webスクレイパー
 *
 * @requirement REQ-COLLECT-002
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-011
 */

import {
  type Result,
  ok,
  err,
  formatTimestamp,
  validateUrl,
  isErr,
} from '@nahisaho/katashiro-core';
import type { IWebScraper, ScrapingOptions, ScrapingResult } from '../index.js';

/**
 * Webスクレイパー実装
 * Note: 本番環境ではPlaywrightを使用推奨
 */
export class WebScraper implements IWebScraper {
  /**
   * URLからコンテンツをスクレイピング
   */
  async scrape(
    url: string,
    options?: ScrapingOptions
  ): Promise<Result<ScrapingResult, Error>> {
    // URL検証
    const urlValidation = validateUrl(url);
    if (isErr(urlValidation)) {
      return err(new Error(`Invalid URL: ${urlValidation.error}`));
    }

    try {
      const html = await this.fetchPage(url, options);
      const result = this.parseHtml(html, url, options);
      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Scraping error: ${message}`));
    }
  }

  /**
   * ページを取得
   */
  private async fetchPage(url: string, options?: ScrapingOptions): Promise<string> {
    const userAgent =
      options?.userAgent ?? 'Mozilla/5.0 (compatible; KATASHIRO/0.1.0)';
    
    // デフォルトタイムアウト: 10秒（存在しないドメインへの長時間待機を防止）
    const timeout = options?.timeout ?? 10000;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (fetchError) {
      // ネットワークエラー（DNS解決失敗、接続拒否、タイムアウト等）
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        throw new Error(`Request timeout after ${timeout}ms: ${url}`);
      }
      throw new Error(`Network error: ${errorMessage}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * HTMLをパース
   */
  private parseHtml(
    html: string,
    url: string,
    options?: ScrapingOptions
  ): ScrapingResult {
    const title = this.extractTitle(html);
    const content = this.extractContent(html);
    const images = options?.extractImages ? this.extractImages(html, url) : undefined;
    const links = options?.extractLinks ? this.extractLinks(html, url) : undefined;

    return {
      url,
      title,
      content,
      html: options?.javascript ? html : undefined,
      images,
      links,
      fetchedAt: formatTimestamp(),
    };
  }

  /**
   * タイトルを抽出
   */
  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim() ?? 'Untitled';
  }

  /**
   * コンテンツを抽出（スクリプトとスタイルを除去）
   */
  private extractContent(html: string): string {
    // script, style, nav, footer, header タグを除去
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    // HTMLタグを除去
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // 空白を正規化
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return cleaned;
  }

  /**
   * 画像URLを抽出
   */
  private extractImages(html: string, baseUrl: string): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        images.push(absoluteUrl);
      }
    }

    return images;
  }

  /**
   * リンクを抽出
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        links.push(absoluteUrl);
      }
    }

    return links;
  }

  /**
   * 相対URLを絶対URLに変換
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}
