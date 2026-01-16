/**
 * フォールバック機構
 *
 * @module fallback
 * @requirement REQ-DR-U-003 - フォールバック機構
 * @design DES-KATASHIRO-005-DR-FALLBACK
 * @task TASK-016, TASK-017, TASK-018, TASK-019
 */

// 型定義
export {
  FallbackSourceTypeSchema,
  DEFAULT_FALLBACK_CONFIG,
} from './types.js';

export type {
  FallbackSourceType,
  FallbackResult,
  FallbackConfig,
  AlternativeSource,
  WaybackSnapshot,
  CacheEntry,
  FallbackEvent,
  FallbackEventListener,
} from './types.js';

// Wayback Machine クライアント
export { WaybackMachineClient, WaybackError } from './wayback-machine.js';

// フォールバックハンドラー
export { FallbackHandler, FallbackError } from './fallback-handler.js';
