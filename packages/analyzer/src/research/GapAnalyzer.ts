/**
 * GapAnalyzer - 知識グラフのギャップを分析
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import type { GraphNode } from '@nahisaho/katashiro-knowledge';
import type { KnowledgeGap, SimpleKnowledgeGraph } from './types.js';

/**
 * 知識グラフのギャップを分析するクラス
 *
 * @example
 * ```typescript
 * const analyzer = new GapAnalyzer();
 *
 * const gaps = await analyzer.analyze(graph, 'AI ethics', ['privacy', 'bias']);
 * for (const gap of gaps) {
 *   console.log(`[${gap.priority}] ${gap.description}`);
 *   console.log(`  Suggested queries: ${gap.suggestedQueries.join(', ')}`);
 * }
 * ```
 */
export class GapAnalyzer {
  /**
   * 知識グラフのギャップを分析
   */
  async analyze(
    graph: SimpleKnowledgeGraph,
    topic: string,
    focusAreas?: string[]
  ): Promise<KnowledgeGap[]> {
    const gaps: KnowledgeGap[] = [];

    // 1. 孤立ノードの検出（未探索の側面）
    const isolatedNodes = this.findIsolatedNodes(graph);
    for (const node of isolatedNodes) {
      const nodeName = (node.properties.name as string) || node.label;
      gaps.push({
        id: `gap-isolated-${node.id}`,
        description: `"${nodeName}" has no connections - may need deeper exploration`,
        type: 'unexplored_aspect',
        relatedTopics: [nodeName],
        suggestedQueries: [
          `${nodeName} ${topic}`,
          `${nodeName} applications`,
          `${nodeName} research`,
        ],
        priority: 'medium',
      });
    }

    // 2. フォーカスエリアのカバレッジ不足
    if (focusAreas) {
      for (const area of focusAreas) {
        const coverage = this.assessAreaCoverage(graph, area);
        if (coverage < 0.3) {
          gaps.push({
            id: `gap-coverage-${area.replace(/\s+/g, '-')}`,
            description: `Focus area "${area}" has low coverage (${(coverage * 100).toFixed(0)}%)`,
            type: 'unexplored_aspect',
            relatedTopics: [area],
            suggestedQueries: [
              `${topic} ${area}`,
              `${area} latest research`,
              `${area} case studies`,
            ],
            priority: 'high',
          });
        }
      }
    }

    // 3. 深掘りが必要なノード
    const needsDepth = this.findNeedsDepth(graph);
    for (const node of needsDepth) {
      const nodeName = (node.properties.name as string) || node.label;
      gaps.push({
        id: `gap-depth-${node.id}`,
        description: `"${nodeName}" is mentioned frequently but lacks detailed information`,
        type: 'depth_needed',
        relatedTopics: [nodeName],
        suggestedQueries: [
          `${nodeName} detailed analysis`,
          `${nodeName} comprehensive guide`,
          `${nodeName} in depth`,
        ],
        priority: 'medium',
      });
    }

    // 4. 全体的なカバレッジが少ない場合
    if (graph.nodes.length < 5) {
      gaps.push({
        id: 'gap-general-coverage',
        description: 'Overall knowledge coverage is low',
        type: 'unexplored_aspect',
        relatedTopics: [topic],
        suggestedQueries: [
          `${topic} fundamentals`,
          `${topic} key concepts`,
          `${topic} overview comprehensive`,
        ],
        priority: 'high',
      });
    }

    return gaps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 孤立ノードを検出
   */
  private findIsolatedNodes(graph: SimpleKnowledgeGraph): GraphNode[] {
    const connectedIds = new Set<string>();

    for (const edge of graph.edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }

    return graph.nodes.filter((node) => !connectedIds.has(node.id) && node.type !== 'topic');
  }

  /**
   * フォーカスエリアのカバレッジを評価
   */
  private assessAreaCoverage(graph: SimpleKnowledgeGraph, area: string): number {
    const areaLower = area.toLowerCase();

    const relevantNodes = graph.nodes.filter((node) => {
      const name = ((node.properties.name as string) || '').toLowerCase();
      const desc = ((node.properties.description as string) || '').toLowerCase();
      const label = (node.label || '').toLowerCase();
      return name.includes(areaLower) || desc.includes(areaLower) || label.includes(areaLower);
    });

    // カバレッジスコア（最大10ノードで100%）
    return Math.min(relevantNodes.length / 10, 1);
  }

  /**
   * 深掘りが必要なノードを検出
   */
  private findNeedsDepth(graph: SimpleKnowledgeGraph): GraphNode[] {
    const mentionCounts = new Map<string, number>();

    for (const edge of graph.edges) {
      mentionCounts.set(edge.source, (mentionCounts.get(edge.source) || 0) + 1);
      mentionCounts.set(edge.target, (mentionCounts.get(edge.target) || 0) + 1);
    }

    // 多く言及されているが詳細情報が少ないノード
    return graph.nodes.filter((node) => {
      const mentions = mentionCounts.get(node.id) || 0;
      const hasDescription = !!(node.properties.description as string);
      const descLength = ((node.properties.description as string) || '').length;

      return mentions >= 3 && (!hasDescription || descLength < 100);
    });
  }
}
