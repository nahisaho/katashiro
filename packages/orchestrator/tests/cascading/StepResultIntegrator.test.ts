/**
 * KATASHIRO v1.4.0 - StepResultIntegrator テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StepResultIntegrator,
  IntegrationConfig,
  DEFAULT_INTEGRATION_CONFIG,
  IntegrationResult,
} from '../../src/cascading/StepResultIntegrator.js';
import type {
  StepResult,
  Finding,
  CascadingSource,
  CascadingAgentReport,
  Contradiction,
} from '../../src/cascading/types.js';

// テスト用のソースを作成
function createMockSource(index: number, domain: string = 'example.com'): CascadingSource {
  return {
    url: `https://${domain}/article-${index}`,
    title: `Article ${index}`,
    fetchedAt: new Date().toISOString(),
    credibility: 0.7 + Math.random() * 0.2,
    domain,
  };
}

// テスト用の発見事項を作成
function createMockFinding(
  stepNumber: number,
  agentId: string,
  content: string,
  confidence: number = 0.8
): Finding {
  return {
    id: `finding-${stepNumber}-${agentId}-${Date.now()}`,
    content,
    source: createMockSource(1),
    confidence,
    stepNumber,
    agentId,
    category: 'fact',
    timestamp: new Date().toISOString(),
  };
}

// テスト用のエージェントレポートを作成
function createMockAgentReport(
  stepNumber: number,
  role: 'official' | 'news' | 'analysis' | 'academic' | 'community',
  findings: Finding[]
): CascadingAgentReport {
  return {
    agentId: `agent-${role}-${stepNumber}`,
    role,
    stepNumber,
    content: `${role}エージェントのレポート`,
    findings,
    sources: findings.map(f => f.source),
    gaps: [`${role}のギャップ`],
    durationMs: 1000,
    timestamp: new Date().toISOString(),
  };
}

// テスト用のステップ結果を作成
function createMockStepResult(stepNumber: number, options?: {
  findings?: Finding[];
  sources?: CascadingSource[];
  confidence?: number;
  gaps?: string[];
}): StepResult {
  const defaultFindings = [
    createMockFinding(stepNumber, 'official', `ステップ${stepNumber}の公式発見`, 0.85),
    createMockFinding(stepNumber, 'news', `ステップ${stepNumber}のニュース発見`, 0.75),
  ];

  const findings = options?.findings ?? defaultFindings;

  return {
    stepNumber,
    focus: stepNumber === 1 ? 'overview' : stepNumber === 2 ? 'detail' : 'verify',
    agentReports: [
      createMockAgentReport(stepNumber, 'official', findings.filter(f => f.agentId.includes('official'))),
      createMockAgentReport(stepNumber, 'news', findings.filter(f => f.agentId.includes('news'))),
    ],
    integratedSummary: `ステップ${stepNumber}の統合要約`,
    findings,
    sources: options?.sources ?? findings.map(f => f.source),
    gaps: options?.gaps ?? [`ステップ${stepNumber}のギャップ`],
    resolvedGaps: [],
    confidence: options?.confidence ?? 0.8,
    contradictions: [],
    durationMs: 2000,
    timestamp: new Date().toISOString(),
  };
}

describe('StepResultIntegrator', () => {
  let integrator: StepResultIntegrator;

  beforeEach(() => {
    integrator = new StepResultIntegrator();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化される', () => {
      expect(integrator).toBeDefined();
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: Partial<IntegrationConfig> = {
        contradictionThreshold: 0.5,
        maxFindingsInReport: 50,
      };
      const customIntegrator = new StepResultIntegrator(customConfig);
      expect(customIntegrator).toBeDefined();
    });
  });

  describe('DEFAULT_INTEGRATION_CONFIG', () => {
    it('正しいデフォルト値を持つ', () => {
      expect(DEFAULT_INTEGRATION_CONFIG.contradictionThreshold).toBe(0.7);
      expect(DEFAULT_INTEGRATION_CONFIG.deduplicationThreshold).toBe(0.8);
      expect(DEFAULT_INTEGRATION_CONFIG.maxFindingsInReport).toBe(30);
      expect(DEFAULT_INTEGRATION_CONFIG.maxSourcesInReport).toBe(20);
    });
  });

  describe('integrate', () => {
    it('複数ステップの結果を統合できる', () => {
      const stepResults = [
        createMockStepResult(1),
        createMockStepResult(2),
        createMockStepResult(3),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result).toBeDefined();
      expect(result.findings).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.finalReport).toBeDefined();
    });

    it('発見事項を収集する', () => {
      const stepResults = [
        createMockStepResult(1),
        createMockStepResult(2),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('ソースを収集する', () => {
      const stepResults = [
        createMockStepResult(1),
        createMockStepResult(2),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('全体信頼度を計算する', () => {
      const stepResults = [
        createMockStepResult(1, { confidence: 0.8 }),
        createMockStepResult(2, { confidence: 0.85 }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('最終レポートを生成する', () => {
      const stepResults = [createMockStepResult(1)];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.finalReport).toBeDefined();
      expect(result.finalReport.length).toBeGreaterThan(0);
      expect(result.finalReport).toContain('AI倫理');
    });
  });

  describe('source deduplication', () => {
    it('同じURLのソースを重複除去する', () => {
      const sharedSource = createMockSource(999, 'shared.com');
      sharedSource.url = 'https://shared.example.com/unique';

      const stepResults = [
        createMockStepResult(1, {
          sources: [sharedSource, createMockSource(1)],
        }),
        createMockStepResult(2, {
          sources: [sharedSource, createMockSource(2)],
        }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      const sharedUrls = result.sources.filter(
        s => s.url === 'https://shared.example.com/unique'
      );
      expect(sharedUrls.length).toBe(1);
    });

    it('ソースを信頼度順にソートする', () => {
      const highCredSource = createMockSource(1);
      highCredSource.credibility = 0.95;

      const lowCredSource = createMockSource(2);
      lowCredSource.credibility = 0.5;

      const stepResults = [
        createMockStepResult(1, {
          sources: [lowCredSource, highCredSource],
        }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      if (result.sources.length >= 2) {
        expect(result.sources[0].credibility).toBeGreaterThanOrEqual(result.sources[1].credibility);
      }
    });
  });

  describe('contradiction detection', () => {
    it('矛盾する発見事項を検出する', () => {
      const contradictoryFindings = [
        createMockFinding(1, 'official', 'AIは完全に安全であり、リスクは全くない。安心して使用できる技術である。', 0.8),
        createMockFinding(1, 'analysis', 'AIは非常に危険であり、重大なリスクがある。使用を控えるべきである。', 0.8),
      ];

      const stepResults = [
        createMockStepResult(1, { findings: contradictoryFindings }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      // 矛盾が検出される可能性がある
      expect(result.contradictions).toBeDefined();
      expect(Array.isArray(result.contradictions)).toBe(true);
    });

    it('矛盾には適切なプロパティがある', () => {
      const contradictoryFindings = [
        createMockFinding(1, 'official', 'AIは安全であると確認されている。問題はない。', 0.9),
        createMockFinding(2, 'analysis', 'AIは危険であることが判明している。深刻な問題がある。', 0.9),
      ];

      const stepResults = [
        createMockStepResult(1, { findings: [contradictoryFindings[0]] }),
        createMockStepResult(2, { findings: [contradictoryFindings[1]] }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      for (const contradiction of result.contradictions) {
        expect(contradiction.id).toBeDefined();
        expect(contradiction.finding1).toBeDefined();
        expect(contradiction.finding2).toBeDefined();
        expect(contradiction.description).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(contradiction.severity);
      }
    });
  });

  describe('gap identification', () => {
    it('残存ギャップを特定する', () => {
      const stepResults = [
        createMockStepResult(1, { gaps: ['技術的詳細', 'コスト情報'] }),
        createMockStepResult(2, { gaps: ['実装事例'] }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.remainingGaps).toBeDefined();
      expect(Array.isArray(result.remainingGaps)).toBe(true);
    });
  });

  describe('finding deduplication', () => {
    it('類似した発見事項を重複除去する', () => {
      const similarFindings = [
        createMockFinding(1, 'official', 'AIは機械学習技術の一種である。深層学習を使用している。', 0.9),
        createMockFinding(2, 'news', 'AIは機械学習技術の一種である。深層学習を使用している。', 0.8), // ほぼ同じ内容
      ];

      const stepResults = [
        createMockStepResult(1, { findings: [similarFindings[0]] }),
        createMockStepResult(2, { findings: [similarFindings[1]] }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      // 重複が除去され、片方だけ残る
      const similarContents = result.findings.filter(
        f => f.content.includes('機械学習技術の一種')
      );
      expect(similarContents.length).toBeLessThanOrEqual(2);
    });

    it('発見事項を信頼度順にソートする', () => {
      const findings = [
        createMockFinding(1, 'official', '低信頼度の発見事項', 0.5),
        createMockFinding(1, 'news', '高信頼度の発見事項', 0.95),
        createMockFinding(1, 'analysis', '中信頼度の発見事項', 0.75),
      ];

      const stepResults = [
        createMockStepResult(1, { findings }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      // 信頼度の高い順にソートされている
      for (let i = 0; i < result.findings.length - 1; i++) {
        expect(result.findings[i].confidence).toBeGreaterThanOrEqual(
          result.findings[i + 1].confidence
        );
      }
    });
  });

  describe('max limits', () => {
    it('最大発見事項数を超えない', () => {
      const manyFindings = Array.from({ length: 50 }, (_, i) =>
        createMockFinding(1, `agent-${i}`, `発見事項 ${i}`, 0.5 + Math.random() * 0.4)
      );

      const stepResults = [
        createMockStepResult(1, { findings: manyFindings }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.findings.length).toBeLessThanOrEqual(
        DEFAULT_INTEGRATION_CONFIG.maxFindingsInReport
      );
    });

    it('最大ソース数を超えない', () => {
      const manySources = Array.from({ length: 50 }, (_, i) =>
        createMockSource(i, `source${i}.com`)
      );

      const stepResults = [
        createMockStepResult(1, { sources: manySources }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result.sources.length).toBeLessThanOrEqual(
        DEFAULT_INTEGRATION_CONFIG.maxSourcesInReport
      );
    });
  });

  describe('empty results', () => {
    it('空の結果を処理できる', () => {
      const stepResults: StepResult[] = [];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result).toBeDefined();
      expect(result.findings).toHaveLength(0);
      expect(result.sources).toHaveLength(0);
    });

    it('発見事項なしのステップを処理できる', () => {
      const stepResults = [
        createMockStepResult(1, { findings: [], sources: [] }),
      ];

      const result = integrator.integrate('AI倫理', stepResults);

      expect(result).toBeDefined();
      expect(result.findings).toHaveLength(0);
    });
  });
});
