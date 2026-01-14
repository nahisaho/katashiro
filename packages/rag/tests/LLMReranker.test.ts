/**
 * LLMReranker Tests
 *
 * @requirement REQ-RAG-103
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LLMReranker,
  rerankResults,
  DEFAULT_RERANKER_CONFIG,
  DEFAULT_RERANKER_PROMPT,
} from '../src/reranking/LLMReranker.js';
import type { RetrievalResult } from '../src/types.js';
import { getDefaultLLMProvider } from '@nahisaho/katashiro-llm';

// Mock LLM provider
vi.mock('@nahisaho/katashiro-llm', () => {
  const mockProvider = {
    name: 'mock',
    supportedModels: ['gpt-4o-mini'],
    generate: vi.fn().mockResolvedValue({
      id: 'test-id',
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        score: 8,
        reasoning: 'Highly relevant content',
        relevanceFactors: ['keyword match', 'topic alignment'],
        confidence: 0.9,
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    }),
    generateStream: vi.fn(),
  };

  return {
    getDefaultLLMProvider: vi.fn(() => mockProvider),
  };
});

describe('LLMReranker', () => {
  let reranker: LLMReranker;
  let sampleResults: RetrievalResult[];

  beforeEach(() => {
    reranker = new LLMReranker();
    reranker.clearCache();

    sampleResults = [
      {
        content: 'Document about AI and machine learning',
        score: 0.9,
        metadata: { source: 'doc1' },
      },
      {
        content: 'Document about cooking recipes',
        score: 0.8,
        metadata: { source: 'doc2' },
      },
      {
        content: 'Document about deep learning frameworks',
        score: 0.7,
        metadata: { source: 'doc3' },
      },
    ];
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const r = new LLMReranker();
      const config = r.getConfig();

      expect(config.provider).toBe('openai');
      expect(config.topK).toBe(5);
      expect(config.scoreThreshold).toBe(0.3);
    });

    it('should merge custom config', () => {
      const r = new LLMReranker({
        topK: 10,
        scoreThreshold: 0.5,
      });
      const config = r.getConfig();

      expect(config.topK).toBe(10);
      expect(config.scoreThreshold).toBe(0.5);
      expect(config.provider).toBe('openai');
    });
  });

  describe('rerank', () => {
    it('should rerank results', async () => {
      const response = await reranker.rerank('What is AI?', sampleResults);

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty results', async () => {
      const response = await reranker.rerank('query', []);

      expect(response.results).toEqual([]);
    });

    it('should add originalRank to results', async () => {
      const response = await reranker.rerank('AI query', sampleResults);

      for (const result of response.results) {
        expect(result.originalRank).toBeGreaterThan(0);
        expect(result.originalScore).toBeDefined();
      }
    });

    it('should filter by scoreThreshold', async () => {
      const r = new LLMReranker({ scoreThreshold: 0.9 });

      // Mock low score
      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockResolvedValueOnce({
        id: 'test-id',
        model: 'gpt-4o-mini',
        content: JSON.stringify({ score: 5 }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const response = await r.rerank('query', sampleResults.slice(0, 1));

      // Score 5/10 = 0.5, below 0.9 threshold
      expect(response.results.length).toBe(0);
    });

    it('should limit to topK results', async () => {
      const r = new LLMReranker({ topK: 2 });
      const manyResults = Array(10)
        .fill(null)
        .map((_, i) => ({
          content: `Document ${i}`,
          score: 0.5,
        }));

      const response = await r.rerank('query', manyResults);

      expect(response.results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('scoreDocument', () => {
    it('should score a single document', async () => {
      const score = await reranker.scoreDocument(
        'What is AI?',
        'Document about artificial intelligence',
      );

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(10);
    });

    it('should use cache for same query/document', async () => {
      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockClear();

      await reranker.scoreDocument('query', 'document');
      await reranker.scoreDocument('query', 'document');

      // Should only be called once due to caching
      expect(vi.mocked(provider.generate)).toHaveBeenCalledTimes(1);
    });

    it('should not use cache when disabled', async () => {
      const r = new LLMReranker({ useCache: false });
      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockClear();

      await r.scoreDocument('query', 'document');
      await r.scoreDocument('query', 'document');

      expect(vi.mocked(provider.generate)).toHaveBeenCalledTimes(2);
    });
  });

  describe('includeDetails', () => {
    it('should include details when enabled', async () => {
      const r = new LLMReranker({ includeDetails: true });
      const response = await r.rerank('AI query', sampleResults.slice(0, 1));

      expect(response.results[0]?.details).toBeDefined();
      expect(response.results[0]?.details?.reasoning).toBeDefined();
    });

    it('should not include details when disabled', async () => {
      const r = new LLMReranker({ includeDetails: false });
      const response = await r.rerank('AI query', sampleResults.slice(0, 1));

      if (response.results[0]) {
        expect(response.results[0].details).toBeUndefined();
      }
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await reranker.scoreDocument('q1', 'd1');
      expect(reranker.getCacheSize()).toBe(1);

      reranker.clearCache();
      expect(reranker.getCacheSize()).toBe(0);
    });

    it('should track cache size', async () => {
      await reranker.scoreDocument('q1', 'd1');
      await reranker.scoreDocument('q2', 'd2');

      expect(reranker.getCacheSize()).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockRejectedValueOnce(new Error('API Error'));

      const r = new LLMReranker({ useCache: false });
      const score = await r.scoreDocument('query', 'document');

      expect(score.score).toBe(0);
      expect(score.reasoning).toContain('Error');
    });

    it('should handle malformed JSON response', async () => {
      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockResolvedValueOnce({
        id: 'test-id',
        model: 'gpt-4o-mini',
        content: 'The score is 7',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const r = new LLMReranker({ useCache: false });
      const score = await r.scoreDocument('query', 'document');

      expect(score.score).toBe(7);
    });
  });

  describe('custom prompt template', () => {
    it('should use custom prompt template', async () => {
      const customTemplate = 'Rate: {query} vs {document}';
      const r = new LLMReranker({ promptTemplate: customTemplate });

      const provider = getDefaultLLMProvider();
      vi.mocked(provider.generate).mockClear();

      await r.scoreDocument('test query', 'test document');

      expect(vi.mocked(provider.generate)).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Rate:'),
            }),
          ]),
        }),
      );
    });
  });
});

describe('rerankResults helper', () => {
  it('should rerank results with default config', async () => {
    const results: RetrievalResult[] = [
      { content: 'Test document', score: 0.8 },
    ];

    const reranked = await rerankResults('query', results);

    expect(Array.isArray(reranked)).toBe(true);
  });

  it('should accept custom config', async () => {
    const results: RetrievalResult[] = [
      { content: 'Test document', score: 0.8 },
    ];

    const reranked = await rerankResults('query', results, { topK: 1 });

    expect(reranked.length).toBeLessThanOrEqual(1);
  });
});

describe('DEFAULT_RERANKER_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_RERANKER_CONFIG.topK).toBe(5);
    expect(DEFAULT_RERANKER_CONFIG.scoreThreshold).toBe(0.3);
    expect(DEFAULT_RERANKER_CONFIG.batchSize).toBe(10);
    expect(DEFAULT_RERANKER_CONFIG.useCache).toBe(true);
  });
});

describe('DEFAULT_RERANKER_PROMPT', () => {
  it('should contain query placeholder', () => {
    expect(DEFAULT_RERANKER_PROMPT).toContain('{query}');
  });

  it('should contain document placeholder', () => {
    expect(DEFAULT_RERANKER_PROMPT).toContain('{document}');
  });

  it('should request JSON response', () => {
    expect(DEFAULT_RERANKER_PROMPT).toContain('JSON');
  });
});
