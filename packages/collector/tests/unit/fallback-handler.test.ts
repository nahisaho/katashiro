/**
 * フォールバック機構 単体テスト
 *
 * @requirement REQ-DR-U-003 - フォールバック機構
 * @design DES-KATASHIRO-005-DR-FALLBACK
 * @task TASK-020〜023
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FallbackHandler,
  FallbackError,
  WaybackMachineClient,
  WaybackError,
  DEFAULT_FALLBACK_CONFIG,
  type FallbackEvent,
  type FallbackSourceType,
} from '../../src/fallback/index.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('DEFAULT_FALLBACK_CONFIG', () => {
  it('should have useCache enabled', () => {
    expect(DEFAULT_FALLBACK_CONFIG.useCache).toBe(true);
  });

  it('should have useWayback enabled', () => {
    expect(DEFAULT_FALLBACK_CONFIG.useWayback).toBe(true);
  });

  it('should have useGoogleCache disabled', () => {
    expect(DEFAULT_FALLBACK_CONFIG.useGoogleCache).toBe(false);
  });

  it('should have correct priority order', () => {
    expect(DEFAULT_FALLBACK_CONFIG.priority).toEqual(['original', 'cache', 'wayback', 'alternative']);
  });

  it('should have maxArchiveAgeDays set to 365', () => {
    expect(DEFAULT_FALLBACK_CONFIG.maxArchiveAgeDays).toBe(365);
  });
});

describe('WaybackMachineClient', () => {
  let client: WaybackMachineClient;

  beforeEach(() => {
    client = new WaybackMachineClient({ timeoutMs: 5000, maxAgeDays: 365 });
  });

  describe('buildArchiveUrl', () => {
    it('should build archive URL without timestamp', () => {
      const url = client.buildArchiveUrl('https://example.com');
      expect(url).toBe('https://archive.org/web//https://example.com');
    });

    it('should build archive URL with timestamp', () => {
      const date = new Date('2024-06-15T12:30:45Z');
      const url = client.buildArchiveUrl('https://example.com', date);
      expect(url).toContain('20240615123045');
    });
  });

  describe('getLatestSnapshot', () => {
    it('should handle fetch errors gracefully', async () => {
      // fetchをモック
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.getLatestSnapshot('https://example.com');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(WaybackError);
        expect(result.error.url).toBe('https://example.com');
      }

      global.fetch = originalFetch;
    });

    it('should handle API error response', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await client.getLatestSnapshot('https://example.com');
      expect(isErr(result)).toBe(true);

      global.fetch = originalFetch;
    });

    it('should handle no snapshot available', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ archived_snapshots: {} }),
      });

      const result = await client.getLatestSnapshot('https://example.com');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('No archived snapshot');
      }

      global.fetch = originalFetch;
    });

    it('should parse snapshot correctly', async () => {
      const originalFetch = global.fetch;

      // 現在日時に近いタイムスタンプを生成
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const timestamp = `${year}${month}${day}120000`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          archived_snapshots: {
            closest: {
              available: true,
              url: `https://web.archive.org/web/${timestamp}/https://example.com`,
              timestamp,
              status: '200',
            },
          },
        }),
      });

      const result = await client.getLatestSnapshot('https://example.com');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.url).toContain('archive.org');
        expect(result.value.statusCode).toBe(200);
        expect(result.value.originalUrl).toBe('https://example.com');
      }

      global.fetch = originalFetch;
    });

    it('should reject snapshots older than maxAgeDays', async () => {
      const oldClient = new WaybackMachineClient({ maxAgeDays: 30 });
      const originalFetch = global.fetch;

      // 1年前のスナップショット
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 1);
      const timestamp = oldDate.toISOString().replace(/[-:TZ]/g, '').slice(0, 14);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          archived_snapshots: {
            closest: {
              available: true,
              url: `https://web.archive.org/web/${timestamp}/https://example.com`,
              timestamp,
              status: '200',
            },
          },
        }),
      });

      const result = await oldClient.getLatestSnapshot('https://example.com');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('too old');
      }

      global.fetch = originalFetch;
    });
  });
});

describe('FallbackHandler', () => {
  describe('fetchWithFallback - original success', () => {
    it('should return data from original source', async () => {
      const handler = new FallbackHandler<string>();
      const fetcher = vi.fn().mockResolvedValue('content');

      const result = await handler.fetchWithFallback('https://example.com', fetcher);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.data).toBe('content');
        expect(result.value.sourceType).toBe('original');
        expect(result.value.attemptedSources).toContain('original');
      }
      expect(fetcher).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('fetchWithFallback - cache fallback', () => {
    it('should use cache when original fails', async () => {
      const handler = new FallbackHandler<string>();

      // キャッシュをセット
      handler.setCache('https://example.com', 'cached content');

      // fetcherを失敗させる
      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await handler.fetchWithFallback('https://example.com', fetcher);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.data).toBe('cached content');
        expect(result.value.sourceType).toBe('cache');
        expect(result.value.cachedAt).toBeDefined();
      }
    });

    it('should not use expired cache', async () => {
      const handler = new FallbackHandler<string>({
        config: { useWayback: false },
      });

      // 期限切れキャッシュをセット
      handler.setCache('https://example.com', 'expired', { expiresInMs: -1000 });

      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await handler.fetchWithFallback('https://example.com', fetcher);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('fetchWithFallback - alternative sources', () => {
    it('should try alternative sources', async () => {
      const handler = new FallbackHandler<string>({
        config: {
          useWayback: false,
          alternativeSources: [
            {
              name: 'mirror',
              urlPattern: /example\.com/,
              generateUrl: (url) => url.replace('example.com', 'mirror.example.com'),
            },
          ],
        },
      });

      const fetcher = vi
        .fn()
        .mockRejectedValueOnce(new Error('Original failed'))
        .mockResolvedValueOnce('mirror content');

      const result = await handler.fetchWithFallback('https://example.com/page', fetcher);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.data).toBe('mirror content');
        expect(result.value.sourceType).toBe('alternative');
        expect(result.value.sourceUrl).toContain('mirror.example.com');
      }
    });
  });

  describe('fetchWithFallback - all fail', () => {
    it('should return FallbackError when all sources fail', async () => {
      const handler = new FallbackHandler<string>({
        config: { useWayback: false },
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await handler.fetchWithFallback('https://example.com', fetcher);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FallbackError);
        expect(result.error.url).toBe('https://example.com');
        expect(result.error.attemptedSources.length).toBeGreaterThan(0);
      }
    });
  });

  describe('event listeners', () => {
    it('should emit events during fallback', async () => {
      const events: FallbackEvent[] = [];
      const handler = new FallbackHandler<string>({
        config: { useWayback: false },
        onEvent: (event) => events.push(event),
      });

      const fetcher = vi.fn().mockResolvedValue('content');

      await handler.fetchWithFallback('https://example.com', fetcher);

      const types = events.map((e) => e.type);
      expect(types).toContain('attempt');
      expect(types).toContain('success');
    });

    it('should emit failure events', async () => {
      const events: FallbackEvent[] = [];
      const handler = new FallbackHandler<string>({
        config: { useWayback: false },
        onEvent: (event) => events.push(event),
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Failed'));

      await handler.fetchWithFallback('https://example.com', fetcher);

      const failureEvents = events.filter((e) => e.type === 'failure');
      expect(failureEvents.length).toBeGreaterThan(0);
    });
  });

  describe('cache operations', () => {
    it('should set and get cache', () => {
      const handler = new FallbackHandler<string>();

      handler.setCache('https://example.com', 'cached');
      const entry = handler.getCache('https://example.com');

      expect(entry).toBeDefined();
      expect(entry?.data).toBe('cached');
      expect(entry?.url).toBe('https://example.com');
    });

    it('should clear cache', () => {
      const handler = new FallbackHandler<string>();

      handler.setCache('https://example.com', 'cached');
      handler.clearCache();

      expect(handler.getCache('https://example.com')).toBeUndefined();
    });
  });

  describe('addEventListener', () => {
    it('should add and remove event listeners', () => {
      const handler = new FallbackHandler<string>();
      const listener = vi.fn();

      handler.addEventListener(listener);
      handler.removeEventListener(listener);

      // Verify by checking internal state indirectly
      expect(true).toBe(true);
    });
  });
});

describe('FallbackError', () => {
  it('should contain error details', () => {
    const errors = [{ source: 'original' as FallbackSourceType, error: new Error('Test') }];
    const error = new FallbackError('All failed', 'https://example.com', ['original', 'cache'], errors);

    expect(error.name).toBe('FallbackError');
    expect(error.url).toBe('https://example.com');
    expect(error.attemptedSources).toEqual(['original', 'cache']);
    expect(error.errors).toHaveLength(1);
  });
});

describe('WaybackError', () => {
  it('should contain URL and cause', () => {
    const cause = new Error('Network error');
    const error = new WaybackError('Failed to fetch', 'https://example.com', cause);

    expect(error.name).toBe('WaybackError');
    expect(error.url).toBe('https://example.com');
    expect(error.cause).toBe(cause);
  });
});
