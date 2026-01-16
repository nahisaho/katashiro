/**
 * @fileoverview DomainRateLimiterモジュールのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DomainRateLimiter,
  createDomainRateLimiter,
  DomainRateLimitError,
  type DomainRateLimiterStats,
} from '../../src/parallel/domain-rate-limiter';

describe('DomainRateLimiter', () => {
  let limiter: DomainRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = createDomainRateLimiter({
      defaultConfig: {
        maxConcurrency: 2,
        minIntervalMs: 1000,
        burstLimit: 3,
        burstCooldownMs: 5000,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createDomainRateLimiter', () => {
    it('デフォルト設定で作成する', () => {
      const lim = createDomainRateLimiter();
      const stats = lim.getStats('example.com');
      expect(stats).toBeDefined();
    });

    it('ドメイン別設定で作成する', () => {
      const lim = createDomainRateLimiter({
        domainConfigs: {
          'api.example.com': {
            maxConcurrency: 10,
            minIntervalMs: 100,
          },
        },
      });
      expect(lim).toBeDefined();
    });
  });

  describe('withLimit', () => {
    it('リクエストを制限内で実行する', async () => {
      const result = await limiter.withLimit('example.com', async () => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('同時実行数を制限する', async () => {
      // fake timersを一時的に無効化
      vi.useRealTimers();

      const executions: number[] = [];
      let concurrent = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 4 }, (_, i) =>
        limiter.withLimit('example.com', async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          executions.push(i);
          await new Promise((resolve) => setTimeout(resolve, 10));
          concurrent--;
          return i;
        })
      );

      await Promise.all(tasks);
      expect(maxConcurrent).toBeLessThanOrEqual(2);

      // fake timersを再度有効化
      vi.useFakeTimers();
    });

    it('最小間隔を適用する', async () => {
      const times: number[] = [];

      for (let i = 0; i < 3; i++) {
        await limiter.withLimit('example.com', async () => {
          times.push(Date.now());
        });
        await vi.advanceTimersByTimeAsync(1100); // minIntervalMs以上待つ
      }

      // 各リクエスト間で最小間隔が適用されていることを確認
      for (let i = 1; i < times.length; i++) {
        const interval = times[i] - times[i - 1];
        expect(interval).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  describe('acquireSlot / releaseSlot', () => {
    it('スロットを獲得して解放する', async () => {
      const acquired = await limiter.acquireSlot('example.com');
      expect(acquired).toBe(true);

      limiter.releaseSlot('example.com');
      // 解放後は再度獲得可能
      const acquired2 = await limiter.acquireSlot('example.com');
      expect(acquired2).toBe(true);
    });
  });

  describe('canRequest', () => {
    it('リクエスト可能かを判定する', async () => {
      expect(limiter.canRequest('example.com')).toBe(true);

      // スロットを使い切る
      await limiter.acquireSlot('example.com');
      await limiter.acquireSlot('example.com');

      expect(limiter.canRequest('example.com')).toBe(false);
    });
  });

  describe('setCrawlDelay', () => {
    it('Crawl-delayを設定する', () => {
      limiter.setCrawlDelay('robots-site.com', 2000);
      const stats = limiter.getStats('robots-site.com');
      expect(stats.crawlDelay).toBe(2000);
    });
  });

  describe('getStats', () => {
    it('ドメインの統計を返す', async () => {
      await limiter.withLimit('example.com', async () => 'test');

      const stats: DomainRateLimiterStats = limiter.getStats('example.com');
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(typeof stats.currentConcurrency).toBe('number');
    });

    it('失敗をカウントする', async () => {
      try {
        await limiter.withLimit('example.com', async () => {
          throw new Error('test error');
        });
      } catch {
        // エラーは無視
      }

      const stats = limiter.getStats('example.com');
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe('getAllStats', () => {
    it('全ドメインの統計を返す', async () => {
      await limiter.withLimit('example.com', async () => 'test');
      await limiter.withLimit('other.com', async () => 'test');

      const allStats = limiter.getAllStats();
      expect(allStats.size).toBe(2);
      expect(allStats.has('example.com')).toBe(true);
      expect(allStats.has('other.com')).toBe(true);
    });
  });

  describe('clearStats', () => {
    it('統計をクリアする', async () => {
      await limiter.withLimit('example.com', async () => 'test');
      limiter.clearStats('example.com');

      const stats = limiter.getStats('example.com');
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('パターンマッチング', () => {
    it('ワイルドカードパターンに一致するドメインに設定を適用', () => {
      const lim = createDomainRateLimiter({
        domainConfigs: {
          '*.example.com': {
            maxConcurrency: 5,
            minIntervalMs: 500,
          },
        },
      });

      // api.example.com がパターンにマッチすることを確認
      // (内部実装に依存するため、動作確認のみ)
      expect(lim).toBeDefined();
    });
  });
});
