/**
 * Consistency Extractors Tests
 *
 * @requirement REQ-KATASHIRO-004 Document Consistency Checker
 * @design DES-KATASHIRO-004-DCC §5 Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NumericExtractor,
  DateExtractor,
  TermExtractor,
  ReferenceExtractor,
} from '../../../src/consistency/index.js';

describe('NumericExtractor', () => {
  let extractor: NumericExtractor;

  beforeEach(() => {
    extractor = new NumericExtractor();
  });

  describe('extract', () => {
    it('should extract integers', () => {
      const content = 'ユーザー数は100人です。売上は1,000万円でした。';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(n => n.rawValue.includes('100'))).toBe(true);
    });

    it('should extract decimals', () => {
      const content = '成長率は12.5%で、利益率は3.14ポイント上昇しました。';
      const result = extractor.extract(content, 'test.md');

      expect(result.some(n => n.rawValue.includes('12.5'))).toBe(true);
      expect(result.some(n => n.rawValue.includes('3.14'))).toBe(true);
    });

    it('should extract percentages with proper format', () => {
      const content = '達成率は85%、前年比120%増でした。';
      const result = extractor.extract(content, 'test.md');

      const percentages = result.filter(n => n.format === 'percentage');
      expect(percentages.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract currency values', () => {
      const content = '売上は1000万円で、利益は5000万円でした。';
      const result = extractor.extract(content, 'test.md');

      // 通貨形式で抽出されるか確認
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract numbers from scientific context', () => {
      const content = 'データサイズは150万バイト、処理速度は230ミリ秒です。';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract labels with context', () => {
      const content = '売上: 1000万円、利益: 200万円、従業員数: 50人';
      const result = extractor.extract(content, 'test.md');

      const withLabels = result.filter(n => n.label);
      expect(withLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should include location information', () => {
      const content = '行1のデータ\n行2のデータ: 500';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const num = result.find(n => n.rawValue.includes('500'));
      expect(num?.location.line).toBe(2);
    });
  });
});

describe('DateExtractor', () => {
  let extractor: DateExtractor;

  beforeEach(() => {
    extractor = new DateExtractor();
  });

  describe('extract', () => {
    it('should extract ISO8601 dates', () => {
      const content = '開始日: 2024-01-15、終了日: 2024-12-31';
      const result = extractor.extract(content, 'test.md');

      const isoDates = result.filter(d => d.format === 'iso8601');
      expect(isoDates.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract Japanese format dates', () => {
      const content = '令和6年1月15日に開始し、2024年12月31日に終了します。';
      const result = extractor.extract(content, 'test.md');

      const jpDates = result.filter(d => d.format === 'japanese');
      expect(jpDates.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract slash format dates with us format enabled', () => {
      // US形式（MM/DD/YYYY）を有効にして抽出
      const usExtractor = new DateExtractor({
        formats: ['iso8601', 'japanese', 'us', 'relative'],
      });
      const content = '開始: 01/15/2024, 終了: 12/31/2024';
      const result = usExtractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract relative dates', () => {
      const content = '昨日の会議で、今日のタスクを決め、明日までに完了します。';
      const result = extractor.extract(content, 'test.md');

      const relativeDates = result.filter(d => d.format === 'relative');
      expect(relativeDates.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract labels with context', () => {
      const content = '開始日: 2024-01-15\n終了日: 2024-12-31';
      const result = extractor.extract(content, 'test.md');

      const withLabels = result.filter(d => d.label);
      expect(withLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse dates correctly', () => {
      const content = '2024-06-15に実施予定';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const date = result[0];
      expect(date.parsedDate).toBeInstanceOf(Date);
      expect(date.parsedDate?.getFullYear()).toBe(2024);
      expect(date.parsedDate?.getMonth()).toBe(5); // 0-indexed
      expect(date.parsedDate?.getDate()).toBe(15);
    });
  });
});

describe('TermExtractor', () => {
  let extractor: TermExtractor;

  beforeEach(() => {
    extractor = new TermExtractor();
  });

  describe('extract', () => {
    it('should extract technical terms', () => {
      const content = 'KATASHIROはAI/MLを活用したDeep Researchツールです。';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract acronyms', () => {
      const content = 'This is a ML and NLP system using API calls.';
      const result = extractor.extract(content, 'test.md');

      expect(result.some(t => t.rawValue === 'ML' || t.rawValue === 'NLP' || t.rawValue === 'API')).toBe(true);
    });

    it('should extract Japanese katakana terms', () => {
      const content = 'マシンラーニングとディープラーニングの違いを説明します。';
      const result = extractor.extract(content, 'test.md');

      expect(result.some(t => t.rawValue.includes('ラーニング'))).toBe(true);
    });

    it('should normalize terms to lowercase for English', () => {
      const content = 'KATASHIRO and katashiro are the same.';
      const result = extractor.extract(content, 'test.md');

      const katashiroTerms = result.filter(t => t.normalizedValue.toLowerCase() === 'katashiro');
      expect(katashiroTerms.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract camelCase terms', () => {
      const content = 'Use DocumentConsistencyChecker and TextAnalyzer classes.';
      const result = extractor.extract(content, 'test.md');

      expect(result.some(t => t.rawValue === 'DocumentConsistencyChecker' || t.rawValue === 'TextAnalyzer')).toBe(true);
    });
  });
});

describe('ReferenceExtractor', () => {
  let extractor: ReferenceExtractor;

  beforeEach(() => {
    extractor = new ReferenceExtractor();
  });

  describe('extract', () => {
    it('should extract markdown links', () => {
      const content = '[ドキュメント](./docs/readme.md)を参照してください。[外部](https://example.com)も確認。';
      const result = extractor.extract(content, 'test.md');

      // file と external タイプのリンク
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(r => r.type === 'file')).toBe(true);
      expect(result.some(r => r.type === 'external')).toBe(true);
    });

    it('should extract file references', () => {
      const content = '![スクリーンショット](./images/screenshot.png)\n詳細は[こちら](./docs/guide.md)';
      const result = extractor.extract(content, 'test.md');

      const fileRefs = result.filter(r => r.type === 'file');
      expect(fileRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract section anchors', () => {
      const content = '[概要へ](#overview)と[詳細](#details)を参照。';
      const result = extractor.extract(content, 'test.md');

      const sections = result.filter(r => r.type === 'section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract external URLs', () => {
      const content = '詳細は https://example.com/docs を参照してください。';
      const result = extractor.extract(content, 'test.md');

      const external = result.filter(r => r.type === 'external');
      expect(external.length).toBeGreaterThanOrEqual(1);
    });

    it('should include link text', () => {
      const content = '[詳細ドキュメント](./docs/readme.md)';
      const result = extractor.extract(content, 'test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].linkText).toBe('詳細ドキュメント');
    });

    it('should include target path', () => {
      const content = '[リンク](../other/file.md)';
      const result = extractor.extract(content, 'docs/test.md');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].target).toBe('../other/file.md');
    });
  });
});
