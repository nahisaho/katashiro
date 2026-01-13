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

  describe('generateInChunks', () => {
    it('should generate report in chunks with callback', async () => {
      const chunks: Array<{ type: string; content: string; progress: number }> = [];
      
      const result = await generator.generateInChunks({
        title: 'テストレポート',
        sections: [
          { heading: 'セクション1', content: 'コンテンツ1' },
          { heading: 'セクション2', content: 'コンテンツ2' },
        ],
        onChunk: async (chunk) => {
          chunks.push({ type: chunk.type, content: chunk.content, progress: chunk.progress });
        },
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('header');
      expect(chunks[chunks.length - 1].type).toBe('footer');
      expect(result).toContain('# テストレポート');
      expect(result).toContain('セクション1');
      expect(result).toContain('セクション2');
    });

    it('should include progress in each chunk', async () => {
      const progressValues: number[] = [];
      
      await generator.generateInChunks({
        title: 'テスト',
        sections: [
          { heading: 'S1', content: 'C1' },
        ],
        onChunk: (chunk) => {
          progressValues.push(chunk.progress);
        },
      });
      
      // Progress should be increasing
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1]);
      }
      // Last chunk should have progress close to 1
      expect(progressValues[progressValues.length - 1]).toBeCloseTo(1, 1);
    });

    it('should mark last chunk as isLast', async () => {
      const lastFlags: boolean[] = [];
      
      await generator.generateInChunks({
        title: 'テスト',
        sections: [{ heading: 'S', content: 'C' }],
        onChunk: (chunk) => {
          lastFlags.push(chunk.isLast);
        },
      });
      
      expect(lastFlags.filter(f => f).length).toBe(1);
      expect(lastFlags[lastFlags.length - 1]).toBe(true);
    });

    it('should include all sections separately', async () => {
      const sectionNames: string[] = [];
      
      await generator.generateInChunks({
        title: 'マルチセクション',
        sections: [
          { heading: '概要', content: '概要内容' },
          { heading: '詳細', content: '詳細内容' },
          { heading: '結論', content: '結論内容' },
        ],
        onChunk: (chunk) => {
          if (chunk.type === 'section' && chunk.sectionName) {
            sectionNames.push(chunk.sectionName);
          }
        },
      });
      
      expect(sectionNames).toContain('概要');
      expect(sectionNames).toContain('詳細');
      expect(sectionNames).toContain('結論');
    });

    it('should delay between chunks when chunkDelayMs is set', async () => {
      const startTime = Date.now();
      const delayMs = 50;
      
      await generator.generateInChunks({
        title: 'テスト',
        sections: [
          { heading: 'S1', content: 'C1' },
          { heading: 'S2', content: 'C2' },
        ],
        chunkDelayMs: delayMs,
        onChunk: () => {},
      });
      
      const elapsed = Date.now() - startTime;
      // Should have at least some delay (header + toc + 2 sections + footer = 5 chunks, 4 delays)
      expect(elapsed).toBeGreaterThan(delayMs * 2);
    });
  });

  describe('generateChunks (AsyncGenerator)', () => {
    it('should yield chunks one by one', async () => {
      const chunks: Array<{ type: string; sectionName?: string }> = [];
      
      for await (const chunk of generator.generateChunks({
        title: 'ジェネレータテスト',
        sections: [
          { heading: '導入', content: '導入テキスト' },
        ],
      })) {
        chunks.push({ type: chunk.type, sectionName: chunk.sectionName });
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some(c => c.type === 'header')).toBe(true);
      expect(chunks.some(c => c.type === 'section' && c.sectionName === '導入')).toBe(true);
      expect(chunks.some(c => c.type === 'footer')).toBe(true);
    });

    it('should allow early termination', async () => {
      const chunks: string[] = [];
      
      for await (const chunk of generator.generateChunks({
        title: 'テスト',
        sections: [
          { heading: 'S1', content: 'C1' },
          { heading: 'S2', content: 'C2' },
          { heading: 'S3', content: 'C3' },
        ],
      })) {
        chunks.push(chunk.type);
        if (chunks.length >= 3) break; // Early termination
      }
      
      expect(chunks.length).toBe(3);
    });

    it('should include entities chunk when entities data provided', async () => {
      const chunkTypes: string[] = [];
      
      for await (const chunk of generator.generateChunks({
        title: 'エンティティテスト',
        sections: [],
        data: {
          entities: [
            { name: '株式会社テスト', type: 'organization' },
            { name: '山田太郎', type: 'person' },
          ],
        },
      })) {
        chunkTypes.push(chunk.type);
      }
      
      expect(chunkTypes).toContain('entities');
    });

    it('should include sources chunk when sources provided', async () => {
      const chunkTypes: string[] = [];
      
      for await (const chunk of generator.generateChunks({
        title: 'ソーステスト',
        sections: [],
        data: {
          sources: [
            { title: 'ソース1', url: 'https://example.com/1' },
          ],
        },
      })) {
        chunkTypes.push(chunk.type);
      }
      
      expect(chunkTypes).toContain('sources');
    });
  });
});
