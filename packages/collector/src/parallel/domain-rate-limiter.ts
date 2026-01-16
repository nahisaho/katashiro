/**
 * DomainRateLimiter - ドメイン別レート制限
 *
 * @requirement REQ-DR-W-004 ドメイン別レート制限
 * @task TASK-045
 */

import {
  DomainConfig,
  DomainRateLimiterConfig,
  DomainRateLimiterConfigSchema,
  DEFAULT_DOMAIN_RATE_LIMITER_CONFIG,
  ParallelEvent,
  ParallelEventListener,
} from './types.js';
import { Semaphore } from './semaphore.js';

/**
 * ドメインレート制限エラー
 */
export class DomainRateLimitError extends Error {
  constructor(
    public readonly domain: string,
    public readonly reason: string,
    public readonly retryAfterMs?: number
  ) {
    super(`Rate limit exceeded for ${domain}: ${reason}`);
    this.name = 'DomainRateLimitError';
  }
}

/**
 * ドメイン統計情報
 */
export interface DomainRateLimiterStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentConcurrency: number;
  maxConcurrency: number;
  crawlDelay?: number;
  lastRequestTime?: number;
}

/**
 * ドメイン状態
 */
interface DomainState {
  /** ドメイン用セマフォ */
  semaphore: Semaphore;
  /** 最終リクエスト時刻 */
  lastRequestTime: number;
  /** バーストカウント */
  burstCount: number;
  /** バースト開始時刻 */
  burstStartTime: number;
  /** robots.txtのCrawl-delay（ミリ秒） */
  crawlDelayMs?: number;
  /** 設定 */
  config: DomainConfig;
  /** 総リクエスト数 */
  totalRequests: number;
  /** 成功リクエスト数 */
  successfulRequests: number;
  /** 失敗リクエスト数 */
  failedRequests: number;
}

/**
 * ドメイン別レートリミッター
 *
 * @example
 * ```typescript
 * const limiter = new DomainRateLimiter({
 *   defaultConfig: {
 *     pattern: '*',
 *     maxConcurrency: 2,
 *     minIntervalMs: 1000,
 *   },
 *   domainConfigs: [
 *     { pattern: '*.google.com', maxConcurrency: 1, minIntervalMs: 2000 },
 *     { pattern: 'api.example.com', maxConcurrency: 5, minIntervalMs: 100 },
 *   ],
 * });
 *
 * // ドメインへのリクエスト
 * await limiter.withLimit('https://example.com/page', async () => {
 *   return await fetch('https://example.com/page');
 * });
 * ```
 */
export class DomainRateLimiter {
  private readonly config: DomainRateLimiterConfig;
  private readonly domainStates: Map<string, DomainState> = new Map();
  private readonly globalSemaphore: Semaphore;
  private readonly listeners: Set<ParallelEventListener> = new Set();

  constructor(config: Partial<DomainRateLimiterConfig> = {}) {
    this.config = DomainRateLimiterConfigSchema.parse({
      ...DEFAULT_DOMAIN_RATE_LIMITER_CONFIG,
      ...config,
    });
    this.globalSemaphore = new Semaphore({
      maxConcurrency: this.config.globalMaxConcurrency,
    });
  }

  /**
   * イベントリスナーを追加
   */
  on(listener: ParallelEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * イベントリスナーを削除
   */
  off(listener: ParallelEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * イベント発火
   */
  private emit(event: ParallelEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーのエラーは無視
      }
    }
  }

  /**
   * レート制限を適用してリクエストを実行
   *
   * @param url リクエストURL
   * @param fn 実行する関数
   * @returns 関数の戻り値
   */
  async withLimit<T>(url: string, fn: () => Promise<T>): Promise<T> {
    const domain = this.extractDomain(url);
    const state = this.getOrCreateDomainState(domain);

    // グローバルセマフォを取得
    const globalRelease = await this.globalSemaphore.acquire();

    try {
      // ドメインセマフォを取得
      const domainRelease = await state.semaphore.acquire();

      try {
        // レート制限の適用
        await this.waitForRateLimit(domain, state);

        // バーストカウントを更新
        this.updateBurstCount(state);

        // リクエスト実行
        state.lastRequestTime = Date.now();
        state.totalRequests++;
        try {
          const result = await fn();
          state.successfulRequests++;
          return result;
        } catch (error) {
          state.failedRequests++;
          throw error;
        }
      } finally {
        domainRelease();
      }
    } finally {
      globalRelease();
    }
  }

  /**
   * ドメインのスロットを獲得
   *
   * @param domain ドメイン名
   * @param timeoutMs タイムアウト（ミリ秒）
   * @returns 獲得成功かどうか
   */
  async acquireSlot(domain: string, timeoutMs?: number): Promise<boolean> {
    const state = this.getOrCreateDomainState(domain);
    try {
      if (timeoutMs !== undefined) {
        const result = state.semaphore.tryAcquire();
        if (result) {
          return true;
        }
        // タイムアウト付きで待機
        await state.semaphore.acquire();
        return true;
      }
      await state.semaphore.acquire();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ドメインのスロットを解放
   *
   * @param domain ドメイン名
   */
  releaseSlot(domain: string): void {
    const state = this.domainStates.get(domain);
    if (state) {
      state.semaphore.release();
    }
  }

  /**
   * ドメインへリクエスト可能か判定
   *
   * @param domain ドメイン名
   * @returns リクエスト可能かどうか
   */
  canRequest(domain: string): boolean {
    const state = this.domainStates.get(domain);
    if (!state) {
      return true; // 初回リクエスト
    }
    return state.semaphore.isAvailable;
  }

  /**
   * ドメインの統計情報を取得（テスト互換API）
   *
   * @param domain ドメイン名
   * @returns 統計情報
   */
  getStats(domain: string): DomainRateLimiterStats {
    const state = this.getOrCreateDomainState(domain);
    return {
      totalRequests: state.totalRequests,
      successfulRequests: state.successfulRequests,
      failedRequests: state.failedRequests,
      currentConcurrency: state.semaphore.current,
      maxConcurrency: state.config.maxConcurrency,
      crawlDelay: state.crawlDelayMs,
      lastRequestTime: state.lastRequestTime || undefined,
    };
  }

  /**
   * 全ドメインの統計情報を取得
   *
   * @returns ドメインごとの統計情報マップ
   */
  getAllStats(): Map<string, DomainRateLimiterStats> {
    const result = new Map<string, DomainRateLimiterStats>();
    for (const [domain] of this.domainStates) {
      result.set(domain, this.getStats(domain));
    }
    return result;
  }

  /**
   * ドメインの統計情報をクリア
   *
   * @param domain ドメイン名
   */
  clearStats(domain: string): void {
    const state = this.domainStates.get(domain);
    if (state) {
      state.totalRequests = 0;
      state.successfulRequests = 0;
      state.failedRequests = 0;
    }
  }

  /**
   * レート制限なしで即時実行可能か確認
   *
   * @param url リクエストURL
   * @returns 即時実行可能かどうか
   */
  canExecuteImmediately(url: string): boolean {
    if (!this.globalSemaphore.isAvailable) {
      return false;
    }

    const domain = this.extractDomain(url);
    const state = this.domainStates.get(domain);

    if (!state) {
      return true; // 初回リクエスト
    }

    if (!state.semaphore.isAvailable) {
      return false;
    }

    const now = Date.now();
    const interval = this.getEffectiveInterval(state);
    const elapsed = now - state.lastRequestTime;

    return elapsed >= interval;
  }

  /**
   * Crawl-delayを設定
   *
   * @param domain ドメイン
   * @param delayMs 遅延（ミリ秒）
   */
  setCrawlDelay(domain: string, delayMs: number): void {
    if (!this.config.respectCrawlDelay) {
      return;
    }

    const state = this.getOrCreateDomainState(domain);
    state.crawlDelayMs = delayMs;
  }

  /**
   * ドメインの統計情報を取得
   */
  getDomainStats(domain: string): {
    concurrency: number;
    maxConcurrency: number;
    burstCount: number;
    lastRequestTime: number;
    effectiveIntervalMs: number;
  } | null {
    const state = this.domainStates.get(domain);
    if (!state) {
      return null;
    }

    return {
      concurrency: state.semaphore.current,
      maxConcurrency: state.config.maxConcurrency,
      burstCount: state.burstCount,
      lastRequestTime: state.lastRequestTime,
      effectiveIntervalMs: this.getEffectiveInterval(state),
    };
  }

  /**
   * 全体の統計情報を取得
   */
  getGlobalStats(): {
    globalConcurrency: number;
    globalMaxConcurrency: number;
    activeDomains: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const state of this.domainStates.values()) {
      totalRequests += state.totalRequests;
    }

    return {
      globalConcurrency: this.globalSemaphore.current,
      globalMaxConcurrency: this.config.globalMaxConcurrency,
      activeDomains: this.domainStates.size,
      totalRequests,
    };
  }

  /**
   * ドメイン状態をクリア
   */
  clearDomainState(domain: string): void {
    const state = this.domainStates.get(domain);
    if (state) {
      state.semaphore.reset();
      this.domainStates.delete(domain);
    }
  }

  /**
   * すべての状態をクリア
   */
  reset(): void {
    for (const state of this.domainStates.values()) {
      state.semaphore.reset();
    }
    this.domainStates.clear();
    this.globalSemaphore.reset();
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase();
    } catch {
      // 無効なURLの場合はそのまま返す
      return url.toLowerCase();
    }
  }

  /**
   * ドメイン用の設定を取得
   */
  private getConfigForDomain(domain: string): DomainConfig {
    // ドメイン別設定を検索
    for (const config of this.config.domainConfigs) {
      if (this.matchPattern(domain, config.pattern)) {
        return config;
      }
    }
    return this.config.defaultConfig;
  }

  /**
   * ワイルドカードパターンマッチング
   */
  private matchPattern(domain: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    // *.example.com パターン
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      return domain === suffix || domain.endsWith('.' + suffix);
    }

    // 完全一致
    return domain === pattern;
  }

  /**
   * ドメイン状態を取得または作成
   */
  private getOrCreateDomainState(domain: string): DomainState {
    let state = this.domainStates.get(domain);

    if (!state) {
      const config = this.getConfigForDomain(domain);
      state = {
        semaphore: new Semaphore({ maxConcurrency: config.maxConcurrency }),
        lastRequestTime: 0,
        burstCount: 0,
        burstStartTime: Date.now(),
        config,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      };
      this.domainStates.set(domain, state);
    }

    return state;
  }

  /**
   * 有効な間隔を取得（Crawl-delay考慮）
   */
  private getEffectiveInterval(state: DomainState): number {
    const configInterval = state.config.minIntervalMs;
    const crawlDelay = state.crawlDelayMs ?? 0;
    return Math.max(configInterval, crawlDelay);
  }

  /**
   * レート制限の待機
   */
  private async waitForRateLimit(domain: string, state: DomainState): Promise<void> {
    const now = Date.now();
    const interval = this.getEffectiveInterval(state);
    const elapsed = now - state.lastRequestTime;

    // バースト制限チェック
    if (state.burstCount >= state.config.burstLimit) {
      const burstElapsed = now - state.burstStartTime;
      if (burstElapsed < state.config.burstCooldownMs) {
        const delayMs = state.config.burstCooldownMs - burstElapsed;
        this.emit({ type: 'rateLimited', domain, delayMs });
        await this.delay(delayMs);
        // バーストカウントをリセット
        state.burstCount = 0;
        state.burstStartTime = Date.now();
      }
    }

    // 間隔制限チェック
    if (elapsed < interval) {
      const delayMs = interval - elapsed;
      this.emit({ type: 'rateLimited', domain, delayMs });
      await this.delay(delayMs);
    }
  }

  /**
   * バーストカウントを更新
   */
  private updateBurstCount(state: DomainState): void {
    const now = Date.now();
    const burstElapsed = now - state.burstStartTime;

    // クールダウン期間を過ぎていればリセット
    if (burstElapsed >= state.config.burstCooldownMs) {
      state.burstCount = 0;
      state.burstStartTime = now;
    }

    state.burstCount++;
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * ファクトリ関数用の拡張設定型
 * domainConfigsはオブジェクト形式（{ 'domain': config }）も受け付ける
 */
export interface CreateDomainRateLimiterConfig {
  defaultConfig?: Partial<DomainConfig>;
  domainConfigs?: Record<string, Partial<Omit<DomainConfig, 'pattern'>>> | DomainConfig[];
  globalMaxConcurrency?: number;
  respectCrawlDelay?: boolean;
}

/**
 * DomainRateLimiterインスタンスを作成するファクトリ関数
 *
 * @example
 * ```typescript
 * // オブジェクト形式（推奨）
 * const limiter = createDomainRateLimiter({
 *   domainConfigs: {
 *     'api.example.com': { maxConcurrency: 10 },
 *     '*.slow.com': { minIntervalMs: 2000 },
 *   },
 * });
 *
 * // 配列形式（従来）
 * const limiter = createDomainRateLimiter({
 *   domainConfigs: [
 *     { pattern: 'api.example.com', maxConcurrency: 10 },
 *   ],
 * });
 * ```
 */
export function createDomainRateLimiter(config?: CreateDomainRateLimiterConfig): DomainRateLimiter {
  if (!config) {
    return new DomainRateLimiter();
  }

  // domainConfigsがオブジェクト形式の場合、配列形式に変換
  let domainConfigs: DomainConfig[] | undefined;
  if (config.domainConfigs && !Array.isArray(config.domainConfigs)) {
    domainConfigs = Object.entries(config.domainConfigs).map(([pattern, cfg]) => ({
      pattern,
      maxConcurrency: cfg.maxConcurrency ?? 2,
      minIntervalMs: cfg.minIntervalMs ?? 1000,
      burstLimit: cfg.burstLimit ?? 5,
      burstCooldownMs: cfg.burstCooldownMs ?? 60000,
    }));
  } else if (Array.isArray(config.domainConfigs)) {
    domainConfigs = config.domainConfigs;
  }

  return new DomainRateLimiter({
    defaultConfig: config.defaultConfig ? {
      pattern: config.defaultConfig.pattern ?? '*',
      maxConcurrency: config.defaultConfig.maxConcurrency ?? 2,
      minIntervalMs: config.defaultConfig.minIntervalMs ?? 1000,
      burstLimit: config.defaultConfig.burstLimit ?? 5,
      burstCooldownMs: config.defaultConfig.burstCooldownMs ?? 60000,
    } : undefined,
    domainConfigs,
    globalMaxConcurrency: config.globalMaxConcurrency,
    respectCrawlDelay: config.respectCrawlDelay,
  });
}
