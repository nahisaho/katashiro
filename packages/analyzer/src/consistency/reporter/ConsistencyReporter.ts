/**
 * ConsistencyReporter - 整合性レポート生成
 * @module consistency/reporter/ConsistencyReporter
 * @see DES-KATASHIRO-004-DCC Section 5.4
 */

import type {
  ConsistencyIssue,
  ConsistencyCheckResult,
  ReporterConfig,
  IssueSeverity,
} from '../types.js';

/**
 * 重大度ラベル
 */
const SEVERITY_LABELS: Record<IssueSeverity, { ja: string; en: string; emoji: string }> = {
  error: { ja: 'エラー', en: 'Error', emoji: '❌' },
  warning: { ja: '警告', en: 'Warning', emoji: '⚠️' },
  info: { ja: '情報', en: 'Info', emoji: 'ℹ️' },
};

/**
 * 整合性レポート生成クラス
 */
export class ConsistencyReporter {
  private readonly config: ReporterConfig;

  constructor(config?: Partial<ReporterConfig>) {
    this.config = {
      format: config?.format ?? 'markdown',
      verbosity: config?.verbosity ?? 'normal',
      groupBy: config?.groupBy ?? 'severity',
      maxIssues: config?.maxIssues,
      locale: config?.locale ?? 'ja',
    };
  }

  /**
   * レポートを生成
   */
  generate(result: ConsistencyCheckResult): string {
    switch (this.config.format) {
      case 'markdown':
        return this.generateMarkdown(result);
      case 'json':
        return this.generateJson(result);
      case 'html':
        return this.generateHtml(result);
      case 'text':
      default:
        return this.generateText(result);
    }
  }

  /**
   * Markdownレポートを生成
   */
  private generateMarkdown(result: ConsistencyCheckResult): string {
    const lines: string[] = [];
    const isJa = this.config.locale === 'ja';

    // ヘッダー
    lines.push(isJa ? '# 文書整合性チェックレポート' : '# Document Consistency Check Report');
    lines.push('');

    // サマリー
    lines.push(isJa ? '## サマリー' : '## Summary');
    lines.push('');
    lines.push(`| ${isJa ? '項目' : 'Item'} | ${isJa ? '値' : 'Value'} |`);
    lines.push('| --- | --- |');
    lines.push(`| ${isJa ? '結果' : 'Result'} | ${result.isValid ? '✅ ' + (isJa ? '合格' : 'Pass') : '❌ ' + (isJa ? '不合格' : 'Fail')} |`);
    lines.push(`| ${isJa ? 'スコア' : 'Score'} | ${result.score}/100 |`);
    lines.push(`| ${isJa ? 'エラー' : 'Errors'} | ${result.statistics.errorCount} |`);
    lines.push(`| ${isJa ? '警告' : 'Warnings'} | ${result.statistics.warningCount} |`);
    lines.push(`| ${isJa ? '情報' : 'Info'} | ${result.statistics.infoCount} |`);
    lines.push(`| ${isJa ? '実行時間' : 'Execution Time'} | ${result.executionTimeMs}ms |`);
    lines.push('');

    // 問題一覧
    if (result.issues.length > 0) {
      lines.push(isJa ? '## 検出された問題' : '## Issues Found');
      lines.push('');

      const groupedIssues = this.groupIssues(result.issues);
      for (const [group, issues] of groupedIssues) {
        lines.push(`### ${group}`);
        lines.push('');

        const limitedIssues = this.config.maxIssues
          ? issues.slice(0, this.config.maxIssues)
          : issues;

        for (const issue of limitedIssues) {
          const severityInfo = SEVERITY_LABELS[issue.severity];
          const severityLabel = isJa ? severityInfo.ja : severityInfo.en;
          lines.push(`- ${severityInfo.emoji} **[${severityLabel}]** ${issue.message}`);

          if (this.config.verbosity !== 'minimal') {
            for (const loc of issue.locations) {
              lines.push(`  - ${loc.file}:${loc.line}${loc.column !== undefined ? ':' + loc.column : ''}`);
            }
          }

          if (issue.suggestion && this.config.verbosity === 'detailed') {
            lines.push(`  - ${isJa ? '提案' : 'Suggestion'}: ${issue.suggestion}`);
          }
        }

        if (this.config.maxIssues && issues.length > this.config.maxIssues) {
          lines.push(`  - ... ${isJa ? '他' : 'and'} ${issues.length - this.config.maxIssues} ${isJa ? '件' : 'more'}`);
        }

        lines.push('');
      }
    }

    // 統計情報
    if (this.config.verbosity === 'detailed') {
      lines.push(isJa ? '## 統計情報' : '## Statistics');
      lines.push('');
      lines.push(`| ${isJa ? '項目' : 'Item'} | ${isJa ? '値' : 'Value'} |`);
      lines.push('| --- | --- |');
      lines.push(`| ${isJa ? 'チェック文書数' : 'Documents Checked'} | ${result.statistics.documentsChecked} |`);
      lines.push(`| ${isJa ? '数値' : 'Numerics'} | ${result.statistics.numericsFound} |`);
      lines.push(`| ${isJa ? '日付' : 'Dates'} | ${result.statistics.datesFound} |`);
      lines.push(`| ${isJa ? '用語' : 'Terms'} | ${result.statistics.termsFound} |`);
      lines.push(`| ${isJa ? '参照' : 'References'} | ${result.statistics.referencesFound} |`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * プレーンテキストレポートを生成
   */
  private generateText(result: ConsistencyCheckResult): string {
    const lines: string[] = [];
    const isJa = this.config.locale === 'ja';

    lines.push(isJa ? '=== 文書整合性チェックレポート ===' : '=== Document Consistency Check Report ===');
    lines.push('');
    lines.push(`${isJa ? '結果' : 'Result'}: ${result.isValid ? (isJa ? '合格' : 'Pass') : (isJa ? '不合格' : 'Fail')}`);
    lines.push(`${isJa ? 'スコア' : 'Score'}: ${result.score}/100`);
    lines.push(`${isJa ? 'エラー' : 'Errors'}: ${result.statistics.errorCount}`);
    lines.push(`${isJa ? '警告' : 'Warnings'}: ${result.statistics.warningCount}`);
    lines.push(`${isJa ? '情報' : 'Info'}: ${result.statistics.infoCount}`);
    lines.push('');

    if (result.issues.length > 0) {
      lines.push(isJa ? '--- 問題一覧 ---' : '--- Issues ---');
      lines.push('');

      for (const issue of result.issues) {
        const severityInfo = SEVERITY_LABELS[issue.severity];
        const severityLabel = isJa ? severityInfo.ja : severityInfo.en;
        lines.push(`[${severityLabel}] ${issue.message}`);

        for (const loc of issue.locations) {
          lines.push(`  @ ${loc.file}:${loc.line}`);
        }

        if (issue.suggestion) {
          lines.push(`  -> ${issue.suggestion}`);
        }

        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * JSONレポートを生成
   */
  private generateJson(result: ConsistencyCheckResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * HTMLレポートを生成
   */
  private generateHtml(result: ConsistencyCheckResult): string {
    const isJa = this.config.locale === 'ja';
    const title = isJa ? '文書整合性チェックレポート' : 'Document Consistency Check Report';

    const lines: string[] = [];
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="' + (isJa ? 'ja' : 'en') + '">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push(`  <title>${title}</title>`);
    lines.push('  <style>');
    lines.push('    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }');
    lines.push('    .pass { color: green; }');
    lines.push('    .fail { color: red; }');
    lines.push('    .error { background-color: #fee; border-left: 4px solid red; padding: 10px; margin: 10px 0; }');
    lines.push('    .warning { background-color: #ffeeba; border-left: 4px solid orange; padding: 10px; margin: 10px 0; }');
    lines.push('    .info { background-color: #e7f3ff; border-left: 4px solid blue; padding: 10px; margin: 10px 0; }');
    lines.push('    table { border-collapse: collapse; width: 100%; }');
    lines.push('    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    lines.push('    th { background-color: #f4f4f4; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`  <h1>${title}</h1>`);
    lines.push('  <h2>' + (isJa ? 'サマリー' : 'Summary') + '</h2>');
    lines.push('  <table>');
    lines.push(`    <tr><th>${isJa ? '結果' : 'Result'}</th><td class="${result.isValid ? 'pass' : 'fail'}">${result.isValid ? (isJa ? '合格' : 'Pass') : (isJa ? '不合格' : 'Fail')}</td></tr>`);
    lines.push(`    <tr><th>${isJa ? 'スコア' : 'Score'}</th><td>${result.score}/100</td></tr>`);
    lines.push(`    <tr><th>${isJa ? 'エラー' : 'Errors'}</th><td>${result.statistics.errorCount}</td></tr>`);
    lines.push(`    <tr><th>${isJa ? '警告' : 'Warnings'}</th><td>${result.statistics.warningCount}</td></tr>`);
    lines.push(`    <tr><th>${isJa ? '情報' : 'Info'}</th><td>${result.statistics.infoCount}</td></tr>`);
    lines.push('  </table>');

    if (result.issues.length > 0) {
      lines.push('  <h2>' + (isJa ? '問題一覧' : 'Issues') + '</h2>');
      for (const issue of result.issues) {
        lines.push(`  <div class="${issue.severity}">`);
        lines.push(`    <strong>${issue.message}</strong>`);
        lines.push('    <ul>');
        for (const loc of issue.locations) {
          lines.push(`      <li>${loc.file}:${loc.line}</li>`);
        }
        lines.push('    </ul>');
        if (issue.suggestion) {
          lines.push(`    <p><em>${isJa ? '提案' : 'Suggestion'}: ${issue.suggestion}</em></p>`);
        }
        lines.push('  </div>');
      }
    }

    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * 問題をグループ化
   */
  private groupIssues(issues: ConsistencyIssue[]): Map<string, ConsistencyIssue[]> {
    const groups = new Map<string, ConsistencyIssue[]>();
    const isJa = this.config.locale === 'ja';

    for (const issue of issues) {
      let groupKey: string;

      switch (this.config.groupBy) {
        case 'severity':
          groupKey = SEVERITY_LABELS[issue.severity][isJa ? 'ja' : 'en'];
          break;
        case 'type':
          groupKey = this.getTypeLabel(issue.type, isJa);
          break;
        case 'file':
          groupKey = issue.locations[0]?.file ?? (isJa ? '不明' : 'Unknown');
          break;
        default:
          groupKey = 'default';
      }

      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(issue);
      } else {
        groups.set(groupKey, [issue]);
      }
    }

    return groups;
  }

  /**
   * 問題タイプのラベルを取得
   */
  private getTypeLabel(type: string, isJa: boolean): string {
    const labels: Record<string, { ja: string; en: string }> = {
      numeric_inconsistency: { ja: '数値の不整合', en: 'Numeric Inconsistency' },
      date_inconsistency: { ja: '日付の不整合', en: 'Date Inconsistency' },
      term_inconsistency: { ja: '用語の不整合', en: 'Term Inconsistency' },
      broken_reference: { ja: '壊れた参照', en: 'Broken Reference' },
    };

    const label = labels[type];
    if (label) {
      return isJa ? label.ja : label.en;
    }
    return type;
  }

  /**
   * 構造化されたレポートを生成（テスト互換）
   */
  generateReport(result: ConsistencyCheckResult): {
    markdown: string;
    summary: {
      totalIssues: number;
      errorCount: number;
      warningCount: number;
      infoCount: number;
    };
  } {
    const markdown = this.generate(result);
    return {
      markdown,
      summary: {
        totalIssues: result.issues.length,
        errorCount: result.statistics.errorCount,
        warningCount: result.statistics.warningCount,
        infoCount: result.statistics.infoCount,
      },
    };
  }
}
