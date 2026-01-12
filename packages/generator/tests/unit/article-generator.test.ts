/**
 * ArticleGenerator Unit Tests
 *
 * @task Phase1テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArticleGenerator } from '../../src/article/article-generator.js';

describe('ArticleGenerator', () => {
  let generator: ArticleGenerator;

  beforeEach(() => {
    generator = new ArticleGenerator();
  });

  describe('generate', () => {
    it('should generate article with required options', async () => {
      const result = await generator.generate({
        title: 'TypeScriptの型システム入門',
        topic: 'TypeScriptの型システム',
        tone: 'technical',
        audience: 'intermediate',
        length: 'medium',
      });

      expect(result.title).toBe('TypeScriptの型システム入門');
      expect(result.body).toBeDefined();
      expect(result.body.length).toBeGreaterThan(100);
      expect(result.hook).toBeDefined();
      expect(result.meta.wordCount).toBeGreaterThan(0);
    });

    it('should include meta information', async () => {
      const result = await generator.generate({
        title: 'テスト記事',
        topic: 'テスト',
        tone: 'casual',
        audience: 'beginner',
        length: 'short',
      });

      expect(result.meta).toBeDefined();
      expect(result.meta.description).toBeDefined();
      expect(result.meta.keywords).toBeDefined();
      expect(result.meta.readingTime).toBeGreaterThan(0);
    });

    it('should generate citations when sources provided', async () => {
      const result = await generator.generate({
        title: 'テスト記事',
        topic: 'テスト',
        tone: 'formal',
        audience: 'intermediate',
        length: 'medium',
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      });

      expect(result.citations).toHaveLength(2);
      expect(result.citations[0]).toContain('Source 1');
    });

    it('should include SEO keywords when provided', async () => {
      const result = await generator.generate({
        title: 'SEOテスト',
        topic: 'SEO',
        tone: 'formal',
        audience: 'intermediate',
        length: 'medium',
        seo: {
          keywords: ['SEO', '検索', 'マーケティング'],
        },
      });

      expect(result.meta.keywords).toContain('SEO');
    });
  });

  describe('generateHook', () => {
    it('should generate hook with formal tone', async () => {
      const hook = await generator.generateHook('TypeScript', 'formal');
      
      expect(hook).toContain('TypeScript');
      expect(hook.length).toBeGreaterThan(20);
    });

    it('should generate hook with casual tone', async () => {
      const hook = await generator.generateHook('プログラミング', 'casual');
      
      expect(hook).toContain('プログラミング');
    });

    it('should generate hook with technical tone', async () => {
      const hook = await generator.generateHook('機械学習', 'technical');
      
      expect(hook).toContain('機械学習');
    });
  });

  describe('generateCTA', () => {
    it('should generate newsletter CTA', () => {
      const cta = generator.generateCTA({
        type: 'newsletter',
        text: 'メルマガ登録',
        url: 'https://example.com/subscribe',
      });

      expect(cta).toContain('メルマガ登録');
      expect(cta).toContain('https://example.com/subscribe');
      expect(cta).toContain('📬');
    });

    it('should generate product CTA', () => {
      const cta = generator.generateCTA({
        type: 'product',
        text: '商品を見る',
        url: 'https://example.com/product',
      });

      expect(cta).toContain('商品を見る');
      expect(cta).toContain('🛒');
    });

    it('should generate link CTA', () => {
      const cta = generator.generateCTA({
        type: 'link',
        text: '詳細リンク',
        url: 'https://example.com',
      });

      expect(cta).toContain('🔗');
    });

    it('should generate custom CTA', () => {
      const cta = generator.generateCTA({
        type: 'custom',
        text: 'カスタムCTA文',
      });

      expect(cta).toContain('カスタムCTA文');
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time based on word count', () => {
      const shortTime = generator.estimateReadingTime(300);
      const longTime = generator.estimateReadingTime(3000);

      expect(shortTime).toBeLessThan(longTime);
      expect(shortTime).toBeGreaterThanOrEqual(1);
    });

    it('should return at least 1 minute', () => {
      const time = generator.estimateReadingTime(50);
      expect(time).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generate with CTA', () => {
    it('should include CTA in generated article', async () => {
      const result = await generator.generate({
        title: 'CTAテスト',
        topic: 'テスト',
        tone: 'casual',
        audience: 'beginner',
        length: 'short',
        cta: {
          type: 'newsletter',
          text: 'ニュースレター登録',
          url: 'https://example.com/subscribe',
        },
      });

      expect(result.cta).toBeDefined();
      expect(result.cta).toContain('ニュースレター登録');
    });
  });

  describe('different lengths', () => {
    it('should generate short article', async () => {
      const result = await generator.generate({
        title: '短い記事',
        topic: 'テスト',
        tone: 'casual',
        audience: 'beginner',
        length: 'short',
      });

      expect(result.body.length).toBeGreaterThan(100);
    });

    it('should generate medium article', async () => {
      const result = await generator.generate({
        title: '中程度の記事',
        topic: 'テスト',
        tone: 'formal',
        audience: 'intermediate',
        length: 'medium',
      });

      expect(result.body.length).toBeGreaterThan(200);
    });

    it('should generate long article with more sections', async () => {
      const result = await generator.generate({
        title: '長い記事',
        topic: 'テスト',
        tone: 'technical',
        audience: 'expert',
        length: 'long',
      });

      expect(result.body.length).toBeGreaterThan(300);
      // 長い記事はより多くのセクションを含む
      const sectionCount = (result.body.match(/^##\s/gm) || []).length;
      expect(sectionCount).toBeGreaterThanOrEqual(1);
    });
  });
});
