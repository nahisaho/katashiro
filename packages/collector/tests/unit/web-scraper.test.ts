/**
 * WebScraper ユニットテスト
 *
 * @requirement REQ-COLLECT-002
 * @task TSK-011
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebScraper } from '../../src/scraper/web-scraper.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('WebScraper', () => {
  let scraper: WebScraper;

  beforeEach(() => {
    scraper = new WebScraper();
  });

  describe('scrape', () => {
    it('should scrape content from valid URL', async () => {
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Hello World</h1>
            <p>This is test content.</p>
          </body>
        </html>
      `;

      vi.spyOn(scraper as any, 'fetchPage').mockResolvedValue(mockHtml);

      const result = await scraper.scrape('https://example.com');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.title).toBe('Test Page');
        expect(result.value.content).toContain('Hello World');
        expect(result.value.url).toBe('https://example.com');
      }
    });

    it('should return error for invalid URL', async () => {
      const result = await scraper.scrape('not-a-valid-url');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid');
      }
    });

    it('should extract images when option enabled', async () => {
      const mockHtml = `
        <html>
          <body>
            <img src="https://example.com/image1.jpg" />
            <img src="https://example.com/image2.png" />
          </body>
        </html>
      `;

      vi.spyOn(scraper as any, 'fetchPage').mockResolvedValue(mockHtml);

      const result = await scraper.scrape('https://example.com', {
        extractImages: true,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.images).toBeDefined();
        expect(result.value.images?.length).toBe(2);
      }
    });

    it('should extract links when option enabled', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="https://example.com/page1">Link 1</a>
            <a href="https://example.com/page2">Link 2</a>
          </body>
        </html>
      `;

      vi.spyOn(scraper as any, 'fetchPage').mockResolvedValue(mockHtml);

      const result = await scraper.scrape('https://example.com', {
        extractLinks: true,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.links).toBeDefined();
        expect(result.value.links?.length).toBe(2);
      }
    });

    it('should handle network errors', async () => {
      vi.spyOn(scraper as any, 'fetchPage').mockRejectedValue(
        new Error('Network error')
      );

      const result = await scraper.scrape('https://example.com');

      expect(isErr(result)).toBe(true);
    });

    it('should clean HTML content', async () => {
      const mockHtml = `
        <html>
          <body>
            <script>alert('bad')</script>
            <style>.hidden{}</style>
            <p>Clean content</p>
          </body>
        </html>
      `;

      vi.spyOn(scraper as any, 'fetchPage').mockResolvedValue(mockHtml);

      const result = await scraper.scrape('https://example.com');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).not.toContain('script');
        expect(result.value.content).not.toContain('style');
        expect(result.value.content).toContain('Clean content');
      }
    });
  });
});
