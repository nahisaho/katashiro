/**
 * EmbeddingManager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingManager, MockEmbeddingProvider } from '../src/index.js';

describe('EmbeddingManager', () => {
  let provider: MockEmbeddingProvider;
  let manager: EmbeddingManager;

  beforeEach(() => {
    provider = new MockEmbeddingProvider({ dimensions: 256 });
    manager = new EmbeddingManager(provider);
  });

  describe('embed', () => {
    it('should generate embedding for text', async () => {
      const vector = await manager.embed('Hello world');

      expect(vector).toBeDefined();
      expect(vector.length).toBe(256);
      expect(vector.every((v) => typeof v === 'number')).toBe(true);
    });

    it('should cache embeddings for same text', async () => {
      await manager.embed('Hello world');
      await manager.embed('Hello world');

      expect(provider.getCallCount()).toBe(1);
    });

    it('should return same embedding for same text', async () => {
      const v1 = await manager.embed('Hello world');
      const v2 = await manager.embed('Hello world');

      expect(v1).toEqual(v2);
    });

    it('should generate different embeddings for different texts', async () => {
      const v1 = await manager.embed('Hello world');
      const v2 = await manager.embed('Goodbye world');

      expect(v1).not.toEqual(v2);
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const vectors = await manager.embedBatch(texts);

      expect(vectors.length).toBe(3);
      vectors.forEach((v) => {
        expect(v.length).toBe(256);
      });
    });

    it('should use cache for previously embedded texts', async () => {
      await manager.embed('Hello');
      await manager.embedBatch(['Hello', 'World', 'Test']);

      // First embed call + embedBatch (but Hello is cached)
      expect(provider.getCallCount()).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await manager.embed('Hello world');
      manager.clearCache();
      await manager.embed('Hello world');

      expect(provider.getCallCount()).toBe(2);
    });
  });
});

describe('MockEmbeddingProvider', () => {
  it('should generate deterministic vectors', async () => {
    const provider = new MockEmbeddingProvider();
    const v1 = await provider.embed('test');
    const v2 = await provider.embed('test');

    expect(v1).toEqual(v2);
  });

  it('should respect dimensions config', async () => {
    const provider = new MockEmbeddingProvider({ dimensions: 512 });
    const vector = await provider.embed('test');

    expect(vector.length).toBe(512);
  });

  it('should throw error when configured to fail', async () => {
    const provider = new MockEmbeddingProvider({ shouldFail: true });

    await expect(provider.embed('test')).rejects.toThrow('Mock embedding provider error');
  });

  it('should apply delay', async () => {
    const provider = new MockEmbeddingProvider({ delay: 50 });
    const start = Date.now();
    await provider.embed('test');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('should generate L2 normalized vectors', async () => {
    const provider = new MockEmbeddingProvider();
    const vector = await provider.embed('test');

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('should reset call count', async () => {
    const provider = new MockEmbeddingProvider();
    await provider.embed('test1');
    await provider.embed('test2');

    expect(provider.getCallCount()).toBe(2);

    provider.reset();
    expect(provider.getCallCount()).toBe(0);
  });

  describe('embedBatch', () => {
    it('should generate embeddings for batch', async () => {
      const provider = new MockEmbeddingProvider();
      const vectors = await provider.embedBatch(['a', 'b', 'c']);

      expect(vectors.length).toBe(3);
      expect(vectors[0]).not.toEqual(vectors[1]);
    });
  });
});
