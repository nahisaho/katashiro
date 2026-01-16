/**
 * @fileoverview ConcurrencyQueueモジュールのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConcurrencyQueue,
  createConcurrencyQueue,
  type QueueTask,
} from '../../src/parallel/concurrency-queue';

describe('ConcurrencyQueue', () => {
  let queue: ConcurrencyQueue<string>;

  beforeEach(() => {
    queue = createConcurrencyQueue<string>({ maxSize: 10 });
  });

  describe('createConcurrencyQueue', () => {
    it('デフォルト設定でキューを作成する', () => {
      const q = createConcurrencyQueue();
      expect(q.size).toBe(0);
    });

    it('カスタム設定でキューを作成する', () => {
      const q = createConcurrencyQueue({
        maxSize: 100,
        taskTimeoutMs: 120000,
        priorityWeights: { high: 5, normal: 2, low: 1 },
      });
      expect(q).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('タスクをエンキューする', () => {
      const task: QueueTask<string> = {
        id: 'task-1',
        domain: 'example.com',
        priority: 'normal',
        fn: async () => 'result',
        enqueuedAt: Date.now(),
        createdAt: Date.now(),
      };

      const result = queue.enqueue(task);
      expect(result).toBe(true);
      expect(queue.size).toBe(1);
    });

    it('優先度別にエンキューする', () => {
      const now = Date.now();
      const tasks: QueueTask<string>[] = [
        { id: '1', domain: 'a.com', priority: 'low', fn: async () => '1', enqueuedAt: now, createdAt: now },
        { id: '2', domain: 'b.com', priority: 'high', fn: async () => '2', enqueuedAt: now, createdAt: now },
        { id: '3', domain: 'c.com', priority: 'normal', fn: async () => '3', enqueuedAt: now, createdAt: now },
      ];

      tasks.forEach((t) => queue.enqueue(t));
      expect(queue.size).toBe(3);
    });

    it('最大サイズを超えると低優先度を削除して追加する', () => {
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        queue.enqueue({
          id: `task-${i}`,
          domain: 'example.com',
          priority: 'low',
          fn: async () => `result-${i}`,
          enqueuedAt: now,
          createdAt: now + i,
        });
      }

      // 高優先度タスクを追加すると、低優先度が削除される
      const result = queue.enqueue({
        id: 'high-priority',
        domain: 'example.com',
        priority: 'high',
        fn: async () => 'overflow',
        enqueuedAt: now,
        createdAt: now + 100,
      });

      expect(result).toBe(true);
      expect(queue.size).toBe(10);
      expect(queue.has('high-priority')).toBe(true);
    });
  });

  describe('dequeue', () => {
    it('優先度順にデキューする', () => {
      const now = Date.now();
      queue.enqueue({ id: 'low', domain: 'a.com', priority: 'low', fn: async () => 'low', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: 'high', domain: 'b.com', priority: 'high', fn: async () => 'high', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: 'normal', domain: 'c.com', priority: 'normal', fn: async () => 'normal', enqueuedAt: now, createdAt: now });

      const first = queue.dequeue();
      expect(first?.id).toBe('high');

      const second = queue.dequeue();
      expect(second?.id).toBe('normal');

      const third = queue.dequeue();
      expect(third?.id).toBe('low');
    });

    it('空のキューからはnullを返す', () => {
      const result = queue.dequeue();
      expect(result).toBeNull();
    });
  });

  describe('dequeueByDomain', () => {
    it('特定ドメインのタスクをデキューする', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '3', domain: 'a.com', priority: 'normal', fn: async () => '3', enqueuedAt: now, createdAt: now });

      const task = queue.dequeueByDomain('b.com');
      expect(task?.id).toBe('2');
      expect(queue.size).toBe(2);
    });

    it('該当ドメインがない場合はnullを返す', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });

      const result = queue.dequeueByDomain('notfound.com');
      expect(result).toBeNull();
    });
  });

  describe('peekNext', () => {
    it('先頭のタスクを取得するがキューから削除しない', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });

      const peeked = queue.peekNext();
      expect(peeked?.id).toBe('1');
      expect(queue.size).toBe(1);
    });
  });

  describe('peek', () => {
    it('タスクIDで特定のタスクを取得する', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });

      const task = queue.peek('2');
      expect(task?.id).toBe('2');
    });
  });

  describe('remove', () => {
    it('特定のタスクを削除する', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });

      const removed = queue.remove('1');
      expect(removed).toBe(true);
      expect(queue.size).toBe(1);
    });

    it('存在しないタスクはfalseを返す', () => {
      const removed = queue.remove('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('キューをクリアする', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });

      queue.clear();
      expect(queue.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('キューの統計情報を返す', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'high', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '3', domain: 'a.com', priority: 'low', fn: async () => '3', enqueuedAt: now, createdAt: now });

      const stats = queue.getStats();
      expect(stats.size).toBe(3);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.normal).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.domainCount).toBe(2);
    });
  });

  describe('getSizeByDomain', () => {
    it('ドメイン別のサイズを取得する', () => {
      const now = Date.now();
      queue.enqueue({ id: '1', domain: 'a.com', priority: 'normal', fn: async () => '1', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '2', domain: 'b.com', priority: 'normal', fn: async () => '2', enqueuedAt: now, createdAt: now });
      queue.enqueue({ id: '3', domain: 'a.com', priority: 'normal', fn: async () => '3', enqueuedAt: now, createdAt: now });

      const sizes = queue.getSizeByDomain();
      expect(sizes.get('a.com')).toBe(2);
      expect(sizes.get('b.com')).toBe(1);
    });
  });

  describe('priorityWeights', () => {
    it('カスタム優先度重みを適用する', () => {
      const q = createConcurrencyQueue({
        maxSize: 100,
        priorityWeights: { high: 10, normal: 5, low: 1 },
      });

      const now = Date.now();
      // 同じエンキュー時刻でも重み付けで順序が変わる
      q.enqueue({ id: 'low', domain: 'a.com', priority: 'low', fn: async () => 'low', enqueuedAt: now, createdAt: now });
      q.enqueue({ id: 'high', domain: 'b.com', priority: 'high', fn: async () => 'high', enqueuedAt: now, createdAt: now });

      const first = q.dequeue();
      expect(first?.id).toBe('high');
    });
  });
});
