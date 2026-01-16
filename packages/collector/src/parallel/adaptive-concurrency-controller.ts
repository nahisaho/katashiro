/**
 * AdaptiveConcurrencyController - 適応的並列度制御
 *
 * @requirement REQ-DR-S-002 並列処理の動的制御
 * @task TASK-048
 */

import {
  AdaptiveConcurrencyConfig,
  AdaptiveConcurrencyConfigSchema,
  DEFAULT_ADAPTIVE_CONCURRENCY_CONFIG,
  ParallelEvent,
  ParallelEventListener,
} from './types.js';
import { ResourceMonitor } from './resource-monitor.js';

/**
 * タスク実行結果
 */
interface TaskExecution {
  success: boolean;
  durationMs: number;
  timestamp: number;
}

/**
 * 適応的並列度コントローラー
 *
 * @example
 * ```typescript
 * const controller = new AdaptiveConcurrencyController({
 *   initialConcurrency: 5,
 *   minConcurrency: 1,
 *   maxConcurrency: 20,
 * });
 *
 * // 監視開始
 * controller.start();
 *
 * // タスク完了を報告
 * controller.recordSuccess(100); // 100ms で成功
 * controller.recordFailure(500); // 500ms で失敗
 *
 * // 現在の推奨並列度を取得
 * const concurrency = controller.getCurrentConcurrency();
 *
 * // 監視停止
 * controller.stop();
 * ```
 */
export class AdaptiveConcurrencyController {
  private readonly config: AdaptiveConcurrencyConfig;
  private readonly resourceMonitor: ResourceMonitor;
  private readonly listeners: Set<ParallelEventListener> = new Set();
  private readonly executions: TaskExecution[] = [];
  private currentConcurrency: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ownsResourceMonitor: boolean = false;

  constructor(
    config: Partial<AdaptiveConcurrencyConfig> = {},
    resourceMonitor?: ResourceMonitor
  ) {
    this.config = AdaptiveConcurrencyConfigSchema.parse({
      ...DEFAULT_ADAPTIVE_CONCURRENCY_CONFIG,
      ...config,
    });

    this.currentConcurrency = this.config.initialConcurrency;

    if (resourceMonitor) {
      this.resourceMonitor = resourceMonitor;
    } else {
      this.resourceMonitor = new ResourceMonitor();
      this.ownsResourceMonitor = true;
    }
  }

  /**
   * 制御を開始
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    // リソースモニターを開始（自己所有の場合）
    if (this.ownsResourceMonitor && !this.resourceMonitor.isRunning) {
      this.resourceMonitor.start();
    }


    this.intervalId = setInterval(() => {
      this.adjust();
    }, this.config.adjustmentIntervalMs);
  }

  /**
   * 制御を停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // リソースモニターを停止（自己所有の場合）
    if (this.ownsResourceMonitor) {
      this.resourceMonitor.stop();
    }
  }

  /**
   * 制御中かどうか
   */
  get isRunning(): boolean {
    return this.intervalId !== null;
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
   * 現在の並列度を取得
   */
  getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * 並列度を手動設定
   */
  setConcurrency(concurrency: number): void {
    const previous = this.currentConcurrency;
    this.currentConcurrency = Math.max(
      this.config.minConcurrency,
      Math.min(this.config.maxConcurrency, concurrency)
    );

    if (previous !== this.currentConcurrency) {
      this.emit({
        type: 'concurrencyChange',
        previous,
        current: this.currentConcurrency,
        reason: 'manual',
      });
    }
  }

  /**
   * 成功を記録
   */
  recordSuccess(durationMs: number): void {
    this.executions.push({
      success: true,
      durationMs,
      timestamp: Date.now(),
    });
    this.cleanupOldExecutions();
  }

  /**
   * 失敗を記録
   */
  recordFailure(durationMs: number): void {
    this.executions.push({
      success: false,
      durationMs,
      timestamp: Date.now(),
    });
    this.cleanupOldExecutions();
  }

  /**
   * 成功率を取得
   */
  getSuccessRate(): number {
    if (this.executions.length === 0) {
      return 100;
    }

    const successCount = this.executions.filter((e) => e.success).length;
    return (successCount / this.executions.length) * 100;
  }

  /**
   * エラー率を取得
   */
  getErrorRate(): number {
    return 100 - this.getSuccessRate();
  }

  /**
   * 平均実行時間を取得
   */
  getAverageDuration(): number {
    if (this.executions.length === 0) {
      return 0;
    }

    const total = this.executions.reduce((sum, e) => sum + e.durationMs, 0);
    return total / this.executions.length;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    currentConcurrency: number;
    minConcurrency: number;
    maxConcurrency: number;
    successRate: number;
    errorRate: number;
    averageDurationMs: number;
    executionCount: number;
    resourceUsage: {
      cpuPercent: number;
      memoryPercent: number;
    };
  } {
    const usage = this.resourceMonitor.getCurrentUsage();

    return {
      currentConcurrency: this.currentConcurrency,
      minConcurrency: this.config.minConcurrency,
      maxConcurrency: this.config.maxConcurrency,
      successRate: this.getSuccessRate(),
      errorRate: this.getErrorRate(),
      averageDurationMs: this.getAverageDuration(),
      executionCount: this.executions.length,
      resourceUsage: {
        cpuPercent: usage.cpuPercent,
        memoryPercent: usage.memoryPercent,
      },
    };
  }

  /**
   * 実行履歴をクリア
   */
  clearHistory(): void {
    this.executions.length = 0;
  }

  /**
   * リセット
   */
  reset(): void {
    this.stop();
    this.clearHistory();
    this.currentConcurrency = this.config.initialConcurrency;
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
   * 並列度を調整
   */
  private adjust(): void {
    
    const previous = this.currentConcurrency;

    // リソース使用状況を確認
    const usage = this.resourceMonitor.getCurrentUsage();
    const cpuOverLimit = usage.cpuPercent > this.config.cpuLimit;
    const memoryOverLimit = usage.memoryPercent > this.config.memoryLimit;

    if (cpuOverLimit || memoryOverLimit) {
      // リソース制限超過 - 減少
      this.currentConcurrency = Math.max(
        this.config.minConcurrency,
        Math.floor(this.currentConcurrency * 0.7)
      );

      if (previous !== this.currentConcurrency) {
        this.emit({
          type: 'concurrencyChange',
          previous,
          current: this.currentConcurrency,
          reason: cpuOverLimit ? 'cpu_limit' : 'memory_limit',
        });
      }
      return;
    }

    // 実行履歴に基づく調整
    const successRate = this.getSuccessRate();
    const errorRate = this.getErrorRate();

    if (errorRate > this.config.scaleDownThreshold) {
      // エラー率が高い - 減少
      this.currentConcurrency = Math.max(
        this.config.minConcurrency,
        this.currentConcurrency - 1
      );

      if (previous !== this.currentConcurrency) {
        this.emit({
          type: 'concurrencyChange',
          previous,
          current: this.currentConcurrency,
          reason: 'high_error_rate',
        });
      }
    } else if (successRate >= this.config.scaleUpThreshold) {
      // 成功率が高い - 増加
      const resourceRecommendation = this.resourceMonitor.getRecommendedConcurrency(
        this.currentConcurrency,
        this.config.minConcurrency,
        this.config.maxConcurrency
      );

      // リソースモニターの推奨値と、単純な+1増加の小さい方を採用
      const newConcurrency = Math.min(
        resourceRecommendation,
        this.currentConcurrency + 1
      );

      this.currentConcurrency = Math.min(this.config.maxConcurrency, newConcurrency);

      if (previous !== this.currentConcurrency) {
        this.emit({
          type: 'concurrencyChange',
          previous,
          current: this.currentConcurrency,
          reason: 'high_success_rate',
        });
      }
    }

  }

  /**
   * 古い実行履歴を削除
   */
  private cleanupOldExecutions(): void {
    const now = Date.now();
    
    const windowMs = this.config.adjustmentIntervalMs * 10; // 10回分の調整間隔

    while (this.executions.length > 0 && 
           this.executions[0] && 
           now - this.executions[0].timestamp > windowMs) {
      this.executions.shift();
    }

    // 最大100件に制限
    while (this.executions.length > 100) {
      this.executions.shift();
    }
  }
}

/**
 * AdaptiveConcurrencyControllerインスタンスを作成するファクトリ関数
 */
export function createAdaptiveConcurrencyController(config?: Partial<AdaptiveConcurrencyConfig>): AdaptiveConcurrencyController {
  return new AdaptiveConcurrencyController(config);
}
