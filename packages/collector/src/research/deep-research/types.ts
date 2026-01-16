/**
 * DeepResearchOrchestrator - 型定義
 *
 * Deep Research Enhancement Phase 4 の統合オーケストレーター用型定義
 *
 * @requirement REQ-DR-S-001, REQ-DR-S-002, REQ-DR-S-003
 * @requirement REQ-DR-U-001, REQ-DR-U-002, REQ-DR-U-003
 * @requirement REQ-DR-E-001, REQ-DR-E-005
 * @task TASK-031
 */

import { z } from 'zod';
import type { RetryPolicy } from '../../retry/index.js';
import type { LoggerConfig } from '../../logging/index.js';
import type { FallbackConfig } from '../../fallback/index.js';
import type { CacheConfig, CheckpointConfig } from '../../content/types.js';
import type { ResearchDepth, SourceType, DateRange } from '../types.js';

// =====================================
// DeepResearch Query
// =====================================

/**
 * DeepResearch クエリパラメータ
 */
export interface DeepResearchQuery {
  /** 調査トピック */
  topic: string;

  /** 検索の深さ */
  depth?: ResearchDepth;

  /** 使用するソースタイプ */
  sources?: SourceType[];

  /** 最大URL取得数 */
  maxUrls?: number;

  /** 最大イテレーション数 */
  maxIterations?: number;

  /** 収束閾値（新規情報率がこれ以下で終了） */
  convergenceThreshold?: number;

  /** 言語フィルター */
  languages?: string[];

  /** 日付範囲 */
  dateRange?: DateRange;

  /** 除外キーワード */
  excludeKeywords?: string[];

  /** チェックポイントからの復元ID */
  resumeFromCheckpoint?: string;
}

/**
 * DeepResearch クエリスキーマ
 */
export const DeepResearchQuerySchema = z.object({
  topic: z.string().min(1),
  depth: z.enum(['shallow', 'medium', 'deep']).optional().default('medium'),
  sources: z.array(z.enum(['web', 'news', 'academic', 'encyclopedia', 'social', 'government', 'custom'])).optional(),
  maxUrls: z.number().min(1).max(100).optional().default(20),
  maxIterations: z.number().min(1).max(20).optional().default(5),
  convergenceThreshold: z.number().min(0).max(1).optional().default(0.1),
  languages: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  resumeFromCheckpoint: z.string().optional(),
});

// =====================================
// DeepResearch Configuration
// =====================================

/**
 * オーケストレーター設定
 */
export interface DeepResearchConfig {
  /** リトライポリシー */
  retry: Partial<RetryPolicy>;

  /** ロガー設定 */
  logging: Partial<LoggerConfig>;

  /** フォールバック設定 */
  fallback: Partial<FallbackConfig>;

  /** キャッシュ設定 */
  cache: Partial<CacheConfig>;

  /** チェックポイント設定 */
  checkpoint: Partial<CheckpointConfig>;

  /** 並列処理設定 */
  parallel: ParallelConfig;

  /** タイムアウト設定 */
  timeouts: TimeoutConfig;
}

/**
 * 並列処理設定
 */
export interface ParallelConfig {
  /** 最大並列リクエスト数 */
  maxConcurrent: number;

  /** ドメインあたりの最大並列数 */
  maxPerDomain: number;

  /** リクエスト間隔（ミリ秒） */
  requestInterval: number;
}

/**
 * タイムアウト設定
 */
export interface TimeoutConfig {
  /** 単一URLのタイムアウト（ミリ秒） */
  perUrl: number;

  /** イテレーションのタイムアウト（ミリ秒） */
  perIteration: number;

  /** 全体のタイムアウト（ミリ秒） */
  total: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_DEEP_RESEARCH_CONFIG: DeepResearchConfig = {
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
  },
  logging: {
    level: 'info',
    format: 'json',
    includeTimestamp: true,
    maskSensitiveData: true,
  },
  fallback: {
    useCache: true,
    useWayback: true,
    useGoogleCache: false,
    timeoutMs: 30000,
    maxArchiveAgeDays: 30,
  },
  cache: {
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    maxEntries: 1000,
    defaultTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  checkpoint: {
    directory: './.katashiro/checkpoints',
    intervalMs: 60000, // 1 minute
    maxCheckpoints: 10,
  },
  parallel: {
    maxConcurrent: 5,
    maxPerDomain: 2,
    requestInterval: 500,
  },
  timeouts: {
    perUrl: 30000,
    perIteration: 300000, // 5 minutes
    total: 1800000, // 30 minutes
  },
};

// =====================================
// DeepResearch State
// =====================================

/**
 * 処理状態
 */
export type ProcessingPhase =
  | 'initializing'
  | 'searching'
  | 'scraping'
  | 'analyzing'
  | 'aggregating'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'paused';

/**
 * URL処理状態
 */
export interface UrlStatus {
  url: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  usedFallback?: boolean;
  contentHash?: string;
}

/**
 * イテレーション結果
 */
export interface IterationResult {
  iteration: number;
  urlsProcessed: number;
  urlsSucceeded: number;
  urlsFailed: number;
  newInfoRate: number;
  findings: number;
  durationMs: number;
}

/**
 * 処理状態
 */
export interface DeepResearchState {
  /** セッションID */
  sessionId: string;

  /** 現在のフェーズ */
  phase: ProcessingPhase;

  /** 開始時刻 */
  startedAt: string;

  /** 現在のイテレーション */
  currentIteration: number;

  /** URL処理状態 */
  urls: Map<string, UrlStatus>;

  /** イテレーション結果 */
  iterations: IterationResult[];

  /** 最終更新時刻 */
  lastUpdatedAt: string;

  /** エラーカウント */
  errorCount: number;

  /** 総処理時間（ミリ秒） */
  totalProcessingTime: number;
}

// =====================================
// DeepResearch Result
// =====================================

/**
 * 調査結果の発見事項
 */
export interface DeepResearchFinding {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  sourceType: SourceType;
  relevanceScore: number;
  timestamp: string;
  keywords: string[];
  entities: string[];
}

/**
 * 推論チェーン
 */
export interface ReasoningStep {
  step: number;
  type: 'observation' | 'inference' | 'synthesis' | 'conclusion';
  description: string;
  sourceIds: string[];
  findingIds: string[];
  confidence: number;
}

/**
 * 調査統計
 */
export interface DeepResearchStatistics {
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  skippedUrls: number;
  cacheHits: number;
  fallbackUsed: number;
  retryCount: number;
  totalIterations: number;
  averageNewInfoRate: number;
  processingTimeMs: number;
}

/**
 * DeepResearch 結果
 */
export interface DeepResearchResult {
  /** セッションID */
  sessionId: string;

  /** 調査トピック */
  topic: string;

  /** 発見事項 */
  findings: DeepResearchFinding[];

  /** 推論チェーン */
  reasoningChain: ReasoningStep[];

  /** 統計情報 */
  statistics: DeepResearchStatistics;

  /** 完了ステータス */
  status: 'completed' | 'partial' | 'failed' | 'resumed';

  /** 処理時間（ミリ秒） */
  processingTimeMs: number;

  /** チェックポイントID（再開用） */
  checkpointId?: string;

  /** メタデータ */
  metadata: {
    startedAt: string;
    completedAt: string;
    version: string;
    config: DeepResearchConfig;
  };
}

// =====================================
// Events
// =====================================

/**
 * オーケストレーターイベントタイプ
 */
export type OrchestratorEventType =
  | 'started'
  | 'phaseChanged'
  | 'iterationStarted'
  | 'iterationCompleted'
  | 'urlProcessing'
  | 'urlCompleted'
  | 'urlFailed'
  | 'retrying'
  | 'fallbackTriggered'
  | 'checkpointSaved'
  | 'checkpointLoaded'
  | 'cacheHit'
  | 'error'
  | 'completed'
  | 'paused'
  | 'resumed'
  | 'aborted';

/**
 * オーケストレーターイベント
 */
export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: string;
  sessionId: string;
  data?: Record<string, unknown>;
}

/**
 * イベントリスナー
 */
export type OrchestratorEventListener = (event: OrchestratorEvent) => void;

// =====================================
// Errors
// =====================================

/**
 * エラーコード
 */
export type DeepResearchErrorCode =
  | 'INITIALIZATION_ERROR'
  | 'SEARCH_ERROR'
  | 'SCRAPING_ERROR'
  | 'ANALYSIS_ERROR'
  | 'TIMEOUT_ERROR'
  | 'CHECKPOINT_ERROR'
  | 'RESOURCE_EXHAUSTED'
  | 'INVALID_QUERY'
  | 'CANCELLED';

/**
 * DeepResearch エラー
 */
export interface DeepResearchError {
  code: DeepResearchErrorCode;
  message: string;
  cause?: Error;
  context?: Record<string, unknown>;
}
