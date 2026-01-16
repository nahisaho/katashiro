/**
 * @fileoverview ContentStreamHandlerモジュールのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContentStreamHandler,
  createContentStreamHandler,
} from '../../src/parallel/content-stream-handler';

describe('ContentStreamHandler', () => {
  let handler: ContentStreamHandler;

  beforeEach(() => {
    handler = createContentStreamHandler({
      maxSizeBytes: 1024 * 1024, // 1MB for testing
      chunkSizeBytes: 1024,
    });
  });

  describe('createContentStreamHandler', () => {
    it('デフォルト設定で作成する', () => {
      const h = createContentStreamHandler();
      expect(h).toBeDefined();
    });

    it('カスタム設定で作成する', () => {
      const h = createContentStreamHandler({
        maxSizeBytes: 5 * 1024 * 1024,
        chunkSizeBytes: 4096,
        timeoutMs: 60000,
      });
      expect(h).toBeDefined();
    });
  });

  describe('readFromString', () => {
    it('文字列からコンテンツを読み込む', () => {
      const content = 'Hello, World!';
      const result = handler.readFromString(content);

      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.content.toString()).toBe(content);
      expect(result.size).toBe(Buffer.byteLength(content));
      expect(result.truncated).toBe(false);
    });

    it('サイズ制限を超えると切り詰める', () => {
      const smallHandler = createContentStreamHandler({
        maxSizeBytes: 1024, // 最小値
        chunkSizeBytes: 1024,
      });

      const content = 'A'.repeat(2048);
      const result = smallHandler.readFromString(content);

      expect(result.size).toBeLessThanOrEqual(1024);
      expect(result.truncated).toBe(true);
    });
  });

  describe('readFromBuffer', () => {
    it('Bufferからコンテンツを読み込む', () => {
      const buffer = Buffer.from('Binary content');
      const result = handler.readFromBuffer(buffer);

      expect(result.content.toString()).toBe('Binary content');
      expect(result.size).toBe(buffer.length);
    });

    it('サイズ制限を超えると切り詰める', () => {
      const smallHandler = createContentStreamHandler({
        maxSizeBytes: 1024, // 最小値
        chunkSizeBytes: 1024,
      });

      const buffer = Buffer.from('A'.repeat(2048));
      const result = smallHandler.readFromBuffer(buffer);

      expect(result.size).toBeLessThanOrEqual(1024);
      expect(result.truncated).toBe(true);
    });
  });

  describe('isWithinLimit', () => {
    it('有効なサイズを検証する', () => {
      expect(handler.isWithinLimit(1000)).toBe(true);
      expect(handler.isWithinLimit(1024 * 1024)).toBe(true);
    });

    it('制限を超えるサイズを拒否する', () => {
      expect(handler.isWithinLimit(2 * 1024 * 1024)).toBe(false);
    });
  });

  describe('maxSizeBytes', () => {
    it('最大サイズを取得する', () => {
      expect(handler.maxSizeBytes).toBe(1024 * 1024);
    });
  });

  describe('getConfig', () => {
    it('設定を返す', () => {
      const config = handler.getConfig();
      expect(config.maxSizeBytes).toBe(1024 * 1024);
      expect(config.chunkSizeBytes).toBe(1024);
    });
  });

  describe('10MB制限（REQ-DR-W-002）', () => {
    it('デフォルトで10MBの制限がある', () => {
      const defaultHandler = createContentStreamHandler();
      const config = defaultHandler.getConfig();
      expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('10MB以下のコンテンツは正常に処理する', () => {
      const content = 'A'.repeat(1000);
      const result = handler.readFromString(content);
      expect(result.truncated).toBe(false);
    });
  });

  describe('readFromResponse', () => {
    it('Responseからコンテンツを読み取る', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Test content'));
          controller.close();
        },
      });

      const mockResponse = {
        headers: new Headers({
          'content-type': 'text/plain',
          'content-length': '12',
        }),
        body: mockBody,
      } as Response;

      const result = await handler.readFromResponse(mockResponse);

      expect(result.content.toString()).toBe('Test content');
      expect(result.truncated).toBe(false);
      expect(result.contentType).toBe('text/plain');
    });

    it('bodyがnullの場合は空のバッファを返す', async () => {
      const mockResponse = {
        headers: new Headers({}),
        body: null,
      } as Response;

      const result = await handler.readFromResponse(mockResponse);

      expect(result.content.length).toBe(0);
      expect(result.size).toBe(0);
    });
  });

  describe('readFromSource', () => {
    it('StreamSourceからコンテンツを読み取る', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Stream content'));
          controller.close();
        },
      });

      const source = {
        stream: mockStream,
        contentType: 'text/plain',
      };

      const result = await handler.readFromSource(source);

      expect(result.content.toString()).toBe('Stream content');
      expect(result.truncated).toBe(false);
    });
  });

  describe('streamChunks', () => {
    it('ストリームソースをチャンクに分割する', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Chunk 1'));
          controller.enqueue(new TextEncoder().encode('Chunk 2'));
          controller.close();
        },
      });

      const source = { stream: mockStream };
      const chunks: Buffer[] = [];

      for await (const { chunk, isLast } of handler.streamChunks(source)) {
        if (!isLast || chunk.length > 0) {
          chunks.push(chunk);
        }
      }

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('durationMs', () => {
    it('処理時間を記録する', () => {
      const result = handler.readFromString('Test content');
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
