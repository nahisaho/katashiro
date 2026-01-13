/**
 * Real-Time Data Fetcher Module
 * 
 * @requirement REQ-EXT-RTD-001 コモディティ価格データ取得
 * @requirement REQ-EXT-RTD-002 統計データ取得
 * @since 0.5.0
 */

export { RealTimeDataFetcher } from './realtime-data-fetcher.js';

export type {
  RealTimeDataSource,
  RealTimeDataType,
  RealTimeDataQuery,
  RealTimeDataResult,
  CommodityPrice,
  StatisticsData,
  DataPoint,
  TimeSeriesData,
  RealTimeDataFetcherOptions,
} from './types.js';
