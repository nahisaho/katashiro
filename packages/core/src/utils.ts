/**
 * ユーティリティ関数
 *
 * @requirement REQ-NFR-006
 * @design DES-KATASHIRO-001 §2.2
 * @task TSK-001
 */

import type { ID, Timestamp, URL } from './types.js';
import { Result, ok, err } from './result.js';

/**
 * ユニークIDを生成
 */
export function generateId(prefix?: string): ID {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const id = `${timestamp}-${random}`;
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * 現在時刻をISO 8601形式でフォーマット
 */
export function formatTimestamp(date?: Date): Timestamp {
  return (date ?? new Date()).toISOString();
}

/**
 * URLの妥当性を検証
 */
export function validateUrl(url: string): Result<URL, string> {
  try {
    const parsed = new globalThis.URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return err('URL must use http or https protocol');
    }
    return ok(url);
  } catch {
    return err('Invalid URL format');
  }
}
