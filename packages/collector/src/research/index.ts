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

// Deep Research v3.0.0 (Completely rewritten)
// Main exports
export {
  ResearchEngine,
  createResearchEngine,
  deepResearch,
  KnowledgeBase,
  createKnowledgeBase,
  LMReasoning,
  createLMReasoning,
  createOpenAIReasoning,
  FetchLMProvider,
  TemplateLMProvider,
  JinaProvider,
  createJinaProvider,
  DuckDuckGoProvider,
  createDuckDuckGoProvider,
  SearchProviderFactory,
  createProviderFactory,
  DeepResearchError,
  AllProvidersFailedError,
  InvalidConfigurationError,
  TokenBudgetExceededError,
} from './deep-research/index.js';

// Type exports
export type {
  ResearchConfig,
  ProviderConfig,
  SERPQuery,
  SearchResult,
  WebContent,
  WebReadRequest,
  KnowledgeItem,
  ReflectiveQuestion,
  ResearchContext,
  Finding as DeepResearchFinding,
  TechnicalOption,
  Recommendation,
  Reference,
  ReportMetadata,
  ResearchReport,
  IterationLog,
  ResearchAction,
  TokenUsage,
  SearchProvider,
  LMProvider,
  LMGenerationOptions,
  EvaluationResult,
  ResearchEventType,
  ResearchEvent,
  ResearchEventListener,
  ResearchEngineConfig,
  KnowledgeBaseConfig,
  LMReasoningConfig,
  JinaProviderConfig,
  DuckDuckGoProviderConfig,
  ProviderFactoryConfig,
} from './deep-research/index.js';
