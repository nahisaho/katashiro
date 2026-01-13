/**
 * KATASHIRO Orchestrator - Type Definitions
 *
 * @fileoverview REQ-009: タスク分解・計画、REQ-006: マルチエージェントオーケストレーション
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.0
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

// =============================================================================
// REQ-009: タスク分解・計画
// =============================================================================

/**
 * タスクの優先度
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * タスクの状態
 */
export type TaskStatus =
  | 'pending'     // 待機中
  | 'ready'       // 実行可能
  | 'running'     // 実行中
  | 'completed'   // 完了
  | 'failed'      // 失敗
  | 'cancelled'   // キャンセル
  | 'blocked';    // ブロック（依存待ち）

/**
 * サブタスク定義
 * EARS: When a complex task is received, the system shall decompose it into subtasks
 */
export interface SubTask {
  /** サブタスクID */
  readonly id: ID;
  /** サブタスク名 */
  readonly name: string;
  /** 詳細説明 */
  readonly description: string;
  /** 入力データ */
  readonly input: TaskInput;
  /** 期待出力の型定義 */
  readonly expectedOutputSchema?: Record<string, unknown>;
  /** 優先度 */
  readonly priority: TaskPriority;
  /** ステータス */
  status: TaskStatus;
  /** 依存するタスクID（DAG構造） */
  readonly dependencies: readonly ID[];
  /** 推定実行時間（秒） */
  readonly estimatedDuration?: number;
  /** 実行結果 */
  result?: TaskResult;
  /** 作成日時 */
  readonly createdAt: Timestamp;
  /** 更新日時 */
  updatedAt: Timestamp;
}

/**
 * タスク入力
 */
export interface TaskInput {
  /** 入力タイプ */
  readonly type: 'text' | 'data' | 'file' | 'url' | 'mixed';
  /** 入力コンテンツ */
  readonly content: unknown;
  /** メタデータ */
  readonly metadata?: Record<string, unknown>;
}

/**
 * タスク実行結果
 */
export interface TaskResult {
  /** 成功/失敗 */
  readonly success: boolean;
  /** 出力データ */
  readonly output?: unknown;
  /** エラー情報 */
  readonly error?: TaskError;
  /** 実行時間（ミリ秒） */
  readonly duration: number;
  /** 完了日時 */
  readonly completedAt: Timestamp;
}

/**
 * タスクエラー
 */
export interface TaskError {
  /** エラーコード */
  readonly code: string;
  /** エラーメッセージ */
  readonly message: string;
  /** 詳細情報 */
  readonly details?: Record<string, unknown>;
  /** リトライ可能か */
  readonly retryable: boolean;
}

/**
 * タスク実行計画（DAG）
 * EARS: The system shall generate a DAG representing task dependencies
 */
export interface ExecutionPlan {
  /** プランID */
  readonly id: ID;
  /** プラン名 */
  readonly name: string;
  /** 元のタスク説明 */
  readonly originalTask: string;
  /** サブタスク一覧 */
  readonly tasks: SubTask[];
  /** 実行順序（トポロジカルソート済み） */
  readonly executionOrder: readonly ID[];
  /** 並列実行可能なタスクグループ */
  readonly parallelGroups: readonly (readonly ID[])[];
  /** 総推定時間（秒） */
  readonly estimatedTotalDuration: number;
  /** プラン作成日時 */
  readonly createdAt: Timestamp;
  /** プラン状態 */
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
}

/**
 * タスク分解設定
 */
export interface DecompositionConfig {
  /** 最大サブタスク数 */
  readonly maxSubTasks: number;
  /** 最小サブタスク粒度（推定実行時間秒） */
  readonly minTaskGranularity: number;
  /** 依存関係の深さ上限 */
  readonly maxDependencyDepth: number;
  /** 並列実行を許可 */
  readonly allowParallel: boolean;
  /** 同時実行タスク数上限（allowParallel=true時に有効） */
  readonly maxConcurrentTasks: number;
}

/**
 * デフォルト分解設定
 */
export const DEFAULT_DECOMPOSITION_CONFIG: DecompositionConfig = {
  maxSubTasks: 50,
  minTaskGranularity: 5,
  maxDependencyDepth: 10,
  allowParallel: true,
  maxConcurrentTasks: 5, // 同時実行タスク数上限
};

// =============================================================================
// REQ-006: マルチエージェントオーケストレーション
// =============================================================================

/**
 * エージェントのロール
 */
export type AgentRole =
  | 'orchestrator'  // オーケストレーター（メインエージェント）
  | 'researcher'    // リサーチャー
  | 'analyzer'      // アナライザー
  | 'generator'     // ジェネレーター
  | 'validator'     // バリデーター
  | 'executor'      // エグゼキューター（コード実行等）
  | 'custom';       // カスタムロール

/**
 * エージェントの状態
 */
export type AgentState =
  | 'idle'          // 待機中
  | 'initializing'  // 初期化中
  | 'working'       // 作業中
  | 'waiting'       // 入力待ち
  | 'error'         // エラー
  | 'terminated';   // 終了

/**
 * サブエージェント定義
 * EARS: The system shall spawn independent sub-agents for each subtask
 */
export interface SubAgent {
  /** エージェントID */
  readonly id: ID;
  /** エージェント名 */
  readonly name: string;
  /** ロール */
  readonly role: AgentRole;
  /** 現在の状態 */
  state: AgentState;
  /** 担当タスクID */
  readonly assignedTaskId?: ID;
  /** エージェント固有のコンテキスト（独立） */
  context: AgentContext;
  /** 利用可能なツール */
  readonly availableTools: readonly string[];
  /** 作成日時 */
  readonly createdAt: Timestamp;
  /** 最終アクティビティ */
  lastActivity: Timestamp;
}

/**
 * エージェントコンテキスト（独立・分離）
 * EARS: Each sub-agent shall maintain an independent context to avoid context pollution
 */
export interface AgentContext {
  /** コンテキストID */
  readonly id: ID;
  /** 親エージェントID（オーケストレーターから継承した情報用） */
  readonly parentId?: ID;
  /** タスク固有の情報 */
  taskInfo: Record<string, unknown>;
  /** 会話履歴（このエージェント固有） */
  conversationHistory: ConversationMessage[];
  /** 中間結果 */
  intermediateResults: unknown[];
  /** メモリ使用量（トークン概算） */
  memoryUsage: number;
  /** 最大メモリ（トークン） */
  readonly maxMemory: number;
}

/**
 * 会話メッセージ
 */
export interface ConversationMessage {
  /** メッセージID */
  readonly id: ID;
  /** 送信者ロール */
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  /** メッセージ内容 */
  readonly content: string;
  /** タイムスタンプ */
  readonly timestamp: Timestamp;
  /** ツール呼び出し情報（roleがtoolの場合） */
  readonly toolCall?: ToolCallInfo;
}

/**
 * ツール呼び出し情報
 */
export interface ToolCallInfo {
  /** ツール名 */
  readonly toolName: string;
  /** 引数 */
  readonly arguments: Record<string, unknown>;
  /** 結果 */
  readonly result?: unknown;
}

/**
 * オーケストレーション設定
 */
export interface OrchestrationConfig {
  /** 最大同時エージェント数 */
  readonly maxConcurrentAgents: number;
  /** エージェントタイムアウト（秒） */
  readonly agentTimeout: number;
  /** コンテキスト切り替え時間上限（ミリ秒） */
  readonly maxContextSwitchTime: number;
  /** エージェントあたりの最大メモリ（トークン） */
  readonly maxAgentMemory: number;
  /** 失敗時の自動リトライ回数 */
  readonly maxRetries: number;
  /** リトライ間隔（ミリ秒） */
  readonly retryDelay: number;
}

/**
 * デフォルトオーケストレーション設定
 */
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
  maxConcurrentAgents: 10,
  agentTimeout: 300,
  maxContextSwitchTime: 1000,
  maxAgentMemory: 8000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * オーケストレーション結果
 */
export interface OrchestrationResult {
  /** 成功/失敗 */
  readonly success: boolean;
  /** 最終出力 */
  readonly output?: unknown;
  /** 実行されたタスク数 */
  readonly completedTasks: number;
  /** 失敗したタスク数 */
  readonly failedTasks: number;
  /** 総実行時間（ミリ秒） */
  readonly totalDuration: number;
  /** 使用したエージェント数 */
  readonly agentsUsed: number;
  /** 各タスクの結果 */
  readonly taskResults: Map<ID, TaskResult>;
  /** エラー一覧 */
  readonly errors: TaskError[];
}

// =============================================================================
// イベント型
// =============================================================================

/**
 * オーケストレーションイベント型
 */
export type OrchestratorEventType =
  | 'plan:created'
  | 'plan:approved'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'agent:spawned'
  | 'agent:terminated'
  | 'context:switched'
  | 'orchestration:completed'
  | 'orchestration:failed';

/**
 * オーケストレーションイベント
 */
export interface OrchestratorEvent {
  /** イベントタイプ */
  readonly type: OrchestratorEventType;
  /** イベントデータ */
  readonly data: unknown;
  /** タイムスタンプ */
  readonly timestamp: Timestamp;
  /** 関連タスクID */
  readonly taskId?: ID;
  /** 関連エージェントID */
  readonly agentId?: ID;
}

/**
 * イベントリスナー
 */
export type OrchestratorEventListener = (event: OrchestratorEvent) => void | Promise<void>;
