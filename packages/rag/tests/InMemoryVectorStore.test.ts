/**
 * InMemoryVectorStore Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore, MockEmbeddingProvider } from '../src/index.js';
import type { Chunk, Vector } from '../src/types.js';

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;
  let provider: MockEmbeddingProvider;

  beforeEach(() => {
    store = new InMemoryVectorStore({ similarityThreshold: 0.0 });
    provider = new MockEmbeddingProvider({ dimensions: 128 });
  });

  const createChunk = (id: string, content: string): Chunk => ({
    id,
    documentId: 'doc-1',
    content,
    metadata: {},
  });

  describe('add', () => {
    it('should add a chunk with vector', async () => {
      const chunk = createChunk('c1', 'Hello world');
      const vector = await provider.embed('Hello world');

      await store.add(chunk, vector);

      expect(store.size).toBe(1);
      expect(store.has('c1')).toBe(true);
    });

    it('should overwrite existing chunk with same id', async () => {
      const chunk1 = createChunk('c1', 'Hello');
      const chunk2 = createChunk('c1', 'World');
      const v1 = await provider.embed('Hello');
      const v2 = await provider.embed('World');

      await store.add(chunk1, v1);
      await store.add(chunk2, v2);

      expect(store.size).toBe(1);
    });
  });

  describe('addBatch', () => {
    it('should add multiple chunks', async () => {
      const items = await Promise.all(
        ['a', 'b', 'c'].map(async (id) => ({
          chunk: createChunk(id, `content-${id}`),
          vector: await provider.embed(`content-${id}`),
        })),
      );

      await store.addBatch(items);

      expect(store.size).toBe(3);
    });
  });

  describe('search', () => {
    it('should find similar vectors', async () => {
      const chunks = ['Hello world', 'Hi there', 'Goodbye'];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = createChunk(`c${i}`, chunks[i]);
        const vector = await provider.embed(chunks[i]);
        await store.add(chunk, vector);
      }

      const queryVector = await provider.embed('Hello world');
      const results = await store.search(queryVector, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.content).toBe('Hello world');
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it('should return topK results', async () => {
      for (let i = 0; i < 10; i++) {
        const chunk = createChunk(`c${i}`, `content ${i}`);
        const vector = await provider.embed(`content ${i}`);
        await store.add(chunk, vector);
      }

      const queryVector = await provider.embed('content 5');
      const results = await store.search(queryVector, 3);

      expect(results.length).toBe(3);
    });

    it('should return results sorted by score descending', async () => {
      for (let i = 0; i < 5; i++) {
        const chunk = createChunk(`c${i}`, `doc ${i}`);
        const vector = await provider.embed(`doc ${i}`);
        await store.add(chunk, vector);
      }

      const queryVector = await provider.embed('doc 2');
      const results = await store.search(queryVector, 5);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should filter by similarity threshold', async () => {
      const strictStore = new InMemoryVectorStore({ similarityThreshold: 0.99 });

      const chunk1 = createChunk('c1', 'exact match');
      const chunk2 = createChunk('c2', 'different text');
      const v1 = await provider.embed('exact match');
      const v2 = await provider.embed('different text');

      await strictStore.add(chunk1, v1);
      await strictStore.add(chunk2, v2);

      const queryVector = await provider.embed('exact match');
      const results = await strictStore.search(queryVector, 10);

      expect(results.length).toBe(1);
      expect(results[0].chunk.content).toBe('exact match');
    });
  });

  describe('delete', () => {
    it('should delete a chunk', async () => {
      const chunk = createChunk('c1', 'Hello');
      const vector = await provider.embed('Hello');
      await store.add(chunk, vector);

      const deleted = await store.delete('c1');

      expect(deleted).toBe(true);
      expect(store.size).toBe(0);
      expect(store.has('c1')).toBe(false);
    });

    it('should return false for non-existent chunk', async () => {
      const deleted = await store.delete('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      for (let i = 0; i < 5; i++) {
        const chunk = createChunk(`c${i}`, `content ${i}`);
        const vector = await provider.embed(`content ${i}`);
        await store.add(chunk, vector);
      }

      store.clear();

      expect(store.size).toBe(0);
    });
  });

  describe('cosine similarity edge cases', () => {
    it('should handle dimension mismatch', async () => {
      const chunk = createChunk('c1', 'test');
      const vector: Vector = [1, 0, 0];
      await store.add(chunk, vector);

      const queryVector: Vector = [1, 0, 0, 0, 0];

      await expect(store.search(queryVector, 1)).rejects.toThrow('Vector dimension mismatch');
    });
  });
});
