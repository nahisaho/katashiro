/**
 * RetryPolicy - リトライポリシー定義
 *
 * @requirement REQ-DR-U-001 - リトライ機構
 * @requirement REQ-DR-W-001 - 無限リトライの禁止（maxRetries=3）
 * @design DES-KATASHIRO-005-DR-RETRY §3.1
 * @task TASK-001
 */

import { z } from 'zod';

/**
 * リトライ対象のエラータイプ
 */
export type RetryableErrorType =
  | 'NETWORK_ERROR'      // ネットワークエラー（ECONNRESET, ETIMEDOUT等）
  | 'TIMEOUT'            // タイムアウト
  | 'RATE_LIMIT'         // HTTP 429
  | 'SERVER_ERROR'       // HTTP 500, 502, 503, 504
  | 'CONNECTION_REFUSED' // ECONNREFUSED
  | 'DNS_ERROR';         // ENOTFOUND

/**
 * RetryPolicy Zodスキーマ
 */
export const RetryPolicySchema = z.object({
  /**
   * 最大リトライ回数（デフォルト: 3）
   * @requirement REQ-DR-W-001 - 3回を超えない
   */
  maxRetries: z.number().int().min(0).max(10).default(3),

  /**
   * 初期待機時間（ミリ秒、デフォルト: 2000）
   */
  initialDelayMs: z.number().int().min(100).max(60000).default(2000),

  /**
   * 最大待機時間（ミリ秒、デフォルト: 30000）
   */
  maxDelayMs: z.number().int().min(1000).max(300000).default(30000),

  /**
   * バックオフ乗数（デフォルト: 2）
   */
  multiplier: z.number().min(1).max(5).default(2),

  /**
   * ジッター係数（0-1、デフォルト: 0.1）
   * 待機時間に ±(jitter * delay) のランダム性を追加
   */
  jitter: z.number().min(0).max(1).default(0.1),

  /**
   * リトライ対象のHTTPステータスコード
   */
  retryableStatusCodes: z.array(z.number()).default([429, 500, 502, 503, 504]),

  /**
   * リトライ対象のエラータイプ
   */
  retryableErrors: z.array(
    z.enum([
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'SERVER_ERROR',
      'CONNECTION_REFUSED',
      'DNS_ERROR',
    ])
  ).default(['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'SERVER_ERROR', 'CONNECTION_REFUSED']),

  /**
   * リトライしないHTTPステータスコード（明示的に除外）
   */
  nonRetryableStatusCodes: z.array(z.number()).default([400, 401, 403, 404, 405, 410, 422]),

  /**
   * Retry-Afterヘッダーを尊重するか
   */
  respectRetryAfter: z.boolean().default(true),

  /**
   * Retry-Afterの最大待機時間（ミリ秒）
   */
  maxRetryAfterMs: z.number().int().min(0).max(600000).default(300000),
});

/**
 * RetryPolicy型
 */
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

/**
 * デフォルトリトライポリシー
 *
 * @requirement REQ-DR-U-001
 * - 初回リトライ待機時間: 2秒
 * - 2回目リトライ待機時間: 4秒
 * - 3回目リトライ待機時間: 8秒
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  multiplier: 2,
  jitter: 0.1,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'SERVER_ERROR', 'CONNECTION_REFUSED'],
  nonRetryableStatusCodes: [400, 401, 403, 404, 405, 410, 422],
  respectRetryAfter: true,
  maxRetryAfterMs: 300000,
};
