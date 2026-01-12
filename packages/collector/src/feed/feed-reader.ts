/**
 * FeedReader - RSS/Atomフィードリーダー
 *
 * @requirement REQ-COLLECT-005
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-013
 */

import {
  type Result,
  ok,
  err,
  validateUrl,
  isErr,
} from '@nahisaho/katashiro-core';
import type { IFeedReader, FeedItem } from '../index.js';

type FeedType = 'rss' | 'atom' | 'auto';

/**
 * RSS/Atomフィードリーダー実装
 */
export class FeedReader implements IFeedReader {
  private readonly userAgent = 'Mozilla/5.0 (compatible; KATASHIRO/0.1.0)';

  /**
   * フィードを読み込み（簡易API）
   * @param feedUrl フィードURL
   */
  async read(feedUrl: string): Promise<Result<FeedItem[], Error>> {
    return this.fetch(feedUrl);
  }

  /**
   * フィードを取得・パース（IFeedReaderインターフェース実装）
   */
  async fetch(feedUrl: string): Promise<Result<FeedItem[], Error>> {
    return this.fetchFeed(feedUrl);
  }

  /**
   * フィードを取得・パース
   */
  async fetchFeed(url: string): Promise<Result<FeedItem[], Error>> {
    const urlValidation = validateUrl(url);
    if (isErr(urlValidation)) {
      return err(new Error(`Invalid URL: ${urlValidation.error}`));
    }

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          },
          // デフォルトタイムアウト: 10秒
          signal: AbortSignal.timeout(10000),
        });
      } catch (fetchError) {
        // ネットワークエラー（DNS解決失敗、接続拒否、タイムアウト等）
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          return err(new Error(`Request timeout: ${url}`));
        }
        return err(new Error(`Network error: ${errorMessage}`));
      }

      if (!response.ok) {
        return err(new Error(`HTTP error: ${response.status} ${response.statusText}`));
      }

      const xml = await response.text();
      const feedType = this.detectFeedType(xml);
      return this.parseFeed(xml, feedType);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Feed fetch error: ${message}`));
    }
  }

  /**
   * フィードタイプを検出
   */
  detectFeedType(xml: string): FeedType {
    if (xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      return 'atom';
    }
    if (xml.includes('<rss')) {
      return 'rss';
    }
    // Default to RSS for unknown formats
    return 'rss';
  }

  /**
   * フィードをパース
   */
  parseFeed(xml: string, type: FeedType): Result<FeedItem[], Error> {
    try {
      const feedType = type === 'auto' ? this.detectFeedType(xml) : type;

      if (feedType === 'atom') {
        return this.parseAtomFeed(xml);
      }
      return this.parseRssFeed(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Parse error: ${message}`));
    }
  }

  /**
   * RSS 2.0フィードをパース
   */
  private parseRssFeed(xml: string): Result<FeedItem[], Error> {
    const items: FeedItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      if (!itemXml) continue;

      const title = this.extractTag(itemXml, 'title');
      const link = this.extractTag(itemXml, 'link');
      const description = this.extractTag(itemXml, 'description');
      const content = this.extractTag(itemXml, 'content:encoded') || description;
      const author = this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const guid = this.extractTag(itemXml, 'guid');
      const categories = this.extractCategories(itemXml);

      if (title && link) {
        items.push({
          id: guid || link,
          title: this.extractTextContent(title),
          link,
          description: description ? this.extractTextContent(description) : undefined,
          content: content ? this.extractTextContent(content) : undefined,
          author: author ? this.extractTextContent(author) : undefined,
          publishedAt: pubDate ? this.parseDate(pubDate) : undefined,
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    }

    if (items.length === 0) {
      // Check if the XML was valid
      if (!xml.includes('<rss') && !xml.includes('<item')) {
        return err(new Error('Invalid RSS feed format'));
      }
    }

    return ok(items);
  }

  /**
   * Atomフィードをパース
   */
  private parseAtomFeed(xml: string): Result<FeedItem[], Error> {
    const items: FeedItem[] = [];
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      if (!entryXml) continue;

      const title = this.extractTag(entryXml, 'title');
      const link = this.extractAtomLink(entryXml);
      const id = this.extractTag(entryXml, 'id');
      const summary = this.extractTag(entryXml, 'summary');
      const content = this.extractTag(entryXml, 'content');
      const author = this.extractAtomAuthor(entryXml);
      const updated = this.extractTag(entryXml, 'updated');
      const published = this.extractTag(entryXml, 'published');
      const categories = this.extractAtomCategories(entryXml);

      if (title && (link || id)) {
        items.push({
          id: id || link || '',
          title: this.extractTextContent(title),
          link: link || '',
          description: summary ? this.extractTextContent(summary) : undefined,
          content: content ? this.extractTextContent(content) : undefined,
          author: author || undefined,
          publishedAt: this.parseDate(published || updated || ''),
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    }

    if (items.length === 0) {
      if (!xml.includes('<feed') && !xml.includes('<entry')) {
        return err(new Error('Invalid Atom feed format'));
      }
    }

    return ok(items);
  }

  /**
   * XMLタグの内容を抽出
   */
  private extractTag(xml: string, tagName: string): string | null {
    // Handle namespaced tags (e.g., content:encoded)
    const escapedTag = tagName.replace(/:/g, '\\:');
    const patterns = [
      new RegExp(`<${escapedTag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${escapedTag}>`, 'i'),
      new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Atomリンクを抽出
   */
  private extractAtomLink(xml: string): string | null {
    // Look for alternate link or first link
    const patterns = [
      /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/i,
      /<link[^>]+href=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Atom著者を抽出
   */
  private extractAtomAuthor(xml: string): string | null {
    const authorMatch = xml.match(/<author[^>]*>([\s\S]*?)<\/author>/i);
    if (authorMatch?.[1]) {
      const name = this.extractTag(authorMatch[1], 'name');
      return name || null;
    }
    return null;
  }

  /**
   * RSSカテゴリを抽出
   */
  private extractCategories(xml: string): string[] {
    const categories: string[] = [];
    const categoryRegex = /<category[^>]*>([^<]+)<\/category>/gi;
    let match;

    while ((match = categoryRegex.exec(xml)) !== null) {
      if (match[1]) {
        categories.push(this.extractTextContent(match[1]));
      }
    }

    return categories;
  }

  /**
   * Atomカテゴリを抽出
   */
  private extractAtomCategories(xml: string): string[] {
    const categories: string[] = [];
    const categoryRegex = /<category[^>]+term=["']([^"']+)["']/gi;
    let match;

    while ((match = categoryRegex.exec(xml)) !== null) {
      if (match[1]) {
        categories.push(match[1]);
      }
    }

    return categories;
  }

  /**
   * HTMLタグを除去してテキストを抽出
   */
  extractTextContent(html: string): string {
    if (!html) return '';

    // Remove CDATA wrapper
    let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * 日付文字列をISO形式に変換
   */
  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return undefined;
      }
      return date.toISOString();
    } catch {
      return undefined;
    }
  }
}
