/**
 * Wide Research Module - エクスポート
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

// メインクラス
export { WideResearchEngine } from './WideResearchEngine.js';

// サポートクラス
export { QueryPlanner, type QueryPlan } from './QueryPlanner.js';
export { ResultAggregator } from './ResultAggregator.js';
export { CoverageAnalyzer } from './CoverageAnalyzer.js';

// 型定義
export type {
  WideResearchQuery,
  WideResearchResult,
  ResearchError,
  ResearchErrorCode,
  ResearchDepth,
  SourceType,
  Finding,
  SourceInfo,
  SourceStatus,
  CoverageReport,
  CoverageGap,
  TemporalCoverage,
  TimeDistribution,
  ResearchStatistics,
  CompletionStatus,
  AgentConfig,
  DateRange,
  DepthConfig,
} from './types.js';

export { DEFAULT_RESEARCH_CONFIG } from './types.js';

// エージェント
export {
  WebSearchAgent,
  NewsSearchAgent,
  AcademicSearchAgent,
  EncyclopediaAgent,
} from './agents/index.js';

export type {
  ISearchAgent,
  AgentSearchQuery,
  AgentSearchResult,
  AgentExecutionResult,
} from './agents/index.js';

// Deep Research (v2.2.0) - REQ-DR-S-001, REQ-DR-S-002, REQ-DR-S-003
export {
  DeepResearchOrchestrator,
  UrlProcessor,
  IterationController,
  DeepResearchQuerySchema,
  DEFAULT_DEEP_RESEARCH_CONFIG,
} from './deep-research/index.js';

export type {
  DeepResearchQuery,
  DeepResearchConfig,
  DeepResearchResult,
  DeepResearchError,
  DeepResearchErrorCode,
  DeepResearchFinding,
  DeepResearchState,
  DeepResearchStatistics,
  ProcessingPhase,
  UrlStatus,
  IterationResult,
  ReasoningStep,
  ParallelConfig,
  TimeoutConfig,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
  UrlProcessorConfig,
  UrlProcessResult,
  IScraperAdapter,
  UrlProcessorEventType,
  IterationConfig,
  IterationState,
  IterationEventType,
  ShouldContinueResult,
} from './deep-research/index.js';
