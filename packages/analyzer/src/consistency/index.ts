/**
 * Document Consistency Checker モジュール
 * @module consistency
 * @see DES-KATASHIRO-004-DCC
 */

// 型エクスポート
export type {
  // 基本型
  Severity,
  IssueSeverity,
  NumericFormat,
  DateFormat,
  ReferenceType,
  TermCategory,
  Location,
  Document,

  // 抽出結果型
  ExtractedNumeric,
  ExtractedDate,
  ExtractedTerm,
  ExtractedReference,

  // Issue型
  IssueType,
  ConsistencyIssue,

  // 結果型
  ConsistencyCheckResult,
  CheckStatistics,

  // 設定型
  CheckerConfig,
  CustomRule,
  ReporterConfig,
} from './types.js';

// メインクラスエクスポート
export { DocumentConsistencyChecker } from './DocumentConsistencyChecker.js';

// エクストラクターエクスポート
export { NumericExtractor } from './extractors/NumericExtractor.js';
export type { NumericExtractorConfig } from './extractors/NumericExtractor.js';

export { DateExtractor } from './extractors/DateExtractor.js';
export type { DateExtractorConfig } from './extractors/DateExtractor.js';

export { TermExtractor } from './extractors/TermExtractor.js';
export type { TermExtractorConfig } from './extractors/TermExtractor.js';

export { ReferenceExtractor } from './extractors/ReferenceExtractor.js';
export type { ReferenceExtractorConfig } from './extractors/ReferenceExtractor.js';

// バリデーターエクスポート
export { NumericValidator } from './validators/NumericValidator.js';
export type { NumericValidatorConfig } from './validators/NumericValidator.js';

export { DateValidator } from './validators/DateValidator.js';
export type { DateValidatorConfig } from './validators/DateValidator.js';

export { TermValidator } from './validators/TermValidator.js';
export type { TermValidatorConfig } from './validators/TermValidator.js';

export { ReferenceValidator } from './validators/ReferenceValidator.js';
export type { ReferenceValidatorConfig } from './validators/ReferenceValidator.js';

// レポーターエクスポート
export { ConsistencyReporter } from './reporter/ConsistencyReporter.js';

// ローダーエクスポート
export { DocumentLoader } from './loader/DocumentLoader.js';
export type { DocumentLoaderConfig } from './loader/DocumentLoader.js';
