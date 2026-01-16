/**
 * LRUCache - Least Recently Used キャッシュ実装
 *
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 * @task TASK-036
 */

import type {
  CacheEntry,
  CacheMetadata,
  CacheStatistics,
  CacheEvent,
  CacheEventListener,
  LRUCacheConfig,
} from './types.js';
import { DEFAULT_LRU_CACHE_CONFIG, createInitialStatistics } from './types.js';

/**
 * LRUキャッシュ実装
 *
 * - LRU（Least Recently Used）アルゴリズムによるエントリ削除
 * - サイズベースとエントリ数ベースの制限
 * - TTL（Time To Live）による自動期限切れ
 * - Stale-While-Revalidateサポート
 */
export class LRUCache<T = unknown> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly config: LRUCacheConfig;
  private stats: CacheStatistics;
  private readonly listeners: Set<CacheEventListener> = new Set();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private currentSizeBytes = 0;

  constructor(config: Partial<LRUCacheConfig> = {}) {
    this.config = { ...DEFAULT_LRU_CACHE_CONFIG, ...config };
    this.stats = createInitialStatistics();

    // 自動クリーンアップ
    if (this.config.cleanupIntervalMs > 0) {
      this.startAutoCleanup();
    }
  }

  /**
   * キャッシュから値を取得
   *
   * @param key キャッシュキー
   * @returns キャッシュエントリ（見つからない場合はundefined）
   */
  get(key: string): { value: T; stale: boolean } | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit({ type: 'miss', key });
      return undefined;
    }

    const now = Date.now();

    // 期限切れチェック
    if (now > entry.expiresAt) {
      // Stale-While-Revalidate チェック
      if (this.config.staleWhileRevalidate) {
        const staleLimit = entry.expiresAt + this.config.staleWhileRevalidateTtlMs;
        if (now <= staleLimit) {
          // Stale値を返す
          this.updateAccessTime(key, entry);
          this.stats.staleHits++;
          this.stats.hits++;
          this.updateHitRate();
          this.emit({ type: 'hit', key, stale: true });
          return { value: entry.value, stale: true };
        }
      }

      // 完全に期限切れ
      this.delete(key, 'expired');
      this.stats.misses++;
      this.updateHitRate();
      this.emit({ type: 'miss', key });
      return undefined;
    }

    // 有効なエントリ
    this.updateAccessTime(key, entry);
    this.stats.hits++;
    this.updateHitRate();
    this.emit({ type: 'hit', key, stale: false });
    return { value: entry.value, stale: false };
  }

  /**
   * キャッシュに値を設定
   *
   * @param key キャッシュキー
   * @param value 値
   * @param options オプション
   */
  set(
    key: string,
    value: T,
    options: {
      ttlMs?: number;
      contentType?: string;
      sourceUrl?: string;
      etag?: string;
      lastModified?: string;
    } = {}
  ): void {
    const now = Date.now();
    const size = this.estimateSize(value);
    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;

    // 既存エントリがあれば削除
    const existing = this.entries.get(key);
    if (existing) {
      this.currentSizeBytes -= existing.metadata.size;
    }

    // サイズ制限チェックと必要に応じて削除
    while (
      (this.currentSizeBytes + size > this.config.maxSizeBytes ||
        this.entries.size >= this.config.maxEntries) &&
      this.entries.size > this.config.minEntries
    ) {
      this.evictLRU();
    }

    const metadata: CacheMetadata = {
      createdAt: existing?.metadata.createdAt ?? now,
      lastAccessedAt: now,
      accessCount: (existing?.metadata.accessCount ?? 0) + 1,
      size,
      contentType: options.contentType,
      sourceUrl: options.sourceUrl,
      etag: options.etag,
      lastModified: options.lastModified,
    };

    const entry: CacheEntry<T> = {
      key,
      value,
      metadata,
      expiresAt: now + ttlMs,
    };

    this.entries.set(key, entry);
    this.currentSizeBytes += size;
    this.updateStatistics();
    this.emit({ type: 'set', key, size });
  }

  /**
   * キャッシュからエントリを削除
   *
   * @param key キャッシュキー
   * @param reason 削除理由
   */
  delete(key: string, reason: 'lru' | 'expired' | 'manual' = 'manual'): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }

    this.entries.delete(key);
    this.currentSizeBytes -= entry.metadata.size;

    if (reason === 'lru') {
      this.stats.evictions++;
    } else if (reason === 'expired') {
      this.stats.expirations++;
    }

    this.updateStatistics();
    this.emit({ type: 'evict', key, reason });
    return true;
  }

  /**
   * キーの存在チェック（期限切れは無効）
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }
    return Date.now() <= entry.expiresAt;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    const count = this.entries.size;
    const freed = this.currentSizeBytes;

    this.entries.clear();
    this.currentSizeBytes = 0;
    this.updateStatistics();

    this.emit({ type: 'cleanup', removed: count, freed });
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): { removed: number; freed: number } {
    const now = Date.now();
    let removed = 0;
    let freed = 0;

    for (const [key, entry] of this.entries) {
      // Stale-While-Revalidate期間も過ぎたエントリを削除
      const staleLimit = this.config.staleWhileRevalidate
        ? entry.expiresAt + this.config.staleWhileRevalidateTtlMs
        : entry.expiresAt;

      if (now > staleLimit) {
        freed += entry.metadata.size;
        this.delete(key, 'expired');
        removed++;
      }
    }

    if (removed > 0) {
      this.emit({ type: 'cleanup', removed, freed });
    }

    return { removed, freed };
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): CacheStatistics {
    return { ...this.stats };
  }

  /**
   * イベントリスナーを追加
   */
  on(listener: CacheEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * キャッシュを停止
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.listeners.clear();
    this.clear();
  }

  /**
   * 全エントリを取得（永続化用）
   */
  getAllEntries(): CacheEntry<T>[] {
    return Array.from(this.entries.values());
  }

  /**
   * エントリを一括設定（復元用）
   */
  setAllEntries(entries: CacheEntry<T>[]): void {
    this.clear();
    for (const entry of entries) {
      if (Date.now() <= entry.expiresAt) {
        this.entries.set(entry.key, entry);
        this.currentSizeBytes += entry.metadata.size;
      }
    }
    this.updateStatistics();
  }

  /**
   * 設定を取得
   */
  getConfig(): LRUCacheConfig {
    return { ...this.config };
  }

  /**
   * 現在のサイズを取得
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * 現在のバイトサイズを取得
   */
  get sizeBytes(): number {
    return this.currentSizeBytes;
  }

  // ========== Private Methods ==========

  private updateAccessTime(key: string, entry: CacheEntry<T>): void {
    const now = Date.now();
    const updated: CacheEntry<T> = {
      ...entry,
      metadata: {
        ...entry.metadata,
        lastAccessedAt: now,
        accessCount: entry.metadata.accessCount + 1,
      },
    };
    this.entries.set(key, updated);
  }

  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.metadata.lastAccessedAt < lruTime) {
        lruTime = entry.metadata.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey, 'lru');
    }
  }

  private estimateSize(value: T): number {
    try {
      const json = JSON.stringify(value);
      // UTF-8: 英数字1バイト、日本語3バイトを概算
      return new TextEncoder().encode(json).length;
    } catch {
      // JSONシリアライズ不可の場合は概算値
      return 1024;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateStatistics(): void {
    this.stats.totalEntries = this.entries.size;
    this.stats.totalSizeBytes = this.currentSizeBytes;

    let oldest = Infinity;
    let newest = 0;
    let totalAccessCount = 0;

    for (const entry of this.entries.values()) {
      if (entry.metadata.createdAt < oldest) {
        oldest = entry.metadata.createdAt;
      }
      if (entry.metadata.createdAt > newest) {
        newest = entry.metadata.createdAt;
      }
      totalAccessCount += entry.metadata.accessCount;
    }

    this.stats.oldestEntryAt = this.entries.size > 0 ? oldest : undefined;
    this.stats.newestEntryAt = this.entries.size > 0 ? newest : undefined;
    this.stats.averageAccessCount =
      this.entries.size > 0 ? totalAccessCount / this.entries.size : 0;
  }

  private emit(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーエラーは無視
      }
    }
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Node.js環境でプロセス終了を妨げない
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }
}
