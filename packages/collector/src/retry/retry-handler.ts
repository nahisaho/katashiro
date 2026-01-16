/**
 * RetryHandler - リトライ処理ハンドラー
 *
 * @requirement REQ-DR-U-001 - リトライ機構
 * @requirement REQ-DR-W-001 - 無限リトライの禁止
 * @design DES-KATASHIRO-005-DR-RETRY §4
 * @task TASK-005
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { RetryPolicy, RetryableErrorType } from './retry-policy.js';
import { DEFAULT_RETRY_POLICY } from './retry-policy.js';
import type { RetryContext } from './retry-context.js';
import { createRetryContext } from './retry-context.js';
import { RetryError } from './retry-error.js';
import { ExponentialBackoff, sleep } from './exponential-backoff.js';

/**
 * HTTPエラー情報
 */
export interface HttpErrorInfo {
  statusCode: number;
  statusText?: string;
  retryAfterMs?: number;
}

/**
 * リトライイベント
 */
export interface RetryEvent {
  type: 'attempt' | 'retry' | 'success' | 'failure';
  attempt: number;
  context: RetryContext;
  error?: Error;
  delayMs?: number;
  timestamp: Date;
}

/**
 * リトライイベントリスナー
 */
export type RetryEventListener = (event: RetryEvent) => void;

/**
 * リトライハンドラーオプション
 */
export interface RetryHandlerOptions {
  policy?: Partial<RetryPolicy>;
  onRetry?: RetryEventListener;
}

/**
 * リトライハンドラー
 *
 * @example
 * ```typescript
 * const handler = new RetryHandler({ policy: { maxRetries: 3 } });
 *
 * const result = await handler.execute(
 *   async () => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   { operation: 'fetchData', url }
 * );
 *
 * if (result.isOk()) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export class RetryHandler {
  private readonly policy: RetryPolicy;
  private readonly backoff: ExponentialBackoff;
  private readonly listeners: RetryEventListener[] = [];

  constructor(options?: RetryHandlerOptions) {
    this.policy = { ...DEFAULT_RETRY_POLICY, ...options?.policy };
    this.backoff = new ExponentialBackoff(this.policy);

    if (options?.onRetry) {
      this.listeners.push(options.onRetry);
    }
  }

  /**
   * リトライ付きで関数を実行
   *
   * @param fn - 実行する関数
   * @param context - リトライコンテキスト
   * @returns Result<T, RetryError>
   */
  public async execute<T>(
    fn: () => Promise<T>,
    context: RetryContext | string
  ): Promise<Result<T, RetryError>> {
    const ctx = typeof context === 'string' ? createRetryContext(context) : context;
    const errorHistory: RetryError['errorHistory'] = [];
    let lastError: Error | null = null;
    let lastHttpInfo: HttpErrorInfo | undefined;

    for (let attempt = 1; attempt <= this.policy.maxRetries + 1; attempt++) {
      try {
        this.emit({
          type: 'attempt',
          attempt,
          context: ctx,
          timestamp: new Date(),
        });

        const result = await fn();

        this.emit({
          type: 'success',
          attempt,
          context: ctx,
          timestamp: new Date(),
        });

        return ok(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;

        // HTTPエラー情報を抽出
        lastHttpInfo = this.extractHttpInfo(err);

        // エラー履歴に追加
        errorHistory.push({
          attempt,
          error: err,
          timestamp: new Date(),
        });

        // リトライすべきかチェック
        if (attempt > this.policy.maxRetries) {
          break; // 最大回数超過
        }

        const shouldRetry = this.shouldRetry(err, lastHttpInfo);
        if (!shouldRetry) {
          break; // リトライ不可のエラー
        }

        // 待機時間を計算
        const backoffResult = this.backoff.calculateWithRetryAfter(
          attempt,
          lastHttpInfo?.retryAfterMs,
          this.policy.maxRetryAfterMs
        );

        // エラー履歴に待機時間を記録
        const lastEntry = errorHistory[errorHistory.length - 1];
        if (lastEntry) {
          lastEntry.delayMs = backoffResult.delayMs;
        }

        this.emit({
          type: 'retry',
          attempt,
          context: ctx,
          error: err,
          delayMs: backoffResult.delayMs,
          timestamp: new Date(),
        });

        // 待機
        await sleep(backoffResult.delayMs);
      }
    }

    // 最終失敗
    const retryError = new RetryError({
      message: `Operation "${ctx.operation}" failed after ${errorHistory.length} attempts`,
      attempts: errorHistory.length,
      lastError: lastError!,
      context: ctx,
      errorType: this.classifyError(lastError!, lastHttpInfo),
      statusCode: lastHttpInfo?.statusCode,
      errorHistory,
    });

    this.emit({
      type: 'failure',
      attempt: errorHistory.length,
      context: ctx,
      error: retryError,
      timestamp: new Date(),
    });

    return err(retryError);
  }

  /**
   * 関数をリトライ可能にラップ
   *
   * @param fn - ラップする関数
   * @param operationName - 操作名
   * @returns ラップされた関数
   */
  public wrap<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>,
    operationName: string
  ): (...args: Args) => Promise<Result<T, RetryError>> {
    return async (...args: Args) => {
      return this.execute(() => fn(...args), operationName);
    };
  }

  /**
   * イベントリスナーを追加
   */
  public on(listener: RetryEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public off(listener: RetryEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * リトライすべきかを判定
   */
  public shouldRetry(error: Error, httpInfo?: HttpErrorInfo): boolean {
    // HTTPステータスコードでチェック
    if (httpInfo?.statusCode) {
      // 明示的にリトライしないコード
      if (this.policy.nonRetryableStatusCodes.includes(httpInfo.statusCode)) {
        return false;
      }
      // リトライ対象コード
      if (this.policy.retryableStatusCodes.includes(httpInfo.statusCode)) {
        return true;
      }
    }

    // エラータイプでチェック
    const errorType = this.classifyError(error, httpInfo);
    if (errorType !== 'UNKNOWN' && this.policy.retryableErrors.includes(errorType)) {
      return true;
    }

    return false;
  }

  /**
   * エラーを分類
   */
  private classifyError(error: Error, httpInfo?: HttpErrorInfo): RetryableErrorType | 'UNKNOWN' {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // ネットワークエラー
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      name.includes('networkerror')
    ) {
      if (message.includes('econnrefused')) return 'CONNECTION_REFUSED';
      if (message.includes('enotfound')) return 'DNS_ERROR';
      if (message.includes('etimedout')) return 'TIMEOUT';
      return 'NETWORK_ERROR';
    }

    // タイムアウト
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      name.includes('timeout')
    ) {
      return 'TIMEOUT';
    }

    // HTTPステータスコード
    if (httpInfo?.statusCode) {
      if (httpInfo.statusCode === 429) return 'RATE_LIMIT';
      if (httpInfo.statusCode >= 500 && httpInfo.statusCode < 600) return 'SERVER_ERROR';
    }

    return 'UNKNOWN';
  }

  /**
   * エラーからHTTP情報を抽出
   */
  private extractHttpInfo(error: Error): HttpErrorInfo | undefined {
    // カスタムプロパティをチェック
    const errWithProps = error as Error & {
      statusCode?: number;
      status?: number;
      response?: { status?: number; headers?: { get?: (name: string) => string | null } };
      retryAfter?: number;
    };

    const statusCode = errWithProps.statusCode ?? errWithProps.status ?? errWithProps.response?.status;

    if (statusCode) {
      let retryAfterMs: number | undefined;

      // Retry-Afterヘッダーを解析
      if (this.policy.respectRetryAfter) {
        const retryAfterHeader = errWithProps.response?.headers?.get?.('retry-after');
        if (retryAfterHeader) {
          retryAfterMs = this.parseRetryAfter(retryAfterHeader);
        } else if (typeof errWithProps.retryAfter === 'number') {
          retryAfterMs = errWithProps.retryAfter * 1000;
        }
      }

      return { statusCode, retryAfterMs };
    }

    // エラーメッセージからステータスコードを抽出
    const match = error.message.match(/(?:HTTP|status)\s*[:\s]?\s*(\d{3})/i);
    if (match && match[1]) {
      return { statusCode: parseInt(match[1], 10) };
    }

    return undefined;
  }

  /**
   * Retry-Afterヘッダーを解析
   */
  private parseRetryAfter(value: string): number | undefined {
    // 秒数の場合
    const seconds = parseInt(value, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // HTTP日付の場合
    const date = Date.parse(value);
    if (!isNaN(date)) {
      const delayMs = date - Date.now();
      return delayMs > 0 ? delayMs : undefined;
    }

    return undefined;
  }

  /**
   * イベントを発火
   */
  private emit(event: RetryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーのエラーは無視
      }
    }
  }

  /**
   * 現在のポリシーを取得
   */
  public getPolicy(): RetryPolicy {
    return { ...this.policy };
  }
}
