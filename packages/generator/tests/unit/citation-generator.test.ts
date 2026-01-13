/**
 * CitationGenerator Unit Tests
 *
 * @task TSK-033
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CitationGenerator,
  CitationStyle,
} from '../../src/citation/citation-generator.js';
import type { Source } from '@nahisaho/katashiro-core';

describe('CitationGenerator', () => {
  let generator: CitationGenerator;

  beforeEach(() => {
    generator = new CitationGenerator();
  });

  const mockSource: Source = {
    id: 'src-001',
    url: 'https://example.com/article',
    metadata: {
      title: 'TypeScript入門ガイド',
      author: '田中太郎',
      publishedAt: '2024-01-15',
    },
    fetchedAt: new Date().toISOString(),
  };

  describe('generateCitation', () => {
    it('should generate APA style citation', () => {
      const citation = generator.generateCitation(mockSource, 'apa');
      
      expect(citation.formatted).toContain('田中太郎');
      expect(citation.formatted).toContain('TypeScript入門ガイド');
      expect(citation.style).toBe('apa');
    });

    it('should generate MLA style citation', () => {
      const citation = generator.generateCitation(mockSource, 'mla');
      
      expect(citation.formatted).toContain('TypeScript入門ガイド');
      expect(citation.style).toBe('mla');
    });

    it('should generate IEEE style citation', () => {
      const citation = generator.generateCitation(mockSource, 'ieee');
      
      expect(citation.formatted).toContain('[');
      expect(citation.style).toBe('ieee');
    });

    it('should handle missing author', () => {
      const sourceNoAuthor: Source = {
        ...mockSource,
        metadata: { title: 'タイトル' },
      };
      
      const citation = generator.generateCitation(sourceNoAuthor, 'apa');
      expect(citation.formatted).toBeDefined();
    });

    it('should handle missing date', () => {
      const sourceNoDate: Source = {
        ...mockSource,
        metadata: { title: 'タイトル', author: '著者' },
      };
      
      const citation = generator.generateCitation(sourceNoDate, 'apa');
      expect(citation.formatted).toContain('n.d.');
    });
  });

  describe('generateBibliography', () => {
    it('should generate sorted bibliography', () => {
      const sources: Source[] = [
        mockSource,
        {
          id: 'src-002',
          url: 'https://example.com/article2',
          metadata: { title: 'Aから始まる記事', author: '阿部' },
          fetchedAt: new Date().toISOString(),
        },
      ];

      const bibliography = generator.generateBibliography(sources, 'apa');
      
      expect(bibliography).toContain('阿部');
      expect(bibliography).toContain('田中太郎');
    });

    it('should handle empty sources', () => {
      const bibliography = generator.generateBibliography([], 'apa');
      expect(bibliography).toBe('');
    });
  });

  describe('formatInlineCitation', () => {
    it('should format inline citation for APA', () => {
      const inline = generator.formatInlineCitation(mockSource, 'apa');
      
      expect(inline).toContain('田中');
      expect(inline).toContain('2024');
    });

    it('should format inline citation for IEEE', () => {
      const inline = generator.formatInlineCitation(mockSource, 'ieee', 1);
      
      expect(inline).toBe('[1]');
    });
  });

  describe('validate', () => {
    it('should validate complete source', () => {
      const result = generator.validate(mockSource);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing URL and title', () => {
      const invalidSource = {
        ...mockSource,
        url: '',
        metadata: {
          ...mockSource.metadata,
          title: undefined,
        },
      };
      
      const result = generator.validate(invalidSource);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('URL') || e.includes('title'))).toBe(true);
    });

    it('should validate URL format', () => {
      const invalidSource = {
        ...mockSource,
        url: 'not-a-valid-url',
      };
      
      const result = generator.validate(invalidSource);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('URL'))).toBe(true);
    });

    it('should suggest adding metadata', () => {
      const minimalSource = {
        id: 'src-002',
        url: 'https://example.com',
        fetchedAt: new Date().toISOString(),
      };
      
      const result = generator.validate(minimalSource);
      
      // メタデータがなくても有効だが、suggestionsが出る
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should validate date formats', () => {
      const sourceWithBadDate = {
        ...mockSource,
        metadata: {
          ...mockSource.metadata,
          publishedAt: 'invalid-date',
        },
      };
      
      const result = generator.validate(sourceWithBadDate);
      
      expect(result.warnings.some(w => 
        w.includes('日付') || w.includes('date')
      )).toBe(true);
    });

    it('should warn about future dates', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const sourceWithFutureDate = {
        ...mockSource,
        metadata: {
          ...mockSource.metadata,
          publishedAt: futureDate,
        },
      };
      
      const result = generator.validate(sourceWithFutureDate);
      
      expect(result.warnings.some(w => w.includes('future'))).toBe(true);
    });

    it('should warn about short titles', () => {
      const sourceShortTitle = {
        ...mockSource,
        metadata: { ...mockSource.metadata, title: 'AB' },
      };
      
      const result = generator.validate(sourceShortTitle);
      
      expect(result.warnings.some(w => w.includes('short'))).toBe(true);
    });

    it('should warn about URL-like titles', () => {
      const sourceUrlTitle = {
        ...mockSource,
        metadata: { ...mockSource.metadata, title: 'https://example.com' },
      };
      
      const result = generator.validate(sourceUrlTitle);
      
      expect(result.warnings.some(w => w.includes('URL'))).toBe(true);
    });
  });

  describe('generate (simple API)', () => {
    it('should generate citation from SourceInput', () => {
      const input = {
        title: 'テスト記事',
        author: '著者名',
        url: 'https://example.com',
        date: '2024-01-01',
      };
      
      const citation = generator.generate(input);
      
      expect(citation.formatted).toContain('著者名');
      expect(citation.formatted).toContain('テスト記事');
    });

    it('should use default style when not specified', () => {
      const input = { title: 'テスト', url: 'https://example.com' };
      const citation = generator.generate(input);
      
      expect(citation.style).toBe('apa');
    });

    it('should handle Source type directly', () => {
      const citation = generator.generate(mockSource, 'mla');
      
      expect(citation.style).toBe('mla');
      expect(citation.source).toBe(mockSource);
    });
  });

  describe('formatInlineCitation additional styles', () => {
    it('should format Chicago style', () => {
      const inline = generator.formatInlineCitation(mockSource, 'chicago');
      
      expect(inline).toContain('田中');
      expect(inline).toContain('2024');
    });

    it('should format Harvard style', () => {
      const inline = generator.formatInlineCitation(mockSource, 'harvard');
      
      expect(inline).toContain('田中');
      expect(inline).toContain('2024');
    });

    it('should handle missing author in inline citation', () => {
      const sourceNoAuthor: Source = {
        ...mockSource,
        metadata: { title: 'タイトル' },
      };
      
      const inline = generator.formatInlineCitation(sourceNoAuthor, 'apa');
      
      expect(inline).toContain('Unknown');
    });
  });

  describe('generateCitation additional styles', () => {
    it('should generate Chicago style citation', () => {
      const citation = generator.generateCitation(mockSource, 'chicago');
      
      expect(citation.formatted).toContain('田中太郎');
      expect(citation.style).toBe('chicago');
    });

    it('should generate Harvard style citation', () => {
      const citation = generator.generateCitation(mockSource, 'harvard');
      
      expect(citation.formatted).toContain('Available at');
      expect(citation.style).toBe('harvard');
    });
  });

  describe('generateBibliography sorting', () => {
    it('should sort by title when author is missing', () => {
      const sources: Source[] = [
        {
          id: 'src-z',
          url: 'https://example.com/z',
          metadata: { title: 'Zから始まる' },
          fetchedAt: new Date().toISOString(),
        },
        {
          id: 'src-a',
          url: 'https://example.com/a',
          metadata: { title: 'Aから始まる' },
          fetchedAt: new Date().toISOString(),
        },
      ];

      const bibliography = generator.generateBibliography(sources, 'apa');
      
      // Aから始まるが先に来るべき
      const aIndex = bibliography.indexOf('Aから始まる');
      const zIndex = bibliography.indexOf('Zから始まる');
      expect(aIndex).toBeLessThan(zIndex);
    });
  });

  describe('validate SourceInput type', () => {
    it('should validate SourceInput without URL', () => {
      const input = { title: 'タイトル' };
      
      const result = generator.validate(input);
      
      expect(result.warnings.some(w => w.includes('URL') || w.includes('author'))).toBe(true);
    });

    it('should report error for empty title in SourceInput', () => {
      const input = { title: '' };
      
      const result = generator.validate(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Title'))).toBe(true);
    });
  });

  /**
   * REQ-EXT-CIT-001: Inline Citation Link Generation Tests
   * @since 0.5.0
   */
  describe('generateInlineLink', () => {
    it('should generate markdown style inline link by default', () => {
      const link = generator.generateInlineLink(mockSource);
      
      expect(link.text).toBe('TypeScript入門ガイド');
      expect(link.url).toBe('https://example.com/article');
      expect(link.markdown).toBe('[TypeScript入門ガイド](https://example.com/article)');
      expect(link.html).toBe('<a href="https://example.com/article">TypeScript入門ガイド</a>');
      expect(link.sourceId).toBe('src-001');
    });

    it('should generate footnote style inline link', () => {
      const link = generator.generateInlineLink(mockSource, { style: 'footnote', number: 3 });
      
      expect(link.text).toBe('[^3]');
      expect(link.markdown).toBe('[^3]');
      expect(link.html).toContain('fnref:3');
      expect(link.number).toBe(3);
    });

    it('should generate endnote style inline link', () => {
      const link = generator.generateInlineLink(mockSource, { style: 'endnote', number: 5 });
      
      expect(link.text).toBe('[5]');
      expect(link.markdown).toBe('[[5]](https://example.com/article)');
      expect(link.html).toBe('<a href="https://example.com/article">[5]</a>');
    });

    it('should generate parenthetical style inline link', () => {
      const link = generator.generateInlineLink(mockSource, { style: 'parenthetical' });
      
      // getLastName returns full name for Japanese names
      expect(link.text).toBe('(田中太郎, 2024)');
      expect(link.markdown).toBe('[(田中太郎, 2024)](https://example.com/article)');
      expect(link.html).toContain('(田中太郎, 2024)');
    });

    it('should handle source without author in parenthetical style', () => {
      const sourceNoAuthor: Source = {
        ...mockSource,
        metadata: { title: 'タイトル', publishedAt: '2024-01-15' },
      };
      
      const link = generator.generateInlineLink(sourceNoAuthor, { style: 'parenthetical' });
      
      // Empty author results in 'Unknown' from getLastName
      expect(link.text).toContain('2024');
      expect(link.markdown).toContain('2024');
    });

    it('should handle source without date in parenthetical style', () => {
      const sourceNoDate: Source = {
        ...mockSource,
        metadata: { title: 'タイトル', author: '著者' },
      };
      
      const link = generator.generateInlineLink(sourceNoDate, { style: 'parenthetical' });
      
      expect(link.text).toBe('(著者, n.d.)');
    });

    it('should escape HTML special characters', () => {
      const sourceWithSpecialChars: Source = {
        ...mockSource,
        url: 'https://example.com/article?a=1&b=2',
        metadata: { title: '<script>alert("XSS")</script>' },
      };
      
      const link = generator.generateInlineLink(sourceWithSpecialChars);
      
      expect(link.html).not.toContain('<script>');
      expect(link.html).toContain('&lt;script&gt;');
      expect(link.html).toContain('&amp;');
    });

    it('should default to number 1 for footnote style without number', () => {
      const link = generator.generateInlineLink(mockSource, { style: 'footnote' });
      
      expect(link.markdown).toBe('[^1]');
    });
  });

  describe('generateInlineLinks', () => {
    it('should generate links for multiple sources with incremental numbers', () => {
      const sources: Source[] = [
        mockSource,
        {
          id: 'src-002',
          url: 'https://example.com/article2',
          metadata: { title: 'Second Article', author: '田中太郎' },
          fetchedAt: new Date().toISOString(),
        },
        {
          id: 'src-003',
          url: 'https://example.com/article3',
          metadata: { title: 'Third Article' },
          fetchedAt: new Date().toISOString(),
        },
      ];

      const links = generator.generateInlineLinks(sources);
      
      expect(links).toHaveLength(3);
      expect(links[0].number).toBe(1);
      expect(links[1].number).toBe(2);
      expect(links[2].number).toBe(3);
    });

    it('should apply style to all links', () => {
      const sources: Source[] = [mockSource];

      const links = generator.generateInlineLinks(sources, { style: 'endnote' });
      
      expect(links[0].markdown).toBe('[[1]](https://example.com/article)');
    });

    it('should handle empty sources array', () => {
      const links = generator.generateInlineLinks([]);
      
      expect(links).toHaveLength(0);
    });
  });

  describe('REQ-EXT-CIT-003: URL検証', () => {
    it('verifyUrl() が正しい構造を返す', async () => {
      // 実際のHTTPリクエストは行わず、モック的なテスト
      const result = await generator.verifyUrl('https://example.com');
      
      expect(typeof result.url).toBe('string');
      expect(result.url).toBe('https://example.com');
      expect(typeof result.accessible).toBe('boolean');
      expect(typeof result.responseTimeMs).toBe('number');
      expect(result.checkedAt).toBeInstanceOf(Date);
      
      // タイトルはnullまたは文字列
      expect(result.title === null || typeof result.title === 'string').toBe(true);
    });

    it('verifyUrl() が空URLに対してエラーを返す', async () => {
      const result = await generator.verifyUrl('');
      
      expect(result.accessible).toBe(false);
      expect(result.error).toBe('URL is empty');
    });

    it('verifyUrl() が不正なURL形式に対してエラーを返す', async () => {
      const result = await generator.verifyUrl('not-a-valid-url');
      
      expect(result.accessible).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('verifyUrls() が複数URLを一括検証できる', async () => {
      const results = await generator.verifyUrls([
        'https://example.com',
        '',
        'invalid-url',
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0].url).toBe('https://example.com');
      expect(results[1].accessible).toBe(false);
      expect(results[1].error).toBe('URL is empty');
      expect(results[2].accessible).toBe(false);
      expect(results[2].error).toBe('Invalid URL format');
    });

    it('verifySourceUrl() がURLありソースを検証できる', async () => {
      const result = await generator.verifySourceUrl(mockSource);
      
      expect(result.source).toBe(mockSource);
      expect(result.verification).not.toBeNull();
      expect(['verified', 'unverified']).toContain(result.status);
      // unverifiedの場合はラベルがある
      if (result.status === 'unverified') {
        expect(result.label).toBe('[未検証]');
      } else {
        expect(result.label).toBeNull();
      }
    });

    it('verifySourceUrl() がURLなしソースを正しく処理する', async () => {
      const sourceNoUrl: Source = {
        id: 'src-no-url',
        metadata: { title: 'No URL Source' },
        fetchedAt: new Date().toISOString(),
      };
      
      const result = await generator.verifySourceUrl(sourceNoUrl);
      
      expect(result.status).toBe('no_url');
      expect(result.verification).toBeNull();
      expect(result.label).toBeNull();
    });

    it('verifyUrl() がレスポンス時間を記録する', async () => {
      const result = await generator.verifyUrl('https://example.com');
      
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
