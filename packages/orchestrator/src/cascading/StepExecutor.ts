/**
 * KATASHIRO v1.4.0 - Step Executor
 *
 * カスケード型リサーチの1ステップを実行するオーケストレーター
 * 5つのエージェントを並列実行し、結果を収集する
 */

import type {
  CascadingAgentReport,
  StepContext,
  StepResult,
  StepStrategyConfig,
  CascadingResearchEvent,
  CascadingResearchEventListener,
} from './types.js';
import { calculateStepConfidence } from './types.js';
import type { CascadingAgent } from './CascadingAgent.js';

/**
 * StepExecutorの設定
 */
export interface StepExecutorConfig {
  /** 並列実行数 */
  concurrency: number;
  /** エージェントタイムアウト (ms) */
  agentTimeoutMs: number;
  /** ステップタイムアウト (ms) */
  stepTimeoutMs: number;
  /** 失敗時にスキップするか */
  skipOnFailure: boolean;
}

/**
 * デフォルト設定
 */
export const DEFAULT_STEP_EXECUTOR_CONFIG: StepExecutorConfig = {
  concurrency: 5,
  agentTimeoutMs: 120000,
  stepTimeoutMs: 600000,
  skipOnFailure: true,
};

/**
 * ステップ実行結果
 */
interface AgentExecutionResult {
  agentId: string;
  success: boolean;
  report?: CascadingAgentReport;
  error?: string;
  durationMs: number;
}

/**
 * ステップ実行クラス
 */
export class StepExecutor {
  private readonly config: StepExecutorConfig;
  private readonly eventListeners: CascadingResearchEventListener[] = [];

  constructor(config: Partial<StepExecutorConfig> = {}) {
    this.config = { ...DEFAULT_STEP_EXECUTOR_CONFIG, ...config };
  }

  /**
   * イベントリスナーを登録
   */
  on(listener: CascadingResearchEventListener): void {
    this.eventListeners.push(listener);
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
   * ステップを実行
   */
  async execute(
    stepNumber: number,
    agents: CascadingAgent[],
    context: StepContext,
    strategy: StepStrategyConfig
  ): Promise<StepResult> {
    const startTime = Date.now();

    this.emit({
      type: 'stepStarted',
      stepNumber,
      timestamp: new Date().toISOString(),
    });

    try {
      // 全エージェントを並列実行
      const executionPromises = agents.map(agent =>
        this.executeAgent(agent, context)
      );

      // タイムアウト付きで待機
      const results = await this.executeWithTimeout(
        Promise.all(executionPromises),
        this.config.stepTimeoutMs
      );

      // 結果を集計
      const successfulReports = results
        .filter((r): r is AgentExecutionResult & { report: CascadingAgentReport } =>
          r.success && r.report !== undefined
        )
        .map(r => r.report);

      // 全発見事項を収集
      const allFindings = successfulReports.flatMap(r => r.findings);

      // 全ソースを収集（重複除去）
      const allSources = this.deduplicateSources(successfulReports.flatMap(r => r.sources));

      // 全ギャップを収集（重複除去）
      const allGaps = [...new Set(successfulReports.flatMap(r => r.gaps))];

      // 統合レポートを生成
      const integratedReport = this.generateIntegratedReport(
        stepNumber,
        strategy,
        successfulReports
      );

      // 信頼度を計算
      const confidence = calculateStepConfidence(
        successfulReports.length,
        agents.length,
        allFindings.map(f => f.confidence),
        allSources.map(s => s.credibility)
      );

      const result: StepResult = {
        stepNumber,
        focus: strategy.focus,
        agentReports: successfulReports,
        integratedSummary: integratedReport,
        findings: allFindings,
        sources: allSources.map(s => ({
          ...s,
          domain: s.domain ?? 'unknown',
        })),
        gaps: allGaps,
        resolvedGaps: [],
        confidence,
        contradictions: [],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.emit({
        type: 'stepCompleted',
        stepNumber,
        result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emit({
        type: 'researchFailed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      // エラー時は空の結果を返す
      return {
        stepNumber,
        focus: strategy.focus,
        agentReports: [],
        integratedSummary: `Step ${stepNumber} failed: ${errorMessage}`,
        findings: [],
        sources: [],
        gaps: [],
        resolvedGaps: [],
        confidence: 0,
        contradictions: [],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  /**
   * 単一エージェントを実行
   */
  private async executeAgent(
    agent: CascadingAgent,
    context: StepContext
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    this.emit({
      type: 'agentStarted',
      stepNumber: context.stepNumber,
      agentId: agent.id,
      role: agent.role,
      timestamp: new Date().toISOString(),
    });

    try {
      // タイムアウト付きで実行
      const report = await this.executeWithTimeout(
        agent.research(context),
        this.config.agentTimeoutMs
      );

      const durationMs = Date.now() - startTime;

      this.emit({
        type: 'agentCompleted',
        stepNumber: context.stepNumber,
        agentId: agent.id,
        role: agent.role,
        durationMs,
        timestamp: new Date().toISOString(),
      });

      return {
        agentId: agent.id,
        success: !report.error,
        report,
        error: report.error,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        agentId: agent.id,
        success: false,
        error: errorMessage,
        durationMs,
      };
    }
  }

  /**
   * タイムアウト付き実行
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * ソースの重複除去
   */
  private deduplicateSources(
    sources: Array<{ url: string; title: string; fetchedAt: string; credibility: number; domain?: string }>
  ): Array<{ url: string; title: string; fetchedAt: string; credibility: number; domain?: string }> {
    const seen = new Set<string>();
    return sources.filter(source => {
      if (seen.has(source.url)) {
        return false;
      }
      seen.add(source.url);
      return true;
    });
  }

  /**
   * 統合レポートを生成
   */
  private generateIntegratedReport(
    stepNumber: number,
    strategy: StepStrategyConfig,
    reports: CascadingAgentReport[]
  ): string {
    const sections: string[] = [];

    sections.push(`# Step ${stepNumber}: ${this.getFocusLabel(strategy.focus)}\n`);
    sections.push(`**フォーカス**: ${strategy.description || strategy.focus}\n`);
    sections.push(`**完了エージェント数**: ${reports.length}/5\n`);

    // 発見事項サマリー
    const totalFindings = reports.reduce((sum, r) => sum + r.findings.length, 0);
    sections.push(`\n## 発見事項サマリー\n`);
    sections.push(`総発見事項数: ${totalFindings}\n`);

    // 各エージェントの概要
    sections.push(`\n## エージェント別概要\n`);
    for (const report of reports) {
      const roleLabel = this.getRoleLabel(report.role);
      sections.push(`### ${roleLabel}エージェント\n`);
      sections.push(`- 発見事項: ${report.findings.length}件\n`);
      sections.push(`- ソース: ${report.sources.length}件\n`);
      sections.push(`- 特定ギャップ: ${report.gaps.length}件\n`);
    }

    // ギャップサマリー
    const allGaps = [...new Set(reports.flatMap(r => r.gaps))];
    if (allGaps.length > 0) {
      sections.push(`\n## 特定されたギャップ\n`);
      for (const gap of allGaps) {
        sections.push(`- ${gap}\n`);
      }
    }

    return sections.join('');
  }

  /**
   * フォーカスラベルを取得
   */
  private getFocusLabel(focus: string): string {
    const labels: Record<string, string> = {
      overview: '概要調査',
      detail: '詳細調査',
      gap: 'ギャップ分析',
      verify: '検証',
      integrate: '統合',
    };
    return labels[focus] || focus;
  }

  /**
   * 役割ラベルを取得
   */
  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      official: '公式ソース',
      news: 'ニュース',
      analysis: '分析',
      academic: '学術',
      community: 'コミュニティ',
    };
    return labels[role] || role;
  }
}

/**
 * ステップコンテキストビルダー
 */
export class StepContextBuilder {
  private topic: string = '';
  private stepNumber: number = 1;
  private stepFocus: string = 'overview';
  private queryModifiers: string[] = [];
  private previousStepResult?: StepResult;
  private allPreviousResults: StepResult[] = [];
  private keyEntities: string[] = [];
  private identifiedGaps: string[] = [];
  private unresolvedQuestions: string[] = [];

  setTopic(topic: string): this {
    this.topic = topic;
    return this;
  }

  setStepNumber(stepNumber: number): this {
    this.stepNumber = stepNumber;
    return this;
  }

  setStepFocus(focus: string): this {
    this.stepFocus = focus;
    return this;
  }

  setQueryModifiers(modifiers: string[]): this {
    this.queryModifiers = modifiers;
    return this;
  }

  setPreviousStepResult(result: StepResult): this {
    this.previousStepResult = result;
    return this;
  }

  setAllPreviousResults(results: StepResult[]): this {
    this.allPreviousResults = results;
    return this;
  }

  setKeyEntities(entities: string[]): this {
    this.keyEntities = entities;
    return this;
  }

  setIdentifiedGaps(gaps: string[]): this {
    this.identifiedGaps = gaps;
    return this;
  }

  setUnresolvedQuestions(questions: string[]): this {
    this.unresolvedQuestions = questions;
    return this;
  }

  build(): StepContext {
    return {
      topic: this.topic,
      stepNumber: this.stepNumber,
      stepFocus: this.stepFocus as StepContext['stepFocus'],
      queryModifiers: this.queryModifiers,
      previousStepResult: this.previousStepResult,
      allPreviousResults: this.allPreviousResults,
      keyEntities: this.keyEntities,
      identifiedGaps: this.identifiedGaps,
      unresolvedQuestions: this.unresolvedQuestions,
    };
  }
}
