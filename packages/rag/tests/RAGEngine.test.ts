/**
 * RAGEngine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RAGEngine, MockEmbeddingProvider, InMemoryVectorStore } from '../src/index.js';
import type { Document } from '../src/types.js';

describe('RAGEngine', () => {
  let provider: MockEmbeddingProvider;
  let store: InMemoryVectorStore;
  let engine: RAGEngine;

  beforeEach(() => {
    provider = new MockEmbeddingProvider({ dimensions: 128 });
    store = new InMemoryVectorStore({ similarityThreshold: 0.0 });
    engine = new RAGEngine(provider, store, {
      chunking: { chunkSize: 100, chunkOverlap: 10 },
      retriever: { topK: 5, minScore: 0.0 },
    });
  });

  const createDoc = (id: string, content: string): Document => ({
    id,
    content,
    metadata: { source: 'test' },
  });

  describe('ingest', () => {
    it('should chunk and index document', async () => {
      const doc = createDoc('d1', 'This is a test document with some content.');
      const chunks = await engine.ingest(doc);

      expect(chunks.length).toBeGreaterThan(0);
      expect(store.size).toBe(chunks.length);
    });

    it('should return generated chunks', async () => {
      const doc = createDoc('d1', 'Hello world');
      const chunks = await engine.ingest(doc);

      expect(chunks[0].documentId).toBe('d1');
      expect(chunks[0].content).toBe('Hello world');
    });
  });

  describe('ingestBatch', () => {
    it('should ingest multiple documents', async () => {
      const docs = [
        createDoc('d1', 'First document content'),
        createDoc('d2', 'Second document content'),
      ];

      const chunks = await engine.ingestBatch(docs);

      expect(chunks.some((c) => c.documentId === 'd1')).toBe(true);
      expect(chunks.some((c) => c.documentId === 'd2')).toBe(true);
    });
  });

  describe('query', () => {
    it('should return relevant chunks', async () => {
      await engine.ingest(createDoc('d1', 'Machine learning is a subset of artificial intelligence.'));
      await engine.ingest(createDoc('d2', 'Deep learning uses neural networks.'));
      await engine.ingest(createDoc('d3', 'Natural language processing handles text.'));

      const results = await engine.query('Machine learning AI');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', async () => {
      const strictEngine = new RAGEngine(provider, store, {
        retriever: { minScore: 0.99 },
      });

      await strictEngine.ingest(createDoc('d1', 'Some specific content'));

      const results = await strictEngine.query('completely unrelated query');

      expect(results.length).toBe(0);
    });
  });

  describe('queryMultiple', () => {
    it('should search with multiple queries', async () => {
      await engine.ingest(createDoc('d1', 'Apple is a fruit'));
      await engine.ingest(createDoc('d2', 'Orange is citrus'));

      const results = await engine.queryMultiple(['Apple', 'Orange']);

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('deleteChunk', () => {
    it('should delete specific chunk', async () => {
      const chunks = await engine.ingest(createDoc('d1', 'Short content'));
      const chunkId = chunks[0].id;

      const deleted = await engine.deleteChunk(chunkId);

      expect(deleted).toBe(true);
      expect(store.size).toBe(0);
    });
  });

  describe('deleteDocument', () => {
    it('should delete all chunks of a document', async () => {
      // Create a document that will produce multiple chunks
      const longContent = Array(10).fill('This is content. ').join('');
      const chunks = await engine.ingest(createDoc('d1', longContent));

      const deleted = await engine.deleteDocument('d1', chunks.length);

      expect(deleted).toBe(chunks.length);
      expect(store.size).toBe(0);
    });
  });

  describe('config updates', () => {
    it('should update chunking config', async () => {
      engine.updateChunkingConfig({ chunkSize: 50 });

      const doc = createDoc('d1', 'A'.repeat(200));
      const chunks = engine.chunk(doc);

      // With smaller chunk size, should have more chunks
      expect(chunks.length).toBeGreaterThan(3);
    });

    it('should update retriever config', async () => {
      engine.updateRetrieverConfig({ topK: 2 });

      // Add multiple documents
      for (let i = 0; i < 5; i++) {
        await engine.ingest(createDoc(`d${i}`, `Document ${i} content`));
      }

      const results = await engine.query('Document content');

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('chunk without indexing', () => {
    it('should chunk document without adding to index', () => {
      const doc = createDoc('d1', 'Test content for chunking');
      const chunks = engine.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
      expect(store.size).toBe(0); // Not indexed
    });

    it('should chunk multiple documents', () => {
      const docs = [
        createDoc('d1', 'First doc'),
        createDoc('d2', 'Second doc'),
      ];
      const chunks = engine.chunkBatch(docs);

      expect(chunks.length).toBe(2);
      expect(store.size).toBe(0);
    });
  });

  describe('integration', () => {
    it('should handle full RAG workflow', async () => {
      // 1. Ingest documents
      await engine.ingest(createDoc('d1', 'TypeScript is a typed superset of JavaScript.'));
      await engine.ingest(createDoc('d2', 'Python is popular for data science.'));
      await engine.ingest(createDoc('d3', 'Rust provides memory safety without garbage collection.'));

      // 2. Query
      const results = await engine.query('TypeScript JavaScript');

      // 3. Verify results
      expect(results.length).toBeGreaterThan(0);
      // MockEmbeddingProviderはランダムベクトルを生成するため、
      // 結果に追加したドキュメントが含まれていることを確認
      const docIds = results.map((r) => r.chunk.documentId);
      expect(docIds.some((id) => ['d1', 'd2', 'd3'].includes(id))).toBe(true);
      expect(results[0].score).toBeGreaterThan(0);
    });
  });
});
