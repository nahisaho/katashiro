/**
 * TTLManager - TTL管理
 *
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 * @task TASK-038
 */

import type { LRUCacheConfig } from './types.js';

/**
 * TTLパターン
 */
export interface TtlPattern {
  /** URLパターン（正規表現文字列 or ワイルドカード） */
  pattern: string;
  /** TTL（ミリ秒） */
  ttlMs: number;
  /** パターンタイプ */
  type?: 'regex' | 'wildcard' | 'exact';
}

/**
 * コンパイル済みパターン
 */
interface CompiledPattern {
  regex: RegExp;
  ttlMs: number;
  priority: number;
}

/**
 * TTL計算結果
 */
export interface TtlResult {
  /** TTL（ミリ秒） */
  ttlMs: number;
  /** 有効期限（Unix timestamp） */
  expiresAt: number;
  /** マッチしたパターン（該当する場合） */
  matchedPattern?: string;
}

/**
 * 一般的なTTLプリセット
 */
export const TTL_PRESETS = {
  /** 30秒（リアルタイムデータ） */
  REALTIME: 30 * 1000,
  /** 5分（頻繁に更新されるデータ） */
  SHORT: 5 * 60 * 1000,
  /** 1時間（一般的なWebページ） */
  MEDIUM: 60 * 60 * 1000,
  /** 24時間（静的コンテンツ） */
  LONG: 24 * 60 * 60 * 1000,
  /** 7日（アーカイブコンテンツ） */
  VERY_LONG: 7 * 24 * 60 * 60 * 1000,
  /** 30日（ほぼ不変のコンテンツ） */
  PERMANENT: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * 推奨パターン（ドメインタイプ別）
 */
export const RECOMMENDED_PATTERNS: TtlPattern[] = [
  // ニュースサイト（短めのTTL）
  { pattern: '*://news.*.com/*', ttlMs: TTL_PRESETS.SHORT, type: 'wildcard' },
  { pattern: '*://www.bbc.com/*', ttlMs: TTL_PRESETS.SHORT, type: 'wildcard' },
  { pattern: '*://edition.cnn.com/*', ttlMs: TTL_PRESETS.SHORT, type: 'wildcard' },

  // Wikipedia（中程度のTTL）
  { pattern: '*://en.wikipedia.org/*', ttlMs: TTL_PRESETS.MEDIUM, type: 'wildcard' },
  { pattern: '*://ja.wikipedia.org/*', ttlMs: TTL_PRESETS.MEDIUM, type: 'wildcard' },

  // ドキュメントサイト（長めのTTL）
  { pattern: '*://docs.*.com/*', ttlMs: TTL_PRESETS.LONG, type: 'wildcard' },
  { pattern: '*://developer.mozilla.org/*', ttlMs: TTL_PRESETS.LONG, type: 'wildcard' },

  // アーカイブサイト（非常に長いTTL）
  { pattern: '*://web.archive.org/*', ttlMs: TTL_PRESETS.VERY_LONG, type: 'wildcard' },
];

/**
 * TTL管理クラス
 *
 * URLパターンに基づいてTTLを計算します。
 */
export class TTLManager {
  private readonly defaultTtlMs: number;
  private readonly compiledPatterns: CompiledPattern[] = [];

  constructor(config: Pick<LRUCacheConfig, 'defaultTtlMs' | 'ttlPatterns'>) {
    this.defaultTtlMs = config.defaultTtlMs ?? 24 * 60 * 60 * 1000;

    // パターンをコンパイル
    if (config.ttlPatterns) {
      for (let i = 0; i < config.ttlPatterns.length; i++) {
        const p = config.ttlPatterns[i];
        if (p) {
          const compiled = this.compilePattern(p.pattern, p.ttlMs, i);
          if (compiled) {
            this.compiledPatterns.push(compiled);
          }
        }
      }
    }
  }

  /**
   * URLに対するTTLを計算
   *
   * @param url URL文字列
   * @returns TTL計算結果
   */
  getTtl(url: string): TtlResult {
    const now = Date.now();

    // パターンマッチング（優先度順）
    for (const compiled of this.compiledPatterns) {
      if (compiled.regex.test(url)) {
        return {
          ttlMs: compiled.ttlMs,
          expiresAt: now + compiled.ttlMs,
          matchedPattern: compiled.regex.source,
        };
      }
    }

    // デフォルトTTL
    return {
      ttlMs: this.defaultTtlMs,
      expiresAt: now + this.defaultTtlMs,
    };
  }

  /**
   * Content-Typeに基づくTTL推奨値を取得
   *
   * @param contentType Content-Type
   * @returns 推奨TTL（ミリ秒）
   */
  getRecommendedTtlByContentType(contentType: string): number {
    const normalized = contentType.toLowerCase();

    // HTMLページ
    if (normalized.includes('text/html')) {
      return TTL_PRESETS.MEDIUM;
    }

    // JSON API
    if (normalized.includes('application/json')) {
      return TTL_PRESETS.SHORT;
    }

    // XML
    if (normalized.includes('xml')) {
      return TTL_PRESETS.MEDIUM;
    }

    // 静的リソース
    if (
      normalized.includes('image/') ||
      normalized.includes('font/') ||
      normalized.includes('application/javascript') ||
      normalized.includes('text/css')
    ) {
      return TTL_PRESETS.LONG;
    }

    // PDF、ドキュメント
    if (
      normalized.includes('application/pdf') ||
      normalized.includes('application/msword') ||
      normalized.includes('application/vnd.openxmlformats')
    ) {
      return TTL_PRESETS.VERY_LONG;
    }

    return this.defaultTtlMs;
  }

  /**
   * Cache-Controlヘッダーを解析してTTLを取得
   *
   * @param cacheControl Cache-Controlヘッダー値
   * @returns TTL（ミリ秒）または undefined
   */
  parseCacheControl(cacheControl: string): number | undefined {
    if (!cacheControl) {
      return undefined;
    }

    const directives = cacheControl
      .toLowerCase()
      .split(',')
      .map((d) => d.trim());

    // no-store, no-cache チェック
    if (directives.includes('no-store') || directives.includes('no-cache')) {
      return 0;
    }

    // max-age 取得
    for (const directive of directives) {
      const match = directive.match(/^max-age=(\d+)$/);
      if (match && match[1]) {
        const seconds = parseInt(match[1], 10);
        return seconds * 1000;
      }

      // s-maxage（共有キャッシュ用）
      const sMatch = directive.match(/^s-maxage=(\d+)$/);
      if (sMatch && sMatch[1]) {
        const seconds = parseInt(sMatch[1], 10);
        return seconds * 1000;
      }
    }

    return undefined;
  }

  /**
   * Expiresヘッダーを解析してTTLを取得
   *
   * @param expires Expiresヘッダー値
   * @returns TTL（ミリ秒）または undefined
   */
  parseExpires(expires: string): number | undefined {
    if (!expires) {
      return undefined;
    }

    const expiresDate = new Date(expires);
    if (isNaN(expiresDate.getTime())) {
      return undefined;
    }

    const ttl = expiresDate.getTime() - Date.now();
    return ttl > 0 ? ttl : 0;
  }

  /**
   * HTTPレスポンスヘッダーからTTLを決定
   *
   * @param headers ヘッダーオブジェクト
   * @returns TTL（ミリ秒）
   */
  getTtlFromHeaders(headers: Record<string, string | undefined>): number {
    // Cache-Controlが最優先
    const cacheControl = headers['cache-control'];
    if (cacheControl) {
      const ttl = this.parseCacheControl(cacheControl);
      if (ttl !== undefined) {
        return ttl;
      }
    }

    // Expiresヘッダー
    const expires = headers['expires'];
    if (expires) {
      const ttl = this.parseExpires(expires);
      if (ttl !== undefined) {
        return ttl;
      }
    }

    // Content-Typeベースの推奨値
    const contentType = headers['content-type'];
    if (contentType) {
      return this.getRecommendedTtlByContentType(contentType);
    }

    return this.defaultTtlMs;
  }

  /**
   * パターン数を取得
   */
  get patternCount(): number {
    return this.compiledPatterns.length;
  }

  // ========== Private Methods ==========

  private compilePattern(
    pattern: string,
    ttlMs: number,
    priority: number
  ): CompiledPattern | null {
    try {
      // ワイルドカードを正規表現に変換
      const regexPattern = this.wildcardToRegex(pattern);
      return {
        regex: new RegExp(regexPattern, 'i'),
        ttlMs,
        priority,
      };
    } catch {
      // 無効なパターンはスキップ
      return null;
    }
  }

  private wildcardToRegex(pattern: string): string {
    // エスケープ
    let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // ワイルドカード変換
    escaped = escaped.replace(/\*/g, '.*');
    escaped = escaped.replace(/\?/g, '.');
    return `^${escaped}$`;
  }
}
