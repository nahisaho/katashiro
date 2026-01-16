/**
 * Parallel processing types - 並列処理機構の型定義
 *
 * @requirement REQ-DR-S-002 並列処理の動的制御
 * @requirement REQ-DR-W-004 ドメイン別レート制限
 * @task TASK-044
 */

import { z } from 'zod';

// ============================================================================
// Semaphore Types
// ============================================================================

/**
 * セマフォ設定
 */
export const SemaphoreConfigSchema = z.object({
  /** 最大同時実行数 */
  maxConcurrency: z.number().min(1).default(5),
  /** タイムアウト（ミリ秒）。0で無制限 */
  acquireTimeoutMs: z.number().min(0).default(30000),
  /** 公平性モード（FIFO順序を保証） */
  fair: z.boolean().default(true),
});

export type SemaphoreConfig = z.infer<typeof SemaphoreConfigSchema>;

export const DEFAULT_SEMAPHORE_CONFIG: SemaphoreConfig = SemaphoreConfigSchema.parse({});

// ============================================================================
// DomainRateLimiter Types (TASK-044)
// ============================================================================

/**
 * ドメイン別設定
 */
export const DomainConfigSchema = z.object({
  /** ドメインパターン（ワイルドカード対応） */
  pattern: z.string().default('*'),
  /** 同時リクエスト数上限 */
  maxConcurrency: z.number().min(1).default(2),
  /** リクエスト間隔（ミリ秒） */
  minIntervalMs: z.number().min(0).default(1000),
  /** バースト許容数 */
  burstLimit: z.number().min(1).default(5),
  /** バースト後のクールダウン（ミリ秒） */
  burstCooldownMs: z.number().min(0).default(60000),
});

export type DomainConfig = z.infer<typeof DomainConfigSchema>;

/**
 * ドメインレートリミッター設定
 */
export const DomainRateLimiterConfigSchema = z.object({
  /** デフォルト設定 */
  defaultConfig: DomainConfigSchema.default({
    pattern: '*',
    maxConcurrency: 2,
    minIntervalMs: 1000,
    burstLimit: 5,
    burstCooldownMs: 60000,
  }),
  /** ドメイン別設定 */
  domainConfigs: z.array(DomainConfigSchema).default([]),
  /** グローバル最大並列数 */
  globalMaxConcurrency: z.number().min(1).default(10),
  /** robots.txtのCrawl-delayを尊重 */
  respectCrawlDelay: z.boolean().default(true),
});

export type DomainRateLimiterConfig = z.infer<typeof DomainRateLimiterConfigSchema>;

export const DEFAULT_DOMAIN_RATE_LIMITER_CONFIG: DomainRateLimiterConfig =
  DomainRateLimiterConfigSchema.parse({});

// ============================================================================
// ConcurrencyQueue Types
// ============================================================================

/**
 * タスク優先度
 */
export type TaskPriority = 'high' | 'normal' | 'low';

/**
 * キュータスク
 */
export interface QueueTask<T> {
  id: string;
  priority: TaskPriority;
  domain: string;
  url: string;
  execute: () => Promise<T>;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * キュー設定
 */
export const ConcurrencyQueueConfigSchema = z.object({
  /** 最大キューサイズ */
  maxSize: z.number().min(1).default(1000),
  /** タスクタイムアウト（ミリ秒） */
  taskTimeoutMs: z.number().min(0).default(60000),
  /** 優先度別の重み */
  priorityWeights: z.object({
    high: z.number().default(3),
    normal: z.number().default(2),
    low: z.number().default(1),
  }).default({ high: 3, normal: 2, low: 1 }),
});

export type ConcurrencyQueueConfig = z.infer<typeof ConcurrencyQueueConfigSchema>;

export const DEFAULT_CONCURRENCY_QUEUE_CONFIG: ConcurrencyQueueConfig =
  ConcurrencyQueueConfigSchema.parse({});

// ============================================================================
// ResourceMonitor Types
// ============================================================================

/**
 * リソース使用状況
 */
export interface ResourceUsage {
  /** CPU使用率（0-100） */
  cpuPercent: number;
  /** メモリ使用率（0-100） */
  memoryPercent: number;
  /** 使用メモリ（バイト） */
  memoryUsedBytes: number;
  /** 総メモリ（バイト） */
  memoryTotalBytes: number;
  /** イベントループ遅延（ミリ秒） */
  eventLoopDelayMs: number;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * リソースモニター設定
 */
export const ResourceMonitorConfigSchema = z.object({
  /** 監視間隔（ミリ秒） */
  intervalMs: z.number().min(100).default(1000),
  /** CPU警告閾値（%） */
  cpuWarningThreshold: z.number().min(0).max(100).default(80),
  /** メモリ警告閾値（%） */
  memoryWarningThreshold: z.number().min(0).max(100).default(85),
  /** 履歴保持数 */
  historySize: z.number().min(1).default(60),
});

export type ResourceMonitorConfig = z.infer<typeof ResourceMonitorConfigSchema>;

export const DEFAULT_RESOURCE_MONITOR_CONFIG: ResourceMonitorConfig =
  ResourceMonitorConfigSchema.parse({});

// ============================================================================
// AdaptiveConcurrencyController Types
// ============================================================================

/**
 * 適応的並列度設定
 */
export const AdaptiveConcurrencyConfigSchema = z.object({
  /** 初期並列度 */
  initialConcurrency: z.number().min(1).default(5),
  /** 最小並列度 */
  minConcurrency: z.number().min(1).default(1),
  /** 最大並列度 */
  maxConcurrency: z.number().min(1).default(20),
  /** 調整間隔（ミリ秒） */
  adjustmentIntervalMs: z.number().min(100).default(5000),
  /** スケールアップ閾値（成功率%） */
  scaleUpThreshold: z.number().min(0).max(100).default(90),
  /** スケールダウン閾値（エラー率%） */
  scaleDownThreshold: z.number().min(0).max(100).default(20),
  /** CPU上限（%） */
  cpuLimit: z.number().min(0).max(100).default(80),
  /** メモリ上限（%） */
  memoryLimit: z.number().min(0).max(100).default(85),
});

export type AdaptiveConcurrencyConfig = z.infer<typeof AdaptiveConcurrencyConfigSchema>;

export const DEFAULT_ADAPTIVE_CONCURRENCY_CONFIG: AdaptiveConcurrencyConfig =
  AdaptiveConcurrencyConfigSchema.parse({});

// ============================================================================
// ParallelExecutor Types
// ============================================================================

/**
 * 並列実行設定
 */
export const ParallelExecutorConfigSchema = z.object({
  /** セマフォ設定 */
  semaphore: SemaphoreConfigSchema.default({}),
  /** レートリミッター設定 */
  rateLimiter: DomainRateLimiterConfigSchema.default({}),
  /** キュー設定 */
  queue: ConcurrencyQueueConfigSchema.default({}),
  /** 適応的並列度設定 */
  adaptive: AdaptiveConcurrencyConfigSchema.default({}),
  /** リソースモニター設定 */
  resourceMonitor: ResourceMonitorConfigSchema.default({}),
  /** 適応的並列度制御を有効化 */
  enableAdaptive: z.boolean().default(true),
  /** リトライ有効 */
  enableRetry: z.boolean().default(true),
  /** 最大リトライ回数 */
  maxRetries: z.number().min(0).default(3),
});

export type ParallelExecutorConfig = z.infer<typeof ParallelExecutorConfigSchema>;

export const DEFAULT_PARALLEL_EXECUTOR_CONFIG: ParallelExecutorConfig =
  ParallelExecutorConfigSchema.parse({});

// ============================================================================
// ContentStreamHandler Types
// ============================================================================

/**
 * ストリーミング設定
 */
export const ContentStreamConfigSchema = z.object({
  /** 最大コンテンツサイズ（バイト）。デフォルト: 10MB */
  maxSizeBytes: z.number().min(1024).default(10 * 1024 * 1024),
  /** チャンクサイズ（バイト）。デフォルト: 64KB */
  chunkSizeBytes: z.number().min(1024).default(64 * 1024),
  /** タイムアウト（ミリ秒） */
  timeoutMs: z.number().min(0).default(60000),
  /** 圧縮を許可 */
  allowCompression: z.boolean().default(true),
});

export type ContentStreamConfig = z.infer<typeof ContentStreamConfigSchema>;

export const DEFAULT_CONTENT_STREAM_CONFIG: ContentStreamConfig =
  ContentStreamConfigSchema.parse({});

// ============================================================================
// イベント型
// ============================================================================

/**
 * 並列処理イベント
 */
export type ParallelEvent =
  | { type: 'taskStart'; taskId: string; url: string }
  | { type: 'taskComplete'; taskId: string; url: string; durationMs: number }
  | { type: 'taskError'; taskId: string; url: string; error: string }
  | { type: 'concurrencyChange'; previous: number; current: number; reason: string }
  | { type: 'rateLimited'; domain: string; delayMs: number }
  | { type: 'resourceWarning'; resource: 'cpu' | 'memory'; usage: number };

/**
 * イベントリスナー
 */
export type ParallelEventListener = (event: ParallelEvent) => void;

// ============================================================================
// 実行結果型
// ============================================================================

/**
 * タスク実行結果
 */
export interface TaskResult<T> {
  taskId: string;
  url: string;
  success: boolean;
  result?: T;
  error?: Error;
  durationMs: number;
  retries: number;
}

/**
 * バッチ実行結果
 */
export interface BatchResult<T> {
  total: number;
  succeeded: number;
  failed: number;
  results: TaskResult<T>[];
  totalDurationMs: number;
  averageDurationMs: number;
}
