/**
 * FallbackHandler - フォールバック処理ハンドラー
 *
 * @requirement REQ-DR-U-003 - フォールバック機構
 * @design DES-KATASHIRO-005-DR-FALLBACK §3.1
 * @task TASK-018, TASK-019
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import {
  DEFAULT_FALLBACK_CONFIG,
  type FallbackConfig,
  type FallbackResult,
  type FallbackSourceType,
  type FallbackEvent,
  type FallbackEventListener,
  type CacheEntry,
} from './types.js';
import { WaybackMachineClient } from './wayback-machine.js';

/**
 * フォールバックエラー
 */
export class FallbackError extends Error {
  public readonly name = 'FallbackError';
  public readonly url: string;
  public readonly attemptedSources: FallbackSourceType[];
  public readonly errors: Array<{ source: FallbackSourceType; error: Error }>;

  constructor(
    message: string,
    url: string,
    attemptedSources: FallbackSourceType[],
    errors: Array<{ source: FallbackSourceType; error: Error }>
  ) {
    super(message);
    this.url = url;
    this.attemptedSources = attemptedSources;
    this.errors = errors;
  }
}

/**
 * フォールバックハンドラー
 *
 * @example
 * ```typescript
 * const handler = new FallbackHandler();
 *
 * const result = await handler.fetchWithFallback(
 *   'https://example.com/page',
 *   async (url) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.text();
 *   }
 * );
 *
 * if (isOk(result)) {
 *   console.log('Source:', result.value.sourceType);
 *   console.log('Content:', result.value.data);
 * }
 * ```
 */
export class FallbackHandler<T = string> {
  private readonly config: FallbackConfig;
  private readonly wayback: WaybackMachineClient;
  private readonly listeners: FallbackEventListener[] = [];
  private readonly cache: Map<string, CacheEntry<T>> = new Map();

  constructor(options?: { config?: Partial<FallbackConfig>; onEvent?: FallbackEventListener }) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...options?.config };
    this.wayback = new WaybackMachineClient({
      timeoutMs: this.config.timeoutMs,
      maxAgeDays: this.config.maxArchiveAgeDays,
    });

    if (options?.onEvent) {
      this.listeners.push(options.onEvent);
    }
  }

  /**
   * フォールバック付きでURLからデータを取得
   *
   * @param url - 取得するURL
   * @param fetcher - データ取得関数
   * @returns Result<FallbackResult<T>, FallbackError>
   */
  public async fetchWithFallback(
    url: string,
    fetcher: (url: string) => Promise<T>
  ): Promise<Result<FallbackResult<T>, FallbackError>> {
    const startTime = Date.now();
    const attemptedSources: FallbackSourceType[] = [];
    const errors: Array<{ source: FallbackSourceType; error: Error }> = [];

    for (const sourceType of this.config.priority) {
      attemptedSources.push(sourceType);

      try {
        const result = await this.trySource(url, sourceType, fetcher);

        if (result !== null) {
          this.emit({
            type: 'success',
            sourceType,
            url,
            timestamp: new Date(),
          });

          return ok({
            data: result.data,
            sourceType,
            sourceUrl: result.sourceUrl,
            cachedAt: result.cachedAt,
            attemptedSources,
            durationMs: Date.now() - startTime,
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ source: sourceType, error: err });

        this.emit({
          type: 'failure',
          sourceType,
          url,
          error: err,
          timestamp: new Date(),
        });
      }
    }

    return err(
      new FallbackError(`All fallback sources failed for ${url}`, url, attemptedSources, errors)
    );
  }

  /**
   * 特定のソースからデータ取得を試行
   */
  private async trySource(
    url: string,
    sourceType: FallbackSourceType,
    fetcher: (url: string) => Promise<T>
  ): Promise<{ data: T; sourceUrl?: string; cachedAt?: Date } | null> {
    this.emit({
      type: 'attempt',
      sourceType,
      url,
      timestamp: new Date(),
    });

    switch (sourceType) {
      case 'original':
        return this.tryOriginal(url, fetcher);

      case 'cache':
        return this.tryCache(url);

      case 'wayback':
        return this.tryWayback(url, fetcher);

      case 'google_cache':
        // Googleキャッシュは廃止されたためスキップ
        this.emit({ type: 'skip', sourceType, url, timestamp: new Date() });
        return null;

      case 'alternative':
        return this.tryAlternative(url, fetcher);

      default:
        return null;
    }
  }

  /**
   * オリジナルソースからの取得を試行
   */
  private async tryOriginal(
    url: string,
    fetcher: (url: string) => Promise<T>
  ): Promise<{ data: T; sourceUrl: string } | null> {
    const data = await fetcher(url);

    // 成功したらキャッシュに保存
    if (this.config.useCache) {
      this.setCache(url, data);
    }

    return { data, sourceUrl: url };
  }

  /**
   * キャッシュからの取得を試行
   */
  private async tryCache(url: string): Promise<{ data: T; cachedAt: Date } | null> {
    if (!this.config.useCache) {
      return null;
    }

    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }

    // 有効期限チェック
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(url);
      return null;
    }

    return { data: entry.data, cachedAt: entry.cachedAt };
  }

  /**
   * Wayback Machineからの取得を試行
   */
  private async tryWayback(
    url: string,
    fetcher: (url: string) => Promise<T>
  ): Promise<{ data: T; sourceUrl: string; cachedAt: Date } | null> {
    if (!this.config.useWayback) {
      return null;
    }

    const snapshotResult = await this.wayback.getLatestSnapshot(url);

    if (!isOk(snapshotResult)) {
      throw snapshotResult.error;
    }

    const snapshot = snapshotResult.value;
    const data = await fetcher(snapshot.url);

    return {
      data,
      sourceUrl: snapshot.url,
      cachedAt: snapshot.timestamp,
    };
  }

  /**
   * 代替ソースからの取得を試行
   */
  private async tryAlternative(
    url: string,
    fetcher: (url: string) => Promise<T>
  ): Promise<{ data: T; sourceUrl: string } | null> {
    for (const altSource of this.config.alternativeSources) {
      if (altSource.urlPattern.test(url)) {
        const alternativeUrl = altSource.generateUrl(url);

        try {
          const data = await fetcher(alternativeUrl);
          return { data, sourceUrl: alternativeUrl };
        } catch {
          // この代替ソースは失敗、次を試す
          continue;
        }
      }
    }

    return null;
  }

  /**
   * キャッシュに保存
   */
  public setCache(url: string, data: T, options?: { expiresInMs?: number }): void {
    const now = new Date();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      url,
      expiresAt: options?.expiresInMs ? new Date(now.getTime() + options.expiresInMs) : undefined,
    };

    this.cache.set(url, entry);
  }

  /**
   * キャッシュから取得
   */
  public getCache(url: string): CacheEntry<T> | undefined {
    return this.cache.get(url);
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * イベントを発行
   */
  private emit(event: FallbackEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーエラーは無視
      }
    }
  }

  /**
   * イベントリスナーを追加
   */
  public addEventListener(listener: FallbackEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(listener: FallbackEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
}
