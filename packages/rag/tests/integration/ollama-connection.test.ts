/**
 * Ollama Connection Integration Test
 *
 * Tests real connection to Ollama server at 192.168.224.1:11434
 *
 * @requirement REQ-RAG-001
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaEmbeddingProvider } from '../../src/embedding/OllamaEmbeddingProvider.js';
import { EmbeddingFactory } from '../../src/embedding/EmbeddingFactory.js';

const OLLAMA_BASE_URL = 'http://192.168.224.1:11434';
const EMBEDDING_MODEL = 'bge-m3:latest';

// Skip if Ollama is not available
const checkOllamaAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

describe.skipIf(
  process.env.CI === 'true' || process.env.SKIP_INTEGRATION_TESTS === 'true' || process.env.MOCK_MODE === 'true'
)('Ollama Connection Tests', () => {
  let ollamaAvailable = false;

  beforeAll(async () => {
    ollamaAvailable = await checkOllamaAvailable();
    if (!ollamaAvailable) {
      console.log('⚠️ Ollama server is not available. Skipping integration tests.');
    }
  });

  describe('OllamaEmbeddingProvider', () => {
    it('should create provider with default config', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaEmbeddingProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
      });

      expect(provider.name).toBe('ollama');
      expect(provider.model).toBe(EMBEDDING_MODEL);
    });

    it('should list available models', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaEmbeddingProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
      });

      const models = await provider.listModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain(EMBEDDING_MODEL);
    });

    it('should generate embedding for single text', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaEmbeddingProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
      });

      const embedding = await provider.embed('Hello, world!');

      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe('number');
    });

    it('should generate embeddings for batch of texts', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaEmbeddingProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
      });

      const texts = [
        'The quick brown fox jumps over the lazy dog.',
        'A fast reddish-brown canine leaps above an idle canine.',
        'The weather is nice today.',
      ];

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings).toBeInstanceOf(Array);
      expect(embeddings.length).toBe(3);

      // All embeddings should have the same dimension
      const dim = embeddings[0].length;
      for (const emb of embeddings) {
        expect(emb.length).toBe(dim);
      }

      // Similar texts should have higher similarity
      const cosineSimilarity = (a: number[], b: number[]): number => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
          dotProduct += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      const sim01 = cosineSimilarity(embeddings[0], embeddings[1]);
      const sim02 = cosineSimilarity(embeddings[0], embeddings[2]);

      console.log(`Similarity between fox sentences: ${sim01.toFixed(4)}`);
      console.log(`Similarity between fox and weather: ${sim02.toFixed(4)}`);

      // Similar sentences should be more similar
      expect(sim01).toBeGreaterThan(sim02);
    });
  });

  describe('EmbeddingFactory', () => {
    it('should create Ollama provider via factory', async () => {
      if (!ollamaAvailable) return;

      const provider = EmbeddingFactory.create('ollama', {
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
      });

      expect(provider.name).toBe('ollama');

      const embedding = await provider.embed('Test text');
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBeGreaterThan(0);
    });
  });
});
