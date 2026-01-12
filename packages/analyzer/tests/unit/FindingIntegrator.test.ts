/**
 * FindingIntegrator - ユニットテスト
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph } from '@nahisaho/katashiro-knowledge';
import { FindingIntegrator } from '../../src/research/FindingIntegrator.js';
import type { Finding } from '@nahisaho/katashiro-collector';

describe('FindingIntegrator', () => {
  let integrator: FindingIntegrator;
  let graph: KnowledgeGraph;

  beforeEach(() => {
    integrator = new FindingIntegrator();
    graph = new KnowledgeGraph();
    
    // ルートノードを追加
    graph.addNode({
      id: 'topic-ai',
      type: 'topic',
      label: 'AI',
      properties: { name: 'AI', isRoot: true },
    });
  });

  describe('integrate', () => {
    it('Findingをノードとして追加', async () => {
      const findings: Finding[] = [
        {
          id: 'f1',
          title: 'Machine Learning Advances',
          summary: 'Recent advances in machine learning technology.',
          url: 'https://example.com/ml',
          sourceType: 'web',
          sourceName: 'Example',
          relevanceScore: 0.8,
          credibilityScore: 0.9,
        },
      ];

      const result = await integrator.integrate(graph, findings, 'AI');

      expect(result.newNodesCount).toBeGreaterThan(0);
      expect(graph.getNode('finding-f1')).not.toBeNull();
    });

    it('Findingからエンティティを抽出してノードに追加', async () => {
      const findings: Finding[] = [
        {
          id: 'f2',
          title: 'Google announces new AI model',
          summary: 'Google released a new AI model in Tokyo.',
          url: 'https://example.com/google-ai',
          sourceType: 'news',
          sourceName: 'TechNews',
          relevanceScore: 0.9,
          credibilityScore: 0.8,
        },
      ];

      const result = await integrator.integrate(graph, findings, 'AI');

      expect(result.newNodesCount).toBeGreaterThan(1); // Finding + entities
    });

    it('Findingとトピックをエッジで接続', async () => {
      const findings: Finding[] = [
        {
          id: 'f3',
          title: 'Deep Learning Overview',
          summary: 'An overview of deep learning techniques.',
          url: 'https://example.com/dl',
          sourceType: 'academic',
          sourceName: 'arXiv',
          relevanceScore: 0.85,
          credibilityScore: 0.95,
        },
      ];

      const result = await integrator.integrate(graph, findings, 'AI');

      expect(result.newEdgesCount).toBeGreaterThan(0);
      
      // トピックからFindingへのエッジを確認
      const edges = graph.getAllEdges();
      const hasTopicEdge = edges.some(
        (e) => e.source === 'topic-ai' && e.target === 'finding-f3'
      );
      expect(hasTopicEdge).toBe(true);
    });

    it('重複するFindingを追加しない', async () => {
      const findings: Finding[] = [
        {
          id: 'f4',
          title: 'AI Research',
          summary: 'Research on AI.',
          url: 'https://example.com/ai',
          sourceType: 'web',
          sourceName: 'Example',
          relevanceScore: 0.7,
          credibilityScore: 0.7,
        },
      ];

      // 最初の追加
      const result1 = await integrator.integrate(graph, findings, 'AI');
      const nodeCount1 = graph.getAllNodes().length;

      // 同じFindingを再追加
      const result2 = await integrator.integrate(graph, findings, 'AI');
      const nodeCount2 = graph.getAllNodes().length;

      expect(nodeCount2).toBe(nodeCount1);
      expect(result2.newNodesCount).toBe(0);
    });

    it('コンセプトキーワードを抽出してノードに追加', async () => {
      const findings: Finding[] = [
        {
          id: 'f5',
          title: 'Neural Networks and Deep Learning Fundamentals',
          summary: 'Basic concepts of neural networks.',
          url: 'https://example.com/nn',
          sourceType: 'encyclopedia',
          sourceName: 'Wikipedia',
          relevanceScore: 0.8,
          credibilityScore: 0.85,
        },
      ];

      await integrator.integrate(graph, findings, 'AI');

      // コンセプトノードが追加されていることを確認
      const nodes = graph.getAllNodes();
      const conceptNodes = nodes.filter((n) => n.type === 'concept');
      expect(conceptNodes.length).toBeGreaterThan(0);
    });
  });

  describe('toSimpleGraph', () => {
    it('KnowledgeGraphをSimpleKnowledgeGraphに変換', () => {
      graph.addNode({
        id: 'node-1',
        type: 'concept',
        label: 'ML',
        properties: { name: 'ML' },
      });

      graph.addEdge({
        source: 'topic-ai',
        target: 'node-1',
        predicate: 'relates_to',
      });

      const simple = integrator.toSimpleGraph(graph);

      expect(simple.nodes.length).toBe(2); // topic + concept
      expect(simple.edges.length).toBe(1);
    });
  });
});
