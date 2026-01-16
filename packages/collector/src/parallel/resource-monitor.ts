/**
 * ResourceMonitor - システムリソース監視
 *
 * @task TASK-047
 */

import * as os from 'os';
import * as v8 from 'v8';
import {
  ResourceUsage,
  ResourceMonitorConfig,
  ResourceMonitorConfigSchema,
  DEFAULT_RESOURCE_MONITOR_CONFIG,
  ParallelEvent,
  ParallelEventListener,
} from './types.js';

/**
 * システムリソースモニター
 *
 * @example
 * ```typescript
 * const monitor = new ResourceMonitor();
 *
 * // 監視開始
 * monitor.start();
 *
 * // 現在のリソース使用状況を取得
 * const usage = monitor.getCurrentUsage();
 * console.log(`CPU: ${usage.cpuPercent}%, Memory: ${usage.memoryPercent}%`);
 *
 * // 警告イベントをリッスン
 * monitor.on((event) => {
 *   if (event.type === 'resourceWarning') {
 *     console.log(`Warning: ${event.resource} at ${event.usage}%`);
 *   }
 * });
 *
 * // 監視停止
 * monitor.stop();
 * ```
 */
export class ResourceMonitor {
  private readonly config: ResourceMonitorConfig;
  private readonly history: ResourceUsage[] = [];
  private readonly listeners: Set<ParallelEventListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastCpuInfo: { idle: number; total: number } | null = null;
  private eventLoopStart: [number, number] | null = null;

  constructor(config: Partial<ResourceMonitorConfig> = {}) {
    this.config = ResourceMonitorConfigSchema.parse({
      ...DEFAULT_RESOURCE_MONITOR_CONFIG,
      ...config,
    });
  }

  /**
   * 監視を開始
   */
  start(): void {
    if (this.intervalId) {
      return; // 既に開始済み
    }

    // 初期CPU情報を取得
    this.lastCpuInfo = this.getCpuInfo();

    this.intervalId = setInterval(() => {
      this.sample();
    }, this.config.intervalMs);
  }

  /**
   * 監視を停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.eventLoopStart = null;
  }

  /**
   * 監視中かどうか
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
   * 現在のリソース使用状況を取得
   */
  getCurrentUsage(): ResourceUsage {
    return this.measureUsage();
  }

  /**
   * 履歴を取得
   */
  getHistory(): ResourceUsage[] {
    return [...this.history];
  }

  /**
   * 平均使用率を取得
   */
  getAverageUsage(): {
    cpuPercent: number;
    memoryPercent: number;
    eventLoopDelayMs: number;
  } {
    if (this.history.length === 0) {
      const current = this.getCurrentUsage();
      return {
        cpuPercent: current.cpuPercent,
        memoryPercent: current.memoryPercent,
        eventLoopDelayMs: current.eventLoopDelayMs,
      };
    }

    let totalCpu = 0;
    let totalMemory = 0;
    let totalDelay = 0;

    for (const usage of this.history) {
      totalCpu += usage.cpuPercent;
      totalMemory += usage.memoryPercent;
      totalDelay += usage.eventLoopDelayMs;
    }

    return {
      cpuPercent: totalCpu / this.history.length,
      memoryPercent: totalMemory / this.history.length,
      eventLoopDelayMs: totalDelay / this.history.length,
    };
  }

  /**
   * リソースが閾値を超えているか
   */
  isOverThreshold(): boolean {
    const usage = this.getCurrentUsage();
    return (
      usage.cpuPercent > this.config.cpuWarningThreshold ||
      usage.memoryPercent > this.config.memoryWarningThreshold
    );
  }

  /**
   * 推奨並列度を計算
   *
   * @param currentConcurrency 現在の並列度
   * @param minConcurrency 最小並列度
   * @param maxConcurrency 最大並列度
   * @returns 推奨並列度
   */
  getRecommendedConcurrency(
    currentConcurrency: number,
    minConcurrency: number,
    maxConcurrency: number
  ): number {
    const usage = this.getCurrentUsage();
    const cpuMargin = this.config.cpuWarningThreshold - usage.cpuPercent;
    const memoryMargin = this.config.memoryWarningThreshold - usage.memoryPercent;
    const minMargin = Math.min(cpuMargin, memoryMargin);

    if (minMargin < 0) {
      // 閾値超過 - 減少
      const reduction = Math.ceil(currentConcurrency * Math.abs(minMargin) / 100);
      return Math.max(minConcurrency, currentConcurrency - reduction);
    } else if (minMargin > 20) {
      // 余裕あり - 増加
      const increase = Math.ceil(currentConcurrency * (minMargin / 100) * 0.5);
      return Math.min(maxConcurrency, currentConcurrency + increase);
    }

    return currentConcurrency;
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    isRunning: boolean;
    historySize: number;
    current: ResourceUsage;
    average: {
      cpuPercent: number;
      memoryPercent: number;
      eventLoopDelayMs: number;
    };
    peak: {
      cpuPercent: number;
      memoryPercent: number;
      eventLoopDelayMs: number;
    };
  } {
    const current = this.getCurrentUsage();
    const average = this.getAverageUsage();

    let peakCpu = current.cpuPercent;
    let peakMemory = current.memoryPercent;
    let peakDelay = current.eventLoopDelayMs;

    for (const usage of this.history) {
      peakCpu = Math.max(peakCpu, usage.cpuPercent);
      peakMemory = Math.max(peakMemory, usage.memoryPercent);
      peakDelay = Math.max(peakDelay, usage.eventLoopDelayMs);
    }

    return {
      isRunning: this.isRunning,
      historySize: this.history.length,
      current,
      average,
      peak: {
        cpuPercent: peakCpu,
        memoryPercent: peakMemory,
        eventLoopDelayMs: peakDelay,
      },
    };
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
   * サンプリング実行
   */
  private sample(): void {
    const usage = this.measureUsage();

    // 履歴に追加
    this.history.push(usage);

    // 履歴サイズ制限
    while (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // 警告チェック
    if (usage.cpuPercent > this.config.cpuWarningThreshold) {
      this.emit({
        type: 'resourceWarning',
        resource: 'cpu',
        usage: usage.cpuPercent,
      });
    }

    if (usage.memoryPercent > this.config.memoryWarningThreshold) {
      this.emit({
        type: 'resourceWarning',
        resource: 'memory',
        usage: usage.memoryPercent,
      });
    }
  }

  /**
   * リソース使用状況を計測
   */
  private measureUsage(): ResourceUsage {
    // メモリ情報
    const heapStats = v8.getHeapStatistics();
    const memoryUsedBytes = heapStats.used_heap_size;
    const memoryTotalBytes = heapStats.heap_size_limit;
    const memoryPercent = (memoryUsedBytes / memoryTotalBytes) * 100;

    // CPU情報
    const cpuPercent = this.measureCpuPercent();

    // イベントループ遅延
    const eventLoopDelayMs = this.measureEventLoopDelay();

    return {
      cpuPercent,
      memoryPercent,
      memoryUsedBytes,
      memoryTotalBytes,
      eventLoopDelayMs,
      timestamp: Date.now(),
    };
  }

  /**
   * CPU使用率を計測
   */
  private measureCpuPercent(): number {
    const currentCpuInfo = this.getCpuInfo();

    if (!this.lastCpuInfo) {
      this.lastCpuInfo = currentCpuInfo;
      return 0;
    }

    const idleDiff = currentCpuInfo.idle - this.lastCpuInfo.idle;
    const totalDiff = currentCpuInfo.total - this.lastCpuInfo.total;

    this.lastCpuInfo = currentCpuInfo;

    if (totalDiff === 0) {
      return 0;
    }

    return Math.round((1 - idleDiff / totalDiff) * 100);
  }

  /**
   * CPU情報を取得
   */
  private getCpuInfo(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }

    return { idle, total };
  }

  /**
   * イベントループ遅延を計測
   */
  private measureEventLoopDelay(): number {
    if (!this.eventLoopStart) {
      this.eventLoopStart = process.hrtime();
      return 0;
    }

    const diff = process.hrtime(this.eventLoopStart);
    const actualMs = diff[0] * 1000 + diff[1] / 1e6;
    const expectedMs = this.config.intervalMs;

    this.eventLoopStart = process.hrtime();

    // 遅延 = 実際の経過時間 - 期待される経過時間
    return Math.max(0, actualMs - expectedMs);
  }
}

/**
 * ResourceMonitorインスタンスを作成するファクトリ関数
 */
export function createResourceMonitor(config?: Partial<ResourceMonitorConfig>): ResourceMonitor {
  return new ResourceMonitor(config);
}
