/**
 * WebSearchClient ユニットテスト
 *
 * @requirement REQ-COLLECT-001
 * @task TSK-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchClient } from '../../src/web-search/web-search-client.js';
import type { SearchQuery } from '@nahisaho/katashiro-core';

describe('WebSearchClient', () => {
  let client: WebSearchClient;

  beforeEach(() => {
    client = new WebSearchClient();
  });

  describe('search', () => {
    it('should return search results for valid query', async () => {
      const query: SearchQuery = {
        query: 'TypeScript tutorial',
        maxResults: 5,
      };

      // Mock fetch for testing
      const mockResults = [
        {
          id: 'result-1',
          title: 'TypeScript Tutorial',
          url: 'https://example.com/typescript',
          snippet: 'Learn TypeScript basics',
          source: 'duckduckgo',
          timestamp: new Date().toISOString(),
        },
      ];

      vi.spyOn(client as any, 'fetchFromProvider').mockResolvedValue(mockResults);

      const results = await client.search(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBeDefined();
      expect(results[0].url).toBeDefined();
    });

    it('should return empty array for empty query', async () => {
      const query: SearchQuery = {
        query: '',
      };

      const results = await client.search(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should respect maxResults option', async () => {
      const query: SearchQuery = {
        query: 'test',
        maxResults: 3,
      };

      const mockResults = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `result-${i}`,
          title: `Result ${i}`,
          url: `https://example.com/${i}`,
          snippet: `Snippet ${i}`,
          source: 'duckduckgo',
          timestamp: new Date().toISOString(),
        }));

      vi.spyOn(client as any, 'fetchFromProvider').mockResolvedValue(mockResults);

      const results = await client.search(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should use specified provider', async () => {
      const query: SearchQuery = {
        query: 'test',
      };

      const fetchSpy = vi
        .spyOn(client as any, 'fetchFromProvider')
        .mockResolvedValue([]);

      await client.search(query, { provider: 'google' });

      expect(fetchSpy).toHaveBeenCalledWith('google', expect.any(Object));
    });

    it('should return empty array on network errors', async () => {
      const query: SearchQuery = {
        query: 'test',
      };

      vi.spyOn(client as any, 'fetchFromProvider').mockRejectedValue(
        new Error('Network error')
      );

      const results = await client.search(query);

      // エラー時は空配列を返す（AGENTS.md互換）
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('provider selection', () => {
    it('should default to duckduckgo provider', async () => {
      const query: SearchQuery = { query: 'test' };

      const fetchSpy = vi
        .spyOn(client as any, 'fetchFromProvider')
        .mockResolvedValue([]);

      await client.search(query);

      expect(fetchSpy).toHaveBeenCalledWith('duckduckgo', expect.any(Object));
    });
  });
});
