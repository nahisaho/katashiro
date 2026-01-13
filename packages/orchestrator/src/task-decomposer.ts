/**
 * Task Decomposer
 *
 * @fileoverview REQ-009: タスク分解・計画の実装
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.0
 */

import { ok, err, type Result, generateId } from '@nahisaho/katashiro-core';
import type {
  SubTask,
  ExecutionPlan,
  TaskInput,
  TaskPriority,
  DecompositionConfig,
} from './types';
import { DEFAULT_DECOMPOSITION_CONFIG } from './types';

/**
 * タスク分解エラー
 */
export class DecompositionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DecompositionError';
  }
}

/**
 * タスク分解戦略
 */
export interface DecompositionStrategy {
  /** 戦略名 */
  readonly name: string;
  /** 適用可能か判定 */
  canApply(task: string, context?: Record<string, unknown>): boolean;
  /** タスクを分解 */
  decompose(
    task: string,
    context?: Record<string, unknown>
  ): Promise<DecomposedTask[]>;
}

/**
 * 分解されたタスク（中間形式）
 */
export interface DecomposedTask {
  /** タスク名 */
  name: string;
  /** 説明 */
  description: string;
  /** 入力タイプ */
  inputType: TaskInput['type'];
  /** 優先度 */
  priority: TaskPriority;
  /** 依存タスク名（インデックス） */
  dependsOn: string[];
  /** 推定時間（秒） */
  estimatedDuration?: number;
}

/**
 * タスク分解器
 *
 * EARS Requirements:
 * - Event-Driven: When a complex task is received, the system shall decompose it into subtasks
 * - Ubiquitous: The system shall generate a DAG representing task dependencies
 * - State-Driven: While decomposing, the system shall validate dependency constraints
 */
export class TaskDecomposer {
  private readonly config: DecompositionConfig;
  private readonly strategies: DecompositionStrategy[] = [];

  constructor(config: Partial<DecompositionConfig> = {}) {
    this.config = { ...DEFAULT_DECOMPOSITION_CONFIG, ...config };
    this.registerDefaultStrategies();
  }

  /**
   * デフォルト戦略を登録
   */
  private registerDefaultStrategies(): void {
    // リサーチタスク戦略
    this.registerStrategy({
      name: 'research',
      canApply: (task) =>
        /調べ|リサーチ|調査|検索|探/.test(task) ||
        /research|search|investigate/i.test(task),
      decompose: async (task) => this.decomposeResearchTask(task),
    });

    // 分析タスク戦略
    this.registerStrategy({
      name: 'analysis',
      canApply: (task) =>
        /分析|解析|評価|比較/.test(task) ||
        /analy|evaluat|compar/i.test(task),
      decompose: async (task) => this.decomposeAnalysisTask(task),
    });

    // レポート作成戦略
    this.registerStrategy({
      name: 'report',
      canApply: (task) =>
        /レポート|報告|まとめ|文書/.test(task) ||
        /report|document|summar/i.test(task),
      decompose: async (task) => this.decomposeReportTask(task),
    });

    // 汎用戦略（フォールバック）
    this.registerStrategy({
      name: 'generic',
      canApply: () => true,
      decompose: async (task) => this.decomposeGenericTask(task),
    });
  }

  /**
   * 戦略を登録
   */
  registerStrategy(strategy: DecompositionStrategy): void {
    // 汎用戦略の前に挿入
    const genericIndex = this.strategies.findIndex((s) => s.name === 'generic');
    if (genericIndex >= 0) {
      this.strategies.splice(genericIndex, 0, strategy);
    } else {
      this.strategies.push(strategy);
    }
  }

  /**
   * タスクを分解して実行計画を生成
   */
  async decompose(
    task: string,
    context?: Record<string, unknown>
  ): Promise<Result<ExecutionPlan, DecompositionError>> {
    try {
      // 適用可能な戦略を選択
      const strategy = this.strategies.find((s) => s.canApply(task, context));
      if (!strategy) {
        return err(
          new DecompositionError(
            'No applicable decomposition strategy found',
            'NO_STRATEGY'
          )
        );
      }

      // タスクを分解
      const decomposed = await strategy.decompose(task, context);

      // サブタスク数の検証
      if (decomposed.length > this.config.maxSubTasks) {
        return err(
          new DecompositionError(
            `Too many subtasks: ${decomposed.length} > ${this.config.maxSubTasks}`,
            'TOO_MANY_SUBTASKS',
            { count: decomposed.length, max: this.config.maxSubTasks }
          )
        );
      }

      // SubTaskオブジェクトに変換
      const now = new Date().toISOString();
      const taskMap = new Map<string, SubTask>();
      const subtasks: SubTask[] = decomposed.map((dt) => {
        const subtask: SubTask = {
          id: generateId(),
          name: dt.name,
          description: dt.description,
          input: { type: dt.inputType, content: null },
          priority: dt.priority,
          status: 'pending',
          dependencies: [], // 後で解決
          estimatedDuration: dt.estimatedDuration,
          createdAt: now,
          updatedAt: now,
        };
        taskMap.set(dt.name, subtask);
        return subtask;
      });

      // 依存関係を解決
      for (let i = 0; i < decomposed.length; i++) {
        const dt = decomposed[i]!;
        const deps: string[] = [];
        for (const depName of dt.dependsOn) {
          const depTask = taskMap.get(depName);
          if (depTask) {
            deps.push(depTask.id);
          }
        }
        // TypeScriptの制約のため、新しいオブジェクトを作成
        const existing = subtasks[i]!;
        subtasks[i] = { ...existing, dependencies: deps };
      }

      // 依存関係の深さを検証
      const depthResult = this.validateDependencyDepth(subtasks);
      if (!depthResult.valid) {
        return err(
          new DecompositionError(
            `Dependency depth exceeds limit: ${depthResult.maxDepth} > ${this.config.maxDependencyDepth}`,
            'DEPENDENCY_TOO_DEEP',
            { maxDepth: depthResult.maxDepth }
          )
        );
      }

      // 循環依存をチェック
      const cycleResult = this.detectCycles(subtasks);
      if (cycleResult.hasCycle) {
        return err(
          new DecompositionError(
            'Circular dependency detected',
            'CIRCULAR_DEPENDENCY',
            { cycle: cycleResult.cycle }
          )
        );
      }

      // 実行順序を計算（トポロジカルソート）
      const executionOrder = this.topologicalSort(subtasks);

      // 並列実行可能なグループを計算
      const parallelGroups = this.config.allowParallel
        ? this.computeParallelGroups(subtasks, executionOrder)
        : executionOrder.map((id) => [id]);

      // 総推定時間を計算
      const estimatedTotalDuration = this.estimateTotalDuration(
        subtasks,
        parallelGroups
      );

      const plan: ExecutionPlan = {
        id: generateId(),
        name: `Plan for: ${task.slice(0, 50)}${task.length > 50 ? '...' : ''}`,
        originalTask: task,
        tasks: subtasks,
        executionOrder,
        parallelGroups,
        estimatedTotalDuration,
        createdAt: now,
        status: 'draft',
      };

      return ok(plan);
    } catch (error) {
      return err(
        new DecompositionError(
          `Decomposition failed: ${error instanceof Error ? error.message : String(error)}`,
          'DECOMPOSITION_FAILED',
          { originalError: error }
        )
      );
    }
  }

  /**
   * リサーチタスクの分解
   */
  private async decomposeResearchTask(task: string): Promise<DecomposedTask[]> {
    // キーワード抽出（簡易版）
    const keywords = this.extractKeywords(task);

    return [
      {
        name: 'search',
        description: `「${keywords.join('、')}」に関する情報を検索`,
        inputType: 'text',
        priority: 'high',
        dependsOn: [],
        estimatedDuration: 30,
      },
      {
        name: 'scrape',
        description: '検索結果から関連ページを取得',
        inputType: 'url',
        priority: 'high',
        dependsOn: ['search'],
        estimatedDuration: 60,
      },
      {
        name: 'analyze',
        description: '取得した情報を分析',
        inputType: 'text',
        priority: 'medium',
        dependsOn: ['scrape'],
        estimatedDuration: 30,
      },
      {
        name: 'extract',
        description: '重要なエンティティを抽出',
        inputType: 'text',
        priority: 'medium',
        dependsOn: ['scrape'],
        estimatedDuration: 20,
      },
      {
        name: 'summarize',
        description: '情報を要約',
        inputType: 'text',
        priority: 'medium',
        dependsOn: ['analyze', 'extract'],
        estimatedDuration: 20,
      },
    ];
  }

  /**
   * 分析タスクの分解
   */
  private async decomposeAnalysisTask(_task: string): Promise<DecomposedTask[]> {
    return [
      {
        name: 'prepare',
        description: 'データの前処理',
        inputType: 'data',
        priority: 'high',
        dependsOn: [],
        estimatedDuration: 15,
      },
      {
        name: 'analyze_text',
        description: 'テキスト分析（キーワード、複雑度）',
        inputType: 'text',
        priority: 'high',
        dependsOn: ['prepare'],
        estimatedDuration: 20,
      },
      {
        name: 'analyze_structure',
        description: '構造分析',
        inputType: 'text',
        priority: 'medium',
        dependsOn: ['prepare'],
        estimatedDuration: 15,
      },
      {
        name: 'extract_entities',
        description: 'エンティティ抽出',
        inputType: 'text',
        priority: 'medium',
        dependsOn: ['prepare'],
        estimatedDuration: 20,
      },
      {
        name: 'synthesize',
        description: '分析結果の統合',
        inputType: 'data',
        priority: 'high',
        dependsOn: ['analyze_text', 'analyze_structure', 'extract_entities'],
        estimatedDuration: 15,
      },
    ];
  }

  /**
   * レポート作成タスクの分解
   */
  private async decomposeReportTask(_task: string): Promise<DecomposedTask[]> {
    return [
      {
        name: 'gather',
        description: '情報収集',
        inputType: 'mixed',
        priority: 'high',
        dependsOn: [],
        estimatedDuration: 30,
      },
      {
        name: 'outline',
        description: 'アウトライン作成',
        inputType: 'data',
        priority: 'high',
        dependsOn: ['gather'],
        estimatedDuration: 10,
      },
      {
        name: 'draft_sections',
        description: '各セクションの下書き',
        inputType: 'data',
        priority: 'high',
        dependsOn: ['outline'],
        estimatedDuration: 45,
      },
      {
        name: 'generate_citations',
        description: '引用・参照の生成',
        inputType: 'data',
        priority: 'medium',
        dependsOn: ['gather'],
        estimatedDuration: 15,
      },
      {
        name: 'finalize',
        description: 'レポートの最終化',
        inputType: 'data',
        priority: 'high',
        dependsOn: ['draft_sections', 'generate_citations'],
        estimatedDuration: 20,
      },
    ];
  }

  /**
   * 汎用タスクの分解
   */
  private async decomposeGenericTask(_task: string): Promise<DecomposedTask[]> {
    return [
      {
        name: 'understand',
        description: 'タスクの理解と要件分析',
        inputType: 'text',
        priority: 'high',
        dependsOn: [],
        estimatedDuration: 10,
      },
      {
        name: 'plan',
        description: '実行計画の作成',
        inputType: 'data',
        priority: 'high',
        dependsOn: ['understand'],
        estimatedDuration: 10,
      },
      {
        name: 'execute',
        description: 'タスクの実行',
        inputType: 'mixed',
        priority: 'high',
        dependsOn: ['plan'],
        estimatedDuration: 60,
      },
      {
        name: 'verify',
        description: '結果の検証',
        inputType: 'data',
        priority: 'medium',
        dependsOn: ['execute'],
        estimatedDuration: 15,
      },
    ];
  }

  /**
   * キーワード抽出（簡易版）
   */
  private extractKeywords(text: string): string[] {
    // 助詞や一般的な動詞を除去
    const stopWords = [
      'について',
      'に関して',
      'を',
      'の',
      'が',
      'は',
      'で',
      'と',
      '調べ',
      'して',
      'まとめ',
      'ください',
    ];
    let processed = text;
    for (const sw of stopWords) {
      processed = processed.replace(new RegExp(sw, 'g'), ' ');
    }
    return processed
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 5);
  }

  /**
   * 依存関係の深さを検証
   */
  private validateDependencyDepth(tasks: SubTask[]): {
    valid: boolean;
    maxDepth: number;
  } {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    let maxDepth = 0;

    const calculateDepth = (taskId: string, visited: Set<string>): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task || task.dependencies.length === 0) return 0;

      let max = 0;
      for (const depId of task.dependencies) {
        const depth = calculateDepth(depId, visited) + 1;
        max = Math.max(max, depth);
      }
      return max;
    };

    for (const task of tasks) {
      const depth = calculateDepth(task.id, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      valid: maxDepth <= this.config.maxDependencyDepth,
      maxDepth,
    };
  }

  /**
   * 循環依存を検出
   */
  private detectCycles(tasks: SubTask[]): {
    hasCycle: boolean;
    cycle?: string[];
  } {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);
      path.push(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId)) return true;
          } else if (recStack.has(depId)) {
            path.push(depId);
            return true;
          }
        }
      }

      path.pop();
      recStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (dfs(task.id)) {
          return { hasCycle: true, cycle: [...path] };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * トポロジカルソート
   */
  private topologicalSort(tasks: SubTask[]): string[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }
      result.push(taskId);
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return result;
  }

  /**
   * 並列実行可能なグループを計算
   * 
   * maxConcurrentTasks の制限を適用し、大きなグループを分割します。
   */
  private computeParallelGroups(
    tasks: SubTask[],
    executionOrder: string[]
  ): string[][] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const completed = new Set<string>();
    const groups: string[][] = [];
    const maxConcurrent = this.config.maxConcurrentTasks;

    while (completed.size < tasks.length) {
      const readyTasks: string[] = [];

      for (const taskId of executionOrder) {
        if (completed.has(taskId)) continue;

        const task = taskMap.get(taskId);
        if (!task) continue;

        // すべての依存が完了しているか確認
        const depsCompleted = task.dependencies.every((depId) =>
          completed.has(depId)
        );
        if (depsCompleted) {
          readyTasks.push(taskId);
        }
      }

      if (readyTasks.length === 0) break; // デッドロック防止

      // maxConcurrentTasks の制限を適用してグループを分割
      for (let i = 0; i < readyTasks.length; i += maxConcurrent) {
        const chunk = readyTasks.slice(i, i + maxConcurrent);
        groups.push(chunk);
        for (const id of chunk) {
          completed.add(id);
        }
      }
    }

    return groups;
  }

  /**
   * 総推定時間を計算（並列実行を考慮）
   */
  private estimateTotalDuration(
    tasks: SubTask[],
    parallelGroups: string[][]
  ): number {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    let total = 0;

    for (const group of parallelGroups) {
      // グループ内で最も長いタスクの時間
      let maxDuration = 0;
      for (const taskId of group) {
        const task = taskMap.get(taskId);
        if (task?.estimatedDuration) {
          maxDuration = Math.max(maxDuration, task.estimatedDuration);
        }
      }
      total += maxDuration;
    }

    return total;
  }
}
