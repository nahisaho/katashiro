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
}
