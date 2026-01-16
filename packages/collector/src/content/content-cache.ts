/**
 * ContentCache - LRUキャッシュ実装
 *
 * @requirement REQ-DR-S-003 - キャッシュサイズ管理
 * @requirement REQ-DR-E-005 - キャッシュヒット時の高速応答
 * @design DES-KATASHIRO-005-DR-CONTENT §2.1
 * @task TASK-025
 */

import {
  DEFAULT_CACHE_CONFIG,
  type CacheConfig,
  type CacheStats,
  type ContentEntry,
  type ContentManagerEvent,
  type ContentManagerEventListener,
} from './types.js';

/**
 * キャッシュエントリのメタ情報
 */
interface CacheEntryMeta {
  /** エントリ */
  entry: ContentEntry;
  /** サイズ（バイト） */
  size: number;
  /** 有効期限（タイムスタンプ） */
  expiresAt: number;
  /** 挿入順序 */
  insertOrder: number;
}

/**
 * LRUキャッシュ実装
 */
export class ContentCache {
  private readonly config: CacheConfig;
  private readonly cache: Map<string, CacheEntryMeta>;
  private currentSize: number = 0;
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictedCount: number = 0;
  private expiredCount: number = 0;
  private insertCounter: number = 0;
  private readonly listeners: Set<ContentManagerEventListener> = new Set();

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map();
  }

  /**
   * キャッシュからエントリを取得
   */
  public get(url: string): ContentEntry | undefined {
    const meta = this.cache.get(url);

    if (!meta) {
      this.missCount++;
      this.emit({ type: 'cache:miss', timestamp: new Date().toISOString(), url });
      return undefined;
    }

    // 有効期限チェック
    if (Date.now() > meta.expiresAt) {
      this.expiredCount++;
      this.emit({ type: 'cache:expired', timestamp: new Date().toISOString(), url });
      this.delete(url);
      this.missCount++;
      return undefined;
    }

    // LRU更新（アクセス順序を更新）
    meta.entry.lastAccessedAt = new Date().toISOString();
    meta.entry.accessCount++;
    meta.insertOrder = ++this.insertCounter;

    this.hitCount++;
    this.emit({ type: 'cache:hit', timestamp: new Date().toISOString(), url });

    return meta.entry;
  }

  /**
   * キャッシュにエントリを設定
   */
  public set(entry: ContentEntry, options?: { ttlMs?: number }): void {
    const url = entry.url;
    const ttlMs = options?.ttlMs ?? this.config.defaultTtlMs;
    const size = this.calculateSize(entry);

    // 既存エントリがあれば削除
    if (this.cache.has(url)) {
      this.delete(url);
    }

    // サイズ制限チェック
    while (this.needsEviction(size)) {
      if (!this.evictOne()) {
        // 削除できるエントリがない場合は中断
        break;
      }
    }

    // エントリ数制限チェック
    while (this.cache.size >= this.config.maxEntries) {
      if (!this.evictOne()) {
        break;
      }
    }

    const meta: CacheEntryMeta = {
      entry: {
        ...entry,
        lastAccessedAt: new Date().toISOString(),
        accessCount: (entry.accessCount ?? 0) + 1,
      },
      size,
      expiresAt: Date.now() + ttlMs,
      insertOrder: ++this.insertCounter,
    };

    this.cache.set(url, meta);
    this.currentSize += size;

    this.emit({ type: 'cache:set', timestamp: new Date().toISOString(), url });
  }

  /**
   * キャッシュからエントリを削除
   */
  public delete(url: string): boolean {
    const meta = this.cache.get(url);
    if (!meta) {
      return false;
    }

    this.currentSize -= meta.size;
    this.cache.delete(url);
    return true;
  }

  /**
   * キャッシュにエントリが存在するか確認
   */
  public has(url: string): boolean {
    const meta = this.cache.get(url);
    if (!meta) {
      return false;
    }

    // 有効期限チェック
    if (Date.now() > meta.expiresAt) {
      this.delete(url);
      return false;
    }

    return true;
  }

  /**
   * キャッシュをクリア
   */
  public clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.insertCounter = 0;
  }

  /**
   * 統計情報を取得
   */
  public getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    return {
      entryCount: this.cache.size,
      currentSizeBytes: this.currentSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      evictedCount: this.evictedCount,
      expiredCount: this.expiredCount,
    };
  }

  /**
   * 期限切れエントリを削除
   */
  public purgeExpired(): number {
    const now = Date.now();
    let purgedCount = 0;

    for (const [url, meta] of this.cache.entries()) {
      if (now > meta.expiresAt) {
        this.delete(url);
        purgedCount++;
        this.expiredCount++;
      }
    }

    return purgedCount;
  }

  /**
   * すべてのエントリを取得
   */
  public entries(): ContentEntry[] {
    const result: ContentEntry[] = [];
    for (const meta of this.cache.values()) {
      if (Date.now() <= meta.expiresAt) {
        result.push(meta.entry);
      }
    }
    return result;
  }

  /**
   * イベントリスナーを追加
   */
  public addEventListener(listener: ContentManagerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(listener: ContentManagerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 削除が必要かチェック
   */
  private needsEviction(additionalSize: number): boolean {
    return this.currentSize + additionalSize > this.config.maxSizeBytes;
  }

  /**
   * 1つのエントリを削除（LRU）
   */
  private evictOne(): boolean {
    if (this.cache.size <= this.config.minRetainEntries) {
      return false;
    }

    // 期限切れ優先で削除
    if (this.config.evictExpiredFirst) {
      const expired = this.findExpiredEntry();
      if (expired) {
        this.emit({ type: 'cache:evict', timestamp: new Date().toISOString(), url: expired });
        this.delete(expired);
        this.evictedCount++;
        return true;
      }
    }

    // LRU: 最も古いアクセスのエントリを削除
    const lru = this.findLRUEntry();
    if (lru) {
      this.emit({ type: 'cache:evict', timestamp: new Date().toISOString(), url: lru });
      this.delete(lru);
      this.evictedCount++;
      return true;
    }

    return false;
  }

  /**
   * 期限切れエントリを探す
   */
  private findExpiredEntry(): string | null {
    const now = Date.now();
    for (const [url, meta] of this.cache.entries()) {
      if (now > meta.expiresAt) {
        return url;
      }
    }
    return null;
  }

  /**
   * LRUエントリを探す
   */
  private findLRUEntry(): string | null {
    let oldestUrl: string | null = null;
    let oldestOrder = Infinity;

    for (const [url, meta] of this.cache.entries()) {
      if (meta.insertOrder < oldestOrder) {
        oldestOrder = meta.insertOrder;
        oldestUrl = url;
      }
    }

    return oldestUrl;
  }

  /**
   * エントリのサイズを計算
   */
  private calculateSize(entry: ContentEntry): number {
    // コンテンツの文字数をバイト数として概算（UTF-8を想定）
    let size = entry.content.length * 2;

    // メタデータ分を追加
    size += JSON.stringify(entry.currentVersion).length;
    size += JSON.stringify(entry.versions).length;
    if (entry.metadata) {
      size += JSON.stringify(entry.metadata).length;
    }

    return size;
  }

  /**
   * イベントを発火
   */
  private emit(event: ContentManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーエラーは無視
      }
    }
  }
}
