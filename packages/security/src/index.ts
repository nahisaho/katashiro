/**
 * @nahisaho/katashiro-security
 *
 * Security analysis and audit logging for KATASHIRO
 * @requirement REQ-012
 */

// Types
export {
  RiskLevel,
  RISK_LEVEL_ORDER,
  compareRiskLevels,
  isRiskLevelAtLeast,
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
  DEFAULT_SECURITY_POLICY,
  BUILTIN_RISK_RULES,
  SecurityErrorCode,
  SecurityError,
} from './types';

// SecurityAnalyzer
export { SecurityAnalyzer, SecurityAnalyzerOptions } from './security-analyzer';

// ActionLogger
export {
  LogStorage,
  InMemoryLogStorage,
  ActionLogger,
  ActionLoggerOptions,
  AuditLogSummary,
} from './action-logger';
