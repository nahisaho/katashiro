/**
 * Collector型定義
 *
 * @requirement REQ-COLLECT-001 ~ REQ-COLLECT-009
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-010 ~ TSK-015
 */

import type { Timestamp, URL } from '@nahisaho/katashiro-core';

/**
 * Web検索オプション
 */
export interface WebSearchOptions {
  readonly provider?: 'google' | 'bing' | 'duckduckgo' | 'searxng';
  readonly maxResults?: number;
  readonly language?: string;
  readonly region?: string;
  readonly safeSearch?: boolean;
  readonly timeout?: number;
}

/**
 * スクレイピングオプション
 */
export interface ScrapingOptions {
  readonly waitForSelector?: string;
  readonly timeout?: number;
  readonly userAgent?: string;
  readonly javascript?: boolean;
  readonly extractImages?: boolean;
  readonly extractLinks?: boolean;
}

/**
 * スクレイピング結果
 */
export interface ScrapingResult {
  readonly url: URL;
  readonly title: string;
  readonly content: string;
  readonly html?: string;
  readonly images?: string[];
  readonly links?: string[];
  readonly fetchedAt: Timestamp;
}

/**
 * フィード情報
 * AGENTS.md互換API
 */
export interface Feed {
  readonly title: string;
  readonly description?: string;
  readonly link?: string;
  readonly language?: string;
  readonly lastBuildDate?: string;
  readonly items: FeedItem[];
}

/**
 * フィードアイテム
 */
export interface FeedItem {
  readonly id: string;
  readonly title: string;
  readonly link: URL;
  readonly description?: string;
  readonly content?: string;
  readonly author?: string;
  readonly publishedAt?: Timestamp;
  readonly categories?: string[];
}

/**
 * 文字起こしセグメント
 */
export interface TranscriptSegment {
  readonly text: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration?: number;
}

/**
 * メディアメタデータ
 */
export interface MediaMetadata {
  readonly url?: URL;
  readonly sourceUrl?: URL;
  readonly type: 'image' | 'video' | 'audio';
  readonly title?: string;
  readonly description?: string;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly format?: string;
  readonly size?: number;
  readonly thumbnailUrl?: string;
  readonly fetchedAt?: Timestamp;
}
