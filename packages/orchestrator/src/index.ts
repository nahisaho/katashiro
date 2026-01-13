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
  // Constants
  DEFAULT_DIALOGUE_CONFIG,
  // Classes
  QuestionGenerator,
  IntentAnalyzer,
  DialogueCollector,
  runSimpleDialogue,
} from './dialogue';
