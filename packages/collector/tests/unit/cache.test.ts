/**
 * Cache module unit tests
 *
 * @task TASK-042
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LRUCache,
  CacheKeyGenerator,
  TTLManager,
  CachePersistence,
  CacheManager,
  TTL_PRESETS,
  createInitialStatistics,
} from '../../src/cache/index.js';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ============================================================================
// LRUCache Tests
// ============================================================================

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({
      maxEntries: 5,
      minEntries: 0, // テスト用にLRU削除を有効化
      maxSizeBytes: 10000,
      defaultTtlMs: 60000,
      cleanupIntervalMs: 0, // テスト中は自動クリーンアップ無効
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');
      
      expect(result).toBeDefined();
      expect(result?.value).toBe('value1');
      expect(result?.stale).toBe(false);
    });

    it('should return undefined for missing keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should track hit/miss statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should update access time on get', async () => {
      cache.set('key1', 'value1');
      
      const entries1 = cache.getAllEntries();
      const accessTime1 = entries1[0]?.metadata.lastAccessedAt ?? 0;

      // 少し待機
      await new Promise(r => setTimeout(r, 10));

      cache.get('key1');
      
      const entries2 = cache.getAllEntries();
      const accessTime2 = entries2[0]?.metadata.lastAccessedAt ?? 0;

      expect(accessTime2).toBeGreaterThanOrEqual(accessTime1);
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries without SWR', () => {
      // Stale-While-Revalidateを無効にしたキャッシュ
      const noSwrCache = new LRUCache<string>({
        maxEntries: 5,
        defaultTtlMs: 60000,
        staleWhileRevalidate: false,
        cleanupIntervalMs: 0,
      });

      noSwrCache.set('key1', 'value1', { ttlMs: 1 });
      
      // 期限切れを待つ
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = noSwrCache.get('key1');
          expect(result).toBeUndefined();
          noSwrCache.dispose();
          resolve();
        }, 10);
      });
    });

    it('should cleanup expired entries without SWR', () => {
      // Stale-While-Revalidateを無効にしたキャッシュ
      const noSwrCache = new LRUCache<string>({
        maxEntries: 5,
        defaultTtlMs: 60000,
        staleWhileRevalidate: false,
        cleanupIntervalMs: 0,
      });

      noSwrCache.set('key1', 'value1', { ttlMs: 1 });
      noSwrCache.set('key2', 'value2', { ttlMs: 100000 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const { removed } = noSwrCache.cleanup();
          expect(removed).toBe(1);
          expect(noSwrCache.size).toBe(1);
          noSwrCache.dispose();
          resolve();
        }, 10);
      });
    });
  });

  describe('Stale-While-Revalidate', () => {
    it('should return stale value within SWR window', () => {
      const swrCache = new LRUCache<string>({
        defaultTtlMs: 10,
        staleWhileRevalidate: true,
        staleWhileRevalidateTtlMs: 1000,
        cleanupIntervalMs: 0,
      });

      swrCache.set('key1', 'value1');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = swrCache.get('key1');
          expect(result).toBeDefined();
          expect(result?.stale).toBe(true);
          expect(result?.value).toBe('value1');
          swrCache.dispose();
          resolve();
        }, 20);
      });
    });
  });

  describe('LRU eviction', () => {
    it('should evict entry when full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      expect(cache.size).toBe(5);

      // 新しいエントリを追加（何かが削除されるはず）
      cache.set('key6', 'value6');

      expect(cache.has('key6')).toBe(true);
      expect(cache.size).toBe(5);

      // 少なくとも1つのキーが削除されているはず
      const allExist = ['key1', 'key2', 'key3', 'key4', 'key5'].every(k => cache.has(k));
      expect(allExist).toBe(false);
    });

    it('should consider access time for LRU', async () => {
      // 各エントリを時間差を置いてセット
      cache.set('key1', 'value1');
      await new Promise(r => setTimeout(r, 2));
      cache.set('key2', 'value2');
      await new Promise(r => setTimeout(r, 2));
      cache.set('key3', 'value3');
      await new Promise(r => setTimeout(r, 2));
      cache.set('key4', 'value4');
      await new Promise(r => setTimeout(r, 2));
      cache.set('key5', 'value5');
      
      await new Promise(r => setTimeout(r, 2));

      // key1をアクセス（最近使用済みに更新）
      cache.get('key1');
      
      await new Promise(r => setTimeout(r, 2));

      // 新しいエントリを追加
      cache.set('key6', 'value6');

      // key1はアクセスされたので残っているはず
      // 最も古いアクセス時間のキーが削除される
      expect(cache.size).toBe(5);
      expect(cache.has('key1')).toBe(true); // アクセスしたので残る
      expect(cache.has('key6')).toBe(true); // 新しく追加したので残る
      
      // key2〜key5のうち1つが削除されているはず
      const remaining = ['key2', 'key3', 'key4', 'key5'].filter(k => cache.has(k));
      expect(remaining).toHaveLength(3);
    });
  });

  describe('size management', () => {
    it('should track total size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.sizeBytes).toBeGreaterThan(0);
    });

    it('should respect minEntries during eviction', () => {
      const minCache = new LRUCache<string>({
        maxEntries: 5,
        minEntries: 3,
        cleanupIntervalMs: 0,
      });

      minCache.set('key1', 'value1');
      minCache.set('key2', 'value2');
      minCache.set('key3', 'value3');

      // 最小保持件数以下では削除されない
      expect(minCache.size).toBe(3);
      minCache.dispose();
    });
  });

  describe('events', () => {
    it('should emit events on operations', () => {
      const events: string[] = [];
      cache.on((event) => events.push(event.type));

      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      cache.delete('key1');

      expect(events).toContain('set');
      expect(events).toContain('hit');
      expect(events).toContain('miss');
      expect(events).toContain('evict');
    });
  });
});

// ============================================================================
// CacheKeyGenerator Tests
// ============================================================================

describe('CacheKeyGenerator', () => {
  let generator: CacheKeyGenerator;

  beforeEach(() => {
    generator = new CacheKeyGenerator();
  });

  describe('generateFromUrl', () => {
    it('should generate consistent keys for same URL', () => {
      const key1 = generator.generateFromUrl('https://example.com/path');
      const key2 = generator.generateFromUrl('https://example.com/path');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different URLs', () => {
      const key1 = generator.generateFromUrl('https://example.com/path1');
      const key2 = generator.generateFromUrl('https://example.com/path2');
      expect(key1).not.toBe(key2);
    });

    it('should normalize URL scheme', () => {
      const key1 = generator.generateFromUrl('HTTPS://example.com/path');
      const key2 = generator.generateFromUrl('https://example.com/path');
      expect(key1).toBe(key2);
    });

    it('should normalize hostname', () => {
      const key1 = generator.generateFromUrl('https://EXAMPLE.COM/path');
      const key2 = generator.generateFromUrl('https://example.com/path');
      expect(key1).toBe(key2);
    });

    it('should sort query parameters', () => {
      const key1 = generator.generateFromUrl('https://example.com?b=2&a=1');
      const key2 = generator.generateFromUrl('https://example.com?a=1&b=2');
      expect(key1).toBe(key2);
    });

    it('should ignore tracking parameters', () => {
      const key1 = generator.generateFromUrl('https://example.com?q=test&utm_source=google');
      const key2 = generator.generateFromUrl('https://example.com?q=test');
      expect(key1).toBe(key2);
    });

    it('should ignore fbclid and gclid', () => {
      const key1 = generator.generateFromUrl('https://example.com?q=test&fbclid=abc123');
      const key2 = generator.generateFromUrl('https://example.com?q=test');
      expect(key1).toBe(key2);
    });
  });

  describe('generateFromString', () => {
    it('should generate hash from string', () => {
      const key = generator.generateFromString('test input');
      expect(key).toHaveLength(64); // SHA-256 hex
    });
  });

  describe('generateFromParts', () => {
    it('should combine parts into key', () => {
      const key = generator.generateFromParts('prefix', 123, true);
      expect(key).toBeTruthy();
    });
  });

  describe('with prefix', () => {
    it('should add prefix to keys', () => {
      const prefixedGenerator = new CacheKeyGenerator({ prefix: 'cache' });
      const key = prefixedGenerator.generateFromString('test');
      expect(key.startsWith('cache:')).toBe(true);
    });
  });
});

// ============================================================================
// TTLManager Tests
// ============================================================================

describe('TTLManager', () => {
  describe('getTtl', () => {
    it('should return default TTL for unknown URLs', () => {
      const manager = new TTLManager({ defaultTtlMs: 60000 });
      const result = manager.getTtl('https://example.com');

      expect(result.ttlMs).toBe(60000);
      expect(result.matchedPattern).toBeUndefined();
    });

    it('should match URL patterns', () => {
      const manager = new TTLManager({
        defaultTtlMs: 60000,
        ttlPatterns: [
          { pattern: '*://news.*.com/*', ttlMs: 5000 },
        ],
      });

      const result = manager.getTtl('https://news.example.com/article');
      expect(result.ttlMs).toBe(5000);
      expect(result.matchedPattern).toBeDefined();
    });

    it('should use first matching pattern', () => {
      const manager = new TTLManager({
        defaultTtlMs: 60000,
        ttlPatterns: [
          { pattern: '*://example.com/*', ttlMs: 1000 },
          { pattern: '*://example.com/specific/*', ttlMs: 2000 },
        ],
      });

      const result = manager.getTtl('https://example.com/specific/page');
      expect(result.ttlMs).toBe(1000); // 最初にマッチしたパターン
    });
  });

  describe('getRecommendedTtlByContentType', () => {
    const manager = new TTLManager({ defaultTtlMs: 60000 });

    it('should return short TTL for HTML', () => {
      const ttl = manager.getRecommendedTtlByContentType('text/html');
      expect(ttl).toBe(TTL_PRESETS.MEDIUM);
    });

    it('should return short TTL for JSON', () => {
      const ttl = manager.getRecommendedTtlByContentType('application/json');
      expect(ttl).toBe(TTL_PRESETS.SHORT);
    });

    it('should return long TTL for images', () => {
      const ttl = manager.getRecommendedTtlByContentType('image/png');
      expect(ttl).toBe(TTL_PRESETS.LONG);
    });

    it('should return very long TTL for PDF', () => {
      const ttl = manager.getRecommendedTtlByContentType('application/pdf');
      expect(ttl).toBe(TTL_PRESETS.VERY_LONG);
    });
  });

  describe('parseCacheControl', () => {
    const manager = new TTLManager({ defaultTtlMs: 60000 });

    it('should parse max-age', () => {
      const ttl = manager.parseCacheControl('max-age=3600');
      expect(ttl).toBe(3600000);
    });

    it('should parse s-maxage', () => {
      const ttl = manager.parseCacheControl('s-maxage=7200');
      expect(ttl).toBe(7200000);
    });

    it('should return 0 for no-store', () => {
      const ttl = manager.parseCacheControl('no-store');
      expect(ttl).toBe(0);
    });

    it('should return 0 for no-cache', () => {
      const ttl = manager.parseCacheControl('no-cache');
      expect(ttl).toBe(0);
    });

    it('should handle multiple directives', () => {
      const ttl = manager.parseCacheControl('public, max-age=600');
      expect(ttl).toBe(600000);
    });
  });

  describe('parseExpires', () => {
    const manager = new TTLManager({ defaultTtlMs: 60000 });

    it('should parse valid date', () => {
      const futureDate = new Date(Date.now() + 3600000).toUTCString();
      const ttl = manager.parseExpires(futureDate);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600000);
    });

    it('should return 0 for past date', () => {
      const pastDate = new Date(Date.now() - 3600000).toUTCString();
      const ttl = manager.parseExpires(pastDate);
      expect(ttl).toBe(0);
    });

    it('should return undefined for invalid date', () => {
      const ttl = manager.parseExpires('invalid date');
      expect(ttl).toBeUndefined();
    });
  });

  describe('getTtlFromHeaders', () => {
    const manager = new TTLManager({ defaultTtlMs: 60000 });

    it('should prioritize Cache-Control', () => {
      const ttl = manager.getTtlFromHeaders({
        'cache-control': 'max-age=300',
        'expires': new Date(Date.now() + 7200000).toUTCString(),
      });
      expect(ttl).toBe(300000);
    });

    it('should fallback to Expires', () => {
      const futureDate = new Date(Date.now() + 3600000).toUTCString();
      const ttl = manager.getTtlFromHeaders({
        'expires': futureDate,
      });
      expect(ttl).toBeGreaterThan(0);
    });

    it('should fallback to Content-Type', () => {
      const ttl = manager.getTtlFromHeaders({
        'content-type': 'application/json',
      });
      expect(ttl).toBe(TTL_PRESETS.SHORT);
    });
  });
});

// ============================================================================
// CachePersistence Tests
// ============================================================================

describe('CachePersistence', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `cache-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('save/load', () => {
    it('should save and load cache entries', async () => {
      const persistence = new CachePersistence<string>({
        directory: testDir,
      });

      const entries = [
        {
          key: 'key1',
          value: 'value1',
          metadata: {
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            accessCount: 1,
            size: 10,
          },
          expiresAt: Date.now() + 60000,
        },
      ];

      const stats = createInitialStatistics();
      const saveResult = await persistence.save(entries, stats);

      expect(saveResult.success).toBe(true);
      expect(saveResult.entries).toBe(1);

      const loadResult = await persistence.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.entries).toHaveLength(1);
        expect(loadResult.data.entries[0]?.key).toBe('key1');
      }
    });

    it('should exclude expired entries on load', async () => {
      const persistence = new CachePersistence<string>({
        directory: testDir,
      });

      const entries = [
        {
          key: 'expired',
          value: 'value1',
          metadata: {
            createdAt: Date.now() - 10000,
            lastAccessedAt: Date.now() - 10000,
            accessCount: 1,
            size: 10,
          },
          expiresAt: Date.now() - 1000, // 期限切れ
        },
        {
          key: 'valid',
          value: 'value2',
          metadata: {
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            accessCount: 1,
            size: 10,
          },
          expiresAt: Date.now() + 60000, // 有効
        },
      ];

      const stats = createInitialStatistics();
      await persistence.save(entries, stats);

      const loadResult = await persistence.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.entries).toHaveLength(1);
        expect(loadResult.data.entries[0]?.key).toBe('valid');
      }
    });
  });

  describe('exists/clear', () => {
    it('should check file existence', async () => {
      const persistence = new CachePersistence<string>({
        directory: testDir,
      });

      expect(await persistence.exists()).toBe(false);

      await persistence.save([], createInitialStatistics());
      expect(await persistence.exists()).toBe(true);
    });

    it('should clear cache file', async () => {
      const persistence = new CachePersistence<string>({
        directory: testDir,
      });

      await persistence.save([], createInitialStatistics());
      expect(await persistence.exists()).toBe(true);

      await persistence.clear();
      expect(await persistence.exists()).toBe(false);
    });
  });
});

// ============================================================================
// CacheManager Tests
// ============================================================================

describe('CacheManager', () => {
  let manager: CacheManager<string>;

  beforeEach(() => {
    manager = new CacheManager<string>({
      lru: {
        maxEntries: 100,
        defaultTtlMs: 60000,
        cleanupIntervalMs: 0,
      },
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('getByUrl/setByUrl', () => {
    it('should cache by URL', () => {
      manager.setByUrl('https://example.com/page', 'content');
      const result = manager.getByUrl('https://example.com/page');

      expect(result).toBeDefined();
      expect(result?.value).toBe('content');
    });

    it('should normalize URLs for caching', () => {
      manager.setByUrl('https://example.com/page?utm_source=test', 'content');
      const result = manager.getByUrl('https://example.com/page');

      expect(result).toBeDefined();
      expect(result?.value).toBe('content');
    });
  });

  describe('has/hasByUrl', () => {
    it('should check cache existence', () => {
      expect(manager.hasByUrl('https://example.com')).toBe(false);
      manager.setByUrl('https://example.com', 'content');
      expect(manager.hasByUrl('https://example.com')).toBe(true);
    });
  });

  describe('delete/deleteByUrl', () => {
    it('should delete cache entries', () => {
      manager.setByUrl('https://example.com', 'content');
      expect(manager.hasByUrl('https://example.com')).toBe(true);

      manager.deleteByUrl('https://example.com');
      expect(manager.hasByUrl('https://example.com')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track statistics', () => {
      manager.setByUrl('https://example.com', 'content');
      manager.getByUrl('https://example.com');
      manager.getByUrl('https://missing.com');

      const stats = manager.getStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('generateKey', () => {
    it('should expose key generation', () => {
      const key1 = manager.generateKey('https://example.com/path');
      const key2 = manager.generateKey('https://example.com/path');
      expect(key1).toBe(key2);
    });
  });

  describe('events', () => {
    it('should emit cache events', () => {
      const events: string[] = [];
      manager.onCacheEvent((event) => events.push(event.type));

      manager.setByUrl('https://example.com', 'content');
      manager.getByUrl('https://example.com');

      expect(events).toContain('set');
      expect(events).toContain('hit');
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', () => {
      // SWRを無効にしたマネージャー
      const noSwrManager = new CacheManager<string>({
        lru: {
          maxEntries: 100,
          defaultTtlMs: 60000,
          staleWhileRevalidate: false,
          cleanupIntervalMs: 0,
        },
      });

      // 短いTTLで設定
      noSwrManager.set('key1', 'value1', { ttlMs: 1 });
      noSwrManager.set('key2', 'value2', { ttlMs: 100000 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const { removed } = noSwrManager.cleanup();
          expect(removed).toBe(1);
          expect(noSwrManager.size).toBe(1);
          noSwrManager.dispose();
          resolve();
        }, 10);
      });
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Cache Integration', () => {
  it('should work end-to-end', async () => {
    const testDir = join(tmpdir(), `cache-integration-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    try {
      const manager = new CacheManager<{ html: string; title: string }>({
        lru: {
          maxEntries: 100,
          defaultTtlMs: 60000,
          cleanupIntervalMs: 0,
          persistence: true,
          persistencePath: testDir,
        },
      });

      // データをキャッシュ
      manager.setByUrl('https://example.com/article1', {
        html: '<h1>Article 1</h1>',
        title: 'Article 1',
      });

      manager.setByUrl('https://example.com/article2', {
        html: '<h1>Article 2</h1>',
        title: 'Article 2',
      });

      // 取得
      const result1 = manager.getByUrl('https://example.com/article1');
      expect(result1?.value.title).toBe('Article 1');

      // 永続化
      await manager.persist();

      // 新しいマネージャーで復元
      const manager2 = new CacheManager<{ html: string; title: string }>({
        lru: {
          maxEntries: 100,
          defaultTtlMs: 60000,
          cleanupIntervalMs: 0,
          persistence: true,
          persistencePath: testDir,
        },
      });

      await manager2.restore();

      const restored = manager2.getByUrl('https://example.com/article1');
      expect(restored?.value.title).toBe('Article 1');

      manager.dispose();
      manager2.dispose();
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
