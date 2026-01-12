/**
 * FindingIntegrator - 検索結果を知識グラフに統合
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import { KnowledgeGraph } from '@nahisaho/katashiro-knowledge';
import type { Finding } from '@nahisaho/katashiro-collector';
import type { IntegrationResult, SimpleKnowledgeGraph } from './types.js';
import { EntityExtractor } from '../entity/index.js';

/**
 * 検索結果を知識グラフに統合するクラス
 *
 * @example
 * ```typescript
 * const integrator = new FindingIntegrator();
 *
 * const result = await integrator.integrate(graph, findings, 'AI ethics');
 * console.log(`Added ${result.newNodesCount} nodes, ${result.newEdgesCount} edges`);
 * ```
 */
export class FindingIntegrator {
  private entityExtractor: EntityExtractor;

  constructor() {
    this.entityExtractor = new EntityExtractor();
  }

  /**
   * Findingを知識グラフに統合
   */
  async integrate(
    graph: KnowledgeGraph,
    findings: Finding[],
    _topic: string
  ): Promise<IntegrationResult> {
    let newNodesCount = 0;
    let newEdgesCount = 0;
    let updatedNodesCount = 0;

    const existingNodeIds = new Set(graph.getAllNodes().map((n) => n.id));

    for (const finding of findings) {
      // Findingからノードを作成
      const findingNodeId = `finding-${finding.id}`;

      if (!existingNodeIds.has(findingNodeId)) {
        graph.addNode({
          id: findingNodeId,
          type: 'finding',
          label: finding.title,
          properties: {
            name: finding.title,
            description: finding.summary,
            url: finding.url,
            sourceType: finding.sourceType,
            sourceName: finding.sourceName,
            relevanceScore: finding.relevanceScore,
            credibilityScore: finding.credibilityScore,
            publishedAt: finding.publishedAt?.toISOString(),
            author: finding.author,
          },
        });
        existingNodeIds.add(findingNodeId);
        newNodesCount++;

        // ルートトピックとの関連を追加
        const rootNodes = graph.getAllNodes().filter((n) => n.type === 'topic');
        for (const rootNode of rootNodes) {
          try {
            graph.addEdge({
              source: rootNode.id,
              target: findingNodeId,
              predicate: 'has_finding',
              weight: finding.relevanceScore,
            });
            newEdgesCount++;
          } catch {
            // エッジが既に存在する場合はスキップ
          }
        }
      }

      // エンティティを抽出してノードとして追加
      const content = `${finding.title} ${finding.summary}`;
      const entities = await this.entityExtractor.extract(content);

      for (const entity of entities.all) {
        const entityNodeId = `entity-${entity.type}-${this.normalizeId(entity.text)}`;

        if (!existingNodeIds.has(entityNodeId)) {
          graph.addNode({
            id: entityNodeId,
            type: entity.type,
            label: entity.text,
            properties: {
              name: entity.text,
              entityType: entity.type,
              sources: [finding.url],
            },
          });
          existingNodeIds.add(entityNodeId);
          newNodesCount++;
        } else {
          // 既存ノードのソースを更新 - KnowledgeGraphには updateNode がないので追加はスキップ
          updatedNodesCount++;
        }

        // FindingとEntityの関連を追加
        const edgeId = `edge-${findingNodeId}-${entityNodeId}`;
        try {
          graph.addEdge({
            id: edgeId,
            source: findingNodeId,
            target: entityNodeId,
            predicate: 'mentions',
            weight: 1,
          });
          newEdgesCount++;
        } catch {
          // エッジが既に存在する場合はスキップ
        }
      }

      // キーワードベースのコンセプトノードを追加
      const conceptKeywords = this.extractConceptKeywords(finding.title);
      for (const keyword of conceptKeywords) {
        const conceptNodeId = `concept-${this.normalizeId(keyword)}`;

        if (!existingNodeIds.has(conceptNodeId)) {
          graph.addNode({
            id: conceptNodeId,
            type: 'concept',
            label: keyword,
            properties: {
              name: keyword,
              sources: [finding.url],
            },
          });
          existingNodeIds.add(conceptNodeId);
          newNodesCount++;
        }

        // FindingとConceptの関連を追加
        try {
          graph.addEdge({
            source: findingNodeId,
            target: conceptNodeId,
            predicate: 'relates_to',
            weight: 0.7,
          });
          newEdgesCount++;
        } catch {
          // エッジが既に存在する場合はスキップ
        }
      }
    }

    return {
      newNodesCount,
      newEdgesCount,
      updatedNodesCount,
    };
  }

  /**
   * グラフをシンプルな形式に変換
   */
  toSimpleGraph(graph: KnowledgeGraph): SimpleKnowledgeGraph {
    return {
      nodes: graph.getAllNodes(),
      edges: graph.getAllEdges(),
    };
  }

  /**
   * IDを正規化
   */
  private normalizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  /**
   * タイトルからコンセプトキーワードを抽出
   */
  private extractConceptKeywords(title: string): string[] {
    // シンプルな実装：重要そうな単語を抽出
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'of',
      'in',
      'to',
      'for',
      'with',
      'on',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'and',
      'or',
      'but',
      'not',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'how',
      'what',
      'when',
      'where',
      'who',
      'why',
    ]);

    const words = title
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // 最大3つのキーワードを返す
    return [...new Set(words)].slice(0, 3);
  }
}
