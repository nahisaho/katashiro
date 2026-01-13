/**
 * KATASHIRO v1.4.0 - Cascading Research Types
 *
 * カスケード型リサーチワークフローの型定義
 */

// ============================================================================
// 基本型
// ============================================================================

/**
 * エージェントの役割
 */
export type AgentRole = 'official' | 'news' | 'analysis' | 'academic' | 'community';

/**
 * ステップのフォーカス
 */
export type StepFocus = 'overview' | 'detail' | 'gap' | 'verify' | 'integrate';

/**
 * 発見事項のカテゴリ
 */
export type FindingCategory = 'fact' | 'opinion' | 'analysis' | 'question' | 'contradiction';

// ============================================================================
// 情報ソース
// ============================================================================

/**
 * 情報ソース
 */
export interface CascadingSource {
  /** ソースURL */
  url: string;
  /** ページタイトル */
  title: string;
  /** 取得日時 */
  fetchedAt: string;
  /** 信頼度スコア (0-1) */
  credibility: number;
  /** ドメイン */
  domain: string;
}

// ============================================================================
// 発見事項
// ============================================================================

/**
 * 発見事項
 */
export interface Finding {
  /** 一意識別子 */
  id: string;
  /** 発見内容 */
  content: string;
  /** 情報ソース */
  source: CascadingSource;
  /** 信頼度 (0-1) */
  confidence: number;
  /** 発見されたステップ */
  stepNumber: number;
  /** 発見したエージェント */
  agentId: string;
  /** カテゴリ */
  category: FindingCategory;
  /** 発見日時 */
  timestamp: string;
}

// ============================================================================
// 矛盾情報
// ============================================================================

/**
 * 矛盾情報
 */
export interface Contradiction {
  /** 一意識別子 */
  id: string;
  /** 発見事項1 */
  finding1: Finding;
  /** 発見事項2 */
  finding2: Finding;
  /** 矛盾の説明 */
  description: string;
  /** 重大度 */
  severity: 'high' | 'medium' | 'low';
  /** 解決済みフラグ */
  resolved: boolean;
  /** 解決方法 */
  resolution?: string;
}

// ============================================================================
// エージェントレポート
// ============================================================================

/**
 * カスケードエージェントレポート
 */
export interface CascadingAgentReport {
  /** エージェントID */
  agentId: string;
  /** エージェントの役割 */
  role: AgentRole;
  /** ステップ番号 */
  stepNumber: number;
  /** レポート本文 */
  content: string;
  /** 発見事項 */
  findings: Finding[];
  /** 使用ソース */
  sources: CascadingSource[];
  /** 発見したギャップ */
  gaps: string[];
  /** 実行時間 (ms) */
  durationMs: number;
  /** 完了日時 */
  timestamp: string;
  /** エラー（失敗時） */
  error?: string;
}

// ============================================================================
// ステップコンテキスト
// ============================================================================

/**
 * ステップコンテキスト
 * 各ステップ実行時に渡されるコンテキスト情報
 */
export interface StepContext {
  /** 現在のステップ番号 (1-5) */
  stepNumber: number;
  /** 調査トピック */
  topic: string;
  /** このステップのフォーカス */
  stepFocus: StepFocus;
  /** 直前ステップの結果 */
  previousStepResult?: StepResult;
  /** 全ステップの結果（累積） */
  allPreviousResults: StepResult[];
  /** 累積発見事項（オプション） */
  accumulatedFindings?: Finding[];
  /** 特定されたギャップ */
  identifiedGaps: string[];
  /** 重要エンティティ */
  keyEntities: string[];
  /** 未解決の疑問 */
  unresolvedQuestions: string[];
  /** このステップの検索修飾子 */
  queryModifiers: string[];
}

// ============================================================================
// ステップ結果
// ============================================================================

/**
 * ステップ結果
 */
export interface StepResult {
  /** ステップ番号 */
  stepNumber: number;
  /** ステップフォーカス */
  focus: StepFocus;
  /** 5エージェントのレポート */
  agentReports: CascadingAgentReport[];
  /** 統合要約 */
  integratedSummary: string;
  /** 発見事項 */
  findings: Finding[];
  /** 使用ソース */
  sources: CascadingSource[];
  /** 特定されたギャップ */
  gaps: string[];
  /** 解決されたギャップ */
  resolvedGaps: string[];
  /** 信頼度スコア (0-1) */
  confidence: number;
  /** 検出された矛盾 */
  contradictions: Contradiction[];
  /** 実行時間 (ms) */
  durationMs: number;
  /** 完了日時 */
  timestamp: string;
  /** エラー（オプション） */
  error?: string;
}

// ============================================================================
// 最終結果
// ============================================================================

/**
 * カスケードリサーチ結果
 */
export interface CascadingResearchResult {
  /** 調査トピック */
  topic: string;
  /** 5ステップの結果 */
  stepResults: StepResult[];
  /** 最終レポート */
  finalReport: string;
  /** 全発見事項 */
  findings: Finding[];
  /** 全ソース */
  sources: CascadingSource[];
  /** 矛盾 */
  contradictions: Contradiction[];
  /** 総合信頼度 (0-1) */
  overallConfidence: number;
  /** 総実行時間 (ms) */
  totalDurationMs: number;
  /** 総エージェント実行回数 */
  totalAgentRuns: number;
  /** メタデータ */
  metadata: {
    /** 設定サマリー */
    config: {
      agentCount: number;
      stepCount: number;
    };
    /** 開始日時 */
    startedAt: string;
    /** 完了日時 */
    completedAt: string;
    /** エラー（オプション） */
    error?: string;
  };
}

// ============================================================================
// 設定
// ============================================================================

/**
 * エージェント戦略
 */
export interface CascadingAgentStrategy {
  /** エージェントの役割 */
  role: AgentRole;
  /** 検索クエリ修飾子 */
  queryModifiers: string[];
  /** 説明 */
  description: string;
}

/**
 * ステップ戦略設定
 */
export interface StepStrategyConfig {
  /** フォーカス */
  focus: StepFocus;
  /** 検索クエリ修飾子 */
  queryModifiers: string[];
  /** エージェントあたりの最大検索結果数 */
  maxResultsPerAgent: number;
  /** 優先エージェント（オプション） */
  priorityAgents?: AgentRole[];
  /** 説明 */
  description?: string;
}

/**
 * 早期終了設定
 */
export interface EarlyTerminationConfig {
  /** 有効フラグ */
  enabled: boolean;
  /** この信頼度に達したら終了 (0-1) */
  confidenceThreshold: number;
  /** 最低実行ステップ数 */
  minSteps: number;
}

/**
 * 後処理設定
 */
export interface PostProcessOptions {
  /** 有効フラグ */
  enabled: boolean;
  /** Mermaid優先 */
  preferMermaid: boolean;
  /** 元テキスト保持 */
  preserveOriginal: boolean;
  /** 厳格モード */
  strictMode: boolean;
}

/**
 * カスケードリサーチ設定
 */
export interface CascadingResearchConfig {
  /** ステップ数（デフォルト: 5） */
  stepCount: number;
  /** エージェント数（デフォルト: 5） */
  agentCount: number;
  /** ステップタイムアウト (ms)（デフォルト: 300000 = 5分） */
  stepTimeoutMs: number;
  /** エージェントタイムアウト (ms)（デフォルト: 60000 = 1分） */
  agentTimeoutMs: number;
  /** 検索設定 */
  searchConfig: {
    /** 検索プロバイダー */
    provider: 'duckduckgo' | 'searxng';
    /** エージェントあたりの最大検索結果数 */
    maxResultsPerAgent: number;
  };
  /** 後処理設定（v1.3.0互換） */
  postProcess?: PostProcessOptions;
  /** エージェント戦略（ロール別） */
  agentStrategies: CascadingAgentStrategy[];
  /** ステップ別戦略 */
  stepStrategies: StepStrategyConfig[];
  /** 早期終了設定（オプション） */
  earlyTermination?: EarlyTerminationConfig;
  /** 矛盾検出閾値 (0-1) */
  contradictionThreshold?: number;
  /** 早期終了閾値 (0-1) */
  earlyTerminationThreshold?: number;
  /** エージェントあたりの最大結果数 */
  maxResultsPerAgent?: number;
}

// ============================================================================
// イベント
// ============================================================================

/**
 * カスケードリサーチイベント
 */
export type CascadingResearchEvent =
  | { type: 'researchStarted'; topic: string; timestamp: string }
  | { type: 'stepStarted'; stepNumber: number; timestamp: string }
  | { type: 'agentStarted'; stepNumber: number; agentId: string; role: AgentRole; timestamp: string }
  | { type: 'agentCompleted'; stepNumber: number; agentId: string; role: AgentRole; durationMs: number; timestamp: string }
  | { type: 'agentFailed'; stepNumber: number; agentId: string; role: AgentRole; error: string; timestamp: string }
  | { type: 'stepIntegrating'; stepNumber: number; timestamp: string }
  | { type: 'stepCompleted'; stepNumber: number; result: StepResult; timestamp: string }
  | { type: 'earlyTermination'; stepNumber: number; reason: string; timestamp: string }
  | { type: 'finalReportGenerating'; timestamp: string }
  | { type: 'researchCompleted'; result: CascadingResearchResult; timestamp: string }
  | { type: 'researchFailed'; error: string; timestamp: string };

/**
 * イベントリスナー
 */
export type CascadingResearchEventListener = (event: CascadingResearchEvent) => void;

// ============================================================================
// デフォルト値
// ============================================================================

/**
 * デフォルトエージェント戦略
 */
export const DEFAULT_AGENT_STRATEGIES: CascadingAgentStrategy[] = [
  {
    role: 'official',
    queryModifiers: ['公式', '発表', 'オフィシャル', 'プレスリリース'],
    description: '公式情報収集 - 一次情報の正確性を重視',
  },
  {
    role: 'news',
    queryModifiers: ['最新', 'ニュース', '速報', '報道'],
    description: 'ニュース収集 - 最新性を重視',
  },
  {
    role: 'analysis',
    queryModifiers: ['分析', '考察', '解説', '専門家'],
    description: '分析・考察収集 - 深い洞察を重視',
  },
  {
    role: 'academic',
    queryModifiers: ['研究', '論文', '学術', '調査報告'],
    description: '学術情報収集 - 学術的裏付けを重視',
  },
  {
    role: 'community',
    queryModifiers: ['口コミ', 'レビュー', '評判', 'フォーラム'],
    description: 'コミュニティ情報 - 実態・評判を重視',
  },
];

/**
 * デフォルトステップ戦略
 */
export const DEFAULT_STEP_STRATEGIES: StepStrategyConfig[] = [
  {
    focus: 'overview',
    queryModifiers: ['概要', '入門', 'とは', '基本'],
    maxResultsPerAgent: 10,
    description: '概要把握 - 全体像の理解',
  },
  {
    focus: 'detail',
    queryModifiers: ['詳細', '仕組み', '技術', '方法'],
    maxResultsPerAgent: 10,
    description: '詳細調査 - 深い理解',
  },
  {
    focus: 'gap',
    queryModifiers: ['課題', '問題', '懸念', 'リスク'],
    maxResultsPerAgent: 8,
    description: 'ギャップ分析 - 問題点の特定',
  },
  {
    focus: 'verify',
    queryModifiers: ['検証', '比較', '評価', '実績'],
    maxResultsPerAgent: 8,
    description: '検証 - 情報の確認',
  },
  {
    focus: 'integrate',
    queryModifiers: ['まとめ', '結論', '展望', '将来'],
    maxResultsPerAgent: 5,
    description: '統合 - 結論の導出',
  },
];

/**
 * デフォルトカスケードリサーチ設定
 */
export const DEFAULT_CASCADING_CONFIG: CascadingResearchConfig = {
  stepCount: 5,
  agentCount: 5,
  stepTimeoutMs: 300000, // 5分
  agentTimeoutMs: 60000, // 1分
  searchConfig: {
    provider: 'duckduckgo',
    maxResultsPerAgent: 10,
  },
  postProcess: {
    enabled: true,
    preferMermaid: true,
    preserveOriginal: false,
    strictMode: false,
  },
  agentStrategies: DEFAULT_AGENT_STRATEGIES,
  stepStrategies: DEFAULT_STEP_STRATEGIES,
  earlyTermination: {
    enabled: false,
    confidenceThreshold: 0.9,
    minSteps: 3,
  },
  contradictionThreshold: 0.7,
  earlyTerminationThreshold: 0.1,
  maxResultsPerAgent: 10,
};

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * Finding IDを生成
 */
export function generateFindingId(stepNumber: number, agentId: string): string {
  return `finding-${stepNumber}-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Contradiction IDを生成
 */
export function generateContradictionId(): string {
  return `contradiction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ステップフォーカスの日本語名を取得
 */
export function getStepFocusLabel(focus: StepFocus): string {
  const labels: Record<StepFocus, string> = {
    overview: '概要把握',
    detail: '詳細調査',
    gap: 'ギャップ補完',
    verify: '検証・確認',
    integrate: '統合・結論',
  };
  return labels[focus];
}

/**
 * エージェントロールの日本語名を取得
 */
export function getAgentRoleLabel(role: AgentRole): string {
  const labels: Record<AgentRole, string> = {
    official: '公式情報',
    news: 'ニュース',
    analysis: '分析・考察',
    academic: '学術情報',
    community: 'コミュニティ',
  };
  return labels[role];
}

/**
 * 信頼度スコアを計算
 */
export function calculateStepConfidence(
  successfulAgents: number,
  totalAgents: number,
  findingConfidences: number[],
  sourceCredibilities: number[]
): number {
  // エージェント成功率
  const agentSuccessRate = totalAgents > 0 ? successfulAgents / totalAgents : 0;

  // 発見事項の平均信頼度
  const avgFindingConfidence = findingConfidences.length > 0
    ? findingConfidences.reduce((sum, c) => sum + c, 0) / findingConfidences.length
    : 0.5;

  // ソースの平均信頼度
  const avgSourceCredibility = sourceCredibilities.length > 0
    ? sourceCredibilities.reduce((sum, c) => sum + c, 0) / sourceCredibilities.length
    : 0.5;

  // 重み付け平均
  const confidence =
    agentSuccessRate * 0.3 +
    avgFindingConfidence * 0.4 +
    avgSourceCredibility * 0.3;

  return Math.max(0, Math.min(1, confidence));
}
