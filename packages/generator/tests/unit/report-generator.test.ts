/**
 * ReportGenerator Unit Tests
 *
 * @task TSK-030
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReportGenerator,
  ReportConfig,
  ReportSection,
} from '../../src/report/report-generator.js';
import { isOk, type Content, type Source } from '@nahisaho/katashiro-core';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  const mockSources: Source[] = [
    {
      id: 'src-001',
      url: 'https://example.com/article1',
      metadata: {
        title: 'TypeScript入門',
        description: 'TypeScript入門記事',
      },
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'src-002',
      url: 'https://example.com/article2',
      metadata: {
        title: 'JavaScript基礎',
        description: 'JavaScript基礎記事',
      },
      fetchedAt: new Date().toISOString(),
    },
  ];

  const mockContent: Content = {
    id: 'cnt-001',
    type: 'article',
    title: 'プログラミング入門',
    body: 'TypeScriptは型安全なプログラミング言語です。JavaScriptのスーパーセットとして動作します。',
    sources: mockSources,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('generateReport', () => {
    it('should generate Markdown report', async () => {
      const config: ReportConfig = {
        format: 'markdown',
        includeTitle: true,
        includeToc: true,
        includeSources: true,
      };

      const result = await generator.generateReport(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('# プログラミング入門');
        expect(result.value).toContain('目次');
      }
    });

    it('should generate HTML report', async () => {
      const config: ReportConfig = {
        format: 'html',
        includeTitle: true,
        includeSources: true,
      };

      const result = await generator.generateReport(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('<h1>');
        expect(result.value).toContain('</html>');
      }
    });

    it('should include sources section when enabled', async () => {
      const config: ReportConfig = {
        format: 'markdown',
        includeSources: true,
      };

      const result = await generator.generateReport(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('参考文献');
        expect(result.value).toContain('TypeScript入門');
      }
    });

    it('should handle content without sources', async () => {
      const contentNoSources: Content = {
        ...mockContent,
        sources: [],
      };
      const config: ReportConfig = {
        format: 'markdown',
        includeSources: true,
      };

      const result = await generator.generateReport(contentNoSources, config);
      
      expect(isOk(result)).toBe(true);
    });
  });

  describe('createSection', () => {
    it('should create section with heading', () => {
      const section = generator.createSection('概要', 2, 'これは概要です。');
      
      expect(section.heading).toBe('概要');
      expect(section.level).toBe(2);
      expect(section.content).toBe('これは概要です。');
    });

    it('should create section with subsections', () => {
      const subsections: ReportSection[] = [
        { heading: 'サブ1', level: 3, content: '内容1' },
        { heading: 'サブ2', level: 3, content: '内容2' },
      ];
      
      const section = generator.createSection('メイン', 2, '', subsections);
      
      expect(section.subsections?.length).toBe(2);
    });
  });

  describe('generateToc', () => {
    it('should generate table of contents', () => {
      const sections: ReportSection[] = [
        { heading: 'はじめに', level: 2, content: '' },
        { heading: '本論', level: 2, content: '', subsections: [
          { heading: '詳細1', level: 3, content: '' },
        ]},
        { heading: '結論', level: 2, content: '' },
      ];

      const toc = generator.generateToc(sections);
      
      expect(toc).toContain('はじめに');
      expect(toc).toContain('本論');
      expect(toc).toContain('詳細1');
      expect(toc).toContain('結論');
    });
  });

  describe('formatSources', () => {
    it('should format sources as references', () => {
      const formatted = generator.formatSources(mockSources, 'markdown');
      
      expect(formatted).toContain('[1]');
      expect(formatted).toContain('TypeScript入門');
      expect(formatted).toContain('https://example.com/article1');
    });

    it('should handle empty sources', () => {
      const formatted = generator.formatSources([], 'markdown');
      expect(formatted).toBe('');
    });
  });
});
