/**
 * エラーモジュール
 *
 * @design DES-COMMON-001
 * @task TASK-000
 */

// 型定義
export type {
  ErrorModule,
  ErrorCategory,
  StructuredErrorCode,
  KatashiroErrorOptions,
  SerializedError,
  RetryConfig,
} from './types.js';

export { DEFAULT_RETRY_CONFIG } from './types.js';

// エラークラス
export { KatashiroError, parseErrorCode } from './KatashiroError.js';

// エラーコード定数
export { ErrorCodes } from './ErrorCodes.js';
export type { ErrorCodeKey, ErrorCodeValue } from './ErrorCodes.js';

// リトライユーティリティ
export {
  withRetry,
  retry,
  withRetryPromise,
  calculateBackoffDelay,
} from './retry.js';
export type { RetryResult, RetryCallbacks } from './retry.js';
