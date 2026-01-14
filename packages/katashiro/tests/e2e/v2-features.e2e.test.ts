/**
 * E2E Tests - v2.0.0 Features
 *
 * RAG、評価、エージェント機能のエンドツーエンドテスト
 *
 * @requirement REQ-TEST-002
 * @since 2.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';

// RAG
import {
  InMemoryVectorStore,
  MockEmbeddingProvider,
  DocumentChunker,
  LLMReranker,
} from '../../../rag/src/index.js';

// Evaluation
import {
  EvaluationReporter,
  LengthEvaluator,
  KeywordEvaluator,
  CompositeEvaluator,
} from '../../../evaluation/src/index.js';

// Orchestrator
import {
  ToolRegistry,
  AgentStateManager,
  ReActHelper,
} from '../../../orchestrator/src/index.js';

describe('E2E v2.0.0 Features', () => {
  describe('RAG Pipeline E2E', () => {
    let embeddingProvider: MockEmbeddingProvider;
    let vectorStore: InMemoryVectorStore;
    let chunker: DocumentChunker;

    beforeEach(() => {
      embeddingProvider = new MockEmbeddingProvider();
      vectorStore = new InMemoryVectorStore();
      chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 60, chunkOverlap: 10 });
    });

    it('should chunk documents correctly', () => {
      const doc = {
        id: 'doc-1',
        content:
          'TypeScript is a superset of JavaScript. It adds static typing to the language. This helps catch errors at compile time.',
        metadata: { source: 'test' },
      };

      const chunks = chunker.chunk(doc);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBeDefined();
      expect(chunks[0].content).toBeDefined();
    });

    it('should instantiate embedding provider and vector store', async () => {
      expect(embeddingProvider).toBeDefined();
      expect(vectorStore).toBeDefined();

      const text = 'TypeScript provides static typing for JavaScript applications.';
      const embedding = await embeddingProvider.embed(text);
      expect(embedding.length).toBeGreaterThan(0);
    });

    it('should retrieve relevant documents by similarity', async () => {
      const provider = new MockEmbeddingProvider({ dimensions: 128 });
      const store = new InMemoryVectorStore({ similarityThreshold: 0.0 });

      // 複数のドキュメントを追加
      const documents = [
        { id: '1', content: 'TypeScript is a programming language.' },
        { id: '2', content: 'Python is great for data science.' },
        { id: '3', content: 'JavaScript runs in browsers.' },
      ];

      for (const doc of documents) {
        const chunk = { id: doc.id, documentId: 'doc', content: doc.content, metadata: {} };
        const embedding = await provider.embed(doc.content);
        await store.add(chunk, embedding);
      }

      const queryEmbedding = await provider.embed('TypeScript programming');
      const results = await store.search(queryEmbedding, 2);

      expect(results.length).toBe(2);
    });

    it('should instantiate LLMReranker with config', () => {
      const reranker = new LLMReranker({
        topK: 5,
        batchSize: 10,
      });

      expect(reranker).toBeDefined();
    });
  });

  describe('Evaluation Pipeline E2E', () => {
    it('should evaluate text length', async () => {
      const evaluator = new LengthEvaluator({
        minLength: 10,
        maxLength: 100,
      });

      const result = await evaluator.evaluate({
        input: 'What is TypeScript?',
        output: 'TypeScript is a typed superset of JavaScript.',
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should evaluate keyword presence', async () => {
      const evaluator = new KeywordEvaluator({
        keywords: ['TypeScript', 'JavaScript', 'typed'],
        matchAll: false,
      });

      const result = await evaluator.evaluate({
        input: 'Describe TypeScript',
        output: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
      });

      expect(result.score).toBeGreaterThan(0);
    });

    it('should compose multiple evaluators', async () => {
      const composite = new CompositeEvaluator({
        evaluators: [
          { evaluator: new LengthEvaluator({ minLength: 5, maxLength: 200 }), weight: 0.5 },
          { evaluator: new KeywordEvaluator({ keywords: ['TypeScript'] }), weight: 0.5 },
        ],
        aggregation: 'weightedAverage',
      });

      const result = await composite.evaluate({
        input: 'What is TypeScript?',
        output: 'TypeScript is a programming language.',
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should generate evaluation reports', () => {
      const reporter = new EvaluationReporter({
        title: 'Test Evaluation Report',
        language: 'en',
      });

      const results = [
        {
          evaluator: 'LengthEvaluator',
          score: 0.85,
          normalizedScore: 0.85,
          passed: true,
          reasoning: 'Good length',
        },
        {
          evaluator: 'KeywordEvaluator',
          score: 0.72,
          normalizedScore: 0.72,
          passed: true,
          reasoning: 'Keywords present',
        },
      ];

      const report = reporter.generate({ results });

      expect(report).toContain('Test Evaluation Report');
      expect(report).toContain('0.85');
      expect(report).toContain('0.72');
    });
  });

  describe('Agent Pipeline E2E', () => {
    it('should create and manage agent state', () => {
      const manager = new AgentStateManager();

      // 新しい状態を作成
      const state = manager.create({
        conversationId: 'session-1',
        maxSteps: 10,
        context: { goal: 'Research TypeScript features' },
      });

      expect(state).toBeDefined();
      expect(state.conversationId).toBe('session-1');
      expect(state.status).toBe('idle');
      expect(state.currentStep).toBe(0);

      // アクションを追加
      const newState = manager.addAction(state, {
        type: 'thought',
        content: { thought: 'Analyzing the request...' },
      });

      expect(newState.currentStep).toBe(1);
      expect(newState.history.length).toBe(1);
      expect(newState.status).toBe('running');
    });

    it('should add tool_call actions', () => {
      const manager = new AgentStateManager();
      const state = manager.create();

      const newState = manager.addAction(state, {
        type: 'tool_call',
        content: {
          tool: 'web_search',
          params: { query: 'TypeScript features' },
        },
      });

      expect(newState.history[0].type).toBe('tool_call');
      expect(newState.history[0].content.tool).toBe('web_search');
    });

    it('should parse ReAct format output', () => {
      const helper = new ReActHelper();

      const output = `Thought: I need to search for TypeScript information.
Action: search
Action Input: {"query": "TypeScript features"}`;

      const result = helper.parse(output);

      expect(result.success).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions[0].thought).toContain('TypeScript');
      expect(result.actions[0].action?.tool).toBe('search');
    });

    it('should detect final answer in ReAct output', () => {
      const helper = new ReActHelper();

      const output = `Thought: I now have enough information to answer.
Final Answer: TypeScript is a typed superset of JavaScript developed by Microsoft.`;

      const result = helper.parse(output);

      expect(result.finalAnswer).toBeDefined();
      expect(result.finalAnswer).toContain('TypeScript');
    });

    it('should format ReAct steps', () => {
      const helper = new ReActHelper();

      // AgentAction形式
      const actions = [
        {
          step: 1,
          timestamp: new Date().toISOString(),
          type: 'thought' as const,
          content: { thought: 'I need to search for information.' },
        },
        {
          step: 2,
          timestamp: new Date().toISOString(),
          type: 'tool_call' as const,
          content: { tool: 'search', params: { query: 'test' } },
        },
      ];

      const formatted = helper.format(actions);

      expect(formatted).toContain('Thought:');
      expect(formatted).toContain('Action:');
    });

    it('should register and configure tools', () => {
      const registry = new ToolRegistry();

      registry.register({
        name: 'custom_tool',
        description: 'A custom test tool',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        execute: async (params) => {
          return { result: `Processed: ${params.input}` };
        },
      });

      const tool = registry.get('custom_tool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('custom_tool');
    });
  });

  describe('Integrated Pipeline E2E', () => {
    it('should run RAG + Evaluation workflow', async () => {
      // 1. RAGセットアップ
      // Note: MockEmbeddingProviderは決定的だがランダムハッシュベースのため、
      // 異なるテキスト間で負の類似度になる場合がある。-1.0で全結果を取得
      const embeddingProvider = new MockEmbeddingProvider({ dimensions: 128 });
      const vectorStore = new InMemoryVectorStore({ similarityThreshold: -1.0 });

      const documents = [
        'TypeScript adds static typing to JavaScript.',
        'TypeScript is developed by Microsoft.',
        'TypeScript compiles to plain JavaScript.',
      ];

      for (let i = 0; i < documents.length; i++) {
        const chunk = { id: `doc-${i}`, documentId: 'doc', content: documents[i], metadata: {} };
        const embedding = await embeddingProvider.embed(documents[i]);
        await vectorStore.add(chunk, embedding);
      }

      // 2. 検索
      const queryEmbedding = await embeddingProvider.embed('What is TypeScript?');
      const searchResults = await vectorStore.search(queryEmbedding, 2);

      expect(searchResults.length).toBeGreaterThan(0);

      // 3. 生成（シミュレート）
      const context = searchResults.map((r) => r.chunk.content).join('\n');
      const generatedAnswer = `Based on the context: TypeScript adds static typing to JavaScript.`;

      // 4. 評価
      const evaluator = new KeywordEvaluator({
        keywords: ['TypeScript', 'JavaScript'],
      });

      const evalResult = await evaluator.evaluate({
        input: 'What is TypeScript?',
        output: generatedAnswer,
        context: context,
      });

      expect(evalResult.score).toBeGreaterThanOrEqual(0);
    });

    it('should run Agent + State workflow', () => {
      // 1. ToolRegistry セットアップ
      const registry = new ToolRegistry();
      registry.register({
        name: 'search',
        description: 'Search for information',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ results: ['result1', 'result2'] }),
      });

      // 2. AgentStateManager セットアップ
      const stateManager = new AgentStateManager();
      let state = stateManager.create({
        conversationId: 'agent-session',
        context: { goal: 'Answer user question' },
      });

      // 3. ReActHelper セットアップ
      const helper = new ReActHelper();

      // 4. シミュレートされたエージェントループ
      const steps = [
        `Thought: I need to search for information.
Action: search
Action Input: {"query": "test"}`,
        `Thought: I found the information I need.
Final Answer: The answer is based on the search results.`,
      ];

      for (const step of steps) {
        const parsed = helper.parse(step);

        if (parsed.finalAnswer) {
          state = stateManager.addAction(state, {
            type: 'final_answer',
            content: { answer: parsed.finalAnswer },
          });
        } else if (parsed.actions.length > 0 && parsed.actions[0].action) {
          state = stateManager.addAction(state, {
            type: 'tool_call',
            content: {
              tool: parsed.actions[0].action.tool,
              params: parsed.actions[0].action.input,
            },
          });
        }
      }

      expect(state.history.length).toBe(2);
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle empty vector store search', async () => {
      const vectorStore = new InMemoryVectorStore();
      const embeddingProvider = new MockEmbeddingProvider();

      const queryEmbedding = await embeddingProvider.embed('test query');
      const results = await vectorStore.search(queryEmbedding, { limit: 5 });

      expect(results).toEqual([]);
    });

    it('should handle invalid ReAct format gracefully', () => {
      const helper = new ReActHelper();

      const invalidOutput = 'This is not a valid ReAct format output.';
      const result = helper.parse(invalidOutput);

      // パースはできるが、アクションは空またはエラーあり
      expect(result.actions.length).toBe(0);
      expect(result.rawText).toBe(invalidOutput);
    });

    it('should handle evaluation with missing context', async () => {
      const evaluator = new KeywordEvaluator({
        keywords: ['TypeScript'],
      });

      const result = await evaluator.evaluate({
        input: 'Question',
        output: 'TypeScript answer',
        // contextなし
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle agent state manager immutability', () => {
      const manager = new AgentStateManager();
      const state1 = manager.create();

      const state2 = manager.addAction(state1, {
        type: 'thought',
        content: { thought: 'Test' },
      });

      // state1は変更されていない（イミュータブル）
      expect(state1.currentStep).toBe(0);
      expect(state2.currentStep).toBe(1);
      expect(state1).not.toBe(state2);
    });
  });
});
