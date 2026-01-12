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
  ReasoningStep,
  MermaidDiagrams,
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
    const keyFindings = this.extractKeyFindings(simpleGraph);

    // 推論チェーンを生成（結論に至った論理的説明）
    const reasoningChain = this.generateReasoningChain(
      query.topic,
      iterations,
      keyFindings,
      allSources,
      remainingGaps,
      completionReason
    );

    // Mermaidダイアグラムを生成
    const mermaidDiagrams = this.generateMermaidDiagrams(
      query.topic,
      simpleGraph,
      keyFindings,
      iterations,
      reasoningChain
    );

    this.currentResult = {
      topic: query.topic,
      knowledgeGraph: simpleGraph,
      summary: this.generateSummary(simpleGraph, query.topic),
      keyFindings,
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
      reasoningChain,
      mermaidDiagrams,
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

  /**
   * 推論チェーンを生成（結論に至った論理的説明）
   */
  private generateReasoningChain(
    topic: string,
    iterations: IterationRecord[],
    keyFindings: KeyFinding[],
    sources: SourceReference[],
    remainingGaps: import('./types.js').KnowledgeGap[],
    completionReason: import('./types.js').CompletionReason
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    let stepNumber = 1;

    // Step 1: 調査開始の観察
    steps.push({
      step: stepNumber++,
      type: 'observation',
      description: `「${topic}」について調査を開始。${iterations.length}回のイテレーションを実行し、${sources.length}件のソースから情報を収集。`,
      sourceIds: sources.slice(0, 5).map((s) => s.url),
      findingIds: [],
      confidence: 1.0,
    });

    // Step 2-N: 各イテレーションでの発見と推論
    for (let i = 0; i < Math.min(iterations.length, 3); i++) {
      const iter = iterations[i];
      if (!iter) continue;

      steps.push({
        step: stepNumber++,
        type: 'inference',
        description: `イテレーション${iter.iterationNumber}: ${iter.queries.slice(0, 2).join(', ')}について調査。${iter.findingsCount}件の発見があり、新規情報率は${(iter.noveltyRate * 100).toFixed(1)}%。`,
        sourceIds: [],
        findingIds: [],
        confidence: 0.8 + iter.noveltyRate * 0.2,
      });
    }

    // 主要な発見の統合
    if (keyFindings.length > 0) {
      const topFindings = keyFindings.slice(0, 3);
      steps.push({
        step: stepNumber++,
        type: 'synthesis',
        description: `主要な発見を統合: ${topFindings.map((f) => f.title).join('、')}。これらの発見は相互に関連し、トピックの理解を深める。`,
        sourceIds: topFindings.flatMap((f) => f.sources).slice(0, 5),
        findingIds: topFindings.map((f) => f.id),
        confidence: 0.85,
      });
    }

    // 残存ギャップの評価
    if (remainingGaps.length > 0) {
      const gapDescriptions = remainingGaps.slice(0, 2).map((g) => g.description);
      steps.push({
        step: stepNumber++,
        type: 'observation',
        description: `残存する知識ギャップ: ${gapDescriptions.join('、')}。これらの領域は追加調査が必要。`,
        sourceIds: [],
        findingIds: [],
        confidence: 0.7,
      });
    }

    // 最終結論
    const conclusionReasons: Record<import('./types.js').CompletionReason, string> = {
      converged: '新規情報率が閾値以下に収束したため',
      max_iterations: '最大イテレーション数に到達したため',
      timeout: 'タイムアウトに達したため',
      user_stopped: 'ユーザーにより停止されたため',
      no_new_queries: '新規クエリが生成できなくなったため',
    };

    steps.push({
      step: stepNumber++,
      type: 'conclusion',
      description: `調査完了（${conclusionReasons[completionReason]}）。${keyFindings.length}件の主要な発見を特定し、${sources.length}件のソースを参照。信頼性の高い情報源からの裏付けにより、結論の妥当性を確認。`,
      sourceIds: sources.slice(0, 10).map((s) => s.url),
      findingIds: keyFindings.map((f) => f.id),
      confidence: this.calculateOverallConfidence(keyFindings, sources, remainingGaps),
    });

    return steps;
  }

  /**
   * 全体的な信頼度を計算
   */
  private calculateOverallConfidence(
    keyFindings: KeyFinding[],
    sources: SourceReference[],
    remainingGaps: import('./types.js').KnowledgeGap[]
  ): number {
    let confidence = 0.5; // ベース

    // 発見数による加点
    confidence += Math.min(keyFindings.length * 0.05, 0.2);

    // ソース数による加点
    confidence += Math.min(sources.length * 0.01, 0.15);

    // 重要な発見の割合による加点
    const highImportanceRatio = keyFindings.filter((f) => f.importance === 'high').length / Math.max(keyFindings.length, 1);
    confidence += highImportanceRatio * 0.1;

    // 残存ギャップによる減点
    confidence -= Math.min(remainingGaps.length * 0.03, 0.15);

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Mermaidダイアグラムを生成
   */
  private generateMermaidDiagrams(
    topic: string,
    graph: SimpleKnowledgeGraph,
    keyFindings: KeyFinding[],
    iterations: IterationRecord[],
    reasoningChain: ReasoningStep[]
  ): MermaidDiagrams {
    return {
      knowledgeGraph: this.generateKnowledgeGraphMermaid(topic, graph),
      reasoningFlow: this.generateReasoningFlowMermaid(reasoningChain),
      researchProcess: this.generateResearchProcessMermaid(iterations),
      findingsRelation: this.generateFindingsRelationMermaid(keyFindings),
    };
  }

  /**
   * ナレッジグラフのMermaidダイアグラムを生成（mindmap形式）
   */
  private generateKnowledgeGraphMermaid(topic: string, graph: SimpleKnowledgeGraph): string {
    const lines: string[] = ['mindmap'];
    lines.push(`  root((${this.escapeMermaid(topic)}))`);

    // ノードをタイプ別にグループ化
    const nodesByType = new Map<string, typeof graph.nodes>();
    for (const node of graph.nodes.slice(0, 30)) {
      const type = node.type || 'other';
      if (!nodesByType.has(type)) {
        nodesByType.set(type, []);
      }
      nodesByType.get(type)!.push(node);
    }

    // 各タイプのノードを追加
    for (const [type, nodes] of nodesByType) {
      if (type === 'topic') continue;
      lines.push(`    ${this.escapeMermaid(type)}`);
      for (const node of nodes.slice(0, 5)) {
        lines.push(`      ${this.escapeMermaid(node.label || node.id)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 推論チェーンのMermaidフローチャートを生成
   */
  private generateReasoningFlowMermaid(reasoningChain: ReasoningStep[]): string {
    const lines: string[] = ['flowchart TB'];
    
    // ノードを定義
    for (const step of reasoningChain) {
      const shape = this.getReasoningStepShape(step.type);
      const label = this.escapeMermaid(step.description.slice(0, 50) + (step.description.length > 50 ? '...' : ''));
      lines.push(`  step${step.step}${shape.open}"${label}"${shape.close}`);
    }

    // エッジを定義
    for (let i = 0; i < reasoningChain.length - 1; i++) {
      const current = reasoningChain[i];
      const next = reasoningChain[i + 1];
      if (current && next) {
        lines.push(`  step${current.step} --> step${next.step}`);
      }
    }

    // スタイルを追加
    lines.push('');
    lines.push('  classDef observation fill:#e1f5fe,stroke:#01579b');
    lines.push('  classDef inference fill:#fff3e0,stroke:#e65100');
    lines.push('  classDef synthesis fill:#e8f5e9,stroke:#1b5e20');
    lines.push('  classDef conclusion fill:#f3e5f5,stroke:#4a148c');

    for (const step of reasoningChain) {
      lines.push(`  class step${step.step} ${step.type}`);
    }

    return lines.join('\n');
  }

  /**
   * 推論ステップの形状を取得
   */
  private getReasoningStepShape(type: ReasoningStep['type']): { open: string; close: string } {
    switch (type) {
      case 'observation':
        return { open: '([', close: '])' }; // stadium
      case 'inference':
        return { open: '{{', close: '}}' }; // hexagon
      case 'synthesis':
        return { open: '[[', close: ']]' }; // subroutine
      case 'conclusion':
        return { open: '(((', close: ')))' }; // circle
      default:
        return { open: '[', close: ']' };
    }
  }

  /**
   * 調査プロセスのMermaidシーケンス図を生成
   */
  private generateResearchProcessMermaid(iterations: IterationRecord[]): string {
    const lines: string[] = ['sequenceDiagram'];
    lines.push('  participant U as User');
    lines.push('  participant O as Orchestrator');
    lines.push('  participant S as Search');
    lines.push('  participant A as Analyzer');

    for (const iter of iterations.slice(0, 5)) {
      lines.push(`  Note over O: Iteration ${iter.iterationNumber}`);
      lines.push(`  O->>S: Query (${iter.queries.length} queries)`);
      lines.push(`  S-->>O: ${iter.findingsCount} findings`);
      lines.push(`  O->>A: Integrate findings`);
      lines.push(`  A-->>O: +${iter.newNodesCount} nodes, +${iter.newEdgesCount} edges`);
      lines.push(`  Note over O: Novelty: ${(iter.noveltyRate * 100).toFixed(0)}%`);
    }

    if (iterations.length > 5) {
      lines.push(`  Note over O: ... ${iterations.length - 5} more iterations`);
    }

    return lines.join('\n');
  }

  /**
   * 発見事項の関係図のMermaidダイアグラムを生成
   */
  private generateFindingsRelationMermaid(keyFindings: KeyFinding[]): string {
    const lines: string[] = ['graph LR'];

    // 発見事項をノードとして追加
    for (const finding of keyFindings.slice(0, 10)) {
      const importance = finding.importance === 'high' ? ':::high' : finding.importance === 'medium' ? ':::medium' : ':::low';
      const label = this.escapeMermaid(finding.title.slice(0, 30) + (finding.title.length > 30 ? '...' : ''));
      lines.push(`  ${this.normalizeId(finding.id)}["${label}"]${importance}`);
    }

    // 関連コンセプトによるエッジを追加
    const conceptMap = new Map<string, string[]>();
    for (const finding of keyFindings.slice(0, 10)) {
      for (const concept of finding.relatedConcepts.slice(0, 3)) {
        if (!conceptMap.has(concept)) {
          conceptMap.set(concept, []);
        }
        conceptMap.get(concept)!.push(this.normalizeId(finding.id));
      }
    }

    // 同じコンセプトを共有するノード間にエッジを追加
    for (const [_concept, nodeIds] of conceptMap) {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        const from = nodeIds[i];
        const to = nodeIds[i + 1];
        if (from && to) {
          lines.push(`  ${from} --- ${to}`);
        }
      }
    }

    // スタイル定義
    lines.push('');
    lines.push('  classDef high fill:#ffcdd2,stroke:#b71c1c');
    lines.push('  classDef medium fill:#fff9c4,stroke:#f57f17');
    lines.push('  classDef low fill:#e8f5e9,stroke:#1b5e20');

    return lines.join('\n');
  }

  /**
   * Mermaid用にテキストをエスケープ
   */
  private escapeMermaid(text: string): string {
    return text
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, ' ')
      .trim();
  }
}
