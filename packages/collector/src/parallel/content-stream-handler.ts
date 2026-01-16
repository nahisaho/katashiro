/**
 * ContentStreamHandler - コンテンツストリーミング処理
 *
 * @requirement REQ-DR-W-002 10MB制限
 * @task TASK-050
 */

import {
  ContentStreamConfig,
  ContentStreamConfigSchema,
  DEFAULT_CONTENT_STREAM_CONFIG,
} from './types.js';

/**
 * ストリーミング結果
 */
export interface StreamResult {
  /** コンテンツ */
  content: Buffer;
  /** コンテンツサイズ（バイト） */
  size: number;
  /** 切り詰められたか */
  truncated: boolean;
  /** Content-Type */
  contentType?: string;
  /** 処理時間（ミリ秒） */
  durationMs: number;
}

/**
 * ストリームソース
 */
export interface StreamSource {
  /** ReadableStream または AsyncIterable */
  stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
  /** Content-Type */
  contentType?: string;
  /** Content-Length（既知の場合） */
  contentLength?: number;
}

/**
 * コンテンツストリームハンドラー
 *
 * @example
 * ```typescript
 * const handler = new ContentStreamHandler({
 *   maxSizeBytes: 10 * 1024 * 1024, // 10MB
 * });
 *
 * // Responseからストリーミング読み取り
 * const response = await fetch(url);
 * const result = await handler.readFromResponse(response);
 *
 * if (result.truncated) {
 *   console.log('Content was truncated');
 * }
 * ```
 */
export class ContentStreamHandler {
  private readonly config: ContentStreamConfig;

  constructor(config: Partial<ContentStreamConfig> = {}) {
    this.config = ContentStreamConfigSchema.parse({
      ...DEFAULT_CONTENT_STREAM_CONFIG,
      ...config,
    });
  }

  /**
   * Responseからコンテンツを読み取り
   *
   * @param response Fetchレスポンス
   * @returns ストリーミング結果
   */
  async readFromResponse(response: Response): Promise<StreamResult> {
    const startTime = Date.now();
    const contentType = response.headers.get('content-type') ?? undefined;
    const contentLength = response.headers.get('content-length');
    const expectedSize = contentLength ? parseInt(contentLength, 10) : undefined;

    // Content-Lengthが制限を超えている場合は早期終了
    if (expectedSize && expectedSize > this.config.maxSizeBytes) {
      const buffer = await this.readWithLimit(
        response.body as ReadableStream<Uint8Array>,
        this.config.maxSizeBytes
      );

      return {
        content: buffer,
        size: buffer.length,
        truncated: true,
        contentType,
        durationMs: Date.now() - startTime,
      };
    }

    if (!response.body) {
      return {
        content: Buffer.alloc(0),
        size: 0,
        truncated: false,
        contentType,
        durationMs: Date.now() - startTime,
      };
    }

    const buffer = await this.readWithLimit(
      response.body,
      this.config.maxSizeBytes
    );

    return {
      content: buffer,
      size: buffer.length,
      truncated: buffer.length >= this.config.maxSizeBytes,
      contentType,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * StreamSourceからコンテンツを読み取り
   *
   * @param source ストリームソース
   * @returns ストリーミング結果
   */
  async readFromSource(source: StreamSource): Promise<StreamResult> {
    const startTime = Date.now();

    // Content-Lengthが制限を超えている場合は早期終了
    if (source.contentLength && source.contentLength > this.config.maxSizeBytes) {
      const buffer = await this.readStreamWithLimit(
        source.stream,
        this.config.maxSizeBytes
      );

      return {
        content: buffer,
        size: buffer.length,
        truncated: true,
        contentType: source.contentType,
        durationMs: Date.now() - startTime,
      };
    }

    const buffer = await this.readStreamWithLimit(
      source.stream,
      this.config.maxSizeBytes
    );

    return {
      content: buffer,
      size: buffer.length,
      truncated: buffer.length >= this.config.maxSizeBytes,
      contentType: source.contentType,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Bufferからコンテンツを読み取り（サイズ制限付き）
   *
   * @param buffer 入力バッファ
   * @returns ストリーミング結果
   */
  readFromBuffer(buffer: Buffer, contentType?: string): StreamResult {
    const startTime = Date.now();

    if (buffer.length <= this.config.maxSizeBytes) {
      return {
        content: buffer,
        size: buffer.length,
        truncated: false,
        contentType,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      content: buffer.subarray(0, this.config.maxSizeBytes),
      size: this.config.maxSizeBytes,
      truncated: true,
      contentType,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 文字列からコンテンツを読み取り（サイズ制限付き）
   *
   * @param text 入力文字列
   * @returns ストリーミング結果
   */
  readFromString(text: string, contentType?: string): StreamResult {
    return this.readFromBuffer(Buffer.from(text, 'utf-8'), contentType);
  }

  /**
   * チャンクを生成するAsyncGenerator
   *
   * @param source ストリームソース
   * @yields チャンク
   */
  async *streamChunks(
    source: StreamSource
  ): AsyncGenerator<{ chunk: Buffer; totalSize: number; isLast: boolean }> {
    let totalSize = 0;
    const maxSize = this.config.maxSizeBytes;

    if (this.isReadableStream(source.stream)) {
      const reader = source.stream.getReader();

      try {
        while (totalSize < maxSize) {
          const { done, value } = await reader.read();

          if (done) {
            yield { chunk: Buffer.alloc(0), totalSize, isLast: true };
            break;
          }

          const chunk = Buffer.from(value);
          const remaining = maxSize - totalSize;

          if (chunk.length > remaining) {
            // 制限超過 - 切り詰め
            yield { chunk: chunk.subarray(0, remaining), totalSize: maxSize, isLast: true };
            break;
          }

          totalSize += chunk.length;
          yield { chunk, totalSize, isLast: false };
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // AsyncIterable
      for await (const value of source.stream) {
        if (totalSize >= maxSize) {
          yield { chunk: Buffer.alloc(0), totalSize, isLast: true };
          break;
        }

        const chunk = Buffer.from(value);
        const remaining = maxSize - totalSize;

        if (chunk.length > remaining) {
          yield { chunk: chunk.subarray(0, remaining), totalSize: maxSize, isLast: true };
          break;
        }

        totalSize += chunk.length;
        yield { chunk, totalSize, isLast: false };
      }

      yield { chunk: Buffer.alloc(0), totalSize, isLast: true };
    }
  }

  /**
   * コンテンツサイズをチェック
   *
   * @param size コンテンツサイズ
   * @returns 制限内かどうか
   */
  isWithinLimit(size: number): boolean {
    return size <= this.config.maxSizeBytes;
  }

  /**
   * 最大サイズを取得
   */
  get maxSizeBytes(): number {
    return this.config.maxSizeBytes;
  }

  /**
   * 設定を取得
   */
  getConfig(): ContentStreamConfig {
    return { ...this.config };
  }

  /**
   * ReadableStreamかどうか判定
   */
  private isReadableStream(
    stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>
  ): stream is ReadableStream<Uint8Array> {
    return 'getReader' in stream && typeof stream.getReader === 'function';
  }

  /**
   * ReadableStreamから制限付きで読み取り
   */
  private async readWithLimit(
    stream: ReadableStream<Uint8Array>,
    maxSize: number
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const reader = stream.getReader();

    try {
      while (totalSize < maxSize) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = Buffer.from(value);
        const remaining = maxSize - totalSize;

        if (chunk.length > remaining) {
          chunks.push(chunk.subarray(0, remaining));
          totalSize = maxSize;
          break;
        }

        chunks.push(chunk);
        totalSize += chunk.length;
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  /**
   * 汎用ストリームから制限付きで読み取り
   */
  private async readStreamWithLimit(
    stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
    maxSize: number
  ): Promise<Buffer> {
    if (this.isReadableStream(stream)) {
      return this.readWithLimit(stream, maxSize);
    }

    // AsyncIterable
    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const value of stream) {
      if (totalSize >= maxSize) {
        break;
      }

      const chunk = Buffer.from(value);
      const remaining = maxSize - totalSize;

      if (chunk.length > remaining) {
        chunks.push(chunk.subarray(0, remaining));
        totalSize = maxSize;
        break;
      }

      chunks.push(chunk);
      totalSize += chunk.length;
    }

    return Buffer.concat(chunks);
  }
}

/**
 * ContentStreamHandlerインスタンスを作成するファクトリ関数
 */
export function createContentStreamHandler(config?: Partial<ContentStreamConfig>): ContentStreamHandler {
  return new ContentStreamHandler(config);
}
