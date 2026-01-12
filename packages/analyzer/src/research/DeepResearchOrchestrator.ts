/**
 * DeepResearchOrchestrator - 深層リサーチの実行オーケストレーター
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

import { KnowledgeGraph } from '@nahisaho/katashiro-knowledge';
import { WideResearchEngine, type Finding } from '@nahisaho/katashiro-collector';
import { isOk } from '@nahisaho/katashiro-core';
import type {
  DeepResearchQuery,
  DeepResearchResult,
  ResearchProgress,
  SimpleKnowledgeGraph,
  KeyFinding,
  SourceReference,
  IterationRecord,
  UserGuidance,
} from './types.js';
import { GapAnalyzer } from './GapAnalyzer.js';
import { ConvergenceDetector } from './ConvergenceDetector.js';
import { QueryGenerator } from './QueryGenerator.js';
import { FindingIntegrator } from './FindingIntegrator.js';

const DEFAULT_CONFIG = {
  maxIterations: 10,
  convergenceThreshold: 0.15,
  iterationTimeout: 60000, // 1分
  totalTimeout: 600000, // 10分
  depthPriority: 'balanced' as const,
};

/**
 * 深層リサーチを実行するオーケストレーター
 *
 * @example
 * ```typescript
 * const orchestrator = new DeepResearchOrchestrator();
 *
 * // 基本的な使い方
 * for await (const progress of orchestrator.research({
 *   topic: 'AI ethics',
 *   focusAreas: ['privacy', 'bias'],
 * })) {
 *   console.log(`Iteration ${progress.iteration}: ${progress.phase}`);
 *   console.log(`Novelty: ${(progress.noveltyRate * 100).toFixed(1)}%`);
 * }
 *
 * // 結果の取得
 * const result = orchestrator.getResult();
 * console.log(`Total findings: ${result.keyFindings.length}`);
 * ```
 */
export class DeepResearchOrchestrator {
  private wideResearch: WideResearchEngine;
  private gapAnalyzer: GapAnalyzer;
  private convergenceDetector: ConvergenceDetector;
  private queryGenerator: QueryGenerator;
  private findingIntegrator: FindingIntegrator;
  private currentResult: DeepResearchResult | null = null;

  constructor() {
    this.wideResearch = new WideResearchEngine();
    this.gapAnalyzer = new GapAnalyzer();
    this.convergenceDetector = new ConvergenceDetector();
    this.queryGenerator = new QueryGenerator();
    this.findingIntegrator = new FindingIntegrator();
  }

  /**
   * 深層リサーチを実行（AsyncGenerator）
   */
  async *research(query: DeepResearchQuery): AsyncGenerator<ResearchProgress, void, UserGuidance | undefined> {
    const config = { ...DEFAULT_CONFIG, ...query };
    const startTime = Date.now();

    // 知識グラフを初期化
    const graph = new KnowledgeGraph();
    this.addRootNode(graph, query.topic);

    // 状態の初期化
    const iterations: IterationRecord[] = [];
    const allSources: SourceReference[] = [];
    const noveltyRates: number[] = [];
    let totalFindingsProcessed = 0;
    let completionReason: 'converged' | 'max_iterations' | 'timeout' | 'user_stopped' = 'max_iterations';

    for (let i = 0; i < config.maxIterations; i++) {
      // タイムアウトチェック
      if (Date.now() - startTime > config.totalTimeout) {
        completionReason = 'timeout';
        break;
      }

      // フェーズ1: クエリ生成
      const queries =
        i === 0
          ? this.queryGenerator.generateInitialQueries(query.topic, query.focusAreas, query.context)
          : this.queryGenerator.generateFromGaps(
              await this.gapAnalyzer.analyze(
                this.findingIntegrator.toSimpleGraph(graph),
                query.topic,
                query.focusAreas
              ),
              this.findingIntegrator.toSimpleGraph(graph),
              query.excludeAreas
            );

      // クエリが生成できない場合は終了
      if (queries.length === 0) {
        completionReason = 'converged';
        break;
      }

      // フェーズ2: 検索実行
      yield {
        iteration: i + 1,
        phase: 'searching' as const,
        currentQuery: queries[0] || '',
        totalFindingsCount: totalFindingsProcessed,
        noveltyRate: i > 0 ? noveltyRates[noveltyRates.length - 1] || 0 : 1,
        convergenceScore: this.convergenceDetector.calculate(
          noveltyRates,
          i > 0 ? noveltyRates[noveltyRates.length - 1] || 0 : 1
        ),
        gaps: [],
        elapsedTime: Date.now() - startTime,
      };

      const findings: Finding[] = [];
      for (const q of queries.slice(0, 3)) {
        // 最大3クエリ
        try {
          const result = await this.wideResearch.research({
            topic: q,
            depth: 'medium',
            maxResultsPerSource: 5,
            agentTimeout: config.iterationTimeout / 3,
          });
          
          if (isOk(result)) {
            findings.push(...result.value.findings);

            // ソース情報を収集
            for (const source of result.value.sources) {
              allSources.push({
                url: `search://${source.type}/${encodeURIComponent(source.query)}`,
                title: `${source.type}: ${source.query}`,
                type: source.type,
                accessedAt: new Date(),
              });
            }
          }
        } catch {
          // 検索エラーは無視して続行
        }
      }

      // フェーズ3: 統合
      yield {
        iteration: i + 1,
        phase: 'integrating' as const,
        currentQuery: queries[0] || '',
        totalFindingsCount: totalFindingsProcessed,
        noveltyRate: i > 0 ? noveltyRates[noveltyRates.length - 1] || 0 : 1,
        convergenceScore: this.convergenceDetector.calculate(
          noveltyRates,
          i > 0 ? noveltyRates[noveltyRates.length - 1] || 0 : 1
        ),
        gaps: [],
        elapsedTime: Date.now() - startTime,
      };

      const previousNodeCount = graph.getAllNodes().length;
      const integrationResult = await this.findingIntegrator.integrate(graph, findings, query.topic);

      // 新規情報率を計算
      const noveltyRate = previousNodeCount > 0 ? integrationResult.newNodesCount / previousNodeCount : 1;
      noveltyRates.push(noveltyRate);
      totalFindingsProcessed += findings.length;

      // イテレーション記録
      iterations.push({
        iterationNumber: i + 1,
        queries,
        findingsCount: findings.length,
        newNodesCount: integrationResult.newNodesCount,
        newEdgesCount: integrationResult.newEdgesCount,
        noveltyRate,
        duration: Date.now() - startTime - iterations.reduce((sum, r) => sum + r.duration, 0),
      });

      // フェーズ4: ギャップ分析
      const gaps = await this.gapAnalyzer.analyze(
        this.findingIntegrator.toSimpleGraph(graph),
        query.topic,
        query.focusAreas
      );

      yield {
        iteration: i + 1,
        phase: 'analyzing' as const,
        currentQuery: queries[0] || '',
        totalFindingsCount: totalFindingsProcessed,
        noveltyRate,
        convergenceScore: this.convergenceDetector.calculate(noveltyRates.slice(0, -1), noveltyRate),
        gaps,
        elapsedTime: Date.now() - startTime,
      };

      // 収束チェック
      if (this.convergenceDetector.hasConverged(noveltyRates.slice(0, -1), noveltyRate, config.convergenceThreshold)) {
        completionReason = 'converged';
        break;
      }

      // ユーザーガイダンス（オプション）
      if (query.userGuidance && gaps.length > 0) {
        const guidance = yield {
          iteration: i + 1,
          phase: 'waiting_guidance' as const,
          currentQuery: queries[0] || '',
          totalFindingsCount: totalFindingsProcessed,
          noveltyRate,
          convergenceScore: this.convergenceDetector.calculate(noveltyRates.slice(0, -1), noveltyRate),
          gaps,
          elapsedTime: Date.now() - startTime,
        };

        // ユーザーからの停止指示
        if (guidance?.action === 'stop') {
          completionReason = 'user_stopped';
          break;
        }
      }
    }

    // 最終結果を構築
    const simpleGraph = this.findingIntegrator.toSimpleGraph(graph);
    const remainingGaps = await this.gapAnalyzer.analyze(simpleGraph, query.topic, query.focusAreas);

    this.currentResult = {
      topic: query.topic,
      knowledgeGraph: simpleGraph,
      summary: this.generateSummary(simpleGraph, query.topic),
      keyFindings: this.extractKeyFindings(simpleGraph),
      sources: allSources,
      iterations,
      remainingGaps,
      statistics: {
        totalIterations: iterations.length,
        totalFindingsProcessed,
        totalNodesCreated: simpleGraph.nodes.length,
        totalEdgesCreated: simpleGraph.edges.length,
        averageNoveltyRate:
          noveltyRates.length > 0 ? noveltyRates.reduce((sum, r) => sum + r, 0) / noveltyRates.length : 0,
        totalDuration: Date.now() - startTime,
      },
      completionReason,
    };

    // 最終進捗
    yield {
      iteration: iterations.length,
      phase: 'completed' as const,
      currentQuery: '',
      totalFindingsCount: totalFindingsProcessed,
      noveltyRate: noveltyRates.length > 0 ? noveltyRates[noveltyRates.length - 1] || 0 : 0,
      convergenceScore: 1,
      gaps: remainingGaps,
      elapsedTime: Date.now() - startTime,
    };
  }

  /**
   * 最終結果を取得
   */
  getResult(): DeepResearchResult | null {
    return this.currentResult;
  }

  /**
   * ルートノードを追加
   */
  private addRootNode(graph: KnowledgeGraph, topic: string): void {
    graph.addNode({
      id: `topic-${this.normalizeId(topic)}`,
      type: 'topic',
      label: topic,
      properties: {
        name: topic,
        isRoot: true,
      },
    });
  }

  /**
   * サマリーを生成
   */
  private generateSummary(graph: SimpleKnowledgeGraph, topic: string): string {
    const findingCount = graph.nodes.filter((n) => n.type === 'finding').length;
    const conceptCount = graph.nodes.filter((n) => n.type === 'concept').length;
    const entityCount = graph.nodes.filter((n) => !['finding', 'concept', 'topic'].includes(n.type)).length;

    const topConcepts = graph.nodes
      .filter((n) => n.type === 'concept')
      .slice(0, 5)
      .map((n) => n.label)
      .join(', ');

    return `Research on "${topic}" identified ${findingCount} findings, ${conceptCount} concepts, and ${entityCount} entities. Key concepts include: ${topConcepts || 'N/A'}.`;
  }

  /**
   * 主要発見を抽出
   */
  private extractKeyFindings(graph: SimpleKnowledgeGraph): KeyFinding[] {
    return graph.nodes
      .filter((n) => n.type === 'finding')
      .sort((a, b) => ((b.properties.relevanceScore as number) || 0) - ((a.properties.relevanceScore as number) || 0))
      .slice(0, 10)
      .map((node) => ({
        id: node.id,
        title: node.label,
        summary: (node.properties.description as string) || '',
        importance: (((node.properties.relevanceScore as number) || 0) > 0.7 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        sources: [(node.properties.url as string) || ''],
        relatedConcepts: [] as string[],
      }));
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
}
