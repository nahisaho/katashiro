/**
 * MediaExtractor - メディア抽出・メタデータ取得
 *
 * @requirement REQ-COLLECT-006
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-015
 */

import {
  type Result,
  ok,
  err,
  formatTimestamp,
  validateUrl,
  isErr,
} from '@nahisaho/katashiro-core';
import type { IMediaExtractor, MediaMetadata } from '../index.js';

type MediaType = 'image' | 'video' | 'audio';

/**
 * HTMLから抽出されたメディア
 */
export interface ExtractedMedia {
  readonly images: string[];
  readonly videos: string[];
  readonly audio: string[];
}

/**
 * メディア抽出・メタデータ取得実装
 */
export class MediaExtractor implements IMediaExtractor {
  private readonly userAgent = 'Mozilla/5.0 (compatible; KATASHIRO/0.1.0)';

  /**
   * URLからメディアメタデータを抽出
   */
  async extractMetadata(url: string): Promise<Result<MediaMetadata, Error>> {
    const urlValidation = validateUrl(url);
    if (isErr(urlValidation)) {
      return err(new Error(`Invalid URL: ${urlValidation.error}`));
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        // Try GET if HEAD fails
        return this.extractMetadataWithGet(url);
      }

      return this.parseMetadataFromResponse(url, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Metadata extraction error: ${message}`));
    }
  }

  /**
   * GETリクエストでメタデータを抽出（HEADが失敗した場合）
   */
  private async extractMetadataWithGet(
    url: string
  ): Promise<Result<MediaMetadata, Error>> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Range: 'bytes=0-0', // Minimize download
        },
      });

      if (!response.ok && response.status !== 206) {
        return err(new Error(`HTTP error: ${response.status}`));
      }

      return this.parseMetadataFromResponse(url, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Metadata extraction error: ${message}`));
    }
  }

  /**
   * レスポンスからメタデータをパース
   */
  private parseMetadataFromResponse(
    url: string,
    response: Response
  ): Result<MediaMetadata, Error> {
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = response.headers.get('content-length');

    const mediaType = this.detectMediaType(contentType);
    if (!mediaType) {
      // Try to detect from URL
      const urlType = this.detectMediaTypeFromUrl(url);
      if (!urlType) {
        return err(new Error('Unable to determine media type'));
      }
    }

    const format =
      this.extractFormat(contentType) ?? this.extractFormatFromUrl(url);

    return ok({
      url,
      type: mediaType ?? this.detectMediaTypeFromUrl(url) ?? 'image',
      format: format ?? undefined,
      size: contentLength ? parseInt(contentLength, 10) : undefined,
      fetchedAt: formatTimestamp(),
    });
  }

  /**
   * Content-Typeからメディアタイプを検出
   */
  detectMediaType(contentType: string): MediaType | null {
    const lower = contentType.toLowerCase();

    if (lower.startsWith('image/')) {
      return 'image';
    }
    if (lower.startsWith('video/')) {
      return 'video';
    }
    if (lower.startsWith('audio/')) {
      return 'audio';
    }

    return null;
  }

  /**
   * URLからメディアタイプを検出
   */
  private detectMediaTypeFromUrl(url: string): MediaType | null {
    const ext = this.extractFormatFromUrl(url)?.toLowerCase();
    if (!ext) return null;

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];

    if (imageExtensions.includes(ext)) return 'image';
    if (videoExtensions.includes(ext)) return 'video';
    if (audioExtensions.includes(ext)) return 'audio';

    return null;
  }

  /**
   * Content-Typeからフォーマットを抽出
   */
  extractFormat(contentType: string): string | null {
    const match = contentType.match(/^(?:image|video|audio)\/([^;]+)/);
    return match?.[1] ?? null;
  }

  /**
   * URLから拡張子を抽出
   */
  extractFormatFromUrl(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * HTMLからメディアURLを抽出
   */
  extractFromHtml(html: string, baseUrl: string): ExtractedMedia {
    const images = this.extractImages(html, baseUrl);
    const videos = this.extractVideos(html, baseUrl);
    const audio = this.extractAudio(html, baseUrl);

    return { images, videos, audio };
  }

  /**
   * HTMLから画像URLを抽出
   */
  private extractImages(html: string, baseUrl: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    // img src
    const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          images.push(url);
        }
      }
    }

    // img srcset
    const srcsetRegex = /<img[^>]+srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(html)) !== null) {
      if (match[1]) {
        const srcset = match[1];
        const urls = srcset.split(',').map((s) => s.trim().split(/\s+/)[0]);
        for (const src of urls) {
          if (src) {
            const url = this.resolveUrl(src, baseUrl);
            if (!seen.has(url)) {
              seen.add(url);
              images.push(url);
            }
          }
        }
      }
    }

    // picture source
    const sourceRegex = /<source[^>]+srcset=["']([^"']+)["']/gi;
    while ((match = sourceRegex.exec(html)) !== null) {
      if (match[1]) {
        const srcsetParts = match[1].split(',')[0]?.trim().split(/\s+/);
        const src = srcsetParts?.[0];
        if (src) {
          const url = this.resolveUrl(src, baseUrl);
          if (!seen.has(url)) {
            seen.add(url);
            images.push(url);
          }
        }
      }
    }

    // background-image in style
    const bgRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
    while ((match = bgRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          images.push(url);
        }
      }
    }

    return images;
  }

  /**
   * HTMLから動画URLを抽出
   */
  private extractVideos(html: string, baseUrl: string): string[] {
    const videos: string[] = [];
    const seen = new Set<string>();

    // video src
    const videoSrcRegex = /<video[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = videoSrcRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          videos.push(url);
        }
      }
    }

    // source inside video
    const videoSourceRegex = /<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/gi;
    while ((match = videoSourceRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          videos.push(url);
        }
      }
    }

    return videos;
  }

  /**
   * HTMLから音声URLを抽出
   */
  private extractAudio(html: string, baseUrl: string): string[] {
    const audio: string[] = [];
    const seen = new Set<string>();

    // audio src
    const audioSrcRegex = /<audio[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = audioSrcRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          audio.push(url);
        }
      }
    }

    // source inside audio
    const audioSourceRegex = /<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/gi;
    while ((match = audioSourceRegex.exec(html)) !== null) {
      if (match[1]) {
        const url = this.resolveUrl(match[1], baseUrl);
        if (!seen.has(url)) {
          seen.add(url);
          audio.push(url);
        }
      }
    }

    return audio;
  }

  /**
   * 相対URLを絶対URLに変換
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}
