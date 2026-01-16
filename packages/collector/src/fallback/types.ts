/**
 * フォールバック機構 型定義
 *
 * @requirement REQ-DR-U-003 - フォールバック機構
 * @design DES-KATASHIRO-005-DR-FALLBACK
 * @task TASK-016
 */

import { z } from 'zod';

/**
 * フォールバックソースタイプ
 */
export const FallbackSourceTypeSchema = z.enum([
  'original',     // 元のソース
  'cache',        // ローカルキャッシュ
  'wayback',      // Wayback Machine
  'google_cache', // Googleキャッシュ
  'alternative',  // 代替ソース
]);

export type FallbackSourceType = z.infer<typeof FallbackSourceTypeSchema>;

/**
 * フォールバック結果
 */
export interface FallbackResult<T> {
  /** 取得成功したデータ */
  data: T;
  /** 使用したソースタイプ */
  sourceType: FallbackSourceType;
  /** ソースURL（該当する場合） */
  sourceUrl?: string;
  /** キャッシュ日時（該当する場合） */
  cachedAt?: Date;
  /** 試行したソース */
  attemptedSources: FallbackSourceType[];
  /** 取得に要した時間（ミリ秒） */
  durationMs: number;
}

/**
 * フォールバック設定
 */
export interface FallbackConfig {
  /** ローカルキャッシュを使用 */
  useCache: boolean;
  /** Wayback Machineを使用 */
  useWayback: boolean;
  /** Googleキャッシュを使用 */
  useGoogleCache: boolean;
  /** 代替ソースのリスト */
  alternativeSources: AlternativeSource[];
  /** フォールバックの優先順位 */
  priority: FallbackSourceType[];
  /** タイムアウト（ミリ秒） */
  timeoutMs: number;
  /** Wayback Machineの最大アーカイブ年齢（日） */
  maxArchiveAgeDays: number;
}

/**
 * 代替ソース定義
 */
export interface AlternativeSource {
  /** ソース名 */
  name: string;
  /** URLパターン（正規表現） */
  urlPattern: RegExp;
  /** 代替URLを生成する関数 */
  generateUrl: (originalUrl: string) => string;
}

/**
 * デフォルトフォールバック設定
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  useCache: true,
  useWayback: true,
  useGoogleCache: false, // Googleキャッシュは廃止されているため無効
  alternativeSources: [],
  priority: ['original', 'cache', 'wayback', 'alternative'],
  timeoutMs: 30000,
  maxArchiveAgeDays: 365,
};

/**
 * Wayback Machineスナップショット情報
 */
export interface WaybackSnapshot {
  /** アーカイブURL */
  url: string;
  /** スナップショット日時 */
  timestamp: Date;
  /** ステータスコード */
  statusCode: number;
  /** MIMEタイプ */
  mimeType?: string;
  /** オリジナルURL */
  originalUrl: string;
}

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;
  /** キャッシュ日時 */
  cachedAt: Date;
  /** 有効期限 */
  expiresAt?: Date;
  /** 元のURL */
  url: string;
  /** ETag（該当する場合） */
  etag?: string;
  /** Last-Modified（該当する場合） */
  lastModified?: string;
}

/**
 * フォールバックイベント
 */
export interface FallbackEvent {
  type: 'attempt' | 'success' | 'failure' | 'skip';
  sourceType: FallbackSourceType;
  url: string;
  error?: Error;
  timestamp: Date;
}

/**
 * フォールバックイベントリスナー
 */
export type FallbackEventListener = (event: FallbackEvent) => void;
