/**
 * Jina AI Search and Reader Provider
 *
 * Jina AI の無料APIを使用した検索・コンテンツ取得
 * - s.jina.ai: Web検索
 * - r.jina.ai: コンテンツ読み取り
 *
 * @version 3.0.0
 */

import type {
  SearchProvider,
  SERPQuery,
  SearchResult,
  WebContent,
  WebReadRequest,
} from './types.js';

/**
 * Jina Provider Configuration
 */
export interface JinaProviderConfig {
  /** API Key (optional - free tier available without key) */
  apiKey?: string;
  /** Search endpoint (default: https://s.jina.ai) */
  searchEndpoint?: string;
  /** Reader endpoint (default: https://r.jina.ai) */
  readerEndpoint?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Jina Search Response
 */
interface JinaSearchResponse {
  code: number;
  status: number;
  data: Array<{
    title: string;
    url: string;
    content: string;
    description?: string;
    date?: string;
  }>;
}

/**
 * JinaProvider - Jina AI を使用した検索・コンテンツ取得プロバイダー
 */
export class JinaProvider implements SearchProvider {
  readonly name = 'jina';

  private readonly config: Required<Omit<JinaProviderConfig, 'apiKey'>> & {
    apiKey?: string;
  };

  constructor(config: JinaProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey,
      searchEndpoint: config.searchEndpoint ?? 'https://s.jina.ai',
      readerEndpoint: config.readerEndpoint ?? 'https://r.jina.ai',
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://s.jina.ai/', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 405; // HEAD may not be allowed
    } catch {
      return false;
    }
  }

  /**
   * Search using Jina AI s.jina.ai
   */
  async search(query: SERPQuery): Promise<SearchResult[]> {
    const { keywords, topK = 10 } = query;

    // Build the search URL
    const searchUrl = `${this.config.searchEndpoint}/${encodeURIComponent(keywords)}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    // Add custom headers for Jina
    headers['X-Return-Format'] = 'text'; // Get clean text
    headers['X-With-Links-Summary'] = 'true'; // Include link metadata

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(searchUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Jina search failed: ${response.status}`);
        }

        const text = await response.text();

        // Parse Jina response (can be JSON or text)
        const results = this.parseSearchResponse(text, topK);
        return results;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError ?? new Error('Jina search failed');
  }

  /**
   * Read web content using Jina AI r.jina.ai
   */
  async read(request: WebReadRequest): Promise<WebContent> {
    const { url, timeout = this.config.timeout } = request;

    // Build the reader URL
    const readerUrl = `${this.config.readerEndpoint}/${url}`;

    const headers: Record<string, string> = {
      Accept: 'text/plain', // Get clean markdown
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    // Jina Reader specific headers
    headers['X-Return-Format'] = 'markdown';
    headers['X-With-Generated-Alt'] = 'true'; // Generate alt for images

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(readerUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Jina reader failed: ${response.status}`);
        }

        const content = await response.text();

        // Extract title from content
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] ?? 'Untitled';

        // Extract facts (simple heuristic: sentences with key info)
        const extractedFacts = this.extractFacts(content);

        return {
          url,
          title,
          content,
          extractedFacts,
          wordCount: content.split(/\s+/).length,
          extractedAt: Date.now(),
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError ?? new Error('Jina reader failed');
  }

  /**
   * Parse Jina search response
   */
  private parseSearchResponse(text: string, topK: number): SearchResult[] {
    const results: SearchResult[] = [];

    // Try to parse as JSON first
    try {
      const json = JSON.parse(text) as JinaSearchResponse;
      if (json.data && Array.isArray(json.data)) {
        for (const item of json.data.slice(0, topK)) {
          results.push({
            title: item.title ?? 'Untitled',
            url: item.url,
            snippet: item.description ?? item.content?.slice(0, 200) ?? '',
            date: item.date,
          });
        }
        return results;
      }
    } catch {
      // Not JSON, parse as text
    }

    // Parse as text/markdown format
    // Jina returns markdown with links like: [Title](URL)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    let match;
    while ((match = linkPattern.exec(text)) !== null && results.length < topK) {
      const title = match[1] ?? 'Untitled';
      const url = match[2] ?? '';

      // Find the context around this link
      const linkIndex = text.indexOf(match[0]);
      const startIdx = Math.max(0, linkIndex - 100);
      const endIdx = Math.min(text.length, linkIndex + match[0].length + 200);
      const snippet = text.slice(startIdx, endIdx).replace(/\n/g, ' ').trim();

      // Avoid duplicates
      if (!results.find((r) => r.url === url)) {
        results.push({
          title: title.trim(),
          url,
          snippet: snippet.slice(0, 300),
        });
      }
    }

    // If no links found, try to extract from structured text
    if (results.length === 0) {
      // Parse numbered list format
      const listPattern = /^\d+\.\s+\*\*(.+?)\*\*\s*[-–]\s*(.+?)(?:\s*(?:URL|Link):\s*(\S+))?$/gm;
      while ((match = listPattern.exec(text)) !== null && results.length < topK) {
        results.push({
          title: (match[1] ?? '').trim(),
          url: match[3] ?? '',
          snippet: (match[2] ?? '').trim(),
        });
      }
    }

    return results;
  }

  /**
   * Extract facts from content
   */
  private extractFacts(content: string): string[] {
    const facts: string[] = [];

    // Split into sentences
    const sentences = content.split(/[.。!！?？]\s*/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Skip empty or too short
      if (trimmed.length < 20) continue;

      // Skip headings (start with #)
      if (trimmed.startsWith('#')) continue;

      // Skip link-only lines
      if (/^\[.+\]\(.+\)$/.test(trimmed)) continue;

      // Look for factual patterns
      if (this.isFact(trimmed)) {
        facts.push(trimmed);
      }
    }

    // Limit to top 10 facts
    return facts.slice(0, 10);
  }

  /**
   * Check if a sentence is likely a fact
   */
  private isFact(sentence: string): boolean {
    // Contains numbers (statistics, dates)
    if (/\d+/.test(sentence)) return true;

    // Contains quantifiers
    if (/多く|少ない|増加|減少|約|以上|以下|percent|million|billion/i.test(sentence)) return true;

    // Contains definitive statements
    if (/である|です|ました|された|と言われ|によると|according to/i.test(sentence)) return true;

    // Contains comparison
    if (/より|最も|一番|compared to|more than|less than/i.test(sentence)) return true;

    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a JinaProvider instance
 */
export function createJinaProvider(config?: JinaProviderConfig): JinaProvider {
  return new JinaProvider(config);
}
