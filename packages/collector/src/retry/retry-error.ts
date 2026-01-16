/**
 * RetryError - リトライ失敗エラー
 *
 * @requirement REQ-DR-U-001 - リトライ機構
 * @requirement REQ-DR-W-001 - 無限リトライの禁止
 * @design DES-KATASHIRO-005-DR-RETRY §3.3
 * @task TASK-004
 */

import type { RetryContext } from './retry-context.js';
import type { RetryableErrorType } from './retry-policy.js';

/**
 * エラー履歴エントリ
 */
export interface ErrorHistoryEntry {
  /** 試行回数 */
  attempt: number;
  /** 発生したエラー */
  error: Error;
  /** タイムスタンプ */
  timestamp: Date;
  /** 待機時間（ミリ秒） */
  delayMs?: number;
}

/**
 * RetryErrorコンストラクタオプション
 */
export interface RetryErrorOptions {
  /** エラーメッセージ */
  message: string;
  /** 試行回数 */
  attempts: number;
  /** 最後に発生したエラー */
  lastError: Error;
  /** リトライコンテキスト */
  context: RetryContext;
  /** エラータイプ */
  errorType?: RetryableErrorType | 'UNKNOWN';
  /** HTTPステータスコード */
  statusCode?: number;
  /** エラー履歴 */
  errorHistory?: ErrorHistoryEntry[];
}

/**
 * リトライエラー - 最大リトライ回数超過時にスロー
 */
export class RetryError extends Error {
  /** エラー名 */
  public override readonly name = 'RetryError';

  /** 試行回数 */
  public readonly attempts: number;

  /** 最後に発生したエラー */
  public readonly lastError: Error;

  /** リトライコンテキスト */
  public readonly context: RetryContext;

  /** エラータイプ */
  public readonly errorType: RetryableErrorType | 'UNKNOWN';

  /** HTTPステータスコード（該当する場合） */
  public readonly statusCode?: number;

  /** 各試行のエラー履歴 */
  public readonly errorHistory: ErrorHistoryEntry[];

  constructor(options: RetryErrorOptions) {
    super(options.message);
    this.attempts = options.attempts;
    this.lastError = options.lastError;
    this.context = options.context;
    this.errorType = options.errorType ?? 'UNKNOWN';
    this.statusCode = options.statusCode;
    this.errorHistory = options.errorHistory ?? [];

    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryError);
    }
  }

  /**
   * JSON形式でシリアライズ
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      attempts: this.attempts,
      errorType: this.errorType,
      statusCode: this.statusCode,
      context: {
        operation: this.context.operation,
        url: this.context.url,
        requestId: this.context.requestId,
      },
      lastError: {
        name: this.lastError.name,
        message: this.lastError.message,
      },
      errorHistory: this.errorHistory.map((entry) => ({
        attempt: entry.attempt,
        errorName: entry.error.name,
        errorMessage: entry.error.message,
        timestamp: entry.timestamp.toISOString(),
        delayMs: entry.delayMs,
      })),
    };
  }
}

/**
 * RetryErrorかどうかを判定
 */
export function isRetryError(error: unknown): error is RetryError {
  return error instanceof RetryError;
}
