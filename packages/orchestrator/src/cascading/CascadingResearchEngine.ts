/**
 * KATASHIRO v1.4.0 - Cascading Research Engine
 *
 * カスケード型リサーチのメインエンジン
 * 5ステップ × 5エージェントのワークフローを実行
 */

import type {
  CascadingResearchConfig,
  CascadingResearchResult,
  CascadingResearchEvent,
  CascadingResearchEventListener,
  StepResult,
  StepContext,
  Finding,
} from './types.js';
import { DEFAULT_CASCADING_CONFIG, DEFAULT_AGENT_STRATEGIES, DEFAULT_STEP_STRATEGIES } from './types.js';
import { CascadingAgent, createCascadingAgents, type CascadingAgentDependencies } from './CascadingAgent.js';
import { StepExecutor, StepContextBuilder } from './StepExecutor.js';
import { StepResultIntegrator } from './StepResultIntegrator.js';

/**
 * エンジンの状態
 */
export type EngineState = 'idle' | 'running' | 'completed' | 'error' | 'aborted';

/**
 * CascadingResearchEngineの依存性
 */
export interface CascadingResearchEngineDependencies extends CascadingAgentDependencies {
  /** ポストプロセッサ（オプション） */
  postProcessor?: {
    process: (report: string) => { processedReport: string; conversions: any[] };
  };
}

/**
 * カスケード型リサーチエンジン
 */
export class CascadingResearchEngine {
  private readonly config: CascadingResearchConfig;
  private readonly deps: CascadingResearchEngineDependencies;
  private readonly eventListeners: CascadingResearchEventListener[] = [];
  private state: EngineState = 'idle';
  private abortRequested: boolean = false;

  constructor(
    deps: CascadingResearchEngineDependencies,
    config: Partial<CascadingResearchConfig> = {}
  ) {
    this.deps = deps;
    this.config = { ...DEFAULT_CASCADING_CONFIG, ...config };
  }

  /**
   * イベントリスナーを登録
   */
  on(listener: CascadingResearchEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index >= 0) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * イベントを発行
   */
  private emit(event: CascadingResearchEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // イベントリスナーのエラーは無視
      }
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): EngineState {
    return this.state;
  }

  /**
   * リサーチを中断
   */
  abort(): void {
    if (this.state === 'running') {
      this.abortRequested = true;
    }
  }

  /**
   * カスケード型リサーチを実行
   */
  async research(
    topic: string,
    customConfig?: Partial<CascadingResearchConfig>
  ): Promise<CascadingResearchResult> {
    const config = { ...this.config, ...customConfig };
    const startTime = Date.now();
    this.state = 'running';
    this.abortRequested = false;

    this.emit({
      type: 'researchStarted',
      topic,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. エージェントを作成
      const agents = this.createAgents(config);

      // 2. ステップ実行器を作成
      const stepExecutor = new StepExecutor({
        concurrency: config.agentCount,
        agentTimeoutMs: config.agentTimeoutMs,
        stepTimeoutMs: config.agentTimeoutMs * config.agentCount,
        skipOnFailure: true,
      });

      // イベントを転送
      stepExecutor.on(event => this.emit(event));

      // 3. 全ステップを順次実行
      const stepResults: StepResult[] = [];
      const stepStrategies = config.stepStrategies || DEFAULT_STEP_STRATEGIES;

      for (let stepNumber = 1; stepNumber <= config.stepCount; stepNumber++) {
        // 中断チェック
        if (this.abortRequested) {
          this.state = 'aborted';
          break;
        }

        // ステップ戦略を取得
        const strategy = stepStrategies[stepNumber - 1];
        if (!strategy) {
          throw new Error(`Step strategy not found for step ${stepNumber}`);
        }

        // コンテキストを構築
        const context = this.buildStepContext(topic, stepNumber, strategy, stepResults);

        // ステップを実行
        const result = await stepExecutor.execute(stepNumber, agents, context, strategy);
        stepResults.push(result);

        // 早期終了判定
        if (this.shouldTerminateEarly(stepResults, config)) {
          this.emit({
            type: 'earlyTermination',
            stepNumber,
            reason: '収束条件を満たしたため早期終了',
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }

      // 4. 結果を統合
      const integrator = new StepResultIntegrator({
        contradictionThreshold: config.contradictionThreshold ?? 0.7,
      });
      const integrationResult = integrator.integrate(topic, stepResults);

      // 5. 最終レポートをポストプロセス
      let finalReport = integrationResult.finalReport;
      if (this.deps.postProcessor && config.postProcess?.enabled) {
        const processed = this.deps.postProcessor.process(finalReport);
        finalReport = processed.processedReport;
      }

      // 6. 結果を構築
      const result: CascadingResearchResult = {
        topic,
        stepResults,
        findings: integrationResult.findings,
        sources: integrationResult.sources,
        contradictions: integrationResult.contradictions,
        finalReport,
        overallConfidence: integrationResult.overallConfidence,
        totalDurationMs: Date.now() - startTime,
        totalAgentRuns: stepResults.reduce(
          (sum, sr) => sum + sr.agentReports.length,
          0
        ),
        metadata: {
          config: {
            agentCount: config.agentCount,
            stepCount: config.stepCount,
          },
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
        },
      };

      this.state = this.abortRequested ? 'aborted' : 'completed';

      this.emit({
        type: 'researchCompleted',
        result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.state = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emit({
        type: 'researchFailed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      // エラー時の結果
      return {
        topic,
        stepResults: [],
        findings: [],
        sources: [],
        contradictions: [],
        finalReport: `# Error\n\nリサーチ中にエラーが発生しました: ${errorMessage}`,
        overallConfidence: 0,
        totalDurationMs: Date.now() - startTime,
        totalAgentRuns: 0,
        metadata: {
          config: {
            agentCount: config.agentCount,
            stepCount: config.stepCount,
          },
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          error: errorMessage,
        },
      };
    }
  }

  /**
   * エージェントを作成
   */
  private createAgents(config: CascadingResearchConfig): CascadingAgent[] {
    const strategies = config.agentStrategies || DEFAULT_AGENT_STRATEGIES;

    return createCascadingAgents(strategies, this.deps, {
      timeoutMs: config.agentTimeoutMs,
      maxRetries: 2,
      maxResults: config.maxResultsPerAgent ?? config.searchConfig.maxResultsPerAgent,
    });
  }

  /**
   * ステップコンテキストを構築
   */
  private buildStepContext(
    topic: string,
    stepNumber: number,
    strategy: { focus: string; queryModifiers: string[] },
    previousResults: StepResult[]
  ): StepContext {
    const builder = new StepContextBuilder()
      .setTopic(topic)
      .setStepNumber(stepNumber)
      .setStepFocus(strategy.focus)
      .setQueryModifiers(strategy.queryModifiers)
      .setAllPreviousResults(previousResults);

    // 前ステップの結果がある場合
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      if (lastResult) {
        builder.setPreviousStepResult(lastResult);

        // 全発見事項からキーエンティティを抽出
        const allFindings = previousResults.flatMap(r => r.findings);
        const keyEntities = this.extractKeyEntities(allFindings);
        builder.setKeyEntities(keyEntities);

        // 特定されたギャップを集約
        const allGaps = [...new Set(previousResults.flatMap(r => r.gaps))];
        builder.setIdentifiedGaps(allGaps);

        // 未解決の疑問を収集（questionカテゴリの発見事項）
        const unresolvedQuestions = allFindings
          .filter(f => f.category === 'question')
          .map(f => f.content.slice(0, 100));
        builder.setUnresolvedQuestions(unresolvedQuestions);
      }
    }

    return builder.build();
  }

  /**
   * キーエンティティを抽出
   */
  private extractKeyEntities(findings: Finding[]): string[] {
    // 発見事項から頻出するキーワードを抽出
    const wordCounts = new Map<string, number>();

    for (const finding of findings) {
      const words = this.tokenize(finding.content);
      for (const word of words) {
        if (word.length >= 2) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }

    // 頻出順にソートして上位10件を返す
    return [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * テキストをトークン化
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  /**
   * 早期終了判定
   */
  private shouldTerminateEarly(
    stepResults: StepResult[],
    config: CascadingResearchConfig
  ): boolean {
    if (stepResults.length < 2) {
      return false;
    }

    // 最後の2ステップを比較
    const lastResult = stepResults[stepResults.length - 1];
    const prevResult = stepResults[stepResults.length - 2];

    if (!lastResult || !prevResult) {
      return false;
    }

    // 新規発見事項の割合を計算
    const prevFindingContents = new Set(
      prevResult.findings.map(f => f.content.slice(0, 100))
    );
    const newFindings = lastResult.findings.filter(
      (f: Finding) => !prevFindingContents.has(f.content.slice(0, 100))
    );

    const newInfoRate = lastResult.findings.length > 0
      ? newFindings.length / lastResult.findings.length
      : 0;

    // 新規情報率が閾値以下なら早期終了
    return newInfoRate < (config.earlyTerminationThreshold ?? 0.1);
  }
}

/**
 * シンプルな依存性を使用してエンジンを作成するヘルパー
 */
export function createCascadingResearchEngine(
  searchClient: CascadingAgentDependencies['searchClient'],
  scraper: CascadingAgentDependencies['scraper'],
  config?: Partial<CascadingResearchConfig>
): CascadingResearchEngine {
  return new CascadingResearchEngine(
    { searchClient, scraper },
    config
  );
}

/**
 * 設定のバリデーション
 */
export function validateConfig(config: Partial<CascadingResearchConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.agentCount !== undefined) {
    if (config.agentCount < 1 || config.agentCount > 10) {
      errors.push('agentCount must be between 1 and 10');
    }
  }

  if (config.stepCount !== undefined) {
    if (config.stepCount < 1 || config.stepCount > 10) {
      errors.push('stepCount must be between 1 and 10');
    }
  }

  if (config.agentTimeoutMs !== undefined) {
    if (config.agentTimeoutMs < 1000) {
      errors.push('agentTimeoutMs must be at least 1000ms');
    }
  }

  if (config.contradictionThreshold !== undefined) {
    if (config.contradictionThreshold < 0 || config.contradictionThreshold > 1) {
      errors.push('contradictionThreshold must be between 0 and 1');
    }
  }

  if (config.earlyTerminationThreshold !== undefined) {
    if (config.earlyTerminationThreshold < 0 || config.earlyTerminationThreshold > 1) {
      errors.push('earlyTerminationThreshold must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
