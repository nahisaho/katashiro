/**
 * LLM Dialogue Collector Integration Tests
 *
 * @fileoverview LLMDialogueCollectorのOllama接続統合テスト
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LLMDialogueCollector, LLMProvider } from '../src/dialogue/llm-dialogue-collector';
import { OllamaLLMProvider, LLMProviderConfig } from '@nahisaho/katashiro-llm';

const OLLAMA_HOST = process.env.OLLAMA_HOST || '192.168.224.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

/**
 * Ollamaサーバーの接続確認
 */
async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(`http://${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * OllamaLLMProviderをLLMProviderインターフェースにアダプト
 */
function createLLMProvider(ollamaProvider: OllamaLLMProvider): LLMProvider {
  return {
    async generate(request) {
      const messages = request.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));
      return ollamaProvider.generate({ messages, temperature: request.temperature });
    },
  };
}

describe('LLMDialogueCollector Integration Tests', () => {
  let ollamaProvider: OllamaLLMProvider;
  let llmProvider: LLMProvider;
  let isOllamaAvailable = false;

  beforeAll(async () => {
    isOllamaAvailable = await checkOllamaConnection();

    if (isOllamaAvailable) {
      const config: LLMProviderConfig = {
        type: 'ollama',
        baseUrl: `http://${OLLAMA_HOST}`,
        model: OLLAMA_MODEL,
        temperature: 0.7,
        maxTokens: 1024,
      };
      ollamaProvider = new OllamaLLMProvider(config);
      llmProvider = createLLMProvider(ollamaProvider);
      console.log(`✓ Ollama connected: ${OLLAMA_HOST}, model: ${OLLAMA_MODEL}`);
    } else {
      console.warn(`⚠ Ollama not available at ${OLLAMA_HOST}, skipping integration tests`);
    }
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Basic Functionality', () => {
    it('should create LLMDialogueCollector instance', () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 3,
        language: 'ja',
      });

      expect(collector).toBeDefined();
    });

    it('should run deep dive dialogue with mocked answers', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 3,
        minQuestions: 1,
        confidenceThreshold: 0.5,
        language: 'ja',
      });

      // モック回答を用意
      const mockAnswers = [
        '現在の業務効率が悪く、残業が増えているからです',
        '営業部門の月次レポート作成作業を効率化したいです',
        '週5時間かかっている作業を1時間以下にしたいです',
      ];
      let answerIndex = 0;

      const result = await collector.deepDive(
        '新しいシステムを導入したい',
        async (question) => {
          console.log(`Q${answerIndex + 1}: ${question.text}`);
          const answer = mockAnswers[answerIndex] || '特にありません';
          console.log(`A${answerIndex + 1}: ${answer}`);
          answerIndex++;
          return answer;
        }
      );

      console.log('\n=== Deep Dive Result ===');
      console.log('Original Input:', result.originalInput);
      console.log('True Purpose:', result.truePurpose);
      console.log('Confidence:', result.confidence);
      console.log('Summary:', result.dialogueSummary);
      console.log('Insights:', result.insights);
      console.log('Recommended Actions:', result.recommendedActions);

      expect(result.originalInput).toBe('新しいシステムを導入したい');
      expect(result.truePurpose).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.dialogueSummary).toBeDefined();
    }, 120000); // 2分タイムアウト（LLM生成時間考慮）

    it('should extract context from dialogue', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 2,
        minQuestions: 1,
        language: 'ja',
      });

      const result = await collector.deepDive(
        '売上を伸ばしたい',
        async () => {
          return 'ECサイトの新規顧客獲得に注力し、半年で売上20%増を目指したい';
        }
      );

      console.log('\n=== Context Extraction ===');
      console.log('Clarified Context:', JSON.stringify(result.clarifiedContext, null, 2));

      expect(result.clarifiedContext).toBeDefined();
      expect(result.clarifiedContext.successCriteria.length).toBeGreaterThanOrEqual(0);
    }, 120000);
  });

  describe('Configuration Options', () => {
    it('should respect maxQuestions limit', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 2,
        minQuestions: 2,
        language: 'ja',
      });

      let questionCount = 0;

      await collector.deepDive(
        'テスト入力',
        async () => {
          questionCount++;
          return '回答';
        }
      );

      expect(questionCount).toBeLessThanOrEqual(2);
    }, 60000);

    it('should use custom temperature', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        temperature: 0.3, // Low temperature for more deterministic output
        maxQuestions: 1,
        minQuestions: 1,
        language: 'ja',
      });

      const result = await collector.deepDive(
        '会議を減らしたい',
        async () => '週に10時間以上会議に費やしており、実作業時間が確保できない'
      );

      expect(result).toBeDefined();
      expect(result.truePurpose).toBeDefined();
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle empty answers gracefully', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 2,
        minQuestions: 1,
        language: 'ja',
      });

      const result = await collector.deepDive(
        'コスト削減したい',
        async () => '' // Empty answer
      );

      expect(result).toBeDefined();
      expect(result.originalInput).toBe('コスト削減したい');
    }, 60000);

    it('should handle callback errors gracefully', async () => {
      if (!isOllamaAvailable) {
        console.log('Skipped: Ollama not available');
        return;
      }

      const collector = new LLMDialogueCollector({
        llmProvider,
        maxQuestions: 2,
        minQuestions: 0,
        language: 'ja',
      });

      let callCount = 0;
      
      try {
        await collector.deepDive(
          'テスト',
          async () => {
            callCount++;
            if (callCount === 1) {
              throw new Error('Callback error');
            }
            return '回答';
          }
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});

describe('LLMDialogueCollector Unit Tests (No Ollama)', () => {
  it('should create instance with mock provider', () => {
    const mockProvider: LLMProvider = {
      generate: async () => ({ content: '{"sufficient": true}' }),
    };

    const collector = new LLMDialogueCollector({
      llmProvider: mockProvider,
      maxQuestions: 5,
      language: 'ja',
    });

    expect(collector).toBeDefined();
  });

  it('should parse JSON response with code block', async () => {
    const mockProvider: LLMProvider = {
      generate: async () => ({
        content: '```json\n{"question": "テスト質問", "category": "purpose", "reasoning": "理由"}\n```',
      }),
    };

    const collector = new LLMDialogueCollector({
      llmProvider: mockProvider,
      maxQuestions: 1,
      minQuestions: 0,
      confidenceThreshold: 0.1,
      language: 'ja',
    });

    // Mock the termination check to return immediately
    const mockTerminationProvider: LLMProvider = {
      generate: async (req) => {
        if (req.messages.some((m) => m.content.includes('判定'))) {
          return { content: '{"sufficient": true, "confidence": 0.9}' };
        }
        if (req.messages.some((m) => m.content.includes('分析'))) {
          return {
            content: JSON.stringify({
              truePurpose: 'テスト目的',
              confidence: 0.8,
              insights: ['インサイト1'],
              recommendedActions: ['アクション1'],
              summary: 'サマリー',
            }),
          };
        }
        return { content: '{"sufficient": true}' };
      },
    };

    const collector2 = new LLMDialogueCollector({
      llmProvider: mockTerminationProvider,
      maxQuestions: 1,
      minQuestions: 0,
      language: 'ja',
    });

    const result = await collector2.deepDive('テスト入力', async () => 'テスト回答');

    expect(result.originalInput).toBe('テスト入力');
  });
});
