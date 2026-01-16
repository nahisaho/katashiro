/**
 * CacheManager - 統合キャッシュ管理
 *
 * @requirement REQ-DR-E-005 キャッシュヒット時の高速応答
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 * @task TASK-041
 */

import { EventEmitter } from 'node:events';
import type {
  CacheEntry,
  CacheStatistics,
  CacheEvent,
  CacheEventListener,
  CacheManagerConfig,
} from './types.js';
import { DEFAULT_CACHE_MANAGER_CONFIG } from './types.js';
import { LRUCache } from './lru-cache.js';
import { CacheKeyGenerator } from './cache-key-generator.js';
import { TTLManager } from './ttl-manager.js';
import { CachePersistence } from './cache-persistence.js';

/**
 * キャッシュ取得結果
 */
export interface CacheGetResult<T> {
  /** 値 */
  value: T;
  /** Staleフラグ（再検証が必要） */
  stale: boolean;
  /** キャッシュキー */
  key: string;
  /** メタデータ */
  metadata: {
    createdAt: number;
    accessCount: number;
    expiresAt: number;
  };
}

/**
 * キャッシュ設定オプション
 */
export interface CacheSetOptions {
  /** TTL（ミリ秒）。省略時は自動計算 */
  ttlMs?: number;
  /** Content-Type */
  contentType?: string;
  /** 元URL */
  sourceUrl?: string;
  /** ETag */
  etag?: string;
  /** Last-Modified */
  lastModified?: string;
  /** HTTPレスポンスヘッダー（TTL自動計算用） */
  headers?: Record<string, string | undefined>;
}

/**
 * Stale-While-Revalidateコールバック
 */
export type RevalidateCallback<T> = (key: string) => Promise<T | undefined>;

/**
 * 統合キャッシュマネージャー
 *
 * LRUCache、CacheKeyGenerator、TTLManager、CachePersistenceを統合し、
 * 使いやすいAPIを提供します。
 *
 * 機能:
 * - URL/文字列からのキャッシュキー自動生成
 * - HTTPヘッダーからのTTL自動計算
 * - Stale-While-Revalidateサポート
 * - 自動永続化
 * - 統計情報収集
 */
export class CacheManager<T = unknown> extends EventEmitter {
  private readonly cache: LRUCache<T>;
  private readonly keyGenerator: CacheKeyGenerator;
  private readonly ttlManager: TTLManager;
  private readonly persistence?: CachePersistence<T>;
  private readonly config: CacheManagerConfig;
  private revalidateCallbacks = new Map<string, RevalidateCallback<T>>();
  private revalidatingKeys = new Set<string>();

  constructor(config: Partial<CacheManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CACHE_MANAGER_CONFIG, ...config };

    // コンポーネント初期化
    this.cache = new LRUCache<T>(this.config.lru);
    this.keyGenerator = new CacheKeyGenerator(this.config.keyGenerator);
    this.ttlManager = new TTLManager(this.config.lru);

    // 永続化設定
    if (this.config.lru.persistence && this.config.lru.persistencePath) {
      this.persistence = new CachePersistence<T>({
        directory: this.config.lru.persistencePath,
      });
    }

    // LRUCacheのイベントを転送
    if (this.config.collectStats) {
      this.cache.on((event) => this.emitCacheEvent(event));
    }
  }

  /**
   * URLでキャッシュを取得
   *
   * @param url URL
   * @returns キャッシュ結果
   */
  getByUrl(url: string): CacheGetResult<T> | undefined {
    const key = this.keyGenerator.generateFromUrl(url);
    return this.get(key);
  }

  /**
   * キーでキャッシュを取得
   *
   * @param key キャッシュキー
   * @returns キャッシュ結果
   */
  get(key: string): CacheGetResult<T> | undefined {
    const result = this.cache.get(key);
    if (!result) {
      return undefined;
    }

    // Stale-While-Revalidate: バックグラウンドで再検証
    if (result.stale && !this.revalidatingKeys.has(key)) {
      this.triggerRevalidation(key);
    }

    const entries = this.cache.getAllEntries();
    const entry = entries.find((e) => e.key === key);

    return {
      value: result.value,
      stale: result.stale,
      key,
      metadata: {
        createdAt: entry?.metadata.createdAt ?? Date.now(),
        accessCount: entry?.metadata.accessCount ?? 1,
        expiresAt: entry?.expiresAt ?? 0,
      },
    };
  }

  /**
   * URLでキャッシュを設定
   *
   * @param url URL
   * @param value 値
   * @param options オプション
   */
  setByUrl(url: string, value: T, options: CacheSetOptions = {}): string {
    const key = this.keyGenerator.generateFromUrl(url);
    this.set(key, value, { ...options, sourceUrl: url });
    return key;
  }

  /**
   * キーでキャッシュを設定
   *
   * @param key キャッシュキー
   * @param value 値
   * @param options オプション
   */
  set(key: string, value: T, options: CacheSetOptions = {}): void {
    // TTL決定
    let ttlMs = options.ttlMs;

    if (ttlMs === undefined) {
      // HTTPヘッダーからTTL取得
      if (options.headers) {
        ttlMs = this.ttlManager.getTtlFromHeaders(options.headers);
      }
      // URLパターンからTTL取得
      else if (options.sourceUrl) {
        const result = this.ttlManager.getTtl(options.sourceUrl);
        ttlMs = result.ttlMs;
      }
    }

    this.cache.set(key, value, {
      ttlMs,
      contentType: options.contentType,
      sourceUrl: options.sourceUrl,
      etag: options.etag,
      lastModified: options.lastModified,
    });
  }

  /**
   * キャッシュを削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key, 'manual');
  }

  /**
   * URLでキャッシュを削除
   */
  deleteByUrl(url: string): boolean {
    const key = this.keyGenerator.generateFromUrl(url);
    return this.delete(key);
  }

  /**
   * キャッシュの存在確認
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * URLでキャッシュの存在確認
   */
  hasByUrl(url: string): boolean {
    const key = this.keyGenerator.generateFromUrl(url);
    return this.has(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): { removed: number; freed: number } {
    return this.cache.cleanup();
  }

  /**
   * Stale-While-Revalidateコールバックを設定
   *
   * @param callback 再検証コールバック
   */
  setRevalidateCallback(callback: RevalidateCallback<T>): void {
    // すべてのキーに対して適用
    this.revalidateCallbacks.set('*', callback);
  }

  /**
   * URLパターンに対するRevalidateコールバックを設定
   *
   * @param pattern URLパターン
   * @param callback 再検証コールバック
   */
  setRevalidateCallbackForPattern(
    pattern: string,
    callback: RevalidateCallback<T>
  ): void {
    this.revalidateCallbacks.set(pattern, callback);
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): CacheStatistics {
    return this.cache.getStatistics();
  }

  /**
   * キャッシュサイズ
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュサイズ（バイト）
   */
  get sizeBytes(): number {
    return this.cache.sizeBytes;
  }

  /**
   * キャッシュを永続化
   */
  async persist(): Promise<boolean> {
    if (!this.persistence) {
      return false;
    }

    const entries = this.cache.getAllEntries();
    const statistics = this.cache.getStatistics();
    const result = await this.persistence.save(entries, statistics);

    if (result.success) {
      this.emitCacheEvent({
        type: 'persist',
        path: result.path,
        entries: result.entries,
      });
    }

    return result.success;
  }

  /**
   * 永続化されたキャッシュを読み込み
   */
  async restore(): Promise<boolean> {
    if (!this.persistence) {
      return false;
    }

    const result = await this.persistence.load();
    if (!result.success) {
      return false;
    }

    this.cache.setAllEntries(result.data.entries as CacheEntry<T>[]);
    this.emitCacheEvent({
      type: 'load',
      path: this.persistence.getFilePath(),
      entries: result.data.entries.length,
    });

    return true;
  }

  /**
   * イベントリスナーを追加
   */
  onCacheEvent(listener: CacheEventListener): () => void {
    const wrapper = (event: CacheEvent) => listener(event);
    this.on('cache', wrapper);
    return () => this.off('cache', wrapper);
  }

  /**
   * キャッシュを停止
   */
  dispose(): void {
    this.cache.dispose();
    this.revalidateCallbacks.clear();
    this.revalidatingKeys.clear();
    this.removeAllListeners();
  }

  /**
   * URLからキャッシュキーを生成
   */
  generateKey(url: string): string {
    return this.keyGenerator.generateFromUrl(url);
  }

  /**
   * 設定を取得
   */
  getConfig(): CacheManagerConfig {
    return { ...this.config };
  }

  // ========== Private Methods ==========

  private async triggerRevalidation(key: string): Promise<void> {
    // グローバルコールバック
    const callback = this.revalidateCallbacks.get('*');
    if (!callback) {
      return;
    }

    this.revalidatingKeys.add(key);

    try {
      const newValue = await callback(key);
      if (newValue !== undefined) {
        // 既存のメタデータを維持しつつ更新
        const existing = this.cache.getAllEntries().find((e) => e.key === key);
        this.set(key, newValue, {
          sourceUrl: existing?.metadata.sourceUrl,
          contentType: existing?.metadata.contentType,
        });
      }
    } catch {
      // 再検証失敗は無視（Stale値を使い続ける）
    } finally {
      this.revalidatingKeys.delete(key);
    }
  }

  private emitCacheEvent(event: CacheEvent): void {
    this.emit('cache', event);
  }
}
