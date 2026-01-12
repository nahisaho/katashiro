/**
 * Search Agent - 型定義
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type { Finding, SourceType, SourceStatus } from '../types.js';

/**
 * 検索エージェントの抽象インターフェース
 */
export interface ISearchAgent {
  /** エージェントタイプ */
  readonly type: SourceType;

  /** エージェント名 */
  readonly name: string;

  /**
   * 検索を実行
   */
  search(query: AgentSearchQuery): Promise<AgentSearchResult>;

  /**
   * エージェントが利用可能か確認
   */
  isAvailable(): Promise<boolean>;
}

export interface AgentSearchQuery {
  /** 検索クエリ */
  query: string;

  /** 最大結果数 */
  maxResults: number;

  /** 言語フィルター */
  languages?: string[];

  /** 日付範囲 */
  dateRange?: { start?: Date; end?: Date };

  /** タイムアウト（ミリ秒） */
  timeout: number;
}

export interface AgentSearchResult {
  /** 検索結果 */
  findings: Finding[];

  /** ステータス */
  status: SourceStatus;

  /** エラーメッセージ */
  error?: string;

  /** 処理時間 */
  processingTime: number;

  /** 追加メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * エージェント実行結果（内部用）
 */
export interface AgentExecutionResult {
  agent: ISearchAgent;
  result: AgentSearchResult;
}
