/**
 * KATASHIRO v1.4.0 - StepExecutor テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StepExecutor,
  StepExecutorConfig,
  DEFAULT_STEP_EXECUTOR_CONFIG,
} from '../../src/cascading/StepExecutor.js';
import type {
  CascadingAgentReport,
  CascadingSource,
  Finding,
  StepContext,
  StepStrategyConfig,
  AgentRole,
  CascadingResearchEvent,
} from '../../src/cascading/types.js';
import type { CascadingAgent } from '../../src/cascading/CascadingAgent.js';

// モックエージェントを作成
function createMockAgent(role: AgentRole, options?: {
  success?: boolean;
  findings?: Finding[];
  sources?: CascadingSource[];
  error?: string;
}): CascadingAgent {
  const success = options?.success ?? true;
  const timestamp = new Date().toISOString();

  const mockReport: CascadingAgentReport = {
    agentId: `agent-${role}-mock`,
    role,
    stepNumber: 1,
    content: `${role}エージェントのレポート`,
    findings: options?.findings ?? [
      {
        id: `finding-${role}-1`,
        content: `${role}エージェントの発見事項`,
        source: {
          url: `https://${role}.example.com`,
          title: `${role}ソース`,
          fetchedAt: timestamp,
          credibility: 0.8,
          domain: `${role}.example.com`,
        },
        confidence: 0.8,
        stepNumber: 1,
        agentId: `agent-${role}-mock`,
        category: 'fact',
        timestamp,
      },
    ],
    sources: options?.sources ?? [
      {
        url: `https://${role}.example.com`,
        title: `${role}ソース`,
        fetchedAt: timestamp,
        credibility: 0.8,
        domain: `${role}.example.com`,
      },
    ],
    gaps: [`${role}のギャップ`],
    durationMs: 1000,
    timestamp,
    error: success ? undefined : (options?.error ?? 'Mock error'),
  };

  return {
    id: `agent-${role}-mock`,
    role,
    research: vi.fn().mockResolvedValue(mockReport),
  } as unknown as CascadingAgent;
}

// デフォルトコンテキスト
function createDefaultContext(overrides?: Partial<StepContext>): StepContext {
  return {
    stepNumber: 1,
    topic: 'AI倫理',
    stepFocus: 'overview',
    allPreviousResults: [],
    identifiedGaps: [],
    keyEntities: [],
    unresolvedQuestions: [],
    queryModifiers: ['概要'],
    ...overrides,
  };
}

// デフォルト戦略
function createDefaultStrategy(overrides?: Partial<StepStrategyConfig>): StepStrategyConfig {
  return {
    focus: 'overview',
    queryModifiers: ['概要', '基本'],
    maxResultsPerAgent: 10,
    ...overrides,
  };
}

describe('StepExecutor', () => {
  let executor: StepExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new StepExecutor();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化される', () => {
      expect(executor).toBeDefined();
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: Partial<StepExecutorConfig> = {
        concurrency: 3,
        agentTimeoutMs: 30000,
      };
      const customExecutor = new StepExecutor(customConfig);
      expect(customExecutor).toBeDefined();
    });
  });

  describe('DEFAULT_STEP_EXECUTOR_CONFIG', () => {
    it('正しいデフォルト値を持つ', () => {
      expect(DEFAULT_STEP_EXECUTOR_CONFIG.concurrency).toBe(5);
      expect(DEFAULT_STEP_EXECUTOR_CONFIG.agentTimeoutMs).toBe(120000);
      expect(DEFAULT_STEP_EXECUTOR_CONFIG.stepTimeoutMs).toBe(600000);
      expect(DEFAULT_STEP_EXECUTOR_CONFIG.skipOnFailure).toBe(true);
    });
  });

  describe('execute', () => {
    it('ステップを正常に実行できる', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
        createMockAgent('analysis'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result).toBeDefined();
      expect(result.stepNumber).toBe(1);
      expect(result.focus).toBe('overview');
    });

    it('全エージェントのresearchを呼び出す', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      await executor.execute(1, agents, context, strategy);

      for (const agent of agents) {
        expect(agent.research).toHaveBeenCalledWith(context);
      }
    });

    it('発見事項を統合する', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('ソースを統合する', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.sources).toBeDefined();
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('ギャップを収集する', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.gaps).toBeDefined();
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('信頼度を計算する', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('統合サマリーを生成する', async () => {
      const agents = [
        createMockAgent('official'),
        createMockAgent('news'),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.integratedSummary).toBeDefined();
      expect(result.integratedSummary.length).toBeGreaterThan(0);
    });

    it('実行時間を記録する', async () => {
      const agents = [createMockAgent('official')];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('タイムスタンプを記録する', async () => {
      const agents = [createMockAgent('official')];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result.timestamp).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('一部エージェント失敗でも他の結果を返す', async () => {
      const agents = [
        createMockAgent('official'),
        {
          id: 'agent-failed',
          role: 'news' as AgentRole,
          research: vi.fn().mockRejectedValue(new Error('Agent failed')),
        } as unknown as CascadingAgent,
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      // 成功したエージェントの結果は含まれる
      expect(result.agentReports.length).toBeGreaterThanOrEqual(1);
    });

    it('全エージェント失敗でも結果を返す', async () => {
      const agents = [
        {
          id: 'agent-failed-1',
          role: 'official' as AgentRole,
          research: vi.fn().mockRejectedValue(new Error('Failed 1')),
        } as unknown as CascadingAgent,
        {
          id: 'agent-failed-2',
          role: 'news' as AgentRole,
          research: vi.fn().mockRejectedValue(new Error('Failed 2')),
        } as unknown as CascadingAgent,
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      expect(result).toBeDefined();
      expect(result.agentReports).toHaveLength(0);
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('events', () => {
    it('イベントリスナーを登録できる', async () => {
      const listener = vi.fn();
      executor.on(listener);

      const agents = [createMockAgent('official')];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      await executor.execute(1, agents, context, strategy);

      expect(listener).toHaveBeenCalled();
    });

    it('stepStartedイベントを発火する', async () => {
      const events: CascadingResearchEvent[] = [];
      executor.on((event) => events.push(event));

      const agents = [createMockAgent('official')];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      await executor.execute(1, agents, context, strategy);

      const startEvent = events.find(e => e.type === 'stepStarted');
      expect(startEvent).toBeDefined();
      if (startEvent?.type === 'stepStarted') {
        expect(startEvent.stepNumber).toBe(1);
      }
    });

    it('stepCompletedイベントを発火する', async () => {
      const events: CascadingResearchEvent[] = [];
      executor.on((event) => events.push(event));

      const agents = [createMockAgent('official')];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      await executor.execute(1, agents, context, strategy);

      const completeEvent = events.find(e => e.type === 'stepCompleted');
      expect(completeEvent).toBeDefined();
    });
  });

  describe('source deduplication', () => {
    it('同じURLのソースを重複除去する', async () => {
      const sharedSource: CascadingSource = {
        url: 'https://shared.example.com',
        title: 'Shared Source',
        fetchedAt: new Date().toISOString(),
        credibility: 0.9,
        domain: 'shared.example.com',
      };

      const agents = [
        createMockAgent('official', { sources: [sharedSource] }),
        createMockAgent('news', { sources: [sharedSource] }),
      ];
      const context = createDefaultContext();
      const strategy = createDefaultStrategy();

      const result = await executor.execute(1, agents, context, strategy);

      const sharedUrls = result.sources.filter(s => s.url === 'https://shared.example.com');
      expect(sharedUrls.length).toBe(1);
    });
  });
});
