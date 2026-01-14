/**
 * RAGAS Evaluators Tests
 *
 * @requirement REQ-EVAL-102
 */

import { describe, it, expect, vi } from 'vitest';
import {
  FaithfulnessEvaluator,
  ContextRelevancyEvaluator,
  AnswerRelevancyEvaluator,
  ContextRecallEvaluator,
  RAGASCompositeEvaluator,
  isRAGEvaluationInput,
} from '../src/evaluators/RAGASEvaluators.js';
import type { RAGEvaluationInput, RAGASEvaluationResult } from '../src/types.js';

// MockLLMProvider型
interface MockLLMProvider {
  generate: ReturnType<typeof vi.fn>;
}

function createMockLLMProvider(responseContent: string): MockLLMProvider {
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

const createRAGInput = (overrides: Partial<RAGEvaluationInput> = {}): RAGEvaluationInput => ({
  output: '',
  query: 'AIとは何ですか？',
  retrievedContexts: [
    'AI（人工知能）は、人間の知能を模倣するコンピュータシステムです。',
    '機械学習はAIの一分野で、データから学習します。',
  ],
  generatedAnswer: 'AIは人工知能の略で、人間の知能を模倣するコンピュータシステムです。',
  ...overrides,
});

describe('isRAGEvaluationInput', () => {
  it('should return true for valid RAG input', () => {
    const input = createRAGInput();
    expect(isRAGEvaluationInput(input)).toBe(true);
  });

  it('should return false for regular evaluation input', () => {
    const input = { output: 'test output' };
    expect(isRAGEvaluationInput(input)).toBe(false);
  });

  it('should return false when missing required fields', () => {
    expect(isRAGEvaluationInput({ output: '', query: 'test' })).toBe(false);
    expect(isRAGEvaluationInput({ output: '', retrievedContexts: [] })).toBe(false);
  });
});

describe('FaithfulnessEvaluator', () => {
  it('should create evaluator with default config', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new FaithfulnessEvaluator(mockProvider);
    expect(evaluator.name).toBe('faithfulness');
  });

  it('should evaluate faithfulness successfully', async () => {
    // ステートメント抽出レスポンス
    const extractResponse = JSON.stringify(['AIは人工知能の略です', 'コンピュータシステムです']);
    // 検証レスポンス
    const verifyResponse = JSON.stringify({
      supported: ['AIは人工知能の略です', 'コンピュータシステムです'],
      unsupported: [],
    });

    const mockProvider: MockLLMProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({ content: extractResponse })
        .mockResolvedValueOnce({ content: verifyResponse }),
    };

    const evaluator = new FaithfulnessEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.metadata?.supportedStatements).toHaveLength(2);
    expect(result.metadata?.unsupportedStatements).toHaveLength(0);
  });

  it('should handle unsupported statements', async () => {
    const extractResponse = JSON.stringify(['ステートメント1', 'ステートメント2', 'ステートメント3']);
    const verifyResponse = JSON.stringify({
      supported: ['ステートメント1'],
      unsupported: ['ステートメント2', 'ステートメント3'],
    });

    const mockProvider: MockLLMProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({ content: extractResponse })
        .mockResolvedValueOnce({ content: verifyResponse }),
    };

    const evaluator = new FaithfulnessEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBeCloseTo(0.333, 2);
    expect(result.passed).toBe(false);
  });

  it('should return error for non-RAG input', async () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new FaithfulnessEvaluator(mockProvider);
    const result = await evaluator.evaluate({ output: 'regular output' });

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reasoning).toContain('RAG評価入力ではありません');
  });

  it('should handle empty statements', async () => {
    const mockProvider = createMockLLMProvider(JSON.stringify([]));
    const evaluator = new FaithfulnessEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBe(1);
    expect(result.reasoning).toContain('抽出されたステートメントがありません');
  });
});

describe('ContextRelevancyEvaluator', () => {
  it('should create evaluator with default config', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new ContextRelevancyEvaluator(mockProvider);
    expect(evaluator.name).toBe('context-relevancy');
  });

  it('should evaluate context relevancy successfully', async () => {
    const response = JSON.stringify({
      scores: [0.9, 0.7],
      reasoning: '両方のコンテキストがクエリに関連しています',
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new ContextRelevancyEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBeCloseTo(0.8, 1);
    expect(result.passed).toBe(true);
    expect(result.metadata?.contextScores).toEqual([0.9, 0.7]);
  });

  it('should handle low relevancy scores', async () => {
    const response = JSON.stringify({
      scores: [0.2, 0.3],
      reasoning: 'コンテキストの関連性が低い',
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new ContextRelevancyEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBeCloseTo(0.25, 1);
    expect(result.passed).toBe(false);
  });
});

describe('AnswerRelevancyEvaluator', () => {
  it('should create evaluator with default config', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new AnswerRelevancyEvaluator(mockProvider);
    expect(evaluator.name).toBe('answer-relevancy');
  });

  it('should evaluate answer relevancy successfully', async () => {
    const response = JSON.stringify({
      score: 0.85,
      reasoning: '回答はクエリに直接答えています',
      directlyAnswers: true,
      hasIrrelevantInfo: false,
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new AnswerRelevancyEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBe(0.85);
    expect(result.passed).toBe(true);
    expect(result.metadata?.directlyAnswers).toBe(true);
    expect(result.metadata?.hasIrrelevantInfo).toBe(false);
  });

  it('should handle irrelevant answers', async () => {
    const response = JSON.stringify({
      score: 0.3,
      reasoning: '回答が質問に直接答えていません',
      directlyAnswers: false,
      hasIrrelevantInfo: true,
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new AnswerRelevancyEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBe(0.3);
    expect(result.passed).toBe(false);
  });
});

describe('ContextRecallEvaluator', () => {
  it('should create evaluator with default config', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new ContextRecallEvaluator(mockProvider);
    expect(evaluator.name).toBe('context-recall');
  });

  it('should evaluate context recall with ground truth', async () => {
    const response = JSON.stringify({
      coveredPoints: ['AIの定義', 'コンピュータシステムの説明'],
      missedPoints: [],
      score: 0.9,
      reasoning: '主要なポイントがカバーされています',
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new ContextRecallEvaluator(mockProvider);
    const input = createRAGInput({
      groundTruth: 'AIは人工知能で、人間の知能を模倣するコンピュータシステムです。',
    });
    const result = await evaluator.evaluate(input);

    expect(result.score).toBe(0.9);
    expect(result.passed).toBe(true);
    expect(result.metadata?.coveredPoints).toHaveLength(2);
    expect(result.metadata?.missedPoints).toHaveLength(0);
  });

  it('should return error when ground truth is missing', async () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new ContextRecallEvaluator(mockProvider);
    const result = await evaluator.evaluate(createRAGInput());

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reasoning).toContain('グラウンドトゥルースが指定されていません');
  });

  it('should handle partial coverage', async () => {
    const response = JSON.stringify({
      coveredPoints: ['AIの定義'],
      missedPoints: ['機械学習の詳細', '応用例'],
      score: 0.4,
      reasoning: '一部のポイントがカバーされていません',
    });

    const mockProvider = createMockLLMProvider(response);
    const evaluator = new ContextRecallEvaluator(mockProvider);
    const input = createRAGInput({ groundTruth: '詳細な説明' });
    const result = await evaluator.evaluate(input);

    expect(result.score).toBe(0.4);
    expect(result.passed).toBe(false);
    expect(result.metadata?.coverageRatio).toBeCloseTo(0.333, 2);
  });
});

describe('RAGASCompositeEvaluator', () => {
  it('should create evaluator with default metrics', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new RAGASCompositeEvaluator(mockProvider);
    
    expect(evaluator.name).toBe('ragas-composite');
    expect(evaluator.getEnabledMetrics()).toContain('faithfulness');
    expect(evaluator.getEnabledMetrics()).toContain('contextRelevancy');
    expect(evaluator.getEnabledMetrics()).toContain('answerRelevancy');
    expect(evaluator.getEnabledMetrics()).not.toContain('contextRecall');
  });

  it('should create evaluator with custom metrics', () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new RAGASCompositeEvaluator(mockProvider, {
      enabledMetrics: ['faithfulness', 'contextRecall'],
    });

    expect(evaluator.getEnabledMetrics()).toHaveLength(2);
    expect(evaluator.getEnabledMetrics()).toContain('faithfulness');
    expect(evaluator.getEnabledMetrics()).toContain('contextRecall');
  });

  it('should evaluate all enabled metrics', async () => {
    // 各評価器用のレスポンス
    const responses = [
      // Faithfulness: ステートメント抽出
      JSON.stringify(['statement']),
      // Faithfulness: 検証
      JSON.stringify({ supported: ['statement'], unsupported: [] }),
      // Context Relevancy
      JSON.stringify({ scores: [0.8], reasoning: '関連' }),
      // Answer Relevancy
      JSON.stringify({ score: 0.9, reasoning: '適切', directlyAnswers: true, hasIrrelevantInfo: false }),
    ];

    let callIndex = 0;
    const mockProvider: MockLLMProvider = {
      generate: vi.fn().mockImplementation(() => {
        const response = responses[callIndex] ?? '{}';
        callIndex++;
        return Promise.resolve({ content: response });
      }),
    };

    const evaluator = new RAGASCompositeEvaluator(mockProvider, {
      enabledMetrics: ['faithfulness', 'contextRelevancy', 'answerRelevancy'],
    });

    const result = (await evaluator.evaluate(createRAGInput())) as RAGASEvaluationResult;

    expect(result.metrics.faithfulness).toBeDefined();
    expect(result.metrics.contextRelevancy).toBeDefined();
    expect(result.metrics.answerRelevancy).toBeDefined();
    expect(result.normalizedScore).toBeGreaterThan(0);
    expect(result.metadata?.individualResults).toHaveLength(3);
  });

  it('should apply custom weights', async () => {
    // 簡略化: 全て同じスコア(0.5)を返す
    const mockProvider: MockLLMProvider = {
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({ scores: [0.5], score: 0.5 }),
      }),
    };

    const evaluator = new RAGASCompositeEvaluator(mockProvider, {
      enabledMetrics: ['contextRelevancy', 'answerRelevancy'],
      weights: {
        contextRelevancy: 2,
        answerRelevancy: 1,
      },
    });

    const result = (await evaluator.evaluate(createRAGInput())) as RAGASEvaluationResult;

    // 重み付け平均: (0.5 * 2 + 0.5 * 1) / 3 = 0.5
    expect(result.normalizedScore).toBeCloseTo(0.5, 1);
  });

  it('should return error for non-RAG input', async () => {
    const mockProvider = createMockLLMProvider('{}');
    const evaluator = new RAGASCompositeEvaluator(mockProvider);
    const result = (await evaluator.evaluate({ output: 'test' })) as RAGASEvaluationResult;

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.metrics).toEqual({});
  });

  it('should include analysis from faithfulness evaluator', async () => {
    const responses = [
      JSON.stringify(['stmt1', 'stmt2']),
      JSON.stringify({ supported: ['stmt1'], unsupported: ['stmt2'] }),
    ];

    let callIndex = 0;
    const mockProvider: MockLLMProvider = {
      generate: vi.fn().mockImplementation(() => {
        const response = responses[callIndex] ?? '{}';
        callIndex++;
        return Promise.resolve({ content: response });
      }),
    };

    const evaluator = new RAGASCompositeEvaluator(mockProvider, {
      enabledMetrics: ['faithfulness'],
    });

    const result = (await evaluator.evaluate(createRAGInput())) as RAGASEvaluationResult;

    expect(result.analysis).toBeDefined();
    expect(result.analysis?.statements).toEqual(['stmt1', 'stmt2']);
    expect(result.analysis?.supportedStatements).toEqual(['stmt1']);
    expect(result.analysis?.unsupportedStatements).toEqual(['stmt2']);
  });
});
