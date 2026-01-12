/**
 * エラー型定義
 *
 * @design DES-COMMON-001
 * @task TASK-000
 */

/**
 * エラーモジュール識別子
 */
export type ErrorModule = 'COR' | 'COL' | 'ANA' | 'MED' | 'GEN' | 'KNW';

/**
 * エラーカテゴリ
 */
export type ErrorCategory =
  | 'VAL' // Validation
  | 'AUT' // Authentication
  | 'PRM' // Permission
  | 'NTF' // Not Found
  | 'CNF' // Conflict
  | 'NET' // Network
  | 'TMO' // Timeout
  | 'SEC' // Security
  | 'SYS' // System
  | 'EXT'; // External

/**
 * 構造化エラーコード
 */
export interface StructuredErrorCode {
  /** 完全なエラーコード (e.g., "COL_NTF_001") */
  readonly code: string;
  /** モジュール識別子 */
  readonly module: ErrorModule;
  /** カテゴリ */
  readonly category: ErrorCategory;
  /** 連番 */
  readonly number: string;
}

/**
 * エラーオプション
 */
export interface KatashiroErrorOptions {
  /** 追加詳細情報 */
  readonly details?: Record<string, unknown>;
  /** 原因となったエラー */
  readonly cause?: Error;
  /** リトライ可能か */
  readonly retryable?: boolean;
}

/**
 * シリアライズされたエラー
 */
export interface SerializedError {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly timestamp: string;
  readonly cause?: string;
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  readonly maxRetries: number;
  /** 基本遅延時間 (ms) */
  readonly baseDelayMs: number;
  /** 最大遅延時間 (ms) */
  readonly maxDelayMs: number;
  /** リトライ対象カテゴリ */
  readonly retryableCategories: ReadonlyArray<ErrorCategory>;
}

/**
 * デフォルトリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableCategories: ['NET', 'TMO', 'EXT'],
};
