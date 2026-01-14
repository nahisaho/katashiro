/**
 * Agent Types - エージェント状態管理の型定義
 *
 * @requirement REQ-AGENT-002
 * @description エージェントの状態管理のための型定義
 */

/**
 * エージェントアクションの種類
 */
export type AgentActionType = 'tool_call' | 'thought' | 'observation' | 'final_answer';

/**
 * ツール実行結果
 */
export interface ToolResult {
  /** ツール名 */
  toolName: string;
  /** 成功したか */
  success: boolean;
  /** 結果データ */
  data?: unknown;
  /** エラーメッセージ */
  error?: string;
  /** 実行時間（ミリ秒） */
  executionTimeMs?: number;
}

/**
 * エージェントアクション
 */
export interface AgentAction {
  /** ステップ番号 */
  step: number;
  /** タイムスタンプ */
  timestamp: string;
  /** アクション種類 */
  type: AgentActionType;
  /** アクション内容 */
  content: {
    /** ツール名（type=tool_callの場合） */
    tool?: string;
    /** パラメータ（type=tool_callの場合） */
    params?: Record<string, unknown>;
    /** ツール実行結果（type=observationの場合） */
    result?: ToolResult;
    /** 思考内容（type=thoughtの場合） */
    thought?: string;
    /** 最終回答（type=final_answerの場合） */
    answer?: string;
  };
}

/**
 * エージェント状態
 */
export interface AgentState {
  /** 会話ID */
  conversationId: string;
  /** 現在のステップ */
  currentStep: number;
  /** 最大ステップ */
  maxSteps: number;
  /** 実行履歴 */
  history: AgentAction[];
  /** コンテキスト（任意のデータ） */
  context: Record<string, unknown>;
  /** 中間結果 */
  intermediateResults: unknown[];
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** 状態 */
  status: AgentStateStatus;
}

/**
 * エージェント状態のステータス
 */
export type AgentStateStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * エージェント状態作成オプション
 */
export interface CreateAgentStateOptions {
  /** 会話ID（未指定時は自動生成） */
  conversationId?: string;
  /** 最大ステップ */
  maxSteps?: number;
  /** 初期コンテキスト */
  context?: Record<string, unknown>;
}

/**
 * アクション追加オプション
 */
export type AddActionInput = Omit<AgentAction, 'step' | 'timestamp'>;

/**
 * シリアライズされた状態
 */
export interface SerializedAgentState {
  version: string;
  data: AgentState;
}

/**
 * エージェント状態マネージャー設定
 */
export interface AgentStateManagerConfig {
  /** デフォルト最大ステップ */
  defaultMaxSteps?: number;
  /** ID生成関数 */
  idGenerator?: () => string;
}
