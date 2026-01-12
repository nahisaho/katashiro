/**
 * Trend Analyzer - 型定義
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

/**
 * トレンド分析クエリ
 */
export interface TrendAnalysisQuery {
  /** 分析対象のキーワードまたはトピック */
  topic: string;

  /** 分析期間 */
  dateRange: {
    start: Date;
    end: Date;
  };

  /** オプション設定 */
  options?: {
    /** 時間粒度 */
    granularity?: TimeGranularity;
    /** データソース */
    sources?: TrendSource[];
    /** 予測を含めるか */
    includeForecast?: boolean;
    /** 予測期間（期間数） */
    forecastPeriods?: number;
    /** 地域フィルター */
    regions?: string[];
    /** 言語フィルター */
    languages?: string[];
  };

  /** 比較対象キーワード（オプション） */
  compareTopics?: string[];
}

export type TimeGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type TrendSource =
  | 'news' // ニュースサイト
  | 'rss' // RSSフィード
  | 'academic' // 学術論文
  | 'social' // SNS
  | 'web'; // 一般Web

/**
 * トレンド分析結果
 */
export interface TrendAnalysisResult {
  /** 分析対象トピック */
  topic: string;

  /** 分析期間 */
  dateRange: {
    start: Date;
    end: Date;
  };

  /** 時系列データ */
  timeSeries: TimeSeriesData[];

  /** 検出されたトレンド */
  trends: DetectedTrend[];

  /** トレンドサマリー */
  summary: TrendSummary;

  /** 比較分析（複数トピックの場合） */
  comparison?: TopicComparison;

  /** 予測データ（オプション） */
  forecast?: ForecastData;

  /** 可視化用データ */
  visualization: VisualizationData;

  /** メタ情報 */
  metadata: TrendMetadata;
}

/**
 * 時系列データポイント
 */
export interface TimeSeriesData {
  /** タイムスタンプ */
  timestamp: Date;

  /** 出現頻度/ボリューム */
  volume: number;

  /** 正規化スコア (0-100) */
  normalizedScore: number;

  /** センチメント (-1 to 1) */
  sentiment?: number;

  /** ソース別内訳 */
  sourceBreakdown: Partial<Record<TrendSource, number>>;

  /** サンプルドキュメント */
  sampleDocs: SampleDocument[];
}

/**
 * サンプルドキュメント
 */
export interface SampleDocument {
  /** タイトル */
  title: string;

  /** URL */
  url: string;

  /** 公開日時 */
  publishedAt: Date;

  /** ソース */
  source: TrendSource;

  /** 関連度スコア */
  relevanceScore: number;
}

/**
 * 検出されたトレンド
 */
export interface DetectedTrend {
  /** トレンドタイプ */
  type: TrendType;

  /** 開始時点 */
  startDate: Date;

  /** 終了時点 */
  endDate: Date;

  /** 信頼度 (0-1) */
  confidence: number;

  /** 変化の大きさ（%） */
  magnitude: number;

  /** 説明 */
  description: string;
}

export type TrendType =
  | 'rising' // 上昇トレンド
  | 'falling' // 下降トレンド
  | 'spike' // 急上昇
  | 'plateau' // 横ばい
  | 'seasonal' // 季節変動
  | 'cyclical' // 周期的変動
  | 'emerging'; // 新興トレンド

/**
 * トレンドサマリー
 */
export interface TrendSummary {
  /** 支配的なトレンドタイプ */
  dominantTrend: TrendType;

  /** 信頼度 (0-1) */
  confidence: number;

  /** 成長率（期間全体、%） */
  growthRate: number;

  /** ピーク時期 */
  peakPeriod: Date;

  /** ピーク時の値 */
  peakVolume: number;

  /** トレンドの説明文 */
  narrative: string;

  /** キーインサイト */
  keyInsights: string[];
}

/**
 * トピック比較
 */
export interface TopicComparison {
  /** 比較対象トピックとデータ */
  topics: Array<{
    topic: string;
    data: TimeSeriesData[];
  }>;

  /** トピック間の相関 */
  correlations: Array<{
    topic1: string;
    topic2: string;
    correlation: number;
  }>;

  /** 比較サマリー */
  comparisonSummary: string;
}

/**
 * 予測データ
 */
export interface ForecastData {
  /** 予測手法 */
  method: ForecastMethod;

  /** 予測ポイント */
  predictions: Array<{
    date: Date;
    value: number;
  }>;

  /** 上限境界 */
  upperBound: number[];

  /** 下限境界 */
  lowerBound: number[];

  /** 信頼水準 */
  confidenceLevel: number;

  /** モデル精度 (R²) */
  accuracy: number;
}

export type ForecastMethod = 'linear' | 'exponential' | 'movingAverage';

export interface ForecastConfig {
  /** 予測期間数 */
  periods: number;
  /** 予測手法 */
  method: ForecastMethod;
  /** 信頼水準 */
  confidenceLevel: number;
}

/**
 * 可視化データ
 */
export interface VisualizationData {
  /** 折れ線グラフデータ */
  lineChart: LineChartData;

  /** ヒートマップデータ（時間×ソース） */
  heatmap: HeatmapData;

  /** 円グラフ（ソース別シェア） */
  pieChart: PieChartData;

  /** アノテーション */
  annotations: Array<{
    type: 'spike' | 'trend' | 'event';
    position: Date;
    label: string;
    color: string;
  }>;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: (number | null)[];
    color: string;
    type: 'line' | 'area';
  }>;
}

export interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  values: number[][];
  maxValue: number;
}

export interface PieChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

/**
 * メタデータ
 */
export interface TrendMetadata {
  /** 使用されたソース */
  sources: TrendSource[];

  /** 時間粒度 */
  granularity: TimeGranularity;

  /** 総データポイント数 */
  dataPoints: number;

  /** 分析実行日時 */
  analysisTimestamp: Date;

  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
}

/**
 * トレンド分析エラー
 */
export interface TrendAnalysisError {
  code: TrendAnalysisErrorCode;
  message: string;
  details?: unknown;
}

export type TrendAnalysisErrorCode =
  | 'INVALID_INPUT'
  | 'COLLECTION_FAILED'
  | 'INSUFFICIENT_DATA'
  | 'ANALYSIS_FAILED'
  | 'COMPARISON_FAILED'
  | 'FORECAST_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * 内部用: 収集クエリ
 */
export interface CollectionQuery {
  topic: string;
  startDate: Date;
  endDate: Date;
  granularity: TimeGranularity;
  sources: TrendSource[];
}

/**
 * TrendDetector設定
 */
export interface TrendDetectorConfig {
  sensitivityThreshold: number;
  minDataPoints: number;
  detectSeasonality: boolean;
}

/**
 * TrendAnalyzer設定
 */
export interface TrendAnalyzerConfig {
  maxSources: number;
  defaultGranularity: TimeGranularity;
  forecastPeriods: number;
  enableCaching: boolean;
}

/**
 * デフォルト設定
 */
export const DEFAULT_TREND_CONFIG = {
  granularity: 'daily' as TimeGranularity,
  sources: ['news', 'web'] as TrendSource[],
  forecastPeriods: 7,
  lookbackDays: 30,
} as const;
