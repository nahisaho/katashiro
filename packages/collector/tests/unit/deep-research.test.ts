/**
 * Deep Research Module Tests
 *
 * @version 3.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  KnowledgeBase,
  LMReasoning,
  TemplateLMProvider,
  JinaProvider,
  DuckDuckGoProvider,
  SearchProviderFactory,
  ResearchEngine,
  deepResearch,
  DeepResearchError,
  AllProvidersFailedError,
  TokenBudgetExceededError,
} from '../../src/research/deep-research/index.js';
import type {
  KnowledgeItem,
  WebContent,
  ResearchContext,
} from '../../src/research/deep-research/types.js';

// ============ KnowledgeBase Tests ============

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('add', () => {
    it('should add a knowledge item', () => {
      const item = kb.add({
        type: 'fact',
        content: 'Test fact content',
        sources: ['https://example.com'],
        relevance: 0.8,
        iteration: 1,
      });

      expect(item).not.toBeNull();
      expect(item?.id).toMatch(/^ki-/);
      expect(item?.content).toBe('Test fact content');
    });

    it('should reject duplicate content', () => {
      kb.add({
        type: 'fact',
        content: 'Duplicate content here',
        sources: ['https://example.com'],
        relevance: 0.8,
        iteration: 1,
      });

      const duplicate = kb.add({
        type: 'fact',
        content: 'Duplicate content here',
        sources: ['https://other.com'],
        relevance: 0.9,
        iteration: 2,
      });

      expect(duplicate).toBeNull();
    });
  });

  describe('addFromContent', () => {
    it('should extract facts from web content', () => {
      const content: WebContent = {
        url: 'https://example.com',
        title: 'Test Page',
        content: 'Some content here',
        extractedFacts: [
          'There are 100 million users worldwide.',
          'The company was founded in 2020.',
        ],
        wordCount: 100,
        extractedAt: Date.now(),
      };

      const added = kb.addFromContent(content, 1);

      expect(added.length).toBe(2);
      expect(added[0]?.type).toBe('fact');
      expect(added[0]?.sources).toContain('https://example.com');
    });
  });

  describe('searchSimilar', () => {
    it('should find similar items', () => {
      kb.add({
        type: 'fact',
        content: 'Artificial intelligence is transforming industries',
        sources: ['https://ai.example.com'],
        relevance: 0.9,
        iteration: 1,
      });

      kb.add({
        type: 'fact',
        content: 'Machine learning algorithms learn from data',
        sources: ['https://ml.example.com'],
        relevance: 0.8,
        iteration: 1,
      });

      const results = kb.searchSimilar('AI and machine learning');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.similarity).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      kb.add({
        type: 'fact',
        content: 'Fact 1',
        sources: ['https://a.com'],
        relevance: 0.8,
        iteration: 1,
      });
      kb.add({
        type: 'opinion',
        content: 'Opinion 1',
        sources: ['https://b.com'],
        relevance: 0.6,
        iteration: 1,
      });
      kb.add({
        type: 'fact',
        content: 'Fact 2 with different content',
        sources: ['https://c.com'],
        relevance: 0.7,
        iteration: 2,
      });

      const stats = kb.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.factCount).toBe(2);
      expect(stats.opinionCount).toBe(1);
      expect(stats.uniqueSources).toBe(3);
    });
  });

  describe('export/import', () => {
    it('should export and import items', () => {
      kb.add({
        type: 'fact',
        content: 'Exportable fact',
        sources: ['https://export.com'],
        relevance: 0.8,
        iteration: 1,
      });

      const exported = kb.export();
      expect(exported.length).toBe(1);

      const newKb = new KnowledgeBase();
      const imported = newKb.import(exported);

      expect(imported).toBe(1);
      expect(newKb.getAll().length).toBe(1);
    });
  });
});

// ============ LMReasoning Tests ============

describe('LMReasoning', () => {
  let lm: LMReasoning;

  beforeEach(() => {
    lm = new LMReasoning({
      provider: new TemplateLMProvider(),
    });
  });

  describe('generateReflectiveQuestions', () => {
    it('should generate questions', async () => {
      const context: ResearchContext = {
        query: 'AI ethics',
        iteration: 1,
        maxIterations: 5,
        knowledgeBase: [],
        previousQuestions: [],
      };

      const questions = await lm.generateReflectiveQuestions(context);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toHaveProperty('question');
      expect(questions[0]).toHaveProperty('reason');
      expect(questions[0]).toHaveProperty('priority');
    });
  });

  describe('evaluateAnswer', () => {
    it('should evaluate answer quality', async () => {
      const items: KnowledgeItem[] = [
        {
          id: 'ki-1',
          type: 'fact',
          content: 'AI ethics is important',
          sources: ['https://example.com'],
          relevance: 0.8,
          iteration: 1,
          timestamp: Date.now(),
        },
      ];

      const evaluation = await lm.evaluateAnswer(
        'What is AI ethics?',
        'AI ethics deals with moral issues in AI',
        items
      );

      expect(evaluation).toHaveProperty('isDefinitive');
      expect(evaluation).toHaveProperty('confidence');
      expect(evaluation).toHaveProperty('missingAspects');
    });
  });

  describe('token tracking', () => {
    it('should track tokens used', async () => {
      const context: ResearchContext = {
        query: 'Test query',
        iteration: 1,
        maxIterations: 5,
        knowledgeBase: [],
        previousQuestions: [],
      };

      await lm.generateReflectiveQuestions(context);

      expect(lm.getTokensUsed()).toBeGreaterThan(0);

      lm.resetTokenCount();
      expect(lm.getTokensUsed()).toBe(0);
    });
  });
});

// ============ Provider Tests ============

describe('JinaProvider', () => {
  it('should be instantiable', () => {
    const provider = new JinaProvider();
    expect(provider.name).toBe('jina');
  });

  it('should have search method', () => {
    const provider = new JinaProvider();
    expect(typeof provider.search).toBe('function');
  });

  it('should have read method', () => {
    const provider = new JinaProvider();
    expect(typeof provider.read).toBe('function');
  });
});

describe('DuckDuckGoProvider', () => {
  it('should be instantiable', () => {
    const provider = new DuckDuckGoProvider();
    expect(provider.name).toBe('duckduckgo');
  });

  it('should have search method', () => {
    const provider = new DuckDuckGoProvider();
    expect(typeof provider.search).toBe('function');
  });
});

describe('SearchProviderFactory', () => {
  it('should be instantiable', () => {
    const factory = new SearchProviderFactory();
    expect(factory).toBeInstanceOf(SearchProviderFactory);
  });

  it('should return provider status', () => {
    const factory = new SearchProviderFactory();
    const status = factory.getProviderStatus();

    expect(status).toHaveProperty('jina');
    expect(status).toHaveProperty('duckduckgo');
  });
});

// ============ ResearchEngine Tests ============

describe('ResearchEngine', () => {
  it('should be instantiable', () => {
    const engine = new ResearchEngine();
    expect(engine).toBeInstanceOf(ResearchEngine);
  });

  it('should have research method', () => {
    const engine = new ResearchEngine();
    expect(typeof engine.research).toBe('function');
  });

  it('should support event listeners', () => {
    const engine = new ResearchEngine();
    const listener = vi.fn();

    const unsubscribe = engine.on(listener);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
  });
});

// ============ Error Classes Tests ============

describe('Error Classes', () => {
  it('should create DeepResearchError', () => {
    const error = new DeepResearchError('Test error', 'TEST_CODE', {
      foo: 'bar',
    });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('DeepResearchError');
  });

  it('should create AllProvidersFailedError', () => {
    const error = new AllProvidersFailedError('All failed');

    expect(error.code).toBe('ALL_PROVIDERS_FAILED');
    expect(error.name).toBe('AllProvidersFailedError');
  });

  it('should create TokenBudgetExceededError', () => {
    const error = new TokenBudgetExceededError(15000, 10000);

    expect(error.code).toBe('TOKEN_BUDGET_EXCEEDED');
    expect(error.details).toEqual({ used: 15000, budget: 10000 });
  });
});

// ============ Helper Function Tests ============

describe('deepResearch helper', () => {
  it('should be a function', () => {
    expect(typeof deepResearch).toBe('function');
  });
});

// ============ Integration Tests (Mocked) ============

describe('Integration Tests', () => {
  describe('Full research flow (mocked)', () => {
    it('should complete research with template provider', async () => {
      const engine = new ResearchEngine({ debug: false });

      // Mock the provider factory's search
      const mockSearch = vi
        .spyOn(engine['providerFactory'], 'search')
        .mockResolvedValue([
          {
            title: 'Test Result',
            url: 'https://example.com/test',
            snippet: 'This is a test result about AI ethics',
          },
        ]);

      // Mock the provider factory's read
      const mockRead = vi
        .spyOn(engine['providerFactory'], 'read')
        .mockResolvedValue({
          url: 'https://example.com/test',
          title: 'Test Page',
          content: 'AI ethics is an important topic.',
          extractedFacts: [
            'AI ethics considers moral implications of AI systems.',
            'Over 1000 companies have AI ethics guidelines.',
          ],
          wordCount: 50,
          extractedAt: Date.now(),
        });

      const events: string[] = [];
      engine.on((event) => events.push(event.type));

      const report = await engine.research({
        query: 'AI ethics',
        maxIterations: 2,
        tokenBudget: 5000,
      });

      expect(report.query).toBe('AI ethics');
      expect(report.summary).toBeDefined();
      expect(report.metadata.iterations).toBeGreaterThan(0);
      expect(events).toContain('start');
      expect(events).toContain('complete');

      mockSearch.mockRestore();
      mockRead.mockRestore();
    });
  });
});
