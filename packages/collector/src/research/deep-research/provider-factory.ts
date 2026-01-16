/**
 * Search Provider Factory
 *
 * 複数プロバイダーのフォールバック管理
 * Strategy Pattern + Chain of Responsibility
 *
 * @version 3.0.0
 */

import type {
  SearchProvider,
  SERPQuery,
  SearchResult,
  WebContent,
  WebReadRequest,
  ProviderConfig,
} from './types.js';
import { AllProvidersFailedError } from './types.js';
import { JinaProvider, type JinaProviderConfig } from './jina-provider.js';
import {
  DuckDuckGoProvider,
  type DuckDuckGoProviderConfig,
} from './duckduckgo-provider.js';

/**
 * Factory Configuration
 */
export interface ProviderFactoryConfig {
  /** Provider priority order */
  priorityOrder?: ('jina' | 'duckduckgo')[];
  /** Jina provider config */
  jina?: JinaProviderConfig;
  /** DuckDuckGo provider config */
  duckduckgo?: DuckDuckGoProviderConfig;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Provider Status
 */
interface ProviderStatus {
  provider: SearchProvider;
  available: boolean;
  lastError?: Error;
  lastCheck: number;
}

/**
 * SearchProviderFactory - プロバイダーファクトリー
 */
export class SearchProviderFactory {
  private readonly providers: Map<string, ProviderStatus> = new Map();
  private readonly priorityOrder: string[];
  private readonly debug: boolean;

  constructor(config: ProviderFactoryConfig = {}) {
    this.priorityOrder = config.priorityOrder ?? ['jina', 'duckduckgo'];
    this.debug = config.debug ?? false;

    // Initialize providers
    this.initializeProviders(config);
  }

  /**
   * Initialize all providers
   */
  private initializeProviders(config: ProviderFactoryConfig): void {
    // Jina Provider
    const jinaProvider = new JinaProvider(config.jina);
    this.providers.set('jina', {
      provider: jinaProvider,
      available: true,
      lastCheck: 0,
    });

    // DuckDuckGo Provider
    const duckduckgoProvider = new DuckDuckGoProvider(config.duckduckgo);
    this.providers.set('duckduckgo', {
      provider: duckduckgoProvider,
      available: true,
      lastCheck: 0,
    });
  }

  /**
   * Search with fallback
   */
  async search(query: SERPQuery): Promise<SearchResult[]> {
    const errors: Array<{ provider: string; error: Error }> = [];

    for (const providerName of this.priorityOrder) {
      const status = this.providers.get(providerName);
      if (!status) continue;

      // Skip if recently failed
      if (!status.available && Date.now() - status.lastCheck < 60000) {
        if (this.debug) {
          console.log(
            `[SearchProviderFactory] Skipping ${providerName} (recently failed)`
          );
        }
        continue;
      }

      try {
        if (this.debug) {
          console.log(`[SearchProviderFactory] Trying ${providerName}...`);
        }

        const results = await status.provider.search(query);

        // Mark as available
        status.available = true;
        status.lastCheck = Date.now();
        status.lastError = undefined;

        if (this.debug) {
          console.log(
            `[SearchProviderFactory] ${providerName} returned ${results.length} results`
          );
        }

        return results;
      } catch (error) {
        const err = error as Error;

        if (this.debug) {
          console.log(
            `[SearchProviderFactory] ${providerName} failed: ${err.message}`
          );
        }

        status.available = false;
        status.lastCheck = Date.now();
        status.lastError = err;
        errors.push({ provider: providerName, error: err });
      }
    }

    throw new AllProvidersFailedError('All search providers failed', {
      errors: errors.map((e) => ({
        provider: e.provider,
        message: e.error.message,
      })),
    });
  }

  /**
   * Read web content with fallback
   */
  async read(request: WebReadRequest): Promise<WebContent> {
    // Only Jina supports reading
    const jinaStatus = this.providers.get('jina');

    if (jinaStatus) {
      const jinaProvider = jinaStatus.provider as JinaProvider;

      if (jinaProvider.read) {
        try {
          return await jinaProvider.read(request);
        } catch (error) {
          const err = error as Error;
          if (this.debug) {
            console.log(`[SearchProviderFactory] Jina read failed: ${err.message}`);
          }

          // Fallback to basic fetch
          return this.basicRead(request);
        }
      }
    }

    // Fallback to basic fetch
    return this.basicRead(request);
  }

  /**
   * Basic web content reading (fallback)
   */
  private async basicRead(request: WebReadRequest): Promise<WebContent> {
    const { url, timeout = 10000 } = request;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; KATASHIRO/3.0; +https://github.com/nahisaho/katashiro)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1] ?? 'Untitled';

      // Extract main content (simple heuristic)
      const content = this.extractMainContent(html);

      return {
        url,
        title,
        content,
        extractedFacts: [],
        wordCount: content.split(/\s+/).length,
        extractedAt: Date.now(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract main content from HTML
   */
  private extractMainContent(html: string): string {
    // Remove script and style tags
    let content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '');

    // Try to extract article or main content
    const articleMatch = content.match(
      /<article[\s\S]*?>([\s\S]*?)<\/article>/i
    );
    const mainMatch = content.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);

    if (articleMatch?.[1]) {
      content = articleMatch[1];
    } else if (mainMatch?.[1]) {
      content = mainMatch[1];
    }

    // Remove remaining HTML tags
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Limit length
    return content.slice(0, 10000);
  }

  /**
   * Check provider availability
   */
  async checkAvailability(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, status] of this.providers.entries()) {
      try {
        results[name] = await status.provider.isAvailable();
        status.available = results[name];
        status.lastCheck = Date.now();
      } catch {
        results[name] = false;
        status.available = false;
        status.lastCheck = Date.now();
      }
    }

    return results;
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, { available: boolean; lastError?: string }> {
    const status: Record<string, { available: boolean; lastError?: string }> =
      {};

    for (const [name, providerStatus] of this.providers.entries()) {
      status[name] = {
        available: providerStatus.available,
        lastError: providerStatus.lastError?.message,
      };
    }

    return status;
  }
}

/**
 * Create a SearchProviderFactory from ProviderConfig
 */
export function createProviderFactory(
  config?: ProviderConfig,
  debug = false
): SearchProviderFactory {
  return new SearchProviderFactory({
    jina: config?.jinaApiKey ? { apiKey: config.jinaApiKey } : undefined,
    duckduckgo: config?.duckduckgoRegion
      ? { region: config.duckduckgoRegion }
      : undefined,
    debug,
  });
}
