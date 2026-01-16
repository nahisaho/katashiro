/**
 * Deep Research Module - Public API
 *
 * @version 3.0.0
 */

// Types
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
  Finding,
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
} from './types.js';

// Error classes
export {
  DeepResearchError,
  AllProvidersFailedError,
  InvalidConfigurationError,
  TokenBudgetExceededError,
} from './types.js';

// Jina Provider
export { JinaProvider, createJinaProvider } from './jina-provider.js';
export type { JinaProviderConfig } from './jina-provider.js';

// DuckDuckGo Provider
export {
  DuckDuckGoProvider,
  createDuckDuckGoProvider,
} from './duckduckgo-provider.js';
export type { DuckDuckGoProviderConfig } from './duckduckgo-provider.js';

// Provider Factory
export {
  SearchProviderFactory,
  createProviderFactory,
} from './provider-factory.js';
export type { ProviderFactoryConfig } from './provider-factory.js';

// Knowledge Base
export { KnowledgeBase, createKnowledgeBase } from './knowledge-base.js';
export type { KnowledgeBaseConfig } from './knowledge-base.js';

// LM Reasoning
export {
  LMReasoning,
  createLMReasoning,
  createOpenAIReasoning,
  FetchLMProvider,
  TemplateLMProvider,
} from './lm-reasoning.js';
export type { LMReasoningConfig } from './lm-reasoning.js';

// Research Engine (Main)
export {
  ResearchEngine,
  createResearchEngine,
  deepResearch,
} from './research-engine.js';
export type { ResearchEngineConfig } from './research-engine.js';
