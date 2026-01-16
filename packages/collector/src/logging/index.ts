/**
 * ログ機構
 *
 * @module logging
 * @requirement REQ-DR-U-002 - ログ機構
 * @design DES-KATASHIRO-005-DR-LOG
 * @task TASK-007, TASK-008, TASK-009
 */

// 型定義
export {
  LogLevelSchema,
  LogEntrySchema,
  LOG_LEVEL_PRIORITY,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_MASKING_PATTERNS,
} from './types.js';

export type {
  LogLevel,
  LogEntry,
  LogFormat,
  LogTransport,
  LoggerConfig,
  MaskingPattern,
} from './types.js';

// 機密データマスカー
export { SensitiveDataMasker } from './sensitive-data-masker.js';

// 構造化ロガー
export {
  StructuredLogger,
  ConsoleTransport,
  MemoryTransport,
  getLogger,
  setLogger,
} from './structured-logger.js';
