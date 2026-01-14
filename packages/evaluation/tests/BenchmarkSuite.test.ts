/**
 * BenchmarkSuite Tests
 *
 * @design DES-KATASHIRO-003-EVAL §3.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BenchmarkSuite,
  getBenchmarkSuite,
  resetBenchmarkSuite,
} from '../src/BenchmarkSuite.js';

describe('BenchmarkSuite', () => {
  beforeEach(() => {
    resetBenchmarkSuite();
  });

  it('should run a simple benchmark', async () => {
    const suite = new BenchmarkSuite();
    const result = await suite.run(
      'simple',
      () => {
        // Simple sync operation
        const arr = Array.from({ length: 100 }, (_, i) => i);
        arr.reduce((a, b) => a + b, 0);
      },
      { iterations: 10, warmupIterations: 2 }
    );

    expect(result.name).toBe('simple');
    expect(result.iterations).toBe(10);
    expect(result.meanMs).toBeGreaterThanOrEqual(0);
    expect(result.stdDevMs).toBeGreaterThanOrEqual(0);
    expect(result.minMs).toBeLessThanOrEqual(result.meanMs);
    expect(result.maxMs).toBeGreaterThanOrEqual(result.meanMs);
    expect(result.percentiles.p50).toBeDefined();
    expect(result.percentiles.p90).toBeDefined();
    expect(result.percentiles.p99).toBeDefined();
    expect(result.timestamp).toBeTruthy();
  });

  it('should run async benchmark', async () => {
    const suite = new BenchmarkSuite();
    const result = await suite.run(
      'async',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
      { iterations: 5, warmupIterations: 1 }
    );

    expect(result.name).toBe('async');
    expect(result.iterations).toBe(5);
    expect(result.meanMs).toBeGreaterThan(0);
  });

  it('should run multiple benchmarks', async () => {
    const suite = new BenchmarkSuite();
    const results = await suite.runAll([
      { name: 'fast', fn: () => {}, config: { iterations: 10 } },
      {
        name: 'slow',
        fn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
        config: { iterations: 5 },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('fast');
    expect(results[1].name).toBe('slow');
  });

  it('should store and retrieve results', async () => {
    const suite = new BenchmarkSuite();
    await suite.run('test1', () => {}, { iterations: 10 });
    await suite.run('test2', () => {}, { iterations: 10 });

    expect(suite.getResult('test1')).toBeDefined();
    expect(suite.getResult('test2')).toBeDefined();
    expect(suite.getResult('nonexistent')).toBeUndefined();

    const all = suite.getAllResults();
    expect(all).toHaveLength(2);
  });

  it('should compare benchmarks', async () => {
    const suite = new BenchmarkSuite();

    // Fast operation
    await suite.run('fast', () => {}, { iterations: 50 });

    // Slower operation
    await suite.run(
      'slow',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
      },
      { iterations: 10 }
    );

    const comparison = suite.compare('fast', 'slow');

    expect(comparison).toBeDefined();
    expect(comparison!.winner).toBe('fast');
    expect(comparison!.speedup).toBeGreaterThan(1);
  });

  it('should return undefined when comparing non-existent benchmarks', async () => {
    const suite = new BenchmarkSuite();
    await suite.run('test', () => {}, { iterations: 10 });

    expect(suite.compare('test', 'nonexistent')).toBeUndefined();
    expect(suite.compare('nonexistent', 'test')).toBeUndefined();
  });

  it('should generate report', async () => {
    const suite = new BenchmarkSuite();
    await suite.run('bench1', () => {}, { iterations: 10 });
    await suite.run('bench2', () => {}, { iterations: 10 });

    const report = suite.generateReport();

    expect(report).toContain('Benchmark Report');
    expect(report).toContain('bench1');
    expect(report).toContain('bench2');
    expect(report).toContain('Mean (ms)');
    expect(report).toContain('P50');
    expect(report).toContain('P90');
    expect(report).toContain('P99');
  });

  it('should return message when no results', () => {
    const suite = new BenchmarkSuite();
    expect(suite.generateReport()).toBe('No benchmark results available.');
  });

  it('should clear results', async () => {
    const suite = new BenchmarkSuite();
    await suite.run('test', () => {}, { iterations: 10 });

    expect(suite.getAllResults()).toHaveLength(1);

    suite.clear();

    expect(suite.getAllResults()).toHaveLength(0);
  });

  it('should respect timeout', async () => {
    const suite = new BenchmarkSuite();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await suite.run(
      'timeout-test',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
      { iterations: 1000, warmupIterations: 1, timeout: 100 }
    );

    // Should complete fewer iterations due to timeout
    expect(result.iterations).toBeLessThan(1000);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const suite1 = getBenchmarkSuite();
      const suite2 = getBenchmarkSuite();
      expect(suite1).toBe(suite2);
    });

    it('should reset singleton', async () => {
      const suite1 = getBenchmarkSuite();
      await suite1.run('test', () => {}, { iterations: 10 });

      expect(suite1.getAllResults()).toHaveLength(1);

      resetBenchmarkSuite();

      const suite2 = getBenchmarkSuite();
      expect(suite2).not.toBe(suite1);
      expect(suite2.getAllResults()).toHaveLength(0);
    });
  });
});
