/**
 * YouTubeTranscript - YouTube字幕・メタデータ取得
 *
 * @requirement REQ-COLLECT-003
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-012
 */

import {
  type Result,
  ok,
  err,
  formatTimestamp,
} from '@nahisaho/katashiro-core';
import type { IYouTubeTranscript, TranscriptSegment, MediaMetadata } from '../index.js';

/**
 * YouTube字幕・メタデータ取得実装
 */
export class YouTubeTranscript implements IYouTubeTranscript {
  private readonly userAgent = 'Mozilla/5.0 (compatible; KATASHIRO/0.1.0)';

  /**
   * YouTube URLから動画IDを抽出
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      // Standard: https://www.youtube.com/watch?v=VIDEO_ID
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      // Short: https://youtu.be/VIDEO_ID
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      // Embed: https://www.youtube.com/embed/VIDEO_ID
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      // V format: https://www.youtube.com/v/VIDEO_ID
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 字幕を取得
   */
  async getTranscript(
    url: string,
    language?: string
  ): Promise<Result<TranscriptSegment[], Error>> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      return err(new Error('Invalid YouTube URL: Could not extract video ID'));
    }

    try {
      const segments = await this.fetchTranscript(videoId, language);
      return ok(segments);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Transcript fetch error: ${message}`));
    }
  }

  /**
   * 動画メタデータを取得
   */
  async getVideoMetadata(url: string): Promise<Result<MediaMetadata, Error>> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      return err(new Error('Invalid YouTube URL: Could not extract video ID'));
    }

    try {
      const metadata = await this.fetchMetadata(videoId);
      return ok(metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new Error(`Metadata fetch error: ${message}`));
    }
  }

  /**
   * 字幕セグメントをテキストにフォーマット
   */
  formatTranscript(segments: TranscriptSegment[]): string {
    if (segments.length === 0) {
      return '';
    }

    return segments
      .map((segment) => {
        const timestamp = this.formatTime(segment.startTime);
        return `[${timestamp}] ${segment.text}`;
      })
      .join('\n');
  }

  /**
   * 秒をMM:SS形式に変換
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * YouTube APIから字幕を取得
   * Note: 本番環境ではyoutube-transcript等のライブラリ使用推奨
   */
  private async fetchTranscript(
    videoId: string,
    language?: string
  ): Promise<TranscriptSegment[]> {
    // YouTube字幕取得のため、まず動画ページを取得
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept-Language': language ?? 'en',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    // ytInitialPlayerResponse から字幕情報を抽出
    const captionsMatch = html.match(
      /"captions":\s*({.*?"captionTracks".*?})\s*,\s*"videoDetails"/s
    );

    if (!captionsMatch?.[1]) {
      throw new Error('No captions available for this video');
    }

    try {
      // 字幕トラックURLを取得
      const captionsJson = captionsMatch[1].replace(/\\"/g, '"');
      const captionUrlMatch = captionsJson.match(
        /"baseUrl":\s*"(https:[^"]+)"/
      );

      if (!captionUrlMatch?.[1]) {
        throw new Error('Could not find caption URL');
      }

      const captionUrl = captionUrlMatch[1].replace(/\\u0026/g, '&');

      // 字幕XMLを取得
      const captionResponse = await fetch(captionUrl);
      if (!captionResponse.ok) {
        throw new Error('Failed to fetch captions');
      }

      const captionXml = await captionResponse.text();
      return this.parseTranscriptXml(captionXml);
    } catch (parseError) {
      throw new Error(
        `Failed to parse captions: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 字幕XMLをパース
   */
  private parseTranscriptXml(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      const startStr = match[1];
      const durationStr = match[2];
      const textStr = match[3];
      
      if (startStr && durationStr && textStr !== undefined) {
        const startTime = parseFloat(startStr);
        const duration = parseFloat(durationStr);
        const text = this.decodeHtmlEntities(textStr);

        segments.push({
          text,
          startTime,
          endTime: startTime + duration,
        });
      }
    }

    return segments;
  }

  /**
   * HTMLエンティティをデコード
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * 動画メタデータを取得
   */
  private async fetchMetadata(videoId: string): Promise<MediaMetadata> {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    // ytInitialPlayerResponse からメタデータを抽出
    const title = this.extractMetaContent(html, 'title') ?? 'Unknown';
    const description = this.extractMetaContent(html, 'description') ?? '';
    const thumbnailUrl = this.extractMetaContent(html, 'thumbnailUrl');

    // 再生時間を抽出
    const durationMatch = html.match(/"lengthSeconds":\s*"(\d+)"/);
    const duration = durationMatch?.[1] ? parseInt(durationMatch[1], 10) : undefined;

    return {
      type: 'video',
      title,
      description,
      thumbnailUrl: thumbnailUrl ?? undefined,
      duration,
      sourceUrl: videoPageUrl,
      fetchedAt: formatTimestamp(),
    };
  }

  /**
   * メタタグからコンテンツを抽出
   */
  private extractMetaContent(html: string, property: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+property="og:${property}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+name="${property}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+itemprop="${property}"[^>]+content="([^"]*)"`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return this.decodeHtmlEntities(match[1]);
      }
    }

    // タイトルは<title>タグからも取得
    if (property === 'title') {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        return titleMatch[1].replace(/ - YouTube$/, '').trim();
      }
    }

    return null;
  }
}
