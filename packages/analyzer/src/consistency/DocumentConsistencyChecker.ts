/**
 * DocumentConsistencyChecker - 文書整合性チェッカー
 * @module consistency/DocumentConsistencyChecker
 * @see DES-KATASHIRO-004-DCC
 */

import type {
  Document,
  CheckerConfig,
  ConsistencyCheckResult,
  ConsistencyIssue,
  CheckStatistics,
  ExtractedNumeric,
  ExtractedDate,
  ExtractedTerm,
  ExtractedReference,
} from './types.js';

import { DocumentLoader } from './loader/index.js';
import { NumericExtractor } from './extractors/NumericExtractor.js';
import { DateExtractor } from './extractors/DateExtractor.js';
import { TermExtractor } from './extractors/TermExtractor.js';
import { ReferenceExtractor } from './extractors/ReferenceExtractor.js';
import { NumericValidator } from './validators/NumericValidator.js';
import { DateValidator } from './validators/DateValidator.js';
import { TermValidator } from './validators/TermValidator.js';
import { ReferenceValidator } from './validators/ReferenceValidator.js';
import { ConsistencyReporter } from './reporter/index.js';

/**
 * 文書整合性チェッカー
 *
 * 複数文書間の数値、日付、用語、参照の一貫性を検証します。
 */
export class DocumentConsistencyChecker {
  private readonly config: CheckerConfig;
  private readonly loader: DocumentLoader;
  private readonly numericExtractor: NumericExtractor;
  private readonly dateExtractor: DateExtractor;
  private readonly termExtractor: TermExtractor;
  private readonly referenceExtractor: ReferenceExtractor;
  private readonly numericValidator: NumericValidator;
  private readonly dateValidator: DateValidator;
  private readonly termValidator: TermValidator;
  private readonly referenceValidator: ReferenceValidator;
  private readonly reporter: ConsistencyReporter;

  constructor(config?: Partial<CheckerConfig>) {
    this.config = {
      numericFormats: config?.numericFormats ?? ['integer', 'decimal', 'percentage', 'currency'],
      dateFormats: config?.dateFormats ?? ['iso8601', 'japanese', 'relative'],
      language: config?.language ?? 'ja',
      severityThreshold: config?.severityThreshold ?? 'info',
      customRules: config?.customRules,
      ignorePatterns: config?.ignorePatterns,
    };

    // コンポーネント初期化
    this.loader = new DocumentLoader();
    this.numericExtractor = new NumericExtractor({
      formats: this.config.numericFormats,
      ignorePatterns: this.config.ignorePatterns,
    });
    this.dateExtractor = new DateExtractor({
      formats: this.config.dateFormats,
      language: this.config.language,
      ignorePatterns: this.config.ignorePatterns,
    });
    this.termExtractor = new TermExtractor({
      caseSensitive: false,
      minLength: 2,
    });
    this.referenceExtractor = new ReferenceExtractor({
      detectExternalUrls: true,
      detectAnchors: true,
    });

    this.numericValidator = new NumericValidator({
      tolerancePercent: 0.01,
      requireLabelMatch: true,
    });
    this.dateValidator = new DateValidator({
      toleranceDays: 0,
      allowFutureDates: true,
      maxPastYears: 100,
    });
    this.termValidator = new TermValidator({
      caseSensitive: false,
      editDistanceThreshold: 2,
    });
    this.referenceValidator = new ReferenceValidator({
      checkExternalUrls: false,
      urlCheckTimeout: 5000,
    });

    this.reporter = new ConsistencyReporter({
      format: 'markdown',
      verbosity: 'normal',
      groupBy: 'severity',
      locale: this.config.language,
    });
  }

  /**
   * ファイルパス配列から整合性をチェック
   */
  async checkFiles(filePaths: string[]): Promise<ConsistencyCheckResult> {
    const documents = await this.loader.loadFiles(filePaths);
    return this.check(documents);
  }

  /**
   * ディレクトリから整合性をチェック
   */
  async checkDirectory(
    dirPath: string,
    pattern: string = '**/*.md',
  ): Promise<ConsistencyCheckResult> {
    const documents = await this.loader.loadDirectory(dirPath, pattern);
    return this.check(documents);
  }

  /**
   * 文書配列から整合性をチェック
   */
  async check(documents: Document[]): Promise<ConsistencyCheckResult> {
    const startTime = Date.now();

    // 抽出
    const allNumerics: ExtractedNumeric[] = [];
    const allDates: ExtractedDate[] = [];
    const allTerms: ExtractedTerm[] = [];
    const allReferences: ExtractedReference[] = [];

    for (const doc of documents) {
      allNumerics.push(...this.numericExtractor.extract(doc.content, doc.path));
      allDates.push(...this.dateExtractor.extract(doc.content, doc.path));
      allTerms.push(...this.termExtractor.extract(doc.content, doc.path));
      allReferences.push(...this.referenceExtractor.extract(doc.content, doc.path));
    }

    // 検証
    const issues: ConsistencyIssue[] = [];
    issues.push(...this.numericValidator.validate(allNumerics));
    issues.push(...this.dateValidator.validate(allDates));
    issues.push(...this.termValidator.validate(allTerms));
    issues.push(...(await this.referenceValidator.validate(allReferences, documents)));

    // カスタムルール適用
    if (this.config.customRules) {
      issues.push(...this.applyCustomRules(documents));
    }

    // 統計計算
    const statistics = this.calculateStatistics(
      documents,
      allNumerics,
      allDates,
      allTerms,
      allReferences,
      issues,
    );

    // スコア計算
    const score = this.calculateScore(issues, statistics);
    const isValid = issues.filter((i) => i.severity === 'error').length === 0;

    const executionTimeMs = Date.now() - startTime;

    return {
      isValid,
      score,
      issues,
      statistics,
      executionTimeMs,
    };
  }

  /**
   * レポートを生成
   */
  generateReport(result: ConsistencyCheckResult): string {
    return this.reporter.generate(result);
  }

  /**
   * カスタムルールを追加
   */
  addCustomRule(rule: NonNullable<CheckerConfig['customRules']>[number]): void {
    if (!this.config.customRules) {
      this.config.customRules = [];
    }
    this.config.customRules.push(rule);
  }

  /**
   * チェックとレポート生成を同時に実行
   */
  async checkAndReport(documents: Document[]): Promise<{
    result: ConsistencyCheckResult;
    report: string;
  }> {
    const result = await this.check(documents);
    const report = this.reporter.generate(result);
    return { result, report };
  }

  /**
   * カスタムルールを適用
   */
  private applyCustomRules(documents: Document[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const rule of this.config.customRules ?? []) {
      if (!rule.enabled) continue;

      const allMatches: RegExpMatchArray[] = [];
      for (const doc of documents) {
        const matches = [...doc.content.matchAll(rule.pattern)];
        allMatches.push(...matches);
      }

      if (allMatches.length > 0) {
        const ruleIssues = rule.validate(allMatches, documents);
        issues.push(...ruleIssues);
      }
    }

    return issues;
  }

  /**
   * 統計情報を計算
   */
  private calculateStatistics(
    documents: Document[],
    numerics: ExtractedNumeric[],
    dates: ExtractedDate[],
    terms: ExtractedTerm[],
    references: ExtractedReference[],
    issues: ConsistencyIssue[],
  ): CheckStatistics {
    return {
      documentsChecked: documents.length,
      numericsFound: numerics.length,
      datesFound: dates.length,
      termsFound: terms.length,
      referencesFound: references.length,
      errorCount: issues.filter((i) => i.severity === 'error').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
      infoCount: issues.filter((i) => i.severity === 'info').length,
    };
  }

  /**
   * スコアを計算
   */
  private calculateScore(_issues: ConsistencyIssue[], stats: CheckStatistics): number {
    const totalItems =
      stats.numericsFound + stats.datesFound + stats.termsFound + stats.referencesFound;

    if (totalItems === 0) return 100;

    // 重み付け: エラー=-10, 警告=-3, 情報=-1
    const penalty =
      stats.errorCount * 10 + stats.warningCount * 3 + stats.infoCount * 1;

    const score = Math.max(0, 100 - penalty);
    return Math.round(score);
  }
}
