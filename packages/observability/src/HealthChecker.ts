/**
 * Health Checker Implementation
 *
 * @requirement REQ-OBS-002
 * @design DES-KATASHIRO-003-OBS §3.4
 */

import type { HealthCheck, HealthCheckResult } from './types.js';

/**
 * ヘルスチェッカー設定
 */
export interface HealthCheckerConfig {
  /** デフォルトタイムアウト (ms) */
  defaultTimeout?: number;
  /** チェック並列実行 */
  parallel?: boolean;
}

const DEFAULT_TIMEOUT = 5000;

/**
 * ヘルスチェッカー
 */
export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private config: Required<HealthCheckerConfig>;

  constructor(config?: HealthCheckerConfig) {
    this.config = {
      defaultTimeout: config?.defaultTimeout ?? DEFAULT_TIMEOUT,
      parallel: config?.parallel ?? true,
    };
  }

  /**
   * ヘルスチェック登録
   */
  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  /**
   * ヘルスチェック登録解除
   */
  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * 全チェック実行
   */
  async check(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    if (this.config.parallel) {
      // 並列実行
      const entries = Array.from(this.checks.entries());
      const results = await Promise.all(
        entries.map(async ([name, check]) => {
          const result = await this.runCheck(check);
          return [name, result] as const;
        })
      );
      for (const [name, result] of results) {
        checks[name] = result;
      }
    } else {
      // 逐次実行
      for (const [name, check] of this.checks) {
        checks[name] = await this.runCheck(check);
      }
    }

    // 全体ステータス判定
    const statuses = Object.values(checks).map((c) => c.status);
    let status: HealthCheckResult['status'];

    if (statuses.every((s) => s === 'pass')) {
      status = 'healthy';
    } else if (statuses.some((s) => s === 'fail')) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 単一チェック実行（タイムアウト付き）
   */
  private async runCheck(
    check: HealthCheck
  ): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; latencyMs?: number }> {
    const timeout = check.timeout ?? this.config.defaultTimeout;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Health check timeout: ${check.name}`)),
            timeout
          )
        ),
      ]);

      return {
        ...result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Liveness チェック（常にOK）
   */
  async liveness(): Promise<{ status: 'pass' }> {
    return { status: 'pass' };
  }

  /**
   * Readiness チェック
   */
  async readiness(): Promise<HealthCheckResult> {
    return this.check();
  }
}

// シングルトン
let healthChecker: HealthChecker | null = null;

/**
 * グローバルヘルスチェッカー取得
 */
export function getHealthChecker(): HealthChecker {
  if (!healthChecker) {
    healthChecker = new HealthChecker();
  }
  return healthChecker;
}

/**
 * ヘルスチェッカーリセット（テスト用）
 */
export function resetHealthChecker(): void {
  healthChecker = null;
}
