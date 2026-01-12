/**
 * PresentationGenerator Unit Tests
 *
 * @task TSK-032
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PresentationGenerator,
  SlideType,
  PresentationConfig,
} from '../../src/presentation/presentation-generator.js';
import { isOk, type Content, type Source } from '@nahisaho/katashiro-core';

describe('PresentationGenerator', () => {
  let generator: PresentationGenerator;

  beforeEach(() => {
    generator = new PresentationGenerator();
  });

  const mockSources: Source[] = [
    {
      id: 'src-001',
      url: 'https://example.com/article1',
      metadata: {
        title: 'AI技術の最新動向',
        author: '山田太郎',
        publishedAt: '2024-01-15',
      },
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'src-002',
      url: 'https://example.com/article2',
      metadata: {
        title: '機械学習の応用事例',
        description: '実践的な事例を紹介',
      },
      fetchedAt: new Date().toISOString(),
    },
  ];

  const mockContent: Content = {
    id: 'cnt-001',
    type: 'article',
    title: 'AI技術の概要',
    body: `# はじめに

AIとは人工知能のことです。近年急速に発展しています。

# 主要な技術

## 機械学習

機械学習はデータから学習します。教師あり学習と教師なし学習があります。

## 深層学習

深層学習はニューラルネットワークを使用します。画像認識や自然言語処理に強みがあります。

# 応用分野

- 自動運転
- 医療診断
- 金融分析

# まとめ

AI技術は今後も発展を続けるでしょう。`,
    sources: mockSources,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('generate', () => {
    it('should generate presentation from content', async () => {
      const result = await generator.generate(mockContent);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.title).toBe('AI技術の概要');
        expect(result.value.slides.length).toBeGreaterThan(0);
      }
    });

    it('should include title slide', async () => {
      const result = await generator.generate(mockContent);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const titleSlide = result.value.slides[0];
        expect(titleSlide.type).toBe('title');
        expect(titleSlide.title).toBe('AI技術の概要');
      }
    });

    it('should create content slides from sections', async () => {
      const result = await generator.generate(mockContent);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const contentSlides = result.value.slides.filter(s => s.type === 'content');
        expect(contentSlides.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generate with config', () => {
    it('should respect maxBulletPoints config', async () => {
      const config: PresentationConfig = { maxBulletPoints: 3 };
      const result = await generator.generate(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        result.value.slides.forEach((slide) => {
          if (slide.bulletPoints) {
            expect(slide.bulletPoints.length).toBeLessThanOrEqual(3);
          }
        });
      }
    });

    it('should include references slide when requested', async () => {
      const config: PresentationConfig = { includeReferences: true };
      const result = await generator.generate(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const refSlide = result.value.slides.find(s => s.type === 'references');
        expect(refSlide).toBeDefined();
        expect(refSlide?.bulletPoints).toBeDefined();
      }
    });

    it('should include summary slide when requested', async () => {
      const config: PresentationConfig = { includeSummary: true };
      const result = await generator.generate(mockContent, config);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const summarySlide = result.value.slides.find(s => s.type === 'summary');
        expect(summarySlide).toBeDefined();
      }
    });
  });

  describe('toMarkdownSlides', () => {
    it('should convert presentation to Markdown format', async () => {
      const genResult = await generator.generate(mockContent);
      expect(isOk(genResult)).toBe(true);
      if (!isOk(genResult)) return;
      
      const markdown = generator.toMarkdownSlides(genResult.value);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('# AI技術の概要');
    });
  });

  describe('getSlideCount', () => {
    it('should return correct slide count', async () => {
      const result = await generator.generate(mockContent);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const count = generator.getSlideCount(result.value);
        expect(count).toBe(result.value.slides.length);
      }
    });
  });

  describe('estimateDuration', () => {
    it('should estimate presentation duration', async () => {
      const result = await generator.generate(mockContent);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const duration = generator.estimateDuration(result.value);
        // Assume ~1-2 minutes per slide
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(60); // Less than 60 minutes
      }
    });
  });
});
