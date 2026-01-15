/**
 * @nahisaho/katashiro-analyzer
 * 分析・推論パッケージ
 *
 * @requirement REQ-ANALYZE-001 ~ REQ-ANALYZE-011
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-020 ~ TSK-025
 */

export type {
  ISummarizer,
  IFactChecker,
  IBiasDetector,
  IContradictionDetector,
  ITrendAnalyzer,
  ISentimentAnalyzer,
  IMoAEngine,
} from './interfaces.js';

export type {
  Summary,
  FactCheckResult,
  BiasReport,
  Contradiction,
  TrendData,
  SentimentResult,
  MoAResponse,
} from './types.js';

// 実装
export { TextAnalyzer } from './text/index.js';
export {
  StructureAnalyzer,
  type Heading,
  type Section,
  type OutlineNode,
  type ListInfo,
  type CodeBlock,
  type TableInfo,
  type StructureAnalysis,
} from './structure/index.js';
export {
  EntityExtractor,
  type Entity,
  type EntityType,
} from './entity/index.js';
export {
  RelationAnalyzer,
  type RelationType,
  type EntityPair,
  type Relation,
  type GraphNode,
  type GraphEdge,
  type RelationGraph,
} from './relation/index.js';
export {
  TopicModeler,
  type Topic,
  type TopicDistribution,
  type SimilarDocument,
  type DocumentCluster,
} from './topic/index.js';
export {
  QualityScorer,
  type QualityDimension,
  type QualityScore,
  type QualityReport,
} from './quality/index.js';

// コンサルティングフレームワーク
export {
  FrameworkAnalyzer,
  // SWOT
  type SWOTAnalysis,
  type SWOTItem,
  type CrossSWOTStrategy,
  type SWOTInput,
  type SWOTItemInput,
  // 3C
  type ThreeCAnalysis,
  type ThreeCElement,
  type ThreeCFactor,
  type ThreeCInput,
  type ThreeCFactorInput,
  // 4P
  type FourPAnalysis,
  type FourPElement,
  type FourPInput,
  type FourPElementInput,
  // 5Forces
  type FiveForcesAnalysis,
  type ForceAnalysis,
  type FiveForcesInput,
  type ForceInput,
  // ValueChain
  type ValueChainAnalysis,
  type ValueChainActivity,
  type CostItem,
  type ValueChainInput,
  type ActivityInput,
  // MECE
  type MECEAnalysis,
  type MECECategory,
  // LogicTree
  type LogicTree,
  type LogicTreeNode,
  // Hypothesis
  type HypothesisFramework,
  type SubHypothesis,
  type ValidationStep,
  // IssueTree
  type IssueTree,
  type Issue,
  type PrioritizedIssue,
} from './framework/index.js';

// Comparator (v0.2.0)
export {
  MultiSourceComparator,
  type SourceForComparison,
  type ExtractedClaim,
  type ClaimComparison,
  type ComparisonResult,
  // Competitor Analyzer (v0.5.0) - REQ-EXT-CMP-001
  CompetitorAnalyzer,
  type CompetitorData,
  type ComparisonDimension,
  type ComparisonTableOptions,
  type ComparisonTableResult,
  type ComparisonSummary,
  type CompetitorSwot,
} from './comparator/index.js';

// Deep Research (v0.2.3)
export {
  DeepResearchOrchestrator,
  GapAnalyzer,
  ConvergenceDetector,
  QueryGenerator,
  FindingIntegrator,
  type DeepResearchQuery,
  type DeepResearchResult,
  type ResearchProgress,
  type ResearchPhase,
  type SimpleKnowledgeGraph,
  type KeyFinding,
  type ImportanceLevel,
  type SourceReference,
  type IterationRecord,
  type KnowledgeGap,
  type GapType,
  type GapPriority,
  type UserGuidance,
  type IntegrationResult,
  type DeepResearchStatistics,
  type CompletionReason,
} from './research/index.js';

// Trend Analysis (v0.2.3)
export {
  TrendAnalyzer,
  TimeSeriesCollector,
  TrendDetector,
  ForecastEngine,
  VisualizationGenerator,
  DEFAULT_TREND_CONFIG,
  type TrendAnalysisQuery,
  type TrendAnalysisResult,
  type TrendAnalyzerConfig,
  type TrendAnalysisError,
  type TimeSeriesData,
  type CollectionQuery,
  type SampleDocument,
  type DetectedTrend,
  type TrendType,
  type TrendDetectorConfig,
  type TrendSummary,
  type ForecastData,
  type ForecastConfig,
  type ForecastMethod,
  type VisualizationData,
  type LineChartData,
  type HeatmapData,
  type PieChartData,
  type TopicComparison,
  type TrendMetadata,
  type TrendSource,
  type TimeGranularity,
} from './trend/index.js';

// Fact Checker (v0.2.3)
export {
  FactChecker,
  ClaimParser,
  TrustedSourceRegistry,
  EvidenceCollector,
  ConsistencyChecker,
  VerdictGenerator,
  DEFAULT_FACTCHECKER_CONFIG,
  type FactCheckError,
  type FactCheckErrorCode,
  type SearchClient,
  type Scraper,
  type SearchResultItem,
  type ScrapedPage,
  type EvidenceCollectorConfig,
  type ConsistencyResult,
  type VerificationSourceType,
  type VerdictLabel,
  type EvidenceRelation,
  type StrictnessLevel,
  type FactCheckRequest,
  type Verdict,
  type Evidence,
  type VerificationDetails,
  type Reference,
  type ExistingFactCheck,
  type FactCheckMetadata,
  type FactCheckResultDetail,
  type QuickCheckResult,
  type ExtractedClaim as FactCheckExtractedClaim,
  type ClaimType,
  type ClaimVerification,
  type TrustedSourceConfig,
  type VerdictInput,
  type FactCheckerConfig,
} from './factcheck/index.js';

// MoA Engine (v0.2.3)
export {
  MoAEngine,
  TaskAnalyzer,
  AgentOrchestrator,
  ResponseAggregator,
  ConsensusCalculator,
  AGENT_PRESETS,
  DEFAULT_MOA_CONFIG,
  type MoARequest,
  type MoAResult,
  type MoAConfig,
  type AgentConfig as MoAAgentConfig,
  type AgentType,
  type AgentParameters,
  type AgentResponse,
  type PeerScore,
  type TokenUsage as MoATokenUsage,
  type AggregationStrategy,
  type AggregationDetails,
  type AgentContribution,
  type RoundResult,
  type MoAMetadata,
  type MoAEngineOptions,
  type LLMProvider,
  type TaskAnalysis,
  type AggregationResult,
  type ConsensusAnalysis,
  type ConsensusLevel,
} from './moa/index.js';

// Code Interpreter (v0.2.3)
export {
  CodeInterpreter,
  CodeValidator,
  SandboxManager,
  ExecutionEngine,
  ResultFormatter,
  SessionManager,
  DEFAULT_EXECUTION_CONFIG,
  BLOCKED_PYTHON_MODULES,
  ALLOWED_PYTHON_MODULES,
  INTERPRETER_ERROR_CODES,
  CodeInterpreterError,
  type SupportedLanguage,
  type ExecutionMode,
  type ErrorType,
  type SessionState,
  type InputFile,
  type OutputFile,
  type GeneratedImage,
  type ExecutionLog,
  type ExecutionError,
  type SecurityConstraints,
  type ExecutionMetadata,
  type ExecutionRequest,
  type ExecutionResult,
  type CodeAnalysis,
  type ValidationResult,
  type SessionHistoryEntry,
  type ExecutionSession,
  type SandboxConfig,
  type SandboxExecutionResult,
  type SandboxInstance,
  type ExecutionOptions,
  type FormatOptions,
} from './interpreter/index.js';

// Document Consistency Checker (v2.0.0)
export {
  DocumentConsistencyChecker,
  // Extractors
  NumericExtractor,
  DateExtractor,
  TermExtractor,
  ReferenceExtractor,
  // Validators
  NumericValidator,
  DateValidator,
  TermValidator,
  ReferenceValidator,
  // Reporter
  ConsistencyReporter,
  // Loader
  DocumentLoader,
  // Types
  type CheckerConfig,
  type Document as ConsistencyDocument,
  type Location,
  type Severity,
  type IssueSeverity,
  type NumericFormat,
  type DateFormat,
  type ReferenceType,
  type TermCategory,
  type IssueType,
  type ExtractedNumeric,
  type ExtractedDate,
  type ExtractedTerm,
  type ExtractedReference,
  type ConsistencyIssue,
  type ConsistencyCheckResult,
  type CheckStatistics,
  type CustomRule,
  type ReporterConfig,
  type NumericExtractorConfig,
  type DateExtractorConfig,
  type TermExtractorConfig,
  type ReferenceExtractorConfig,
  type NumericValidatorConfig,
  type DateValidatorConfig,
  type TermValidatorConfig,
  type ReferenceValidatorConfig,
  type DocumentLoaderConfig,
} from './consistency/index.js';

// Deep Research Agent
export {
  DeepResearchAgent,
  TokenTracker,
  KnowledgeStore,
  AnswerEvaluator,
  ActionTracker,
  ActionRouter,
  QueryRewriter,
  BaseActionHandler,
  SearchActionHandler,
  VisitActionHandler,
  ReflectActionHandler,
  AnswerActionHandler,
  CodingActionHandler,
} from './research/agent/index.js';

export type {
  // Agent types
  DeepResearchAgentOptions,
  AgentEvent,
  AgentEventType,
  AgentEventListener,
  // Core types
  ActionType,
  AgentConfig,
  AgentResearchResult,
  KnowledgeItem,
  ActionContext,
  StepAction,
  StepDecision,
  LLMClientInterface,
  // Evaluator types
  AnswerEvaluatorOptions,
  EvaluationResponse,
  QuestionAnalysis,
  // Router types
  ActionRouterOptions,
  DecisionContext,
  // Rewriter types
  QueryRewriterOptions,
  RewriteResult,
  IntentLayer,
  // Token tracker types
  TokenTrackerOptions,
  TokenUsage as AgentTokenUsage,
  // Action handler types
  ActionResult,
  ExecutionContext,
} from './research/agent/index.js';
