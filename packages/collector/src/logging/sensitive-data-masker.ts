/**
 * SensitiveDataMasker - 機密データマスキング
 *
 * @requirement REQ-DR-U-002 - ログ機構（機密データ保護）
 * @design DES-KATASHIRO-005-DR-LOG §3.2
 * @task TASK-008
 */

import { DEFAULT_MASKING_PATTERNS, type MaskingPattern } from './types.js';

/**
 * 機密データマスカー
 *
 * @example
 * ```typescript
 * const masker = new SensitiveDataMasker();
 *
 * const masked = masker.mask('API key: sk-1234567890abcdef');
 * // → 'API key: [MASKED]'
 *
 * const maskedObj = masker.maskObject({
 *   url: 'https://api.example.com',
 *   headers: { Authorization: 'Bearer token123' }
 * });
 * // → { url: 'https://api.example.com', headers: { Authorization: 'Bearer [MASKED]' } }
 * ```
 */
export class SensitiveDataMasker {
  private readonly patterns: MaskingPattern[];
  private readonly customPatterns: MaskingPattern[] = [];

  constructor(options?: { patterns?: MaskingPattern[]; useDefaults?: boolean }) {
    const useDefaults = options?.useDefaults ?? true;
    this.patterns = useDefaults ? [...DEFAULT_MASKING_PATTERNS] : [];

    if (options?.patterns) {
      this.customPatterns.push(...options.patterns);
    }
  }

  /**
   * カスタムパターンを追加
   */
  public addPattern(pattern: MaskingPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * 文字列内の機密データをマスク
   */
  public mask(value: string): string {
    let masked = value;

    // デフォルトパターンを適用
    for (const pattern of this.patterns) {
      masked = masked.replace(pattern.pattern, pattern.replacement);
    }

    // カスタムパターンを適用
    for (const pattern of this.customPatterns) {
      masked = masked.replace(pattern.pattern, pattern.replacement);
    }

    return masked;
  }

  /**
   * オブジェクト内の機密データを再帰的にマスク
   */
  public maskObject<T>(obj: T, depth = 0): T {
    // 深さ制限（循環参照対策）
    if (depth > 10) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.mask(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item, depth + 1)) as T;
    }

    if (typeof obj === 'object') {
      const masked: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        // センシティブなキー名をチェック
        if (this.isSensitiveKey(key)) {
          masked[key] = '[MASKED]';
        } else {
          masked[key] = this.maskObject(value, depth + 1);
        }
      }

      return masked as T;
    }

    return obj;
  }

  /**
   * キー名がセンシティブかどうかを判定
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'api_key',
      'apikey',
      'api-key',
      'auth',
      'authorization',
      'credential',
      'private',
      'access_token',
      'refresh_token',
      'session',
      'cookie',
    ];

    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));
  }

  /**
   * URL内の機密パラメータをマスク
   */
  public maskUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // クエリパラメータをマスク
      const sensitiveParams = ['key', 'token', 'api_key', 'apikey', 'secret', 'password', 'auth'];

      for (const param of sensitiveParams) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[MASKED]');
        }
      }

      // ユーザー情報をマスク
      if (parsed.username) {
        parsed.username = '[USER]';
      }
      if (parsed.password) {
        parsed.password = '[MASKED]';
      }

      return parsed.toString();
    } catch {
      // URLパースに失敗した場合は通常のマスクを適用
      return this.mask(url);
    }
  }

  /**
   * ヘッダーオブジェクトをマスク
   */
  public maskHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> {
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'x-auth-token',
      'cookie',
      'set-cookie',
      'x-access-token',
      'x-refresh-token',
    ];

    const masked: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;

      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        masked[key] = '[MASKED]';
      } else if (typeof value === 'string') {
        masked[key] = this.mask(value);
      } else {
        masked[key] = value.map((v) => this.mask(v));
      }
    }

    return masked;
  }

  /**
   * エラーオブジェクトをマスク
   */
  public maskError(error: Error): { name: string; message: string; stack?: string } {
    return {
      name: error.name,
      message: this.mask(error.message),
      stack: error.stack ? this.mask(error.stack) : undefined,
    };
  }
}
