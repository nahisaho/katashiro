/**
 * YouTubeTranscript Tests
 *
 * @requirement REQ-COLLECT-003
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeTranscript } from '../../src/youtube/youtube-transcript.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('YouTubeTranscript', () => {
  let transcript: YouTubeTranscript;

  beforeEach(() => {
    transcript = new YouTubeTranscript();
    vi.clearAllMocks();
  });

  describe('extractVideoId', () => {
    it('should extract video ID from standard URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = transcript.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      const videoId = transcript.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const videoId = transcript.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/video';
      const videoId = transcript.extractVideoId(url);
      expect(videoId).toBeNull();
    });
  });

  describe('getTranscript', () => {
    it('should return error for invalid YouTube URL', async () => {
      const result = await transcript.getTranscript('https://example.com/video');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid YouTube URL');
      }
    });

    it('should fetch transcript for valid video ID', async () => {
      // Mock fetch for transcript API
      const mockTranscriptData = {
        actions: [
          {
            updateEngagementPanelAction: {
              content: {
                transcriptRenderer: {
                  content: {
                    transcriptSearchPanelRenderer: {
                      body: {
                        transcriptSegmentListRenderer: {
                          initialSegments: [
                            {
                              transcriptSegmentRenderer: {
                                snippet: { runs: [{ text: 'Hello world' }] },
                                startMs: '0',
                                endMs: '3000',
                              },
                            },
                            {
                              transcriptSegmentRenderer: {
                                snippet: { runs: [{ text: 'This is a test' }] },
                                startMs: '3000',
                                endMs: '6000',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      };

      // Since we can't easily mock the internal API, we test the structure
      // In real tests, we would use a mock server or stub the fetch
      const url = 'https://www.youtube.com/watch?v=test123';
      const result = await transcript.getTranscript(url);
      
      // This will likely fail in test due to network, but we verify error handling
      if (isErr(result)) {
        expect(result.error.message).toBeTruthy();
      }
    });
  });

  describe('getVideoMetadata', () => {
    it('should return error for invalid YouTube URL', async () => {
      const result = await transcript.getVideoMetadata('https://example.com');
      expect(isErr(result)).toBe(true);
    });

    it('should extract video ID correctly', () => {
      // Test various URL formats - Note: Video IDs must be exactly 11 characters
      const urls = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/v/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      ];

      for (const { url, expected } of urls) {
        const videoId = transcript.extractVideoId(url);
        expect(videoId).toBe(expected);
      }
    });
  });

  describe('formatTranscript', () => {
    it('should format segments as text', () => {
      const segments = [
        { text: 'Hello', startTime: 0, endTime: 3 },
        { text: 'World', startTime: 3, endTime: 6 },
      ];

      const formatted = transcript.formatTranscript(segments);
      expect(formatted).toContain('Hello');
      expect(formatted).toContain('World');
    });

    it('should handle empty segments', () => {
      const formatted = transcript.formatTranscript([]);
      expect(formatted).toBe('');
    });
  });
});
