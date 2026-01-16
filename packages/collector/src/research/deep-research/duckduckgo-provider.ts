/**
 * DuckDuckGo Search Provider
 *
 * DuckDuckGo HTML検索を使用したバックアッププロバイダー
 * v2.5.3: レートリミット対応追加
 *
 * @version 3.1.0
 */

import type { SearchProvider, SERPQuery, SearchResult } from './types.js';

/**
 * Global rate limiter for DuckDuckGo
 * DuckDuckGoは短時間の連続リクエストでブロックされる傾向があるため、
 * グローバルで最終リクエスト時刻を追跡
 */
class DuckDuckGoRateLimiter {
  private static instance: DuckDuckGoRateLimiter;
  private lastRequestTime = 0;
  private readonly minIntervalMs: number;
  private consecutiveRequests = 0;
  private readonly maxConsecutive = 2; // 連続2回まで許可
  private readonly cooldownMs = 5000; // 連続後のクールダウン

  private constructor(minIntervalMs = 1500) {
    this.minIntervalMs = minIntervalMs;
  }

  static getInstance(minIntervalMs = 1500): DuckDuckGoRateLimiter {
    if (!DuckDuckGoRateLimiter.instance) {
      DuckDuckGoRateLimiter.instance = new DuckDuckGoRateLimiter(minIntervalMs);
    }
    return DuckDuckGoRateLimiter.instance;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    // Check if we need cooldown after consecutive requests
    if (this.consecutiveRequests >= this.maxConsecutive) {
      const cooldownWait = this.cooldownMs - elapsed;
      if (cooldownWait > 0) {
        await this.delay(cooldownWait);
      }
      this.consecutiveRequests = 0;
    } else if (elapsed < this.minIntervalMs) {
      // Normal interval wait
      await this.delay(this.minIntervalMs - elapsed);
    }

    this.lastRequestTime = Date.now();
    this.consecutiveRequests++;
  }

  reset(): void {
    this.consecutiveRequests = 0;
    this.lastRequestTime = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * DuckDuckGo Provider Configuration
 */
export interface DuckDuckGoProviderConfig {
  /** Region code (default: 'jp-ja') */
  region?: string;
  /** Safe search (default: 'moderate') */
  safeSearch?: 'strict' | 'moderate' | 'off';
  /** Request timeout in ms (default: 15000) */
  timeout?: number;
  /** Max retries (default: 3) */
  maxRetries?: number;
  /** Minimum interval between requests in ms (default: 1500) */
  minRequestIntervalMs?: number;
  /** Enable rate limiting (default: true) */
  enableRateLimiting?: boolean;
}

/**
 * DuckDuckGoProvider - DuckDuckGo HTML検索
 * v2.5.3: レートリミット対応追加
 */
export class DuckDuckGoProvider implements SearchProvider {
  readonly name = 'duckduckgo';

  private readonly config: Required<DuckDuckGoProviderConfig>;
  private readonly rateLimiter: DuckDuckGoRateLimiter;

  constructor(config: DuckDuckGoProviderConfig = {}) {
    this.config = {
      region: config.region ?? 'jp-ja',
      safeSearch: config.safeSearch ?? 'moderate',
      timeout: config.timeout ?? 15000,
      maxRetries: config.maxRetries ?? 3,
      minRequestIntervalMs: config.minRequestIntervalMs ?? 1500,
      enableRateLimiting: config.enableRateLimiting ?? true,
    };
    this.rateLimiter = DuckDuckGoRateLimiter.getInstance(
      this.config.minRequestIntervalMs
    );
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://html.duckduckgo.com/', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }

  /**
   * Search using DuckDuckGo HTML
   * v2.5.3: レートリミット対応追加
   */
  async search(query: SERPQuery): Promise<SearchResult[]> {
    const { keywords, topK = 10 } = query;

    // Wait for rate limiter if enabled
    if (this.config.enableRateLimiting) {
      await this.rateLimiter.waitIfNeeded();
    }

    // Build search URL
    const params = new URLSearchParams({
      q: keywords,
      kl: this.config.region,
      kp: this.getSafeSearchValue(),
    });

    const searchUrl = `https://html.duckduckgo.com/html/?${params.toString()}`;

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
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.9',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`DuckDuckGo search failed: ${response.status}`);
        }

        const html = await response.text();
        return this.parseSearchResults(html, topK);
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError ?? new Error('DuckDuckGo search failed');
  }

  /**
   * Parse DuckDuckGo HTML results
   */
  private parseSearchResults(html: string, topK: number): SearchResult[] {
    const results: SearchResult[] = [];

    // Pattern to match search results
    // DuckDuckGo HTML format: <a class="result__a" href="...">title</a>
    // and <a class="result__snippet">snippet</a>
    const resultPattern =
      /<a\s+class="result__a"\s+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    while (
      (match = resultPattern.exec(html)) !== null &&
      results.length < topK
    ) {
      let url: string = match[1] ?? '';
      const title = this.cleanHtml(match[2] ?? '');
      const snippet = this.cleanHtml(match[3] ?? '');

      // DuckDuckGo uses redirect URLs, extract actual URL
      if (url.includes('uddg=')) {
        const urlMatch = url.match(/uddg=([^&]+)/);
        if (urlMatch?.[1]) {
          url = decodeURIComponent(urlMatch[1]);
        }
      }

      // Skip if URL is not valid
      if (!url.startsWith('http')) continue;

      results.push({
        title: title.trim(),
        url,
        snippet: snippet.trim().slice(0, 300),
      });
    }

    // Alternative pattern for different HTML structure
    if (results.length === 0) {
      const altPattern =
        /<div class="result[^"]*"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="result__body">([\s\S]*?)<\/div>/gi;

      while (
        (match = altPattern.exec(html)) !== null &&
        results.length < topK
      ) {
        let url: string = match[1] ?? '';
        const title = this.cleanHtml(match[2] ?? '');
        const snippet = this.cleanHtml(match[3] ?? '');

        if (url.includes('uddg=')) {
          const urlMatch = url.match(/uddg=([^&]+)/);
          if (urlMatch?.[1]) {
            url = decodeURIComponent(urlMatch[1]);
          }
        }

        if (!url.startsWith('http')) continue;

        results.push({
          title: title.trim(),
          url,
          snippet: snippet.trim().slice(0, 300),
        });
      }
    }

    return results;
  }

  /**
   * Clean HTML tags
   */
  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get safe search parameter value
   */
  private getSafeSearchValue(): string {
    switch (this.config.safeSearch) {
      case 'strict':
        return '1';
      case 'off':
        return '-2';
      default:
        return '-1';
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a DuckDuckGoProvider instance
 */
export function createDuckDuckGoProvider(
  config?: DuckDuckGoProviderConfig
): DuckDuckGoProvider {
  return new DuckDuckGoProvider(config);
}
