/**
 * KATASHIRO Orchestrator Package
 *
 * @fileoverview REQ-006, REQ-009, REQ-010の実装エントリーポイント
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.0
 */

// 型定義
export type {
  // タスク関連 (REQ-009)
  TaskPriority,
  TaskStatus,
  SubTask,
  TaskInput,
  TaskResult,
  TaskError,
  ExecutionPlan,
  DecompositionConfig,
  // マルチエージェント関連 (REQ-006)
  AgentRole,
  AgentState,
  SubAgent,
  AgentContext,
  ConversationMessage,
  ToolCallInfo,
  OrchestrationConfig,
  OrchestrationResult,
  OrchestratorEventType,
  OrchestratorEvent,
  OrchestratorEventListener,
} from './types';

export type {
  // Action-Observation関連 (REQ-010)
  RiskLevel,
  ActionCategory,
  Action,
  Observation,
  ObservationError,
  ObservationMetadata,
  ResourceUsage,
  ToolDefinition,
  ToolExecutor,
  ToolExecutionContext,
  ToolLogger,
  SecurityAssessment,
  RiskFactor,
  ApprovalRequest,
  ToolRegistryConfig,
} from './action-observation-types';

// 定数
export {
  DEFAULT_DECOMPOSITION_CONFIG,
  DEFAULT_ORCHESTRATION_CONFIG,
} from './types';

export { DEFAULT_TOOL_REGISTRY_CONFIG } from './action-observation-types';

// クラス
export {
  TaskDecomposer,
  DecompositionError,
  type DecompositionStrategy,
  type DecomposedTask,
} from './task-decomposer';

export {
  ToolRegistry,
  ToolRegistryError,
  type CreateActionOptions,
  type ApprovalRequestEvent,
  type ApprovalResolvedEvent,
  type ToolRegistryEvents,
} from './tool-registry';

// REQ-006: マルチエージェントオーケストレーター
export {
  MultiAgentOrchestrator,
  type MultiAgentOrchestratorOptions,
  type ResultAggregatorConfig,
  type AggregatedResult,
} from './multi-agent-orchestrator';

// MUSUBIX風対話型情報収集システム (REQ-011)
export {
  // Types
  type DialogueSession,
  type DialogueExchange,
  type DialogueQuestion,
  type DialogueAnswer,
  type DialogueStatus,
  type QuestionType,
  type QuestionCategory,
  type ExtractedContext,
  type BackgroundInfo,
  type Constraint,
  type Stakeholder,
  type SuccessCriterion,
  type Priority,
  type Risk,
  type InferredIntent,
  type AlternativeInterpretation,
  type DialogueCollectorConfig,
  type QuestionStrategy,
  // LLM-Powered Types (v2.0.0)
  type LLMProvider,
  type LLMDialogueConfig,
  type DeepDiveSession,
  type DeepDiveResult,
  // Constants
  DEFAULT_DIALOGUE_CONFIG,
  // Classes
  QuestionGenerator,
  IntentAnalyzer,
  DialogueCollector,
  runSimpleDialogue,
  // LLM-Powered Classes (v2.0.0)
  LLMDialogueCollector,
  runDeepDiveDialogue,
} from './dialogue';

// 反復合議型リサーチワークフロー (REQ-v1.2.0)
export {
  // Types
  type ConsensusResearchConfig,
  type SearchConfig,
  type ReportScore,
  type AgentReport,
  type ConflictDetail,
  type ConflictStatement,
  type ConsensusSelection,
  type SourceReference,
  type AgentStrategy,
  type SourceType,
  type IterationResult,
  type IterationContext,
  type ConsensusResearchResult,
  type ConsensusResearchMetadata,
  type ConsensusResearchEvent,
  // Constants
  DEFAULT_CONSENSUS_CONFIG,
  DEFAULT_AGENT_STRATEGIES as CONSENSUS_AGENT_STRATEGIES,
  ConsensusResearchError,
  ConsensusResearchErrorCode,
  // Classes
  ReportScorer,
  ConsensusSelector,
  ResearchAgent,
  ConsensusResearchEngine,
} from './consensus';

// カスケード型リサーチワークフロー (REQ-v1.4.0)
export {
  // Types
  type AgentRole as CascadingAgentRole,
  type StepFocus,
  type FindingCategory,
  type Finding,
  type CascadingSource,
  type Contradiction,
  type CascadingAgentReport,
  type StepContext,
  type StepResult,
  type CascadingResearchResult,
  type CascadingResearchConfig,
  type CascadingAgentStrategy,
  type StepStrategyConfig,
  type CascadingResearchEvent,
  type CascadingResearchEventListener,
  type ISearchClient,
  type IScraper,
  type ITextAnalyzer,
  type IEntityExtractor,
  type CascadingAgentDependencies,
  type CascadingAgentConfig,
  type StepExecutorConfig,
  type IntegrationConfig,
  type IntegrationResult,
  type EngineState,
  type CascadingResearchEngineDependencies,
  type PostProcessOptions,
  type EarlyTerminationConfig,
  // Constants
  DEFAULT_CASCADING_CONFIG,
  DEFAULT_AGENT_STRATEGIES as CASCADING_AGENT_STRATEGIES,
  DEFAULT_STEP_STRATEGIES,
  DEFAULT_STEP_EXECUTOR_CONFIG,
  DEFAULT_INTEGRATION_CONFIG,
  // Utilities
  generateFindingId,
  generateContradictionId,
  calculateStepConfidence,
  getAgentRoleLabel,
  getStepFocusLabel,
  validateConfig,
  // Classes
  CascadingAgent,
  createCascadingAgents,
  StepExecutor,
  StepContextBuilder,
  StepResultIntegrator,
  CascadingResearchEngine,
  createCascadingResearchEngine,
} from './cascading';

// Agent State Management (REQ-AGENT-002)
export {
  // Types
  type AgentActionType,
  type ToolResult,
  type AgentAction,
  type AgentState as AgentExecutionState, // AgentStateは既存の型と衝突するためリネーム
  type AgentStateStatus,
  type CreateAgentStateOptions,
  type AddActionInput,
  type SerializedAgentState,
  type AgentStateManagerConfig,
  type AgentStateSummary,
  // Classes
  AgentStateManager,
  defaultAgentStateManager,
} from './agent';

// ReAct Helper (REQ-AGENT-004)
export {
  ReActHelper,
  parseReActOutput,
  extractNextReActAction,
  DEFAULT_REACT_FORMAT,
  REACT_SYSTEM_PROMPT,
  type ReActParseResult,
  type ReActStep,
  type ReActFormatConfig,
} from './agent';

// Standard Tools (REQ-AGENT-003)
export {
  // Tool definitions
  SearchTool,
  ScrapeTool,
  AnalyzeTool,
  STANDARD_TOOLS,
  registerStandardTools,
  // Types
  type SearchToolParams,
  type SearchToolResult,
  type ScrapeToolParams,
  type ScrapeToolResult,
  type AnalyzeToolParams,
  type AnalyzeToolResult,
} from './tools';
