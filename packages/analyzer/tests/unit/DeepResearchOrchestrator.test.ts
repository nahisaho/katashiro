/**
 * DeepResearchOrchestrator - ユニットテスト
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConvergenceDetector } from '../../src/research/ConvergenceDetector.js';
import { QueryGenerator } from '../../src/research/QueryGenerator.js';
import { GapAnalyzer } from '../../src/research/GapAnalyzer.js';
import type { SimpleKnowledgeGraph, KnowledgeGap } from '../../src/research/types.js';

describe('ConvergenceDetector', () => {
  let detector: ConvergenceDetector;

  beforeEach(() => {
    detector = new ConvergenceDetector();
  });

  describe('calculate', () => {
    it('空の履歴では0を返す', () => {
      const score = detector.calculate([], 0.5);
      expect(score).toBe(0);
    });

    it('新規情報率が低いほど高い収束スコアを返す', () => {
      const highNoveltyScore = detector.calculate([0.8, 0.7], 0.6);
      const lowNoveltyScore = detector.calculate([0.2, 0.15], 0.1);
      expect(lowNoveltyScore).toBeGreaterThan(highNoveltyScore);
    });

    it('減少傾向の場合はより高い収束スコアを返す', () => {
      const decreasingScore = detector.calculate([0.5, 0.4], 0.3);
      const increasingScore = detector.calculate([0.3, 0.4], 0.5);
      expect(decreasingScore).toBeGreaterThan(increasingScore);
    });

    it('収束スコアは0から1の範囲内', () => {
      const score = detector.calculate([0.5, 0.4, 0.3], 0.2);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('hasConverged', () => {
    it('収束閾値以下で収束と判定', () => {
      // 低い新規情報率で収束
      // convergence score = (1 - avg(rates)) * 0.7 + trend * 0.3
      // threshold 0.15 => score >= 0.85 で収束
      const converged = detector.hasConverged([0.1, 0.08, 0.05], 0.02, 0.15);
      expect(converged).toBe(true);
    });

    it('高い新規情報率では収束しない', () => {
      const converged = detector.hasConverged([0.6, 0.5], 0.5, 0.15);
      expect(converged).toBe(false);
    });
  });
});

describe('QueryGenerator', () => {
  let generator: QueryGenerator;

  beforeEach(() => {
    generator = new QueryGenerator();
  });

  describe('generateInitialQueries', () => {
    it('トピックを含むクエリを生成', () => {
      const queries = generator.generateInitialQueries('AI ethics');
      expect(queries).toContain('AI ethics');
    });

    it('フォーカスエリアを含むクエリを生成', () => {
      const queries = generator.generateInitialQueries('AI ethics', ['privacy', 'bias']);
      expect(queries.some((q) => q.includes('privacy'))).toBe(true);
      expect(queries.some((q) => q.includes('bias'))).toBe(true);
    });

    it('重複のないクエリを生成', () => {
      const queries = generator.generateInitialQueries('AI ethics', ['privacy']);
      const uniqueQueries = [...new Set(queries)];
      expect(queries.length).toBe(uniqueQueries.length);
    });

    it('一般的な拡張クエリを含む', () => {
      const queries = generator.generateInitialQueries('machine learning');
      expect(queries.some((q) => q.includes('overview'))).toBe(true);
      expect(queries.some((q) => q.includes('research'))).toBe(true);
    });
  });

  describe('generateFromGaps', () => {
    it('ギャップからクエリを生成', () => {
      const gaps: KnowledgeGap[] = [
        {
          id: 'gap-1',
          description: 'Missing privacy information',
          type: 'unexplored_aspect',
          relatedTopics: ['privacy'],
          suggestedQueries: ['AI privacy concerns', 'data protection AI'],
          priority: 'high',
        },
      ];

      const graph: SimpleKnowledgeGraph = { nodes: [], edges: [] };
      const queries = generator.generateFromGaps(gaps, graph);

      expect(queries).toContain('AI privacy concerns');
      expect(queries).toContain('data protection AI');
    });

    it('除外エリアに関連するギャップをスキップ', () => {
      const gaps: KnowledgeGap[] = [
        {
          id: 'gap-1',
          description: 'Politics related',
          type: 'unexplored_aspect',
          relatedTopics: ['politics'],
          suggestedQueries: ['AI politics'],
          priority: 'medium',
        },
      ];

      const graph: SimpleKnowledgeGraph = { nodes: [], edges: [] };
      const queries = generator.generateFromGaps(gaps, graph, ['politics']);

      expect(queries).not.toContain('AI politics');
    });

    it('最大10クエリまでに制限', () => {
      const gaps: KnowledgeGap[] = Array.from({ length: 20 }, (_, i) => ({
        id: `gap-${i}`,
        description: `Gap ${i}`,
        type: 'unexplored_aspect' as const,
        relatedTopics: [`topic${i}`],
        suggestedQueries: [`query${i}`],
        priority: 'medium' as const,
      }));

      const graph: SimpleKnowledgeGraph = { nodes: [], edges: [] };
      const queries = generator.generateFromGaps(gaps, graph);

      expect(queries.length).toBeLessThanOrEqual(10);
    });
  });

  describe('expandQuery', () => {
    it('クエリを拡張', () => {
      const expanded = generator.expandQuery('machine learning');

      expect(expanded).toContain('machine learning');
      expect(expanded.some((q) => q.includes('definition'))).toBe(true);
      expect(expanded.some((q) => q.includes('examples'))).toBe(true);
    });
  });
});

describe('GapAnalyzer', () => {
  let analyzer: GapAnalyzer;

  beforeEach(() => {
    analyzer = new GapAnalyzer();
  });

  describe('analyze', () => {
    it('空のグラフで一般的なカバレッジギャップを検出', async () => {
      const graph: SimpleKnowledgeGraph = { nodes: [], edges: [] };
      const gaps = await analyzer.analyze(graph, 'AI ethics');

      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps.some((g) => g.type === 'unexplored_aspect')).toBe(true);
    });

    it('孤立ノードを検出', async () => {
      const graph: SimpleKnowledgeGraph = {
        nodes: [
          {
            id: 'node-1',
            type: 'concept',
            label: 'Isolated Concept',
            properties: { name: 'Isolated Concept' },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'topic-root',
            type: 'topic',
            label: 'AI',
            properties: { name: 'AI' },
            createdAt: new Date().toISOString(),
          },
        ],
        edges: [],
      };

      const gaps = await analyzer.analyze(graph, 'AI');

      expect(gaps.some((g) => g.description.includes('Isolated Concept'))).toBe(true);
    });

    it('フォーカスエリアのカバレッジ不足を検出', async () => {
      const graph: SimpleKnowledgeGraph = {
        nodes: [
          {
            id: 'topic-root',
            type: 'topic',
            label: 'AI ethics',
            properties: { name: 'AI ethics' },
            createdAt: new Date().toISOString(),
          },
        ],
        edges: [],
      };

      const gaps = await analyzer.analyze(graph, 'AI ethics', ['privacy', 'fairness']);

      expect(gaps.some((g) => g.description.includes('privacy'))).toBe(true);
      expect(gaps.some((g) => g.description.includes('fairness'))).toBe(true);
    });

    it('優先度順にソート', async () => {
      const graph: SimpleKnowledgeGraph = {
        nodes: [
          {
            id: 'topic-root',
            type: 'topic',
            label: 'AI',
            properties: { name: 'AI' },
            createdAt: new Date().toISOString(),
          },
        ],
        edges: [],
      };

      const gaps = await analyzer.analyze(graph, 'AI', ['critical-area']);

      // 最初のギャップは高優先度
      if (gaps.length > 1) {
        const priorityOrder = ['high', 'medium', 'low'];
        const firstIndex = priorityOrder.indexOf(gaps[0].priority);
        const lastIndex = priorityOrder.indexOf(gaps[gaps.length - 1].priority);
        expect(firstIndex).toBeLessThanOrEqual(lastIndex);
      }
    });
  });
});
