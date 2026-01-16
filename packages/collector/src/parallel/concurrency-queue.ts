/**
 * ConcurrencyQueue - 優先度付きタスクキュー
 *
 * @task TASK-046
 */

import {
  QueueTask,
  TaskPriority,
  ConcurrencyQueueConfig,
  ConcurrencyQueueConfigSchema,
  DEFAULT_CONCURRENCY_QUEUE_CONFIG,
} from './types.js';

/**
 * 優先度付き並列タスクキュー
 *
 * @example
 * ```typescript
 * const queue = new ConcurrencyQueue<Response>();
 *
 * // タスクを追加
 * queue.enqueue({
 *   id: 'task-1',
 *   priority: 'high',
 *   domain: 'example.com',
 *   url: 'https://example.com/page',
 *   execute: async () => fetch('https://example.com/page'),
 * });
 *
 * // 次のタスクを取得
 * const task = queue.dequeue();
 * if (task) {
 *   const result = await task.execute();
 * }
 * ```
 */
export class ConcurrencyQueue<T> {
  private readonly config: ConcurrencyQueueConfig;
  private readonly queues: Map<TaskPriority, QueueTask<T>[]> = new Map();
  private readonly taskMap: Map<string, QueueTask<T>> = new Map();
  private totalWeight: number = 0;

  constructor(config: Partial<ConcurrencyQueueConfig> = {}) {
    this.config = ConcurrencyQueueConfigSchema.parse({
      ...DEFAULT_CONCURRENCY_QUEUE_CONFIG,
      ...config,
    });

    // 優先度別キューを初期化
    this.queues.set('high', []);
    this.queues.set('normal', []);
    this.queues.set('low', []);
  }

  /**
   * タスクをキューに追加
   *
   * @param task タスク
   * @returns 追加成功かどうか
   */
  enqueue(task: QueueTask<T>): boolean {
    // 重複チェック
    if (this.taskMap.has(task.id)) {
      return false;
    }

    // サイズ制限チェック
    if (this.size >= this.config.maxSize) {
      // 最低優先度のタスクを削除
      if (!this.evictLowestPriority()) {
        return false;
      }
    }

    const queue = this.queues.get(task.priority);
    if (!queue) {
      return false;
    }

    queue.push(task);
    this.taskMap.set(task.id, task);
    this.totalWeight += this.config.priorityWeights[task.priority];

    return true;
  }

  /**
   * 次のタスクを取得（優先度加重ラウンドロビン）
   *
   * @returns タスク、またはキューが空の場合はnull
   */
  dequeue(): QueueTask<T> | null {
    if (this.isEmpty) {
      return null;
    }

    // 優先度順に確認
    const priorities: TaskPriority[] = ['high', 'normal', 'low'];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const task = queue.shift();
        if (task) {
          this.taskMap.delete(task.id);
          this.totalWeight -= this.config.priorityWeights[priority];
          return task;
        }
      }
    }

    return null;
  }

  /**
   * 特定のドメインのタスクを取得
   *
   * @param domain ドメイン
   * @returns タスク、またはなければnull
   */
  dequeueByDomain(domain: string): QueueTask<T> | null {
    const priorities: TaskPriority[] = ['high', 'normal', 'low'];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (!queue) continue;

      const index = queue.findIndex((task) => task.domain === domain);
      if (index !== -1) {
        const task = queue.splice(index, 1)[0];
        if (task) {
          this.taskMap.delete(task.id);
          this.totalWeight -= this.config.priorityWeights[priority];
          return task;
        }
      }
    }

    return null;
  }

  /**
   * 複数のタスクを取得
   *
   * @param count 取得数
   * @returns タスク配列
   */
  dequeueMany(count: number): QueueTask<T>[] {
    const tasks: QueueTask<T>[] = [];
    for (let i = 0; i < count; i++) {
      const task = this.dequeue();
      if (!task) break;
      tasks.push(task);
    }
    return tasks;
  }

  /**
   * タスクをキューから削除
   *
   * @param taskId タスクID
   * @returns 削除成功かどうか
   */
  remove(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) {
      return false;
    }

    const queue = this.queues.get(task.priority);
    if (!queue) {
      return false;
    }

    const index = queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.taskMap.delete(taskId);
      this.totalWeight -= this.config.priorityWeights[task.priority];
      return true;
    }

    return false;
  }

  /**
   * タスクの優先度を変更
   *
   * @param taskId タスクID
   * @param newPriority 新しい優先度
   * @returns 変更成功かどうか
   */
  changePriority(taskId: string, newPriority: TaskPriority): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) {
      return false;
    }

    if (task.priority === newPriority) {
      return true; // 変更なし
    }

    // 古いキューから削除
    const oldQueue = this.queues.get(task.priority);
    if (oldQueue) {
      const index = oldQueue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        oldQueue.splice(index, 1);
        this.totalWeight -= this.config.priorityWeights[task.priority];
      }
    }

    // 新しいキューに追加
    task.priority = newPriority;
    const newQueue = this.queues.get(newPriority);
    if (newQueue) {
      newQueue.push(task);
      this.totalWeight += this.config.priorityWeights[newPriority];
    }

    return true;
  }

  /**
   * タスクを先頭に挿入（リトライ用）
   *
   * @param task タスク
   * @returns 挿入成功かどうか
   */
  prepend(task: QueueTask<T>): boolean {
    // 既存タスクを削除（リトライの場合）
    this.remove(task.id);

    const queue = this.queues.get(task.priority);
    if (!queue) {
      return false;
    }

    queue.unshift(task);
    this.taskMap.set(task.id, task);
    this.totalWeight += this.config.priorityWeights[task.priority];

    return true;
  }

  /**
   * タスクが存在するか確認
   */
  has(taskId: string): boolean {
    return this.taskMap.has(taskId);
  }

  /**
   * タスクを取得（削除なし）
   */
  peek(taskId: string): QueueTask<T> | null {
    return this.taskMap.get(taskId) ?? null;
  }

  /**
   * 次のタスクを取得（削除なし）
   */
  peekNext(): QueueTask<T> | null {
    const priorities: TaskPriority[] = ['high', 'normal', 'low'];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0 && queue[0]) {
        return queue[0];
      }
    }

    return null;
  }

  /**
   * キューが空か
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * キューのサイズ
   */
  get size(): number {
    return this.taskMap.size;
  }

  /**
   * 優先度別のサイズ
   */
  getSizeByPriority(): Record<TaskPriority, number> {
    return {
      high: this.queues.get('high')?.length ?? 0,
      normal: this.queues.get('normal')?.length ?? 0,
      low: this.queues.get('low')?.length ?? 0,
    };
  }

  /**
   * ドメイン別のサイズ
   */
  getSizeByDomain(): Map<string, number> {
    const sizes = new Map<string, number>();
    for (const task of this.taskMap.values()) {
      sizes.set(task.domain, (sizes.get(task.domain) ?? 0) + 1);
    }
    return sizes;
  }

  /**
   * すべてのタスクを取得（削除なし）
   */
  getAll(): QueueTask<T>[] {
    return Array.from(this.taskMap.values());
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queues.set('high', []);
    this.queues.set('normal', []);
    this.queues.set('low', []);
    this.taskMap.clear();
    this.totalWeight = 0;
  }

  /**
   * 古いタスクを削除
   *
   * @param maxAgeMs 最大経過時間（ミリ秒）
   * @returns 削除されたタスク数
   */
  cleanupOld(maxAgeMs: number): number {
    const now = Date.now();
    let removed = 0;

    for (const [taskId, task] of this.taskMap) {
      if (now - task.createdAt > maxAgeMs) {
        if (this.remove(taskId)) {
          removed++;
        }
      }
    }

    return removed;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    size: number;
    maxSize: number;
    byPriority: Record<TaskPriority, number>;
    domainCount: number;
    oldestTaskAge: number;
    averageWeight: number;
  } {
    const sizes = this.getSizeByPriority();
    let oldestAge = 0;

    if (this.taskMap.size > 0) {
      const now = Date.now();
      let oldest = now;
      for (const task of this.taskMap.values()) {
        if (task.createdAt < oldest) {
          oldest = task.createdAt;
        }
      }
      oldestAge = now - oldest;
    }

    return {
      size: this.size,
      maxSize: this.config.maxSize,
      byPriority: sizes,
      domainCount: this.getSizeByDomain().size,
      oldestTaskAge: oldestAge,
      averageWeight: this.size > 0 ? this.totalWeight / this.size : 0,
    };
  }

  /**
   * 最低優先度のタスクを削除
   */
  private evictLowestPriority(): boolean {
    const priorities: TaskPriority[] = ['low', 'normal', 'high'];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        // 最も古いタスクを削除
        let oldestIndex = 0;
        let oldestTime = queue[0]?.createdAt ?? Infinity;

        for (let i = 1; i < queue.length; i++) {
          const task = queue[i];
          if (task && task.createdAt < oldestTime) {
            oldestTime = task.createdAt;
            oldestIndex = i;
          }
        }

        const task = queue.splice(oldestIndex, 1)[0];
        if (task) {
          this.taskMap.delete(task.id);
          this.totalWeight -= this.config.priorityWeights[priority];
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * ConcurrencyQueueインスタンスを作成するファクトリ関数
 */
export function createConcurrencyQueue<T>(config?: Partial<ConcurrencyQueueConfig>): ConcurrencyQueue<T> {
  return new ConcurrencyQueue<T>(config);
}
