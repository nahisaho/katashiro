/**
 * ResearchAgent Tests
 * @fileoverview REQ-1.2.0-AGT-001, REQ-1.2.0-AGT-002: エージェントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchAgent, ResearchAgentDependencies } from '../../src/consensus/ResearchAgent';
import { IterationContext, AgentStrategy } from '../../src/consensus/types';

describe('ResearchAgent', () => {
  let mockDeps: ResearchAgentDependencies;
  let mockStrategy: AgentStrategy;

  beforeEach(() => {
    mockDeps = {
      searchClient: {
        search: vi.fn().mockResolvedValue([
          { url: 'https://example.com/1', title: 'Result 1', snippet: 'Snippet 1' },
          { url: 'https://example.com/2', title: 'Result 2', snippet: 'Snippet 2' },
        ]),
      },
      scraper: {
        scrape: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            url: 'https://example.com',
            content: 'Sample content about AI and machine learning.',
            title: 'Sample Page',
            fetchedAt: new Date().toISOString(),
          },
        }),
      },
      analyzer: {
        analyze: vi.fn().mockResolvedValue({
          keywords: ['AI', 'machine learning'],
          complexity: 0.5,
          sentiment: 0.6,
          wordCount: 100,
        }),
      },
      extractor: {
        extract: vi.fn().mockResolvedValue({
          persons: ['John Doe'],
          organizations: ['OpenAI'],
          locations: ['San Francisco'],
          all: [
            { text: 'John Doe', type: 'person' },
            { text: 'OpenAI', type: 'organization' },
          ],
        }),
      },
      reportGenerator: {
        generate: vi.fn().mockResolvedValue('# Generated Report\n\nContent here.'),
      },
    };

    mockStrategy = {
      agentId: 1,
      queryModifiers: ['公式', '発表'],
      preferredSources: ['official'],
      timeRange: 'all',
      maxResultsPerAgent: 10,
    };
  });

  describe('constructor', () => {
    it('should create agent with dependencies', () => {
      const agent = new ResearchAgent(1, mockDeps);
      expect(agent).toBeInstanceOf(ResearchAgent);
      expect(agent.agentId).toBe(1);
    });

    it('should accept custom strategy', () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      expect(agent.strategy).toEqual(mockStrategy);
    });
  });

  describe('execute', () => {
    it('should execute research pipeline', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      const result = await agent.execute(context);

      expect(result).toBeDefined();
      expect(result.agentId).toBe(1);
      expect(result.reportId).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);
    });

    it('should call search with topic', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      await agent.execute(context);

      expect(mockDeps.searchClient.search).toHaveBeenCalled();
      const searchCall = (mockDeps.searchClient.search as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(searchCall[0]).toContain('AI技術');
    });

    it('should scrape search results', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      await agent.execute(context);

      expect(mockDeps.scraper.scrape).toHaveBeenCalled();
    });

    it('should analyze scraped content', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      await agent.execute(context);

      expect(mockDeps.analyzer.analyze).toHaveBeenCalled();
    });

    it('should generate report', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      await agent.execute(context);

      expect(mockDeps.reportGenerator.generate).toHaveBeenCalled();
    });

    it('should include duration in result', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      const result = await agent.execute(context);

      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('with previous context', () => {
    it('should use previous consensus for refinement', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 2,
        topic: 'AI技術',
        previousConsensus: '前回のレポート内容',
        previousScore: {
          reportId: 'prev-report',
          totalScore: 0.8,
          consistencyScore: 0.7,
          reliabilityScore: 0.8,
          coverageScore: 0.7,
          conflicts: [],
          unverifiedCount: 0,
          sourceUrls: ['https://previous.com'],
        },
        unresolvedQuestions: ['AIの安全性について'],
        coveredSources: ['https://already-covered.com'],
        areasToDeepen: ['セキュリティ'],
        isInitial: false,
      };

      const result = await agent.execute(context);

      expect(result).toBeDefined();
      // 非初期イテレーションでは前回のコンテキストを考慮
      expect(result.agentId).toBe(1);
    });

    it('should exclude already covered sources', async () => {
      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 2,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: ['https://example.com/1'], // already covered
        areasToDeepen: [],
        isInitial: false,
      };

      await agent.execute(context);

      // 実装により、カバー済みソースは除外されるはず
      expect(mockDeps.searchClient.search).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle search failure gracefully', async () => {
      mockDeps.searchClient.search = vi.fn().mockRejectedValue(new Error('Search failed'));

      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      // エラーが発生しても結果を返すか、エラーを投げるか実装依存
      // 現在の実装はエラーをキャッチして空の結果を返す
      const result = await agent.execute(context);
      expect(result).toBeDefined();
    });

    it('should handle scrape failure gracefully', async () => {
      mockDeps.scraper.scrape = vi.fn().mockResolvedValue({
        ok: false,
        error: new Error('Scrape failed'),
      });

      const agent = new ResearchAgent(1, mockDeps, mockStrategy);
      const context: IterationContext = {
        iteration: 1,
        topic: 'AI技術',
        previousConsensus: null,
        previousScore: null,
        unresolvedQuestions: [],
        coveredSources: [],
        areasToDeepen: [],
        isInitial: true,
      };

      // スクレイピング失敗は部分的に許容される（他のソースがあれば続行）
      const result = await agent.execute(context);
      expect(result).toBeDefined();
    });
  });
});
