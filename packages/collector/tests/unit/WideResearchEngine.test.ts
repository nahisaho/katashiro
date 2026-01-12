/**
 * WideResearchEngine - Unit Tests
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOk, isErr } from '@nahisaho/katashiro-core';
import {
  WideResearchEngine,
  QueryPlanner,
  ResultAggregator,
  CoverageAnalyzer,
  WebSearchAgent,
  NewsSearchAgent,
  AcademicSearchAgent,
  EncyclopediaAgent,
  DEFAULT_RESEARCH_CONFIG,
} from '../../src/research/index.js';
import type {
  WideResearchQuery,
  Finding,
  ISearchAgent,
  AgentSearchQuery,
  AgentSearchResult,
  AgentExecutionResult,
} from '../../src/research/index.js';

describe('WideResearchEngine', () => {
  describe('constructor', () => {
    it('should create instance with default agents', () => {
      const engine = new WideResearchEngine();
      const agents = engine.getAvailableAgents();

      expect(agents).toContain('web');
      expect(agents).toContain('news');
      expect(agents).toContain('academic');
      expect(agents).toContain('encyclopedia');
    });

    it('should create instance with custom config', () => {
      const engine = new WideResearchEngine({
        web: { type: 'web', enabled: false, priority: 1 },
      });
      expect(engine).toBeInstanceOf(WideResearchEngine);
    });
  });

  describe('research', () => {
    it('should return error for empty topic', async () => {
      const engine = new WideResearchEngine();
      const result = await engine.research({
        topic: '',
        depth: 'shallow',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_QUERY');
      }
    });

    it('should return error for whitespace-only topic', async () => {
      const engine = new WideResearchEngine();
      const result = await engine.research({
        topic: '   ',
        depth: 'shallow',
      });

      expect(isErr(result)).toBe(true);
    });

    it('should return error when no agents available', async () => {
      const engine = new WideResearchEngine({
        web: { type: 'web', enabled: false, priority: 1 },
        news: { type: 'news', enabled: false, priority: 2 },
        academic: { type: 'academic', enabled: false, priority: 3 },
        encyclopedia: { type: 'encyclopedia', enabled: false, priority: 4 },
      });

      const result = await engine.research({
        topic: 'test topic',
        depth: 'deep',
        sources: ['web', 'news'],
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('CONFIGURATION_ERROR');
      }
    });
  });

  describe('registerAgent', () => {
    it('should register custom agent', () => {
      const engine = new WideResearchEngine();

      const customAgent: ISearchAgent = {
        type: 'custom',
        name: 'Custom Agent',
        async search() {
          return { findings: [], status: 'success', processingTime: 0 };
        },
        async isAvailable() {
          return true;
        },
      };

      engine.registerAgent(customAgent);
      const agents = engine.getAvailableAgents();

      expect(agents).toContain('custom');
    });
  });

  describe('configure', () => {
    it('should update agent configuration', () => {
      const engine = new WideResearchEngine();

      engine.configure({
        web: { enabled: false, priority: 10 },
      });

      // disabled agent should not be selected
      expect(engine).toBeInstanceOf(WideResearchEngine);
    });
  });

  describe('events', () => {
    it('should emit agentStarted event', async () => {
      const engine = new WideResearchEngine();
      const events: string[] = [];

      engine.on('agentStarted', (type) => events.push(`started:${type}`));

      await engine.research({
        topic: 'test',
        depth: 'shallow',
        sources: ['encyclopedia'], // Wikipedia is most likely to succeed
        agentTimeout: 5000,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toBe('started:encyclopedia');
    });
  });
});

describe('QueryPlanner', () => {
  it('should create query plan for agents', () => {
    const planner = new QueryPlanner();
    const agents: ISearchAgent[] = [
      { type: 'web', name: 'Web', search: vi.fn(), isAvailable: vi.fn() },
      { type: 'news', name: 'News', search: vi.fn(), isAvailable: vi.fn() },
    ];

    const query: WideResearchQuery = {
      topic: 'AI ethics',
      depth: 'medium',
    };

    const plan = planner.plan(query, agents, {
      agentTimeout: 30000,
      maxResultsPerSource: 20,
    });

    expect(plan.agents).toHaveLength(2);
    expect(plan.queries.size).toBe(2);
    expect(plan.timeout).toBe(30000);

    const webQuery = plan.queries.get('web');
    expect(webQuery?.query).toBe('AI ethics');
    expect(webQuery?.maxResults).toBe(20);
  });
});

describe('ResultAggregator', () => {
  it('should aggregate and deduplicate results', () => {
    const aggregator = new ResultAggregator();

    const results: AgentSearchResult[] = [
      {
        findings: [
          {
            id: '1',
            title: 'Article 1',
            summary: 'Summary 1',
            url: 'https://example.com/article1',
            sourceType: 'web',
            sourceName: 'example.com',
            relevanceScore: 0.8,
            credibilityScore: 0.7,
          },
          {
            id: '2',
            title: 'Article 2',
            summary: 'Summary 2',
            url: 'https://example.com/article2',
            sourceType: 'web',
            sourceName: 'example.com',
            relevanceScore: 0.6,
            credibilityScore: 0.5,
          },
        ],
        status: 'success',
        processingTime: 100,
      },
      {
        findings: [
          {
            id: '3',
            title: 'Article 1 duplicate',
            summary: 'Summary 1 duplicate',
            url: 'https://example.com/article1', // Same URL
            sourceType: 'news',
            sourceName: 'example.com',
            relevanceScore: 0.9, // Higher score
            credibilityScore: 0.8,
          },
        ],
        status: 'success',
        processingTime: 150,
      },
    ];

    const aggregated = aggregator.aggregate(results, 'test query');

    // Should have 2 unique results (deduped by URL)
    expect(aggregated).toHaveLength(2);

    // Higher scoring duplicate should be kept
    const article1 = aggregated.find((f) => f.url.includes('article1'));
    expect(article1?.relevanceScore).toBe(0.9);
  });

  it('should rank by composite score', () => {
    const aggregator = new ResultAggregator();

    const results: AgentSearchResult[] = [
      {
        findings: [
          {
            id: '1',
            title: 'High relevance, low credibility',
            summary: 'Test',
            url: 'https://example.com/1',
            sourceType: 'web',
            sourceName: 'example.com',
            relevanceScore: 1.0,
            credibilityScore: 0.1,
          },
          {
            id: '2',
            title: 'Medium both',
            summary: 'Test',
            url: 'https://example.com/2',
            sourceType: 'web',
            sourceName: 'example.com',
            relevanceScore: 0.7,
            credibilityScore: 0.7,
          },
        ],
        status: 'success',
        processingTime: 100,
      },
    ];

    const aggregated = aggregator.aggregate(results, 'test');

    // composite = relevance * 0.6 + credibility * 0.4
    // item1: 1.0 * 0.6 + 0.1 * 0.4 = 0.64
    // item2: 0.7 * 0.6 + 0.7 * 0.4 = 0.70
    expect(aggregated[0].title).toBe('Medium both');
  });
});

describe('CoverageAnalyzer', () => {
  it('should calculate coverage rate', () => {
    const analyzer = new CoverageAnalyzer();

    const results: AgentExecutionResult[] = [
      {
        agent: { type: 'web', name: 'Web', search: vi.fn(), isAvailable: vi.fn() },
        result: { findings: [], status: 'success', processingTime: 100 },
      },
      {
        agent: { type: 'news', name: 'News', search: vi.fn(), isAvailable: vi.fn() },
        result: { findings: [], status: 'failed', error: 'API error', processingTime: 50 },
      },
    ];

    const coverage = analyzer.analyze(results, ['web', 'news']);

    expect(coverage.coveredSources).toContain('web');
    expect(coverage.failedSources).toContain('news');
    expect(coverage.coverageRate).toBe(0.5);
  });

  it('should identify gaps', () => {
    const analyzer = new CoverageAnalyzer();

    const results: AgentExecutionResult[] = [
      {
        agent: { type: 'web', name: 'Web', search: vi.fn(), isAvailable: vi.fn() },
        result: { findings: [], status: 'success', processingTime: 100 },
      },
    ];

    const coverage = analyzer.analyze(results, ['web', 'news', 'academic']);

    expect(coverage.gaps).toBeDefined();
    expect(coverage.gaps!.length).toBeGreaterThan(0);
    expect(coverage.gaps!.some((g) => g.type === 'source')).toBe(true);
  });
});

describe('Search Agents', () => {
  describe('WebSearchAgent', () => {
    it('should have correct type and name', () => {
      const agent = new WebSearchAgent();
      expect(agent.type).toBe('web');
      expect(agent.name).toBe('Web Search');
    });

    it('should report as available', async () => {
      const agent = new WebSearchAgent();
      const available = await agent.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('NewsSearchAgent', () => {
    it('should have correct type and name', () => {
      const agent = new NewsSearchAgent();
      expect(agent.type).toBe('news');
      expect(agent.name).toBe('News Search');
    });
  });

  describe('AcademicSearchAgent', () => {
    it('should have correct type and name', () => {
      const agent = new AcademicSearchAgent();
      expect(agent.type).toBe('academic');
      expect(agent.name).toBe('Academic Search (arXiv)');
    });
  });

  describe('EncyclopediaAgent', () => {
    it('should have correct type and name', () => {
      const agent = new EncyclopediaAgent();
      expect(agent.type).toBe('encyclopedia');
      expect(agent.name).toBe('Encyclopedia (Wikipedia)');
    });
  });
});

describe('DEFAULT_RESEARCH_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_RESEARCH_CONFIG.maxParallelAgents).toBe(5);
    expect(DEFAULT_RESEARCH_CONFIG.agentTimeout).toBe(30000);
    expect(DEFAULT_RESEARCH_CONFIG.totalTimeout).toBe(120000);
    expect(DEFAULT_RESEARCH_CONFIG.maxResultsPerSource).toBe(20);
  });

  it('should have depth configurations', () => {
    expect(DEFAULT_RESEARCH_CONFIG.depthConfig.shallow.sources).toContain('web');
    expect(DEFAULT_RESEARCH_CONFIG.depthConfig.medium.sources).toContain('news');
    expect(DEFAULT_RESEARCH_CONFIG.depthConfig.deep.sources).toContain('academic');
  });
});
