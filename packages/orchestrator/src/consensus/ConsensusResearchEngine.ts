/**
 * KATASHIRO v1.3.0 - ConsensusResearchEngine
 * 反復合議型リサーチワークフローのメインオーケストレーター
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.3.0
 */

import { EventEmitter } from 'events';
import {
  ConsensusResearchConfig,
  ConsensusResearchResult,
  ConsensusResearchEvent,
  ConsensusResearchEventListener,
  IterationContext,
  IterationResult,
  AgentReport,
  ReportScore,
  DEFAULT_CONSENSUS_CONFIG,
  DEFAULT_AGENT_STRATEGIES,
  ConsensusResearchError,
  ConsensusResearchErrorCode,
} from './types';
import { ResearchAgent, ResearchAgentDependencies, createDefaultDependencies } from './ResearchAgent';
import { ReportScorer } from './ReportScorer';
import { ConsensusSelector } from './ConsensusSelector';
import { ReportPostProcessor } from './ReportPostProcessor';

/**
 * 合議型リサーチエンジン
 * @requirement REQ-1.2.0-WFL-001 ~ REQ-1.2.0-WFL-005, REQ-1.3.0-INT-001
 */
export class ConsensusResearchEngine {
  private readonly config: ConsensusResearchConfig;
  private readonly agents: ResearchAgent[];
  private readonly scorer: ReportScorer;
  private readonly selector: ConsensusSelector;
  private readonly postProcessor: ReportPostProcessor;
  private readonly eventEmitter: EventEmitter;

  /**
   * コンストラクタ
   * @param config 設定
   * @param deps 依存性（テスト用）
   */
  constructor(
    config?: Partial<ConsensusResearchConfig>,
    deps?: ResearchAgentDependencies
  ) {
    this.config = { ...DEFAULT_CONSENSUS_CONFIG, ...config };
    this.eventEmitter = new EventEmitter();
    this.scorer = new ReportScorer(this.config.conflictThreshold);
    this.selector = new ConsensusSelector();
    this.postProcessor = new ReportPostProcessor(this.config.postProcess);

    // エージェント作成
    const agentDeps = deps || createDefaultDependencies();
    this.agents = [];
    for (let i = 1; i <= this.config.agentCount; i++) {
      const strategy = DEFAULT_AGENT_STRATEGIES[i - 1] || DEFAULT_AGENT_STRATEGIES[0];
      this.agents.push(new ResearchAgent(i, agentDeps, strategy));
    }
  }

  /**
   * イベントリスナーを登録
   */
  on(listener: ConsensusResearchEventListener): this {
    this.eventEmitter.on('event', listener);
    return this;
  }

  /**
   * イベントリスナーを解除
   */
  off(listener: ConsensusResearchEventListener): this {
    this.eventEmitter.off('event', listener);
    return this;
  }

  /**
   * イベントを発行
   */
  private emit(event: ConsensusResearchEvent): void {
    this.eventEmitter.emit('event', event);
  }

  /**
   * 反復合議型リサーチを実行
   * @requirement REQ-1.2.0-WFL-001, REQ-1.2.0-WFL-004, REQ-1.2.0-WFL-005
   * @param topic リサーチトピック
   * @param options オプション設定
   * @returns 最終結果
   */
  async research(
    topic: string,
    options?: Partial<ConsensusResearchConfig>
  ): Promise<ConsensusResearchResult> {
    const startedAt = new Date().toISOString();
    const config = { ...this.config, ...options, topic };

    this.emit({ type: 'researchStarted', topic, config });

    const iterations: IterationResult[] = [];
    let currentContext: IterationContext = {
      iteration: 1,
      topic,
      previousConsensus: null,
      previousScore: null,
      unresolvedQuestions: [],
      coveredSources: [],
      areasToDeepen: [],
      isInitial: true,
    };

    try {
      for (let i = 1; i <= config.iterationCount; i++) {
        currentContext.iteration = i;
        currentContext.isInitial = i === 1;

        const iterationResult = await this.runIteration(currentContext);
        iterations.push(iterationResult);

        // 早期終了判定（AC4: 2連続で改善<5%）
        if (i >= 2 && this.shouldTerminateEarly(iterations)) {
          break;
        }

        // 次のコンテキストを構築
        const selectedScore = iterationResult.scores.find(
          (s) => s.reportId === iterationResult.selectedReportId
        );
        if (selectedScore) {
          currentContext = this.buildNextContext(
            currentContext,
            iterationResult.consensusReport,
            selectedScore
          );
        }
      }

      const finalReport = this.generateFinalReport(iterations);
      const finalIteration = iterations[iterations.length - 1]!;
      const finalScore = finalIteration.scores.find(
        (s) => s.reportId === finalIteration.selectedReportId
      ) ?? finalIteration.scores[0]!;
      const result: ConsensusResearchResult = {
        finalReport,
        iterations,
        totalDurationMs: Date.now() - new Date(startedAt).getTime(),
        totalAgentRuns: iterations.length * config.agentCount,
        finalScore,
        metadata: {
          topic,
          startedAt,
          completedAt: new Date().toISOString(),
          config,
        },
      };

      this.emit({ type: 'researchCompleted', result });
      return result;
    } catch (error) {
      this.emit({ type: 'researchFailed', error: error as Error });
      throw error;
    }
  }

  /**
   * 1イテレーションを実行
   * @requirement REQ-1.2.0-WFL-001, REQ-1.2.0-WFL-002, REQ-1.2.0-WFL-003
   */
  private async runIteration(context: IterationContext): Promise<IterationResult> {
    const startTime = Date.now();

    this.emit({ type: 'iterationStarted', iteration: context.iteration, context });

    // 1. エージェント並列実行
    const agentReports = await this.executeAgentsInParallel(context);

    // 2. スコアリング
    const scores = this.scorer.scoreReports(agentReports);
    this.emit({ type: 'scoringCompleted', iteration: context.iteration, scores });

    // 3. コンセンサス選択
    const selection = this.selector.select(scores);
    const selectedReport = agentReports.find(
      (r) => r.reportId === selection.selectedReportId
    );

    if (!selectedReport) {
      throw new ConsensusResearchError(
        ConsensusResearchErrorCode.SELECTION_ERROR,
        'Selected report not found'
      );
    }

    this.emit({
      type: 'consensusSelected',
      iteration: context.iteration,
      selectedAgentId: selectedReport.agentId,
      reason: selection.reason,
    });

    const result: IterationResult = {
      iteration: context.iteration,
      agentReports,
      scores,
      consensusReport: selectedReport.content,
      selectionReason: selection.reason,
      durationMs: Date.now() - startTime,
      selectedReportId: selection.selectedReportId,
    };

    this.emit({
      type: 'iterationCompleted',
      iteration: context.iteration,
      durationMs: result.durationMs,
    });

    return result;
  }

  /**
   * エージェントを並列実行
   * @requirement REQ-1.2.0-WFL-001, REQ-1.2.0-ERR-001, REQ-1.2.0-ERR-002
   */
  private async executeAgentsInParallel(
    context: IterationContext
  ): Promise<AgentReport[]> {
    const agentPromises = this.agents.map(async (agent) => {
      const agentId = agent.agentId;
      this.emit({
        type: 'agentStarted',
        iteration: context.iteration,
        agentId,
        strategy: agent.strategy,
      });

      const startTime = Date.now();

      try {
        // タイムアウト付き実行
        const report = await Promise.race([
          agent.execute(context),
          this.createTimeout(this.config.agentTimeoutMs, agentId),
        ]);

        this.emit({
          type: 'agentCompleted',
          iteration: context.iteration,
          agentId,
          durationMs: Date.now() - startTime,
          success: true,
        });

        return report;
      } catch (error) {
        this.emit({
          type: 'agentCompleted',
          iteration: context.iteration,
          agentId,
          durationMs: Date.now() - startTime,
          success: false,
        });

        console.error(`Agent ${agentId} failed:`, error);
        return null;
      }
    });

    // Promise.allSettledで全エージェントの完了を待つ
    const results = await Promise.allSettled(agentPromises);

    // 成功したレポートのみ抽出
    const successfulReports = results
      .filter(
        (r): r is PromiseFulfilledResult<AgentReport | null> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((r): r is AgentReport => r !== null);

    // 障害耐性チェック（AC3: 過半数失敗時はエラー）
    if (successfulReports.length < Math.ceil(this.agents.length / 2)) {
      throw new ConsensusResearchError(
        ConsensusResearchErrorCode.MAJORITY_FAILURE,
        `Majority of agents failed (${successfulReports.length}/${this.agents.length})`
      );
    }

    return successfulReports;
  }

  /**
   * タイムアウトPromiseを作成
   */
  private createTimeout(ms: number, agentId: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new ConsensusResearchError(
            ConsensusResearchErrorCode.AGENT_TIMEOUT,
            `Agent ${agentId} timed out after ${ms}ms`
          )
        );
      }, ms);
    });
  }

  /**
   * 早期終了を判定
   * @requirement REQ-1.2.0-WFL-004 (AC4: 2連続でスコア改善<5%の場合は早期終了)
   */
  private shouldTerminateEarly(iterations: IterationResult[]): boolean {
    if (iterations.length < 2) return false;

    // 直近2イテレーションのスコア改善率を計算
    const current = iterations[iterations.length - 1]!;
    const previous = iterations[iterations.length - 2]!;

    const currentBestScore = Math.max(...current.scores.map((s) => s.totalScore));
    const previousBestScore = Math.max(...previous.scores.map((s) => s.totalScore));

    // 改善率 = (今回 - 前回) / 前回 * 100
    const improvementRate =
      previousBestScore > 0
        ? ((currentBestScore - previousBestScore) / previousBestScore) * 100
        : 0;

    // 5%未満の改善の場合
    if (improvementRate < 5) {
      // さらに前のイテレーションも確認（2連続判定）
      if (iterations.length >= 3) {
        const beforePrevious = iterations[iterations.length - 3]!;
        const beforePreviousBestScore = Math.max(
          ...beforePrevious.scores.map((s) => s.totalScore)
        );
        const previousImprovementRate =
          beforePreviousBestScore > 0
            ? ((previousBestScore - beforePreviousBestScore) / beforePreviousBestScore) * 100
            : 0;

        // 2連続で5%未満なら早期終了
        return previousImprovementRate < 5;
      }
    }

    return false;
  }

  /**
   * 次イテレーションのコンテキストを構築
   * @requirement REQ-1.2.0-WFL-001, REQ-1.2.0-WFL-003
   */
  private buildNextContext(
    current: IterationContext,
    consensusReport: string,
    consensusScore: ReportScore
  ): IterationContext {
    // 1. カバー済みソースを更新
    const newCoveredSources = [
      ...current.coveredSources,
      ...(consensusScore.sourceUrls || []),
    ];

    // 2. 未解決の質問を抽出（レポート内の「?」や「要検証」から）
    const unresolvedPatterns = [
      /([^。]+\?)/g, // 疑問文
      /\[要検証\]([^。]+)/g, // 要検証ラベル
      /今後の課題[：:]([^。]+)/g, // 課題セクション
    ];
    const unresolvedQuestions: string[] = [];
    for (const pattern of unresolvedPatterns) {
      const matches = Array.from(consensusReport.matchAll(pattern));
      for (const match of matches) {
        const captured = match[1];
        if (captured) {
          unresolvedQuestions.push(captured.trim());
        }
      }
    }

    // 3. 深掘りエリアを特定（スコアの低い側面）
    const areasToDeepen: string[] = [];
    if (consensusScore.consistencyScore < 0.7) {
      areasToDeepen.push('情報の整合性確認');
    }
    if (consensusScore.reliabilityScore < 0.7) {
      areasToDeepen.push('信頼性の高いソースからの検証');
    }
    if (consensusScore.coverageScore < 0.7) {
      areasToDeepen.push('調査範囲の拡大');
    }

    return {
      iteration: current.iteration + 1,
      topic: current.topic,
      previousConsensus: consensusReport,
      previousScore: consensusScore,
      unresolvedQuestions: unresolvedQuestions.slice(0, 5), // 最大5件
      coveredSources: Array.from(new Set(newCoveredSources)), // 重複除去
      areasToDeepen,
      isInitial: false,
    };
  }

  /**
   * 最終レポートを生成
   * @requirement REQ-1.2.0-WFL-005
   */
  private generateFinalReport(iterations: IterationResult[]): string {
    const finalIteration = iterations[iterations.length - 1]!;
    const consensusReport = finalIteration.consensusReport;

    // エグゼクティブサマリーを生成
    const executiveSummary = this.generateExecutiveSummary(iterations);

    // 調査プロセスの要約
    const processOverview = iterations
      .map((iter, idx) => {
        const bestScore = Math.max(...iter.scores.map((s) => s.totalScore));
        return `- **イテレーション ${idx + 1}**: スコア ${(bestScore * 100).toFixed(1)}% (${iter.selectionReason})`;
      })
      .join('\n');

    // 全イテレーションで発見された主要な知見を統合
    const keyFindings = this.extractKeyFindings(iterations);

    // 参照ソース一覧
    const allSources = iterations.flatMap((iter) =>
      iter.agentReports.flatMap((r) => r.sources)
    );
    const uniqueSourcesMap = new Map(allSources.map((s) => [s.url, s]));
    const uniqueSources = Array.from(uniqueSourcesMap.values());
    const sourceList = uniqueSources
      .sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0))
      .slice(0, 20)
      .map(
        (s) =>
          `- [${s.title}](${s.url}) (信頼度: ${((s.reliabilityScore || 0) * 100).toFixed(0)}%)`
      )
      .join('\n');

    const finalScore = Math.max(
      ...finalIteration.scores.map((s) => s.totalScore)
    );

    const rawReport = `# 調査レポート

## エグゼクティブサマリー

${executiveSummary}

## 調査プロセス

${processOverview}

## 詳細レポート

${consensusReport}

## 主要な発見

${keyFindings}

## 参照ソース

${sourceList}

---
*Generated by KATASHIRO Consensus Research Engine v1.3.0*
*Total Iterations: ${iterations.length}*
*Final Score: ${(finalScore * 100).toFixed(1)}%*
`;

    // v1.3.0: ASCII図をMermaid/Markdownに変換する後処理を実行
    const postProcessResult = this.postProcessor.process(rawReport);
    
    // 警告があればログ出力（本番環境ではイベント発行に変更可能）
    if (postProcessResult.warnings.length > 0) {
      for (const warning of postProcessResult.warnings) {
        console.warn(`[PostProcessor] ${warning}`);
      }
    }

    return postProcessResult.processedReport;
  }

  /**
   * エグゼクティブサマリーを生成
   */
  private generateExecutiveSummary(iterations: IterationResult[]): string {
    const finalIteration = iterations[iterations.length - 1]!;
    const initialIteration = iterations[0]!;
    const finalScore = Math.max(
      ...finalIteration.scores.map((s) => s.totalScore)
    );
    const initialScore = Math.max(...initialIteration.scores.map((s) => s.totalScore));
    const improvement =
      initialScore > 0
        ? (((finalScore - initialScore) / initialScore) * 100).toFixed(1)
        : '0';

    return (
      `本調査は${iterations.length}回の反復合議プロセスを経て完了しました。` +
      `初回スコア${(initialScore * 100).toFixed(1)}%から最終スコア${(finalScore * 100).toFixed(1)}%まで、` +
      `${improvement}%の品質向上を達成しました。`
    );
  }

  /**
   * 全イテレーションから主要な発見を抽出
   */
  private extractKeyFindings(iterations: IterationResult[]): string {
    const findings: string[] = [];

    for (const iter of iterations) {
      // 各イテレーションのコンセンサスレポートから「主要な発見」セクションを抽出
      const findingsMatch = iter.consensusReport.match(
        /## 主要な発見[\s\S]*?(?=##|$)/
      );
      if (findingsMatch) {
        findings.push(findingsMatch[0].replace(/## 主要な発見\s*/, '').trim());
      }
    }

    // 重複を除去して統合
    const uniqueFindings = Array.from(
      new Set(findings.flatMap((f) => f.split('\n').filter((l) => l.trim())))
    );
    return uniqueFindings.slice(0, 10).join('\n');
  }
}
