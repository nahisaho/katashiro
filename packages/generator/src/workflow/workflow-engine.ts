/**
 * WorkflowEngine
 * 執筆ワークフロー自動化エンジン
 *
 * @module workflow/workflow-engine
 */

import {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  WorkflowStatus,
  StepResult,
  WorkflowLog,
} from './types.js';

/**
 * ワークフローエンジン
 * ステップベースのワークフロー実行を管理
 */
export class WorkflowEngine {
  private definition: WorkflowDefinition | null = null;
  private context: WorkflowContext | null = null;
  private status: WorkflowStatus = 'idle';
  private stepResults: Map<string, StepResult> = new Map();
  private abortController: AbortController | null = null;

  /**
   * ワークフロー定義をロード
   */
  loadDefinition(definition: WorkflowDefinition): void {
    this.validateDefinition(definition);
    this.definition = definition;
    this.reset();
  }

  /**
   * ワークフロー定義を検証
   */
  private validateDefinition(definition: WorkflowDefinition): void {
    if (!definition.id) {
      throw new Error('Workflow definition must have an id');
    }
    if (!definition.name) {
      throw new Error('Workflow definition must have a name');
    }
    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Workflow definition must have at least one step');
    }

    // ステップIDの重複チェック
    const stepIds = new Set<string>();
    for (const step of definition.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step id: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // 依存関係の検証
    for (const step of definition.steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            throw new Error(`Step ${step.id} depends on non-existent step ${depId}`);
          }
        }
      }
    }

    // 循環依存のチェック
    this.checkCircularDependencies(definition.steps);
  }

  /**
   * 循環依存をチェック
   */
  private checkCircularDependencies(steps: WorkflowStep[]): void {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    const dfs = (stepId: string): void => {
      if (inStack.has(stepId)) {
        throw new Error(`Circular dependency detected involving step: ${stepId}`);
      }
      if (visited.has(stepId)) {
        return;
      }

      visited.add(stepId);
      inStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step?.dependsOn) {
        for (const depId of step.dependsOn) {
          dfs(depId);
        }
      }

      inStack.delete(stepId);
    };

    for (const step of steps) {
      dfs(step.id);
    }
  }

  /**
   * ワークフローを実行
   */
  async execute(input: unknown): Promise<WorkflowResult> {
    if (!this.definition) {
      throw new Error('No workflow definition loaded');
    }

    this.reset();
    this.status = 'running';
    this.abortController = new AbortController();

    const executionId = this.generateExecutionId();
    this.context = this.createContext(executionId, input);

    const result: WorkflowResult = {
      executionId,
      workflowId: this.definition.id,
      status: 'running',
      stepResults: this.stepResults,
      startedAt: this.context.startedAt,
      logs: this.context.logs,
    };

    try {
      // onStartフック
      await this.definition.hooks?.onStart?.(this.context);
      this.log('info', `Workflow started: ${this.definition.name}`);

      // ステップを依存関係順に実行
      const executionOrder = this.resolveExecutionOrder();
      for (const step of executionOrder) {
        if (this.status as WorkflowStatus === 'cancelled') {
          this.log('info', 'Workflow cancelled');
          break;
        }

        await this.executeStep(step);

        // ステップが失敗し、設定がstopの場合は中断
        const stepResult = this.stepResults.get(step.id);
        if (stepResult?.status === 'failed' && this.definition.config?.onStepError !== 'continue') {
          this.status = 'failed';
          result.error = stepResult.error;
          break;
        }
      }

      // 完了処理
      if (this.status === 'running') {
        this.status = 'completed';
      }

      // onCompleteフック
      if (this.status === 'completed') {
        await this.definition.hooks?.onComplete?.(this.context);
        this.log('info', `Workflow completed: ${this.definition.name}`);
      }
    } catch (error) {
      this.status = 'failed';
      result.error = error instanceof Error ? error : new Error(String(error));
      await this.definition.hooks?.onError?.(result.error, this.context);
      this.log('error', `Workflow failed: ${result.error.message}`);
    }

    result.status = this.status;
    result.completedAt = new Date();
    result.totalDurationMs = result.completedAt.getTime() - result.startedAt.getTime();
    result.output = this.getLastStepOutput();

    return result;
  }

  /**
   * ステップを実行
   */
  private async executeStep(step: WorkflowStep): Promise<void> {
    if (!this.context) return;

    // 条件チェック
    if (step.condition && !step.condition(this.context)) {
      this.stepResults.set(step.id, {
        stepId: step.id,
        status: 'skipped',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
        retryCount: 0,
      });
      this.log('info', `Step skipped (condition not met): ${step.name}`, step.id);
      return;
    }

    const stepResult: StepResult = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
    };
    this.stepResults.set(step.id, stepResult);
    this.context.currentStep = step.id;

    // onStepStartフック
    await this.definition?.hooks?.onStepStart?.(step, this.context);
    this.log('info', `Step started: ${step.name}`, step.id);

    const maxAttempts = step.retry?.maxAttempts ?? 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 入力を取得（依存ステップの出力を使用）
        const input = this.getStepInput(step);

        // タイムアウト付き実行
        const output = await this.executeWithTimeout(step, input);

        stepResult.status = 'completed';
        stepResult.output = output;
        stepResult.completedAt = new Date();
        stepResult.durationMs = stepResult.completedAt.getTime() - stepResult.startedAt.getTime();

        // 結果をコンテキストに保存
        this.context.results.set(step.id, output);

        // onStepCompleteフック
        await this.definition?.hooks?.onStepComplete?.(step, output, this.context);
        this.log('info', `Step completed: ${step.name} (${stepResult.durationMs}ms)`, step.id);

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        stepResult.retryCount = attempt;

        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(step, attempt);
          this.log('warn', `Step failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts}): ${step.name}`, step.id);
          await this.sleep(delay);
        }
      }
    }

    // 全リトライ失敗
    stepResult.status = step.onError === 'skip' ? 'skipped' : 'failed';
    stepResult.error = lastError;
    stepResult.completedAt = new Date();
    stepResult.durationMs = stepResult.completedAt.getTime() - stepResult.startedAt.getTime();

    // onStepErrorフック
    await this.definition?.hooks?.onStepError?.(step, lastError!, this.context);
    this.log('error', `Step failed: ${step.name} - ${lastError?.message}`, step.id);
  }

  /**
   * タイムアウト付きでステップを実行
   */
  private async executeWithTimeout(step: WorkflowStep, input: unknown): Promise<unknown> {
    const timeout = step.timeout ?? this.definition?.config?.timeout ?? 30000;

    return Promise.race([
      step.execute(input, this.context!),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), timeout);
      }),
    ]);
  }

  /**
   * ステップの入力を取得
   */
  private getStepInput(step: WorkflowStep): unknown {
    if (!this.context) return undefined;

    if (step.dependsOn && step.dependsOn.length > 0) {
      // 依存ステップの出力をマージ
      const inputs: Record<string, unknown> = {};
      for (const depId of step.dependsOn) {
        inputs[depId] = this.context.results.get(depId);
      }
      return inputs;
    }

    return this.context.input;
  }

  /**
   * リトライ遅延を計算
   */
  private calculateRetryDelay(step: WorkflowStep, attempt: number): number {
    const baseDelay = step.retry?.delayMs ?? 1000;
    const multiplier = step.retry?.backoffMultiplier ?? 2;
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * 実行順序を解決（トポロジカルソート）
   */
  private resolveExecutionOrder(): WorkflowStep[] {
    if (!this.definition) return [];

    const steps = this.definition.steps;
    const stepMap = new Map(steps.map((s) => [s.id, s]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // 初期化
    for (const step of steps) {
      inDegree.set(step.id, 0);
      adjacency.set(step.id, []);
    }

    // 入次数と隣接リストを構築
    for (const step of steps) {
      if (step.dependsOn) {
        inDegree.set(step.id, step.dependsOn.length);
        for (const depId of step.dependsOn) {
          adjacency.get(depId)?.push(step.id);
        }
      }
    }

    // 入次数0のノードから開始
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: WorkflowStep[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const step = stepMap.get(id);
      if (step) {
        result.push(step);
      }

      for (const neighbor of adjacency.get(id) ?? []) {
        const degree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * 最後のステップの出力を取得
   */
  private getLastStepOutput(): unknown {
    if (!this.definition || !this.context) return undefined;

    const order = this.resolveExecutionOrder();
    for (let i = order.length - 1; i >= 0; i--) {
      const step = order[i];
      if (!step) continue;
      const result = this.stepResults.get(step.id);
      if (result?.status === 'completed') {
        return result.output;
      }
    }
    return undefined;
  }

  /**
   * ワークフローをキャンセル
   */
  cancel(): void {
    this.status = 'cancelled';
    this.abortController?.abort();
    this.log('info', 'Workflow cancellation requested');
  }

  /**
   * ワークフローを一時停止
   */
  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.log('info', 'Workflow paused');
    }
  }

  /**
   * ワークフローを再開
   */
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.log('info', 'Workflow resumed');
    }
  }

  /**
   * 現在の状態を取得
   */
  getStatus(): WorkflowStatus {
    return this.status;
  }

  /**
   * ステップ結果を取得
   */
  getStepResults(): Map<string, StepResult> {
    return new Map(this.stepResults);
  }

  /**
   * コンテキストを取得
   */
  getContext(): WorkflowContext | null {
    return this.context;
  }

  /**
   * リセット
   */
  private reset(): void {
    this.status = 'idle';
    this.stepResults.clear();
    this.context = null;
    this.abortController = null;
  }

  /**
   * コンテキストを作成
   */
  private createContext(executionId: string, input: unknown): WorkflowContext {
    return {
      workflowId: this.definition!.id,
      executionId,
      input,
      results: new Map(),
      metadata: {},
      startedAt: new Date(),
      logs: [],
    };
  }

  /**
   * 実行IDを生成
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * ログを追加
   */
  private log(
    level: WorkflowLog['level'],
    message: string,
    stepId?: string,
    data?: unknown
  ): void {
    const log: WorkflowLog = {
      timestamp: new Date(),
      level,
      message,
      stepId,
      data,
    };
    this.context?.logs.push(log);
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 簡単なワークフロー定義を作成するヘルパー
 */
export function createWorkflow(
  id: string,
  name: string,
  steps: Array<{
    id: string;
    name: string;
    type: WorkflowStep['type'];
    execute: WorkflowStep['execute'];
    dependsOn?: string[];
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    steps: steps.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      execute: s.execute,
      dependsOn: s.dependsOn,
    })),
  };
}
