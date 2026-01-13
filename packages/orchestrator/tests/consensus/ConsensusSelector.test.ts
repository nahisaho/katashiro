/**
 * ConsensusSelector Tests
 * @fileoverview REQ-1.2.0-WFL-003: コンセンサス選択ロジックのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusSelector } from '../../src/consensus/ConsensusSelector';
import { ReportScore, ConflictDetail } from '../../src/consensus/types';

describe('ConsensusSelector', () => {
  let selector: ConsensusSelector;

  beforeEach(() => {
    selector = new ConsensusSelector();
  });

  describe('select', () => {
    const createMockScore = (
      reportId: string,
      totalScore: number,
      consistencyScore: number = 0.8,
      reliabilityScore: number = 0.7,
      coverageScore: number = 0.6,
      conflicts: ConflictDetail[] = []
    ): ReportScore => ({
      reportId,
      totalScore,
      consistencyScore,
      reliabilityScore,
      coverageScore,
      conflicts,
      unverifiedCount: 0,
      sourceUrls: ['https://example.com'],
    });

    it('should select the report with highest total score', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.7),
        createMockScore('report-2', 0.9), // highest
        createMockScore('report-3', 0.8),
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-2');
    });

    it('should include selection reason', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.7),
        createMockScore('report-2', 0.9),
      ];

      const result = selector.select(scores);

      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should handle tie-breaker using consistency score', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.8, 0.7), // lower consistency
        createMockScore('report-2', 0.8, 0.9), // higher consistency
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-2');
    });

    it('should handle empty scores array', () => {
      expect(() => selector.select([])).toThrow();
    });

    it('should handle single score', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.7),
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-1');
    });

    it('should select clear winner when scores differ significantly', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.5),
        createMockScore('report-2', 0.9), // clear winner
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-2');
      expect(result.reason).toContain('total score');
    });
  });

  describe('selection with various score combinations', () => {
    const createMockScore = (
      reportId: string,
      totalScore: number,
      consistencyScore: number = 0.8
    ): ReportScore => ({
      reportId,
      totalScore,
      consistencyScore,
      reliabilityScore: 0.7,
      coverageScore: 0.6,
      conflicts: [],
      unverifiedCount: 0,
      sourceUrls: [],
    });

    it('should correctly order reports by score', () => {
      const scores: ReportScore[] = [
        createMockScore('report-3', 0.5),
        createMockScore('report-1', 0.9), // best
        createMockScore('report-2', 0.7),
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-1');
    });

    it('should handle very close scores', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.801, 0.6),
        createMockScore('report-2', 0.800, 0.8), // same score but higher consistency
        createMockScore('report-3', 0.799, 0.7),
      ];

      const result = selector.select(scores);

      // 0.01以内の差ならタイブレーカー発動
      expect(result.selectedReportId).toBeDefined();
    });
  });

  describe('conflict consideration', () => {
    const createMockScore = (
      reportId: string,
      totalScore: number,
      conflictCount: number = 0
    ): ReportScore => ({
      reportId,
      totalScore,
      consistencyScore: 0.8,
      reliabilityScore: 0.7,
      coverageScore: 0.6,
      conflicts: Array.from({ length: conflictCount }, (_, i) => ({
        type: 'contradiction' as const,
        statement1: { reportId, text: 'Statement 1', source: 'Source 1' },
        statement2: { reportId: 'other', text: 'Statement 2', source: 'Source 2' },
        confidence: 0.8,
        description: `Conflict ${i}`,
      })),
      unverifiedCount: 0,
      sourceUrls: [],
    });

    it('should include conflict count in selection reason', () => {
      const scores: ReportScore[] = [
        createMockScore('report-1', 0.8, 5), // many conflicts
        createMockScore('report-2', 0.9, 0), // no conflicts, higher score
      ];

      const result = selector.select(scores);

      expect(result.selectedReportId).toBe('report-2');
      expect(result.reason).toContain('Conflicts');
    });
  });
});
