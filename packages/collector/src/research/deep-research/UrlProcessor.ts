/**
 * UrlProcessor - URL処理コンポーネント
 *
 * リトライ、フォールバック、キャッシュを統合したURL処理
 *
 * @requirement REQ-DR-U-001, REQ-DR-E-001, REQ-DR-E-005
 * @task TASK-032
 */

import { isOk, type Result } from '@nahisaho/katashiro-core';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { RetryHandler, type RetryPolicy, type RetryEvent } from '../../retry/index.js';
import { FallbackHandler, type FallbackConfig, type FallbackEvent } from '../../fallback/index.js';
import { ContentCache, type CacheConfig, type ContentEntry } from '../../content/index.js';
import { getLogger, type StructuredLogger } from '../../logging/index.js';
import type { ScrapingResult } from '../../types.js';
import type { ParallelConfig, TimeoutConfig } from './types.js';

/**
 * URL処理設定
 */
export interface UrlProcessorConfig {
  retry: Partial<RetryPolicy>;
  fallback: Partial<FallbackConfig>;
  cache: Partial<CacheConfig>;
  parallel: ParallelConfig;
  timeouts: TimeoutConfig;
}

/**
 * URL処理結果
 */
export interface UrlProcessResult {
  url: string;
  success: boolean;
  content?: string;
  contentHash?: string;
  usedCache: boolean;
  usedFallback: boolean;
  attempts: number;
  processingTimeMs: number;
  error?: string;
}

/**
 * スクレイパーインターフェース
 */
export interface IScraperAdapter {
  scrape(url: string, options?: { timeout?: number }): Promise<Result<ScrapingResult, Error>>;
}

/**
 * URL処理イベント
 */
export type UrlProcessorEventType =
  | 'urlStart'
  | 'urlComplete'
  | 'urlFailed'
  | 'cacheHit'
  | 'retrying'
  | 'fallbackTriggered';

/**
 * URL Processor
 *
 * 単一URLの処理を担当。キャッシュ → 直接取得 → リトライ → フォールバックの順で処理。
 */
export class UrlProcessor extends EventEmitter {
  private retryHandler: RetryHandler;
  private fallbackHandler: FallbackHandler<string>;
  private cache: ContentCache;
  private logger: StructuredLogger;
  private config: UrlProcessorConfig;
  private scraper: IScraperAdapter;

  // 並列処理制御
  private activeRequests: number = 0;
  private domainRequests: Map<string, number> = new Map();
  private requestQueue: Array<{
    url: string;
    resolve: (result: UrlProcessResult) => void;
  }> = [];

  constructor(scraper: IScraperAdapter, config: UrlProcessorConfig) {
    super();
    this.scraper = scraper;
    this.config = config;

    // RetryHandler初期化（イベントリスナー付き）
    this.retryHandler = new RetryHandler({
      policy: {
        maxRetries: config.retry.maxRetries ?? 3,
        initialDelayMs: config.retry.initialDelayMs ?? 1000,
        maxDelayMs: config.retry.maxDelayMs ?? 30000,
        multiplier: config.retry.multiplier ?? 2,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT', 'SERVER_ERROR'],
        retryableStatusCodes: config.retry.retryableStatusCodes ?? [429, 500, 502, 503, 504],
      },
      onRetry: (event: RetryEvent) => {
        if (event.type === 'retry') {
          this.emit('retrying', {
            url: event.context.url,
            attempt: event.attempt,
            delay: event.delayMs,
          });
        }
      },
    });

    // FallbackHandler初期化（イベントリスナー付き）
    this.fallbackHandler = new FallbackHandler<string>({
      config: {
        useCache: config.fallback.useCache ?? true,
        useWayback: config.fallback.useWayback ?? true,
        useGoogleCache: config.fallback.useGoogleCache ?? false,
        alternativeSources: config.fallback.alternativeSources ?? [],
        priority: config.fallback.priority ?? ['cache', 'wayback'],
        timeoutMs: config.fallback.timeoutMs ?? 30000,
        maxArchiveAgeDays: config.fallback.maxArchiveAgeDays ?? 30,
      },
      onEvent: (event: FallbackEvent) => {
        if (event.type === 'success') {
          this.emit('fallbackTriggered', {
            url: event.url,
            source: event.sourceType,
          });
        }
      },
    });

    // ContentCache初期化
    this.cache = new ContentCache({
      maxSizeBytes: config.cache.maxSizeBytes ?? 500 * 1024 * 1024,
      maxEntries: config.cache.maxEntries ?? 1000,
      defaultTtlMs: config.cache.defaultTtlMs ?? 24 * 60 * 60 * 1000,
    });

    this.logger = getLogger('UrlProcessor');
  }

  /**
   * URLを処理
   */
  async process(url: string): Promise<UrlProcessResult> {
    const startTime = Date.now();
    const domain = this.extractDomain(url);

    // 並列制限チェック
    if (
      this.activeRequests >= this.config.parallel.maxConcurrent ||
      (this.domainRequests.get(domain) ?? 0) >= this.config.parallel.maxPerDomain
    ) {
      // キューに追加して待機
      return new Promise((resolve) => {
        this.requestQueue.push({ url, resolve });
      });
    }

    return this.processInternal(url, startTime);
  }

  /**
   * 複数URLを並列処理
   */
  async processMany(urls: string[]): Promise<UrlProcessResult[]> {
    const results: UrlProcessResult[] = [];
    const queue = [...urls];
    const processing: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const url = queue.shift()!;
      const result = await this.process(url);
      results.push(result);

      // 次のリクエストまで待機
      if (this.config.parallel.requestInterval > 0) {
        await this.delay(this.config.parallel.requestInterval);
      }

      return processNext();
    };

    // 並列処理を開始
    for (let i = 0; i < Math.min(this.config.parallel.maxConcurrent, urls.length); i++) {
      processing.push(processNext());
    }

    await Promise.all(processing);

    return results;
  }

  /**
   * 内部処理
   */
  private async processInternal(url: string, startTime: number): Promise<UrlProcessResult> {
    const domain = this.extractDomain(url);

    // カウンターをインクリメント
    this.activeRequests++;
    this.domainRequests.set(domain, (this.domainRequests.get(domain) ?? 0) + 1);

    try {
      this.emit('urlStart', { url });
      this.logger.info('Processing URL', { url, domain });

      // 1. キャッシュチェック
      const cached = this.cache.get(url);
      if (cached) {
        this.logger.debug('Cache hit', { url });
        this.emit('cacheHit', { url });
        const result: UrlProcessResult = {
          url,
          success: true,
          content: cached.content,
          contentHash: cached.currentVersion.hash,
          usedCache: true,
          usedFallback: false,
          attempts: 0,
          processingTimeMs: Date.now() - startTime,
        };
        this.emit('urlComplete', result);
        return result;
      }

      // 2. 直接取得（リトライ付き）
      let attempts = 0;
      const scrapeResult = await this.retryHandler.execute<ScrapingResult>(
        async () => {
          attempts++;
          const result = await this.scraper.scrape(url, {
            timeout: this.config.timeouts.perUrl,
          });

          if (isOk(result)) {
            return result.value;
          }
          throw result.error;
        },
        { operation: 'scrape', url }
      );

      if (isOk(scrapeResult)) {
        const content = scrapeResult.value.content;

        // キャッシュに保存
        this.cache.set(this.createContentEntry(url, content, 'original'));

        const result: UrlProcessResult = {
          url,
          success: true,
          content,
          usedCache: false,
          usedFallback: false,
          attempts,
          processingTimeMs: Date.now() - startTime,
        };

        this.logger.info('URL processed successfully', { url, attempts });
        this.emit('urlComplete', result);
        return result;
      }

      // 3. フォールバック
      this.logger.warn('Primary scraping failed, trying fallback', {
        url,
        error: scrapeResult.error.message,
      });

      const fallbackResult = await this.fallbackHandler.fetchWithFallback(
        url,
        async (fallbackUrl: string) => {
          const response = await this.scraper.scrape(fallbackUrl, {
            timeout: this.config.timeouts.perUrl,
          });
          if (isOk(response)) {
            return response.value.content;
          }
          throw response.error;
        }
      );

      if (isOk(fallbackResult)) {
        const content = fallbackResult.value.data;

        // キャッシュに保存
        this.cache.set(this.createContentEntry(url, content, fallbackResult.value.sourceType));

        const result: UrlProcessResult = {
          url,
          success: true,
          content,
          usedCache: false,
          usedFallback: true,
          attempts,
          processingTimeMs: Date.now() - startTime,
        };

        this.logger.info('URL processed via fallback', {
          url,
          source: fallbackResult.value.sourceType,
        });
        this.emit('urlComplete', result);
        return result;
      }

      // 4. 完全に失敗
      const errorMessage = fallbackResult.error.message;
      this.logger.error('URL processing failed', { url, error: errorMessage, attempts });

      const failedResult: UrlProcessResult = {
        url,
        success: false,
        usedCache: false,
        usedFallback: false,
        attempts,
        processingTimeMs: Date.now() - startTime,
        error: errorMessage,
      };

      this.emit('urlFailed', failedResult);
      return failedResult;
    } finally {
      // カウンターをデクリメント
      this.activeRequests--;
      const currentDomainCount = this.domainRequests.get(domain) ?? 1;
      this.domainRequests.set(domain, currentDomainCount - 1);

      // キューから次のリクエストを処理
      this.processQueue();
    }
  }

  /**
   * キューから次のリクエストを処理
   */
  private processQueue(): void {
    if (this.requestQueue.length === 0) return;
    if (this.activeRequests >= this.config.parallel.maxConcurrent) return;

    const next = this.requestQueue.shift();
    if (next) {
      this.processInternal(next.url, Date.now()).then(next.resolve);
    }
  }

  /**
   * ドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ContentEntryを作成
   */
  private createContentEntry(url: string, content: string, source?: string): ContentEntry {
    const now = new Date().toISOString();
    const hash = createHash('sha256').update(content, 'utf8').digest('hex');
    const size = Buffer.byteLength(content, 'utf8');

    return {
      url,
      content,
      contentType: 'text/html',
      status: 'cached',
      currentVersion: {
        versionId: `v-${Date.now()}-${hash.slice(0, 8)}`,
        hash,
        fetchedAt: now,
        size,
        source: source ?? 'original',
      },
      versions: [],
      lastAccessedAt: now,
      accessCount: 1,
    };
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 現在の並列リクエスト数を取得
   */
  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * キュー内のリクエスト数を取得
   */
  getQueuedRequestCount(): number {
    return this.requestQueue.length;
  }
}
