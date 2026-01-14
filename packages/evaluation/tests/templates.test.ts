/**
 * Markdown Templates Tests
 *
 * @requirement REQ-EVAL-103
 */

import { describe, it, expect } from 'vitest';
import {
  generateProgressBar,
  generateScoreBadge,
  generateComparisonTable,
  generateScoreHeatmap,
  defaultHeaderTemplate,
  defaultSummaryTemplate,
  defaultResultRowTemplate,
  defaultFooterTemplate,
} from '../src/reporting/templates.js';
import type { SummaryStatistics } from '../src/reporting/EvaluationReporter.js';
import type { EvaluationResult } from '../src/types.js';

describe('generateProgressBar', () => {
  it('should generate full bar for 100%', () => {
    const bar = generateProgressBar(1.0, 10);
    expect(bar).toBe('[██████████]');
  });

  it('should generate empty bar for 0%', () => {
    const bar = generateProgressBar(0.0, 10);
    expect(bar).toBe('[░░░░░░░░░░]');
  });

  it('should generate half bar for 50%', () => {
    const bar = generateProgressBar(0.5, 10);
    expect(bar).toBe('[█████░░░░░]');
  });

  it('should use default width of 20', () => {
    const bar = generateProgressBar(0.5);
    expect(bar.length).toBe(22); // 20 chars + 2 brackets
  });
});

describe('generateScoreBadge', () => {
  it('should generate green badge for high score', () => {
    const badge = generateScoreBadge(0.9);
    expect(badge).toContain('brightgreen');
    expect(badge).toContain('90%');
  });

  it('should generate yellow badge for medium score', () => {
    const badge = generateScoreBadge(0.6);
    expect(badge).toContain('yellow');
    expect(badge).toContain('60%');
  });

  it('should generate red badge for low score', () => {
    const badge = generateScoreBadge(0.3);
    expect(badge).toContain('red');
    expect(badge).toContain('30%');
  });

  it('should accept custom thresholds', () => {
    const badge = generateScoreBadge(0.85, { good: 0.9, fair: 0.7 });
    expect(badge).toContain('yellow');
  });
});

describe('generateComparisonTable', () => {
  const baseline: SummaryStatistics = {
    total: 100,
    passed: 70,
    failed: 30,
    passRate: 0.7,
    avgScore: 0.72,
    minScore: 0.3,
    maxScore: 0.95,
    stdDev: 0.15,
    byEvaluator: new Map(),
  };

  const current: SummaryStatistics = {
    total: 100,
    passed: 85,
    failed: 15,
    passRate: 0.85,
    avgScore: 0.83,
    minScore: 0.4,
    maxScore: 0.98,
    stdDev: 0.12,
    byEvaluator: new Map(),
  };

  it('should generate comparison table', () => {
    const table = generateComparisonTable(baseline, current);

    expect(table).toContain('## 📈 Comparison');
    expect(table).toContain('Baseline');
    expect(table).toContain('Current');
    expect(table).toContain('Diff');
  });

  it('should show improvements', () => {
    const table = generateComparisonTable(baseline, current);

    expect(table).toContain('📈');
  });

  it('should generate Japanese table', () => {
    const table = generateComparisonTable(baseline, current, 'ja');

    expect(table).toContain('## 📈 比較');
    expect(table).toContain('ベースライン');
    expect(table).toContain('合格率');
  });
});

describe('generateScoreHeatmap', () => {
  it('should generate score distribution', () => {
    const results: EvaluationResult[] = [
      { evaluator: 'A', score: 0.1, normalizedScore: 0.1 },
      { evaluator: 'A', score: 0.5, normalizedScore: 0.5 },
      { evaluator: 'A', score: 0.9, normalizedScore: 0.9 },
    ];

    const heatmap = generateScoreHeatmap(results);

    expect(heatmap).toContain('Score Distribution');
    expect(heatmap).toContain('```');
    expect(heatmap).toContain('█');
  });

  it('should use custom bucket count', () => {
    const results: EvaluationResult[] = [
      { evaluator: 'A', score: 0.5, normalizedScore: 0.5 },
    ];

    const heatmap = generateScoreHeatmap(results, 5);

    // 5 buckets = 5 lines of data
    const lines = heatmap.split('\n').filter((l) => l.includes('%'));
    expect(lines.length).toBe(5);
  });
});

describe('defaultHeaderTemplate', () => {
  it('should generate header with title', () => {
    const header = defaultHeaderTemplate(
      { title: 'Test Report' },
      'en',
    );

    expect(header).toBe('# Test Report');
  });

  it('should include description', () => {
    const header = defaultHeaderTemplate(
      { title: 'Test', description: 'A test description' },
      'en',
    );

    expect(header).toContain('A test description');
  });

  it('should include dataset name in English', () => {
    const header = defaultHeaderTemplate(
      { title: 'Test', datasetName: 'my-dataset' },
      'en',
    );

    expect(header).toContain('**Dataset**: my-dataset');
  });

  it('should include dataset name in Japanese', () => {
    const header = defaultHeaderTemplate(
      { title: 'Test', datasetName: 'テストデータ' },
      'ja',
    );

    expect(header).toContain('**データセット**: テストデータ');
  });
});

describe('defaultSummaryTemplate', () => {
  const stats: SummaryStatistics = {
    total: 10,
    passed: 8,
    failed: 2,
    passRate: 0.8,
    avgScore: 0.82,
    minScore: 0.5,
    maxScore: 0.95,
    stdDev: 0.12,
    byEvaluator: new Map(),
  };

  it('should generate summary with progress bar', () => {
    const summary = defaultSummaryTemplate(
      { stats, passThreshold: 0.7 },
      'en',
    );

    expect(summary).toContain('## 📊 Summary');
    expect(summary).toContain('80.0%');
    expect(summary).toContain('[');
    expect(summary).toContain(']');
  });

  it('should include metrics table', () => {
    const summary = defaultSummaryTemplate(
      { stats, passThreshold: 0.7 },
      'en',
    );

    expect(summary).toContain('| Total | 10 |');
    expect(summary).toContain('8 / 2');
  });

  it('should generate Japanese summary', () => {
    const summary = defaultSummaryTemplate(
      { stats, passThreshold: 0.7 },
      'ja',
    );

    expect(summary).toContain('## 📊 サマリー');
    expect(summary).toContain('総件数');
    expect(summary).toContain('平均スコア');
  });
});

describe('defaultResultRowTemplate', () => {
  it('should format passed result', () => {
    const row = defaultResultRowTemplate(
      {
        index: 1,
        result: { evaluator: 'Test', score: 0.85, normalizedScore: 0.85 },
        passed: true,
      },
      'en',
    );

    expect(row).toContain('| 1 |');
    expect(row).toContain('Test');
    expect(row).toContain('0.850');
    expect(row).toContain('✅');
  });

  it('should format failed result', () => {
    const row = defaultResultRowTemplate(
      {
        index: 2,
        result: { evaluator: 'Test', score: 0.5, normalizedScore: 0.5 },
        passed: false,
      },
      'en',
    );

    expect(row).toContain('❌');
  });
});

describe('defaultFooterTemplate', () => {
  it('should include timestamp', () => {
    const footer = defaultFooterTemplate(
      { timestamp: '2025-01-01T12:00:00Z' },
      'en',
    );

    expect(footer).toContain('2025-01-01T12:00:00Z');
    expect(footer).toContain('Generated at');
  });

  it('should include duration when provided', () => {
    const footer = defaultFooterTemplate(
      { timestamp: '2025-01-01', durationMs: 500 },
      'en',
    );

    expect(footer).toContain('Duration: 500ms');
  });

  it('should include Japanese labels', () => {
    const footer = defaultFooterTemplate(
      { timestamp: '2025-01-01', durationMs: 100 },
      'ja',
    );

    expect(footer).toContain('生成日時');
    expect(footer).toContain('実行時間');
  });

  it('should include KATASHIRO branding', () => {
    const footer = defaultFooterTemplate(
      { timestamp: '2025-01-01' },
      'en',
    );

    expect(footer).toContain('KATASHIRO');
  });
});
