/**
 * Document Chunker - ドキュメント分割
 *
 * @requirement REQ-RAG-003
 * @design DES-KATASHIRO-003-RAG §3.3
 */

import type { Chunk, ChunkingConfig, Document } from '../types.js';

/**
 * デフォルトチャンキング設定
 */
const DEFAULT_CONFIG: Required<ChunkingConfig> = {
  strategy: 'fixed',
  chunkSize: 512,
  chunkOverlap: 64,
  separators: ['\n\n', '\n', '. ', ' '],
};

/**
 * ドキュメントをチャンクに分割するクラス
 */
export class DocumentChunker {
  private config: Required<ChunkingConfig>;

  constructor(config: ChunkingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ドキュメントをチャンクに分割
   */
  chunk(document: Document): Chunk[] {
    const text = document.content;

    switch (this.config.strategy) {
      case 'sentence':
        return this.chunkBySentence(document, text);
      case 'paragraph':
        return this.chunkByParagraph(document, text);
      case 'fixed':
      default:
        return this.chunkByFixed(document, text);
    }
  }

  /**
   * 複数ドキュメントをチャンクに分割
   */
  chunkBatch(documents: Document[]): Chunk[] {
    return documents.flatMap((doc) => this.chunk(doc));
  }

  /**
   * 固定サイズでチャンク分割
   */
  private chunkByFixed(document: Document, text: string): Chunk[] {
    const chunks: Chunk[] = [];
    const { chunkSize, chunkOverlap } = this.config;
    // strideが最低でも1になるように保証（無限ループ防止）
    const stride = Math.max(1, chunkSize - chunkOverlap);

    let position = 0;
    let index = 0;

    while (position < text.length) {
      const content = text.slice(position, position + chunkSize);

      if (content.trim().length > 0) {
        chunks.push(this.createChunk(document, content, index, position));
        index++;
      }

      position += stride;
    }

    return chunks;
  }

  /**
   * 文単位でチャンク分割
   */
  private chunkBySentence(document: Document, text: string): Chunk[] {
    const chunks: Chunk[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    // 文に分割（句点またはピリオドで分割）
    const sentences = this.splitBySentence(text);

    let currentChunk = '';
    let currentPosition = 0;
    let index = 0;
    let overlapBuffer = '';

    for (const sentence of sentences) {
      // チャンクサイズを超える場合
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(document, currentChunk.trim(), index, currentPosition));
        index++;

        // オーバーラップ用のバッファを保持
        overlapBuffer = this.getOverlapText(currentChunk, chunkOverlap);
        currentPosition += currentChunk.length - overlapBuffer.length;
        currentChunk = overlapBuffer;
      }

      currentChunk += sentence;
    }

    // 残りを追加
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(document, currentChunk.trim(), index, currentPosition));
    }

    return chunks;
  }

  /**
   * 段落単位でチャンク分割
   */
  private chunkByParagraph(document: Document, text: string): Chunk[] {
    const chunks: Chunk[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    // 段落に分割
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    let currentChunk = '';
    let currentPosition = 0;
    let index = 0;
    let overlapBuffer = '';

    for (const paragraph of paragraphs) {
      const paragraphWithSeparator = paragraph + '\n\n';

      // チャンクサイズを超える場合
      if (currentChunk.length + paragraphWithSeparator.length > chunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(document, currentChunk.trim(), index, currentPosition));
        index++;

        overlapBuffer = this.getOverlapText(currentChunk, chunkOverlap);
        currentPosition += currentChunk.length - overlapBuffer.length;
        currentChunk = overlapBuffer;
      }

      currentChunk += paragraphWithSeparator;
    }

    // 残りを追加
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(document, currentChunk.trim(), index, currentPosition));
    }

    return chunks;
  }

  /**
   * 文に分割
   */
  private splitBySentence(text: string): string[] {
    // 日本語と英語の両方に対応
    const pattern = /([^。.!?！？]+[。.!?！？]+\s*)/g;
    const matches = text.match(pattern);

    if (!matches) {
      return [text];
    }

    // マッチしなかった残りを追加
    const matched = matches.join('');
    if (matched.length < text.length) {
      const remaining = text.slice(matched.length);
      if (remaining.trim().length > 0) {
        matches.push(remaining);
      }
    }

    return matches;
  }

  /**
   * オーバーラップテキストを取得
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    return text.slice(-overlapSize);
  }

  /**
   * チャンクを作成
   */
  private createChunk(document: Document, content: string, index: number, position: number): Chunk {
    return {
      id: `${document.id}_chunk_${index}`,
      documentId: document.id,
      content,
      metadata: {
        ...document.metadata,
        chunkIndex: index,
        startPosition: position,
        endPosition: position + content.length,
      },
    };
  }
}
