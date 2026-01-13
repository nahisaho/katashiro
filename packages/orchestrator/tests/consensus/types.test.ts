/**
 * Consensus Types Tests
 * @fileoverview REQ-1.2.0: 型定義と定数のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONSENSUS_CONFIG,
  DEFAULT_AGENT_STRATEGIES,
  ConsensusResearchError,
  ConsensusResearchErrorCode,
} from '../../src/consensus/types';

describe('Consensus Types', () => {
  describe('DEFAULT_CONSENSUS_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONSENSUS_CONFIG.agentCount).toBe(3);
      expect(DEFAULT_CONSENSUS_CONFIG.iterationCount).toBe(3);
      expect(DEFAULT_CONSENSUS_CONFIG.conflictThreshold).toBe(0.1);
      expect(DEFAULT_CONSENSUS_CONFIG.agentTimeoutMs).toBe(300000);
      expect(DEFAULT_CONSENSUS_CONFIG.earlyTerminationThreshold).toBe(0.05);
    });

    it('should have agentCount equal to 3', () => {
      // REQ-1.2.0-WFL-001: 3エージェント
      expect(DEFAULT_CONSENSUS_CONFIG.agentCount).toBe(3);
    });

    it('should have iterationCount equal to 3', () => {
      // REQ-1.2.0-WFL-001: 3イテレーション
      expect(DEFAULT_CONSENSUS_CONFIG.iterationCount).toBe(3);
    });

    it('should have searchConfig', () => {
      expect(DEFAULT_CONSENSUS_CONFIG.searchConfig).toBeDefined();
      expect(DEFAULT_CONSENSUS_CONFIG.searchConfig?.provider).toBe('duckduckgo');
      expect(DEFAULT_CONSENSUS_CONFIG.searchConfig?.maxResultsPerAgent).toBe(10);
    });
  });

  describe('DEFAULT_AGENT_STRATEGIES', () => {
    it('should have 3 strategies', () => {
      expect(DEFAULT_AGENT_STRATEGIES).toHaveLength(3);
    });

    it('should have distinct agentIds (1, 2, 3)', () => {
      const agentIds = DEFAULT_AGENT_STRATEGIES.map((s) => s.agentId);
      expect(agentIds).toContain(1);
      expect(agentIds).toContain(2);
      expect(agentIds).toContain(3);
    });

    it('should have distinct preferredSources', () => {
      const allSources = DEFAULT_AGENT_STRATEGIES.flatMap((s) => s.preferredSources);
      expect(allSources).toContain('official');
      expect(allSources).toContain('news');
      expect(allSources).toContain('academic');
    });

    it('each strategy should have queryModifiers', () => {
      DEFAULT_AGENT_STRATEGIES.forEach((s) => {
        expect(s.queryModifiers).toBeInstanceOf(Array);
        expect(s.queryModifiers.length).toBeGreaterThan(0);
      });
    });

    it('each strategy should have maxResultsPerAgent', () => {
      DEFAULT_AGENT_STRATEGIES.forEach((s) => {
        expect(s.maxResultsPerAgent).toBeGreaterThanOrEqual(1);
        expect(s.maxResultsPerAgent).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('ConsensusResearchError', () => {
    it('should create error with code and message', () => {
      const error = new ConsensusResearchError(
        ConsensusResearchErrorCode.AGENT_TIMEOUT,
        'Agent 1 timed out'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(ConsensusResearchErrorCode.AGENT_TIMEOUT);
      expect(error.message).toBe('Agent 1 timed out');
      expect(error.name).toBe('ConsensusResearchError');
    });

    it('should include details when provided', () => {
      const details = { agentId: 1, timeout: 120000 };
      const error = new ConsensusResearchError(
        ConsensusResearchErrorCode.AGENT_TIMEOUT,
        'Timeout',
        details
      );

      expect(error.details).toEqual(details);
    });

    it('should have all error codes defined', () => {
      expect(ConsensusResearchErrorCode.AGENT_TIMEOUT).toBe('AGENT_TIMEOUT');
      expect(ConsensusResearchErrorCode.MAJORITY_FAILURE).toBe('MAJORITY_FAILURE');
      expect(ConsensusResearchErrorCode.SCORING_ERROR).toBe('SCORING_ERROR');
      expect(ConsensusResearchErrorCode.SELECTION_ERROR).toBe('SELECTION_ERROR');
      expect(ConsensusResearchErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIG');
    });
  });
});

describe('Type Safety', () => {
  it('AgentStrategy should require all fields', () => {
    // TypeScriptコンパイラが型チェックを行うため、このテストはランタイムでの検証
    const validStrategy = DEFAULT_AGENT_STRATEGIES[0];
    expect(validStrategy).toHaveProperty('agentId');
    expect(validStrategy).toHaveProperty('queryModifiers');
    expect(validStrategy).toHaveProperty('preferredSources');
    expect(validStrategy).toHaveProperty('timeRange');
    expect(validStrategy).toHaveProperty('maxResultsPerAgent');
  });

  it('ConsensusResearchConfig should have all required fields', () => {
    // 全フィールドが存在することを確認
    const config = DEFAULT_CONSENSUS_CONFIG;
    expect(config).toHaveProperty('agentCount');
    expect(config).toHaveProperty('iterationCount');
    expect(config).toHaveProperty('conflictThreshold');
    expect(config).toHaveProperty('agentTimeoutMs');
    expect(config).toHaveProperty('searchConfig');
  });
});
