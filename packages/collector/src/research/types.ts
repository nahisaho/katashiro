/**
 * Wide Research Engine - 型定義
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

/**
 * Wide Research クエリ
 */
export interface WideResearchQuery {
  /** 検索トピック/クエリ */
  topic: string;

  /** 検索の深さ */
  depth: ResearchDepth;

  /** 使用するソースタイプ（指定しない場合は深さに応じて決定） */
  sources?: SourceType[];

  /** 最大並列エージェント数 */
  maxParallelAgents?: number;

  /** 各エージェントのタイムアウト（ミリ秒） */
  agentTimeout?: number;

  /** 全体のタイムアウト（ミリ秒） */
  totalTimeout?: number;

  /** 言語フィルター */
  languages?: string[];

  /** 日付範囲フィルター */
  dateRange?: DateRange;

  /** 除外キーワード */
  excludeKeywords?: string[];

  /** 各ソースからの最大結果数 */
  maxResultsPerSource?: number;
}

export type ResearchDepth = 'shallow' | 'medium' | 'deep';

export type SourceType =
  | 'web' // 一般Web検索
  | 'news' // ニュースソース
  | 'academic' // 学術論文
  | 'encyclopedia' // 百科事典（Wikipedia等）
  | 'social' // ソーシャルメディア（将来拡張）
  | 'government' // 政府・公的機関（将来拡張）
  | 'custom'; // カスタムソース

export interface DateRange {
  start?: Date;
  end?: Date;
}

/**
 * Wide Research 結果
 */
export interface WideResearchResult {
  /** 検索結果 */
  findings: Finding[];

  /** ソース情報 */
  sources: SourceInfo[];

  /** カバレッジレポート */
  coverage: CoverageReport;

  /** 完了ステータス */
  completionStatus: CompletionStatus;

  /** 統計情報 */
  statistics: ResearchStatistics;

  /** 処理時間（ミリ秒） */
  processingTime: number;
}

export type CompletionStatus = 'full' | 'partial' | 'failed';

/**
 * 検索結果
 */
export interface Finding {
  /** 一意識別子 */
  id: string;

  /** タイトル */
  title: string;

  /** 要約/スニペット */
  summary: string;

  /** 元コンテンツ（取得できた場合） */
  content?: string;

  /** ソースURL */
  url: string;

  /** ソースタイプ */
  sourceType: SourceType;

  /** ソース名 */
  sourceName: string;

  /** 関連性スコア (0-1) */
  relevanceScore: number;

  /** 信頼度スコア (0-1) */
  credibilityScore: number;

  /** 公開日時 */
  publishedAt?: Date;

  /** 著者 */
  author?: string;

  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * ソース情報
 */
export interface SourceInfo {
  /** ソースタイプ */
  type: SourceType;

  /** ソース名 */
  name: string;

  /** 検索に使用したクエリ */
  query: string;

  /** 取得結果数 */
  resultCount: number;

  /** 処理ステータス */
  status: SourceStatus;

  /** エラー詳細（失敗時） */
  error?: string;

  /** 処理時間（ミリ秒） */
  processingTime: number;
}

export type SourceStatus = 'success' | 'partial' | 'failed' | 'timeout';

/**
 * カバレッジレポート
 */
export interface CoverageReport {
  /** カバーしたソースタイプ */
  coveredSources: SourceType[];

  /** 失敗したソースタイプ */
  failedSources: SourceType[];

  /** カバレッジ率 (0-1) */
  coverageRate: number;

  /** 観点の多様性スコア (0-1) */
  perspectiveDiversity: number;

  /** 時間的カバレッジ */
  temporalCoverage?: TemporalCoverage;

  /** 推奨追加ソース */
  suggestedSources?: SourceType[];

  /** 識別されたギャップ */
  gaps?: CoverageGap[];
}

export interface TemporalCoverage {
  oldestResult?: Date;
  newestResult?: Date;
  distribution: TimeDistribution[];
}

export interface TimeDistribution {
  period: string;
  count: number;
}

export interface CoverageGap {
  type: 'source' | 'temporal' | 'perspective';
  description: string;
  suggestion: string;
}

/**
 * 統計情報
 */
export interface ResearchStatistics {
  /** 総検索結果数 */
  totalResults: number;

  /** 重複排除後の結果数 */
  uniqueResults: number;

  /** ソース別結果数 */
  resultsBySource: Partial<Record<SourceType, number>>;

  /** 平均関連性スコア */
  averageRelevance: number;

  /** 平均信頼度スコア */
  averageCredibility: number;
}

/**
 * エージェント設定
 */
export interface AgentConfig {
  /** エージェントタイプ */
  type: SourceType;

  /** 有効/無効 */
  enabled: boolean;

  /** 優先度 (数字が小さいほど優先) */
  priority: number;

  /** エージェント固有設定 */
  options?: Record<string, unknown>;
}

/**
 * エラー型
 */
export interface ResearchError {
  code: ResearchErrorCode;
  message: string;
  details?: unknown;
}

export type ResearchErrorCode =
  | 'INVALID_QUERY'
  | 'ALL_SOURCES_FAILED'
  | 'TIMEOUT'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * 深さ別設定
 */
export interface DepthConfig {
  sources: SourceType[];
  maxResults: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_RESEARCH_CONFIG = {
  maxParallelAgents: 5,
  agentTimeout: 30000, // 30秒
  totalTimeout: 120000, // 2分
  maxResultsPerSource: 20,
  depthConfig: {
    shallow: { sources: ['web'] as SourceType[], maxResults: 10 },
    medium: {
      sources: ['web', 'news', 'encyclopedia'] as SourceType[],
      maxResults: 20,
    },
    deep: {
      sources: [
        'web',
        'news',
        'academic',
        'encyclopedia',
      ] as SourceType[],
      maxResults: 50,
    },
  },
} as const;
