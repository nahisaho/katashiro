/**
 * ParallelExecutor - 並列実行エンジン
 *
 * @requirement REQ-DR-S-002 並列処理の動的制御
 * @requirement REQ-DR-W-004 ドメイン別レート制限
 * @task TASK-049
 */

import { randomUUID } from 'crypto';
import {
  ParallelExecutorConfig,
  ParallelExecutorConfigSchema,
  DEFAULT_PARALLEL_EXECUTOR_CONFIG,
  QueueTask,
  TaskPriority,
  TaskResult,
  BatchResult,
  ParallelEvent,
  ParallelEventListener,
} from './types.js';
import { Semaphore } from './semaphore.js';
import { DomainRateLimiter } from './domain-rate-limiter.js';
import { ConcurrencyQueue } from './concurrency-queue.js';
import { ResourceMonitor } from './resource-monitor.js';
import { AdaptiveConcurrencyController } from './adaptive-concurrency-controller.js';

/**
 * タスク入力
 */
export interface TaskInput<T> {
  /** タスクID（省略時は自動生成） */
  id?: string;
  /** URL */
  url: string;
  /** 優先度 */
  priority?: TaskPriority;
  /** 実行関数 */
  execute: () => Promise<T>;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * 並列実行エンジン
 *
 * @example
 * ```typescript
 * const executor = new ParallelExecutor();
 *
 * // 単一タスク実行
 * const result = await executor.execute({
 *   url: 'https://example.com/page',
 *   execute: async () => fetch('https://example.com/page'),
 * });
 *
 * // バッチ実行
 * const results = await executor.executeBatch([
 *   { url: 'https://example.com/page1', execute: async () => fetch(url1) },
 *   { url: 'https://example.com/page2', execute: async () => fetch(url2) },
 * ]);
 *
 * // AsyncGenerator形式
 * for await (const result of executor.executeStream(tasks)) {
 *   console.log(result);
 * }
 * ```
 */
export class ParallelExecutor<T = unknown> {
  private readonly config: ParallelExecutorConfig;
  private readonly semaphore: Semaphore;
  private readonly rateLimiter: DomainRateLimiter;
  private readonly queue: ConcurrencyQueue<T>;
  private readonly resourceMonitor: ResourceMonitor;
  private readonly adaptiveController: AdaptiveConcurrencyController;
  private readonly listeners: Set<ParallelEventListener> = new Set();
  private isRunning: boolean = false;
  private processingCount: number = 0;

  constructor(config: Partial<ParallelExecutorConfig> = {}) {
    this.config = ParallelExecutorConfigSchema.parse({
      ...DEFAULT_PARALLEL_EXECUTOR_CONFIG,
      ...config,
    });

    this.semaphore = new Semaphore(this.config.semaphore);
    this.rateLimiter = new DomainRateLimiter(this.config.rateLimiter);
    this.queue = new ConcurrencyQueue<T>(this.config.queue);
    this.resourceMonitor = new ResourceMonitor(this.config.resourceMonitor);
    this.adaptiveController = new AdaptiveConcurrencyController(
      this.config.adaptive,
      this.resourceMonitor
    );

    // イベント転送
    this.rateLimiter.on((event) => this.emit(event));
    this.resourceMonitor.on((event) => this.emit(event));
    this.adaptiveController.on((event) => this.emit(event));
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
   * 実行を開始（適応的制御有効時）
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    if (this.config.enableAdaptive) {
      this.adaptiveController.start();
    }
  }

  /**
   * 実行を停止
   */
  stop(): void {
    this.isRunning = false;
    this.adaptiveController.stop();
  }

  /**
   * 単一タスクを実行
   *
   * @param input タスク入力
   * @returns タスク結果
   */
  async execute(input: TaskInput<T>): Promise<TaskResult<T>> {
    this.ensureStarted();

    const taskId = input.id ?? randomUUID();
    const url = input.url;
    const startTime = Date.now();
    let retries = 0;

    this.emit({ type: 'taskStart', taskId, url });

    const executeWithRetry = async (): Promise<TaskResult<T>> => {
      try {
        // セマフォとレートリミッターの保護下で実行
        const result = await this.semaphore.withSemaphore(async () => {
          return await this.rateLimiter.withLimit(url, async () => {
            return await input.execute();
          });
        });

        const durationMs = Date.now() - startTime;
        this.adaptiveController.recordSuccess(durationMs);
        this.emit({ type: 'taskComplete', taskId, url, durationMs });

        return {
          taskId,
          url,
          success: true,
          result,
          durationMs,
          retries,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        this.adaptiveController.recordFailure(durationMs);

        if (this.config.enableRetry && retries < this.config.maxRetries) {
          retries++;
          // 指数バックオフ
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 30000);
          await this.delay(delay);
          return executeWithRetry();
        }

        this.emit({
          type: 'taskError',
          taskId,
          url,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          taskId,
          url,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          durationMs,
          retries,
        };
      }
    };

    return executeWithRetry();
  }

  /**
   * バッチ実行
   *
   * @param inputs タスク入力配列
   * @returns バッチ結果
   */
  async executeBatch(inputs: TaskInput<T>[]): Promise<BatchResult<T>> {
    this.ensureStarted();

    const startTime = Date.now();
    const results: TaskResult<T>[] = [];

    // 並列実行
    const promises = inputs.map((input) => this.execute(input));
    const settledResults = await Promise.allSettled(promises);

    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Promise.allSettledなので通常ここには来ない
        results.push({
          taskId: 'unknown',
          url: 'unknown',
          success: false,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          durationMs: 0,
          retries: 0,
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const succeeded = results.filter((r) => r.success).length;

    return {
      total: inputs.length,
      succeeded,
      failed: inputs.length - succeeded,
      results,
      totalDurationMs,
      averageDurationMs: inputs.length > 0 ? totalDurationMs / inputs.length : 0,
    };
  }

  /**
   * ストリーミング実行（AsyncGenerator）
   *
   * @param inputs タスク入力配列
   * @yields タスク結果
   */
  async *executeStream(inputs: TaskInput<T>[]): AsyncGenerator<TaskResult<T>> {
    this.ensureStarted();

    // タスクをキューに追加
    for (const input of inputs) {
      const domain = this.extractDomain(input.url);
      const task: QueueTask<T> = {
        id: input.id ?? randomUUID(),
        priority: input.priority ?? 'normal',
        domain,
        url: input.url,
        execute: input.execute,
        createdAt: Date.now(),
        metadata: input.metadata,
      };
      this.queue.enqueue(task);
    }

    // 並列処理
    const running: Promise<TaskResult<T>>[] = [];
    const maxConcurrent = this.getEffectiveConcurrency();

    while (!this.queue.isEmpty || running.length > 0) {
      // キューからタスクを取得して実行
      while (running.length < maxConcurrent && !this.queue.isEmpty) {
        const task = this.queue.dequeue();
        if (task) {
          const promise = this.executeTask(task);
          running.push(promise);
        }
      }

      if (running.length === 0) {
        break;
      }

      // 最初に完了したタスクを取得
      const completed = await Promise.race(running.map((p, i) => p.then((result) => ({ result, index: i }))));
      running.splice(completed.index, 1);
      yield completed.result;
    }
  }

  /**
   * キューにタスクを追加
   */
  enqueue(input: TaskInput<T>): string {
    const domain = this.extractDomain(input.url);
    const task: QueueTask<T> = {
      id: input.id ?? randomUUID(),
      priority: input.priority ?? 'normal',
      domain,
      url: input.url,
      execute: input.execute,
      createdAt: Date.now(),
      metadata: input.metadata,
    };
    this.queue.enqueue(task);
    return task.id;
  }

  /**
   * キューからタスクを削除
   */
  dequeue(taskId: string): boolean {
    return this.queue.remove(taskId);
  }

  /**
   * キュー処理を開始
   *
   * @yields タスク結果
   */
  async *processQueue(): AsyncGenerator<TaskResult<T>> {
    this.ensureStarted();

    const running: Promise<TaskResult<T>>[] = [];

    while (!this.queue.isEmpty || running.length > 0) {
      const maxConcurrent = this.getEffectiveConcurrency();

      // キューからタスクを取得して実行
      while (running.length < maxConcurrent && !this.queue.isEmpty) {
        const task = this.queue.dequeue();
        if (task) {
          const promise = this.executeTask(task);
          running.push(promise);
        }
      }

      if (running.length === 0) {
        break;
      }

      // 最初に完了したタスクを取得
      const completed = await Promise.race(running.map((p, i) => p.then((result) => ({ result, index: i }))));
      running.splice(completed.index, 1);
      yield completed.result;
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    isRunning: boolean;
    processingCount: number;
    queueSize: number;
    semaphore: ReturnType<Semaphore['getStats']>;
    rateLimiter: ReturnType<DomainRateLimiter['getAllStats']>;
    adaptive: ReturnType<AdaptiveConcurrencyController['getStats']>;
    resource: ReturnType<ResourceMonitor['getStats']>;
  } {
    return {
      isRunning: this.isRunning,
      processingCount: this.processingCount,
      queueSize: this.queue.size,
      semaphore: this.semaphore.getStats(),
      rateLimiter: this.rateLimiter.getAllStats(),
      adaptive: this.adaptiveController.getStats(),
      resource: this.resourceMonitor.getStats(),
    };
  }

  /**
   * リセット
   */
  reset(): void {
    this.stop();
    this.queue.clear();
    this.rateLimiter.reset();
    this.semaphore.reset();
    this.adaptiveController.reset();
    this.resourceMonitor.clearHistory();
    this.processingCount = 0;
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
   * タスクを実行
   */
  private async executeTask(task: QueueTask<T>): Promise<TaskResult<T>> {
    return this.execute({
      id: task.id,
      url: task.url,
      priority: task.priority,
      execute: task.execute,
      metadata: task.metadata,
    });
  }

  /**
   * 有効な並列度を取得
   */
  private getEffectiveConcurrency(): number {
    if (this.config.enableAdaptive) {
      return this.adaptiveController.getCurrentConcurrency();
    }
    return this.config.semaphore.maxConcurrency ?? 5;
  }

  /**
   * 開始状態を確認
   */
  private ensureStarted(): void {
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * ParallelExecutorインスタンスを作成するファクトリ関数
 */
export function createParallelExecutor(config?: Partial<ParallelExecutorConfig>): ParallelExecutor {
  return new ParallelExecutor(config);
}
