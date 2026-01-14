/**
 * @nahisaho/katashiro-core
 * 共通型・ユーティリティ
 *
 * @requirement REQ-NFR-006, REQ-NFR-007
 * @design DES-KATASHIRO-001 §2.2, DES-COMMON-001
 * @task TSK-001, TASK-000
 */

// Result型
export type { Result, Ok, Err } from './result.js';
export { ok, err, isOk, isErr } from './result.js';

// 共通型
export type {
  // 基本型
  ID,
  Timestamp,
  URL,
  // 検索関連
  SearchQuery,
  SearchResult,
  SearchOptions,
  // ソース関連
  Source,
  SourceMetadata,
  // コンテンツ関連
  Content,
  ContentType,
  // レガシーエラー型（後方互換）
  KatashiroError as LegacyKatashiroError,
  ErrorCode as LegacyErrorCode,
} from './types.js';

// ユーティリティ
export { generateId, formatTimestamp, validateUrl } from './utils.js';

// ロガー
export type { LogLevel, LogEntry, Logger as LoggerInterface } from './logger.js';
export { Logger, LoggerClass, createLogger } from './logger.js';

// エラーモジュール (DES-COMMON-001)
export {
  // エラークラス
  KatashiroError,
  parseErrorCode,
  // エラーコード定数
  ErrorCodes,
  // リトライユーティリティ
  withRetry,
  retry,
  withRetryPromise,
  calculateBackoffDelay,
  // デフォルト設定
  DEFAULT_RETRY_CONFIG,
} from './errors/index.js';

export type {
  // エラー型
  ErrorModule,
  ErrorCategory,
  StructuredErrorCode,
  KatashiroErrorOptions,
  SerializedError,
  RetryConfig,
  ErrorCodeKey,
  ErrorCodeValue,
  RetryResult,
  RetryCallbacks,
} from './errors/index.js';

// テストユーティリティ
export {
  getTestEnvironment,
  shouldSkipExternalServices,
  shouldSkipOllama,
  shouldSkipNetwork,
  shouldSkipTest,
  getOllamaHost,
  getOllamaModel,
  getEmbeddingModel,
  getTestTimeout,
  delay,
  withRetry as withTestRetry,
  withTimeout,
} from './testing/index.js';

export type { TestEnvironment, ConditionalTestOptions } from './testing/index.js';
