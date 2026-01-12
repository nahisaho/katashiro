/**
 * RelationAnalyzer - エンティティ間関係分析
 *
 * @requirement REQ-ANALYZE-009
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-023
 */

import type { Entity, EntityType } from '../entity/entity-extractor.js';

/**
 * 関係タイプ
 */
export type RelationType =
  | 'works_for'
  | 'located_in'
  | 'owns'
  | 'part_of'
  | 'temporal'
  | 'causal'
  | 'related';

/**
 * エンティティペア
 */
export interface EntityPair {
  readonly source: Entity;
  readonly target: Entity;
  readonly distance: number;
  readonly context: string;
}

/**
 * 抽出された関係
 */
export interface Relation {
  readonly type: RelationType;
  readonly source: Entity;
  readonly target: Entity;
  readonly confidence: number;
  readonly evidence?: string;
}

/**
 * 関係グラフのノード
 */
export interface GraphNode {
  readonly id: string;
  readonly entity: Entity;
}

/**
 * 関係グラフのエッジ
 */
export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly type: RelationType;
  readonly confidence: number;
}

/**
 * 関係グラフ
 */
export interface RelationGraph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

/**
 * 関係パターン
 */
interface RelationPattern {
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
  keywords: RegExp[];
  relationType: RelationType;
}

/**
 * 関係パターン定義
 */
const RELATION_PATTERNS: RelationPattern[] = [
  {
    sourceTypes: ['person'],
    targetTypes: ['organization'],
    keywords: [/働[いくけ]/, /勤務/, /所属/, /社員/, /従業員/, /の[社会]長/, /の部長/, /の課長/],
    relationType: 'works_for',
  },
  {
    sourceTypes: ['organization', 'person'],
    targetTypes: ['location'],
    keywords: [/にある/, /にあり/, /へある/, /へあり/, /に位置/, /へ位置/, /に所在/, /へ所在/, /本社/, /拠点/, /オフィス/, /住[むん]/],
    relationType: 'located_in',
  },
  {
    sourceTypes: ['person', 'organization'],
    targetTypes: ['organization'],
    keywords: [/所有/, /保有/, /オーナー/, /買収/, /傘下/],
    relationType: 'owns',
  },
  {
    sourceTypes: ['organization'],
    targetTypes: ['organization'],
    keywords: [/子会社/, /グループ/, /部門/, /一部/, /傘下/],
    relationType: 'part_of',
  },
];

/**
 * エンティティ間関係分析実装
 */
export class RelationAnalyzer {
  /**
   * テキストとエンティティから関係を抽出
   */
  extractRelations(text: string, entities: Entity[]): Relation[] {
    if (entities.length < 2) {
      // Check for temporal relations with single date entity
      const dateEntities = entities.filter(e => e.type === 'date');
      if (dateEntities.length > 0) {
        return dateEntities.map(e => ({
          type: 'temporal' as RelationType,
          source: e,
          target: e,
          confidence: 0.7,
          evidence: text,
        }));
      }
      return [];
    }

    const relations: Relation[] = [];
    const pairs = this.findCooccurrences(text, entities);

    for (const pair of pairs) {
      const relationType = this.inferRelationType(pair);
      const confidence = this.calculateConfidence(pair, relationType);

      if (confidence > 0.3) {
        relations.push({
          type: relationType,
          source: pair.source,
          target: pair.target,
          confidence,
          evidence: pair.context,
        });
      }
    }

    return relations;
  }

  /**
   * エンティティの共起を検出
   */
  findCooccurrences(text: string, entities: Entity[]): EntityPair[] {
    const pairs: EntityPair[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];
        if (!e1 || !e2) continue;

        const distance = Math.abs(e1.end - e2.start);
        const start = Math.min(e1.start, e2.start);
        const end = Math.max(e1.end, e2.end);
        const context = text.slice(Math.max(0, start - 10), Math.min(text.length, end + 10));

        pairs.push({
          source: e1,
          target: e2,
          distance,
          context,
        });
      }
    }

    return pairs;
  }

  /**
   * 関係タイプを推論
   */
  inferRelationType(pair: EntityPair): RelationType {
    const { source, target, context } = pair;

    // Check patterns
    for (const pattern of RELATION_PATTERNS) {
      const sourceMatch = pattern.sourceTypes.includes(source.type);
      const targetMatch = pattern.targetTypes.includes(target.type);

      if (sourceMatch && targetMatch) {
        for (const keyword of pattern.keywords) {
          if (keyword.test(context)) {
            return pattern.relationType;
          }
        }
      }

      // Also check reverse
      const reverseSourceMatch = pattern.sourceTypes.includes(target.type);
      const reverseTargetMatch = pattern.targetTypes.includes(source.type);

      if (reverseSourceMatch && reverseTargetMatch) {
        for (const keyword of pattern.keywords) {
          if (keyword.test(context)) {
            return pattern.relationType;
          }
        }
      }
    }

    // Default fallback
    return 'related';
  }

  /**
   * 関係の信頼度を計算
   */
  private calculateConfidence(pair: EntityPair, relationType: RelationType): number {
    let confidence = 0.5;

    // Distance factor: closer entities have higher confidence
    if (pair.distance < 10) {
      confidence += 0.2;
    } else if (pair.distance < 30) {
      confidence += 0.1;
    }

    // Type-specific confidence boost
    if (relationType !== 'related') {
      confidence += 0.2;
    }

    // Context length factor
    if (pair.context.length > 20) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 関係からグラフを構築
   */
  buildRelationGraph(relations: Relation[]): RelationGraph {
    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const relation of relations) {
      // Add source node
      const sourceId = `${relation.source.type}:${relation.source.text}`;
      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, {
          id: sourceId,
          entity: relation.source,
        });
      }

      // Add target node (if different from source)
      const targetId = `${relation.target.type}:${relation.target.text}`;
      if (!nodeMap.has(targetId) && relation.source !== relation.target) {
        nodeMap.set(targetId, {
          id: targetId,
          entity: relation.target,
        });
      }

      // Add edge (only if source and target are different)
      if (sourceId !== targetId) {
        edges.push({
          source: sourceId,
          target: targetId,
          type: relation.type,
          confidence: relation.confidence,
        });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }
}
