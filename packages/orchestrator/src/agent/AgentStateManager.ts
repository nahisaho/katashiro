/**
 * AgentStateManager - エージェント状態管理
 *
 * @requirement REQ-AGENT-002
 * @description エージェントの状態を管理するクラス
 */

import type {
  AgentState,
  AgentAction,
  AddActionInput,
  CreateAgentStateOptions,
  SerializedAgentState,
  AgentStateManagerConfig,
  AgentStateStatus,
} from './types.js';

/** シリアライズバージョン */
const SERIALIZATION_VERSION = '1.0.0';

/** デフォルト設定 */
const DEFAULT_CONFIG: Required<AgentStateManagerConfig> = {
  defaultMaxSteps: 10,
  idGenerator: () => `agent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
};

/**
 * エージェント状態マネージャー
 *
 * エージェントの状態（会話履歴、コンテキスト、中間結果）を管理します。
 *
 * @example
 * ```typescript
 * const manager = new AgentStateManager();
 *
 * // 状態を作成
 * const state = manager.create({ maxSteps: 10 });
 *
 * // アクションを追加
 * const updatedState = manager.addAction(state, {
 *   type: 'thought',
 *   content: { thought: 'ユーザーの質問を分析中...' }
 * });
 *
 * // ツール呼び出しを追加
 * const withToolCall = manager.addAction(updatedState, {
 *   type: 'tool_call',
 *   content: { tool: 'web_search', params: { query: 'AI news' } }
 * });
 *
 * // シリアライズ
 * const json = manager.serialize(withToolCall);
 *
 * // デシリアライズ
 * const restored = manager.deserialize(json);
 * ```
 */
export class AgentStateManager {
  private config: Required<AgentStateManagerConfig>;

  constructor(config: AgentStateManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 新しいエージェント状態を作成
   */
  create(options: CreateAgentStateOptions = {}): AgentState {
    const now = new Date().toISOString();

    return {
      conversationId: options.conversationId ?? this.config.idGenerator(),
      currentStep: 0,
      maxSteps: options.maxSteps ?? this.config.defaultMaxSteps,
      history: [],
      context: options.context ?? {},
      intermediateResults: [],
      createdAt: now,
      updatedAt: now,
      status: 'idle',
    };
  }

  /**
   * アクションを追加
   * 
   * @returns 新しい状態（イミュータブル）
   */
  addAction(state: AgentState, action: AddActionInput): AgentState {
    const now = new Date().toISOString();
    const newStep = state.currentStep + 1;

    const newAction: AgentAction = {
      ...action,
      step: newStep,
      timestamp: now,
    };

    return {
      ...state,
      currentStep: newStep,
      history: [...state.history, newAction],
      updatedAt: now,
      status: this.determineStatus(state, newAction),
    };
  }

  /**
   * 中間結果を追加
   */
  addIntermediateResult(state: AgentState, result: unknown): AgentState {
    return {
      ...state,
      intermediateResults: [...state.intermediateResults, result],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * コンテキストを更新
   */
  updateContext(
    state: AgentState,
    updates: Record<string, unknown>,
  ): AgentState {
    return {
      ...state,
      context: { ...state.context, ...updates },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * ステータスを更新
   */
  updateStatus(state: AgentState, status: AgentStateStatus): AgentState {
    return {
      ...state,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 状態をリセット（履歴をクリア）
   */
  reset(state: AgentState): AgentState {
    const now = new Date().toISOString();

    return {
      ...state,
      currentStep: 0,
      history: [],
      intermediateResults: [],
      updatedAt: now,
      status: 'idle',
    };
  }

  /**
   * 状態をシリアライズ（JSON文字列に変換）
   */
  serialize(state: AgentState): string {
    const serialized: SerializedAgentState = {
      version: SERIALIZATION_VERSION,
      data: state,
    };
    return JSON.stringify(serialized, null, 2);
  }

  /**
   * JSON文字列から状態をデシリアライズ
   */
  deserialize(json: string): AgentState {
    const parsed = JSON.parse(json) as SerializedAgentState;

    if (!parsed.version || !parsed.data) {
      throw new Error('Invalid serialized agent state format');
    }

    // バージョンチェック（将来的なマイグレーション用）
    if (parsed.version !== SERIALIZATION_VERSION) {
      console.warn(
        `Agent state version mismatch: expected ${SERIALIZATION_VERSION}, got ${parsed.version}`,
      );
    }

    return parsed.data;
  }

  /**
   * 最大ステップに達したかどうか
   */
  isMaxStepsReached(state: AgentState): boolean {
    return state.currentStep >= state.maxSteps;
  }

  /**
   * 完了したかどうか
   */
  isCompleted(state: AgentState): boolean {
    return state.status === 'completed';
  }

  /**
   * 実行中かどうか
   */
  isRunning(state: AgentState): boolean {
    return state.status === 'running';
  }

  /**
   * 最後のアクションを取得
   */
  getLastAction(state: AgentState): AgentAction | undefined {
    return state.history.at(-1);
  }

  /**
   * 特定タイプのアクションを取得
   */
  getActionsByType(
    state: AgentState,
    type: AgentAction['type'],
  ): AgentAction[] {
    return state.history.filter((action) => action.type === type);
  }

  /**
   * ツール呼び出し履歴を取得
   */
  getToolCalls(state: AgentState): AgentAction[] {
    return this.getActionsByType(state, 'tool_call');
  }

  /**
   * 思考履歴を取得
   */
  getThoughts(state: AgentState): AgentAction[] {
    return this.getActionsByType(state, 'thought');
  }

  /**
   * 状態のサマリーを取得
   */
  getSummary(state: AgentState): AgentStateSummary {
    const toolCalls = this.getToolCalls(state);
    const observations = this.getActionsByType(state, 'observation');
    const thoughts = this.getThoughts(state);

    return {
      conversationId: state.conversationId,
      status: state.status,
      currentStep: state.currentStep,
      maxSteps: state.maxSteps,
      totalActions: state.history.length,
      toolCallCount: toolCalls.length,
      thoughtCount: thoughts.length,
      observationCount: observations.length,
      hasIntermediateResults: state.intermediateResults.length > 0,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    };
  }

  /**
   * 状態からステータスを判定
   */
  private determineStatus(
    state: AgentState,
    newAction: AgentAction,
  ): AgentStateStatus {
    // 最終回答があれば完了
    if (newAction.type === 'final_answer') {
      return 'completed';
    }

    // 最大ステップに達したら失敗
    if (state.currentStep + 1 >= state.maxSteps) {
      return 'failed';
    }

    // それ以外は実行中
    return 'running';
  }
}

/**
 * 状態サマリー
 */
export interface AgentStateSummary {
  conversationId: string;
  status: AgentStateStatus;
  currentStep: number;
  maxSteps: number;
  totalActions: number;
  toolCallCount: number;
  thoughtCount: number;
  observationCount: number;
  hasIntermediateResults: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * デフォルトのAgentStateManagerインスタンス
 */
export const defaultAgentStateManager = new AgentStateManager();
