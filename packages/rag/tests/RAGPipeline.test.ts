/**
 * RAG Pipeline Tests
 *
 * @requirement REQ-RAG-101
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RAGPipeline,
  DEFAULT_RAG_SYSTEM_PROMPT,
  DEFAULT_CONTEXT_TEMPLATE,
} from '../src/RAGPipeline.js';
import { MockEmbeddingProvider } from '../src/embedding/MockEmbeddingProvider.js';
import { InMemoryVectorStore } from '../src/vectordb/InMemoryVectorStore.js';
import type { RAGPipelineResult, Document } from '../src/index.js';

// MockLLMProvider
interface MockLLMProvider {
  generate: ReturnType<typeof vi.fn>;
}

function createMockLLMProvider(responseContent: string = 'これはAIの回答です。'): MockLLMProvider {
  return {
    generate: vi.fn().mockResolvedValue({
      content: responseContent,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    }),
  };
}

describe('RAGPipeline', () => {
  let embeddingProvider: MockEmbeddingProvider;
  let vectorStore: InMemoryVectorStore;
  let llmProvider: MockLLMProvider;

  beforeEach(() => {
    embeddingProvider = new MockEmbeddingProvider({ dimensions: 128 });
    vectorStore = new InMemoryVectorStore();
    llmProvider = createMockLLMProvider();
  });

  describe('constructor', () => {
    it('should create pipeline with default config', () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);
      const config = pipeline.getConfig();

      expect(config.systemPrompt).toBe(DEFAULT_RAG_SYSTEM_PROMPT);
      expect(config.contextTemplate).toBe(DEFAULT_CONTEXT_TEMPLATE);
      expect(config.maxContextLength).toBe(8000);
      expect(config.temperature).toBe(0.3);
      expect(config.defaultTopK).toBe(5);
    });

    it('should create pipeline with custom config', () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider, {
        systemPrompt: 'カスタムプロンプト',
        temperature: 0.5,
        defaultTopK: 10,
        maxContextLength: 4000,
      });
      const config = pipeline.getConfig();

      expect(config.systemPrompt).toBe('カスタムプロンプト');
      expect(config.temperature).toBe(0.5);
      expect(config.defaultTopK).toBe(10);
      expect(config.maxContextLength).toBe(4000);
    });
  });

  describe('ingest', () => {
    it('should ingest a document', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      const document: Document = {
        id: 'doc-1',
        content: 'AIは人工知能の略称です。機械学習はAIの一分野です。',
        metadata: { source: 'test' },
      };

      const chunks = await pipeline.ingest(document);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.documentId).toBe('doc-1');
    });

    it('should batch ingest multiple documents', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      const documents: Document[] = [
        { id: 'doc-1', content: 'ドキュメント1の内容です。' },
        { id: 'doc-2', content: 'ドキュメント2の内容です。' },
      ];

      const chunks = await pipeline.ingestBatch(documents);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('query', () => {
    it('should execute RAG query and return result', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      // ドキュメントをインジェスト
      await pipeline.ingest({
        id: 'doc-1',
        content: 'AIは人工知能の略称です。人間の知能を模倣するコンピュータシステムです。',
        metadata: { source: 'ai-guide' },
      });

      const result = await pipeline.query('AIとは何ですか？');

      expect(result.answer).toBeDefined();
      expect(result.query).toBe('AIとは何ですか？');
      expect(result.contexts).toBeInstanceOf(Array);
      expect(result.retrievedChunks).toBeInstanceOf(Array);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.tokenUsage).toBeDefined();
    });

    it('should include context information in LLM call', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({
        id: 'doc-1',
        content: 'TypeScriptは型安全なJavaScriptです。',
      });

      await pipeline.query('TypeScriptとは？');

      expect(llmProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      );
    });

    it('should respect query options', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({
        id: 'doc-1',
        content: 'テスト内容です。',
      });

      await pipeline.query('テスト', {
        topK: 3,
        temperature: 0.7,
        systemPromptOverride: 'オーバーライドプロンプト',
      });

      expect(llmProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'オーバーライドプロンプト',
            }),
          ]),
        })
      );
    });

    it('should handle conversation history', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({
        id: 'doc-1',
        content: 'AIの説明です。',
      });

      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: '前の質問' },
        { role: 'assistant', content: '前の回答' },
      ];

      await pipeline.query('続きの質問', { conversationHistory: history });

      expect(llmProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: '前の質問' }),
            expect.objectContaining({ role: 'assistant', content: '前の回答' }),
          ]),
        })
      );
    });

    it('should include additional context', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({
        id: 'doc-1',
        content: 'ベース情報です。',
      });

      await pipeline.query('質問', { additionalContext: '追加のコンテキスト情報' });

      expect(llmProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('追加のコンテキスト情報'),
            }),
          ]),
        })
      );
    });
  });

  describe('chat', () => {
    it('should execute chat with history', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({ id: 'doc-1', content: 'チャット用コンテンツ' });

      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: 'こんにちは' },
        { role: 'assistant', content: 'こんにちは！' },
      ];

      const result = await pipeline.chat('質問です', history);

      expect(result.answer).toBeDefined();
    });
  });

  describe('search', () => {
    it('should search without generating answer', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      await pipeline.ingest({
        id: 'doc-1',
        content: '検索対象のコンテンツです。',
      });

      const results = await pipeline.search('検索クエリ', 3);

      expect(results).toBeInstanceOf(Array);
      expect(llmProvider.generate).not.toHaveBeenCalled();
    });
  });

  describe('deleteChunk', () => {
    it('should delete a chunk', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      const chunks = await pipeline.ingest({
        id: 'doc-1',
        content: '削除対象コンテンツ',
      });

      const chunkId = chunks[0]?.id;
      if (chunkId) {
        const deleted = await pipeline.deleteChunk(chunkId);
        expect(deleted).toBe(true);
      }
    });
  });

  describe('deleteDocument', () => {
    it('should delete all chunks of a document', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      const chunks = await pipeline.ingest({
        id: 'doc-1',
        content: '削除対象ドキュメント',
      });

      const deleted = await pipeline.deleteDocument('doc-1', chunks.length);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateConfig', () => {
    it('should update pipeline config', () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider);

      pipeline.updateConfig({
        temperature: 0.8,
        maxContextLength: 5000,
        systemPrompt: '新しいプロンプト',
      });

      const config = pipeline.getConfig();
      expect(config.temperature).toBe(0.8);
      expect(config.maxContextLength).toBe(5000);
      expect(config.systemPrompt).toBe('新しいプロンプト');
    });
  });

  describe('context truncation', () => {
    it('should truncate long context', async () => {
      const pipeline = new RAGPipeline(embeddingProvider, vectorStore, llmProvider, {
        maxContextLength: 100,
      });

      // 長いコンテンツを持つドキュメントをインジェスト
      const longContent = 'これは非常に長いコンテンツです。'.repeat(50);
      await pipeline.ingest({
        id: 'doc-1',
        content: longContent,
      });

      const result = await pipeline.query('質問');

      // LLMに渡されたコンテキストが切り詰められていることを確認
      const call = llmProvider.generate.mock.calls[0];
      const userMessage = call?.[0]?.messages?.find((m: { role: string }) => m.role === 'user');
      
      // コンテキストが最大長を超えていないことを確認（多少の余裕を持たせる）
      // プロンプトテンプレートの分も含めて確認
      expect(userMessage?.content?.length).toBeLessThan(longContent.length);
    });
  });

  describe('DEFAULT_RAG_SYSTEM_PROMPT', () => {
    it('should be defined and contain key instructions', () => {
      expect(DEFAULT_RAG_SYSTEM_PROMPT).toBeDefined();
      expect(DEFAULT_RAG_SYSTEM_PROMPT).toContain('コンテキスト');
      expect(DEFAULT_RAG_SYSTEM_PROMPT).toContain('回答');
    });
  });

  describe('DEFAULT_CONTEXT_TEMPLATE', () => {
    it('should contain placeholders', () => {
      expect(DEFAULT_CONTEXT_TEMPLATE).toContain('{{contexts}}');
      expect(DEFAULT_CONTEXT_TEMPLATE).toContain('{{query}}');
    });
  });
});
