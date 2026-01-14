/**
 * Reporting Module
 *
 * 評価レポート生成機能のエントリポイント
 */

export {
  EvaluationReporter,
  generateEvaluationReport,
  DEFAULT_REPORT_CONFIG,
  type EvaluationReportConfig,
  type EvaluationReportData,
  type ReportSection,
  type SummaryStatistics,
} from './EvaluationReporter.js';

export {
  defaultTemplates,
  defaultHeaderTemplate,
  defaultSummaryTemplate,
  defaultResultRowTemplate,
  defaultFooterTemplate,
  generateProgressBar,
  generateScoreBadge,
  generateComparisonTable,
  generateScoreHeatmap,
  type TemplateFunction,
  type TemplateCollection,
  type HeaderTemplateData,
  type SummaryTemplateData,
  type ResultRowTemplateData,
} from './templates.js';
