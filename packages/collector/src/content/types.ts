/**
 * ContentManager 型定義
 *
 * @requirement REQ-DR-S-001 - チェックポイント保存
 * @requirement REQ-DR-S-003 - キャッシュサイズ管理
 * @requirement REQ-DR-E-005 - キャッシュヒット時の高速応答
 * @design DES-KATASHIRO-005-DR-CONTENT
 * @task TASK-024
 */

import { z } from 'zod';

/**
 * コンテンツエントリの状態
 */
export const ContentStatusSchema = z.enum([
  'pending', // 未取得
  'fetching', // 取得中
  'success', // 取得成功
  'failed', // 取得失敗
  'cached', // キャッシュから読み込み
  'stale', // 期限切れ
]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

/**
 * コンテンツバージョン情報
 */
export const ContentVersionSchema = z.object({
  /** バージョンID */
  versionId: z.string(),
  /** コンテンツハッシュ（SHA-256） */
  hash: z.string(),
  /** 取得日時 */
  fetchedAt: z.string().datetime(),
  /** コンテンツサイズ（バイト） */
  size: z.number().int().nonnegative(),
  /** HTTPステータスコード */
  statusCode: z.number().int().optional(),
  /** ヘッダー情報 */
  headers: z.record(z.string()).optional(),
  /** ソース（original, cache, wayback, etc） */
  source: z.string().optional(),
});
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

/**
 * コンテンツエントリ
 */
export const ContentEntrySchema = z.object({
  /** URL */
  url: z.string().url(),
  /** コンテンツ本文 */
  content: z.string(),
  /** コンテンツタイプ（MIME） */
  contentType: z.string().default('text/html'),
  /** ステータス */
  status: ContentStatusSchema,
  /** 現在のバージョン */
  currentVersion: ContentVersionSchema,
  /** 過去のバージョン（最新順） */
  versions: z.array(ContentVersionSchema).default([]),
  /** 最終アクセス日時 */
  lastAccessedAt: z.string().datetime(),
  /** アクセス回数 */
  accessCount: z.number().int().nonnegative().default(0),
  /** メタデータ */
  metadata: z.record(z.unknown()).optional(),
});
export type ContentEntry = z.infer<typeof ContentEntrySchema>;

/**
 * キャッシュ設定
 */
export const CacheConfigSchema = z.object({
  /** 最大サイズ（バイト） */
  maxSizeBytes: z.number().int().positive().default(500 * 1024 * 1024), // 500MB
  /** 最大エントリ数 */
  maxEntries: z.number().int().positive().default(1000),
  /** 最小保持件数（LRU削除時） */
  minRetainEntries: z.number().int().nonnegative().default(100),
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24時間
  /** TTL期限切れ優先で削除 */
  evictExpiredFirst: z.boolean().default(true),
});
export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * チェックポイント設定
 */
export const CheckpointConfigSchema = z.object({
  /** 有効化 */
  enabled: z.boolean().default(true),
  /** 保存間隔（ミリ秒） */
  intervalMs: z.number().int().positive().default(60 * 1000), // 1分
  /** 保存ディレクトリ */
  directory: z.string().default('.katashiro-cache/checkpoints'),
  /** 最大チェックポイント保持数 */
  maxCheckpoints: z.number().int().positive().default(10),
  /** 圧縮有効化 */
  compression: z.boolean().default(false),
});
export type CheckpointConfig = z.infer<typeof CheckpointConfigSchema>;

/**
 * ContentManager設定
 */
export const ContentManagerConfigSchema = z.object({
  /** キャッシュ設定 */
  cache: CacheConfigSchema.default({}),
  /** チェックポイント設定 */
  checkpoint: CheckpointConfigSchema.default({}),
  /** バージョン履歴保持数 */
  maxVersionHistory: z.number().int().positive().default(5),
  /** 差分検出を有効化 */
  enableDiffDetection: z.boolean().default(true),
  /** 差分閾値（パーセンテージ、これ以上変化があれば新バージョン） */
  diffThreshold: z.number().min(0).max(1).default(0.1),
});
export type ContentManagerConfig = z.infer<typeof ContentManagerConfigSchema>;

/**
 * デフォルト設定
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = CacheConfigSchema.parse({});
export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = CheckpointConfigSchema.parse({});
export const DEFAULT_CONTENT_MANAGER_CONFIG: ContentManagerConfig = ContentManagerConfigSchema.parse({});

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** 現在のエントリ数 */
  entryCount: number;
  /** 現在のサイズ（バイト） */
  currentSizeBytes: number;
  /** キャッシュヒット数 */
  hitCount: number;
  /** キャッシュミス数 */
  missCount: number;
  /** ヒット率 */
  hitRate: number;
  /** 削除されたエントリ数 */
  evictedCount: number;
  /** 期限切れエントリ数 */
  expiredCount: number;
}

/**
 * チェックポイント情報
 */
export interface CheckpointInfo {
  /** チェックポイントID */
  id: string;
  /** 作成日時 */
  createdAt: string;
  /** ファイルパス */
  filePath: string;
  /** サイズ（バイト） */
  sizeBytes: number;
  /** エントリ数 */
  entryCount: number;
  /** 圧縮されているか */
  compressed: boolean;
}

/**
 * チェックポイントデータ
 */
export interface CheckpointData {
  /** チェックポイントID */
  id: string;
  /** 作成日時 */
  createdAt: string;
  /** バージョン */
  version: string;
  /** コンテンツエントリ */
  entries: ContentEntry[];
  /** 処理状態 */
  processingState: {
    /** 処理済みURL */
    processedUrls: string[];
    /** 残りURL */
    pendingUrls: string[];
    /** 失敗URL */
    failedUrls: string[];
    /** 進捗率 */
    progress: number;
  };
  /** メタデータ */
  metadata: Record<string, unknown>;
}

/**
 * ContentManagerイベント
 */
export type ContentManagerEventType =
  | 'cache:hit'
  | 'cache:miss'
  | 'cache:set'
  | 'cache:evict'
  | 'cache:expired'
  | 'checkpoint:save'
  | 'checkpoint:load'
  | 'version:created'
  | 'content:changed';

export interface ContentManagerEvent {
  type: ContentManagerEventType;
  timestamp: string;
  url?: string;
  entryId?: string;
  checkpointId?: string;
  metadata?: Record<string, unknown>;
}

export type ContentManagerEventListener = (event: ContentManagerEvent) => void;

/**
 * 差分情報
 */
export interface ContentDiff {
  /** 変更があったか */
  hasChanges: boolean;
  /** 変更率（0-1） */
  changeRatio: number;
  /** 追加された文字数 */
  addedChars: number;
  /** 削除された文字数 */
  removedChars: number;
  /** 変更種別 */
  changeType: 'none' | 'minor' | 'major' | 'complete';
}
