/**
 * Semaphore - 同時実行数制御
 *
 * @requirement REQ-DR-S-002 並列処理の動的制御
 * @task TASK-043
 */

import {
  SemaphoreConfig,
  SemaphoreConfigSchema,
  DEFAULT_SEMAPHORE_CONFIG,
} from './types.js';

/**
 * セマフォ取得エラー
 */
export class SemaphoreAcquisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemaphoreAcquisitionError';
  }
}

/**
 * セマフォの状態を表す型
 */
export interface SemaphoreState {
  maxConcurrency: number;
  available: number;
  waiting: number;
  totalAcquired: number;
  totalReleased: number;
}

/**
 * 待機中のリクエスト
 */
interface WaitingRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * セマフォ - 同時実行数を制限
 *
 * @example
 * ```typescript
 * const semaphore = new Semaphore({ maxConcurrency: 5 });
 *
 * // 実行権を獲得
 * const release = await semaphore.acquire();
 * try {
 *   await doSomething();
 * } finally {
 *   release();
 * }
 *
 * // または withSemaphore を使用
 * const result = await semaphore.withSemaphore(async () => {
 *   return await doSomething();
 * });
 * ```
 */
export class Semaphore {
  private readonly config: SemaphoreConfig;
  private currentCount: number = 0;
  private readonly waitQueue: WaitingRequest[] = [];
  private _maxConcurrency: number;
  private _totalAcquired: number = 0;
  private _totalReleased: number = 0;

  constructor(config: Partial<SemaphoreConfig> = {}) {
    this.config = SemaphoreConfigSchema.parse({
      ...DEFAULT_SEMAPHORE_CONFIG,
      ...config,
    });
    this._maxConcurrency = this.config.maxConcurrency;
  }

  /**
   * 現在の同時実行数
   */
  get current(): number {
    return this.currentCount;
  }

  /**
   * 最大同時実行数
   */
  get maxConcurrency(): number {
    return this._maxConcurrency;
  }

  /**
   * 最大同時実行数を変更
   */
  set maxConcurrency(value: number) {
    if (value < 1) {
      throw new Error('maxConcurrency must be >= 1');
    }
    const previous = this._maxConcurrency;
    this._maxConcurrency = value;

    // 枠が増えた場合、待機中のリクエストを処理
    if (value > previous) {
      this.processWaitQueue();
    }
  }

  /**
   * 待機中のリクエスト数
   */
  get waiting(): number {
    return this.waitQueue.length;
  }

  /**
   * 空きがあるか
   */
  get isAvailable(): boolean {
    return this.currentCount < this._maxConcurrency;
  }

  /**
   * 実行権を獲得
   *
   * @returns リリース関数
   * @throws タイムアウト時
   */
  async acquire(): Promise<() => void> {
    // 空きがある場合は即時取得
    if (this.currentCount < this._maxConcurrency) {
      this.currentCount++;
      this._totalAcquired++;
      return this.createReleaseFunction();
    }

    // 待機
    return new Promise<() => void>((resolve, reject) => {
      const request: WaitingRequest = {
        resolve: () => {
          this.currentCount++;
          this._totalAcquired++;
          resolve(this.createReleaseFunction());
        },
        reject,
        timestamp: Date.now(),
      };

      // FIFOモード
      if (this.config.fair) {
        this.waitQueue.push(request);
      } else {
        // 非公平モード（新しいリクエストを優先）
        this.waitQueue.unshift(request);
      }

      // タイムアウト設定
      if (this.config.acquireTimeoutMs > 0) {
        setTimeout(() => {
          const index = this.waitQueue.indexOf(request);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            reject(new SemaphoreAcquisitionError(`Semaphore acquire timeout after ${this.config.acquireTimeoutMs}ms`));
          }
        }, this.config.acquireTimeoutMs);
      }
    });
  }

  /**
   * 即時取得を試行（待機なし）
   *
   * @returns 取得成功時はtrue、失敗時はfalse
   */
  tryAcquire(): boolean {
    if (this.currentCount < this._maxConcurrency) {
      this.currentCount++;
      this._totalAcquired++;
      return true;
    }
    return false;
  }

  /**
   * セマフォ保護下で関数を実行
   *
   * @param fn 実行する関数
   * @returns 関数の戻り値
   */
  async withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * 複数のセマフォ保護下で関数を実行
   *
   * @param count 取得する枠数
   * @param fn 実行する関数
   * @returns 関数の戻り値
   */
  async withMultiple<T>(count: number, fn: () => Promise<T>): Promise<T> {
    if (count < 1) {
      throw new Error('count must be >= 1');
    }
    if (count > this._maxConcurrency) {
      throw new Error(`count (${count}) exceeds maxConcurrency (${this._maxConcurrency})`);
    }

    const releases: (() => void)[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const release = await this.acquire();
        releases.push(release);
      }
      return await fn();
    } finally {
      for (const release of releases) {
        release();
      }
    }
  }

  /**
   * すべての実行権を獲得する（全ての権利をロック）
   * テスト用やシャットダウン時に使用
   */
  async drain(): Promise<void> {
    // すべての権利を獲得
    while (this.currentCount < this._maxConcurrency) {
      this.currentCount++;
    }
  }

  /**
   * 待機中のリクエストをすべてキャンセル
   */
  cancelWaiting(): number {
    const count = this.waitQueue.length;
    while (this.waitQueue.length > 0) {
      const request = this.waitQueue.shift();
      request?.reject(new Error('Semaphore waiting cancelled'));
    }
    return count;
  }

  /**
   * リセット（すべての状態をクリア）
   */
  reset(): void {
    this.cancelWaiting();
    this.currentCount = 0;
    this._maxConcurrency = this.config.maxConcurrency;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    current: number;
    maxConcurrency: number;
    waiting: number;
    utilization: number;
  } {
    return {
      current: this.currentCount,
      maxConcurrency: this._maxConcurrency,
      waiting: this.waitQueue.length,
      utilization: this._maxConcurrency > 0 ? this.currentCount / this._maxConcurrency : 0,
    };
  }

  /**
   * セマフォの状態を取得
   */
  getState(): SemaphoreState {
    return {
      maxConcurrency: this._maxConcurrency,
      available: this._maxConcurrency - this.currentCount,
      waiting: this.waitQueue.length,
      totalAcquired: this._totalAcquired,
      totalReleased: this._totalReleased,
    };
  }

  /**
   * 最大同時実行数を変更
   * @param newMax 新しい最大値
   */
  resize(newMax: number): void {
    if (newMax < 1) {
      throw new Error('maxConcurrency must be >= 1');
    }
    // 現在使用中の数より小さくはできない（使用中の数が最小値）
    const effectiveMax = Math.max(newMax, this.currentCount);
    const previous = this._maxConcurrency;
    this._maxConcurrency = effectiveMax;

    // 枠が増えた場合、待機中のリクエストを処理
    if (effectiveMax > previous) {
      this.processWaitQueue();
    }
  }

  /**
   * リリース関数を生成
   */
  private createReleaseFunction(): () => void {
    let released = false;
    return () => {
      if (released) {
        return; // 二重リリースを防止
      }
      released = true;
      this.release();
    };
  }

  /**
   * 実行権をリリース
   */
  release(): void {
    if (this.currentCount > 0) {
      this.currentCount--;
      this._totalReleased++;
      this.processWaitQueue();
    }
  }

  /**
   * 待機キューを処理
   */
  private processWaitQueue(): void {
    while (this.waitQueue.length > 0 && this.currentCount < this._maxConcurrency) {
      const request = this.waitQueue.shift();
      if (request) {
        request.resolve();
      }
    }
  }
}

/**
 * Semaphoreインスタンスを作成するファクトリ関数
 */
export function createSemaphore(config?: Partial<SemaphoreConfig>): Semaphore {
  return new Semaphore(config);
}

