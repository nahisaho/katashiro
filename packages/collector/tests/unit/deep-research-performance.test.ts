/**
 * DeepResearch パフォーマンステスト
 *
 * 並列処理、キャッシュ効率、大規模データ処理のパフォーマンス検証
 *
 * @requirement REQ-DR-S-002 - 並列処理の動的制御
 * @requirement REQ-DR-S-003 - キャッシュサイズ管理
 * @requirement REQ-DR-E-005 - キャッシュヒット時の高速応答
 * @task TASK-039, TASK-040, TASK-041, TASK-042
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import {
  UrlProcessor,
  IterationController,
  type UrlProcessorConfig,
  type IScraperAdapter,
} from '../../src/research/deep-research/index.js';
import { ContentCache, type ContentEntry } from '../../src/content/index.js';
import type { ScrapingResult } from '../../src/types.js';

// =====================================
// Performance Test Utilities
// =====================================

/**
 * 処理時間を計測するユーティリティ
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

/**
 * メモリ使用量を取得（概算）
 */
function getMemoryUsage(): { heapUsed: number; heapTotal: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return { heapUsed: usage.heapUsed, heapTotal: usage.heapTotal };
  }
  return { heapUsed: 0, heapTotal: 0 };
}

/**
 * テスト用遅延付きスクレイパー
 */
class DelayedMockScraper implements IScraperAdapter {
  private delayMs: number;
  private contentSize: number;

  constructor(delayMs: number = 50, contentSize: number = 1000) {
    this.delayMs = delayMs;
    this.contentSize = contentSize;
  }

  async scrape(url: string): Promise<Result<ScrapingResult, Error>> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    
    // Generate content of specified size
    const content = `Content for ${url}\n`.repeat(Math.ceil(this.contentSize / 50));
    
    return ok({
      content,
      title: `Title for ${url}`,
      url,
      metadata: { size: content.length },
      links: [],
      images: [],
    } as ScrapingResult);
  }
}

/**
 * 失敗率を制御できるスクレイパー
 */
class UnreliableMockScraper implements IScraperAdapter {
  private failureRate: number;
  private delayMs: number;

  constructor(failureRate: number = 0.3, delayMs: number = 50) {
    this.failureRate = failureRate;
    this.delayMs = delayMs;
  }

  async scrape(url: string): Promise<Result<ScrapingResult, Error>> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    
    if (Math.random() < this.failureRate) {
      return err(new Error(`Random failure for ${url}`));
    }
    
    return ok({
      content: `Content for ${url}`,
      title: `Title for ${url}`,
      url,
      metadata: {},
      links: [],
      images: [],
    } as ScrapingResult);
  }
}

/**
 * テスト用設定を生成
 */
function createTestConfig(overrides: Partial<UrlProcessorConfig> = {}): UrlProcessorConfig {
  return {
    retry: {
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 50,
      multiplier: 2,
    },
    fallback: {
      useCache: false,
      useWayback: false,
      useGoogleCache: false,
      alternativeSources: [],
      priority: [],
      timeoutMs: 1000,
    },
    cache: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      maxEntries: 1000,
      defaultTtlMs: 60000,
    },
    parallel: {
      maxConcurrent: 5,
      maxPerDomain: 2,
      requestInterval: 0,
    },
    timeouts: {
      perUrl: 5000,
      perIteration: 30000,
      total: 120000,
    },
    ...overrides,
  };
}

/**
 * テスト用URLリストを生成
 */
function generateUrls(count: number, domains: number = 5): string[] {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const domain = `example${i % domains}.com`;
    urls.push(`https://${domain}/page/${i}`);
  }
  return urls;
}

/**
 * テスト用ContentEntryを生成
 */
function createTestEntry(url: string, content: string): ContentEntry {
  const now = new Date().toISOString();
  return {
    url,
    content,
    contentType: 'text/html',
    status: 'cached',
    currentVersion: {
      versionId: `v-${Date.now()}`,
      hash: `hash-${url}`,
      fetchedAt: now,
      size: Buffer.byteLength(content, 'utf8'),
      source: 'original',
    },
    versions: [],
    lastAccessedAt: now,
    accessCount: 1,
  };
}

// =====================================
// Parallel Processing Performance Tests
// =====================================

describe('Parallel Processing Performance', () => {
  describe('Concurrent URL Processing', () => {
    it('should process URLs faster with parallelism than sequential', async () => {
      const urlCount = 10;
      const delayPerUrl = 50; // 50ms per URL
      const urls = generateUrls(urlCount);
      const scraper = new DelayedMockScraper(delayPerUrl);
      
      // Sequential processing (maxConcurrent = 1)
      const sequentialConfig = createTestConfig({
        parallel: { maxConcurrent: 1, maxPerDomain: 1, requestInterval: 0 },
      });
      const sequentialProcessor = new UrlProcessor(scraper, sequentialConfig);
      const { durationMs: sequentialTime } = await measureTime(() =>
        sequentialProcessor.processMany(urls)
      );
      
      // Parallel processing (maxConcurrent = 5)
      const parallelConfig = createTestConfig({
        parallel: { maxConcurrent: 5, maxPerDomain: 5, requestInterval: 0 },
      });
      const parallelProcessor = new UrlProcessor(scraper, parallelConfig);
      const { durationMs: parallelTime } = await measureTime(() =>
        parallelProcessor.processMany(urls)
      );
      
      // Parallel should be significantly faster
      // With 10 URLs at 50ms each, sequential ~500ms, parallel ~100-150ms
      expect(parallelTime).toBeLessThan(sequentialTime * 0.5);
    });

    it('should respect maxPerDomain limit', async () => {
      const urls = [
        'https://example1.com/a',
        'https://example1.com/b',
        'https://example1.com/c',
        'https://example2.com/a',
        'https://example2.com/b',
      ];
      const delayPerUrl = 100;
      const scraper = new DelayedMockScraper(delayPerUrl);
      
      // maxPerDomain = 1 means only 1 request per domain at a time
      const config = createTestConfig({
        parallel: { maxConcurrent: 5, maxPerDomain: 1, requestInterval: 0 },
      });
      const processor = new UrlProcessor(scraper, config);
      
      const { durationMs } = await measureTime(() => processor.processMany(urls));
      
      // With maxPerDomain=1, example1.com URLs must be sequential: 3*100 = 300ms
      // example2.com can run in parallel with example1.com
      // Total should be around 300ms, not 500ms (full sequential) or 100ms (full parallel)
      expect(durationMs).toBeGreaterThan(200);
      expect(durationMs).toBeLessThan(600);
    });

    it('should process 50 URLs within reasonable time', async () => {
      const urlCount = 50;
      const delayPerUrl = 20;
      const urls = generateUrls(urlCount, 10);
      const scraper = new DelayedMockScraper(delayPerUrl);
      
      const config = createTestConfig({
        parallel: { maxConcurrent: 10, maxPerDomain: 5, requestInterval: 0 },
      });
      const processor = new UrlProcessor(scraper, config);
      
      const { result, durationMs } = await measureTime(() => processor.processMany(urls));
      
      // With 50 URLs, 20ms each, maxConcurrent=10
      // Theoretical minimum: 50/10 * 20 = 100ms
      // Allow 3x overhead for test stability
      expect(durationMs).toBeLessThan(1000);
      expect(result).toHaveLength(urlCount);
      expect(result.every((r) => r.success)).toBe(true);
    });

    it('should handle mixed success/failure efficiently', async () => {
      const urlCount = 20;
      const urls = generateUrls(urlCount);
      const scraper = new UnreliableMockScraper(0.3, 30); // 30% failure rate
      
      const config = createTestConfig({
        parallel: { maxConcurrent: 5, maxPerDomain: 5, requestInterval: 0 },
      });
      const processor = new UrlProcessor(scraper, config);
      
      const { result, durationMs } = await measureTime(() => processor.processMany(urls));
      
      expect(result).toHaveLength(urlCount);
      // Should complete within reasonable time despite failures
      expect(durationMs).toBeLessThan(2000);
      
      // With 30% failure rate, expect ~14 successes (with some variance)
      const successCount = result.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThan(5);
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should maintain throughput under load', async () => {
      const batches = 5;
      const urlsPerBatch = 10;
      const scraper = new DelayedMockScraper(10);
      const config = createTestConfig({
        parallel: { maxConcurrent: 5, maxPerDomain: 5, requestInterval: 0 },
      });
      const processor = new UrlProcessor(scraper, config);
      
      const times: number[] = [];
      
      for (let i = 0; i < batches; i++) {
        const urls = generateUrls(urlsPerBatch, 5);
        const { durationMs } = await measureTime(() => processor.processMany(urls));
        times.push(durationMs);
      }
      
      // All batches should complete
      expect(times).toHaveLength(batches);
      expect(times.every((t) => t > 0)).toBe(true);
      
      // Average time should be reasonable (< 500ms per batch)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(500);
      
      // Last batch should not be drastically slower than first (no degradation)
      // Allow 5x ratio for test environment variance
      const firstBatch = times[0];
      const lastBatch = times[times.length - 1];
      expect(lastBatch).toBeLessThan(firstBatch * 5);
    });
  });
});

// =====================================
// Cache Performance Tests
// =====================================

describe('Cache Performance', () => {
  describe('Cache Hit Performance', () => {
    it('should return cached content much faster than network fetch', async () => {
      const cache = new ContentCache({
        maxSizeBytes: 10 * 1024 * 1024,
        maxEntries: 100,
        defaultTtlMs: 60000,
      });
      
      const url = 'https://example.com/test';
      const content = 'Test content'.repeat(100);
      const entry = createTestEntry(url, content);
      
      // Populate cache
      cache.set(entry);
      
      // Measure cache hit time
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        cache.get(url);
      }
      const duration = performance.now() - start;
      const avgTimePerHit = duration / iterations;
      
      // Cache hit should be sub-millisecond
      expect(avgTimePerHit).toBeLessThan(1);
    });

    it('should maintain performance with large cache', async () => {
      const cache = new ContentCache({
        maxSizeBytes: 100 * 1024 * 1024,
        maxEntries: 10000,
        defaultTtlMs: 60000,
      });
      
      // Fill cache with 1000 entries
      const entryCount = 1000;
      for (let i = 0; i < entryCount; i++) {
        const url = `https://example${i % 10}.com/page/${i}`;
        const content = `Content ${i}`.repeat(100);
        cache.set(createTestEntry(url, content));
      }
      
      // Measure random access time
      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const randomIndex = Math.floor(Math.random() * entryCount);
        const url = `https://example${randomIndex % 10}.com/page/${randomIndex}`;
        cache.get(url);
      }
      const duration = performance.now() - start;
      const avgTimePerAccess = duration / iterations;
      
      // Random access should still be fast (< 5ms per access)
      expect(avgTimePerAccess).toBeLessThan(5);
    });

    it('should evict entries efficiently when size limit exceeded', async () => {
      const maxSizeBytes = 10000; // 10KB limit
      const cache = new ContentCache({
        maxSizeBytes,
        maxEntries: 100,
        defaultTtlMs: 60000,
        minRetainEntries: 1,
      });
      
      // Add entries that exceed size limit
      const content = 'X'.repeat(1000); // ~1KB per entry
      const entryCount = 20; // 20KB total, exceeds 10KB limit
      
      const { durationMs } = await measureTime(async () => {
        for (let i = 0; i < entryCount; i++) {
          const url = `https://example.com/page/${i}`;
          cache.set(createTestEntry(url, content));
        }
      });
      
      // Eviction should complete quickly
      expect(durationMs).toBeLessThan(100);
      
      // Cache should respect size limit
      const stats = cache.getStats();
      // Use currentSizeBytes (the correct property name)
      expect(stats.currentSizeBytes).toBeLessThanOrEqual(maxSizeBytes * 1.1); // Allow 10% tolerance
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit/miss ratio correctly', () => {
      const cache = new ContentCache({
        maxSizeBytes: 10 * 1024 * 1024,
        maxEntries: 100,
        defaultTtlMs: 60000,
      });
      
      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        cache.set(createTestEntry(`https://example.com/${i}`, `Content ${i}`));
      }
      
      // 10 hits (access existing entries twice each)
      for (let i = 0; i < 5; i++) {
        cache.get(`https://example.com/${i}`);
        cache.get(`https://example.com/${i}`);
      }
      
      // 5 misses
      for (let i = 5; i < 10; i++) {
        cache.get(`https://example.com/${i}`);
      }
      
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(10);
      expect(stats.missCount).toBe(5);
      
      const hitRate = stats.hitCount / (stats.hitCount + stats.missCount);
      expect(hitRate).toBeCloseTo(0.667, 2);
    });
  });
});

// =====================================
// Iteration Controller Performance Tests
// =====================================

describe('IterationController Performance', () => {
  it('should handle many iterations efficiently', () => {
    const controller = new IterationController({
      maxIterations: 100,
      convergenceThreshold: 0.001,
      timeoutMs: 300000,
      maxConsecutiveFailures: 10,
    });
    
    const { durationMs } = measureTimeSync(() => {
      for (let i = 0; i < 50; i++) {
        controller.startIteration();
        controller.completeIteration({
          urlsProcessed: 100,
          urlsSucceeded: 95,
          urlsFailed: 5,
          newInfoRate: 0.5 - i * 0.01, // Decreasing new info rate
          findings: 10,
          durationMs: 1000,
        });
      }
    });
    
    // 50 iterations should complete in under 100ms
    expect(durationMs).toBeLessThan(100);
  });

  it('should calculate statistics quickly', () => {
    const controller = new IterationController({
      maxIterations: 100,
      convergenceThreshold: 0.01,
      timeoutMs: 300000,
      maxConsecutiveFailures: 10,
    });
    
    // Add 50 results
    for (let i = 0; i < 50; i++) {
      controller.startIteration();
      controller.completeIteration({
        urlsProcessed: 100,
        urlsSucceeded: 90 + Math.floor(Math.random() * 10),
        urlsFailed: Math.floor(Math.random() * 10),
        newInfoRate: Math.random(),
        findings: Math.floor(Math.random() * 20),
        durationMs: 500 + Math.floor(Math.random() * 500),
      });
    }
    
    const { durationMs } = measureTimeSync(() => {
      for (let i = 0; i < 1000; i++) {
        controller.getAverageNewInfoRate();
        controller.getTotalProcessingTime();
        controller.getResults();
        controller.getState();
      }
    });
    
    // 4000 calculations should be fast
    expect(durationMs).toBeLessThan(100);
  });
});

// =====================================
// Memory Usage Tests
// =====================================

describe('Memory Usage', () => {
  it('should not leak memory during URL processing', async () => {
    const scraper = new DelayedMockScraper(5, 500);
    const config = createTestConfig({
      parallel: { maxConcurrent: 5, maxPerDomain: 5, requestInterval: 0 },
    });
    const processor = new UrlProcessor(scraper, config);
    
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = getMemoryUsage();
    
    // Process multiple batches
    for (let batch = 0; batch < 5; batch++) {
      const urls = generateUrls(20);
      await processor.processMany(urls);
    }
    
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = getMemoryUsage();
    
    // Memory growth should be limited (< 50MB)
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });

  it('should handle large content without excessive memory use', async () => {
    const largeContentSize = 100000; // 100KB per page
    const scraper = new DelayedMockScraper(10, largeContentSize);
    const config = createTestConfig({
      parallel: { maxConcurrent: 3, maxPerDomain: 3, requestInterval: 0 },
    });
    const processor = new UrlProcessor(scraper, config);
    
    const urls = generateUrls(10);
    
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = getMemoryUsage();
    
    const results = await processor.processMany(urls);
    
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = getMemoryUsage();
    
    // All URLs should be processed successfully
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.success)).toBe(true);
    
    // Memory should stay reasonable (< 100MB for 10 * 100KB = 1MB of content)
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
  });
});

// =====================================
// Stress Tests
// =====================================

describe('Stress Tests', () => {
  it('should handle 100 URLs without degradation', async () => {
    const urlCount = 100;
    const urls = generateUrls(urlCount, 20);
    const scraper = new DelayedMockScraper(10);
    
    const config = createTestConfig({
      parallel: { maxConcurrent: 10, maxPerDomain: 5, requestInterval: 0 },
    });
    const processor = new UrlProcessor(scraper, config);
    
    const { result, durationMs } = await measureTime(() => processor.processMany(urls));
    
    expect(result).toHaveLength(urlCount);
    expect(result.every((r) => r.success)).toBe(true);
    
    // 100 URLs at 10ms each with maxConcurrent=10
    // Theoretical: 100/10 * 10 = 100ms
    // Allow 10x overhead for test stability
    expect(durationMs).toBeLessThan(1500);
    
    // Throughput should be at least 50 URLs/second
    const throughput = (urlCount / durationMs) * 1000;
    expect(throughput).toBeGreaterThan(50);
  }, 10000); // 10 second timeout

  it('should recover from high failure rates', async () => {
    const urlCount = 30;
    const urls = generateUrls(urlCount);
    const scraper = new UnreliableMockScraper(0.5, 20); // 50% failure rate
    
    const config = createTestConfig({
      parallel: { maxConcurrent: 5, maxPerDomain: 5, requestInterval: 0 },
      retry: { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 50, multiplier: 2 },
    });
    const processor = new UrlProcessor(scraper, config);
    
    const { result, durationMs } = await measureTime(() => processor.processMany(urls));
    
    expect(result).toHaveLength(urlCount);
    // Should complete in reasonable time even with retries
    expect(durationMs).toBeLessThan(5000);
    
    // Some should succeed despite high failure rate (due to retries)
    const successCount = result.filter((r) => r.success).length;
    expect(successCount).toBeGreaterThan(0);
  }, 10000);

  it('should maintain responsiveness during long operations', async () => {
    const controller = new IterationController({
      maxIterations: 1000,
      convergenceThreshold: 0.0001,
      timeoutMs: 60000,
      maxConsecutiveFailures: 100,
    });
    
    // Simulate long-running research with many iterations
    const iterationCount = 200;
    
    const { durationMs } = measureTimeSync(() => {
      for (let i = 0; i < iterationCount; i++) {
        controller.startIteration();
        controller.completeIteration({
          urlsProcessed: 50,
          urlsSucceeded: 45,
          urlsFailed: 5,
          newInfoRate: Math.max(0.01, 0.5 - i * 0.002),
          findings: 5,
          durationMs: 100,
        });
        
        // Check state periodically
        if (i % 10 === 0) {
          controller.getState();
          controller.shouldContinue();
        }
      }
    });
    
    // 200 iterations with state checks should be fast
    expect(durationMs).toBeLessThan(500);
  });
});

// =====================================
// Synchronous Time Measurement Helper
// =====================================

function measureTimeSync<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}
