/**
 * LLMJudgeEvaluator Tests
 *
 * @requirement REQ-EVAL-101
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LLMJudgeEvaluator,
  DEFAULT_CRITERIA,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EVALUATION_PROMPT_TEMPLATE,
} from '../src/evaluators/LLMJudgeEvaluator.js';
import type { EvaluationCriteria, LLMJudgeResult } from '../src/types.js';

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

describe('LLMJudgeEvaluator', () => {
  describe('constructor', () => {
    it('should create evaluator with default criteria', () => {
      const mockProvider = createMockLLMProvider('{}');
      const evaluator = new LLMJudgeEvaluator(mockProvider);

      expect(evaluator.name).toBe('llm-judge');
      expect(evaluator.getCriteria()).toHaveLength(DEFAULT_CRITERIA.length);
    });

    it('should create evaluator with custom name', () => {
      const mockProvider = createMockLLMProvider('{}');
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        name: 'custom-judge',
        criteria: DEFAULT_CRITERIA,
      });

      expect(evaluator.name).toBe('custom-judge');
    });

    it('should create evaluator with custom criteria', () => {
      const mockProvider = createMockLLMProvider('{}');
      const customCriteria: EvaluationCriteria[] = [
        { name: 'accuracy', description: '正確性' },
        { name: 'fluency', description: '流暢性' },
      ];
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: customCriteria,
      });

      expect(evaluator.getCriteria()).toHaveLength(2);
      expect(evaluator.getCriteria()[0]?.name).toBe('accuracy');
    });
  });

  describe('evaluate', () => {
    it('should successfully evaluate with valid JSON response', async () => {
      const validResponse = JSON.stringify({
        scores: {
          relevance: { score: 4, reasoning: '関連性が高い' },
          coherence: { score: 5, reasoning: '論理的' },
          helpfulness: { score: 4, reasoning: '有用' },
        },
        overallAssessment: '全体的に良好',
      });

      const mockProvider = createMockLLMProvider(validResponse);
      const evaluator = new LLMJudgeEvaluator(mockProvider);

      const result = (await evaluator.evaluate({
        input: 'AIについて説明して',
        output: 'AIは人工知能の略です...',
      })) as LLMJudgeResult;

      expect(result.evaluator).toBe('llm-judge');
      expect(result.normalizedScore).toBeGreaterThan(0);
      expect(result.passed).toBe(true);
      expect(result.criteriaScores.relevance.score).toBe(4);
      expect(result.criteriaScores.coherence.score).toBe(5);
      expect(result.reasoning).toBe('全体的に良好');
      expect(result.tokenUsage?.totalTokens).toBe(150);
    });

    it('should handle JSON in code block', async () => {
      const responseWithCodeBlock = `\`\`\`json
{
  "scores": {
    "relevance": { "score": 3, "reasoning": "普通" }
  }
}
\`\`\``;

      const mockProvider = createMockLLMProvider(responseWithCodeBlock);
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'relevance', description: '関連性' }],
      });

      const result = (await evaluator.evaluate({
        output: 'テスト出力',
      })) as LLMJudgeResult;

      expect(result.criteriaScores.relevance?.score).toBe(3);
    });

    it('should calculate normalized score correctly', async () => {
      const response = JSON.stringify({
        scores: {
          relevance: { score: 5, reasoning: '完璧' },
          coherence: { score: 5, reasoning: '完璧' },
          helpfulness: { score: 5, reasoning: '完璧' },
        },
      });

      const mockProvider = createMockLLMProvider(response);
      const evaluator = new LLMJudgeEvaluator(mockProvider);

      const result = await evaluator.evaluate({ output: '素晴らしい回答' });

      // 全て5/5なので正規化スコアは1.0
      expect(result.normalizedScore).toBe(1);
    });

    it('should respect custom scale', async () => {
      const response = JSON.stringify({
        scores: {
          quality: { score: 8, reasoning: '高品質' },
        },
      });

      const mockProvider = createMockLLMProvider(response);
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'quality', description: '品質', scale: { min: 0, max: 10 } }],
        scale: { min: 0, max: 10 },
      });

      const result = await evaluator.evaluate({ output: 'テスト' });

      // 8/10 = 0.8
      expect(result.normalizedScore).toBeCloseTo(0.8, 1);
    });

    it('should respect criteria weights', async () => {
      const response = JSON.stringify({
        scores: {
          important: { score: 5, reasoning: '重要' },
          lessImportant: { score: 1, reasoning: '重要でない' },
        },
      });

      const mockProvider = createMockLLMProvider(response);
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [
          { name: 'important', description: '重要', weight: 3 },
          { name: 'lessImportant', description: '重要でない', weight: 1 },
        ],
      });

      const result = await evaluator.evaluate({ output: 'テスト' });

      // 重み付き平均: (1.0 * 3 + 0.0 * 1) / 4 = 0.75
      expect(result.normalizedScore).toBeCloseTo(0.75, 1);
    });

    it('should retry on API failure', async () => {
      const mockProvider: MockLLMProvider = {
        generate: vi
          .fn()
          .mockRejectedValueOnce(new Error('API error'))
          .mockRejectedValueOnce(new Error('API error'))
          .mockResolvedValueOnce({
            content: JSON.stringify({
              scores: { relevance: { score: 4, reasoning: 'ok' } },
            }),
          }),
      };

      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'relevance', description: '関連性' }],
        maxRetries: 3,
      });

      const result = (await evaluator.evaluate({ output: 'test' })) as LLMJudgeResult;

      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
      expect(result.criteriaScores.relevance?.score).toBe(4);
    });

    it('should return error result after max retries', async () => {
      const mockProvider: MockLLMProvider = {
        generate: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'test', description: 'test' }],
        maxRetries: 2,
      });

      const result = (await evaluator.evaluate({ output: 'test' })) as LLMJudgeResult;

      expect(mockProvider.generate).toHaveBeenCalledTimes(2);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('API error');
    });

    it('should extract scores from text when JSON parsing fails', async () => {
      const textResponse = `
評価結果:
relevance: 4/5 - 良好
coherence: 3/5 - 普通
helpfulness: 5/5 - 素晴らしい
`;

      const mockProvider = createMockLLMProvider(textResponse);
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: DEFAULT_CRITERIA,
        maxRetries: 1,
      });

      const result = (await evaluator.evaluate({ output: 'test' })) as LLMJudgeResult;

      // テキストから抽出されたスコア
      expect(result.criteriaScores.relevance?.score).toBe(4);
      expect(result.criteriaScores.coherence?.score).toBe(3);
      expect(result.criteriaScores.helpfulness?.score).toBe(5);
    });

    it('should use default score when extraction fails', async () => {
      const mockProvider = createMockLLMProvider('no scores here');
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'test', description: 'test' }],
        maxRetries: 1,
      });

      const result = (await evaluator.evaluate({ output: 'test' })) as LLMJudgeResult;

      // 中央値(3)がデフォルト
      expect(result.criteriaScores.test?.score).toBe(3);
    });
  });

  describe('setCriteria', () => {
    it('should update criteria', () => {
      const mockProvider = createMockLLMProvider('{}');
      const evaluator = new LLMJudgeEvaluator(mockProvider);

      const newCriteria: EvaluationCriteria[] = [
        { name: 'new', description: '新しい基準' },
      ];
      evaluator.setCriteria(newCriteria);

      expect(evaluator.getCriteria()).toHaveLength(1);
      expect(evaluator.getCriteria()[0]?.name).toBe('new');
    });
  });

  describe('prompt building', () => {
    it('should include input and output in prompt', async () => {
      const mockProvider = createMockLLMProvider('{}');
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'test', description: 'test' }],
        maxRetries: 1,
      });

      await evaluator.evaluate({
        input: 'テスト入力',
        output: 'テスト出力',
      });

      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('テスト入力'),
            }),
          ]),
        })
      );
      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('テスト出力'),
            }),
          ]),
        })
      );
    });

    it('should use custom system prompt', async () => {
      const mockProvider = createMockLLMProvider('{}');
      const customPrompt = 'カスタムシステムプロンプト';
      const evaluator = new LLMJudgeEvaluator(mockProvider, {
        criteria: [{ name: 'test', description: 'test' }],
        systemPrompt: customPrompt,
        maxRetries: 1,
      });

      await evaluator.evaluate({ output: 'test' });

      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: customPrompt,
            }),
          ]),
        })
      );
    });
  });

  describe('DEFAULT_CRITERIA', () => {
    it('should have standard criteria', () => {
      expect(DEFAULT_CRITERIA).toContainEqual(
        expect.objectContaining({ name: 'relevance' })
      );
      expect(DEFAULT_CRITERIA).toContainEqual(
        expect.objectContaining({ name: 'coherence' })
      );
      expect(DEFAULT_CRITERIA).toContainEqual(
        expect.objectContaining({ name: 'helpfulness' })
      );
    });

    it('should have rubric for each criterion', () => {
      for (const criterion of DEFAULT_CRITERIA) {
        expect(criterion.rubric).toBeDefined();
        expect(Object.keys(criterion.rubric ?? {})).toHaveLength(5);
      }
    });
  });

  describe('DEFAULT_SYSTEM_PROMPT', () => {
    it('should be defined', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toBeDefined();
      expect(typeof DEFAULT_SYSTEM_PROMPT).toBe('string');
      expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_EVALUATION_PROMPT_TEMPLATE', () => {
    it('should contain required placeholders', () => {
      expect(DEFAULT_EVALUATION_PROMPT_TEMPLATE).toContain('{{input}}');
      expect(DEFAULT_EVALUATION_PROMPT_TEMPLATE).toContain('{{output}}');
      expect(DEFAULT_EVALUATION_PROMPT_TEMPLATE).toContain('{{criteria}}');
    });
  });
});
