/**
 * WebSearchClient - Web検索クライアント
 *
 * @requirement REQ-COLLECT-001
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-010
 */

import {
  type Result,
  type SearchResult,
  type SearchQuery,
  ok,
  err,
  generateId,
  formatTimestamp,
} from '@nahisaho/katashiro-core';
import type { IWebSearchClient, WebSearchOptions } from '../index.js';

/**
 * 検索プロバイダー型
 */
type SearchProvider = 'google' | 'bing' | 'duckduckgo' | 'searxng';

/**
 * SearXNG レスポンス型
 */
interface SearXNGResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    engine?: string;
  }>;
}

/**
 * DuckDuckGo Instant Answer API レスポンス型
 */
interface DuckDuckGoResponse {
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
}

/**
 * Web検索クライアント実装
 */
export class WebSearchClient implements IWebSearchClient {
  private readonly defaultProvider: SearchProvider = 'duckduckgo';
  private readonly defaultMaxResults = 10;

  /**
   * Web検索を実行（AGENTS.md互換API）
   * @param queryOrString 検索クエリ（文字列またはSearchQueryオブジェクト）
   * @param options 検索オプション
   * @returns 検索結果の配列（エラー時は空配列）
   */
  async search(
    queryOrString: string | SearchQuery,
    options?: WebSearchOptions
  ): Promise<SearchResult[]> {
    // 文字列の場合はSearchQueryオブジェクトに変換
    const query: SearchQuery = typeof queryOrString === 'string'
      ? { query: queryOrString }
      : queryOrString;

    // バリデーション
    if (!query.query || query.query.trim().length === 0) {
      return [];
    }

    const provider = options?.provider ?? this.defaultProvider;
    const maxResults = query.maxResults ?? options?.maxResults ?? this.defaultMaxResults;

    try {
      const results = await this.fetchFromProvider(provider, {
        ...query,
        maxResults,
      });

      // maxResultsでスライス
      return results.slice(0, maxResults);
    } catch {
      // エラー時は空配列を返す（AGENTS.md互換）
      return [];
    }
  }

  /**
   * Web検索を実行（Result型を返すAPI）
   * @deprecated searchを使用してください
   */
  async searchWithResult(
    queryOrString: string | SearchQuery,
    options?: WebSearchOptions
  ): Promise<Result<SearchResult[], Error>> {
    const query: SearchQuery = typeof queryOrString === 'string'
      ? { query: queryOrString }
      : queryOrString;

    if (!query.query || query.query.trim().length === 0) {
      return err(new Error('Search query cannot be empty'));
    }

    const provider = options?.provider ?? this.defaultProvider;
    const maxResults = query.maxResults ?? options?.maxResults ?? this.defaultMaxResults;

    try {
      const results = await this.fetchFromProvider(provider, {
        ...query,
        maxResults,
      });
      return ok(results.slice(0, maxResults));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Search error: ${message}`));
    }
  }

  /**
   * プロバイダーから検索結果を取得
   */
  private async fetchFromProvider(
    provider: SearchProvider,
    query: SearchQuery
  ): Promise<SearchResult[]> {
    switch (provider) {
      case 'duckduckgo':
        return this.searchDuckDuckGo(query);
      case 'searxng':
        return this.searchSearXNG(query);
      case 'google':
        return this.searchGoogle(query);
      case 'bing':
        return this.searchBing(query);
      default:
        return this.searchDuckDuckGo(query);
    }
  }

  /**
   * DuckDuckGo Instant Answer API を使用した検索
   * Note: 本番環境ではSerpAPIやBraveSearchAPIなどを使用推奨
   */
  private async searchDuckDuckGo(query: SearchQuery): Promise<SearchResult[]> {
    // まずHTML検索を試行（より確実に結果が得られる）
    try {
      const htmlResults = await this.searchDuckDuckGoHtml(query);
      if (htmlResults.length > 0) {
        return htmlResults;
      }
    } catch {
      // HTML検索に失敗した場合はInstant Answer APIにフォールバック
    }

    // Instant Answer API（Wikipediaなどの定義情報）
    const encodedQuery = encodeURIComponent(query.query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KATASHIRO/0.1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = (await response.json()) as DuckDuckGoResponse;
    const results: SearchResult[] = [];

    // Abstract結果を追加
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        id: generateId('search'),
        title: data.Heading ?? query.query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: 'duckduckgo',
        timestamp: formatTimestamp(),
        relevanceScore: 1.0,
      });
    }

    // Related Topics を追加
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            id: generateId('search'),
            title: this.extractTitle(topic.Text),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'duckduckgo',
            timestamp: formatTimestamp(),
            relevanceScore: 0.8,
          });
        }
      }
    }

    return results;
  }

  /**
   * DuckDuckGo HTML検索（スクレイピング）
   * Instant Answer APIより確実に検索結果が得られる
   */
  private async searchDuckDuckGoHtml(query: SearchQuery): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query.query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML error: ${response.status}`);
    }

    const html = await response.text();
    return this.parseDuckDuckGoHtml(html);
  }

  /**
   * DuckDuckGo HTML検索結果をパース
   */
  private parseDuckDuckGoHtml(html: string): SearchResult[] {
    const results: SearchResult[] = [];
    
    // 結果ブロックを抽出（正規表現ベース）
    // <a class="result__a" href="...">タイトル</a>
    // <a class="result__snippet">スニペット</a>
    const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;
    
    let match: RegExpExecArray | null;
    while ((match = resultPattern.exec(html)) !== null) {
      const rawUrl = match[1];
      const title = match[2];
      const snippet = match[3];
      
      // DuckDuckGoのリダイレクトURLから実際のURLを抽出
      let url = rawUrl ?? '';
      if (rawUrl) {
        const udMatch = rawUrl.match(/uddg=([^&]+)/);
        if (udMatch?.[1]) {
          url = decodeURIComponent(udMatch[1]);
        }
      }

      if (url && title) {
        results.push({
          id: generateId('search'),
          title: this.decodeHtmlEntities(title.trim()),
          url: url,
          snippet: this.decodeHtmlEntities(snippet?.trim() ?? ''),
          source: 'duckduckgo',
          timestamp: formatTimestamp(),
          relevanceScore: 0.9 - (results.length * 0.05),
        });
      }
    }

    // 別パターンも試行（シンプルなリンク形式）
    if (results.length === 0) {
      const simplePattern = /<a[^>]*class="[^"]*result[^"]*"[^>]*href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
      while ((match = simplePattern.exec(html)) !== null) {
        const encodedUrl = match[1];
        const title = match[2];
        if (!encodedUrl) continue;
        
        const url = decodeURIComponent(encodedUrl);
        
        if (url && title && !url.includes('duckduckgo.com')) {
          results.push({
            id: generateId('search'),
            title: this.decodeHtmlEntities(title.trim()),
            url: url,
            snippet: '',
            source: 'duckduckgo',
            timestamp: formatTimestamp(),
            relevanceScore: 0.8,
          });
        }
      }
    }

    return results;
  }

  /**
   * HTMLエンティティをデコード
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };
    
    return text.replace(/&[^;]+;/g, (entity) => entities[entity] ?? entity);
  }

  /**
   * SearXNG を使用した検索（複数インスタンス対応）
   * 注意: 多くのSearXNGインスタンスはボットチェックを導入しているため、
   * 結果が得られない場合はDuckDuckGoにフォールバック
   */
  private async searchSearXNG(query: SearchQuery): Promise<SearchResult[]> {
    const instances = [
      'https://searx.tiekoetter.com',
      'https://search.sapti.me',
      'https://searx.work',
      'https://search.bus-hit.me',
    ];

    for (const instance of instances) {
      try {
        const encodedQuery = encodeURIComponent(query.query);
        const url = `${instance}/search?q=${encodedQuery}&format=json&categories=general`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10秒タイムアウト
        });

        if (!response.ok) {
          continue;
        }

        // HTMLレスポンス（ボットチェック）をスキップ
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          continue;
        }

        const data = (await response.json()) as SearXNGResponse;
        
        if (data.results && data.results.length > 0) {
          return data.results
            .filter(r => r.url && r.title)
            .map((r, index) => ({
              id: generateId('search'),
              title: r.title ?? '',
              url: r.url ?? '',
              snippet: r.content ?? '',
              source: `searxng:${r.engine ?? 'unknown'}`,
              timestamp: formatTimestamp(),
              relevanceScore: 1.0 - (index * 0.05),
            }));
        }
      } catch {
        // このインスタンスは失敗、次を試行
        continue;
      }
    }

    // 全インスタンス失敗
    return [];
  }

  /**
   * Google Custom Search API を使用した検索
   * Note: 実装にはAPI Keyが必要
   */
  private async searchGoogle(_query: SearchQuery): Promise<SearchResult[]> {
    // Google Custom Search API の実装
    // 環境変数 GOOGLE_API_KEY, GOOGLE_CX が必要
    throw new Error('Google search requires API key configuration');
  }

  /**
   * Bing Search API を使用した検索
   * Note: 実装にはAPI Keyが必要
   */
  private async searchBing(_query: SearchQuery): Promise<SearchResult[]> {
    // Bing Search API の実装
    // 環境変数 BING_API_KEY が必要
    throw new Error('Bing search requires API key configuration');
  }

  /**
   * テキストからタイトルを抽出
   */
  private extractTitle(text: string): string {
    // 最初の文または最初の50文字をタイトルとして使用
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence.trim();
    }
    return text.substring(0, 50).trim() + '...';
  }
}
