/**
 * Evaluation Package
 *
 * LLMアプリケーションの出力品質を評価・ベンチマークするパッケージ
 *
 * @requirement REQ-EVAL-001 ~ REQ-EVAL-007
 * @design DES-KATASHIRO-003-EVAL
 * @version 2.0.0
 */

// Types
export type {
  // Core evaluation types
  Evaluator,
  EvaluationInput,
  EvaluationResult,
  EvaluationMetadata,
  // Dataset types
  Dataset,
  DatasetItem,
  // Experiment types
  ExperimentConfig,
  ExperimentResult,
  ExperimentSummary,
  ExperimentDetailResult,
  // A/B Test types
  ABTestConfig,
  ABTestResult,
  ABTestVariant,
  // Benchmark types
  BenchmarkConfig,
  BenchmarkResult,
  // LLMJudge types (REQ-EVAL-101)
  EvaluationCriteria,
  LLMJudgeEvaluatorConfig,
  LLMJudgeResult,
  // RAG evaluation types (REQ-EVAL-102)
  RAGEvaluationInput,
  RAGASEvaluationResult,
} from './types.js';

// Evaluators
export {
  LengthEvaluator,
  KeywordEvaluator,
  RegexEvaluator,
  JsonStructureEvaluator,
  SimilarityEvaluator,
  CompositeEvaluator,
  EvaluatorRegistry,
  getEvaluatorRegistry,
  resetEvaluatorRegistry,
  // LLMJudge (REQ-EVAL-101)
  LLMJudgeEvaluator,
  DEFAULT_CRITERIA,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EVALUATION_PROMPT_TEMPLATE,
  // RAGAS (REQ-EVAL-102)
  FaithfulnessEvaluator,
  ContextRelevancyEvaluator,
  AnswerRelevancyEvaluator,
  ContextRecallEvaluator,
  RAGASCompositeEvaluator,
  isRAGEvaluationInput,
} from './evaluators/index.js';

export type {
  LengthEvaluatorConfig,
  KeywordEvaluatorConfig,
  RegexEvaluatorConfig,
  CompositeEvaluatorConfig,
  // RAGAS (REQ-EVAL-102)
  RAGEvaluatorConfig,
  RAGASCompositeEvaluatorConfig,
} from './evaluators/index.js';

// Dataset Manager
export {
  DatasetManager,
  getDatasetManager,
  resetDatasetManager,
} from './DatasetManager.js';

// Experiment Runner
export {
  ExperimentRunner,
  getExperimentRunner,
  resetExperimentRunner,
} from './ExperimentRunner.js';

export type { ExperimentRunnerConfig } from './ExperimentRunner.js';

// Benchmark Suite
export {
  BenchmarkSuite,
  getBenchmarkSuite,
  resetBenchmarkSuite,
} from './BenchmarkSuite.js';

export type { BenchmarkFn } from './BenchmarkSuite.js';
// Reporting (REQ-EVAL-103)
export {
  EvaluationReporter,
  generateEvaluationReport,
  DEFAULT_REPORT_CONFIG,
  defaultTemplates,
  defaultHeaderTemplate,
  defaultSummaryTemplate,
  defaultResultRowTemplate,
  defaultFooterTemplate,
  generateProgressBar,
  generateScoreBadge,
  generateComparisonTable,
  generateScoreHeatmap,
} from './reporting/index.js';

export type {
  EvaluationReportConfig,
  EvaluationReportData,
  ReportSection,
  SummaryStatistics,
  TemplateFunction,
  TemplateCollection,
  HeaderTemplateData,
  SummaryTemplateData,
  ResultRowTemplateData,
} from './reporting/index.js';