/**
 * @nahisaho/katashiro-security
 *
 * Security analysis and audit logging for KATASHIRO
 * @requirement REQ-012
 */

// Types - Value exports
export {
  RISK_LEVEL_ORDER,
  compareRiskLevels,
  isRiskLevelAtLeast,
  DEFAULT_SECURITY_POLICY,
  BUILTIN_RISK_RULES,
  SecurityError,
} from './types.js';

// Types - Type exports
export type {
  RiskLevel,
  ActionType,
  Action,
  ActionContext,
  Observation,
  PatternRule,
  SecurityPolicy,
  RiskRule,
  RiskRuleMatch,
  SecurityAnalysis,
  AuditLogEntry,
  UserConfirmation,
  AuditLogFilter,
  SecurityErrorCode,
} from './types.js';

// SecurityAnalyzer
export { SecurityAnalyzer } from './security-analyzer.js';
export type { SecurityAnalyzerOptions } from './security-analyzer.js';

// ActionLogger
export {
  InMemoryLogStorage,
  ActionLogger,
} from './action-logger.js';

export type {
  LogStorage,
  ActionLoggerOptions,
  AuditLogSummary,
} from './action-logger.js';
