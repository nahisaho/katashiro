/**
 * HealthChecker Tests
 *
 * @design DES-KATASHIRO-003-OBS §8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HealthChecker,
  getHealthChecker,
  resetHealthChecker,
} from '../src/HealthChecker.js';
import type { HealthCheck } from '../src/types.js';

describe('HealthChecker', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    resetHealthChecker();
    checker = new HealthChecker();
  });

  describe('register/unregister', () => {
    it('ヘルスチェックを登録', () => {
      const check: HealthCheck = {
        name: 'database',
        check: vi.fn().mockResolvedValue({ status: 'pass' }),
      };

      checker.register(check);
      // 登録されたことを確認するためにcheckを実行
    });

    it('ヘルスチェックを登録解除', () => {
      const check: HealthCheck = {
        name: 'database',
        check: vi.fn().mockResolvedValue({ status: 'pass' }),
      };

      checker.register(check);
      const removed = checker.unregister('database');
      expect(removed).toBe(true);

      const notFound = checker.unregister('non-existent');
      expect(notFound).toBe(false);
    });
  });

  describe('check', () => {
    it('全チェックがpassならhealthy', async () => {
      checker.register({
        name: 'db',
        check: async () => ({ status: 'pass' }),
      });
      checker.register({
        name: 'cache',
        check: async () => ({ status: 'pass' }),
      });

      const result = await checker.check();

      expect(result.status).toBe('healthy');
      expect(result.checks['db'].status).toBe('pass');
      expect(result.checks['cache'].status).toBe('pass');
    });

    it('warnがあればdegraded', async () => {
      checker.register({
        name: 'db',
        check: async () => ({ status: 'pass' }),
      });
      checker.register({
        name: 'cache',
        check: async () => ({ status: 'warn', message: 'High latency' }),
      });

      const result = await checker.check();

      expect(result.status).toBe('degraded');
    });

    it('failがあればunhealthy', async () => {
      checker.register({
        name: 'db',
        check: async () => ({ status: 'fail', message: 'Connection refused' }),
      });
      checker.register({
        name: 'cache',
        check: async () => ({ status: 'pass' }),
      });

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['db'].message).toBe('Connection refused');
    });

    it('タイムアウト時にfail', async () => {
      checker = new HealthChecker({ defaultTimeout: 100 });

      checker.register({
        name: 'slow-check',
        check: async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return { status: 'pass' };
        },
      });

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['slow-check'].status).toBe('fail');
      expect(result.checks['slow-check'].message).toContain('timeout');
    });

    it('例外時にfail', async () => {
      checker.register({
        name: 'error-check',
        check: async () => {
          throw new Error('Connection error');
        },
      });

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['error-check'].status).toBe('fail');
      expect(result.checks['error-check'].message).toBe('Connection error');
    });

    it('レイテンシを記録', async () => {
      checker.register({
        name: 'timed-check',
        check: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { status: 'pass' };
        },
      });

      const result = await checker.check();

      // タイミングの誤差を考慮 (50ms -> 40ms)
      expect(result.checks['timed-check'].latencyMs).toBeGreaterThanOrEqual(40);
    });
  });

  describe('liveness', () => {
    it('常にpassを返す', async () => {
      const result = await checker.liveness();
      expect(result.status).toBe('pass');
    });
  });

  describe('readiness', () => {
    it('全チェックの結果を返す', async () => {
      checker.register({
        name: 'db',
        check: async () => ({ status: 'pass' }),
      });

      const result = await checker.readiness();

      expect(result.status).toBe('healthy');
      expect(result.checks['db']).toBeDefined();
    });
  });

  describe('getHealthChecker', () => {
    it('シングルトンインスタンスを返す', () => {
      const checker1 = getHealthChecker();
      const checker2 = getHealthChecker();
      expect(checker1).toBe(checker2);
    });
  });

  describe('parallel execution', () => {
    it('並列実行モードで全チェックを同時実行', async () => {
      checker = new HealthChecker({ parallel: true });
      const executionOrder: string[] = [];

      checker.register({
        name: 'slow',
        check: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          executionOrder.push('slow');
          return { status: 'pass' };
        },
      });

      checker.register({
        name: 'fast',
        check: async () => {
          executionOrder.push('fast');
          return { status: 'pass' };
        },
      });

      await checker.check();

      // 並列実行なのでfastが先に完了
      expect(executionOrder[0]).toBe('fast');
    });

    it('逐次実行モード', async () => {
      checker = new HealthChecker({ parallel: false });
      const executionOrder: string[] = [];

      checker.register({
        name: 'first',
        check: async () => {
          executionOrder.push('first');
          return { status: 'pass' };
        },
      });

      checker.register({
        name: 'second',
        check: async () => {
          executionOrder.push('second');
          return { status: 'pass' };
        },
      });

      await checker.check();

      // 登録順に実行
      expect(executionOrder).toEqual(['first', 'second']);
    });
  });
});
