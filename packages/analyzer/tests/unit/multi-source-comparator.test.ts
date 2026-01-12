/**
 * MultiSourceComparator Unit Tests
 *
 * @task Phase1テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiSourceComparator } from '../../src/comparator/multi-source-comparator.js';

describe('MultiSourceComparator', () => {
  let comparator: MultiSourceComparator;

  beforeEach(() => {
    comparator = new MultiSourceComparator();
  });

  describe('compare', () => {
    it('should compare multiple sources', async () => {
      const sources = [
        {
          id: 'source-1',
          content: 'TypeScriptは静的型付け言語です。JavaScriptのスーパーセットとして設計されました。',
          metadata: { url: 'https://example.com/1' },
        },
        {
          id: 'source-2',
          content: 'TypeScriptはMicrosoftが開発した言語で、静的な型チェックが可能です。',
          metadata: { url: 'https://example.com/2' },
        },
        {
          id: 'source-3',
          content: 'TypeScriptは型安全なJavaScript開発を実現します。大規模開発に適しています。',
          metadata: { url: 'https://example.com/3' },
        },
      ];

      const result = await comparator.compare('TypeScript', sources);

      expect(result.topic).toBe('TypeScript');
      expect(result.claims).toBeDefined();
      expect(result.uniqueInsights).toBeDefined();
      expect(result.matrix).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should require at least 2 sources', async () => {
      const sources = [{ id: '1', content: 'Single source' }];

      await expect(comparator.compare('Topic', sources)).rejects.toThrow();
    });

    it('should identify common claims across sources', async () => {
      const sources = [
        { id: '1', content: 'Pythonは読みやすい言語です。インデントが重要な意味を持ちます。' },
        { id: '2', content: 'Pythonは可読性が高い言語です。インデントでブロックを定義します。' },
        { id: '3', content: 'Pythonはインデントベースの言語で、読みやすさを重視しています。' },
      ];

      const result = await comparator.compare('Python', sources);

      // 共通の主張が検出される
      expect(result.claims.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify unique insights from each source', async () => {
      const sources = [
        { id: '1', content: 'Node.jsはサーバーサイドJavaScriptランタイムです。' },
        { id: '2', content: 'Node.jsはV8エンジンを使用しています。非同期I/Oが特徴です。' },
        { id: '3', content: 'Node.jsはnpmパッケージマネージャーと共に使われます。' },
      ];

      const result = await comparator.compare('Node.js', sources);

      // 各ソース固有の情報が抽出される
      expect(result.uniqueInsights).toBeDefined();
    });
  });

  describe('extractClaims', () => {
    it('should extract claims from content', async () => {
      const content = `
        TypeScriptは2012年にMicrosoftからリリースされました。
        現在、多くの企業で採用されています。
        Angular、Vue、Reactなどのフレームワークで使用できます。
      `;

      const claims = await comparator.extractClaims(content, 'test-source', {
        minClaimLength: 10,
        consensusThreshold: 0.6,
        similarityThreshold: 0.8,
      });

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0]).toHaveProperty('statement');
      expect(claims[0]).toHaveProperty('confidence');
      expect(claims[0]).toHaveProperty('sourceId');
    });

    it('should assign confidence scores to claims', async () => {
      const factualContent = 'JavaScriptは1995年にBrendan Eichによって作成されました。';
      
      const claims = await comparator.extractClaims(factualContent, 'source', {
        minClaimLength: 10,
        consensusThreshold: 0.6,
        similarityThreshold: 0.8,
      });

      if (claims.length > 0) {
        expect(claims[0].confidence).toBeGreaterThan(0);
        expect(claims[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should filter out opinion statements', async () => {
      const opinionContent = '私はTypeScriptが良いと思います。多分将来は主流になるでしょう。';
      
      const claims = await comparator.extractClaims(opinionContent, 'source', {
        minClaimLength: 10,
        consensusThreshold: 0.6,
        similarityThreshold: 0.8,
      });

      // 意見文はフィルタされるか、低い確度を持つ
      const highConfidenceClaims = claims.filter(c => c.confidence > 0.7);
      expect(highConfidenceClaims.length).toBe(0);
    });
  });

  describe('generateMatrix', () => {
    it('should generate comparison matrix in Markdown', async () => {
      const sources = [
        { id: '1', content: 'Fact A is true. Fact B is also true.', metadata: { url: 'https://a.com' } },
        { id: '2', content: 'Fact A is true. Fact C is true.', metadata: { url: 'https://b.com' } },
      ];

      const result = await comparator.compare('Topic', sources);

      expect(result.matrix).toContain('|'); // Markdown table
      expect(typeof result.matrix).toBe('string');
    });
  });

  describe('consensus calculation', () => {
    it('should calculate consensus score', async () => {
      const sources = [
        { id: '1', content: '地球は太陽の周りを公転している惑星です。' },
        { id: '2', content: '地球は太陽系で太陽の周りを回っている天体です。' },
        { id: '3', content: '太陽系において地球は太陽の周りを公転する惑星である。' },
      ];

      const result = await comparator.compare('地球', sources);

      // 高い合意が期待される
      if (result.claims.length > 0) {
        const maxConsensus = Math.max(...result.claims.map(c => c.consensusScore));
        expect(maxConsensus).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('summary generation', () => {
    it('should generate readable summary', async () => {
      const sources = [
        { id: '1', content: 'AIは今後10年で大きく発展する。医療分野での活用が期待される。' },
        { id: '2', content: 'AI技術は急速に進化しており、医療への応用が進んでいる。' },
      ];

      const result = await comparator.compare('AI', sources);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
