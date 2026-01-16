/**
 * Cache types - キャッシング機構の型定義
 *
 * @requirement REQ-DR-E-005 キャッシュヒット時の高速応答
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 * @task TASK-034, TASK-035
 */

import { z } from 'zod';

// ============================================================================
// TASK-034: CacheEntry型定義
// ============================================================================

/**
 * キャッシュエントリのメタデータ
 */
export const CacheMetadataSchema = z.object({
  /** 作成日時 */
  createdAt: z.number(),
  /** 最終アクセス日時 */
  lastAccessedAt: z.number(),
  /** アクセス回数 */
  accessCount: z.number(),
  /** エントリサイズ（バイト） */
  size: z.number(),
  /** コンテンツタイプ */
  contentType: z.string().optional(),
  /** 元のURL（該当する場合） */
  sourceUrl: z.string().optional(),
  /** ETag（再検証用） */
  etag: z.string().optional(),
  /** Last-Modified（再検証用） */
  lastModified: z.string().optional(),
});

export type CacheMetadata = z.infer<typeof CacheMetadataSchema>;

/**
 * キャッシュエントリ
 */
export const CacheEntrySchema = z.object({
  /** キャッシュキー */
  key: z.string(),
  /** キャッシュ値（JSON serializable） */
  value: z.unknown(),
  /** メタデータ */
  metadata: CacheMetadataSchema,
  /** 有効期限（Unix timestamp） */
  expiresAt: z.number(),
});

export type CacheEntry<T = unknown> = {
  key: string;
  value: T;
  metadata: CacheMetadata;
  expiresAt: number;
};

// ============================================================================
// TASK-035: LRUCacheConfig型定義
// ============================================================================

/**
 * LRUキャッシュ設定
 */
export const LRUCacheConfigSchema = z.object({
  /** 最大サイズ（バイト）。デフォルト: 500MB */
  maxSizeBytes: z.number().min(1024).default(500 * 1024 * 1024),
  /** 最大エントリ数。デフォルト: 10000 */
  maxEntries: z.number().min(1).default(10000),
  /** 最小保持件数（LRU削除時にも維持）。デフォルト: 100 */
  minEntries: z.number().min(0).default(100),
  /** デフォルトTTL（ミリ秒）。デフォルト: 24時間 */
  defaultTtlMs: z.number().min(0).default(24 * 60 * 60 * 1000),
  /** TTLパターン（URLパターン別TTL設定） */
  ttlPatterns: z.array(z.object({
    pattern: z.string(),
    ttlMs: z.number().min(0),
  })).default([]),
  /** Stale-While-Revalidate有効。デフォルト: true */
  staleWhileRevalidate: z.boolean().default(true),
  /** Stale許容時間（ミリ秒）。デフォルト: 1時間 */
  staleWhileRevalidateTtlMs: z.number().min(0).default(60 * 60 * 1000),
  /** 自動クリーンアップ間隔（ミリ秒）。デフォルト: 5分 */
  cleanupIntervalMs: z.number().min(0).default(5 * 60 * 1000),
  /** 永続化有効。デフォルト: false */
  persistence: z.boolean().default(false),
  /** 永続化パス */
  persistencePath: z.string().optional(),
});

export type LRUCacheConfig = z.infer<typeof LRUCacheConfigSchema>;

/**
 * デフォルトLRUキャッシュ設定
 */
export const DEFAULT_LRU_CACHE_CONFIG: LRUCacheConfig = LRUCacheConfigSchema.parse({});

// ============================================================================
// TASK-039: CacheStatistics型定義
// ============================================================================

/**
 * キャッシュ統計情報
 */
export const CacheStatisticsSchema = z.object({
  /** 総エントリ数 */
  totalEntries: z.number(),
  /** 総サイズ（バイト） */
  totalSizeBytes: z.number(),
  /** キャッシュヒット数 */
  hits: z.number(),
  /** キャッシュミス数 */
  misses: z.number(),
  /** ヒット率（0-1） */
  hitRate: z.number(),
  /** 削除されたエントリ数（LRU） */
  evictions: z.number(),
  /** 期限切れで削除されたエントリ数 */
  expirations: z.number(),
  /** Stale-While-Revalidateヒット数 */
  staleHits: z.number(),
  /** 最古のエントリの作成日時 */
  oldestEntryAt: z.number().optional(),
  /** 最新のエントリの作成日時 */
  newestEntryAt: z.number().optional(),
  /** 平均アクセス回数 */
  averageAccessCount: z.number(),
  /** 統計開始日時 */
  statsStartedAt: z.number(),
});

export type CacheStatistics = z.infer<typeof CacheStatisticsSchema>;

/**
 * 初期キャッシュ統計
 */
export function createInitialStatistics(): CacheStatistics {
  return {
    totalEntries: 0,
    totalSizeBytes: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    expirations: 0,
    staleHits: 0,
    oldestEntryAt: undefined,
    newestEntryAt: undefined,
    averageAccessCount: 0,
    statsStartedAt: Date.now(),
  };
}

// ============================================================================
// CacheKeyGenerator設定
// ============================================================================

/**
 * キャッシュキー生成設定
 */
export const CacheKeyGeneratorConfigSchema = z.object({
  /** クエリパラメータを含める。デフォルト: true */
  includeQuery: z.boolean().default(true),
  /** フラグメントを含める。デフォルト: false */
  includeFragment: z.boolean().default(false),
  /** 無視するクエリパラメータ */
  ignoreParams: z.array(z.string()).default(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']),
  /** ソートしてからハッシュ化。デフォルト: true */
  sortParams: z.boolean().default(true),
  /** ハッシュアルゴリズム。デフォルト: sha256 */
  hashAlgorithm: z.enum(['sha256', 'sha1', 'md5']).default('sha256'),
  /** プレフィックス */
  prefix: z.string().default(''),
});

export type CacheKeyGeneratorConfig = z.infer<typeof CacheKeyGeneratorConfigSchema>;

export const DEFAULT_CACHE_KEY_GENERATOR_CONFIG: CacheKeyGeneratorConfig = CacheKeyGeneratorConfigSchema.parse({});

// ============================================================================
// CacheManager設定
// ============================================================================

/**
 * キャッシュマネージャー設定
 */
export const CacheManagerConfigSchema = z.object({
  /** LRUキャッシュ設定 */
  lru: LRUCacheConfigSchema.default({}),
  /** キーGenertor設定 */
  keyGenerator: CacheKeyGeneratorConfigSchema.default({}),
  /** 自動クリーンアップ有効。デフォルト: true */
  autoCleanup: z.boolean().default(true),
  /** 統計収集有効。デフォルト: true */
  collectStats: z.boolean().default(true),
});

export type CacheManagerConfig = z.infer<typeof CacheManagerConfigSchema>;

export const DEFAULT_CACHE_MANAGER_CONFIG: CacheManagerConfig = CacheManagerConfigSchema.parse({});

// ============================================================================
// イベント型
// ============================================================================

/**
 * キャッシュイベント
 */
export type CacheEvent =
  | { type: 'hit'; key: string; stale: boolean }
  | { type: 'miss'; key: string }
  | { type: 'set'; key: string; size: number }
  | { type: 'evict'; key: string; reason: 'lru' | 'expired' | 'manual' }
  | { type: 'cleanup'; removed: number; freed: number }
  | { type: 'persist'; path: string; entries: number }
  | { type: 'load'; path: string; entries: number };

/**
 * キャッシュイベントリスナー
 */
export type CacheEventListener = (event: CacheEvent) => void;

// ============================================================================
// 永続化形式
// ============================================================================

/**
 * 永続化キャッシュデータ
 */
export const PersistedCacheDataSchema = z.object({
  /** バージョン */
  version: z.literal(1),
  /** 作成日時 */
  createdAt: z.number(),
  /** エントリ一覧 */
  entries: z.array(CacheEntrySchema),
  /** 統計情報 */
  statistics: CacheStatisticsSchema,
});

export type PersistedCacheData = z.infer<typeof PersistedCacheDataSchema>;
