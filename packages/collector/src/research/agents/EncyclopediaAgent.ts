/**
 * EncyclopediaAgent - 百科事典検索エージェント
 *
 * Wikipedia APIを使用して百科事典的な情報を検索する。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type { ISearchAgent, AgentSearchQuery, AgentSearchResult } from './types.js';
import type { Finding, SourceType } from '../types.js';

/**
 * Wikipedia API レスポンス型
 */
interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      pageid: number;
      title: string;
      snippet: string;
      size: number;
      wordcount: number;
      timestamp: string;
    }>;
    searchinfo?: {
      totalhits: number;
    };
  };
}

/**
 * 百科事典検索エージェント（Wikipedia）
 *
 * @example
 * ```typescript
 * const agent = new EncyclopediaAgent();
 * const result = await agent.search({
 *   query: 'Artificial Intelligence',
 *   maxResults: 10,
 *   timeout: 30000,
 * });
 * ```
 */
export class EncyclopediaAgent implements ISearchAgent {
  readonly type: SourceType = 'encyclopedia';
  readonly name = 'Encyclopedia (Wikipedia)';

  private readonly wikipediaApiUrl = 'https://en.wikipedia.org/w/api.php';
  private readonly defaultLanguage = 'en';

  async search(query: AgentSearchQuery): Promise<AgentSearchResult> {
    const startTime = Date.now();

    try {
      // 言語を決定
      const lang = this.detectLanguage(query.query, query.languages);
      const findings = await this.searchWikipedia(query, lang);

      return {
        findings,
        status: findings.length > 0 ? 'success' : 'partial',
        processingTime: Date.now() - startTime,
        metadata: {
          source: 'wikipedia',
          language: lang,
          totalFound: findings.length,
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

  /**
   * クエリの言語を検出
   */
  private detectLanguage(query: string, languages?: string[]): string {
    // 明示的に指定されている場合
    if (languages && languages.length > 0 && languages[0] !== undefined) {
      return languages[0];
    }

    // 日本語文字が含まれている場合
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(query)) {
      return 'ja';
    }

    return this.defaultLanguage;
  }

  /**
   * Wikipedia APIで検索
   */
  private async searchWikipedia(query: AgentSearchQuery, lang: string): Promise<Finding[]> {
    const apiUrl =
      lang === 'en'
        ? this.wikipediaApiUrl
        : `https://${lang}.wikipedia.org/w/api.php`;

    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query.query,
      srlimit: String(query.maxResults),
      format: 'json',
      origin: '*',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), query.timeout);

    try {
      const response = await fetch(`${apiUrl}?${params}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = (await response.json()) as WikipediaSearchResponse;
      return this.parseWikipediaResponse(data, query.query, lang);
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Wikipedia API request timed out');
      }
      throw error;
    }
  }

  /**
   * Wikipediaレスポンスをパース
   */
  private parseWikipediaResponse(
    data: WikipediaSearchResponse,
    originalQuery: string,
    language: string
  ): Finding[] {
    const results = data.query?.search || [];

    return results.map((result, index) => {
      // HTMLタグを除去
      const cleanSnippet = result.snippet.replace(/<[^>]+>/g, '');

      const url = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`;

      return {
        id: `encyclopedia-${Date.now()}-${index}`,
        title: result.title,
        summary: cleanSnippet,
        url,
        sourceType: 'encyclopedia' as SourceType,
        sourceName: `Wikipedia (${language})`,
        relevanceScore: this.calculateRelevance(result.title, cleanSnippet, originalQuery),
        credibilityScore: 0.8, // Wikipediaは編集可能だが一般的に信頼度高め
        publishedAt: new Date(result.timestamp),
        metadata: {
          pageId: result.pageid,
          wordCount: result.wordcount,
          size: result.size,
          language,
        },
      };
    });
  }

  /**
   * 関連性スコアを計算
   */
  private calculateRelevance(title: string, snippet: string, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const snippetLower = snippet.toLowerCase();

    // タイトル完全一致
    const exactMatch = titleLower === queryLower ? 0.4 : 0;
    const titleContains = titleLower.includes(queryLower) ? 0.25 : 0;
    const snippetContains = snippetLower.includes(queryLower) ? 0.15 : 0;

    const baseScore = 0.2;

    return Math.min(exactMatch + titleContains + snippetContains + baseScore, 1);
  }
}
