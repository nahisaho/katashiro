/**
 * RobotsParser - robots.txt パーサー
 *
 * @requirement REQ-DR-W-003 - robots.txt違反の禁止
 * @design DES-KATASHIRO-005-DR-ROBOTS
 * @task TASK-031, TASK-032
 */

import type {
  RobotsConfig,
  RobotsRule,
  ParsedRobotsTxt,
  RobotsCacheEntry,
  RobotsCheckResult,
} from './types.js';
import { DEFAULT_ROBOTS_CONFIG } from './types.js';

/**
 * robots.txt パーサー・キャッシュ管理
 */
export class RobotsParser {
  private readonly config: RobotsConfig;
  private readonly cache: Map<string, RobotsCacheEntry> = new Map();

  constructor(config: Partial<RobotsConfig> = {}) {
    this.config = { ...DEFAULT_ROBOTS_CONFIG, ...config };
  }

  /**
   * URLがアクセス許可されているか確認
   */
  async isAllowed(url: string): Promise<RobotsCheckResult> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        fromCache: false,
        reason: 'robots.txt check is disabled',
      };
    }

    const urlObj = new URL(url);
    const domain = urlObj.origin;
    const path = urlObj.pathname + urlObj.search;

    // キャッシュを確認
    const cached = this.getFromCache(domain);
    if (cached) {
      return this.checkPath(cached.parsed, path, true);
    }

    // robots.txtを取得
    const parsed = await this.fetch(domain);
    this.setCache(domain, parsed);

    return this.checkPath(parsed, path, false);
  }

  /**
   * robots.txtを取得してパース
   */
  async fetch(domain: string): Promise<ParsedRobotsTxt> {
    const robotsUrl = `${domain}/robots.txt`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheTtlMs);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 404など: アクセス許可とみなす
        return {
          domain,
          rules: [],
          sitemaps: [],
          parsedAt: now,
          expiresAt,
          success: true, // 404 = no restrictions
        };
      }

      const text = await response.text();
      const rules = this.parse(text);
      const sitemaps = this.extractSitemaps(text);

      return {
        domain,
        rules,
        sitemaps,
        parsedAt: now,
        expiresAt,
        success: true,
      };
    } catch (error) {
      return {
        domain,
        rules: [],
        sitemaps: [],
        parsedAt: now,
        expiresAt,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * robots.txt文字列をパース
   */
  parse(content: string): RobotsRule[] {
    const rules: RobotsRule[] = [];
    let currentRule: RobotsRule | null = null;

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      // コメント除去
      const trimmed = line.split('#')[0]?.trim() || '';
      if (!trimmed) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();

      switch (directive) {
        case 'user-agent':
          if (currentRule) {
            rules.push(currentRule);
          }
          currentRule = {
            userAgent: value,
            disallow: [],
            allow: [],
            sitemaps: [],
          };
          break;

        case 'disallow':
          if (currentRule && value) {
            currentRule.disallow.push(value);
          }
          break;

        case 'allow':
          if (currentRule && value) {
            currentRule.allow.push(value);
          }
          break;

        case 'crawl-delay':
          if (currentRule) {
            const delay = parseFloat(value);
            if (!isNaN(delay) && delay >= 0) {
              currentRule.crawlDelay = Math.min(delay, this.config.maxCrawlDelaySec);
            }
          }
          break;

        case 'sitemap':
          if (currentRule) {
            currentRule.sitemaps.push(value);
          }
          break;
      }
    }

    // 最後のルールを追加
    if (currentRule) {
      rules.push(currentRule);
    }

    return rules;
  }

  /**
   * Sitemapを抽出
   */
  private extractSitemaps(content: string): string[] {
    const sitemaps: string[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.split('#')[0]?.trim() || '';
      if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const url = trimmed.slice(8).trim();
        if (url) sitemaps.push(url);
      }
    }

    return sitemaps;
  }

  /**
   * パスのアクセス許可を確認
   */
  private checkPath(
    parsed: ParsedRobotsTxt,
    path: string,
    fromCache: boolean
  ): RobotsCheckResult {
    // 取得失敗時
    if (!parsed.success) {
      const allowed = this.config.onFetchError === 'allow';
      return {
        allowed,
        fromCache,
        reason: `robots.txt fetch failed: ${parsed.error}`,
      };
    }

    // ルールがない場合は許可
    if (parsed.rules.length === 0) {
      return {
        allowed: true,
        fromCache,
        reason: 'No rules found in robots.txt',
      };
    }

    // 該当するルールを検索（最も具体的なUser-Agentを優先）
    const matchingRule = this.findMatchingRule(parsed.rules);
    if (!matchingRule) {
      return {
        allowed: true,
        fromCache,
        reason: 'No matching User-Agent rule found',
      };
    }

    // Allow/Disallowをチェック（Allowが優先）
    const allowMatch = this.findBestMatch(matchingRule.allow, path);
    const disallowMatch = this.findBestMatch(matchingRule.disallow, path);

    // 空のDisallowは全許可を意味する
    if (disallowMatch === '') {
      return {
        allowed: true,
        matchedRule: {
          userAgent: matchingRule.userAgent,
          pattern: '',
          type: 'disallow',
        },
        crawlDelay: this.config.respectCrawlDelay ? matchingRule.crawlDelay : undefined,
        fromCache,
        reason: 'Empty Disallow means allow all',
      };
    }

    // マッチの長さで判定（より具体的なものが優先）
    if (allowMatch !== null && disallowMatch !== null) {
      const allowed = allowMatch.length >= disallowMatch.length;
      return {
        allowed,
        matchedRule: {
          userAgent: matchingRule.userAgent,
          pattern: allowed ? allowMatch : disallowMatch,
          type: allowed ? 'allow' : 'disallow',
        },
        crawlDelay: this.config.respectCrawlDelay ? matchingRule.crawlDelay : undefined,
        fromCache,
        reason: `Matched ${allowed ? 'Allow' : 'Disallow'}: ${allowed ? allowMatch : disallowMatch}`,
      };
    }

    if (allowMatch !== null) {
      return {
        allowed: true,
        matchedRule: {
          userAgent: matchingRule.userAgent,
          pattern: allowMatch,
          type: 'allow',
        },
        crawlDelay: this.config.respectCrawlDelay ? matchingRule.crawlDelay : undefined,
        fromCache,
        reason: `Matched Allow: ${allowMatch}`,
      };
    }

    if (disallowMatch !== null) {
      return {
        allowed: false,
        matchedRule: {
          userAgent: matchingRule.userAgent,
          pattern: disallowMatch,
          type: 'disallow',
        },
        crawlDelay: this.config.respectCrawlDelay ? matchingRule.crawlDelay : undefined,
        fromCache,
        reason: `Matched Disallow: ${disallowMatch}`,
      };
    }

    // マッチなし = 許可
    return {
      allowed: true,
      crawlDelay: this.config.respectCrawlDelay ? matchingRule.crawlDelay : undefined,
      fromCache,
      reason: 'No matching path pattern',
    };
  }

  /**
   * 該当するUser-Agentルールを検索
   */
  private findMatchingRule(rules: RobotsRule[]): RobotsRule | null {
    // 具体的なUser-Agentを優先
    const specificRule = rules.find(
      (r) => r.userAgent.toLowerCase() === this.config.userAgent.toLowerCase()
    );
    if (specificRule) return specificRule;

    // ワイルドカードを探す
    const wildcardRule = rules.find((r) => r.userAgent === '*');
    return wildcardRule || null;
  }

  /**
   * パスにマッチするパターンを検索
   */
  private findBestMatch(patterns: string[], path: string): string | null {
    let bestMatch: string | null = null;
    let bestLength = -1;

    for (const pattern of patterns) {
      if (this.pathMatches(path, pattern)) {
        if (pattern.length > bestLength) {
          bestMatch = pattern;
          bestLength = pattern.length;
        }
      }
    }

    return bestMatch;
  }

  /**
   * パスがパターンにマッチするか確認
   */
  private pathMatches(path: string, pattern: string): boolean {
    if (!pattern) return false;

    // 空パターンは全マッチ
    if (pattern === '') return true;

    // $で終わる場合は完全一致
    if (pattern.endsWith('$')) {
      const patternWithoutDollar = pattern.slice(0, -1);
      return path === patternWithoutDollar;
    }

    // *はワイルドカード
    if (pattern.includes('*')) {
      const regex = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '\\?');
      try {
        return new RegExp(`^${regex}`).test(path);
      } catch {
        return false;
      }
    }

    // 前方一致
    return path.startsWith(pattern);
  }

  /**
   * Crawl-delayを取得
   */
  async getCrawlDelay(url: string): Promise<number | undefined> {
    if (!this.config.respectCrawlDelay) return undefined;

    const result = await this.isAllowed(url);
    return result.crawlDelay;
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(domain: string): RobotsCacheEntry | null {
    const entry = this.cache.get(domain);
    if (!entry) return null;

    // 有効期限チェック
    if (new Date() > entry.expiresAt) {
      this.cache.delete(domain);
      return null;
    }

    return entry;
  }

  /**
   * キャッシュに保存
   */
  private setCache(domain: string, parsed: ParsedRobotsTxt): void {
    const now = new Date();
    this.cache.set(domain, {
      parsed,
      key: domain,
      createdAt: now,
      expiresAt: parsed.expiresAt,
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 特定ドメインのキャッシュを無効化
   */
  invalidateCache(domain: string): void {
    this.cache.delete(domain);
  }

  /**
   * キャッシュサイズを取得
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
