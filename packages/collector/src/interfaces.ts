/**
 * Collectorインターフェース定義
 *
 * @requirement REQ-COLLECT-001 ~ REQ-COLLECT-009
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-010 ~ TSK-015
 */

import type { Result, SearchResult, SearchQuery } from '@nahisaho/katashiro-core';
import type {
  WebSearchOptions,
  ScrapingOptions,
  ScrapingResult,
  FeedItem,
  TranscriptSegment,
  MediaMetadata,
} from './types.js';

/**
 * Web検索クライアントインターフェース
 * @requirement REQ-COLLECT-001
 */
export interface IWebSearchClient {
  search(
    query: string | SearchQuery,
    options?: WebSearchOptions
  ): Promise<SearchResult[]>;
}

/**
 * Webスクレイパーインターフェース
 * @requirement REQ-COLLECT-002
 * @requirement REQ-IMP-002
 */
export interface IWebScraper {
  scrape(url: string, options?: ScrapingOptions): Promise<Result<ScrapingResult, Error>>;
  scrapeMultiple(urls: string[], options?: ScrapingOptions): Promise<Result<ScrapingResult, Error>[]>;
}

/**
 * フィードリーダーインターフェース
 * @requirement REQ-COLLECT-004
 */
export interface IFeedReader {
  fetch(feedUrl: string): Promise<Result<FeedItem[], Error>>;
}

/**
 * APIクライアントインターフェース
 * @requirement REQ-COLLECT-005
 */
export interface IAPIClient {
  get<T>(endpoint: string, params?: Record<string, string>): Promise<Result<T, Error>>;
  post<T>(endpoint: string, body: unknown): Promise<Result<T, Error>>;
}

/**
 * YouTube文字起こしインターフェース
 * @requirement REQ-COLLECT-003
 */
export interface IYouTubeTranscript {
  getTranscript(videoId: string): Promise<Result<TranscriptSegment[], Error>>;
}

/**
 * メディア抽出インターフェース
 * @requirement REQ-COLLECT-006
 */
export interface IMediaExtractor {
  extractMetadata(url: string): Promise<Result<MediaMetadata, Error>>;
}
