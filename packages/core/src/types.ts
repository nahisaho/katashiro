/**
 * 共通型定義
 *
 * @requirement REQ-NFR-006
 * @design DES-KATASHIRO-001 §2.2
 * @task TSK-001
 */

/**
 * 識別子型
 */
export type ID = string;

/**
 * タイムスタンプ型 (ISO 8601形式)
 */
export type Timestamp = string;

/**
 * URL型
 */
export type URL = string;

/**
 * 検索クエリ
 */
export interface SearchQuery {
  readonly query: string;
  readonly language?: string;
  readonly region?: string;
  readonly maxResults?: number;
}

/**
 * 検索オプション
 */
export interface SearchOptions {
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly proxy?: string;
}

/**
 * 検索結果
 */
export interface SearchResult {
  readonly id: ID;
  readonly title: string;
  readonly url: URL;
  readonly snippet: string;
  readonly source: string;
  readonly timestamp: Timestamp;
  readonly relevanceScore?: number;
}

/**
 * ソースメタデータ
 */
export interface SourceMetadata {
  readonly title: string;
  readonly author?: string;
  readonly publishedAt?: Timestamp;
  readonly lastModified?: Timestamp;
  readonly language?: string;
  readonly credibilityScore?: number;
}

/**
 * ソース情報
 */
export interface Source {
  readonly id: ID;
  readonly url: URL;
  readonly metadata: SourceMetadata;
  readonly fetchedAt: Timestamp;
}

/**
 * コンテンツタイプ
 */
export type ContentType =
  | 'article'
  | 'report'
  | 'summary'
  | 'outline'
  | 'translation'
  | 'chart'
  | 'podcast';

/**
 * コンテンツ
 */
export interface Content {
  readonly id: ID;
  readonly type: ContentType;
  readonly title: string;
  readonly body: string;
  readonly sources: Source[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * エラーコード
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'AUTH_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'INTERNAL_ERROR';

/**
 * KATASHIROエラー基底型
 */
export interface KatashiroError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly timestamp: Timestamp;
}
