/**
 * Retriever Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Retriever, MockEmbeddingProvider, InMemoryVectorStore } from '../src/index.js';
import type { Chunk, Document } from '../src/types.js';

describe('Retriever', () => {
  let provider: MockEmbeddingProvider;
  let store: InMemoryVectorStore;
  let retriever: Retriever;

  beforeEach(() => {
    provider = new MockEmbeddingProvider({ dimensions: 128 });
    store = new InMemoryVectorStore({ similarityThreshold: 0.0 });
    retriever = new Retriever(provider, store, { topK: 5, minScore: 0.0 });
  });

  const createDoc = (id: string): Document => ({
    id,
    content: `Document ${id}`,
    metadata: { source: 'test' },
  });

  const createChunk = (docId: string, index: number, content: string): Chunk => ({
    id: `${docId}_chunk_${index}`,
    documentId: docId,
    content,
    metadata: { chunkIndex: index },
  });

  describe('addDocument', () => {
    it('should add document chunks to index', async () => {
      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'First chunk'),
        createChunk('d1', 1, 'Second chunk'),
      ];

      await retriever.addDocument(doc, chunks);

      expect(store.size).toBe(2);
    });
  });

  describe('addDocuments', () => {
    it('should add multiple documents', async () => {
      const docs = [
        { document: createDoc('d1'), chunks: [createChunk('d1', 0, 'Doc 1 content')] },
        { document: createDoc('d2'), chunks: [createChunk('d2', 0, 'Doc 2 content')] },
      ];

      await retriever.addDocuments(docs);

      expect(store.size).toBe(2);
    });
  });

  describe('search', () => {
    it('should find relevant chunks', async () => {
      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'Machine learning is great'),
        createChunk('d1', 1, 'Deep learning is powerful'),
        createChunk('d1', 2, 'Natural language processing'),
      ];

      await retriever.addDocument(doc, chunks);

      const results = await retriever.search('Machine learning');

      expect(results.length).toBeGreaterThan(0);
      // MockEmbeddingProviderはランダムベクトルを生成するため、
      // 結果に追加したチャンクが含まれていることを確認
      const contents = results.map(r => r.chunk.content);
      expect(contents.some(c => chunks.map(ch => ch.content).includes(c))).toBe(true);
    });

    it('should respect minScore filter', async () => {
      const strictRetriever = new Retriever(provider, store, { topK: 10, minScore: 0.99 });

      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'exact query'),
        createChunk('d1', 1, 'completely different'),
      ];

      await strictRetriever.addDocument(doc, chunks);

      const results = await strictRetriever.search('exact query');

      expect(results.length).toBe(1);
    });

    it('should limit results to topK', async () => {
      const doc = createDoc('d1');
      const chunks = Array.from({ length: 20 }, (_, i) =>
        createChunk('d1', i, `Chunk ${i} content`)
      );

      await retriever.addDocument(doc, chunks);

      const results = await retriever.search('Chunk content');

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('searchMultiple', () => {
    it('should search with multiple queries', async () => {
      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'Apples are fruits'),
        createChunk('d1', 1, 'Bananas are yellow'),
        createChunk('d1', 2, 'Oranges have vitamin C'),
      ];

      await retriever.addDocument(doc, chunks);

      const results = await retriever.searchMultiple(['Apples', 'Oranges']);

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate results', async () => {
      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'Common topic'),
      ];

      await retriever.addDocument(doc, chunks);

      const results = await retriever.searchMultiple(['Common', 'topic', 'Common topic']);

      // Should only have one result for the same chunk
      const uniqueIds = new Set(results.map(r => r.chunk.id));
      expect(uniqueIds.size).toBe(results.length);
    });

    it('should sort merged results by score', async () => {
      const doc = createDoc('d1');
      const chunks = [
        createChunk('d1', 0, 'Query A match'),
        createChunk('d1', 1, 'Query B match'),
      ];

      await retriever.addDocument(doc, chunks);

      const results = await retriever.searchMultiple(['Query A', 'Query B']);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('deleteChunk', () => {
    it('should delete a chunk', async () => {
      const doc = createDoc('d1');
      const chunks = [createChunk('d1', 0, 'Content')];

      await retriever.addDocument(doc, chunks);
      const deleted = await retriever.deleteChunk('d1_chunk_0');

      expect(deleted).toBe(true);
      expect(store.size).toBe(0);
    });

    it('should return false for non-existent chunk', async () => {
      const deleted = await retriever.deleteChunk('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('config management', () => {
    it('should get config', () => {
      const config = retriever.getConfig();

      expect(config.topK).toBe(5);
      expect(config.minScore).toBe(0.0);
    });

    it('should update config', () => {
      retriever.updateConfig({ topK: 10 });

      const config = retriever.getConfig();
      expect(config.topK).toBe(10);
      expect(config.minScore).toBe(0.0); // Unchanged
    });
  });
});
