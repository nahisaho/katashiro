/**
 * EvaluationReporter Tests
 *
 * @requirement REQ-EVAL-103
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EvaluationReporter,
  generateEvaluationReport,
  DEFAULT_REPORT_CONFIG,
} from '../src/reporting/EvaluationReporter.js';
import type { EvaluationResult } from '../src/types.js';

describe('EvaluationReporter', () => {
  let reporter: EvaluationReporter;
  let sampleResults: EvaluationResult[];

  beforeEach(() => {
    reporter = new EvaluationReporter();
    sampleResults = [
      {
        evaluator: 'LengthEvaluator',
        score: 0.85,
        normalizedScore: 0.85,
        passed: true,
        reasoning: 'Good length',
      },
      {
        evaluator: 'KeywordEvaluator',
        score: 0.6,
        normalizedScore: 0.6,
        passed: false,
        reasoning: 'Missing keywords',
      },
      {
        evaluator: 'SimilarityEvaluator',
        score: 0.92,
        normalizedScore: 0.92,
        passed: true,
        reasoning: 'High similarity',
        metadata: {
          model: 'test-model',
          tokens: { prompt: 100, completion: 50, total: 150 },
        },
      },
    ];
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const r = new EvaluationReporter();
      const config = r.getConfig();
      expect(config.title).toBe(DEFAULT_REPORT_CONFIG.title);
      expect(config.passThreshold).toBe(0.7);
    });

    it('should merge custom config', () => {
      const r = new EvaluationReporter({
        title: 'Custom Report',
        passThreshold: 0.8,
      });
      const config = r.getConfig();
      expect(config.title).toBe('Custom Report');
      expect(config.passThreshold).toBe(0.8);
      expect(config.includeDetails).toBe(true);
    });
  });

  describe('generate', () => {
    it('should generate markdown report', () => {
      const report = reporter.generate({ results: sampleResults });

      expect(report).toContain('# Evaluation Report');
      expect(report).toContain('## 📊 Summary');
      expect(report).toContain('## 📋 Results');
      expect(report).toContain('LengthEvaluator');
      expect(report).toContain('KeywordEvaluator');
      expect(report).toContain('SimilarityEvaluator');
    });

    it('should include dataset name', () => {
      const report = reporter.generate({
        results: sampleResults,
        datasetName: 'test-dataset',
      });

      expect(report).toContain('**Dataset**: test-dataset');
    });

    it('should include timestamp', () => {
      const report = reporter.generate({
        results: sampleResults,
        executedAt: '2025-01-01T00:00:00Z',
      });

      expect(report).toContain('2025-01-01T00:00:00Z');
    });

    it('should include duration', () => {
      const report = reporter.generate({
        results: sampleResults,
        durationMs: 1234,
      });

      expect(report).toContain('1234ms');
    });

    it('should include additional sections', () => {
      const report = reporter.generate({
        results: sampleResults,
        additionalSections: [
          { title: 'Custom Section', content: 'Custom content here' },
        ],
      });

      expect(report).toContain('## Custom Section');
      expect(report).toContain('Custom content here');
    });
  });

  describe('generate with Japanese', () => {
    it('should generate Japanese report', () => {
      const jaReporter = new EvaluationReporter({ language: 'ja' });
      const report = jaReporter.generate({ results: sampleResults });

      expect(report).toContain('## 📊 サマリー');
      expect(report).toContain('## 📋 評価結果');
      expect(report).toContain('総件数');
      expect(report).toContain('平均スコア');
    });

    it('should use Japanese labels for dataset', () => {
      const jaReporter = new EvaluationReporter({ language: 'ja' });
      const report = jaReporter.generate({
        results: sampleResults,
        datasetName: 'テストデータ',
      });

      expect(report).toContain('**データセット**: テストデータ');
    });
  });

  describe('generate without details', () => {
    it('should exclude details when disabled', () => {
      const r = new EvaluationReporter({ includeDetails: false });
      const report = r.generate({ results: sampleResults });

      expect(report).not.toContain('## 📝 Details');
      expect(report).not.toContain('**Reasoning**');
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = reporter.calculateStatistics(sampleResults);

      expect(stats.total).toBe(3);
      expect(stats.passed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.passRate).toBeCloseTo(2 / 3, 5);
      expect(stats.avgScore).toBeCloseTo((0.85 + 0.6 + 0.92) / 3, 5);
      expect(stats.minScore).toBe(0.6);
      expect(stats.maxScore).toBe(0.92);
    });

    it('should handle empty results', () => {
      const stats = reporter.calculateStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.passRate).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    it('should group by evaluator', () => {
      const results: EvaluationResult[] = [
        { evaluator: 'A', score: 0.8, normalizedScore: 0.8 },
        { evaluator: 'A', score: 0.9, normalizedScore: 0.9 },
        { evaluator: 'B', score: 0.7, normalizedScore: 0.7 },
      ];

      const stats = reporter.calculateStatistics(results);

      expect(stats.byEvaluator.size).toBe(2);
      expect(stats.byEvaluator.get('A')?.count).toBe(2);
      expect(stats.byEvaluator.get('A')?.avg).toBeCloseTo(0.85, 5);
      expect(stats.byEvaluator.get('B')?.count).toBe(1);
    });
  });

  describe('updateConfig', () => {
    it('should update config', () => {
      reporter.updateConfig({ title: 'Updated Title' });
      expect(reporter.getConfig().title).toBe('Updated Title');
    });

    it('should preserve other config values', () => {
      reporter.updateConfig({ title: 'New Title' });
      expect(reporter.getConfig().passThreshold).toBe(0.7);
    });
  });

  describe('result table', () => {
    it('should show pass/fail icons', () => {
      const report = reporter.generate({ results: sampleResults });

      expect(report).toContain('✅');
      expect(report).toContain('❌');
    });

    it('should handle empty results', () => {
      const report = reporter.generate({ results: [] });

      expect(report).toContain('_No results_');
    });
  });

  describe('metadata formatting', () => {
    it('should format metadata in collapsible section', () => {
      const report = reporter.generate({ results: sampleResults });

      expect(report).toContain('<details>');
      expect(report).toContain('<summary>Metadata</summary>');
      expect(report).toContain('```json');
    });
  });
});

describe('generateEvaluationReport helper', () => {
  it('should generate report with default config', () => {
    const results: EvaluationResult[] = [
      { evaluator: 'Test', score: 0.8, normalizedScore: 0.8 },
    ];

    const report = generateEvaluationReport(results);

    expect(report).toContain('# Evaluation Report');
    expect(report).toContain('Test');
  });

  it('should accept custom config', () => {
    const results: EvaluationResult[] = [
      { evaluator: 'Test', score: 0.8, normalizedScore: 0.8 },
    ];

    const report = generateEvaluationReport(results, { title: 'Custom' });

    expect(report).toContain('# Custom');
  });
});
