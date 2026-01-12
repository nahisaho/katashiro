/**
 * リトライユーティリティ
 *
 * @design DES-COMMON-001 §6.2
 * @task TASK-000
 */

import type { Result } from '../result.js';
import { isOk, err } from '../result.js';
import type { RetryConfig } from './types.js';
import { DEFAULT_RETRY_CONFIG } from './types.js';
import { KatashiroError } from './KatashiroError.js';

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフ遅延を計算
 *
 * @param attempt - 試行回数 (0から開始)
 * @param baseDelayMs - 基本遅延時間
 * @param maxDelayMs - 最大遅延時間
 * @returns 遅延時間 (ms)
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // ジッター付き指数バックオフ
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30%のジッター
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * リトライ実行結果
 */
export interface RetryResult<T> {
  /** 成功したか */
  readonly success: boolean;
  /** 結果（成功時） */
  readonly value?: T;
  /** 最後のエラー（失敗時） */
  readonly lastError?: KatashiroError;
  /** 試行回数 */
  readonly attempts: number;
  /** 総実行時間 (ms) */
  readonly totalTimeMs: number;
}

/**
 * リトライコールバック
 */
export interface RetryCallbacks<T> {
  /** リトライ前に呼ばれる */
  onRetry?: (attempt: number, error: KatashiroError, delayMs: number) => void;
  /** 成功時に呼ばれる */
  onSuccess?: (result: T, attempts: number) => void;
  /** 最終失敗時に呼ばれる */
  onFailure?: (error: KatashiroError, attempts: number) => void;
}

/**
 * リトライ付きで関数を実行
 *
 * @param fn - 実行する関数
 * @param config - リトライ設定
 * @param callbacks - コールバック
 * @returns 結果
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(url),
 *   { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
 *   { onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<Result<T, KatashiroError>>,
  config: Partial<RetryConfig> = {},
  callbacks?: RetryCallbacks<T>
): Promise<Result<T, KatashiroError>> {
  const mergedConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: KatashiroError | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (isOk(result)) {
        callbacks?.onSuccess?.(result.value, attempt + 1);
        return result;
      }

      lastError = result.error;

      // リトライ不可のエラーはすぐに返す
      if (!shouldRetry(lastError, mergedConfig)) {
        callbacks?.onFailure?.(lastError, attempt + 1);
        return result;
      }

      // 最後の試行ならリトライしない
      if (attempt === mergedConfig.maxRetries) {
        callbacks?.onFailure?.(lastError, attempt + 1);
        return result;
      }

      // バックオフ遅延
      const delay = calculateBackoffDelay(
        attempt,
        mergedConfig.baseDelayMs,
        mergedConfig.maxDelayMs
      );
      callbacks?.onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay);
    } catch (error) {
      // 予期しないエラーをKatashiroErrorに変換
      lastError = KatashiroError.from(error);

      if (!shouldRetry(lastError, mergedConfig)) {
        callbacks?.onFailure?.(lastError, attempt + 1);
        return err(lastError);
      }

      if (attempt === mergedConfig.maxRetries) {
        callbacks?.onFailure?.(lastError, attempt + 1);
        return err(lastError);
      }

      const delay = calculateBackoffDelay(
        attempt,
        mergedConfig.baseDelayMs,
        mergedConfig.maxDelayMs
      );
      callbacks?.onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay);
    }
  }

  // ここには到達しないはずだが、型安全のために
  return err(lastError!);
}

/**
 * リトライすべきかを判定
 */
function shouldRetry(error: KatashiroError, config: RetryConfig): boolean {
  // 明示的にリトライ不可の場合
  if (!error.retryable) {
    return false;
  }

  // カテゴリがリトライ対象か
  return config.retryableCategories.includes(error.category);
}

/**
 * 簡易リトライ（設定なし）
 *
 * @param fn - 実行する関数
 * @param maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns 結果
 */
export async function retry<T>(
  fn: () => Promise<Result<T, KatashiroError>>,
  maxRetries = 3
): Promise<Result<T, KatashiroError>> {
  return withRetry(fn, { maxRetries });
}

/**
 * Promise版リトライ（Result型を使わない場合）
 *
 * @param fn - 実行する関数
 * @param config - リトライ設定
 * @returns 結果
 */
export async function withRetryPromise<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // KatashiroErrorの場合はリトライ可能性をチェック
      if (KatashiroError.isKatashiroError(error)) {
        if (!shouldRetry(error, mergedConfig)) {
          throw error;
        }
      }

      if (attempt === mergedConfig.maxRetries) {
        throw lastError;
      }

      const delay = calculateBackoffDelay(
        attempt,
        mergedConfig.baseDelayMs,
        mergedConfig.maxDelayMs
      );
      await sleep(delay);
    }
  }

  throw lastError!;
}
