/**
 * robots.txt 型定義
 *
 * @requirement REQ-DR-W-003 - robots.txt違反の禁止
 * @design DES-KATASHIRO-005-DR-ROBOTS
 * @task TASK-029, TASK-030
 */

import { z } from 'zod';

/**
 * robots.txt設定スキーマ
 */
export const RobotsConfigSchema = z.object({
  /**
   * robots.txtを遵守するか（デフォルト: true）
   */
  enabled: z.boolean().default(true),

  /**
   * キャッシュTTL（ミリ秒、デフォルト: 3600000 = 1時間）
   */
  cacheTtlMs: z.number().int().min(60000).max(86400000).default(3600000),

  /**
   * robots.txt取得タイムアウト（ミリ秒、デフォルト: 10000）
   */
  timeoutMs: z.number().int().min(1000).max(60000).default(10000),

  /**
   * User-Agent（robots.txtでマッチング用）
   */
  userAgent: z.string().default('KATASHIRO'),

  /**
   * robots.txt取得失敗時の動作
   * - 'allow': アクセス許可（デフォルト）
   * - 'deny': アクセス拒否
   */
  onFetchError: z.enum(['allow', 'deny']).default('allow'),

  /**
   * Crawl-delayを遵守するか
   */
  respectCrawlDelay: z.boolean().default(true),

  /**
   * 最大Crawl-delay（秒、デフォルト: 60）
   */
  maxCrawlDelaySec: z.number().min(0).max(300).default(60),
});

/**
 * robots.txt設定型
 */
export type RobotsConfig = z.infer<typeof RobotsConfigSchema>;

/**
 * デフォルト設定
 */
export const DEFAULT_ROBOTS_CONFIG: RobotsConfig = {
  enabled: true,
  cacheTtlMs: 3600000, // 1時間
  timeoutMs: 10000,
  userAgent: 'KATASHIRO',
  onFetchError: 'allow',
  respectCrawlDelay: true,
  maxCrawlDelaySec: 60,
};

/**
 * robots.txtルール型
 */
export interface RobotsRule {
  /** User-Agent（'*'はワイルドカード） */
  userAgent: string;
  /** Disallowパス一覧 */
  disallow: string[];
  /** Allowパス一覧（Disallowより優先） */
  allow: string[];
  /** Crawl-delay（秒） */
  crawlDelay?: number;
  /** Sitemap URL一覧 */
  sitemaps: string[];
}

/**
 * パースされたrobots.txt
 */
export interface ParsedRobotsTxt {
  /** ドメイン */
  domain: string;
  /** ルール一覧（User-Agentごと） */
  rules: RobotsRule[];
  /** グローバルSitemap */
  sitemaps: string[];
  /** パース日時 */
  parsedAt: Date;
  /** 有効期限 */
  expiresAt: Date;
  /** 取得成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * robots.txtキャッシュエントリ
 */
export interface RobotsCacheEntry {
  /** パース結果 */
  parsed: ParsedRobotsTxt;
  /** キャッシュキー（ドメイン） */
  key: string;
  /** 作成日時 */
  createdAt: Date;
  /** 有効期限 */
  expiresAt: Date;
}

/**
 * アクセス許可結果
 */
export interface RobotsCheckResult {
  /** アクセス許可 */
  allowed: boolean;
  /** マッチしたルール */
  matchedRule?: {
    userAgent: string;
    pattern: string;
    type: 'allow' | 'disallow';
  };
  /** Crawl-delay（秒） */
  crawlDelay?: number;
  /** キャッシュからの取得か */
  fromCache: boolean;
  /** 判定理由 */
  reason: string;
}
