/**
 * QueryGenerator - リサーチクエリを生成
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import type { KnowledgeGap, SimpleKnowledgeGraph } from './types.js';

/**
 * リサーチクエリを生成するクラス
 *
 * @example
 * ```typescript
 * const generator = new QueryGenerator();
 *
 * // 初期クエリを生成
 * const initial = generator.generateInitialQueries('AI ethics', ['privacy', 'bias']);
 * // => ['AI ethics', 'AI ethics privacy', 'AI ethics bias', 'AI ethics overview', ...]
 *
 * // ギャップからクエリを生成
 * const fromGaps = generator.generateFromGaps(gaps, graph, ['politics']);
 * ```
 */
export class QueryGenerator {
  /**
   * 初期クエリを生成
   */
  generateInitialQueries(
    topic: string,
    focusAreas?: string[],
    _context?: string
  ): string[] {
    const queries: string[] = [topic];

    // フォーカスエリアを追加
    if (focusAreas) {
      for (const area of focusAreas) {
        queries.push(`${topic} ${area}`);
      }
    }

    // 一般的な拡張クエリ
    queries.push(`${topic} overview`, `${topic} research`, `${topic} latest developments`);

    return [...new Set(queries)]; // 重複除去
  }

  /**
   * 知識ギャップからクエリを生成
   */
  generateFromGaps(
    gaps: KnowledgeGap[],
    graph: SimpleKnowledgeGraph,
    excludeAreas?: string[]
  ): string[] {
    const queries: string[] = [];

    // 優先度順にギャップを処理
    for (const gap of gaps) {
      // 除外エリアに該当するかチェック
      if (
        excludeAreas?.some((area) =>
          gap.relatedTopics.some((t) => t.toLowerCase().includes(area.toLowerCase()))
        )
      ) {
        continue;
      }

      queries.push(...gap.suggestedQueries);
    }

    // 既存ノードとの関連クエリ
    const highValueNodes = graph.nodes
      .filter((n) => n.type === 'concept' && n.properties.importance === 'high')
      .slice(0, 3);

    for (const node of highValueNodes) {
      const nodeName = node.properties.name as string;
      if (nodeName) {
        queries.push(`${nodeName} detailed analysis`);
      }
    }

    return [...new Set(queries)].slice(0, 10); // 重複除去、最大10クエリ
  }

  /**
   * クエリを拡張（同義語・関連語を追加）
   */
  expandQuery(query: string): string[] {
    const expanded: string[] = [query];

    // シンプルな拡張（将来的にはNLPベースの拡張を実装）
    const variations = [
      `${query} definition`,
      `${query} examples`,
      `${query} applications`,
      `what is ${query}`,
    ];

    return [...expanded, ...variations];
  }
}
