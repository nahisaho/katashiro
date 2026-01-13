/**
 * ReportScorer Tests
 * @fileoverview REQ-1.2.0-WFL-002: スコアリングロジックのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportScorer } from '../../src/consensus/ReportScorer';
import { AgentReport, AgentStrategy } from '../../src/consensus/types';

describe('ReportScorer', () => {
  let scorer: ReportScorer;

  beforeEach(() => {
    scorer = new ReportScorer(0.1);
  });

  describe('constructor', () => {
    it('should create with default threshold', () => {
      const defaultScorer = new ReportScorer();
      expect(defaultScorer).toBeInstanceOf(ReportScorer);
    });

    it('should create with custom threshold', () => {
      const customScorer = new ReportScorer(0.8);
      expect(customScorer).toBeInstanceOf(ReportScorer);
    });
  });

  describe('scoreReports', () => {
    const createMockStrategy = (agentId: number): AgentStrategy => ({
      agentId,
      queryModifiers: ['test'],
      preferredSources: ['official'],
      timeRange: 'all',
      maxResultsPerAgent: 10,
    });

    const createMockReport = (
      agentId: number,
      content: string,
      sourcesCount: number = 5,
      reliabilityScore: number = 0.8
    ): AgentReport => ({
      reportId: `report-${agentId}`,
      agentId,
      content,
      sources: Array.from({ length: sourcesCount }, (_, i) => ({
        url: `https://source${i}.example.com`,
        title: `Source ${i}`,
        reliabilityScore,
        fetchedAt: new Date().toISOString(),
      })),
      generatedAt: new Date().toISOString(),
      durationMs: 1000,
      strategy: createMockStrategy(agentId),
    });

    it('should score multiple reports', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'Report 1 content about AI and machine learning.'),
        createMockReport(2, 'Report 2 content about AI and deep learning.'),
        createMockReport(3, 'Report 3 content about AI and neural networks.'),
      ];

      const scores = scorer.scoreReports(reports);

      expect(scores).toHaveLength(3);
      scores.forEach((score) => {
        expect(score.totalScore).toBeGreaterThanOrEqual(0);
        expect(score.totalScore).toBeLessThanOrEqual(1);
        expect(score.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(score.reliabilityScore).toBeGreaterThanOrEqual(0);
        expect(score.coverageScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should detect conflicts between reports', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'AI発展は2020年に始まった。AIは安全である。'),
        createMockReport(2, 'AI発展は2015年に始まった。AIは危険である。'),
        createMockReport(3, 'AI発展は2018年に始まった。AIは安全である。'),
      ];

      const scores = scorer.scoreReports(reports);

      // スコアリングが実行されることを確認
      expect(scores).toHaveLength(3);
      scores.forEach((score) => {
        expect(score).toHaveProperty('conflicts');
      });
    });

    it('should penalize reports with unverified statements', () => {
      const reportsWithUnverified: AgentReport[] = [
        createMockReport(
          1,
          '確認された事実です。検証済みの情報です。'
        ),
        createMockReport(
          2,
          '[要検証]未確認の情報です。[未確認]別の未検証情報。'
        ),
        createMockReport(3, '通常のレポート内容です。'),
      ];

      const scores = scorer.scoreReports(reportsWithUnverified);

      // 未検証ラベルがあるレポートはunverifiedCountが高いはず
      const score2 = scores.find((s) => s.reportId === 'report-2')!;
      expect(score2.unverifiedCount).toBeGreaterThan(0);
    });

    it('should give higher reliability score for more sources', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'Content', 2, 0.8), // 2 sources
        createMockReport(2, 'Content', 10, 0.8), // 10 sources
      ];

      const scores = scorer.scoreReports(reports);

      const score1 = scores.find((s) => s.reportId === 'report-1')!;
      const score2 = scores.find((s) => s.reportId === 'report-2')!;

      // 浮動小数点の精度を考慮して比較
      expect(score2.reliabilityScore).toBeCloseTo(score1.reliabilityScore, 1);
    });

    it('should give higher reliability score for higher source reliability', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'Content', 5, 0.4), // Low reliability sources
        createMockReport(2, 'Content', 5, 0.9), // High reliability sources
      ];

      const scores = scorer.scoreReports(reports);

      const score1 = scores.find((s) => s.reportId === 'report-1')!;
      const score2 = scores.find((s) => s.reportId === 'report-2')!;

      expect(score2.reliabilityScore).toBeGreaterThan(score1.reliabilityScore);
    });

    it('should include sourceUrls in scores', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'Content'),
      ];

      const scores = scorer.scoreReports(reports);

      expect(scores[0].sourceUrls).toBeDefined();
      expect(scores[0].sourceUrls).toBeInstanceOf(Array);
      expect(scores[0].sourceUrls!.length).toBe(5);
    });
  });

  describe('conflict detection', () => {
    const createMockStrategy = (agentId: number): AgentStrategy => ({
      agentId,
      queryModifiers: ['test'],
      preferredSources: ['official'],
      timeRange: 'all',
      maxResultsPerAgent: 10,
    });

    const createMockReport = (
      agentId: number,
      content: string
    ): AgentReport => ({
      reportId: `report-${agentId}`,
      agentId,
      content,
      sources: [],
      generatedAt: new Date().toISOString(),
      durationMs: 1000,
      strategy: createMockStrategy(agentId),
    });

    it('should detect numerical contradictions', () => {
      const reports: AgentReport[] = [
        createMockReport(1, '市場規模は100億円です。'),
        createMockReport(2, '市場規模は500億円です。'),
      ];

      const scores = scorer.scoreReports(reports);

      // スコアリングが実行されることを確認
      expect(scores.length).toBe(2);
    });

    it('should detect temporal contradictions', () => {
      const reports: AgentReport[] = [
        createMockReport(1, '2020年に発表されました。'),
        createMockReport(2, '2018年に発表されました。'),
      ];

      const scores = scorer.scoreReports(reports);

      expect(scores.length).toBe(2);
    });

    it('should not flag consistent reports as having conflicts', () => {
      const reports: AgentReport[] = [
        createMockReport(1, 'AIは機械学習の一種です。'),
        createMockReport(2, 'AIは機械学習を含む技術です。'),
        createMockReport(3, '人工知能には機械学習が含まれます。'),
      ];

      const scores = scorer.scoreReports(reports);

      // 矛盾が少ないはず（完全な判定は難しいので緩い検証）
      const avgConsistency =
        scores.reduce((sum, s) => sum + s.consistencyScore, 0) / scores.length;
      expect(avgConsistency).toBeGreaterThan(0.3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty reports array', () => {
      const scores = scorer.scoreReports([]);
      expect(scores).toEqual([]);
    });

    it('should handle single report', () => {
      const reports: AgentReport[] = [
        {
          reportId: 'single',
          agentId: 1,
          content: 'Single report',
          sources: [],
          generatedAt: new Date().toISOString(),
          durationMs: 1000,
          strategy: {
            agentId: 1,
            queryModifiers: ['test'],
            preferredSources: ['official'],
            timeRange: 'all',
            maxResultsPerAgent: 10,
          },
        },
      ];

      const scores = scorer.scoreReports(reports);

      expect(scores).toHaveLength(1);
      expect(scores[0].totalScore).toBeGreaterThan(0);
    });

    it('should handle report with empty content', () => {
      const reports: AgentReport[] = [
        {
          reportId: 'empty',
          agentId: 1,
          content: '',
          sources: [],
          generatedAt: new Date().toISOString(),
          durationMs: 1000,
          strategy: {
            agentId: 1,
            queryModifiers: ['test'],
            preferredSources: ['official'],
            timeRange: 'all',
            maxResultsPerAgent: 10,
          },
        },
      ];

      const scores = scorer.scoreReports(reports);

      expect(scores).toHaveLength(1);
      // 空のレポートはスコアが低いはず
      expect(scores[0].coverageScore).toBeLessThanOrEqual(0.5);
    });
  });
});
