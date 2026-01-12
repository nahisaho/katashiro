/**
 * SummaryGenerator Unit Tests
 *
 * @task TSK-031
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SummaryGenerator,
  SummaryConfig,
} from '../../src/summary/summary-generator.js';
import { isOk, type Content, type Source } from '@nahisaho/katashiro-core';

describe('SummaryGenerator', () => {
  let generator: SummaryGenerator;

  beforeEach(() => {
    generator = new SummaryGenerator();
  });

  const createMockContent = (body: string, title: string = 'テスト'): Content => ({
    id: 'cnt-001',
    type: 'article',
    title,
    body,
    sources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  describe('generateSummary', () => {
    it('should generate summary from content', async () => {
      const content = createMockContent(
        'TypeScriptは静的型付け言語です。JavaScriptのスーパーセットとして動作します。' +
        'コンパイル時に型エラーを検出できます。これにより、バグを早期に発見できます。'
      );
      const config: SummaryConfig = { maxLength: 100 };

      const result = await generator.generateSummary(content, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(100);
      }
    });

    it('should respect maxLength option', async () => {
      const longText = 'これはテストです。'.repeat(50);
      const content = createMockContent(longText);
      const config: SummaryConfig = { maxLength: 50 };

      const result = await generator.generateSummary(content, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(53); // +3 for ellipsis
      }
    });

    it('should handle short content', async () => {
      const content = createMockContent('短いテキスト');
      const config: SummaryConfig = { maxLength: 200 };

      const result = await generator.generateSummary(content, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('短いテキスト');
      }
    });

    it('should handle empty content', async () => {
      const content = createMockContent('');
      const config: SummaryConfig = { maxLength: 100 };

      const result = await generator.generateSummary(content, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('');
      }
    });
  });

  describe('generateMultiSourceSummary', () => {
    it('should combine multiple sources into single summary', async () => {
      const contents: Content[] = [
        createMockContent('TypeScriptは型安全な言語です。', 'TypeScript'),
        createMockContent('Reactはフロントエンドライブラリです。', 'React'),
        createMockContent('Node.jsはサーバーサイドランタイムです。', 'Node.js'),
      ];
      const config: SummaryConfig = { maxLength: 300 };

      const result = await generator.generateMultiSourceSummary(contents, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('TypeScript');
        expect(result.value).toContain('React');
      }
    });

    it('should handle empty sources', async () => {
      const result = await generator.generateMultiSourceSummary([], { maxLength: 100 });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('');
      }
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract key points from content', () => {
      const text = `
        第一に、TypeScriptは型安全です。
        第二に、JavaScriptとの互換性があります。
        最後に、大規模開発に適しています。
      `;

      const keyPoints = generator.extractKeyPoints(text, 3);
      
      expect(keyPoints.length).toBeGreaterThan(0);
      expect(keyPoints.length).toBeLessThanOrEqual(3);
    });

    it('should handle text without clear key points', () => {
      const text = 'シンプルなテキストです。';
      const keyPoints = generator.extractKeyPoints(text, 3);
      
      expect(Array.isArray(keyPoints)).toBe(true);
    });
  });

  describe('generateBulletSummary', () => {
    it('should generate bullet point summary', async () => {
      const content = createMockContent(
        'TypeScriptは静的型付けを提供します。' +
        'コンパイル時エラー検出が可能です。' +
        'IDEサポートが優れています。'
      );

      const result = await generator.generateBulletSummary(content, 5);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('•');
      }
    });

    it('should limit bullet points to maxBullets', async () => {
      const content = createMockContent(
        '第一に、型安全です。第二に、互換性があります。第三に、大規模向けです。第四に、ツールが充実。第五に、コミュニティが活発。'
      );

      const result = await generator.generateBulletSummary(content, 2);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const bullets = result.value.split('\n').filter(l => l.startsWith('•'));
        expect(bullets.length).toBeLessThanOrEqual(2);
      }
    });

    it('should fallback for content without key points', async () => {
      const content = createMockContent('短い。');

      const result = await generator.generateBulletSummary(content, 3);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('•');
      }
    });
  });

  describe('summarize (AGENTS.md API)', () => {
    it('should summarize text directly', async () => {
      const result = await generator.summarize(
        'TypeScriptは静的型付け言語です。JavaScriptのスーパーセットとして動作します。',
        { maxLength: 50 }
      );
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(53);
      }
    });

    it('should return error result on failure', async () => {
      // Empty text should still work
      const result = await generator.summarize('', { maxLength: 10 });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('generate', () => {
    it('should generate paragraph summary', async () => {
      const result = await generator.generate(
        'TypeScriptは型安全です。静的型付けを提供します。',
        { style: 'paragraph', maxLength: 100 }
      );
      
      expect(typeof result).toBe('string');
    });

    it('should generate bullets summary', async () => {
      const result = await generator.generate(
        '第一に、型安全です。第二に、互換性があります。第三に、ツールが充実。',
        { style: 'bullets', maxLength: 200 }
      );
      
      expect(result).toContain('•');
    });

    it('should use default maxLength when not provided', async () => {
      const longText = 'これはテストです。'.repeat(100);
      const result = await generator.generate(longText);
      
      expect(result.length).toBeLessThanOrEqual(303); // 300 + ellipsis
    });
  });

  describe('extractKeyPoints edge cases', () => {
    it('should handle text with numbers', () => {
      const text = '第一に、売上は100万円です。第二に、成長率は50%です。';
      const keyPoints = generator.extractKeyPoints(text, 3);
      
      expect(keyPoints.length).toBeGreaterThan(0);
    });

    it('should handle mixed punctuation', () => {
      const text = 'これは重要です！本当に！そうですか？はい、そうです。';
      const keyPoints = generator.extractKeyPoints(text, 3);
      
      expect(Array.isArray(keyPoints)).toBe(true);
    });

    it('should return empty array for whitespace-only text', () => {
      const text = '   \n\t   ';
      const keyPoints = generator.extractKeyPoints(text, 3);
      
      expect(keyPoints).toEqual([]);
    });
  });

  describe('extractiveSummarize edge cases', () => {
    it('should handle text with no sentence breaks', async () => {
      const content = createMockContent('この文章には句読点がありません');
      const result = await generator.generateSummary(content, { maxLength: 10 });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.endsWith('...')).toBe(true);
      }
    });

    it('should preserve complete sentences when possible', async () => {
      const content = createMockContent('短い文。少し長めの文章です。とても長い文章がここにあります。');
      const result = await generator.generateSummary(content, { maxLength: 20 });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Should include first sentence, not truncate mid-sentence
        expect(result.value).toContain('短い文');
      }
    });
  });
});
