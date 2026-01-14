/**
 * DocumentChunker Tests
 */

import { describe, it, expect } from 'vitest';
import { DocumentChunker } from '../src/index';
import type { Document } from '../src/types';

describe('DocumentChunker', () => {
  const createDoc = (content: string): Document => ({
    id: 'doc-1',
    content,
    metadata: { source: 'test' },
  });

  describe('fixed strategy', () => {
    it('should chunk by fixed size', () => {
      const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 10, chunkOverlap: 2 });
      const doc = createDoc('0123456789abcdefghij');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].content.length).toBeLessThanOrEqual(10);
    });

    it('should include overlap', () => {
      const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 10, chunkOverlap: 3 });
      const doc = createDoc('0123456789abcdefghij');
      const chunks = chunker.chunk(doc);

      // Second chunk should start 7 chars into original (10 - 3)
      expect(chunks[1].content.startsWith('789')).toBe(true);
    });

    it('should assign correct chunk ids', () => {
      const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 10, chunkOverlap: 0 });
      const doc = createDoc('0123456789abcdef');
      const chunks = chunker.chunk(doc);

      expect(chunks[0].id).toBe('doc-1_chunk_0');
      expect(chunks[1].id).toBe('doc-1_chunk_1');
    });

    it('should preserve document metadata in chunks', () => {
      const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 50 });
      const doc = createDoc('Hello world');
      const chunks = chunker.chunk(doc);

      expect(chunks[0].metadata.source).toBe('test');
      expect(chunks[0].metadata.chunkIndex).toBe(0);
    });

    it('should track positions in metadata', () => {
      const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 10, chunkOverlap: 0 });
      const doc = createDoc('0123456789abcdefghij');
      const chunks = chunker.chunk(doc);

      expect(chunks[0].metadata.startPosition).toBe(0);
      expect(chunks[0].metadata.endPosition).toBe(10);
    });
  });

  describe('sentence strategy', () => {
    it('should chunk by sentences', () => {
      const chunker = new DocumentChunker({ strategy: 'sentence', chunkSize: 50, chunkOverlap: 10 });
      const doc = createDoc('First sentence. Second sentence. Third sentence.');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle Japanese sentences', () => {
      const chunker = new DocumentChunker({ strategy: 'sentence', chunkSize: 100, chunkOverlap: 0 });
      const doc = createDoc('最初の文です。次の文です。最後の文です。');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('。');
    });

    it('should handle mixed punctuation', () => {
      const chunker = new DocumentChunker({ strategy: 'sentence', chunkSize: 100, chunkOverlap: 0 });
      const doc = createDoc('What? Really! Yes. Okay');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('paragraph strategy', () => {
    it('should chunk by paragraphs', () => {
      const chunker = new DocumentChunker({ strategy: 'paragraph', chunkSize: 100, chunkOverlap: 10 });
      const doc = createDoc('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle single paragraph', () => {
      const chunker = new DocumentChunker({ strategy: 'paragraph', chunkSize: 1000 });
      const doc = createDoc('Just one paragraph without breaks.');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Just one paragraph without breaks.');
    });

    it('should skip empty paragraphs', () => {
      const chunker = new DocumentChunker({ strategy: 'paragraph', chunkSize: 1000 });
      const doc = createDoc('Para1\n\n\n\nPara2');
      const chunks = chunker.chunk(doc);

      // Should not have empty chunks
      chunks.forEach((chunk) => {
        expect(chunk.content.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('chunkBatch', () => {
    it('should chunk multiple documents', () => {
      const chunker = new DocumentChunker({ chunkSize: 50 });
      const docs = [createDoc('Document 1 content'), { id: 'doc-2', content: 'Document 2 content', metadata: {} }];
      const chunks = chunker.chunkBatch(docs);

      expect(chunks.some((c) => c.documentId === 'doc-1')).toBe(true);
      expect(chunks.some((c) => c.documentId === 'doc-2')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const chunker = new DocumentChunker();
      const doc = createDoc('');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBe(0);
    });

    it('should handle whitespace-only content', () => {
      const chunker = new DocumentChunker();
      const doc = createDoc('   \n\n   ');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBe(0);
    });

    it('should handle content smaller than chunk size', () => {
      const chunker = new DocumentChunker({ chunkSize: 1000 });
      const doc = createDoc('Small text');
      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Small text');
    });
  });
});
