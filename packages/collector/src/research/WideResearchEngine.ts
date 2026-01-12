/**
 * WideResearchEngine - 広域リサーチエンジン
 *
 * 複数の検索エージェントを並列実行し、多様なソースから情報を収集・統合する。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import { EventEmitter } from 'events';
import type {
  WideResearchQuery,
  WideResearchResult,
  ResearchError,
  Finding,
  SourceInfo,
  ResearchStatistics,
  SourceType,
  AgentConfig,
  CompletionStatus,
} from './types.js';
import { DEFAULT_RESEARCH_CONFIG } from './types.js';
import type { ISearchAgent, AgentSearchResult, AgentExecutionResult } from './agents/types.js';
import { WebSearchAgent } from './agents/WebSearchAgent.js';
import { NewsSearchAgent } from './agents/NewsSearchAgent.js';
import { AcademicSearchAgent } from './agents/AcademicSearchAgent.js';
import { EncyclopediaAgent } from './agents/EncyclopediaAgent.js';
import { ResultAggregator } from './ResultAggregator.js';
import { CoverageAnalyzer } from './CoverageAnalyzer.js';
import { QueryPlanner, type QueryPlan } from './QueryPlanner.js';

/**
 * Wide Research Engine
 *
 * 複数のソースから並列に情報を収集し、統合された結果を返す。
 *
 * @example
 * ```typescript
 * const engine = new WideResearchEngine();
 *
 * // 基本的な使用
 * const result = await engine.research({
 *   topic: 'AI ethics in healthcare',
 *   depth: 'medium',
 * });
 *
 * if (isOk(result)) {
 *   console.log(`Found ${result.value.findings.length} results`);
 *   console.log(`Coverage: ${result.value.coverage.coverageRate * 100}%`);
 * }
 *
 * // 特定ソースのみ使用
 * const newsResult = await engine.research({
 *   topic: 'latest AI regulations',
 *   depth: 'shallow',
 *   sources: ['news'],
 *   dateRange: { start: new Date('2025-01-01') },
 * });
 *
 * // イベントリスナーで進捗を監視
 * engine.on('agentStarted', (agent) => console.log(`Started: ${agent}`));
 * engine.on('agentCompleted', (agent, count) => console.log(`Completed: ${agent} (${count} results)`));
 * engine.on('agentFailed', (agent, error) => console.error(`Failed: ${agent}: ${error}`));
 * ```
 *
 * @events
 * - `agentStarted(type: SourceType)` - エージェント開始時
 * - `agentCompleted(type: SourceType, count: number)` - エージェント完了時
 * - `agentFailed(type: SourceType, error: string)` - エージェント失敗時
 * - `totalTimeout()` - 全体タイムアウト発生時
 */
export class WideResearchEngine extends EventEmitter {
  private agents: Map<SourceType, ISearchAgent>;
  private agentConfigs: Map<SourceType, AgentConfig>;
  private queryPlanner: QueryPlanner;
  private resultAggregator: ResultAggregator;
  private coverageAnalyzer: CoverageAnalyzer;

  constructor(configs?: Partial<Record<SourceType, Partial<AgentConfig>>>) {
    super();
    this.agents = new Map();
    this.agentConfigs = new Map();
    this.queryPlanner = new QueryPlanner();
    this.resultAggregator = new ResultAggregator();
    this.coverageAnalyzer = new CoverageAnalyzer();

    this.registerDefaultAgents();

    if (configs) {
      this.configure(configs);
    }
  }

  /**
   * デフォルトエージェントを登録
   */
  private registerDefaultAgents(): void {
    this.registerAgent(new WebSearchAgent());
    this.registerAgent(new NewsSearchAgent());
    this.registerAgent(new AcademicSearchAgent());
    this.registerAgent(new EncyclopediaAgent());

    // デフォルト設定
    const defaultTypes: SourceType[] = ['web', 'news', 'academic', 'encyclopedia'];
    defaultTypes.forEach((type, index) => {
      this.agentConfigs.set(type, {
        type,
        enabled: true,
        priority: index + 1,
      });
    });
  }

  /**
   * カスタムエージェントを登録
   */
  registerAgent(agent: ISearchAgent): void {
    this.agents.set(agent.type, agent);
  }

  /**
   * エージェント設定を更新
   */
  configure(configs: Partial<Record<SourceType, Partial<AgentConfig>>>): void {
    for (const [type, config] of Object.entries(configs)) {
      const existing = this.agentConfigs.get(type as SourceType) || {
        type: type as SourceType,
        enabled: true,
        priority: 99,
      };
      this.agentConfigs.set(type as SourceType, { ...existing, ...config });
    }
  }

  /**
   * 登録済みエージェント一覧を取得
   */
  getAvailableAgents(): SourceType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Wide Research を実行
   */
  async research(
    query: WideResearchQuery
  ): Promise<Result<WideResearchResult, ResearchError>> {
    const startTime = Date.now();

    // クエリ検証
    if (!query.topic || query.topic.trim().length === 0) {
      return err({
        code: 'INVALID_QUERY',
        message: 'Topic is required',
      });
    }

    // 設定のマージ
    const config = this.mergeConfig(query);

    // 使用するエージェントを決定
    const selectedAgents = this.selectAgents(config);

    if (selectedAgents.length === 0) {
      return err({
        code: 'CONFIGURATION_ERROR',
        message: 'No agents available for the specified sources',
      });
    }

    // クエリ計画を作成
    const queryPlan = this.queryPlanner.plan(query, selectedAgents, {
      agentTimeout: config.agentTimeout,
      maxResultsPerSource: config.maxResultsPerSource,
    });

    // 並列検索を実行
    const agentResults = await this.executeParallelSearch(
      queryPlan,
      config.maxParallelAgents,
      config.totalTimeout
    );

    // 全エージェント失敗チェック
    const successfulResults = agentResults.filter(
      (r) => r.result.status !== 'failed' && r.result.status !== 'timeout'
    );
    if (successfulResults.length === 0) {
      return err({
        code: 'ALL_SOURCES_FAILED',
        message: 'All search agents failed',
        details: agentResults.map((r) => ({
          agent: r.agent.type,
          error: r.result.error,
        })),
      });
    }

    // 結果を集約
    const aggregated = this.resultAggregator.aggregate(
      agentResults.map((r) => r.result),
      query.topic
    );

    // ソース情報を生成
    const sourceInfos = this.buildSourceInfos(agentResults, queryPlan);

    // カバレッジ分析
    const coverage = this.coverageAnalyzer.analyze(
      agentResults,
      selectedAgents.map((a) => a.type)
    );

    // 統計情報を計算
    const statistics = this.calculateStatistics(aggregated, agentResults);

    // 完了ステータスを決定
    const completionStatus = this.determineCompletionStatus(
      agentResults,
      selectedAgents.length
    );

    return ok({
      findings: aggregated,
      sources: sourceInfos,
      coverage,
      completionStatus,
      statistics,
      processingTime: Date.now() - startTime,
    });
  }

  /**
   * 設定をマージ
   */
  private mergeConfig(query: WideResearchQuery) {
    const depthConfig = DEFAULT_RESEARCH_CONFIG.depthConfig[query.depth];

    return {
      maxParallelAgents:
        query.maxParallelAgents ?? DEFAULT_RESEARCH_CONFIG.maxParallelAgents,
      agentTimeout: query.agentTimeout ?? DEFAULT_RESEARCH_CONFIG.agentTimeout,
      totalTimeout: query.totalTimeout ?? DEFAULT_RESEARCH_CONFIG.totalTimeout,
      maxResultsPerSource:
        query.maxResultsPerSource ?? depthConfig.maxResults,
      sources: query.sources ?? depthConfig.sources,
    };
  }

  /**
   * 使用するエージェントを選択
   */
  private selectAgents(config: { sources: SourceType[] }): ISearchAgent[] {
    return config.sources
      .map((type) => {
        const agentConfig = this.agentConfigs.get(type);
        if (!agentConfig?.enabled) return null;
        return this.agents.get(type) ?? null;
      })
      .filter((agent): agent is ISearchAgent => agent !== null)
      .sort((a, b) => {
        const aConfig = this.agentConfigs.get(a.type);
        const bConfig = this.agentConfigs.get(b.type);
        return (aConfig?.priority ?? 99) - (bConfig?.priority ?? 99);
      });
  }

  /**
   * 並列検索を実行
   */
  private async executeParallelSearch(
    queryPlan: QueryPlan,
    maxParallel: number,
    totalTimeout: number
  ): Promise<AgentExecutionResult[]> {
    const results: AgentExecutionResult[] = [];
    const agents = queryPlan.agents;

    // 並列実行（バッチ処理）
    const batches = this.createBatches(agents, maxParallel);

    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), totalTimeout);
    });

    for (const batch of batches) {
      const batchPromises = batch.map(async (agent) => {
        this.emit('agentStarted', agent.type);
        const startTime = Date.now();
        const agentQuery = queryPlan.queries.get(agent.type);

        if (!agentQuery) {
          return {
            agent,
            result: {
              findings: [],
              status: 'failed' as const,
              error: 'No query found for agent',
              processingTime: 0,
            },
          };
        }

        try {
          const result = await Promise.race([
            agent.search(agentQuery),
            new Promise<AgentSearchResult>((_, reject) => {
              setTimeout(
                () => reject(new Error('Agent timeout')),
                queryPlan.timeout
              );
            }),
          ]);

          this.emit('agentCompleted', agent.type, result.findings.length);
          return { agent, result };
        } catch (error) {
          const errorResult: AgentSearchResult = {
            findings: [],
            status: 'timeout',
            error: (error as Error).message,
            processingTime: Date.now() - startTime,
          };

          this.emit('agentFailed', agent.type, (error as Error).message);
          return { agent, result: errorResult };
        }
      });

      const raceResult = await Promise.race([
        Promise.all(batchPromises),
        timeoutPromise,
      ]);

      if (raceResult === 'timeout') {
        // タイムアウト時は収集済み結果を返す
        this.emit('totalTimeout');
        break;
      }

      results.push(...raceResult);
    }

    return results;
  }

  /**
   * バッチに分割
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * ソース情報を生成
   */
  private buildSourceInfos(
    results: AgentExecutionResult[],
    queryPlan: QueryPlan
  ): SourceInfo[] {
    return results.map(({ agent, result }) => ({
      type: agent.type,
      name: agent.name,
      query: queryPlan.queries.get(agent.type)?.query ?? '',
      resultCount: result.findings.length,
      status: result.status,
      error: result.error,
      processingTime: result.processingTime,
    }));
  }

  /**
   * 統計情報を計算
   */
  private calculateStatistics(
    findings: Finding[],
    results: AgentExecutionResult[]
  ): ResearchStatistics {
    const resultsBySource: Partial<Record<SourceType, number>> = {};

    for (const { agent, result } of results) {
      resultsBySource[agent.type] = result.findings.length;
    }

    const totalResults = results.reduce(
      (sum, r) => sum + r.result.findings.length,
      0
    );

    return {
      totalResults,
      uniqueResults: findings.length,
      resultsBySource,
      averageRelevance:
        findings.length > 0
          ? findings.reduce((sum, f) => sum + f.relevanceScore, 0) / findings.length
          : 0,
      averageCredibility:
        findings.length > 0
          ? findings.reduce((sum, f) => sum + f.credibilityScore, 0) / findings.length
          : 0,
    };
  }

  /**
   * 完了ステータスを決定
   */
  private determineCompletionStatus(
    results: AgentExecutionResult[],
    expectedCount: number
  ): CompletionStatus {
    const successCount = results.filter(
      (r) => r.result.status === 'success'
    ).length;

    if (successCount === expectedCount) return 'full';
    if (successCount > 0) return 'partial';
    return 'failed';
  }
}
