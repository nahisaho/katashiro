/**
 * MultiAgentOrchestrator - マルチエージェント並列実行オーケストレーター
 *
 * @requirement REQ-006
 * @design REQ-006-01 複雑タスクを独立サブタスクに分解
 * @design REQ-006-02 1秒以内にサブエージェント生成
 * @design REQ-006-03 1-100の並列実行管理
 * @design REQ-006-04 コンテキスト汚染防止
 * @design REQ-006-05 結果集約・重複除去
 * @design REQ-006-06 部分失敗でも継続
 */

import { generateId, Timestamp, isErr } from '@nahisaho/katashiro-core';
import { TaskDecomposer } from './task-decomposer';
import {
  SubTask,
  SubAgent,
  AgentContext,
  AgentRole,
  TaskResult,
  TaskError,
  OrchestrationConfig,
  OrchestratorEvent,
  OrchestratorEventListener,
  OrchestratorEventType,
  DEFAULT_ORCHESTRATION_CONFIG,
} from './types';

/**
 * 結果集約設定
 */
export interface ResultAggregatorConfig {
  /** 重複除去を有効化 */
  deduplication: boolean;
  /** 重複判定の類似度閾値（0-1） */
  similarityThreshold: number;
  /** 結果のソート順 */
  sortBy: 'priority' | 'completion_time' | 'relevance';
}

/**
 * 集約結果
 */
export interface AggregatedResult {
  /** 成功/失敗 */
  success: boolean;
  /** 集約された出力 */
  output: unknown;
  /** 元の結果数 */
  originalCount: number;
  /** 重複除去後の結果数 */
  dedupedCount: number;
  /** 失敗したサブタスク */
  failures: Array<{ taskId: string; error: TaskError }>;
  /** メタデータ */
  metadata: {
    totalDuration: number;
    agentsUsed: number;
    deduplicationApplied: boolean;
  };
}

/**
 * MultiAgentOrchestratorオプション
 */
export interface MultiAgentOrchestratorOptions {
  /** オーケストレーション設定 */
  config?: Partial<OrchestrationConfig>;
  /** タスク分解器 */
  taskDecomposer?: TaskDecomposer;
  /** 結果集約設定 */
  aggregatorConfig?: Partial<ResultAggregatorConfig>;
  /** サブタスク実行関数 */
  taskExecutor?: (task: SubTask, agent: SubAgent) => Promise<TaskResult>;
}

/**
 * デフォルト結果集約設定
 */
const DEFAULT_AGGREGATOR_CONFIG: ResultAggregatorConfig = {
  deduplication: true,
  similarityThreshold: 0.9,
  sortBy: 'priority',
};

/**
 * マルチエージェントオーケストレーター
 */
export class MultiAgentOrchestrator {
  private readonly config: OrchestrationConfig;
  private readonly taskDecomposer: TaskDecomposer;
  private readonly aggregatorConfig: ResultAggregatorConfig;
  private readonly taskExecutor: (task: SubTask, agent: SubAgent) => Promise<TaskResult>;
  private readonly agents: Map<string, SubAgent> = new Map();
  private readonly listeners: Map<OrchestratorEventType, OrchestratorEventListener[]> = new Map();
  private runningAgents: number = 0;

  constructor(options: MultiAgentOrchestratorOptions = {}) {
    this.config = {
      ...DEFAULT_ORCHESTRATION_CONFIG,
      ...options.config,
    };

    this.taskDecomposer = options.taskDecomposer ?? new TaskDecomposer();

    this.aggregatorConfig = {
      ...DEFAULT_AGGREGATOR_CONFIG,
      ...options.aggregatorConfig,
    };

    // デフォルトのタスク実行関数（モック）
    this.taskExecutor = options.taskExecutor ?? this.defaultTaskExecutor.bind(this);
  }

  /**
   * タスクを実行（REQ-006-01）
   */
  async execute(taskDescription: string): Promise<AggregatedResult> {
    const startTime = Date.now();

    // 1. タスク分解
    const planResult = await this.taskDecomposer.decompose(taskDescription);
    if (isErr(planResult)) {
      return {
        success: false,
        output: null,
        originalCount: 0,
        dedupedCount: 0,
        failures: [{
          taskId: 'decomposition',
          error: {
            code: planResult.error.code,
            message: planResult.error.message,
            retryable: false,
          },
        }],
        metadata: {
          totalDuration: Date.now() - startTime,
          agentsUsed: 0,
          deduplicationApplied: false,
        },
      };
    }
    const plan = planResult.value;
    this.emit('plan:created', { plan });

    // 2. サブエージェント生成（REQ-006-02: 1秒以内）
    const spawnStart = Date.now();
    const subAgents = await this.spawnSubAgents(plan.tasks);
    const spawnDuration = Date.now() - spawnStart;

    if (spawnDuration > 1000) {
      console.warn(`[MultiAgentOrchestrator] Agent spawn took ${spawnDuration}ms (exceeds 1s target)`);
    }

    // 3. 並列実行（REQ-006-03）
    const results = await this.executeParallel(plan.tasks, subAgents);

    // 4. 結果集約（REQ-006-05）
    const aggregated = await this.aggregate(results);

    // 5. クリーンアップ
    await this.terminateAllAgents();

    const totalDuration = Date.now() - startTime;

    return {
      ...aggregated,
      metadata: {
        totalDuration,
        agentsUsed: subAgents.length,
        deduplicationApplied: this.aggregatorConfig.deduplication,
      },
    };
  }

  /**
   * サブエージェントを生成（REQ-006-02）
   */
  async spawnSubAgents(tasks: SubTask[]): Promise<SubAgent[]> {
    const agents: SubAgent[] = [];

    for (const task of tasks) {
      const agent = this.createAgent(task);
      this.agents.set(agent.id, agent);
      agents.push(agent);
      this.emit('agent:spawned', { agent, taskId: task.id });
    }

    return agents;
  }

  /**
   * タスクを並列実行（REQ-006-03, REQ-006-04, REQ-006-06）
   */
  private async executeParallel(
    tasks: SubTask[],
    agents: SubAgent[]
  ): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    const taskAgentMap = new Map<string, SubAgent>();

    // タスクとエージェントのマッピング
    tasks.forEach((task, index) => {
      const agent = agents[index];
      if (agent) {
        taskAgentMap.set(task.id, agent);
      }
    });

    // 並列実行（同時実行数制限あり）
    const taskQueue = [...tasks];
    const runningTasks: Promise<void>[] = [];

    while (taskQueue.length > 0 || runningTasks.length > 0) {
      // 同時実行数を超えない範囲でタスクを開始
      while (
        taskQueue.length > 0 &&
        this.runningAgents < this.config.maxConcurrentAgents
      ) {
        const task = taskQueue.shift()!;
        const agent = taskAgentMap.get(task.id)!;

        const taskPromise = this.executeTask(task, agent)
          .then((result) => {
            results.set(task.id, result);
          })
          .catch((error) => {
            // REQ-006-06: 失敗しても継続
            const errorResult: TaskResult = {
              success: false,
              error: {
                code: 'EXECUTION_ERROR',
                message: error.message,
                retryable: false,
              },
              duration: 0,
              completedAt: new Date().toISOString() as Timestamp,
            };
            results.set(task.id, errorResult);
            this.emit('task:failed', { taskId: task.id, error });
          });

        runningTasks.push(taskPromise);
      }

      // 1つでも完了するまで待機
      if (runningTasks.length > 0) {
        await Promise.race(runningTasks);
        // 完了したPromiseを除去（簡易実装）
        await new Promise(resolve => setTimeout(resolve, 10));
        runningTasks.length = 0;
      }
    }

    // 全タスク完了を待機
    await Promise.all(runningTasks);

    return results;
  }

  /**
   * 単一タスクを実行
   */
  private async executeTask(task: SubTask, agent: SubAgent): Promise<TaskResult> {
    this.runningAgents++;
    agent.state = 'working';
    this.emit('task:started', { taskId: task.id, agentId: agent.id });

    try {
      const result = await this.withTimeout(
        this.taskExecutor(task, agent),
        this.config.agentTimeout * 1000
      );

      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      agent.state = 'idle';

      this.emit('task:completed', { taskId: task.id, result });

      return result;
    } catch (error) {
      task.status = 'failed';
      agent.state = 'error';

      const taskError: TaskError = {
        code: 'TASK_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      };

      const result: TaskResult = {
        success: false,
        error: taskError,
        duration: 0,
        completedAt: new Date().toISOString() as Timestamp,
      };

      task.result = result;
      this.emit('task:failed', { taskId: task.id, error: taskError });

      return result;
    } finally {
      this.runningAgents--;
    }
  }

  /**
   * 結果を集約（REQ-006-05）
   */
  async aggregate(
    results: Map<string, TaskResult>
  ): Promise<Omit<AggregatedResult, 'metadata'>> {
    const outputs: unknown[] = [];
    const failures: Array<{ taskId: string; error: TaskError }> = [];

    for (const [taskId, result] of results) {
      if (result.success && result.output !== undefined) {
        outputs.push(result.output);
      } else if (!result.success && result.error) {
        failures.push({ taskId, error: result.error });
      }
    }

    // 重複除去
    const dedupedOutputs = this.aggregatorConfig.deduplication
      ? this.deduplicateResults(outputs)
      : outputs;

    // ソート
    const sortedOutputs = this.sortResults(dedupedOutputs);

    return {
      success: failures.length === 0,
      output: sortedOutputs,
      originalCount: outputs.length,
      dedupedCount: dedupedOutputs.length,
      failures,
    };
  }

  /**
   * 結果の重複を除去
   */
  private deduplicateResults(results: unknown[]): unknown[] {
    if (results.length <= 1) return results;

    const unique: unknown[] = [];
    const seenHashes = new Set<string>();

    for (const result of results) {
      const hash = this.hashResult(result);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * 結果をソート
   */
  private sortResults(results: unknown[]): unknown[] {
    // デフォルトは順序を維持
    return results;
  }

  /**
   * 結果のハッシュを生成
   */
  private hashResult(result: unknown): string {
    return JSON.stringify(result);
  }

  /**
   * エージェントを作成（REQ-006-04: 独立コンテキスト）
   */
  private createAgent(task: SubTask): SubAgent {
    const agentId = generateId('agent');
    const contextId = generateId('ctx');

    // 独立したコンテキストを作成（コンテキスト汚染防止）
    const context: AgentContext = {
      id: contextId,
      taskInfo: {
        taskId: task.id,
        taskName: task.name,
        input: task.input,
      },
      conversationHistory: [],
      intermediateResults: [],
      memoryUsage: 0,
      maxMemory: this.config.maxAgentMemory,
    };

    const agent: SubAgent = {
      id: agentId,
      name: `Agent-${task.name}`,
      role: this.determineAgentRole(task),
      state: 'idle',
      assignedTaskId: task.id,
      context,
      availableTools: [],
      createdAt: new Date().toISOString() as Timestamp,
      lastActivity: new Date().toISOString() as Timestamp,
    };

    return agent;
  }

  /**
   * タスクからエージェントロールを決定
   */
  private determineAgentRole(task: SubTask): AgentRole {
    const name = task.name.toLowerCase();
    if (name.includes('research') || name.includes('search')) return 'researcher';
    if (name.includes('analyze') || name.includes('analysis')) return 'analyzer';
    if (name.includes('generate') || name.includes('create')) return 'generator';
    if (name.includes('validate') || name.includes('verify')) return 'validator';
    if (name.includes('execute') || name.includes('run')) return 'executor';
    return 'custom';
  }

  /**
   * デフォルトのタスク実行関数
   */
  private async defaultTaskExecutor(task: SubTask, agent: SubAgent): Promise<TaskResult> {
    // モック実装: 実際のLLM呼び出しは外部から注入
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      output: {
        taskId: task.id,
        agentId: agent.id,
        result: `Completed: ${task.name}`,
      },
      duration: 50,
      completedAt: new Date().toISOString() as Timestamp,
    };
  }

  /**
   * タイムアウト付きPromise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * 全エージェントを終了
   */
  private async terminateAllAgents(): Promise<void> {
    for (const [id, agent] of this.agents) {
      agent.state = 'terminated';
      this.emit('agent:terminated', { agentId: id });
    }
    this.agents.clear();
  }

  /**
   * イベントリスナーを登録
   */
  on(event: OrchestratorEventType, listener: OrchestratorEventListener): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  /**
   * イベントを発行
   */
  private emit(type: OrchestratorEventType, data: unknown): void {
    const event: OrchestratorEvent = {
      type,
      data,
      timestamp: new Date().toISOString() as Timestamp,
    };

    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[MultiAgentOrchestrator] Event listener error:`, error);
      }
    }
  }

  /**
   * 設定を取得
   */
  getConfig(): OrchestrationConfig {
    return { ...this.config };
  }

  /**
   * 現在のエージェント数を取得
   */
  getRunningAgentCount(): number {
    return this.runningAgents;
  }

  /**
   * 全エージェントを取得
   */
  getAgents(): SubAgent[] {
    return Array.from(this.agents.values());
  }
}
