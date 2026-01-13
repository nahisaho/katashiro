/**
 * SearchCache ユニットテスト
 *
 * @requirement REQ-IMP-001
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchCache } from '../../src/cache/search-cache.js';
import type { SearchResult } from '@nahisaho/katashiro-core';

describe('SearchCache', () => {
  let cache: SearchCache;

  const createMockResults = (count: number): SearchResult[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `result-${i}`,
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`,
      source: 'test-provider',
      timestamp: new Date().toISOString(),
    }));

  beforeEach(() => {
    cache = new SearchCache();
  });

  describe('get/set', () => {
    it('should cache and retrieve search results', () => {
      const results = createMockResults(5);
      cache.set('test query', results);

      const cached = cache.get('test query');
      expect(cached).toEqual(results);
    });

    it('should return undefined for cache miss', () => {
      const cached = cache.get('nonexistent query');
      expect(cached).toBeUndefined();
    });

    it('should be case-insensitive for queries', () => {
      const results = createMockResults(3);
      cache.set('Test Query', results);

      const cached = cache.get('test query');
      expect(cached).toEqual(results);
    });

    it('should cache separately for different providers', () => {
      const googleResults = createMockResults(2);
      const bingResults = createMockResults(3);

      cache.set('test', googleResults, 'google');
      cache.set('test', bingResults, 'bing');

      expect(cache.get('test', 'google')).toEqual(googleResults);
      expect(cache.get('test', 'bing')).toEqual(bingResults);
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', () => {
      const shortTtlCache = new SearchCache({ ttlMs: 100 });
      const results = createMockResults(1);
      shortTtlCache.set('test', results);

      expect(shortTtlCache.get('test')).toEqual(results);

      // Mock time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(150);

      expect(shortTtlCache.get('test')).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('maxSize', () => {
    it('should evict oldest entry when max size reached', () => {
      const smallCache = new SearchCache({ maxSize: 3 });
      
      smallCache.set('query1', createMockResults(1));
      smallCache.set('query2', createMockResults(1));
      smallCache.set('query3', createMockResults(1));

      expect(smallCache.size).toBe(3);

      // Adding 4th entry should evict the oldest
      smallCache.set('query4', createMockResults(1));

      expect(smallCache.size).toBe(3);
      expect(smallCache.get('query4')).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('query1', createMockResults(1));
      cache.set('query2', createMockResults(1));

      expect(cache.size).toBe(2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', () => {
      vi.useFakeTimers();
      const cache = new SearchCache({ ttlMs: 100 });

      cache.set('old', createMockResults(1));
      vi.advanceTimersByTime(150);
      cache.set('new', createMockResults(1));

      const pruned = cache.prune();

      expect(pruned).toBe(1);
      expect(cache.size).toBe(1);
      expect(cache.get('new')).toBeDefined();
      vi.useRealTimers();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('query1', createMockResults(1));
      cache.set('query2', createMockResults(1));

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.ttlMs).toBe(5 * 60 * 1000);
      expect(stats.oldestEntryAge).toBeGreaterThanOrEqual(0);
    });
  });
});
