/**
 * KATASHIRO v1.4.0 - Cascading Research Types テスト
 */

import { describe, it, expect } from 'vitest';
import {
  AgentRole,
  StepFocus,
  FindingCategory,
  CascadingSource,
  Finding,
  Contradiction,
  CascadingAgentReport,
  StepContext,
  StepResult,
  CascadingResearchConfig,
  CascadingAgentStrategy,
  StepStrategyConfig,
  DEFAULT_CASCADING_CONFIG,
  DEFAULT_AGENT_STRATEGIES,
  DEFAULT_STEP_STRATEGIES,
  generateFindingId,
  generateContradictionId,
  getStepFocusLabel,
  getAgentRoleLabel,
  calculateStepConfidence,
} from '../../src/cascading/types.js';

describe('Cascading Research Types', () => {
  // 基本型テスト
  describe('Basic Types', () => {
    it('AgentRole は5つの役割を持つ', () => {
      const roles: AgentRole[] = ['official', 'news', 'analysis', 'academic', 'community'];
      expect(roles).toHaveLength(5);
      roles.forEach((role) => {
        expect(['official', 'news', 'analysis', 'academic', 'community']).toContain(role);
      });
    });

    it('StepFocus は5つのフォーカスを持つ', () => {
      const focuses: StepFocus[] = ['overview', 'detail', 'gap', 'verify', 'integrate'];
      expect(focuses).toHaveLength(5);
      focuses.forEach((focus) => {
        expect(['overview', 'detail', 'gap', 'verify', 'integrate']).toContain(focus);
      });
    });

    it('FindingCategory は5つのカテゴリを持つ', () => {
      const categories: FindingCategory[] = ['fact', 'opinion', 'analysis', 'question', 'contradiction'];
      expect(categories).toHaveLength(5);
      categories.forEach((category) => {
        expect(['fact', 'opinion', 'analysis', 'question', 'contradiction']).toContain(category);
      });
    });
  });

  // CascadingSource テスト
  describe('CascadingSource', () => {
    it('正しい構造を持つ', () => {
      const source: CascadingSource = {
        url: 'https://example.com/article',
        title: 'テスト記事',
        fetchedAt: '2025-01-01T00:00:00Z',
        credibility: 0.8,
        domain: 'example.com',
      };

      expect(source.url).toBe('https://example.com/article');
      expect(source.title).toBe('テスト記事');
      expect(source.fetchedAt).toBe('2025-01-01T00:00:00Z');
      expect(source.credibility).toBe(0.8);
      expect(source.domain).toBe('example.com');
    });
  });

  // Finding テスト
  describe('Finding', () => {
    it('正しい構造を持つ', () => {
      const source: CascadingSource = {
        url: 'https://example.com',
        title: 'ソース',
        fetchedAt: '2025-01-01T00:00:00Z',
        credibility: 0.9,
        domain: 'example.com',
      };

      const finding: Finding = {
        id: 'finding-1-agent-1-12345',
        content: 'AIの倫理的課題について',
        source,
        confidence: 0.85,
        stepNumber: 1,
        agentId: 'agent-1',
        category: 'fact',
        timestamp: '2025-01-01T00:00:00Z',
      };

      expect(finding.id).toBe('finding-1-agent-1-12345');
      expect(finding.content).toBe('AIの倫理的課題について');
      expect(finding.source.url).toBe('https://example.com');
      expect(finding.confidence).toBe(0.85);
      expect(finding.stepNumber).toBe(1);
      expect(finding.agentId).toBe('agent-1');
      expect(finding.category).toBe('fact');
    });
  });

  // Contradiction テスト
  describe('Contradiction', () => {
    it('正しい構造を持つ', () => {
      const source1: CascadingSource = {
        url: 'https://source1.com',
        title: 'ソース1',
        fetchedAt: '2025-01-01T00:00:00Z',
        credibility: 0.8,
        domain: 'source1.com',
      };

      const source2: CascadingSource = {
        url: 'https://source2.com',
        title: 'ソース2',
        fetchedAt: '2025-01-01T00:00:00Z',
        credibility: 0.7,
        domain: 'source2.com',
      };

      const finding1: Finding = {
        id: 'f1',
        content: 'AIは安全',
        source: source1,
        confidence: 0.8,
        stepNumber: 1,
        agentId: 'a1',
        category: 'fact',
        timestamp: '2025-01-01T00:00:00Z',
      };

      const finding2: Finding = {
        id: 'f2',
        content: 'AIは危険',
        source: source2,
        confidence: 0.7,
        stepNumber: 2,
        agentId: 'a2',
        category: 'fact',
        timestamp: '2025-01-01T00:00:00Z',
      };

      const contradiction: Contradiction = {
        id: 'c1',
        finding1,
        finding2,
        description: 'AIの安全性に関して矛盾',
        severity: 'high',
        resolved: false,
      };

      expect(contradiction.id).toBe('c1');
      expect(contradiction.finding1.content).toBe('AIは安全');
      expect(contradiction.finding2.content).toBe('AIは危険');
      expect(contradiction.severity).toBe('high');
      expect(contradiction.resolved).toBe(false);
    });
  });

  // CascadingAgentReport テスト
  describe('CascadingAgentReport', () => {
    it('正しい構造を持つ', () => {
      const report: CascadingAgentReport = {
        agentId: 'agent-official-1',
        role: 'official',
        stepNumber: 1,
        content: 'レポート内容',
        findings: [],
        sources: [],
        gaps: ['詳細な技術仕様'],
        durationMs: 1500,
        timestamp: '2025-01-01T00:00:00Z',
      };

      expect(report.agentId).toBe('agent-official-1');
      expect(report.role).toBe('official');
      expect(report.stepNumber).toBe(1);
      expect(report.gaps).toContain('詳細な技術仕様');
    });

    it('エラー情報を含むことができる', () => {
      const report: CascadingAgentReport = {
        agentId: 'agent-1',
        role: 'news',
        stepNumber: 1,
        content: '',
        findings: [],
        sources: [],
        gaps: [],
        durationMs: 100,
        timestamp: '2025-01-01T00:00:00Z',
        error: '検索に失敗しました',
      };

      expect(report.error).toBe('検索に失敗しました');
    });
  });

  // StepContext テスト
  describe('StepContext', () => {
    it('正しい構造を持つ', () => {
      const context: StepContext = {
        stepNumber: 2,
        topic: 'AI倫理',
        stepFocus: 'detail',
        allPreviousResults: [],
        identifiedGaps: ['技術詳細'],
        keyEntities: ['OpenAI'],
        unresolvedQuestions: ['安全性'],
        queryModifiers: ['詳細', '技術'],
      };

      expect(context.stepNumber).toBe(2);
      expect(context.topic).toBe('AI倫理');
      expect(context.stepFocus).toBe('detail');
      expect(context.identifiedGaps).toContain('技術詳細');
      expect(context.keyEntities).toContain('OpenAI');
    });
  });

  // StepResult テスト
  describe('StepResult', () => {
    it('正しい構造を持つ', () => {
      const result: StepResult = {
        stepNumber: 1,
        focus: 'overview',
        agentReports: [],
        integratedSummary: '概要サマリー',
        findings: [],
        sources: [],
        gaps: ['詳細情報'],
        resolvedGaps: [],
        confidence: 0.75,
        contradictions: [],
        durationMs: 5000,
        timestamp: '2025-01-01T00:00:00Z',
      };

      expect(result.stepNumber).toBe(1);
      expect(result.focus).toBe('overview');
      expect(result.confidence).toBe(0.75);
    });
  });
});

// デフォルト設定テスト
describe('Default Configurations', () => {
  describe('DEFAULT_CASCADING_CONFIG', () => {
    it('基本設定が正しい', () => {
      expect(DEFAULT_CASCADING_CONFIG.stepCount).toBe(5);
      expect(DEFAULT_CASCADING_CONFIG.agentCount).toBe(5);
      expect(DEFAULT_CASCADING_CONFIG.stepTimeoutMs).toBe(300000);
      expect(DEFAULT_CASCADING_CONFIG.agentTimeoutMs).toBe(60000);
    });

    it('検索設定が正しい', () => {
      expect(DEFAULT_CASCADING_CONFIG.searchConfig.provider).toBe('duckduckgo');
      expect(DEFAULT_CASCADING_CONFIG.searchConfig.maxResultsPerAgent).toBe(10);
    });

    it('後処理設定が正しい', () => {
      expect(DEFAULT_CASCADING_CONFIG.postProcess?.enabled).toBe(true);
      expect(DEFAULT_CASCADING_CONFIG.postProcess?.preferMermaid).toBe(true);
    });

    it('早期終了設定が正しい', () => {
      expect(DEFAULT_CASCADING_CONFIG.earlyTermination?.enabled).toBe(false);
      expect(DEFAULT_CASCADING_CONFIG.earlyTermination?.confidenceThreshold).toBe(0.9);
      expect(DEFAULT_CASCADING_CONFIG.earlyTermination?.minSteps).toBe(3);
    });
  });

  describe('DEFAULT_AGENT_STRATEGIES', () => {
    it('5つのエージェント戦略を持つ', () => {
      expect(DEFAULT_AGENT_STRATEGIES).toHaveLength(5);
    });

    it.each<[AgentRole, string]>([
      ['official', '公式'],
      ['news', '最新'],
      ['analysis', '分析'],
      ['academic', '研究'],
      ['community', '口コミ'],
    ])('ロール %s は修飾子に %s を含む', (role, modifier) => {
      const strategy = DEFAULT_AGENT_STRATEGIES.find((s) => s.role === role);
      expect(strategy).toBeDefined();
      expect(strategy?.queryModifiers.some((m) => m.includes(modifier))).toBe(true);
    });
  });

  describe('DEFAULT_STEP_STRATEGIES', () => {
    it('5つのステップ戦略を持つ', () => {
      expect(DEFAULT_STEP_STRATEGIES).toHaveLength(5);
    });

    it.each<[StepFocus, string]>([
      ['overview', '概要'],
      ['detail', '詳細'],
      ['gap', '課題'],
      ['verify', '検証'],
      ['integrate', 'まとめ'],
    ])('フォーカス %s は修飾子に %s を含む', (focus, modifier) => {
      const strategy = DEFAULT_STEP_STRATEGIES.find((s) => s.focus === focus);
      expect(strategy).toBeDefined();
      expect(strategy?.queryModifiers.some((m) => m.includes(modifier))).toBe(true);
    });
  });
});

// ユーティリティ関数テスト
describe('Utility Functions', () => {
  describe('generateFindingId', () => {
    it('一意なIDを生成する', () => {
      const id1 = generateFindingId(1, 'agent-1');
      const id2 = generateFindingId(1, 'agent-1');

      expect(id1).not.toBe(id2);
    });

    it('ステップ番号とエージェントIDを含む', () => {
      const id = generateFindingId(3, 'agent-official');

      expect(id).toContain('finding-3');
      expect(id).toContain('agent-official');
    });

    it('フォーマットが正しい', () => {
      const id = generateFindingId(1, 'test');

      expect(id).toMatch(/^finding-\d+-[\w-]+-\d+-[a-z0-9]+$/);
    });
  });

  describe('generateContradictionId', () => {
    it('一意なIDを生成する', () => {
      const id1 = generateContradictionId();
      const id2 = generateContradictionId();

      expect(id1).not.toBe(id2);
    });

    it('フォーマットが正しい', () => {
      const id = generateContradictionId();

      expect(id).toMatch(/^contradiction-\d+-[a-z0-9]+$/);
    });
  });

  describe('getStepFocusLabel', () => {
    it.each<[StepFocus, string]>([
      ['overview', '概要把握'],
      ['detail', '詳細調査'],
      ['gap', 'ギャップ補完'],
      ['verify', '検証・確認'],
      ['integrate', '統合・結論'],
    ])('フォーカス %s のラベルは %s', (focus, expected) => {
      expect(getStepFocusLabel(focus)).toBe(expected);
    });
  });

  describe('getAgentRoleLabel', () => {
    it.each<[AgentRole, string]>([
      ['official', '公式情報'],
      ['news', 'ニュース'],
      ['analysis', '分析・考察'],
      ['academic', '学術情報'],
      ['community', 'コミュニティ'],
    ])('ロール %s のラベルは %s', (role, expected) => {
      expect(getAgentRoleLabel(role)).toBe(expected);
    });
  });

  describe('calculateStepConfidence', () => {
    it('全エージェント成功・高信頼度で高いスコア', () => {
      const confidence = calculateStepConfidence(
        5,
        5,
        [0.9, 0.85, 0.88, 0.92, 0.87],
        [0.9, 0.85, 0.8, 0.88, 0.82]
      );

      expect(confidence).toBeGreaterThan(0.8);
    });

    it('一部エージェント失敗でスコアが下がる', () => {
      const fullSuccess = calculateStepConfidence(5, 5, [0.8], [0.8]);
      const partialSuccess = calculateStepConfidence(3, 5, [0.8], [0.8]);

      expect(partialSuccess).toBeLessThan(fullSuccess);
    });

    it('発見事項の信頼度が低いとスコアが下がる', () => {
      const highConfidence = calculateStepConfidence(5, 5, [0.9, 0.85], [0.8]);
      const lowConfidence = calculateStepConfidence(5, 5, [0.3, 0.25], [0.8]);

      expect(lowConfidence).toBeLessThan(highConfidence);
    });

    it('ソース信頼度が低いとスコアが下がる', () => {
      const highCredibility = calculateStepConfidence(5, 5, [0.8], [0.9, 0.85]);
      const lowCredibility = calculateStepConfidence(5, 5, [0.8], [0.3, 0.25]);

      expect(lowCredibility).toBeLessThan(highCredibility);
    });

    it('0から1の範囲に収まる', () => {
      const confidence = calculateStepConfidence(5, 5, [0.9], [0.9]);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);

      const lowConfidence = calculateStepConfidence(0, 5, [], []);
      expect(lowConfidence).toBeGreaterThanOrEqual(0);
      expect(lowConfidence).toBeLessThanOrEqual(1);
    });

    it('エージェント0件でも動作する', () => {
      const confidence = calculateStepConfidence(0, 0, [], []);
      // エージェント成功率 0, 発見事項平均 0.5, ソース平均 0.5
      // = 0*0.3 + 0.5*0.4 + 0.5*0.3 = 0.35
      expect(confidence).toBe(0.35);
    });
  });
});
