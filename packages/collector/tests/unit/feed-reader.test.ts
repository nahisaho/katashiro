/**
 * FeedReader Tests
 *
 * @requirement REQ-COLLECT-005
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-013
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedReader } from '../../src/feed/feed-reader.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('FeedReader', () => {
  let feedReader: FeedReader;

  beforeEach(() => {
    feedReader = new FeedReader();
    vi.clearAllMocks();
  });

  describe('parseFeed', () => {
    it('should parse valid RSS 2.0 feed', async () => {
      const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <link>https://example.com</link>
            <description>A test feed</description>
            <item>
              <title>Article 1</title>
              <link>https://example.com/article1</link>
              <description>First article</description>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Article 2</title>
              <link>https://example.com/article2</link>
              <description>Second article</description>
            </item>
          </channel>
        </rss>`;

      const result = feedReader.parseFeed(rssFeed, 'rss');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.title).toBe('Test Feed');
        expect(result.value.items.length).toBe(2);
        expect(result.value.items[0].title).toBe('Article 1');
        expect(result.value.items[0].link).toBe('https://example.com/article1');
        expect(result.value.items[1].title).toBe('Article 2');
      }
    });

    it('should parse valid Atom feed', async () => {
      const atomFeed = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test Atom Feed</title>
          <link href="https://example.com"/>
          <entry>
            <title>Entry 1</title>
            <link href="https://example.com/entry1"/>
            <id>urn:uuid:1234</id>
            <updated>2024-01-01T00:00:00Z</updated>
            <summary>First entry</summary>
          </entry>
        </feed>`;

      const result = feedReader.parseFeed(atomFeed, 'atom');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.title).toBe('Test Atom Feed');
        expect(result.value.items.length).toBe(1);
        expect(result.value.items[0].title).toBe('Entry 1');
        expect(result.value.items[0].link).toBe('https://example.com/entry1');
      }
    });

    it('should return error for invalid XML', async () => {
      const invalidXml = 'not valid xml at all';
      const result = feedReader.parseFeed(invalidXml, 'rss');
      expect(isErr(result)).toBe(true);
    });

    it('should auto-detect feed type', async () => {
      const rssFeed = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><item><title>Item</title><link>https://example.com</link></item></channel></rss>`;
      const atomFeed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title><entry><title>Entry</title><link href="https://example.com"/><id>1</id><updated>2024-01-01</updated></entry></feed>`;

      const rssType = feedReader.detectFeedType(rssFeed);
      expect(rssType).toBe('rss');

      const atomType = feedReader.detectFeedType(atomFeed);
      expect(atomType).toBe('atom');
    });
  });

  describe('fetchFeed', () => {
    it('should return error for invalid URL', async () => {
      const result = await feedReader.fetchFeed('not-a-url');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid');
      }
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await feedReader.fetchFeed('https://example.com/feed.xml');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('error');
      }
    });
  });

  describe('extractContent', () => {
    it('should extract content from description', () => {
      const html = '<p>This is <b>bold</b> content</p>';
      const text = feedReader.extractTextContent(html);
      expect(text).toContain('This is bold content');
    });

    it('should handle CDATA sections', () => {
      const cdata = '<![CDATA[<p>Content in CDATA</p>]]>';
      const text = feedReader.extractTextContent(cdata);
      expect(text).toContain('Content in CDATA');
    });

    it('should return empty string for empty input', () => {
      const text = feedReader.extractTextContent('');
      expect(text).toBe('');
    });
  });
});
