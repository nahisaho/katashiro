/**
 * SearchCache - Web検索結果キャッシュ
 *
 * @requirement REQ-IMP-001
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 */

import type { SearchResult } from '@nahisaho/katashiro-core';

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  readonly results: SearchResult[];
  readonly timestamp: number;
  readonly hits: number;
}

/**
 * キャッシュオプション
 */
export interface SearchCacheOptions {
  /** キャッシュの有効期限（ミリ秒）。デフォルト: 5分 */
  readonly ttlMs?: number;
  /** キャッシュの最大サイズ。デフォルト: 100 */
  readonly maxSize?: number;
}

/**
 * 検索結果キャッシュ実装
 * 同一クエリの重複検索を防止し、パフォーマンスを向上
 */
export class SearchCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options?: SearchCacheOptions) {
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5分
    this.maxSize = options?.maxSize ?? 100;
  }

  /**
   * キャッシュキーを生成
   */
  private generateKey(query: string, provider?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedProvider = provider ?? 'default';
    return `${normalizedProvider}:${normalizedQuery}`;
  }

  /**
   * キャッシュから取得
   * @returns キャッシュヒットの場合は結果配列、ミスの場合はundefined
   */
  get(query: string, provider?: string): SearchResult[] | undefined {
    const key = this.generateKey(query, provider);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 有効期限チェック
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // ヒットカウント更新（LRU用）
    this.cache.set(key, {
      ...entry,
      hits: entry.hits + 1,
    });

    return entry.results;
  }

  /**
   * キャッシュに保存
   */
  set(query: string, results: SearchResult[], provider?: string): void {
    const key = this.generateKey(query, provider);

    // 最大サイズチェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 期限切れエントリを削除
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * LRUに基づいてエントリを削除
   */
  private evict(): void {
    // 最も古く、ヒット数が少ないエントリを削除
    let oldest: { key: string; score: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      // スコア = ヒット数 / 経過時間（高いほど価値がある）
      const age = Date.now() - entry.timestamp;
      const score = entry.hits / (age + 1);

      if (!oldest || score < oldest.score) {
        oldest = { key, score };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    oldestEntryAge: number | null;
  } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      oldestEntryAge: oldestTimestamp ? Date.now() - oldestTimestamp : null,
    };
  }
}
