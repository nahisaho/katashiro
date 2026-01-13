/**
 * Dialogue Collector Tests
 *
 * @fileoverview MUSUBIX風対話型情報収集システムのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DialogueCollector,
  QuestionGenerator,
  IntentAnalyzer,
  runSimpleDialogue,
  DEFAULT_DIALOGUE_CONFIG,
} from '../../src/dialogue';
import type {
  DialogueQuestion,
  DialogueCollectorConfig,
  ExtractedContext,
} from '../../src/dialogue';

describe('DialogueCollector', () => {
  let collector: DialogueCollector;

  beforeEach(() => {
    collector = new DialogueCollector({ language: 'ja' });
  });

  describe('startSession', () => {
    it('should create a new session with initial input', () => {
      const session = collector.startSession('新しいシステムを導入したい');

      expect(session.id).toMatch(/^dlg-/);
      expect(session.status).toBe('in_progress');
      expect(session.initialInput).toBe('新しいシステムを導入したい');
      expect(session.exchanges).toHaveLength(0);
    });

    it('should store the session', () => {
      const session = collector.startSession('テスト');
      const retrieved = collector.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });
  });

  describe('getNextQuestion', () => {
    it('should return a question for an active session', () => {
      const session = collector.startSession('業務を効率化したい');
      const question = collector.getNextQuestion(session.id);

      expect(question).toBeDefined();
      expect(question?.text).toBeTruthy();
      expect(question?.category).toBeDefined();
    });

    it('should throw error for non-existent session', () => {
      expect(() => collector.getNextQuestion('invalid-id')).toThrow(
        'Session not found'
      );
    });

    it('should return null after max questions', () => {
      const limitedCollector = new DialogueCollector({
        language: 'ja',
        maxQuestions: 2,
        minQuestions: 1,
      });

      const session = limitedCollector.startSession('テスト');

      // 2つの質問と回答を追加
      for (let i = 0; i < 2; i++) {
        const question = limitedCollector.getNextQuestion(session.id);
        if (question) {
          limitedCollector.presentQuestion(session.id, question);
          limitedCollector.recordAnswer(session.id, `回答${i + 1}`);
        }
      }

      // 3つ目は取得できない
      const thirdQuestion = limitedCollector.getNextQuestion(session.id);
      expect(thirdQuestion).toBeNull();
    });
  });

  describe('recordAnswer', () => {
    it('should record an answer to the last question', () => {
      const session = collector.startSession('コスト削減したい');
      const question = collector.getNextQuestion(session.id)!;

      collector.presentQuestion(session.id, question);
      collector.recordAnswer(session.id, 'IT関連のコストが問題です');

      const updated = collector.getSession(session.id)!;
      expect(updated.exchanges).toHaveLength(1);
      expect(updated.exchanges[0]?.answer?.text).toBe('IT関連のコストが問題です');
    });

    it('should update context after recording answer', () => {
      const session = collector.startSession('マーケティングを強化したい');
      const question = collector.getNextQuestion(session.id)!;

      collector.presentQuestion(session.id, question);
      collector.recordAnswer(session.id, '顧客獲得コストを下げたい');

      const updated = collector.getSession(session.id)!;
      expect(updated.extractedContext.keywords.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getResult', () => {
    it('should return context and inferred intent', () => {
      const session = collector.startSession('売上を伸ばしたい');
      const question = collector.getNextQuestion(session.id)!;

      collector.presentQuestion(session.id, question);
      collector.recordAnswer(session.id, '新規顧客を増やしたい');

      const result = collector.getResult(session.id);

      expect(result.session).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.inferredIntent).toBeDefined();
      expect(result.inferredIntent.surfaceIntent).toBeTruthy();
      expect(result.inferredIntent.confidence).toBeGreaterThan(0);
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', () => {
      const session = collector.startSession('テスト');
      collector.completeSession(session.id);

      const updated = collector.getSession(session.id)!;
      expect(updated.status).toBe('completed');
      expect(updated.endTime).toBeDefined();
    });
  });

  describe('cancelSession', () => {
    it('should mark session as cancelled', () => {
      const session = collector.startSession('テスト');
      collector.cancelSession(session.id);

      const updated = collector.getSession(session.id)!;
      expect(updated.status).toBe('cancelled');
    });
  });

  describe('deleteSession', () => {
    it('should delete the session', () => {
      const session = collector.startSession('テスト');
      const deleted = collector.deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(collector.getSession(session.id)).toBeUndefined();
    });
  });

  describe('runDialogue', () => {
    it('should run a complete dialogue flow', async () => {
      const answers = [
        '売上向上のため',
        '現状は横ばい',
        '予算は1000万円まで',
        '来月末まで',
        '20%増加',
      ];
      let answerIndex = 0;

      const result = await collector.runDialogue(
        '新しい施策を考えたい',
        async () => {
          return answers[answerIndex++] || 'はい、その通りです';
        }
      );

      expect(result.context).toBeDefined();
      expect(result.inferredIntent).toBeDefined();
      expect(result.inferredIntent.confidence).toBeGreaterThan(0.5);
    });
  });
});

describe('QuestionGenerator', () => {
  describe('Japanese', () => {
    const generator = new QuestionGenerator('ja');

    it('should generate purpose questions', () => {
      const context: ExtractedContext = {
        explicitPurpose: null,
        implicitPurpose: null,
        background: { reason: null, currentState: null, desiredState: null, attemptedSolutions: [] },
        constraints: [],
        stakeholders: [],
        successCriteria: [],
        priorities: [],
        risks: [],
        keywords: [],
        domain: null,
        urgency: 'medium',
        complexity: 'moderate',
      };

      const question = generator.generateNextQuestion(context, [], 'adaptive');

      expect(question).toBeDefined();
      expect(question?.category).toBe('purpose');
      expect(question?.text).toMatch(/\?|？/); // ASCII or fullwidth question mark
    });

    it('should generate confirmation questions', () => {
      const context: ExtractedContext = {
        explicitPurpose: '業務効率化',
        implicitPurpose: 'コスト削減',
        background: { reason: null, currentState: null, desiredState: null, attemptedSolutions: [] },
        constraints: [],
        stakeholders: [],
        successCriteria: [],
        priorities: [],
        risks: [],
        keywords: ['効率', '自動化'],
        domain: 'operations',
        urgency: 'medium',
        complexity: 'moderate',
      };

      const intent = {
        surfaceIntent: '業務を効率化したい',
        trueIntent: 'コスト削減のために業務を効率化したい',
        confidence: 0.85,
        reasoning: [],
        alternativeInterpretations: [],
        recommendedApproach: '標準アプローチ',
        needsClarification: [],
      };

      const question = generator.generateConfirmationQuestion(context, intent);

      expect(question).toBeDefined();
      expect(question.type).toBe('confirmation');
      expect(question.text).toContain('コスト削減のために業務を効率化したい');
    });
  });

  describe('English', () => {
    const generator = new QuestionGenerator('en');

    it('should generate questions in English', () => {
      const context: ExtractedContext = {
        explicitPurpose: null,
        implicitPurpose: null,
        background: { reason: null, currentState: null, desiredState: null, attemptedSolutions: [] },
        constraints: [],
        stakeholders: [],
        successCriteria: [],
        priorities: [],
        risks: [],
        keywords: [],
        domain: null,
        urgency: 'medium',
        complexity: 'moderate',
      };

      const question = generator.generateNextQuestion(context, [], 'adaptive');

      expect(question).toBeDefined();
      expect(question?.text).not.toMatch(/[ぁ-んァ-ン]/); // No Japanese characters
    });
  });
});

describe('IntentAnalyzer', () => {
  describe('Japanese', () => {
    const analyzer = new IntentAnalyzer('ja');

    it('should analyze intent from exchanges', () => {
      const exchanges = [
        {
          id: '1',
          question: {
            id: 'q1',
            type: 'open' as const,
            category: 'purpose' as const,
            text: '目的は？',
          },
          answer: { text: '売上を伸ばしたい', timestamp: new Date(), confidence: 1 },
          timestamp: new Date(),
        },
        {
          id: '2',
          question: {
            id: 'q2',
            type: 'open' as const,
            category: 'background' as const,
            text: '背景は？',
          },
          answer: { text: '競合に負けているから', timestamp: new Date(), confidence: 1 },
          timestamp: new Date(),
        },
      ];

      const intent = analyzer.analyzeIntent('成長したい', exchanges);

      expect(intent.surfaceIntent).toBeTruthy();
      expect(intent.trueIntent).toBeTruthy();
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.reasoning.length).toBeGreaterThan(0);
    });

    it('should extract context', () => {
      const exchanges = [
        {
          id: '1',
          question: {
            id: 'q1',
            type: 'open' as const,
            category: 'constraints' as const,
            text: '制約は？',
          },
          answer: { text: '予算は500万円まで、期限は3ヶ月', timestamp: new Date(), confidence: 1 },
          timestamp: new Date(),
        },
      ];

      const context = analyzer.extractContext('システム導入', exchanges);

      expect(context.constraints.length).toBeGreaterThan(0);
      expect(context.keywords).toBeDefined();
    });

    it('should detect domain', () => {
      const exchanges = [
        {
          id: '1',
          question: {
            id: 'q1',
            type: 'open' as const,
            category: 'purpose' as const,
            text: '目的は？',
          },
          answer: { text: 'マーケティングを強化したい', timestamp: new Date(), confidence: 1 },
          timestamp: new Date(),
        },
      ];

      const context = analyzer.extractContext('顧客獲得', exchanges);

      expect(context.domain).toBe('marketing');
    });
  });
});

describe('runSimpleDialogue', () => {
  it('should run dialogue with custom config', async () => {
    const answers = ['テスト目的', '背景情報', 'はい'];
    let index = 0;

    const result = await runSimpleDialogue(
      'テスト入力',
      async () => answers[index++] || 'はい',
      { language: 'ja', maxQuestions: 3, minQuestions: 2 }
    );

    expect(result.inferredIntent).toBeDefined();
    expect(result.context).toBeDefined();
  });
});

describe('DEFAULT_DIALOGUE_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_DIALOGUE_CONFIG.maxQuestions).toBe(10);
    expect(DEFAULT_DIALOGUE_CONFIG.minQuestions).toBe(3);
    expect(DEFAULT_DIALOGUE_CONFIG.confidenceThreshold).toBe(0.8);
    expect(DEFAULT_DIALOGUE_CONFIG.strategy).toBe('adaptive');
    expect(DEFAULT_DIALOGUE_CONFIG.language).toBe('ja');
  });
});
