/**
 * Deep Research Orchestrator - 型定義
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import type { GraphNode, GraphEdge } from '@nahisaho/katashiro-knowledge';

// Findingは collector パッケージから再エクスポートせず、互換型として定義
// @nahisaho/katashiro-collector の Finding と互換

/**
 * Deep Research クエリ
 */
export interface DeepResearchQuery {
  /** 調査トピック */
  topic: string;

  /** 初期コンテキスト（背景情報など） */
  context?: string;

  /** 最大イテレーション数 */
  maxIterations?: number;

  /** 収束閾値 (0-1) - 新規情報率がこれ以下で収束と判定 */
  convergenceThreshold?: number;

  /** ユーザーガイダンスを有効にするか */
  userGuidance?: boolean;

  /** 各イテレーションのタイムアウト（ミリ秒） */
  iterationTimeout?: number;

  /** 全体のタイムアウト（ミリ秒） */
  totalTimeout?: number;

  /** 重点的に調査する観点 */
  focusAreas?: string[];

  /** 除外する観点 */
  excludeAreas?: string[];

  /** 深さの優先度設定 */
  depthPriority?: DepthPriority;
}

export type DepthPriority = 'breadth-first' | 'depth-first' | 'balanced';

/**
 * Deep Research 最終結果
 */
export interface DeepResearchResult {
  /** 調査トピック */
  topic: string;

  /** 構築された知識グラフ（シリアライズ形式） */
  knowledgeGraph: SimpleKnowledgeGraph;

  /** エグゼクティブサマリー */
  summary: string;

  /** 主要な発見事項 */
  keyFindings: KeyFinding[];

  /** 全ての参照ソース */
  sources: SourceReference[];

  /** イテレーション履歴 */
  iterations: IterationRecord[];

  /** 残存する知識ギャップ */
  remainingGaps: KnowledgeGap[];

  /** 統計情報 */
  statistics: DeepResearchStatistics;

  /** 完了理由 */
  completionReason: CompletionReason;

  /** 推論チェーン（結論に至った論理的説明） */
  reasoningChain: ReasoningStep[];
}

/**
 * 推論ステップ（論理的説明の一単位）
 */
export interface ReasoningStep {
  /** ステップ番号 */
  step: number;

  /** ステップの種類 */
  type: 'observation' | 'inference' | 'synthesis' | 'conclusion';

  /** 説明 */
  description: string;

  /** 根拠となるソースID */
  sourceIds: string[];

  /** 関連する発見事項ID */
  findingIds: string[];

  /** 信頼度 (0-1) */
  confidence: number;
}

/**
 * シンプルな知識グラフ構造（AsyncGenerator用）
 */
export interface SimpleKnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type CompletionReason =
  | 'converged' // 収束した
  | 'max_iterations' // 最大イテレーション到達
  | 'timeout' // タイムアウト
  | 'user_stopped' // ユーザーが停止
  | 'no_new_queries'; // 新規クエリがない

/**
 * 進捗情報（AsyncGenerator の yield 値）
 */
export interface ResearchProgress {
  /** 現在のイテレーション番号 */
  iteration: number;

  /** 現在のフェーズ */
  phase: ResearchPhase;

  /** 現在実行中のクエリ */
  currentQuery: string;

  /** 累計発見数 */
  totalFindingsCount: number;

  /** 新規情報率 (0-1) */
  noveltyRate: number;

  /** 収束スコア (0-1) */
  convergenceScore: number;

  /** 識別された知識ギャップ */
  gaps: KnowledgeGap[];

  /** 経過時間（ミリ秒） */
  elapsedTime: number;
}

export type ResearchPhase =
  | 'searching'
  | 'integrating'
  | 'analyzing'
  | 'waiting_guidance'
  | 'completed';

/**
 * 主要な発見事項
 */
export interface KeyFinding {
  /** 発見事項ID */
  id: string;

  /** タイトル */
  title: string;

  /** 要約 */
  summary: string;

  /** 重要度 */
  importance: ImportanceLevel;

  /** 発見元ソースURL */
  sources: string[];

  /** 関連コンセプト */
  relatedConcepts: string[];
}

export type ImportanceLevel = 'high' | 'medium' | 'low';

/**
 * 知識ギャップ
 */
export interface KnowledgeGap {
  /** ギャップID */
  id: string;

  /** ギャップの説明 */
  description: string;

  /** ギャップのタイプ */
  type: GapType;

  /** 関連するトピック/ノード */
  relatedTopics: string[];

  /** 推奨される調査方向 */
  suggestedQueries: string[];

  /** 優先度 */
  priority: 'high' | 'medium' | 'low';
}

export type GapType =
  | 'missing_evidence' // 証拠不足
  | 'contradictory_info' // 矛盾する情報
  | 'unexplored_aspect' // 未探索の側面
  | 'outdated_info' // 古い情報
  | 'depth_needed'; // 深掘りが必要

export type GapPriority = 'high' | 'medium' | 'low';

/**
 * イテレーション記録
 */
export interface IterationRecord {
  /** イテレーション番号 */
  iterationNumber: number;

  /** 使用したクエリ */
  queries: string[];

  /** 取得した発見数 */
  findingsCount: number;

  /** 追加したノード数 */
  newNodesCount: number;

  /** 追加したエッジ数 */
  newEdgesCount: number;

  /** 新規情報率 (0-1) */
  noveltyRate: number;

  /** 処理時間（ミリ秒） */
  duration: number;
}

/**
 * 参照ソース
 */
export interface SourceReference {
  /** URL */
  url: string;

  /** タイトル */
  title: string;

  /** ソースタイプ */
  type: string;

  /** アクセス日時 */
  accessedAt: Date;
}

/**
 * 統計情報
 */
export interface DeepResearchStatistics {
  /** 総イテレーション数 */
  totalIterations: number;

  /** 総処理発見数 */
  totalFindingsProcessed: number;

  /** 作成したノード数 */
  totalNodesCreated: number;

  /** 作成したエッジ数 */
  totalEdgesCreated: number;

  /** 平均新規情報率 */
  averageNoveltyRate: number;

  /** 総処理時間（ミリ秒） */
  totalDuration: number;
}

/**
 * ユーザーガイダンス入力
 */
export interface UserGuidance {
  /** アクション */
  action: 'continue' | 'stop' | 'focus' | 'exclude';

  /** フォーカスする方向（オプション） */
  focusDirection?: string;

  /** 除外する方向（オプション） */
  excludeDirection?: string;

  /** 追加クエリ（オプション） */
  additionalQueries?: string[];
}

/**
 * エラー型
 */
export interface DeepResearchError {
  code: DeepResearchErrorCode;
  message: string;
  iteration?: number;
  details?: unknown;
}

export type DeepResearchErrorCode =
  | 'INVALID_QUERY'
  | 'INITIALIZATION_FAILED'
  | 'ITERATION_FAILED'
  | 'TIMEOUT'
  | 'USER_CANCELLED'
  | 'UNKNOWN_ERROR';

/**
 * Finding統合結果
 */
export interface IntegrationResult {
  newNodesCount: number;
  newEdgesCount: number;
  updatedNodesCount: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_DEEP_RESEARCH_CONFIG = {
  maxIterations: 10,
  convergenceThreshold: 0.15, // 新規情報率15%以下で収束
  iterationTimeout: 60000, // 1分
  totalTimeout: 600000, // 10分
  depthPriority: 'balanced' as DepthPriority,
} as const;
