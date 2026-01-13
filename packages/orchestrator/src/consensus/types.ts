/**
 * KATASHIRO v1.3.0 - 反復合議型リサーチワークフロー 型定義
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.3.0
 */

// =============================================================================
// 設定型
// =============================================================================

/**
 * 後処理オプション（v1.3.0）
 */
export interface PostProcessorOptions {
  /** 後処理有効化（デフォルト: true） */
  enabled: boolean;
  /** Mermaid優先フラグ（デフォルト: true） */
  preferMermaid: boolean;
  /** 元のASCII図も保持（デフォルト: false） */
  preserveOriginal: boolean;
  /** 変換失敗時にエラーを投げる（デフォルト: false） */
  strictMode: boolean;
}

/**
 * デフォルト後処理オプション
 */
export const DEFAULT_POST_PROCESSOR_OPTIONS: PostProcessorOptions = {
  enabled: true,
  preferMermaid: true,
  preserveOriginal: false,
  strictMode: false,
};

/**
 * 合議型リサーチ設定
 */
export interface ConsensusResearchConfig {
  /** リサーチトピック */
  topic: string;
  /** 並列エージェント数（デフォルト: 3） */
  agentCount: number;
  /** イテレーション数（デフォルト: 3） */
  iterationCount: number;
  /** エージェントタイムアウト（ミリ秒、デフォルト: 300000） */
  agentTimeoutMs: number;
  /** 矛盾許容閾値（0-1、デフォルト: 0.1） */
  conflictThreshold: number;
  /** 検索プロバイダー設定 */
  searchConfig: SearchConfig;
  /** 早期終了閾値（デフォルト: 0.05） */
  earlyTerminationThreshold: number;
  /** 後処理オプション（v1.3.0） */
  postProcess: PostProcessorOptions;
}

/**
 * 検索設定
 */
export interface SearchConfig {
  /** 検索プロバイダー */
  provider: 'duckduckgo' | 'searxng';
  /** 1エージェントあたりの最大結果数 */
  maxResultsPerAgent: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_CONSENSUS_CONFIG: ConsensusResearchConfig = {
  topic: '',
  agentCount: 3,
  iterationCount: 3,
  agentTimeoutMs: 300000, // 5分
  conflictThreshold: 0.1,
  searchConfig: {
    provider: 'duckduckgo',
    maxResultsPerAgent: 10,
  },
  earlyTerminationThreshold: 0.05,
  postProcess: DEFAULT_POST_PROCESSOR_OPTIONS,
};

// =============================================================================
// エージェント戦略型
// =============================================================================

/**
 * ソースタイプ
 */
export type SourceType = 'official' | 'news' | 'academic' | 'community';

/**
 * エージェント戦略
 */
export interface AgentStrategy {
  /** エージェントID */
  agentId: number;
  /** 検索クエリ修飾子 */
  queryModifiers: string[];
  /** 優先ソースタイプ */
  preferredSources: SourceType[];
  /** 時間範囲フィルタ */
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all';
  /** 1エージェントあたりの最大結果数 */
  maxResultsPerAgent: number;
}

/**
 * デフォルトエージェント戦略
 */
export const DEFAULT_AGENT_STRATEGIES: AgentStrategy[] = [
  {
    agentId: 1,
    queryModifiers: ['公式', '発表', 'オフィシャル'],
    preferredSources: ['official'],
    timeRange: 'all',
    maxResultsPerAgent: 10,
  },
  {
    agentId: 2,
    queryModifiers: ['最新', 'ニュース', '速報'],
    preferredSources: ['news'],
    timeRange: 'week',
    maxResultsPerAgent: 10,
  },
  {
    agentId: 3,
    queryModifiers: ['分析', '考察', '懸念', '課題'],
    preferredSources: ['academic', 'community'],
    timeRange: 'month',
    maxResultsPerAgent: 10,
  },
];

// =============================================================================
// コンテキスト型
// =============================================================================

/**
 * イテレーションコンテキスト
 */
export interface IterationContext {
  /** イテレーション番号（1-based） */
  iteration: number;
  /** リサーチトピック */
  topic: string;
  /** 前回のコンセンサスレポート */
  previousConsensus: string | null;
  /** 前回のスコア */
  previousScore: ReportScore | null;
  /** 未解決の疑問点 */
  unresolvedQuestions: string[];
  /** カバー済みソース（URL） */
  coveredSources: string[];
  /** 深掘りが必要なエリア */
  areasToDeepen: string[];
  /** 初回イテレーションフラグ */
  isInitial: boolean;
}

// =============================================================================
// スコアリング型
// =============================================================================

/**
 * レポートスコア
 */
export interface ReportScore {
  /** レポートID */
  reportId: string;
  /** 一貫性スコア（0-1） */
  consistencyScore: number;
  /** 信頼性スコア（0-1） */
  reliabilityScore: number;
  /** カバレッジスコア（0-1） */
  coverageScore: number;
  /** 総合スコア（0-1） */
  totalScore: number;
  /** 検出された矛盾 */
  conflicts: ConflictDetail[];
  /** 未検証ステートメント数 */
  unverifiedCount: number;
  /** ソースURL一覧 */
  sourceUrls?: string[];
}

/**
 * 矛盾詳細
 */
export interface ConflictDetail {
  /** 矛盾ID */
  conflictId: string;
  /** 矛盾タイプ */
  type: 'contradiction' | 'inconsistency' | 'outdated';
  /** ステートメント1 */
  statement1: ConflictStatement;
  /** ステートメント2 */
  statement2: ConflictStatement;
  /** 深刻度（1-5） */
  severity: number;
  /** 信頼度（0-1） */
  confidence: number;
  /** 解決策 */
  resolution?: string;
}

/**
 * 矛盾ステートメント
 */
export interface ConflictStatement {
  /** テキスト */
  text: string;
  /** ソース */
  source: string;
  /** レポートID */
  reportId: string;
}

/**
 * コンセンサス選択結果
 */
export interface ConsensusSelection {
  /** 選択されたレポートID */
  selectedReportId: string;
  /** 選択理由 */
  reason: string;
}

// =============================================================================
// レポート型
// =============================================================================

/**
 * ソース参照
 */
export interface SourceReference {
  /** URL */
  url: string;
  /** タイトル */
  title: string;
  /** 取得日時 */
  fetchedAt: string;
  /** 信頼性スコア */
  reliabilityScore?: number;
}

/**
 * エージェントレポート
 */
export interface AgentReport {
  /** エージェントID */
  agentId: number;
  /** レポートID */
  reportId: string;
  /** レポート内容 */
  content: string;
  /** ソース参照 */
  sources: SourceReference[];
  /** 使用した戦略 */
  strategy: AgentStrategy;
  /** 生成日時 */
  generatedAt: string;
  /** 実行時間（ミリ秒） */
  durationMs: number;
}

/**
 * イテレーション結果
 */
export interface IterationResult {
  /** イテレーション番号 */
  iteration: number;
  /** エージェントレポート */
  agentReports: AgentReport[];
  /** スコア */
  scores: ReportScore[];
  /** コンセンサスレポート */
  consensusReport: string;
  /** 選択理由 */
  selectionReason: string;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** 選択されたレポートID */
  selectedReportId: string;
}

/**
 * 最終結果
 */
export interface ConsensusResearchResult {
  /** 最終レポート */
  finalReport: string;
  /** イテレーション結果 */
  iterations: IterationResult[];
  /** 総実行時間（ミリ秒） */
  totalDurationMs: number;
  /** 総エージェント実行数 */
  totalAgentRuns: number;
  /** 最終スコア */
  finalScore: ReportScore;
  /** メタデータ */
  metadata: ConsensusResearchMetadata;
}

/**
 * リサーチメタデータ
 */
export interface ConsensusResearchMetadata {
  /** トピック */
  topic: string;
  /** 開始日時 */
  startedAt: string;
  /** 完了日時 */
  completedAt: string;
  /** 設定 */
  config: ConsensusResearchConfig;
}

// =============================================================================
// イベント型
// =============================================================================

/**
 * 合議型リサーチイベント
 */
export type ConsensusResearchEvent =
  | ResearchStartedEvent
  | IterationStartedEvent
  | AgentStartedEvent
  | AgentCompletedEvent
  | ScoringCompletedEvent
  | ConsensusSelectedEvent
  | IterationCompletedEvent
  | ResearchCompletedEvent
  | ResearchFailedEvent;

/**
 * リサーチ開始イベント
 */
export interface ResearchStartedEvent {
  type: 'researchStarted';
  topic: string;
  config: ConsensusResearchConfig;
}

/**
 * イテレーション開始イベント
 */
export interface IterationStartedEvent {
  type: 'iterationStarted';
  iteration: number;
  context: IterationContext;
}

/**
 * エージェント開始イベント
 */
export interface AgentStartedEvent {
  type: 'agentStarted';
  iteration: number;
  agentId: number;
  strategy: AgentStrategy;
}

/**
 * エージェント完了イベント
 */
export interface AgentCompletedEvent {
  type: 'agentCompleted';
  iteration: number;
  agentId: number;
  durationMs: number;
  success: boolean;
}

/**
 * スコアリング完了イベント
 */
export interface ScoringCompletedEvent {
  type: 'scoringCompleted';
  iteration: number;
  scores: ReportScore[];
}

/**
 * コンセンサス選択イベント
 */
export interface ConsensusSelectedEvent {
  type: 'consensusSelected';
  iteration: number;
  selectedAgentId: number;
  reason: string;
}

/**
 * イテレーション完了イベント
 */
export interface IterationCompletedEvent {
  type: 'iterationCompleted';
  iteration: number;
  durationMs: number;
}

/**
 * リサーチ完了イベント
 */
export interface ResearchCompletedEvent {
  type: 'researchCompleted';
  result: ConsensusResearchResult;
}

/**
 * リサーチ失敗イベント
 */
export interface ResearchFailedEvent {
  type: 'researchFailed';
  error: Error;
}

/**
 * イベントリスナー型
 */
export type ConsensusResearchEventListener = (event: ConsensusResearchEvent) => void;

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * スコアリング重み設定
 */
export interface ScoringWeights {
  /** 一貫性の重み（デフォルト: 0.5） */
  consistency: number;
  /** 信頼性の重み（デフォルト: 0.3） */
  reliability: number;
  /** カバレッジの重み（デフォルト: 0.2） */
  coverage: number;
}

/**
 * デフォルトスコアリング重み
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  consistency: 0.5,
  reliability: 0.3,
  coverage: 0.2,
};

/**
 * エラーコード
 */
export enum ConsensusResearchErrorCode {
  /** エージェントタイムアウト */
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  /** 過半数失敗 */
  MAJORITY_FAILURE = 'MAJORITY_FAILURE',
  /** 無効な設定 */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** スコアリングエラー */
  SCORING_ERROR = 'SCORING_ERROR',
  /** 選択エラー */
  SELECTION_ERROR = 'SELECTION_ERROR',
}

/**
 * 合議型リサーチエラー
 */
export class ConsensusResearchError extends Error {
  constructor(
    public readonly code: ConsensusResearchErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ConsensusResearchError';
  }
}

// =============================================================================
// 後処理型（v1.3.0）
// =============================================================================

/**
 * ASCII図タイプ
 */
export type AsciiDiagramType = 'flowchart' | 'table' | 'tree' | 'box';

/**
 * 検出されたASCII図
 */
export interface AsciiDiagram {
  /** 図のタイプ */
  type: AsciiDiagramType;
  /** 元のASCII図テキスト */
  original: string;
  /** 図の開始位置 */
  startIndex: number;
  /** 図の終了位置 */
  endIndex: number;
  /** 行番号（1-based） */
  lineNumber: number;
}

/**
 * 変換記録
 */
export interface ConversionRecord {
  /** 元のASCII図 */
  original: string;
  /** 変換後の図 */
  converted: string;
  /** 図のタイプ */
  type: AsciiDiagramType;
  /** 変換成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
}

/**
 * 後処理結果
 */
export interface PostProcessResult {
  /** 変換後レポート */
  processedReport: string;
  /** 変換記録 */
  conversions: ConversionRecord[];
  /** 警告メッセージ */
  warnings: string[];
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
}
