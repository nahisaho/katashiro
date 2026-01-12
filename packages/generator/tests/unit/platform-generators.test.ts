/**
 * Platform Generators Unit Tests
 * QiitaGenerator, ZennGenerator, NoteGenerator
 *
 * @task Phase1テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QiitaGenerator,
  ZennGenerator,
  NoteGenerator,
} from '../../src/platform/index.js';

describe('QiitaGenerator', () => {
  let generator: QiitaGenerator;

  beforeEach(() => {
    generator = new QiitaGenerator();
  });

  describe('generate', () => {
    it('should generate Qiita article', async () => {
      const result = await generator.generate({
        title: 'TypeScriptの基礎',
        body: '# はじめに\n\nTypeScriptは素晴らしい言語です。',
        tags: ['TypeScript', 'JavaScript', 'プログラミング'],
      });

      expect(result.title).toBe('TypeScriptの基礎');
      expect(result.tags).toBeDefined();
      expect(result.body).toContain('TypeScript');
    });

    it('should limit tags to 5', async () => {
      const result = await generator.generate({
        title: 'テスト記事',
        body: 'コンテンツです。',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
      });

      // タグは5個まで
      expect(result.tags.length).toBeLessThanOrEqual(5);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should convert note syntax to Qiita syntax', async () => {
      const result = await generator.generate({
        title: 'ノート変換テスト',
        body: '> **Note**: 重要な情報です',
        tags: ['test'],
      });

      expect(result.body).toContain(':::note info');
    });
  });

  describe('validate', () => {
    it('should validate correct article', () => {
      const validation = generator.validate({
        title: '正しいタイトル',
        body: 'これは十分な長さのコンテンツです。'.repeat(10),
        tags: ['TypeScript'],
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty title', () => {
      const validation = generator.validate({
        title: '',
        body: 'コンテンツ',
        tags: ['test'],
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('タイトル'))).toBe(true);
    });

    it('should reject title over 60 chars', () => {
      const validation = generator.validate({
        title: 'a'.repeat(61),
        body: 'コンテンツです。'.repeat(20),
        tags: ['test'],
      });

      expect(validation.isValid).toBe(false);
    });

    it('should require at least one tag', () => {
      const validation = generator.validate({
        title: 'テスト',
        body: 'コンテンツです。'.repeat(20),
        tags: [],
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('タグ'))).toBe(true);
    });
  });

  describe('validateTags', () => {
    it('should validate correct tags', () => {
      const result = generator.validateTags(['typescript', 'javascript', 'react']);
      
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should normalize tags to lowercase', () => {
      const result = generator.validateTags(['TypeScript', 'JAVASCRIPT']);
      
      expect(result.valid).toContain('typescript');
      expect(result.valid).toContain('javascript');
    });

    it('should remove duplicate tags', () => {
      const result = generator.validateTags(['typescript', 'TypeScript', 'TYPESCRIPT']);
      
      expect(result.valid).toHaveLength(1);
    });
  });
});

describe('ZennGenerator', () => {
  let generator: ZennGenerator;

  beforeEach(() => {
    generator = new ZennGenerator();
  });

  describe('generateArticle', () => {
    it('should generate Zenn article with correct frontmatter', async () => {
      const result = await generator.generateArticle({
        title: 'Zennで記事を書く',
        emoji: '📝',
        type: 'tech',
        topics: ['zenn', 'markdown'],
        published: true,
        body: '# 記事本文\n\nここに内容を書きます。',
      });

      expect(result.fullContent).toContain('---');
      expect(result.fullContent).toContain('title: "Zennで記事を書く"');
      expect(result.fullContent).toContain('emoji: "📝"');
      expect(result.fullContent).toContain('type: "tech"');
    });

    it('should convert embeds to Zenn format', async () => {
      const result = await generator.generateArticle({
        title: '埋め込みテスト',
        emoji: '🔗',
        type: 'tech',
        topics: ['test'],
        published: true,
        body: 'https://twitter.com/user/status/123456',
      });

      expect(result.body).toContain('@[tweet]');
    });
  });

  describe('generateBook', () => {
    it('should generate Zenn book structure', async () => {
      const result = await generator.generateBook({
        title: 'TypeScript入門',
        summary: 'TypeScriptの基礎から応用まで',
        topics: ['typescript', 'programming'],
        price: 0,
        chapters: [
          { title: 'はじめに', content: '導入部分', slug: 'intro' },
          { title: '基本構文', content: '変数と型', slug: 'basics' },
        ],
      });

      expect(result.configYaml).toContain('title: "TypeScript入門"');
      expect(result.configYaml).toContain('price: 0');
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].filename).toBe('intro.md');
    });
  });

  describe('validate', () => {
    it('should validate correct article', () => {
      const validation = generator.validate({
        title: '正しいタイトル',
        emoji: '✅',
        type: 'tech',
        topics: ['typescript'],
        published: true,
        body: 'コンテンツです。'.repeat(20),
      });

      expect(validation.isValid).toBe(true);
    });

    it('should require emoji', () => {
      const validation = generator.validate({
        title: 'テスト',
        emoji: '',
        type: 'tech',
        topics: ['test'],
        published: true,
        body: 'コンテンツです。'.repeat(20),
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('絵文字'))).toBe(true);
    });

    it('should limit topics to 5', () => {
      const validation = generator.validate({
        title: 'テスト',
        emoji: '📝',
        type: 'tech',
        topics: ['t1', 't2', 't3', 't4', 't5', 't6'],
        published: true,
        body: 'コンテンツです。'.repeat(20),
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('トピック'))).toBe(true);
    });
  });
});

describe('NoteGenerator', () => {
  let generator: NoteGenerator;

  beforeEach(() => {
    generator = new NoteGenerator();
  });

  describe('generate', () => {
    it('should generate note.com compatible content', async () => {
      const result = await generator.generate({
        title: 'noteで書く記事',
        body: '# 見出し\n\nこれは本文です。',
      });

      expect(result.body).toBeDefined();
      expect(result.title).toBe('noteで書く記事');
    });

    it('should convert blockquotes to note format', async () => {
      const result = await generator.generate({
        title: '引用テスト',
        body: '> これは引用です\n> 複数行の引用',
      });

      // noteは引用ブロックをサポート
      expect(result.body).toContain('>');
    });

    it('should handle code blocks', async () => {
      const result = await generator.generate({
        title: 'コードテスト',
        body: '```javascript\nconst x = 1;\n```',
      });

      expect(result.body).toContain('```');
    });

    it('should downgrade h4+ headings to h3', async () => {
      const result = await generator.generate({
        title: '見出しテスト',
        body: '#### 見出し4\n##### 見出し5\n###### 見出し6',
      });

      expect(result.body).not.toContain('####');
      expect(result.body).toContain('### ');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate correct article', () => {
      const validation = generator.validate({
        title: '正しい記事',
        body: 'コンテンツです。'.repeat(10),
      });

      expect(validation.isValid).toBe(true);
    });

    it('should reject title over 100 chars', () => {
      const validation = generator.validate({
        title: 'a'.repeat(101),
        body: 'コンテンツ',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('タイトル'))).toBe(true);
    });

    it('should reject empty body', () => {
      const validation = generator.validate({
        title: 'テスト',
        body: '',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('本文'))).toBe(true);
    });
  });
});