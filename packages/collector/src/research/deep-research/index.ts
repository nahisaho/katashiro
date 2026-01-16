/**
 * DeepResearch モジュール - エクスポート
 *
 * @requirement REQ-DR-S-001, REQ-DR-S-002, REQ-DR-S-003
 * @requirement REQ-DR-U-001, REQ-DR-U-002, REQ-DR-U-003
 * @requirement REQ-DR-E-001, REQ-DR-E-005
 * @task TASK-031~034
 */

// Types
export {
  DeepResearchQuerySchema,
  DEFAULT_DEEP_RESEARCH_CONFIG,
} from './types.js';

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
} from './types.js';

// URL Processor
export { UrlProcessor } from './UrlProcessor.js';
export type {
  UrlProcessorConfig,
  UrlProcessResult,
  IScraperAdapter,
  UrlProcessorEventType,
} from './UrlProcessor.js';

// Iteration Controller
export { IterationController } from './IterationController.js';
export type {
  IterationConfig,
  IterationState,
  IterationEventType,
  ShouldContinueResult,
} from './IterationController.js';

// Orchestrator
export { DeepResearchOrchestrator } from './DeepResearchOrchestrator.js';
