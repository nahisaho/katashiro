/**
 * CacheKeyGenerator - キャッシュキー生成
 *
 * @requirement REQ-DR-E-005 キャッシュヒット時の高速応答
 * @task TASK-037
 */

import { createHash } from 'node:crypto';
import type { CacheKeyGeneratorConfig } from './types.js';
import { DEFAULT_CACHE_KEY_GENERATOR_CONFIG } from './types.js';

/**
 * キャッシュキー生成器
 *
 * URLを正規化してハッシュ値を生成し、一意なキャッシュキーを作成します。
 * - クエリパラメータのソート
 * - トラッキングパラメータの除外（utm_*, fbclid, gclid等）
 * - プロトコル正規化
 */
export class CacheKeyGenerator {
  private readonly config: CacheKeyGeneratorConfig;

  constructor(config: Partial<CacheKeyGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_KEY_GENERATOR_CONFIG, ...config };
  }

  /**
   * URLからキャッシュキーを生成
   *
   * @param url URL文字列
   * @returns キャッシュキー
   */
  generateFromUrl(url: string): string {
    const normalized = this.normalizeUrl(url);
    const hash = this.hash(normalized);
    return this.config.prefix ? `${this.config.prefix}:${hash}` : hash;
  }

  /**
   * 任意の文字列からキャッシュキーを生成
   *
   * @param input 入力文字列
   * @returns キャッシュキー
   */
  generateFromString(input: string): string {
    const hash = this.hash(input);
    return this.config.prefix ? `${this.config.prefix}:${hash}` : hash;
  }

  /**
   * 複数の値からキャッシュキーを生成
   *
   * @param parts キーの構成要素
   * @returns キャッシュキー
   */
  generateFromParts(...parts: (string | number | boolean)[]): string {
    const combined = parts.map(String).join(':');
    return this.generateFromString(combined);
  }

  /**
   * URLを正規化
   *
   * @param urlString URL文字列
   * @returns 正規化されたURL
   */
  normalizeUrl(urlString: string): string {
    try {
      const url = new URL(urlString);

      // スキームを小文字に正規化（http/https）
      const scheme = url.protocol.toLowerCase();

      // ホストを小文字に正規化
      const host = url.hostname.toLowerCase();

      // ポート（デフォルトポートは省略）
      let port = url.port;
      if (
        (scheme === 'http:' && port === '80') ||
        (scheme === 'https:' && port === '443')
      ) {
        port = '';
      }

      // パス正規化（末尾スラッシュ、複数スラッシュ）
      let path = url.pathname;
      path = path.replace(/\/+/g, '/'); // 複数スラッシュを単一に

      // クエリパラメータ処理
      let query = '';
      if (this.config.includeQuery && url.searchParams.toString()) {
        const params = new URLSearchParams();
        const entries = Array.from(url.searchParams.entries());

        // 無視するパラメータを除外
        const filtered = entries.filter(
          ([key]) =>
            !this.config.ignoreParams.some(
              (p) => key.toLowerCase() === p.toLowerCase()
            )
        );

        // ソート
        if (this.config.sortParams) {
          filtered.sort(([a], [b]) => a.localeCompare(b));
        }

        for (const [key, value] of filtered) {
          params.append(key, value);
        }

        const paramString = params.toString();
        if (paramString) {
          query = `?${paramString}`;
        }
      }

      // フラグメント
      const fragment =
        this.config.includeFragment && url.hash ? url.hash : '';

      // 組み立て
      const portPart = port ? `:${port}` : '';
      return `${scheme}//${host}${portPart}${path}${query}${fragment}`;
    } catch {
      // 無効なURLはそのまま返す
      return urlString;
    }
  }

  /**
   * ハッシュ値を計算
   *
   * @param input 入力文字列
   * @returns ハッシュ値（16進数）
   */
  hash(input: string): string {
    return createHash(this.config.hashAlgorithm).update(input).digest('hex');
  }

  /**
   * 設定を取得
   */
  getConfig(): CacheKeyGeneratorConfig {
    return { ...this.config };
  }
}
