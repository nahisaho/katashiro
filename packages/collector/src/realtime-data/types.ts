/**
 * Real-Time Data Fetcher Types
 * 
 * @requirement REQ-EXT-RTD-001 コモディティ価格データ取得
 * @requirement REQ-EXT-RTD-002 統計データ取得
 * @since 0.5.0
 */

/**
 * データソース種別
 */
export type RealTimeDataSource =
  // コモディティ価格ソース
  | 'lme'          // London Metal Exchange
  | 'usgs'         // US Geological Survey
  | 'comex'        // COMEX (金、銀など)
  | 'wti'          // WTI原油
  | 'brent'        // ブレント原油
  // 統計データソース
  | 'jogmec'       // JOGMEC
  | 'iea'          // International Energy Agency
  | 'jetro'        // JETRO
  | 'worldbank'    // World Bank Open Data
  | 'imf'          // IMF
  | 'oecd'         // OECD
  // 汎用
  | 'custom';

/**
 * データタイプ
 */
export type RealTimeDataType =
  | 'commodity_price'    // コモディティ価格
  | 'energy_price'       // エネルギー価格
  | 'mineral_production' // 鉱物生産量
  | 'trade_statistics'   // 貿易統計
  | 'economic_indicator' // 経済指標
  | 'market_data';       // 市場データ

/**
 * データクエリ
 */
export interface RealTimeDataQuery {
  /** データタイプ */
  readonly type: RealTimeDataType;
  /** データソース（指定しない場合は自動選択） */
  readonly source?: RealTimeDataSource;
  /** 検索キーワード（例: "copper", "gold", "oil"） */
  readonly keyword: string;
  /** 開始日（ISO 8601形式） */
  readonly startDate?: string;
  /** 終了日（ISO 8601形式） */
  readonly endDate?: string;
  /** 通貨（例: "USD", "JPY"） */
  readonly currency?: string;
  /** 単位（例: "ton", "barrel", "oz"） */
  readonly unit?: string;
}

/**
 * データポイント
 */
export interface DataPoint {
  /** 日付（ISO 8601形式） */
  readonly date: string;
  /** 値 */
  readonly value: number;
  /** 単位 */
  readonly unit?: string;
  /** 通貨 */
  readonly currency?: string;
  /** 追加メタデータ */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 時系列データ
 */
export interface TimeSeriesData {
  /** データポイント配列 */
  readonly points: DataPoint[];
  /** 開始日 */
  readonly startDate: string;
  /** 終了日 */
  readonly endDate: string;
  /** 頻度（daily, weekly, monthly, yearly） */
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/**
 * コモディティ価格
 */
export interface CommodityPrice {
  /** コモディティ名 */
  readonly name: string;
  /** シンボル（例: "CU", "AU", "AG"） */
  readonly symbol?: string;
  /** 現在価格 */
  readonly price: number;
  /** 通貨 */
  readonly currency: string;
  /** 単位 */
  readonly unit: string;
  /** 前日比変動 */
  readonly change?: number;
  /** 前日比変動率（%） */
  readonly changePercent?: number;
  /** 取得日時 */
  readonly timestamp: string;
  /** 時系列データ（オプション） */
  readonly timeSeries?: TimeSeriesData;
  /** データソース */
  readonly source: RealTimeDataSource;
  /** ソースURL */
  readonly sourceUrl?: string;
}

/**
 * 統計データ
 */
export interface StatisticsData {
  /** データ名 */
  readonly name: string;
  /** カテゴリ */
  readonly category: string;
  /** 現在値 */
  readonly value: number;
  /** 単位 */
  readonly unit: string;
  /** 参照年度/期間 */
  readonly period: string;
  /** 時系列データ（オプション） */
  readonly timeSeries?: TimeSeriesData;
  /** データソース */
  readonly source: RealTimeDataSource;
  /** ソースURL */
  readonly sourceUrl?: string;
  /** 追加メタデータ */
  readonly metadata?: Record<string, unknown>;
}

/**
 * データ取得結果
 */
export interface RealTimeDataResult {
  /** 成功フラグ */
  readonly success: boolean;
  /** クエリ */
  readonly query: RealTimeDataQuery;
  /** コモディティ価格データ */
  readonly commodityPrices?: CommodityPrice[];
  /** 統計データ */
  readonly statistics?: StatisticsData[];
  /** エラーメッセージ */
  readonly error?: string;
  /** 取得日時 */
  readonly fetchedAt: string;
  /** データソース */
  readonly sources: RealTimeDataSource[];
}

/**
 * RealTimeDataFetcherオプション
 */
export interface RealTimeDataFetcherOptions {
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
  /** デフォルト通貨 */
  readonly defaultCurrency?: string;
  /** キャッシュTTL（秒） */
  readonly cacheTtl?: number;
  /** APIキー（必要なソース用） */
  readonly apiKeys?: Partial<Record<RealTimeDataSource, string>>;
  /** ユーザーエージェント */
  readonly userAgent?: string;
  /** レート制限設定（REQ-EXT-RTD-005） @since 1.0.0 */
  readonly rateLimit?: RateLimitConfig;
}

/**
 * レート制限設定
 * @requirement REQ-EXT-RTD-005
 * @since 1.0.0
 */
export interface RateLimitConfig {
  /** 最大リクエスト数/分 */
  readonly maxRequestsPerMinute: number;
  /** 最大リクエスト数/時 */
  readonly maxRequestsPerHour?: number;
  /** リトライ回数 */
  readonly maxRetries: number;
  /** リトライ間隔（ミリ秒） */
  readonly retryDelayMs: number;
  /** 指数バックオフを使用するか */
  readonly useExponentialBackoff: boolean;
}

/**
 * デフォルトレート制限設定
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 500,
  maxRetries: 3,
  retryDelayMs: 1000,
  useExponentialBackoff: true,
};

/**
 * データ鮮度情報
 * @requirement REQ-EXT-RTD-003
 * @since 1.0.0
 */
export interface DataFreshnessInfo {
  /** データ取得タイムスタンプ */
  readonly fetchedAt: Date;
  /** データの公開日時（ソースからの情報） */
  readonly publishedAt?: Date;
  /** データの更新日時（最終更新） */
  readonly updatedAt?: Date;
  /** データの鮮度ステータス */
  readonly freshnessStatus: FreshnessStatus;
  /** データの経過時間（秒） */
  readonly ageInSeconds: number;
  /** 次回更新予定 */
  readonly nextUpdateExpected?: Date;
  /** 人間可読な経過時間 */
  readonly ageDisplay: string;
}

/**
 * 鮮度ステータス
 */
export type FreshnessStatus =
  | 'realtime'     // リアルタイム（5分以内）
  | 'recent'       // 最新（1時間以内）
  | 'today'        // 本日（24時間以内）
  | 'stale'        // やや古い（1週間以内）
  | 'outdated';    // 古い（1週間以上）

/**
 * データ取得失敗結果
 * @requirement REQ-EXT-RTD-004
 * @since 1.0.0
 */
export interface DataFetchFailureResult {
  /** 失敗したクエリ */
  readonly query: RealTimeDataQuery;
  /** エラータイプ */
  readonly errorType: DataFetchErrorType;
  /** エラーメッセージ */
  readonly errorMessage: string;
  /** 使用されたキャッシュデータ */
  readonly cachedData?: CachedDataInfo;
  /** 失敗した日時 */
  readonly failedAt: Date;
  /** リトライ回数 */
  readonly retryCount: number;
  /** 次回リトライ予定 */
  readonly nextRetryAt?: Date;
  /** 表示メッセージ */
  readonly displayMessage: string;
}

/**
 * キャッシュデータ情報
 */
export interface CachedDataInfo {
  /** キャッシュされたデータ */
  readonly data: RealTimeDataResult;
  /** キャッシュ日時 */
  readonly cachedAt: Date;
  /** キャッシュの経過時間（秒） */
  readonly ageInSeconds: number;
  /** キャッシュの鮮度ステータス */
  readonly freshnessStatus: FreshnessStatus;
  /** 経過時間インジケータ（例: "5分前", "1時間前"） */
  readonly ageIndicator: string;
}

/**
 * データ取得エラータイプ
 */
export type DataFetchErrorType =
  | 'network_error'     // ネットワークエラー
  | 'timeout'           // タイムアウト
  | 'rate_limited'      // レート制限
  | 'auth_error'        // 認証エラー
  | 'source_unavailable' // ソース利用不可
  | 'parse_error'       // パースエラー
  | 'unknown';          // 不明なエラー

/**
 * レート制限状態
 * @requirement REQ-EXT-RTD-005
 * @since 1.0.0
 */
export interface RateLimitState {
  /** 現在のリクエスト数/分 */
  readonly requestsThisMinute: number;
  /** 現在のリクエスト数/時 */
  readonly requestsThisHour: number;
  /** レート制限中か */
  readonly isLimited: boolean;
  /** 制限がリセットされる時刻 */
  readonly resetAt?: Date;
  /** キュー内の待機リクエスト数 */
  readonly queuedRequests: number;
}

