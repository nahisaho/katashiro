/**
 * IterationController - イテレーション制御コンポーネント
 *
 * 反復的な深掘り調査のイテレーション制御
 *
 * @requirement REQ-DR-S-002
 * @task TASK-033
 */

import { EventEmitter } from 'events';
import type { IterationResult, ProcessingPhase } from './types.js';
import { getLogger, type StructuredLogger } from '../../logging/index.js';

/**
 * イテレーション設定
 */
export interface IterationConfig {
  /** 最大イテレーション数 */
  maxIterations: number;

  /** 収束閾値（新規情報率がこれ以下で終了） */
  convergenceThreshold: number;

  /** イテレーションタイムアウト（ミリ秒） */
  timeoutMs: number;

  /** 連続失敗で中断するまでの回数 */
  maxConsecutiveFailures: number;
}

/**
 * イテレーション状態
 */
export interface IterationState {
  currentIteration: number;
  results: IterationResult[];
  phase: ProcessingPhase;
  consecutiveFailures: number;
  startedAt: string;
  lastIterationAt?: string;
}

/**
 * イテレーションイベント
 */
export type IterationEventType =
  | 'iterationStart'
  | 'iterationComplete'
  | 'iterationFailed'
  | 'convergenceReached'
  | 'maxIterationsReached'
  | 'timeoutReached'
  | 'aborted';

/**
 * イテレーション判定結果
 */
export interface ShouldContinueResult {
  continue: boolean;
  reason: 'continue' | 'converged' | 'max_iterations' | 'timeout' | 'consecutive_failures' | 'aborted';
}

/**
 * Iteration Controller
 *
 * 反復調査の制御を担当。収束判定、タイムアウト管理、最大イテレーション制限を実装。
 */
export class IterationController extends EventEmitter {
  private config: IterationConfig;
  private state: IterationState;
  private logger: StructuredLogger;
  private aborted: boolean = false;

  constructor(config: Partial<IterationConfig> = {}) {
    super();
    this.config = {
      maxIterations: config.maxIterations ?? 5,
      convergenceThreshold: config.convergenceThreshold ?? 0.1,
      timeoutMs: config.timeoutMs ?? 300000, // 5 minutes per iteration
      maxConsecutiveFailures: config.maxConsecutiveFailures ?? 2,
    };

    this.state = {
      currentIteration: 0,
      results: [],
      phase: 'initializing',
      consecutiveFailures: 0,
      startedAt: new Date().toISOString(),
    };

    this.logger = getLogger('IterationController');
  }

  /**
   * 次のイテレーションを開始
   */
  startIteration(): number {
    this.state.currentIteration++;
    this.state.phase = 'searching';
    this.state.lastIterationAt = new Date().toISOString();

    this.logger.info('Starting iteration', {
      iteration: this.state.currentIteration,
      previousResults: this.state.results.length,
    });

    this.emit('iterationStart', {
      iteration: this.state.currentIteration,
      timestamp: this.state.lastIterationAt,
    });

    return this.state.currentIteration;
  }

  /**
   * イテレーションを完了
   */
  completeIteration(result: Omit<IterationResult, 'iteration'>): IterationResult {
    const fullResult: IterationResult = {
      ...result,
      iteration: this.state.currentIteration,
    };

    this.state.results.push(fullResult);

    // 成功した場合は連続失敗カウンターをリセット
    if (result.urlsSucceeded > 0) {
      this.state.consecutiveFailures = 0;
    } else {
      this.state.consecutiveFailures++;
    }

    this.logger.info('Iteration completed', {
      iteration: this.state.currentIteration,
      urlsProcessed: result.urlsProcessed,
      urlsSucceeded: result.urlsSucceeded,
      newInfoRate: result.newInfoRate,
      durationMs: result.durationMs,
    });

    this.emit('iterationComplete', fullResult);

    return fullResult;
  }

  /**
   * イテレーション失敗を記録
   */
  failIteration(error: Error): void {
    this.state.consecutiveFailures++;

    this.logger.error('Iteration failed', {
      iteration: this.state.currentIteration,
      error: error.message,
      consecutiveFailures: this.state.consecutiveFailures,
    });

    this.emit('iterationFailed', {
      iteration: this.state.currentIteration,
      error: error.message,
      consecutiveFailures: this.state.consecutiveFailures,
    });
  }

  /**
   * 続行すべきかどうかを判定
   */
  shouldContinue(): ShouldContinueResult {
    // 中断済み
    if (this.aborted) {
      this.logger.info('Iteration aborted by user');
      this.emit('aborted', { iteration: this.state.currentIteration });
      return { continue: false, reason: 'aborted' };
    }

    // 最大イテレーション到達
    if (this.state.currentIteration >= this.config.maxIterations) {
      this.logger.info('Max iterations reached', {
        maxIterations: this.config.maxIterations,
      });
      this.emit('maxIterationsReached', {
        maxIterations: this.config.maxIterations,
        totalIterations: this.state.currentIteration,
      });
      return { continue: false, reason: 'max_iterations' };
    }

    // 連続失敗制限
    if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.logger.warn('Too many consecutive failures', {
        consecutiveFailures: this.state.consecutiveFailures,
      });
      return { continue: false, reason: 'consecutive_failures' };
    }

    // 収束判定（少なくとも1回のイテレーションが必要）
    if (this.state.results.length > 0) {
      const lastResult = this.state.results[this.state.results.length - 1];
      if (lastResult && lastResult.newInfoRate <= this.config.convergenceThreshold) {
        this.logger.info('Convergence reached', {
          newInfoRate: lastResult.newInfoRate,
          threshold: this.config.convergenceThreshold,
        });
        this.emit('convergenceReached', {
          newInfoRate: lastResult.newInfoRate,
          threshold: this.config.convergenceThreshold,
          totalIterations: this.state.currentIteration,
        });
        return { continue: false, reason: 'converged' };
      }
    }

    return { continue: true, reason: 'continue' };
  }

  /**
   * 経過時間をチェック（タイムアウト判定）
   */
  checkTimeout(): boolean {
    const elapsed = Date.now() - new Date(this.state.startedAt).getTime();
    const timeoutReached = elapsed > this.config.timeoutMs * this.state.currentIteration;

    if (timeoutReached) {
      this.logger.warn('Iteration timeout', {
        elapsed,
        limit: this.config.timeoutMs * this.state.currentIteration,
      });
      this.emit('timeoutReached', { elapsed, iteration: this.state.currentIteration });
    }

    return timeoutReached;
  }

  /**
   * 処理を中断
   */
  abort(): void {
    this.aborted = true;
    this.logger.info('Abort requested');
  }

  /**
   * 現在のフェーズを更新
   */
  setPhase(phase: ProcessingPhase): void {
    this.state.phase = phase;
    this.logger.debug('Phase changed', { phase });
  }

  /**
   * 現在の状態を取得
   */
  getState(): IterationState {
    return { ...this.state };
  }

  /**
   * 現在のイテレーション番号を取得
   */
  getCurrentIteration(): number {
    return this.state.currentIteration;
  }

  /**
   * イテレーション結果一覧を取得
   */
  getResults(): IterationResult[] {
    return [...this.state.results];
  }

  /**
   * 平均新規情報率を計算
   */
  getAverageNewInfoRate(): number {
    if (this.state.results.length === 0) return 0;
    const sum = this.state.results.reduce((acc, r) => acc + r.newInfoRate, 0);
    return sum / this.state.results.length;
  }

  /**
   * 総処理時間を取得
   */
  getTotalProcessingTime(): number {
    return this.state.results.reduce((acc, r) => acc + r.durationMs, 0);
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.state = {
      currentIteration: 0,
      results: [],
      phase: 'initializing',
      consecutiveFailures: 0,
      startedAt: new Date().toISOString(),
    };
    this.aborted = false;
    this.logger.debug('Controller reset');
  }

  /**
   * 状態を復元（チェックポイントから）
   */
  restore(state: Partial<IterationState>): void {
    this.state = {
      ...this.state,
      ...state,
    };
    this.aborted = false;
    this.logger.info('State restored', {
      currentIteration: this.state.currentIteration,
      resultsCount: this.state.results.length,
    });
  }
}
