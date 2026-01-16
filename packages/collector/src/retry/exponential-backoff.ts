/**
 * ExponentialBackoff - 指数バックオフ計算
 *
 * @requirement REQ-DR-U-001 - リトライ機構（指数バックオフアルゴリズム）
 * @design DES-KATASHIRO-005-DR-RETRY §3.4
 * @task TASK-002
 */

import type { RetryPolicy } from './retry-policy.js';

/**
 * バックオフオプション
 */
export interface BackoffOptions {
  /** 初回待機時間（ミリ秒） */
  initialDelayMs: number;
  /** 最大待機時間（ミリ秒） */
  maxDelayMs: number;
  /** 待機時間の倍率 */
  multiplier: number;
  /** ジッター（±の揺らぎ割合 0.0-1.0） */
  jitter: number;
}

/**
 * 待機時間計算結果
 */
export interface BackoffResult {
  /** 計算された待機時間（ミリ秒） */
  delayMs: number;
  /** ジッター適用前の基本待機時間 */
  baseDelayMs: number;
  /** 適用されたジッター値 */
  jitterMs: number;
  /** 試行回数 */
  attempt: number;
}

/**
 * 指数バックオフ計算クラス
 *
 * 計算式: delay = min(initialDelay * (multiplier ^ attempt), maxDelay) ± jitter
 *
 * @example
 * ```typescript
 * const backoff = new ExponentialBackoff({
 *   initialDelayMs: 2000,
 *   maxDelayMs: 30000,
 *   multiplier: 2,
 *   jitter: 0.1,
 * });
 *
 * // 1回目: ~2000ms, 2回目: ~4000ms, 3回目: ~8000ms
 * const delay1 = backoff.calculate(1);
 * const delay2 = backoff.calculate(2);
 * const delay3 = backoff.calculate(3);
 * ```
 */
export class ExponentialBackoff {
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly multiplier: number;
  private readonly jitter: number;

  constructor(policy: Pick<RetryPolicy, 'initialDelayMs' | 'maxDelayMs' | 'multiplier' | 'jitter'>) {
    this.initialDelayMs = policy.initialDelayMs;
    this.maxDelayMs = policy.maxDelayMs;
    this.multiplier = policy.multiplier;
    this.jitter = policy.jitter;
  }

  /**
   * 指定された試行回数に対する待機時間を計算
   *
   * @param attempt - 試行回数（1から開始）
   * @returns 待機時間（ミリ秒）
   */
  public calculate(attempt: number): BackoffResult {
    if (attempt < 1) {
      throw new Error(`Invalid attempt number: ${attempt}. Must be >= 1`);
    }

    // 基本待機時間: initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);

    // 最大待機時間でキャップ
    const baseDelayMs = Math.min(exponentialDelay, this.maxDelayMs);

    // ジッターを計算（±jitter * baseDelay）
    const jitterRange = baseDelayMs * this.jitter;
    const jitterMs = this.randomInRange(-jitterRange, jitterRange);

    // 最終待機時間（最小0ms）
    const delayMs = Math.max(0, Math.round(baseDelayMs + jitterMs));

    return {
      delayMs,
      baseDelayMs: Math.round(baseDelayMs),
      jitterMs: Math.round(jitterMs),
      attempt,
    };
  }

  /**
   * Retry-Afterヘッダーを考慮した待機時間を計算
   *
   * @param attempt - 試行回数
   * @param retryAfterMs - Retry-Afterヘッダーで指定された待機時間（ミリ秒）
   * @param maxRetryAfterMs - Retry-Afterの最大許容値
   * @returns 待機時間（ミリ秒）
   */
  public calculateWithRetryAfter(
    attempt: number,
    retryAfterMs: number | undefined,
    maxRetryAfterMs: number
  ): BackoffResult {
    const backoffResult = this.calculate(attempt);

    if (retryAfterMs !== undefined && retryAfterMs > 0) {
      // Retry-Afterを最大値でキャップ
      const cappedRetryAfter = Math.min(retryAfterMs, maxRetryAfterMs);

      // Retry-Afterとバックオフの大きい方を採用
      if (cappedRetryAfter > backoffResult.delayMs) {
        return {
          delayMs: cappedRetryAfter,
          baseDelayMs: cappedRetryAfter,
          jitterMs: 0,
          attempt,
        };
      }
    }

    return backoffResult;
  }

  /**
   * 全試行の待機時間を事前計算
   *
   * @param maxRetries - 最大リトライ回数
   * @returns 各試行の待機時間配列
   */
  public calculateAll(maxRetries: number): BackoffResult[] {
    const results: BackoffResult[] = [];
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      results.push(this.calculate(attempt));
    }
    return results;
  }

  /**
   * 合計最大待機時間を計算
   *
   * @param maxRetries - 最大リトライ回数
   * @returns 合計待機時間（ミリ秒）
   */
  public calculateTotalMaxDelay(maxRetries: number): number {
    let total = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const exponentialDelay = this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);
      total += Math.min(exponentialDelay, this.maxDelayMs);
    }
    return Math.round(total);
  }

  /**
   * 範囲内のランダム値を生成
   */
  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}

/**
 * 指定時間待機するPromiseを返す
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
