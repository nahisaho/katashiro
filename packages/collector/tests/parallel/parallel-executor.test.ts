/**
 * @fileoverview ParallelExecutorモジュールのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ParallelExecutor,
  createParallelExecutor,
  type TaskInput,
} from '../../src/parallel/parallel-executor';

describe('ParallelExecutor', () => {
  let executor: ParallelExecutor;

  beforeEach(() => {
    vi.useFakeTimers();
    executor = createParallelExecutor({
      semaphore: { maxConcurrency: 3 },
      adaptive: {
        initialConcurrency: 3,
        minConcurrency: 1,
        maxConcurrency: 10,
      },
    });
  });

  afterEach(() => {
    executor.stop();
    vi.useRealTimers();
  });

  describe('createParallelExecutor', () => {
    it('デフォルト設定で作成する', () => {
      const exec = createParallelExecutor();
      expect(exec).toBeDefined();
      exec.stop();
    });

    it('カスタム設定で作成する', () => {
      const exec = createParallelExecutor({
        semaphore: { maxConcurrency: 10 },
        rateLimiter: {
          defaultConfig: {
            maxConcurrency: 5,
            minIntervalMs: 500,
          },
        },
      });
      expect(exec).toBeDefined();
      exec.stop();
    });
  });

  describe('execute', () => {
    it('単一タスクを実行する', async () => {
      vi.useRealTimers();

      const task: TaskInput<string> = {
        id: 'task-1',
        url: 'https://example.com/page',
        execute: async () => 'result',
      };

      const result = await executor.execute(task);
      expect(result.success).toBe(true);
      expect(result.result).toBe('result');
    });

    it('エラーを正しくハンドリングする', async () => {
      vi.useRealTimers();

      const task: TaskInput<string> = {
        id: 'task-error',
        url: 'https://example.com/page',
        execute: async () => {
          throw new Error('test error');
        },
      };

      const result = await executor.execute(task);
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('優先度を指定して実行する', async () => {
      vi.useRealTimers();

      const task: TaskInput<string> = {
        id: 'high-priority',
        url: 'https://example.com/page',
        priority: 'high',
        execute: async () => 'high',
      };

      const result = await executor.execute(task);
      expect(result.success).toBe(true);
    });
  });

  describe('executeBatch', () => {
    it('バッチでタスクを実行する', async () => {
      vi.useRealTimers();

      const tasks: TaskInput<number>[] = [
        { id: '1', url: 'https://a.com/page', execute: async () => 1 },
        { id: '2', url: 'https://b.com/page', execute: async () => 2 },
        { id: '3', url: 'https://c.com/page', execute: async () => 3 },
      ];

      const result = await executor.executeBatch(tasks);
      
      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(3);
    });

    it('一部失敗でも全体は完了する', async () => {
      vi.useRealTimers();

      const tasks: TaskInput<string>[] = [
        { id: '1', url: 'https://a.com/page', execute: async () => 'ok' },
        { id: '2', url: 'https://b.com/page', execute: async () => { throw new Error('fail'); } },
        { id: '3', url: 'https://c.com/page', execute: async () => 'ok' },
      ];

      const result = await executor.executeBatch(tasks);
      
      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('空のバッチを処理する', async () => {
      vi.useRealTimers();

      const result = await executor.executeBatch([]);
      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
    });
  });

  describe('executeStream', () => {
    it('ストリームでタスクを実行する', async () => {
      vi.useRealTimers();

      const tasks: TaskInput<number>[] = [
        { id: '1', url: 'https://a.com/page', execute: async () => 1 },
        { id: '2', url: 'https://b.com/page', execute: async () => 2 },
      ];

      const results: number[] = [];
      for await (const result of executor.executeStream(tasks)) {
        if (result.success && result.result !== undefined) {
          results.push(result.result);
        }
      }

      expect(results.length).toBe(2);
      expect(results).toContain(1);
      expect(results).toContain(2);
    });
  });

  describe('start / stop', () => {
    it('実行を開始・停止する', () => {
      executor.start();
      const stats = executor.getStats();
      expect(stats.isRunning).toBe(true);

      executor.stop();
      const statsAfter = executor.getStats();
      expect(statsAfter.isRunning).toBe(false);
    });
  });

  describe('getStats', () => {
    it('エグゼキュータの統計情報を返す', async () => {
      vi.useRealTimers();

      await executor.execute({
        id: 'test',
        url: 'https://example.com/page',
        execute: async () => 'test',
      });

      const stats = executor.getStats();
      
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.processingCount).toBe('number');
      expect(typeof stats.queueSize).toBe('number');
      expect(stats.semaphore).toBeDefined();
      expect(stats.rateLimiter).toBeDefined();
      expect(stats.adaptive).toBeDefined();
    });
  });

  describe('ドメインレートリミット', () => {
    it('同一ドメインへのリクエストを制限する', async () => {
      vi.useRealTimers();

      const exec = createParallelExecutor({
        rateLimiter: {
          defaultConfig: {
            maxConcurrency: 1,
            minIntervalMs: 100,
          },
        },
      });

      const startTime = Date.now();
      
      await exec.executeBatch([
        { id: '1', url: 'https://same.com/page1', execute: async () => 1 },
        { id: '2', url: 'https://same.com/page2', execute: async () => 2 },
      ]);

      const duration = Date.now() - startTime;
      // 2つ目のリクエストは100ms待機するはず
      expect(duration).toBeGreaterThanOrEqual(90);

      exec.stop();
    });
  });

  describe('イベント', () => {
    it('タスク完了時にイベントを発火する', async () => {
      vi.useRealTimers();

      const eventHandler = vi.fn();
      executor.on(eventHandler);

      await executor.execute({
        id: 'test',
        url: 'https://example.com/page',
        execute: async () => 'test',
      });

      // taskStart と taskComplete イベントが発火
      const completeEvents = eventHandler.mock.calls.filter(
        ([event]) => event.type === 'taskComplete'
      );
      expect(completeEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('タスク失敗時にイベントを発火する', async () => {
      vi.useRealTimers();

      const eventHandler = vi.fn();
      executor.on(eventHandler);

      await executor.execute({
        id: 'test',
        url: 'https://example.com/page',
        execute: async () => { throw new Error('fail'); },
      });

      const errorEvents = eventHandler.mock.calls.filter(
        ([event]) => event.type === 'taskError'
      );
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reset', () => {
    it('エグゼキュータをリセットする', async () => {
      vi.useRealTimers();

      await executor.execute({
        id: 'test',
        url: 'https://example.com/page',
        execute: async () => 'test',
      });

      executor.reset();
      
      const stats = executor.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.queueSize).toBe(0);
    });
  });
});
