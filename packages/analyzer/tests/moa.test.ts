/**
 * MoAEngine テスト
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MoAEngine,
  TaskAnalyzer,
  AgentOrchestrator,
  ResponseAggregator,
  ConsensusCalculator,
  AGENT_PRESETS,
  DEFAULT_MOA_CONFIG,
} from '../src/moa/index.js';
import type {
  MoARequest,
  AgentConfig,
  AgentResponse,
  MoAConfig,
} from '../src/moa/index.js';

// ============================================================================
// TaskAnalyzer Tests
// ============================================================================

describe('TaskAnalyzer', () => {
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    analyzer = new TaskAnalyzer();
  });

  describe('analyze', () => {
    it('創造性を必要とするタスクを検出する', () => {
      const result = analyzer.analyze('Create an innovative solution for this problem');
      expect(result.requiresCreativity).toBe(true);
      expect(result.recommendedAgents).toContain('creative');
    });

    it('ファクトチェックを必要とするタスクを検出する', () => {
      const result = analyzer.analyze('Verify if this claim is true and provide evidence');
      expect(result.requiresFactCheck).toBe(true);
      expect(result.recommendedAgents).toContain('factual');
    });

    it('批評を必要とするタスクを検出する', () => {
      const result = analyzer.analyze('Evaluate the pros and cons of this approach');
      expect(result.requiresCritique).toBe(true);
      expect(result.recommendedAgents).toContain('critical');
    });

    it('技術的なタスクを検出する', () => {
      const result = analyzer.analyze('Implement a software algorithm for sorting');
      expect(result.requiresTechnical).toBe(true);
      expect(result.recommendedAgents).toContain('technical');
    });

    it('ビジネスタスクを検出する', () => {
      const result = analyzer.analyze('Develop a marketing strategy to increase revenue');
      expect(result.requiresBusiness).toBe(true);
      expect(result.recommendedAgents).toContain('business');
    });

    it('常に分析的思考を含める', () => {
      const result = analyzer.analyze('Simple question about anything');
      expect(result.recommendedAgents).toContain('analytical');
    });

    it('最低3つのエージェントを推奨する', () => {
      const result = analyzer.analyze('Simple task');
      expect(result.recommendedAgents.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('evaluateComplexity', () => {
    it('短いタスクは低い複雑度', () => {
      const complexity = analyzer.evaluateComplexity('Hello');
      expect(complexity).toBeLessThan(0.3);
    });

    it('長く複雑なタスクは高い複雑度', () => {
      const complexity = analyzer.evaluateComplexity(
        'First, analyze the market trends and create an innovative solution. ' +
        'Then, evaluate the risks and consider both technical and business aspects. ' +
        'Finally, provide evidence-based recommendations with proper verification.'
      );
      expect(complexity).toBeGreaterThan(0.5);
    });
  });
});

// ============================================================================
// AgentOrchestrator Tests
// ============================================================================

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
  });

  describe('execute', () => {
    it('エージェントを並列実行する', async () => {
      const agents: AgentConfig[] = [
        AGENT_PRESETS.creative!,
        AGENT_PRESETS.analytical!,
        AGENT_PRESETS.critical!,
      ];

      const responses = await orchestrator.execute(agents, 'Test task');
      
      expect(responses.length).toBe(3);
      responses.forEach(response => {
        expect(response.agentId).toBeDefined();
        expect(response.agentName).toBeDefined();
        expect(response.response).toBeDefined();
        expect(response.processingTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('シミュレーションレスポンスを生成する', async () => {
      const agents: AgentConfig[] = [AGENT_PRESETS.factual!];
      const responses = await orchestrator.execute(agents, 'Verify this fact');
      
      expect(responses[0]?.response).toContain('factual');
    });

    it('ピアスコアを含める', async () => {
      const agents: AgentConfig[] = [
        AGENT_PRESETS.creative!,
        AGENT_PRESETS.analytical!,
      ];

      const responses = await orchestrator.execute(agents, 'Test task');
      
      // 各レスポンスにピアスコアがある
      responses.forEach(response => {
        expect(response.peerScores).toBeDefined();
        expect(response.peerScores?.length).toBe(agents.length - 1);
      });
    });
  });
});

// ============================================================================
// ResponseAggregator Tests
// ============================================================================

describe('ResponseAggregator', () => {
  let aggregator: ResponseAggregator;
  let mockResponses: AgentResponse[];

  beforeEach(() => {
    aggregator = new ResponseAggregator();
    mockResponses = [
      {
        agentId: 'agent1',
        agentName: 'Agent One',
        response: 'The key points are A, B, and C. This approach is effective.',
        selfScore: 0.8,
        processingTime: 100,
      },
      {
        agentId: 'agent2',
        agentName: 'Agent Two',
        response: 'The main factors are A, B, and D. Consider the risks.',
        selfScore: 0.7,
        processingTime: 120,
      },
      {
        agentId: 'agent3',
        agentName: 'Agent Three',
        response: 'Points A and B are crucial. Additional factor E is important.',
        selfScore: 0.9,
        processingTime: 110,
      },
    ];
  });

  describe('aggregate', () => {
    it('majority_vote 戦略で統合する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'majority_vote', 'Test');
      
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('weighted_average 戦略で統合する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'weighted_average', 'Test');
      
      expect(result.response).toBeDefined();
    });

    it('best_of_n 戦略で最高スコアを選択する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'best_of_n', 'Test');
      
      expect(result.response).toBeDefined();
      // selfScore 0.9 のAgent Threeが選ばれる
      expect(result.response).toContain('crucial');
    });

    it('synthesis 戦略で統合する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'synthesis', 'Test');
      
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(50);
    });

    it('debate 戦略で統合する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'debate', 'Test');
      
      expect(result.response).toBeDefined();
    });

    it('hierarchical 戦略で統合する', async () => {
      const result = await aggregator.aggregate(mockResponses, 'hierarchical', 'Test');
      
      expect(result.response).toBeDefined();
    });
  });
});

// ============================================================================
// ConsensusCalculator Tests
// ============================================================================

describe('ConsensusCalculator', () => {
  let calculator: ConsensusCalculator;

  beforeEach(() => {
    calculator = new ConsensusCalculator();
  });

  describe('calculate', () => {
    it('単一レスポンスは完全合意', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'agent1',
          agentName: 'Agent One',
          response: 'Test response',
          processingTime: 100,
        },
      ];

      const consensus = calculator.calculate(responses);
      expect(consensus).toBe(1.0);
    });

    it('類似レスポンスは高い合意度', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'agent1',
          agentName: 'Agent One',
          response: 'The main point is that we should focus on quality improvement.',
          processingTime: 100,
        },
        {
          agentId: 'agent2',
          agentName: 'Agent Two',
          response: 'The key point is that quality improvement should be the focus.',
          processingTime: 100,
        },
      ];

      const consensus = calculator.calculate(responses);
      expect(consensus).toBeGreaterThan(0.3);
    });

    it('異なるレスポンスは低い合意度', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'agent1',
          agentName: 'Agent One',
          response: 'We should invest heavily in marketing and sales.',
          processingTime: 100,
        },
        {
          agentId: 'agent2',
          agentName: 'Agent Two',
          response: 'Technology research development innovation future growth.',
          processingTime: 100,
        },
      ];

      const consensus = calculator.calculate(responses);
      expect(consensus).toBeLessThan(0.7);
    });
  });

  describe('analyzeConsensus', () => {
    it('合意分析を返す', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'agent1',
          agentName: 'Agent One',
          response: 'Point A and point B are important for success.',
          processingTime: 100,
        },
        {
          agentId: 'agent2',
          agentName: 'Agent Two',
          response: 'Point A and point B should be prioritized.',
          processingTime: 100,
        },
      ];

      const analysis = calculator.analyzeConsensus(responses);
      
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(1);
      expect(['high', 'moderate', 'low', 'none']).toContain(analysis.level);
      expect(analysis.recommendation).toBeDefined();
    });

    it('合意点と不一致点を特定する', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'agent1',
          agentName: 'Agent One',
          response: 'Quality and efficiency are key. Innovation matters.',
          processingTime: 100,
        },
        {
          agentId: 'agent2',
          agentName: 'Agent Two',
          response: 'Quality and efficiency should be priorities. Speed is essential.',
          processingTime: 100,
        },
        {
          agentId: 'agent3',
          agentName: 'Agent Three',
          response: 'Quality and efficiency drive success. Cost control is vital.',
          processingTime: 100,
        },
      ];

      const analysis = calculator.analyzeConsensus(responses);
      
      expect(analysis.agreedTopics).toBeDefined();
      expect(analysis.disagreedTopics).toBeDefined();
    });
  });
});

// ============================================================================
// MoAEngine Tests
// ============================================================================

describe('MoAEngine', () => {
  let engine: MoAEngine;

  beforeEach(() => {
    engine = new MoAEngine();
  });

  describe('presets', () => {
    it('プリセットエージェントを提供する', () => {
      expect(MoAEngine.presets).toBeDefined();
      expect(MoAEngine.presets.creative).toBeDefined();
      expect(MoAEngine.presets.analytical).toBeDefined();
      expect(MoAEngine.presets.critical).toBeDefined();
      expect(MoAEngine.presets.factual).toBeDefined();
      expect(MoAEngine.presets.synthesizer).toBeDefined();
    });
  });

  describe('process', () => {
    it('MoA処理を実行する', async () => {
      const request: MoARequest = {
        task: 'Analyze the pros and cons of remote work',
        agents: [
          AGENT_PRESETS.analytical!,
          AGENT_PRESETS.creative!,
          AGENT_PRESETS.critical!,
        ],
      };

      const result = await engine.process(request);
      
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.consensus).toBeGreaterThanOrEqual(0);
      expect(result.consensus).toBeLessThanOrEqual(1);
      expect(result.agentResponses.length).toBe(3);
      expect(result.metadata).toBeDefined();
    });

    it('エージェントを自動選択する', async () => {
      const request: MoARequest = {
        task: 'Create an innovative marketing strategy',
      };

      const result = await engine.process(request);
      
      expect(result.agentResponses.length).toBeGreaterThanOrEqual(3);
    });

    it('コンテキストを考慮する', async () => {
      const request: MoARequest = {
        task: 'What should we do?',
        context: 'We are a software company facing declining sales',
        agents: [AGENT_PRESETS.analytical!, AGENT_PRESETS.creative!],
      };

      const result = await engine.process(request);
      
      expect(result.response).toBeDefined();
    });

    it('マルチラウンド処理をサポートする', async () => {
      const request: MoARequest = {
        task: 'Develop a comprehensive plan',
        agents: [AGENT_PRESETS.analytical!, AGENT_PRESETS.creative!],
        config: { maxRounds: 2 },
      };

      const result = await engine.process(request);
      
      expect(result.metadata.totalRounds).toBeGreaterThanOrEqual(1);
    });
  });

  describe('vote', () => {
    it('多数決モードで処理する', async () => {
      const request: MoARequest = {
        task: 'Which option is better: A or B?',
        agents: [
          AGENT_PRESETS.analytical!,
          AGENT_PRESETS.factual!,
          AGENT_PRESETS.critical!,
        ],
      };

      const result = await engine.vote(request);
      
      expect(result.response).toBeDefined();
      expect(result.metadata.aggregationStrategy).toBe('majority_vote');
    });
  });

  describe('debate', () => {
    it('ディベートモードで処理する', async () => {
      const request: MoARequest = {
        task: 'Discuss the future of artificial intelligence',
        agents: [
          AGENT_PRESETS.analytical!,
          AGENT_PRESETS.creative!,
        ],
      };

      const result = await engine.debate(request, 2);
      
      expect(result.response).toBeDefined();
      expect(result.metadata.aggregationStrategy).toBe('debate');
    });
  });

  describe('analyzeConsensus', () => {
    it('合意分析を実行する', () => {
      const responses: AgentResponse[] = [
        {
          agentId: 'a1',
          agentName: 'Agent 1',
          response: 'Solution involves technology and innovation.',
          processingTime: 100,
        },
        {
          agentId: 'a2',
          agentName: 'Agent 2',
          response: 'Technology and innovation are essential.',
          processingTime: 100,
        },
      ];

      const analysis = engine.analyzeConsensus(responses);
      
      expect(analysis.score).toBeDefined();
      expect(analysis.level).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('設定を更新できる', () => {
      const newConfig: Partial<MoAConfig> = {
        maxRounds: 5,
        consensusThreshold: 0.8,
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();
      
      expect(config.maxRounds).toBe(5);
      expect(config.consensusThreshold).toBe(0.8);
    });

    it('デフォルト設定を使用する', () => {
      const config = engine.getConfig();
      
      expect(config.defaultStrategy).toBe(DEFAULT_MOA_CONFIG.defaultStrategy);
      expect(config.minAgents).toBe(DEFAULT_MOA_CONFIG.minAgents);
    });
  });

  describe('metadata', () => {
    it('処理メタデータを返す', async () => {
      const request: MoARequest = {
        task: 'Test task',
        agents: [AGENT_PRESETS.analytical!],
      };

      const result = await engine.process(request);
      
      expect(result.metadata.totalRounds).toBeGreaterThanOrEqual(1);
      expect(result.metadata.totalAgents).toBeGreaterThanOrEqual(1);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.aggregationStrategy).toBeDefined();
      expect(result.metadata.tokenUsage).toBeDefined();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('MoA Integration', () => {
  it('複雑なタスクを処理する', async () => {
    const engine = new MoAEngine();
    
    const request: MoARequest = {
      task: 'Evaluate the feasibility of launching a new product in the tech market. Consider innovation, risks, and market trends.',
      context: 'We are a mid-sized technology company with limited R&D budget.',
    };

    const result = await engine.process(request);
    
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(100);
    expect(result.agentResponses.length).toBeGreaterThanOrEqual(3);
  });

  it('カスタムエージェントをサポートする', async () => {
    const engine = new MoAEngine();
    
    const customAgent: AgentConfig = {
      id: 'custom-expert',
      name: 'Domain Expert',
      type: 'custom',
      specialization: 'Healthcare technology',
      weight: 1.5,
      systemPrompt: 'You are an expert in healthcare technology.',
      parameters: { temperature: 0.5 },
    };

    const request: MoARequest = {
      task: 'Analyze healthcare technology trends',
      agents: [customAgent, AGENT_PRESETS.analytical!],
    };

    const result = await engine.process(request);
    
    expect(result.agentResponses.length).toBe(2);
    expect(result.agentResponses.some(r => r.agentId === 'custom-expert')).toBe(true);
  });

  it('統合戦略を切り替える', async () => {
    const engine = new MoAEngine();
    const strategies: Array<'majority_vote' | 'synthesis' | 'best_of_n'> = [
      'majority_vote',
      'synthesis',
      'best_of_n',
    ];

    for (const strategy of strategies) {
      const request: MoARequest = {
        task: 'Test task',
        strategy,
        agents: [AGENT_PRESETS.analytical!, AGENT_PRESETS.creative!],
      };

      const result = await engine.process(request);
      expect(result.metadata.aggregationStrategy).toBe(strategy);
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('空のエージェントリストでもデフォルトを使用', async () => {
    const engine = new MoAEngine();
    
    const request: MoARequest = {
      task: 'Test task',
      agents: [],
    };

    const result = await engine.process(request);
    expect(result.agentResponses.length).toBeGreaterThanOrEqual(3);
  });

  it('空のタスクでも処理する', async () => {
    const engine = new MoAEngine();
    
    const request: MoARequest = {
      task: '',
    };

    const result = await engine.process(request);
    expect(result.response).toBeDefined();
  });
});
