/**
 * RobotsParser 単体テスト
 *
 * @requirement REQ-DR-W-003 - robots.txt違反の禁止
 * @task TASK-033
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RobotsParser,
  RobotsConfigSchema,
  DEFAULT_ROBOTS_CONFIG,
} from '../../src/robots/index.js';

describe('RobotsConfigSchema', () => {
  it('should validate default config', () => {
    const result = RobotsConfigSchema.safeParse(DEFAULT_ROBOTS_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for empty input', () => {
    const result = RobotsConfigSchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.cacheTtlMs).toBe(3600000);
    expect(result.userAgent).toBe('KATASHIRO');
  });

  it('should validate cacheTtlMs range', () => {
    const tooShort = RobotsConfigSchema.safeParse({ cacheTtlMs: 1000 });
    expect(tooShort.success).toBe(false);

    const tooLong = RobotsConfigSchema.safeParse({ cacheTtlMs: 100000000 });
    expect(tooLong.success).toBe(false);

    const valid = RobotsConfigSchema.safeParse({ cacheTtlMs: 3600000 });
    expect(valid.success).toBe(true);
  });
});

describe('RobotsParser', () => {
  let parser: RobotsParser;

  beforeEach(() => {
    parser = new RobotsParser();
  });

  afterEach(() => {
    parser.clearCache();
  });

  describe('parse', () => {
    it('should parse simple robots.txt', () => {
      const content = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
`;
      const rules = parser.parse(content);
      expect(rules).toHaveLength(1);
      expect(rules[0]?.userAgent).toBe('*');
      expect(rules[0]?.disallow).toContain('/admin/');
      expect(rules[0]?.disallow).toContain('/private/');
      expect(rules[0]?.allow).toContain('/public/');
    });

    it('should parse multiple user-agents', () => {
      const content = `
User-agent: Googlebot
Disallow: /nogoogle/

User-agent: *
Disallow: /private/
`;
      const rules = parser.parse(content);
      expect(rules).toHaveLength(2);
      expect(rules[0]?.userAgent).toBe('Googlebot');
      expect(rules[1]?.userAgent).toBe('*');
    });

    it('should parse Crawl-delay', () => {
      const content = `
User-agent: *
Disallow: /slow/
Crawl-delay: 10
`;
      const rules = parser.parse(content);
      expect(rules[0]?.crawlDelay).toBe(10);
    });

    it('should cap Crawl-delay at maxCrawlDelaySec', () => {
      const strictParser = new RobotsParser({ maxCrawlDelaySec: 5 });
      const content = `
User-agent: *
Crawl-delay: 100
`;
      const rules = strictParser.parse(content);
      expect(rules[0]?.crawlDelay).toBe(5);
    });

    it('should parse Sitemap', () => {
      const content = `
User-agent: *
Disallow:

Sitemap: https://example.com/sitemap.xml
`;
      const rules = parser.parse(content);
      expect(rules[0]?.sitemaps).toContain('https://example.com/sitemap.xml');
    });

    it('should ignore comments', () => {
      const content = `
# This is a comment
User-agent: * # another comment
Disallow: /secret/ # hidden path
`;
      const rules = parser.parse(content);
      expect(rules[0]?.userAgent).toBe('*');
      expect(rules[0]?.disallow).toContain('/secret/');
    });

    it('should handle empty robots.txt', () => {
      const rules = parser.parse('');
      expect(rules).toHaveLength(0);
    });
  });

  describe('isAllowed', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should allow when robots.txt is disabled', async () => {
      const disabledParser = new RobotsParser({ enabled: false });
      const result = await disabledParser.isAllowed('https://example.com/admin/');
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('disabled');
    });

    it('should allow when no matching rule exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: Googlebot\nDisallow: /private/',
      });

      const result = await parser.isAllowed('https://example.com/public/');
      expect(result.allowed).toBe(true);
    });

    it('should disallow matching path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /admin/',
      });

      const result = await parser.isAllowed('https://example.com/admin/users');
      expect(result.allowed).toBe(false);
      expect(result.matchedRule?.pattern).toBe('/admin/');
    });

    it('should prioritize Allow over Disallow for same path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
User-agent: *
Disallow: /api/
Allow: /api/public/
`,
      });

      const result = await parser.isAllowed('https://example.com/api/public/data');
      expect(result.allowed).toBe(true);
    });

    it('should handle 404 as allow all', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await parser.isAllowed('https://example.com/anything');
      expect(result.allowed).toBe(true);
    });

    it('should handle network errors based on config', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // デフォルトは'allow'
      const result = await parser.isAllowed('https://example.com/page');
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('fetch failed');
    });

    it('should deny on fetch error when configured', async () => {
      const strictParser = new RobotsParser({ onFetchError: 'deny' });
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await strictParser.isAllowed('https://example.com/page');
      expect(result.allowed).toBe(false);
    });

    it('should use cache for repeated requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /private/',
      });

      await parser.isAllowed('https://example.com/page1');
      const result2 = await parser.isAllowed('https://example.com/page2');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result2.fromCache).toBe(true);
    });

    it('should match specific User-Agent before wildcard', async () => {
      const katashiroParser = new RobotsParser({ userAgent: 'KATASHIRO' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
User-agent: KATASHIRO
Disallow: /katashiro-only/

User-agent: *
Disallow: /general/
`,
      });

      const result = await katashiroParser.isAllowed('https://example.com/katashiro-only/');
      expect(result.allowed).toBe(false);
      expect(result.matchedRule?.userAgent).toBe('KATASHIRO');
    });
  });

  describe('getCrawlDelay', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return Crawl-delay', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nCrawl-delay: 5',
      });

      const delay = await parser.getCrawlDelay('https://example.com/page');
      expect(delay).toBe(5);
    });

    it('should return undefined when not set', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /private/',
      });

      const delay = await parser.getCrawlDelay('https://example.com/page');
      expect(delay).toBeUndefined();
    });

    it('should return undefined when respectCrawlDelay is false', async () => {
      const noDelayParser = new RobotsParser({ respectCrawlDelay: false });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nCrawl-delay: 10',
      });

      const delay = await noDelayParser.getCrawlDelay('https://example.com/page');
      expect(delay).toBeUndefined();
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow:',
      });

      await parser.isAllowed('https://example.com/page');
      expect(parser.getCacheSize()).toBe(1);

      parser.clearCache();
      expect(parser.getCacheSize()).toBe(0);

      global.fetch = originalFetch;
    });

    it('should invalidate specific domain cache', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow:',
      });

      await parser.isAllowed('https://example1.com/page');
      await parser.isAllowed('https://example2.com/page');
      expect(parser.getCacheSize()).toBe(2);

      parser.invalidateCache('https://example1.com');
      expect(parser.getCacheSize()).toBe(1);

      global.fetch = originalFetch;
    });
  });

  describe('path matching', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should match exact path with $', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /exact$',
      });

      const exactMatch = await parser.isAllowed('https://example.com/exact');
      expect(exactMatch.allowed).toBe(false);

      parser.clearCache();
      const prefixMatch = await parser.isAllowed('https://example.com/exact/sub');
      expect(prefixMatch.allowed).toBe(true);
    });

    it('should match wildcard patterns', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /*.pdf',
      });

      const pdfMatch = await parser.isAllowed('https://example.com/docs/file.pdf');
      expect(pdfMatch.allowed).toBe(false);

      parser.clearCache();
      const htmlMatch = await parser.isAllowed('https://example.com/docs/file.html');
      expect(htmlMatch.allowed).toBe(true);
    });
  });
});
