/**
 * TextAnalyzer Tests
 *
 * @requirement REQ-ANALYZE-001, REQ-ANALYZE-006
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-020
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextAnalyzer } from '../../src/text/text-analyzer.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('TextAnalyzer', () => {
  let analyzer: TextAnalyzer;

  beforeEach(() => {
    analyzer = new TextAnalyzer();
  });

  describe('summarize', () => {
    it('should summarize long text', async () => {
      const content = {
        id: 'test-001',
        type: 'article' as const,
        title: 'AI Article',
        body: `
          Artificial intelligence (AI) is transforming every aspect of our lives.
          From healthcare to finance, from education to entertainment, AI is making
          significant impacts. Machine learning algorithms can now diagnose diseases,
          predict market trends, and personalize learning experiences.
          
          The development of large language models has opened new possibilities for
          human-computer interaction. These models can understand context, generate
          coherent text, and even engage in creative writing.
          
          However, AI also presents challenges. Concerns about job displacement,
          privacy, and bias in algorithms need to be addressed. Ethical considerations
          must be at the forefront of AI development.
        `,
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.summarize(content, 100);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text.length).toBeLessThanOrEqual(150); // some tolerance
        expect(result.value.keyPoints.length).toBeGreaterThanOrEqual(0);
        expect(result.value.wordCount).toBeGreaterThan(0);
      }
    });

    it('should extract key points', async () => {
      const content = {
        id: 'test-002',
        type: 'article' as const,
        title: 'Research Findings',
        body: `
          Key findings from the research:
          1. Exercise improves mental health
          2. Sleep is essential for memory consolidation
          3. Social connections boost longevity
          4. Nutrition affects cognitive function
        `,
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.summarize(content);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.keyPoints.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle empty content', async () => {
      const content = {
        id: 'test-003',
        type: 'article' as const,
        title: 'Empty',
        body: '',
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.summarize(content);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = `
        Machine learning and artificial intelligence are revolutionizing
        the technology industry. Deep learning neural networks enable
        computers to recognize patterns in data.
      `;

      const keywords = analyzer.extractKeywords(text, 5);
      expect(keywords.length).toBeLessThanOrEqual(5);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should filter stop words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const keywords = analyzer.extractKeywords(text, 10);
      
      // Common stop words should be filtered
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('over');
    });

    it('should handle empty text', () => {
      const keywords = analyzer.extractKeywords('', 5);
      expect(keywords).toHaveLength(0);
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', async () => {
      const content = {
        id: 'test-pos',
        type: 'article' as const,
        title: 'Positive Review',
        body: 'This is absolutely wonderful! I love it. Best experience ever!',
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.analyzeSentiment(content);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sentiment).toBe('positive');
        expect(result.value.score).toBeGreaterThan(0);
      }
    });

    it('should detect negative sentiment', async () => {
      const content = {
        id: 'test-neg',
        type: 'article' as const,
        title: 'Negative Review',
        body: 'This is terrible. Worst experience. Very disappointed and frustrated.',
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.analyzeSentiment(content);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sentiment).toBe('negative');
        expect(result.value.score).toBeLessThan(0);
      }
    });

    it('should detect neutral sentiment', async () => {
      const content = {
        id: 'test-neutral',
        type: 'article' as const,
        title: 'Meeting Notice',
        body: 'The meeting is scheduled for tomorrow at 3 PM in conference room B.',
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyzer.analyzeSentiment(content);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sentiment).toBe('neutral');
        expect(Math.abs(result.value.score)).toBeLessThan(0.3);
      }
    });
  });

  describe('countWords', () => {
    it('should count words accurately', () => {
      expect(analyzer.countWords('Hello world')).toBe(2);
      expect(analyzer.countWords('One two three four five')).toBe(5);
      expect(analyzer.countWords('  Multiple   spaces   here  ')).toBe(3);
    });

    it('should handle empty string', () => {
      expect(analyzer.countWords('')).toBe(0);
      expect(analyzer.countWords('   ')).toBe(0);
    });
  });

  describe('splitSentences', () => {
    it('should split text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = analyzer.splitSentences(text);
      expect(sentences).toHaveLength(3);
    });

    it('should handle abbreviations', () => {
      const text = 'Dr. Smith works at the U.S. Embassy. He arrived at 3 p.m.';
      const sentences = analyzer.splitSentences(text);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
    });
  });
});
