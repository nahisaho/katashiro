/**
 * Benchmark Suite
 *
 * @requirement REQ-EVAL-005
 * @design DES-KATASHIRO-003-EVAL §3.6
 */

import type { BenchmarkConfig, BenchmarkResult } from './types.js';

/**
 * ベンチマーク関数型
 */
export type BenchmarkFn = () => Promise<void> | void;

/**
 * ベンチマークスイート
 */
export class BenchmarkSuite {
  private results: Map<string, BenchmarkResult> = new Map();

  /**
   * ベンチマーク実行
   */
  async run(
    name: string,
    fn: BenchmarkFn,
    config?: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const iterations = config?.iterations ?? 100;
    const warmupIterations = config?.warmupIterations ?? 10;
    const timeout = config?.timeout ?? 60000;

    // ウォームアップ
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    // 測定
    const durations: number[] = [];
    const startTotal = Date.now();

    for (let i = 0; i < iterations; i++) {
      if (Date.now() - startTotal > timeout) {
        console.warn(
          `Benchmark "${name}" timed out after ${i} iterations`
        );
        break;
      }

      const start = performance.now();
      await fn();
      const end = performance.now();
      durations.push(end - start);
    }

    // 統計計算
    const sorted = [...durations].sort((a, b) => a - b);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      durations.length;
    const stdDev = Math.sqrt(variance);

    const result: BenchmarkResult = {
      name,
      meanMs: mean,
      stdDevMs: stdDev,
      minMs: sorted[0] ?? 0,
      maxMs: sorted[sorted.length - 1] ?? 0,
      percentiles: {
        p50: this.percentile(sorted, 0.5),
        p90: this.percentile(sorted, 0.9),
        p99: this.percentile(sorted, 0.99),
      },
      iterations: durations.length,
      timestamp: new Date().toISOString(),
    };

    this.results.set(name, result);

    return result;
  }

  /**
   * 複数ベンチマーク実行
   */
  async runAll(
    benchmarks: Array<{
      name: string;
      fn: BenchmarkFn;
      config?: BenchmarkConfig;
    }>
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const { name, fn, config } of benchmarks) {
      const result = await this.run(name, fn, config);
      results.push(result);
    }

    return results;
  }

  /**
   * 結果取得
   */
  getResult(name: string): BenchmarkResult | undefined {
    return this.results.get(name);
  }

  /**
   * 全結果取得
   */
  getAllResults(): BenchmarkResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 結果比較
   */
  compare(
    nameA: string,
    nameB: string
  ): { winner: string; speedup: number; significant: boolean } | undefined {
    const resultA = this.results.get(nameA);
    const resultB = this.results.get(nameB);

    if (!resultA || !resultB) {
      return undefined;
    }

    const speedup = resultA.meanMs / resultB.meanMs;
    const winner = speedup > 1 ? nameB : nameA;

    // 簡易的な有意性判定（2σ）
    const diffMean = Math.abs(resultA.meanMs - resultB.meanMs);
    const combinedStdDev = Math.sqrt(
      Math.pow(resultA.stdDevMs, 2) + Math.pow(resultB.stdDevMs, 2)
    );
    const significant = diffMean > 2 * combinedStdDev;

    return {
      winner,
      speedup: speedup > 1 ? speedup : 1 / speedup,
      significant,
    };
  }

  /**
   * レポート生成
   */
  generateReport(): string {
    const results = this.getAllResults();

    if (results.length === 0) {
      return 'No benchmark results available.';
    }

    const lines = [
      '# Benchmark Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Name | Mean (ms) | StdDev | Min | Max | P50 | P90 | P99 | Iterations |',
      '|------|-----------|--------|-----|-----|-----|-----|-----|------------|',
    ];

    for (const r of results) {
      lines.push(
        `| ${r.name} | ${r.meanMs.toFixed(2)} | ${r.stdDevMs.toFixed(2)} | ${r.minMs.toFixed(2)} | ${r.maxMs.toFixed(2)} | ${r.percentiles.p50.toFixed(2)} | ${r.percentiles.p90.toFixed(2)} | ${r.percentiles.p99.toFixed(2)} | ${r.iterations} |`
      );
    }

    return lines.join('\n');
  }

  /**
   * 結果クリア
   */
  clear(): void {
    this.results.clear();
  }

  private percentile(sorted: number[], p: number): number {
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, idx)] ?? 0;
  }
}

// シングルトン
let benchmarkSuite: BenchmarkSuite | null = null;

/**
 * グローバルベンチマークスイート取得
 */
export function getBenchmarkSuite(): BenchmarkSuite {
  if (!benchmarkSuite) {
    benchmarkSuite = new BenchmarkSuite();
  }
  return benchmarkSuite;
}

/**
 * ベンチマークスイートリセット（テスト用）
 */
export function resetBenchmarkSuite(): void {
  benchmarkSuite = null;
}
