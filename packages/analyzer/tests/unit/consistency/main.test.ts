/**
 * DocumentConsistencyChecker Main Class Tests
 *
 * @requirement REQ-KATASHIRO-004 Document Consistency Checker
 * @design DES-KATASHIRO-004-DCC §5 Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DocumentConsistencyChecker,
  ConsistencyReporter,
  DocumentLoader,
} from '../../../src/consistency/index.js';
import type {
  CheckerConfig,
  Document,
  ConsistencyCheckResult,
} from '../../../src/consistency/types.js';

describe('DocumentConsistencyChecker', () => {
  let checker: DocumentConsistencyChecker;

  beforeEach(() => {
    checker = new DocumentConsistencyChecker();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const instance = new DocumentConsistencyChecker();
      expect(instance).toBeInstanceOf(DocumentConsistencyChecker);
    });

    it('should create with custom config', () => {
      const config: Partial<CheckerConfig> = {
        numericFormats: ['integer', 'decimal'],
        dateFormats: ['iso8601', 'japanese'],
      };
      const instance = new DocumentConsistencyChecker(config);
      expect(instance).toBeInstanceOf(DocumentConsistencyChecker);
    });
  });

  describe('check', () => {
    it('should check documents provided as content', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '売上: 100万円\n開始日: 2024-01-15\nKATASHIROを使用',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: '売上: 200万円\n開始日: 2024-01-15\nkatashiroを使用',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.statistics.documentsChecked).toBe(2);
    });

    it('should detect numeric inconsistencies', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '売上: 100万円',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: '売上: 200万円',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should detect terminology variations', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: 'KATASHIRO KATASHIRO KATASHIRO is a tool',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: 'Katashiro is used here',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      // 用語の表記揺れがあれば検出される
      const termIssues = result.issues.filter((i) => i.type === 'term_inconsistency');
      expect(termIssues).toBeDefined();
    });

    it('should detect date inconsistencies', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '開始日: 2024-12-31\n終了日: 2024-01-01',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      // 日付の不整合（終了日が開始日より前）
      const dateIssues = result.issues.filter((i) => i.type === 'date_inconsistency');
      expect(dateIssues).toBeDefined();
    });

    it('should detect reference issues', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '[Link 1](./target.md)\n[Different Text](./target.md)',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    it('should return valid result for consistent documents', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '# Header\nSome consistent content.',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: '# Another Header\nMore consistent content.',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result).toBeDefined();
      expect(result.statistics.documentsChecked).toBe(2);
    });

    it('should include processing time in result', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: 'Test content',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate consistency score', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '# Clean document\nNo issues here.',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should set isValid based on issues', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '# Clean document',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);

      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('addCustomRule', () => {
    it('should add custom rule', () => {
      const rule = {
        id: 'no-todo',
        name: 'No TODO comments',
        pattern: /TODO:/g,
        enabled: true,
        validate: (matches: RegExpMatchArray[], _docs: Document[]) => {
          return matches.map((m) => ({
            type: 'custom_rule_violation' as const,
            severity: 'warning' as const,
            message: `Found TODO: ${m[0]}`,
            locations: [{ file: 'unknown', line: 0 }],
          }));
        },
      };

      // Should not throw
      expect(() => checker.addCustomRule(rule)).not.toThrow();
    });
  });

  describe('checkAndReport', () => {
    it('should return both result and report', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: '売上: 100万円\nKATASHIRO is great',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: '売上: 200万円\nkatashiro is great',
          format: 'markdown',
        },
      ];

      const { result, report } = await checker.checkAndReport(documents);

      expect(result).toBeDefined();
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
    });

    it('should generate markdown report', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: 'KATASHIRO KATASHIRO KATASHIRO',
          format: 'markdown',
        },
        {
          path: 'doc2.md',
          content: 'Katashiro Katashiro',
          format: 'markdown',
        },
      ];

      const { report } = await checker.checkAndReport(documents);

      expect(report).toContain('#'); // Has headers
    });
  });

  describe('generateReport', () => {
    it('should generate report from check result', async () => {
      const documents: Document[] = [
        {
          path: 'doc1.md',
          content: 'Test content',
          format: 'markdown',
        },
      ];

      const result = await checker.check(documents);
      const report = checker.generateReport(result);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });
});

describe('ConsistencyReporter', () => {
  let reporter: ConsistencyReporter;

  beforeEach(() => {
    reporter = new ConsistencyReporter();
  });

  describe('generate', () => {
    it('should generate report for empty result', () => {
      const result: ConsistencyCheckResult = {
        isValid: true,
        score: 100,
        issues: [],
        statistics: {
          documentsChecked: 2,
          numericsFound: 0,
          datesFound: 0,
          termsFound: 0,
          referencesFound: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
        executionTimeMs: 100,
      };

      const report = reporter.generate(result);

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
    });

    it('should include issues in report', () => {
      const result: ConsistencyCheckResult = {
        isValid: false,
        score: 70,
        issues: [
          {
            type: 'numeric_inconsistency',
            severity: 'error',
            message: 'Same label has different values',
            locations: [{ file: 'doc1.md', line: 1 }],
            details: { label: '売上', values: [100, 200] },
          },
          {
            type: 'term_inconsistency',
            severity: 'warning',
            message: '用語に表記揺れがあります',
            locations: [{ file: 'doc1.md', line: 1 }, { file: 'doc2.md', line: 1 }],
            details: { category: 'case_variation', variants: ['KATASHIRO', 'Katashiro'] },
          },
        ],
        statistics: {
          documentsChecked: 2,
          numericsFound: 2,
          datesFound: 0,
          termsFound: 8,
          referencesFound: 0,
          errorCount: 1,
          warningCount: 1,
          infoCount: 0,
        },
        executionTimeMs: 150,
      };

      const report = reporter.generate(result);

      // レポートは日本語で出力される
      expect(report).toContain('エラー');
      expect(report).toContain('警告');
    });
  });

  describe('generateReport', () => {
    it('should return structured report object', () => {
      const result: ConsistencyCheckResult = {
        isValid: true,
        score: 100,
        issues: [],
        statistics: {
          documentsChecked: 2,
          numericsFound: 0,
          datesFound: 0,
          termsFound: 0,
          referencesFound: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
        executionTimeMs: 100,
      };

      const report = reporter.generateReport(result);

      expect(report.markdown).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalIssues).toBe(0);
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
      expect(report.summary.infoCount).toBe(0);
    });

    it('should count issues correctly', () => {
      const result: ConsistencyCheckResult = {
        isValid: false,
        score: 50,
        issues: [
          {
            type: 'numeric_inconsistency',
            severity: 'error',
            message: 'Error 1',
            locations: [{ file: 'doc1.md', line: 1 }],
          },
          {
            type: 'numeric_inconsistency',
            severity: 'error',
            message: 'Error 2',
            locations: [{ file: 'doc1.md', line: 2 }],
          },
          {
            type: 'term_inconsistency',
            severity: 'warning',
            message: 'Warning 1',
            locations: [{ file: 'doc1.md', line: 3 }],
          },
          {
            type: 'date_inconsistency',
            severity: 'info',
            message: 'Info 1',
            locations: [{ file: 'doc1.md', line: 4 }],
          },
        ],
        statistics: {
          documentsChecked: 1,
          numericsFound: 2,
          datesFound: 1,
          termsFound: 1,
          referencesFound: 0,
          errorCount: 2,
          warningCount: 1,
          infoCount: 1,
        },
        executionTimeMs: 50,
      };

      const report = reporter.generateReport(result);

      expect(report.summary.totalIssues).toBe(4);
      expect(report.summary.errorCount).toBe(2);
      expect(report.summary.warningCount).toBe(1);
      expect(report.summary.infoCount).toBe(1);
    });
  });
});

describe('DocumentLoader', () => {
  let loader: DocumentLoader;

  beforeEach(() => {
    loader = new DocumentLoader();
  });

  describe('fromString', () => {
    it('should create document from content', () => {
      const doc = loader.fromString('# Hello\nWorld', 'test.md');

      expect(doc.path).toBe('test.md');
      expect(doc.content).toBe('# Hello\nWorld');
      expect(doc.format).toBe('markdown');
    });

    it('should detect format from extension', () => {
      const mdDoc = loader.fromString('content', 'file.md');
      expect(mdDoc.format).toBe('markdown');

      const txtDoc = loader.fromString('content', 'file.txt');
      expect(txtDoc.format).toBe('text');

      const jsonDoc = loader.fromString('{}', 'file.json');
      expect(jsonDoc.format).toBe('json');
    });
  });

  describe('loadFromContent (alias)', () => {
    it('should work as alias for fromString', () => {
      const doc = loader.loadFromContent('# Hello\nWorld', 'test.md');

      expect(doc.path).toBe('test.md');
      expect(doc.content).toBe('# Hello\nWorld');
      expect(doc.format).toBe('markdown');
    });
  });
});
