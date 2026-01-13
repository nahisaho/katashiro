/**
 * KATASHIRO v1.4.0 - Cascading Research Module
 *
 * カスケード型リサーチ機能のエクスポート
 */

// Types
export type {
  AgentRole,
  StepFocus,
  FindingCategory,
  Finding,
  CascadingSource,
  Contradiction,
  CascadingAgentReport,
  StepContext,
  StepResult,
  CascadingResearchResult,
  CascadingResearchConfig,
  CascadingAgentStrategy,
  StepStrategyConfig,
  CascadingResearchEvent,
  CascadingResearchEventListener,
  PostProcessOptions,
  EarlyTerminationConfig,
} from './types.js';

// Type utilities and defaults
export {
  DEFAULT_AGENT_STRATEGIES,
  DEFAULT_STEP_STRATEGIES,
  DEFAULT_CASCADING_CONFIG,
  generateFindingId,
  generateContradictionId,
  calculateStepConfidence,
  getAgentRoleLabel,
  getStepFocusLabel,
} from './types.js';

// Agent
export type {
  ISearchClient,
  IScraper,
  ITextAnalyzer,
  IEntityExtractor,
  CascadingAgentDependencies,
  CascadingAgentConfig,
} from './CascadingAgent.js';

export { CascadingAgent, createCascadingAgents } from './CascadingAgent.js';

// Step Executor
export type { StepExecutorConfig } from './StepExecutor.js';

export {
  StepExecutor,
  StepContextBuilder,
  DEFAULT_STEP_EXECUTOR_CONFIG,
} from './StepExecutor.js';

// Step Result Integrator
export type { IntegrationConfig, IntegrationResult } from './StepResultIntegrator.js';

export {
  StepResultIntegrator,
  DEFAULT_INTEGRATION_CONFIG,
} from './StepResultIntegrator.js';

// Main Engine
export type {
  EngineState,
  CascadingResearchEngineDependencies,
} from './CascadingResearchEngine.js';

export {
  CascadingResearchEngine,
  createCascadingResearchEngine,
  validateConfig,
} from './CascadingResearchEngine.js';
