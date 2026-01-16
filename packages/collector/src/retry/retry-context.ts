/**
 * RetryContext - リトライコンテキスト
 *
 * @requirement REQ-DR-U-001 - リトライ機構
 * @design DES-KATASHIRO-005-DR-RETRY §3.2
 * @task TASK-003
 */

import { z } from 'zod';

/**
 * RetryContext Zodスキーマ
 */
export const RetryContextSchema = z.object({
  /**
   * 対象URL
   */
  url: z.string().url().optional(),

  /**
   * 操作名（識別用）
   */
  operation: z.string().min(1).max(100),

  /**
   * 追加メタデータ
   */
  metadata: z.record(z.unknown()).optional(),

  /**
   * リクエストID（トレーシング用）
   */
  requestId: z.string().uuid().optional(),

  /**
   * 開始時刻
   */
  startedAt: z.date().optional(),
});

/**
 * RetryContext型
 */
export type RetryContext = z.infer<typeof RetryContextSchema>;

/**
 * RetryContextを作成
 */
export function createRetryContext(
  operation: string,
  options?: Partial<Omit<RetryContext, 'operation'>>
): RetryContext {
  return {
    operation,
    startedAt: new Date(),
    requestId: crypto.randomUUID(),
    ...options,
  };
}
