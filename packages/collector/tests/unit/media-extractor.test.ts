/**
 * MediaExtractor Tests
 *
 * @requirement REQ-COLLECT-006
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-015
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaExtractor } from '../../src/media/media-extractor.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('MediaExtractor', () => {
  let extractor: MediaExtractor;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    extractor = new MediaExtractor();
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('extractMetadata', () => {
    it('should extract image metadata', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['content-type', 'image/jpeg'],
          ['content-length', '12345'],
        ]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(12345)),
      });

      const result = await extractor.extractMetadata('https://example.com/image.jpg');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.type).toBe('image');
        expect(result.value.format).toBe('jpeg');
      }
    });

    it('should extract video metadata', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['content-type', 'video/mp4'],
          ['content-length', '1000000'],
        ]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000000)),
      });

      const result = await extractor.extractMetadata('https://example.com/video.mp4');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.type).toBe('video');
        expect(result.value.format).toBe('mp4');
      }
    });

    it('should extract audio metadata', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['content-type', 'audio/mpeg'],
          ['content-length', '500000'],
        ]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(500000)),
      });

      const result = await extractor.extractMetadata('https://example.com/audio.mp3');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.type).toBe('audio');
        expect(result.value.format).toBe('mpeg');
      }
    });

    it('should handle HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await extractor.extractMetadata('https://example.com/notfound.jpg');
      expect(isErr(result)).toBe(true);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await extractor.extractMetadata('https://example.com/image.jpg');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('detectMediaType', () => {
    it('should detect image types from content-type', () => {
      expect(extractor.detectMediaType('image/jpeg')).toBe('image');
      expect(extractor.detectMediaType('image/png')).toBe('image');
      expect(extractor.detectMediaType('image/gif')).toBe('image');
      expect(extractor.detectMediaType('image/webp')).toBe('image');
    });

    it('should detect video types from content-type', () => {
      expect(extractor.detectMediaType('video/mp4')).toBe('video');
      expect(extractor.detectMediaType('video/webm')).toBe('video');
      expect(extractor.detectMediaType('video/quicktime')).toBe('video');
    });

    it('should detect audio types from content-type', () => {
      expect(extractor.detectMediaType('audio/mpeg')).toBe('audio');
      expect(extractor.detectMediaType('audio/wav')).toBe('audio');
      expect(extractor.detectMediaType('audio/ogg')).toBe('audio');
    });

    it('should return null for unknown types', () => {
      expect(extractor.detectMediaType('text/html')).toBeNull();
      expect(extractor.detectMediaType('application/json')).toBeNull();
    });
  });

  describe('extractFormat', () => {
    it('should extract format from content-type', () => {
      expect(extractor.extractFormat('image/jpeg')).toBe('jpeg');
      expect(extractor.extractFormat('video/mp4')).toBe('mp4');
      expect(extractor.extractFormat('audio/mpeg')).toBe('mpeg');
    });

    it('should extract format from URL extension', () => {
      expect(extractor.extractFormatFromUrl('https://example.com/image.jpg')).toBe('jpg');
      expect(extractor.extractFormatFromUrl('https://example.com/video.mp4')).toBe('mp4');
      expect(extractor.extractFormatFromUrl('https://example.com/audio.mp3')).toBe('mp3');
    });

    it('should handle URLs without extension', () => {
      expect(extractor.extractFormatFromUrl('https://example.com/media')).toBeNull();
    });
  });

  describe('extractFromHtml', () => {
    it('should extract image URLs from HTML', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/image1.jpg" />
            <img src="https://example.com/image2.png" />
            <video src="https://example.com/video.mp4"></video>
          </body>
        </html>
      `;

      const media = extractor.extractFromHtml(html, 'https://example.com');
      expect(media.images).toHaveLength(2);
      expect(media.videos).toHaveLength(1);
      expect(media.images[0]).toBe('https://example.com/image1.jpg');
    });

    it('should resolve relative URLs', () => {
      const html = '<img src="/images/photo.jpg" />';
      const media = extractor.extractFromHtml(html, 'https://example.com/page');
      expect(media.images[0]).toBe('https://example.com/images/photo.jpg');
    });

    it('should extract from srcset', () => {
      const html = '<img srcset="small.jpg 300w, large.jpg 800w" />';
      const media = extractor.extractFromHtml(html, 'https://example.com');
      expect(media.images.length).toBeGreaterThan(0);
    });
  });
});
