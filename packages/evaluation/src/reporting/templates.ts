/**
 * Markdown Templates for Evaluation Reports
 *
 * レポートテンプレートのカスタマイズ用モジュール
 *
 * @requirement REQ-EVAL-103
 */

import type { EvaluationResult } from '../types.js';
import type { SummaryStatistics } from './EvaluationReporter.js';

/**
 * テンプレート関数型
 */
export type TemplateFunction<T> = (data: T, language: 'en' | 'ja') => string;

/**
 * ヘッダーテンプレートデータ
 */
export interface HeaderTemplateData {
  title: string;
  description?: string;
  datasetName?: string;
}

/**
 * サマリーテンプレートデータ
 */
export interface SummaryTemplateData {
  stats: SummaryStatistics;
  passThreshold: number;
}

/**
 * 結果行テンプレートデータ
 */
export interface ResultRowTemplateData {
  index: number;
  result: EvaluationResult;
  passed: boolean;
}

/**
 * テンプレートコレクション
 */
export interface TemplateCollection {
  header: TemplateFunction<HeaderTemplateData>;
  summary: TemplateFunction<SummaryTemplateData>;
  resultRow: TemplateFunction<ResultRowTemplateData>;
  footer: TemplateFunction<{ timestamp: string; durationMs?: number }>;
}

/**
 * デフォルトヘッダーテンプレート
 */
export const defaultHeaderTemplate: TemplateFunction<HeaderTemplateData> = (
  data,
  language,
) => {
  const lines: string[] = [`# ${data.title}`];

  if (data.description) {
    lines.push('', data.description);
  }

  if (data.datasetName) {
    lines.push(
      '',
      language === 'ja'
        ? `**データセット**: ${data.datasetName}`
        : `**Dataset**: ${data.datasetName}`,
    );
  }

  return lines.join('\n');
};

/**
 * デフォルトサマリーテンプレート
 */
export const defaultSummaryTemplate: TemplateFunction<SummaryTemplateData> = (
  data,
  language,
) => {
  const { stats } = data;
  const isJa = language === 'ja';
  const lines: string[] = [];

  lines.push(isJa ? '## 📊 サマリー' : '## 📊 Summary');
  lines.push('');

  // プログレスバー生成
  const progressBar = generateProgressBar(stats.passRate);
  lines.push(`${progressBar} ${(stats.passRate * 100).toFixed(1)}%`);
  lines.push('');

  lines.push(isJa ? '| 指標 | 値 |' : '| Metric | Value |');
  lines.push('|------|-----|');
  lines.push(
    isJa ? `| 総件数 | ${stats.total} |` : `| Total | ${stats.total} |`,
  );
  lines.push(
    isJa
      ? `| 合格 / 不合格 | ${stats.passed} / ${stats.failed} |`
      : `| Passed / Failed | ${stats.passed} / ${stats.failed} |`,
  );
  lines.push(
    isJa
      ? `| 平均スコア | ${stats.avgScore.toFixed(3)} |`
      : `| Avg Score | ${stats.avgScore.toFixed(3)} |`,
  );

  return lines.join('\n');
};

/**
 * デフォルト結果行テンプレート
 */
export const defaultResultRowTemplate: TemplateFunction<ResultRowTemplateData> = (
  data,
) => {
  const { index, result, passed } = data;
  const statusIcon = passed ? '✅' : '❌';
  return `| ${index} | ${result.evaluator} | ${result.score.toFixed(3)} | ${result.normalizedScore.toFixed(3)} | ${statusIcon} |`;
};

/**
 * デフォルトフッターテンプレート
 */
export const defaultFooterTemplate: TemplateFunction<{
  timestamp: string;
  durationMs?: number;
}> = (data, language) => {
  const isJa = language === 'ja';
  const lines = ['---', ''];

  lines.push(
    isJa
      ? `_生成日時: ${data.timestamp}_`
      : `_Generated at: ${data.timestamp}_`,
  );

  if (data.durationMs !== undefined) {
    lines.push(
      isJa
        ? `_実行時間: ${data.durationMs}ms_`
        : `_Duration: ${data.durationMs}ms_`,
    );
  }

  lines.push('', '_Powered by KATASHIRO Evaluation Framework_');

  return lines.join('\n');
};

/**
 * デフォルトテンプレートコレクション
 */
export const defaultTemplates: TemplateCollection = {
  header: defaultHeaderTemplate,
  summary: defaultSummaryTemplate,
  resultRow: defaultResultRowTemplate,
  footer: defaultFooterTemplate,
};

/**
 * プログレスバー生成
 */
export function generateProgressBar(ratio: number, width = 20): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * スコアバッジ生成
 */
export function generateScoreBadge(
  score: number,
  thresholds = { good: 0.8, fair: 0.5 },
): string {
  if (score >= thresholds.good) {
    return `![Score](https://img.shields.io/badge/score-${(score * 100).toFixed(0)}%25-brightgreen)`;
  } else if (score >= thresholds.fair) {
    return `![Score](https://img.shields.io/badge/score-${(score * 100).toFixed(0)}%25-yellow)`;
  } else {
    return `![Score](https://img.shields.io/badge/score-${(score * 100).toFixed(0)}%25-red)`;
  }
}

/**
 * 比較テーブル生成
 */
export function generateComparisonTable(
  baseline: SummaryStatistics,
  current: SummaryStatistics,
  language: 'en' | 'ja' = 'en',
): string {
  const isJa = language === 'ja';
  const lines: string[] = [];

  lines.push(isJa ? '## 📈 比較' : '## 📈 Comparison');
  lines.push('');

  lines.push(
    isJa
      ? '| 指標 | ベースライン | 今回 | 差分 |'
      : '| Metric | Baseline | Current | Diff |',
  );
  lines.push('|------|------------|-------|------|');

  const formatDiff = (diff: number) => {
    if (diff > 0) return `+${diff.toFixed(3)} 📈`;
    if (diff < 0) return `${diff.toFixed(3)} 📉`;
    return '0.000 ➡️';
  };

  lines.push(
    `| ${isJa ? '合格率' : 'Pass Rate'} | ${(baseline.passRate * 100).toFixed(1)}% | ${(current.passRate * 100).toFixed(1)}% | ${formatDiff((current.passRate - baseline.passRate) * 100)}% |`,
  );
  lines.push(
    `| ${isJa ? '平均スコア' : 'Avg Score'} | ${baseline.avgScore.toFixed(3)} | ${current.avgScore.toFixed(3)} | ${formatDiff(current.avgScore - baseline.avgScore)} |`,
  );

  return lines.join('\n');
}

/**
 * ヒートマップ生成（テキストベース）
 */
export function generateScoreHeatmap(
  results: EvaluationResult[],
  buckets = 10,
): string {
  const lines: string[] = [];

  // スコア分布を計算
  const distribution = new Array(buckets).fill(0);
  for (const result of results) {
    const bucket = Math.min(
      Math.floor(result.normalizedScore * buckets),
      buckets - 1,
    );
    distribution[bucket]++;
  }

  const max = Math.max(...distribution);

  lines.push('```');
  lines.push('Score Distribution:');
  lines.push('');

  for (let i = buckets - 1; i >= 0; i--) {
    const label = `${((i / buckets) * 100).toFixed(0).padStart(3)}%-${(((i + 1) / buckets) * 100).toFixed(0).padStart(3)}%`;
    const bar = '█'.repeat(Math.round((distribution[i] / max) * 20));
    const count = distribution[i];
    lines.push(`${label} | ${bar} (${count})`);
  }

  lines.push('```');

  return lines.join('\n');
}
