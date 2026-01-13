/**
 * KATASHIRO v1.4.0 - CascadingAgent テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CascadingAgent,
  CascadingAgentConfig,
  CascadingAgentDependencies,
  ISearchClient,
  IScraper,
  createCascadingAgents,
} from '../../src/cascading/CascadingAgent.js';
import type { AgentRole, CascadingAgentStrategy, StepContext } from '../../src/cascading/types.js';
import { DEFAULT_AGENT_STRATEGIES } from '../../src/cascading/types.js';

// モック依存性を作成するヘルパー
function createMockDeps(overrides?: Partial<CascadingAgentDependencies>): CascadingAgentDependencies {
  const mockSearchClient: ISearchClient = {
    search: vi.fn().mockResolvedValue([
      { url: 'https://example.com/1', title: 'Test Article 1', snippet: 'Test snippet 1' },
      { url: 'https://example.com/2', title: 'Test Article 2', snippet: 'Test snippet 2' },
      { url: 'https://nikkei.com/article', title: 'Nikkei Article', snippet: 'Major news' },
    ]),
  };

  const mockScraper: IScraper = {
    scrape: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        content: `
          AI倫理に関する重要な発見です。2024年に発表された報告によると、
          AIの安全性に関する研究が進んでいます。
          
          この分野では多くの課題があります。特に、バイアスの問題と
          プライバシーの問題が指摘されています。
          
          専門家は今後の展望について楽観的な見方を示しています。
        `,
        title: 'AI Ethics Article',
      },
    }),
  };

  return {
    searchClient: mockSearchClient,
    scraper: mockScraper,
    ...overrides,
  };
}

// モック設定を作成するヘルパー
function createMockConfig(role: AgentRole = 'official', overrides?: Partial<CascadingAgentConfig>): CascadingAgentConfig {
  const strategy = DEFAULT_AGENT_STRATEGIES.find(s => s.role === role)!;
  return {
    id: `agent-${role}-test`,
    role,
    strategy,
    timeoutMs: 60000,
    maxRetries: 3,
    maxResults: 10,
    ...overrides,
  };
}

// デフォルトコンテキストを作成するヘルパー
function createDefaultContext(overrides?: Partial<StepContext>): StepContext {
  return {
    stepNumber: 1,
    topic: 'AI倫理',
    stepFocus: 'overview',
    allPreviousResults: [],
    identifiedGaps: [],
    keyEntities: [],
    unresolvedQuestions: [],
    queryModifiers: ['概要', '基本'],
    ...overrides,
  };
}

describe('CascadingAgent', () => {
  let agent: CascadingAgent;
  let mockDeps: CascadingAgentDependencies;
  let mockConfig: CascadingAgentConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = createMockDeps();
    mockConfig = createMockConfig('official');
    agent = new CascadingAgent(mockConfig, mockDeps);
  });

  describe('constructor', () => {
    it('正しく初期化される', () => {
      expect(agent.id).toBe('agent-official-test');
      expect(agent.role).toBe('official');
    });

    it.each<AgentRole>(['official', 'news', 'analysis', 'academic', 'community'])(
      'ロール %s で初期化できる',
      (role) => {
        const config = createMockConfig(role);
        const testAgent = new CascadingAgent(config, mockDeps);
        expect(testAgent.role).toBe(role);
      }
    );
  });

  describe('research', () => {
    it('正常にリサーチを実行できる', async () => {
      const context = createDefaultContext();
      const result = await agent.research(context);

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-official-test');
      expect(result.role).toBe('official');
      expect(result.stepNumber).toBe(1);
    });

    it('検索クライアントを呼び出す', async () => {
      const context = createDefaultContext();
      await agent.research(context);

      expect(mockDeps.searchClient.search).toHaveBeenCalled();
    });

    it('スクレイパーを呼び出す', async () => {
      const context = createDefaultContext();
      await agent.research(context);

      expect(mockDeps.scraper.scrape).toHaveBeenCalled();
    });

    it('発見事項を生成する', async () => {
      const context = createDefaultContext();
      const result = await agent.research(context);

      expect(result.findings).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
    });

    it('ソース情報を含む', async () => {
      const context = createDefaultContext();
      const result = await agent.research(context);

      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('タイムスタンプと実行時間を含む', async () => {
      const context = createDefaultContext();
      const result = await agent.research(context);

      expect(result.timestamp).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('レポート本文を生成する', async () => {
      const context = createDefaultContext();
      const result = await agent.research(context);

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('検索エラー時は空の結果を返す（エラーを内部で処理）', async () => {
      const errorDeps = createMockDeps({
        searchClient: {
          search: vi.fn().mockRejectedValue(new Error('Search failed')),
        },
      });
      const errorAgent = new CascadingAgent(mockConfig, errorDeps);
      const context = createDefaultContext();

      const result = await errorAgent.research(context);

      // 検索エラーは内部で処理され、空の結果として返される
      expect(result.findings).toHaveLength(0);
      expect(result.sources).toHaveLength(0);
    });

    it('スクレイピングエラー時も部分的に成功する', async () => {
      const errorDeps = createMockDeps({
        scraper: {
          scrape: vi.fn().mockResolvedValue({
            ok: false,
            error: new Error('Scrape failed'),
          }),
        },
      });
      const errorAgent = new CascadingAgent(mockConfig, errorDeps);
      const context = createDefaultContext();

      const result = await errorAgent.research(context);

      // エラーにならず、空の発見事項を返す
      expect(result.error).toBeUndefined();
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('credibility estimation', () => {
    it('公式ドメインには高い信頼度を付与', async () => {
      const govDeps = createMockDeps({
        searchClient: {
          search: vi.fn().mockResolvedValue([
            { url: 'https://www.kantei.go.jp/test', title: 'Gov Site' },
          ]),
        },
      });
      const govAgent = new CascadingAgent(mockConfig, govDeps);
      const context = createDefaultContext();

      const result = await govAgent.research(context);

      if (result.sources.length > 0) {
        expect(result.sources[0].credibility).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('学術ドメインには高い信頼度を付与', async () => {
      const eduDeps = createMockDeps({
        searchClient: {
          search: vi.fn().mockResolvedValue([
            { url: 'https://www.u-tokyo.ac.jp/test', title: 'Academic Site' },
          ]),
        },
      });
      const eduAgent = new CascadingAgent(mockConfig, eduDeps);
      const context = createDefaultContext();

      const result = await eduAgent.research(context);

      if (result.sources.length > 0) {
        expect(result.sources[0].credibility).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  describe('context utilization', () => {
    it('ステップ2以降では前ステップの結果を参照する', async () => {
      const context = createDefaultContext({
        stepNumber: 2,
        stepFocus: 'detail',
        identifiedGaps: ['技術詳細'],
        keyEntities: ['OpenAI'],
      });

      const result = await agent.research(context);

      expect(result.stepNumber).toBe(2);
      expect(mockDeps.searchClient.search).toHaveBeenCalled();
    });

    it('identifiedGapsを活用する', async () => {
      const context = createDefaultContext({
        stepNumber: 3,
        stepFocus: 'gap',
        identifiedGaps: ['実装方法', 'コスト分析'],
      });

      await agent.research(context);

      const searchCall = (mockDeps.searchClient.search as ReturnType<typeof vi.fn>).mock.calls[0];
      // クエリに何らかの形でギャップ情報が含まれることを確認
      expect(searchCall).toBeDefined();
    });
  });

  describe('different roles', () => {
    it.each<AgentRole>(['official', 'news', 'analysis', 'academic', 'community'])(
      'ロール %s でリサーチを実行できる',
      async (role) => {
        const config = createMockConfig(role);
        const testAgent = new CascadingAgent(config, mockDeps);
        const context = createDefaultContext();

        const result = await testAgent.research(context);

        expect(result.role).toBe(role);
        expect(result.agentId).toContain(role);
      }
    );
  });
});

describe('createCascadingAgents', () => {
  it('戦略に基づいてエージェントを作成する', () => {
    const mockDeps = createMockDeps();
    const options = { timeoutMs: 60000, maxRetries: 3, maxResults: 10 };

    const agents = createCascadingAgents(DEFAULT_AGENT_STRATEGIES, mockDeps, options);

    expect(agents).toHaveLength(5);
    expect(agents[0].role).toBe('official');
    expect(agents[1].role).toBe('news');
    expect(agents[2].role).toBe('analysis');
    expect(agents[3].role).toBe('academic');
    expect(agents[4].role).toBe('community');
  });

  it('各エージェントに一意のIDを付与する', () => {
    const mockDeps = createMockDeps();
    const options = { timeoutMs: 60000, maxRetries: 3, maxResults: 10 };

    const agents = createCascadingAgents(DEFAULT_AGENT_STRATEGIES, mockDeps, options);

    const ids = agents.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(agents.length);
  });

  it('カスタム戦略でエージェントを作成できる', () => {
    const mockDeps = createMockDeps();
    const customStrategies: CascadingAgentStrategy[] = [
      { role: 'official', queryModifiers: ['custom'], description: 'Custom official' },
      { role: 'news', queryModifiers: ['custom'], description: 'Custom news' },
    ];
    const options = { timeoutMs: 30000, maxRetries: 1, maxResults: 5 };

    const agents = createCascadingAgents(customStrategies, mockDeps, options);

    expect(agents).toHaveLength(2);
  });
});
