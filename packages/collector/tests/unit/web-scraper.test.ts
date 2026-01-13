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

  describe('scrapeMultiple', () => {
    it('should scrape multiple URLs in parallel', async () => {
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body><p>Content</p></body>
        </html>
      `;

      vi.spyOn(scraper as any, 'fetchPage').mockResolvedValue(mockHtml);

      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ];

      const results = await scraper.scrapeMultiple(urls);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(isOk(result)).toBe(true);
      });
    });

    it('should handle mixed success and failure', async () => {
      let callCount = 0;
      vi.spyOn(scraper as any, 'fetchPage').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve('<html><head><title>Test</title></head></html>');
      });

      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ];

      const results = await scraper.scrapeMultiple(urls);

      expect(results).toHaveLength(3);
      expect(isOk(results[0])).toBe(true);
      expect(isErr(results[1])).toBe(true);
      expect(isOk(results[2])).toBe(true);
    });

    it('should respect concurrency option', async () => {
      const callTimes: number[] = [];
      vi.spyOn(scraper as any, 'fetchPage').mockImplementation(async () => {
        callTimes.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 50));
        return '<html><head><title>Test</title></head></html>';
      });

      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
        'https://example.com/page4',
      ];

      await scraper.scrapeMultiple(urls, { concurrency: 2 });

      // With concurrency 2, pages 1-2 run together, then 3-4
      // So page3 should start after page1 finishes
      expect(callTimes[2] - callTimes[0]).toBeGreaterThanOrEqual(40);
    });

    it('should return empty array for empty input', async () => {
      const results = await scraper.scrapeMultiple([]);
      expect(results).toHaveLength(0);
    });
  });
});
