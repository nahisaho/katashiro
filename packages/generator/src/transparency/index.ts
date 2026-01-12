/**
 * Transparency Module
 * AI使用透明性機能のエクスポート
 *
 * @module transparency
 * @requirement Phase 2 - 透明性機能
 */

// Types
export type {
  ContributorType,
  AIContributionType,
  HumanContributionType,
  SectionContribution,
  ContributionAnalysis,
  ContributionSummary,
  Version,
  VersionDiff,
  VersionHistory,
  CollaborationSession,
  SessionParticipant,
  SessionOperation,
  SessionStats,
  TransparencyReport,
  AIDisclosure,
  TransparencyReportOptions,
} from './types.js';

// ContributionAnalyzer
export {
  ContributionAnalyzer,
  type SectionInput,
  type AnalysisOptions,
} from './contribution-analyzer.js';

// VersioningManager
export {
  VersioningManager,
  type CreateVersionOptions,
  type DiffOptions,
} from './versioning-manager.js';

// CollaborationTracker
export {
  CollaborationTracker,
  type AddParticipantOptions,
  type RecordOperationOptions,
} from './collaboration-tracker.js';

// TransparencyReportGenerator
export {
  TransparencyReportGenerator,
  type ReportGeneratorConfig,
} from './transparency-report-generator.js';
