/**
 * Tool Registry - Action-Observation Pattern Implementation
 *
 * @fileoverview REQ-010: Action-Observation型安全ツールシステムの実装
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.0
 */

import { EventEmitter } from 'events';
import { ok, err, type Result, generateId } from '@nahisaho/katashiro-core';
import type {
  Action,
  Observation,
  ToolDefinition,
  ToolExecutionContext,
  ToolRegistryConfig,
  SecurityAssessment,
  RiskFactor,
  RiskLevel,
  ActionCategory,
} from './action-observation-types';
import { DEFAULT_TOOL_REGISTRY_CONFIG } from './action-observation-types';

// =============================================================================
// イベント型定義
// =============================================================================

/**
 * 承認リクエストイベントペイロード
 */
export interface ApprovalRequestEvent {
  /** アクションID */
  readonly actionId: string;
  /** ツール名 */
  readonly toolName: string;
  /** リスク評価 */
  readonly assessment: SecurityAssessment;
  /** アクション詳細 */
  readonly action: Action;
  /** タイムアウト（ミリ秒） */
  readonly timeoutMs: number;
}

/**
 * 承認解決イベントペイロード
 */
export interface ApprovalResolvedEvent {
  /** アクションID */
  readonly actionId: string;
  /** 承認されたか */
  readonly approved: boolean;
  /** 解決元（'user' | 'timeout' | 'api'） */
  readonly resolvedBy: 'user' | 'timeout' | 'api';
}

/**
 * ToolRegistryイベントマップ
 */
export interface ToolRegistryEvents {
  'approval:required': (event: ApprovalRequestEvent) => void;
  'approval:resolved': (event: ApprovalResolvedEvent) => void;
  'action:created': (action: Action) => void;
  'action:executed': (observation: Observation) => void;
}

/**
 * ツールレジストリエラー
 */
export class ToolRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ToolRegistryError';
  }
}

/**
 * アクション作成オプション
 */
export interface CreateActionOptions<TParams extends Record<string, unknown>> {
  /** ツール名 */
  toolName: string;
  /** パラメータ */
  params: TParams;
  /** リクエスト元エージェントID */
  requestedBy: string;
  /** タイムアウト上書き（秒） */
  timeout?: number;
}

/**
 * ツールレジストリ
 *
 * EARS Requirements:
 * - Ubiquitous: The system shall maintain a registry of available tools
 * - Event-Driven: When a tool is invoked, the system shall validate input against Action schema
 * - Event-Driven: When a tool execution completes, the system shall return a typed Observation
 * - State-Driven: While action risk level is 'critical', the system shall require explicit approval
 */
export class ToolRegistry extends EventEmitter {
  private readonly config: ToolRegistryConfig;
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly pendingApprovals = new Map<
    string,
    {
      action: Action;
      resolve: (approved: boolean) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(config: Partial<ToolRegistryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_TOOL_REGISTRY_CONFIG, ...config };
  }

  /**
   * 型安全なイベントリスナー登録
   */
  on<E extends keyof ToolRegistryEvents>(
    event: E,
    listener: ToolRegistryEvents[E]
  ): this {
    return super.on(event, listener);
  }

  /**
   * 型安全なイベント発火
   */
  emit<E extends keyof ToolRegistryEvents>(
    event: E,
    ...args: Parameters<ToolRegistryEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * ツールを登録
   */
  register<TParams, TResult>(
    tool: ToolDefinition<TParams, TResult>
  ): Result<void, ToolRegistryError> {
    if (this.tools.has(tool.name)) {
      return err(
        new ToolRegistryError(
          `Tool '${tool.name}' is already registered`,
          'TOOL_ALREADY_EXISTS'
        )
      );
    }

    this.tools.set(tool.name, tool as ToolDefinition);
    return ok(undefined);
  }

  /**
   * ツールを取得
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * 登録済みツール一覧を取得
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * カテゴリでフィルタリングしてツール一覧を取得
   */
  listByCategory(category: ActionCategory): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.category === category
    );
  }

  /**
   * リスクレベルでフィルタリングしてツール一覧を取得
   */
  listByRiskLevel(riskLevel: RiskLevel): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.defaultRiskLevel === riskLevel
    );
  }

  /**
   * 登録済みツール数を取得
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * ツールが登録されているか確認
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Actionを作成
   */
  createAction<TParams extends Record<string, unknown>>(
    options: CreateActionOptions<TParams>
  ): Result<Action<TParams>, ToolRegistryError> {
    const tool = this.tools.get(options.toolName);

    if (!tool && !this.config.allowUnregistered) {
      return err(
        new ToolRegistryError(
          `Tool '${options.toolName}' is not registered`,
          'TOOL_NOT_FOUND'
        )
      );
    }

    // スキーマバリデーション
    if (tool && this.config.enforceSchemaValidation) {
      const validationResult = this.validateParams(
        options.params as Record<string, unknown>,
        tool.paramsSchema
      );
      if (!validationResult.valid) {
        return err(
          new ToolRegistryError(
            `Parameter validation failed: ${validationResult.errors.join(', ')}`,
            'VALIDATION_FAILED',
            { errors: validationResult.errors }
          )
        );
      }
    }

    const action: Action<TParams> = {
      id: generateId(),
      name: `${options.toolName}:${Date.now()}`,
      toolName: options.toolName,
      category: tool?.category ?? 'custom',
      params: options.params,
      paramsSchema: tool?.paramsSchema ?? {},
      riskLevel: tool?.defaultRiskLevel ?? 'medium',
      timeout: options.timeout ?? tool?.defaultTimeout ?? this.config.defaultTimeout,
      createdAt: new Date().toISOString(),
      requestedBy: options.requestedBy,
    };

    return ok(action);
  }

  /**
   * Actionを実行してObservationを返す
   */
  async execute<TParams extends Record<string, unknown>, TResult>(
    action: Action<TParams>,
    signal?: AbortSignal
  ): Promise<Result<Observation<TResult>, ToolRegistryError>> {
    const tool = this.tools.get(action.toolName);

    if (!tool && !this.config.allowUnregistered) {
      return err(
        new ToolRegistryError(
          `Tool '${action.toolName}' is not registered`,
          'TOOL_NOT_FOUND'
        )
      );
    }

    // リスク評価
    if (this.config.enableRiskAssessment) {
      const assessment = this.assessRisk(action);

      if (assessment.requiresApproval) {
        const approved = await this.requestApproval(action, assessment);
        if (!approved) {
          return ok(this.createObservation<TResult>(action, {
            status: 'cancelled',
            error: {
              code: 'APPROVAL_REJECTED',
              message: 'Action was rejected by user',
              retryable: false,
            },
            duration: 0,
          }));
        }
      }
    }

    // 実行
    const startTime = Date.now();
    const abortController = new AbortController();
    const effectiveSignal = signal ?? abortController.signal;

    // タイムアウト設定
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, action.timeout * 1000);

    try {
      if (!tool) {
        return err(
          new ToolRegistryError(
            `Tool '${action.toolName}' not found`,
            'TOOL_NOT_FOUND'
          )
        );
      }

      const context: ToolExecutionContext = {
        agentId: action.requestedBy,
        actionId: action.id,
        timeout: action.timeout,
        signal: effectiveSignal,
        logger: this.createLogger(action.id),
        isSandboxed: false, // TODO: サンドボックス対応
      };

      const result = await tool.execute(action.params, context);
      const duration = Date.now() - startTime;

      return ok(this.createObservation<TResult>(action, {
        status: 'success',
        result: result as TResult,
        duration,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;

      if (effectiveSignal.aborted) {
        return ok(this.createObservation<TResult>(action, {
          status: 'timeout',
          error: {
            code: 'TIMEOUT',
            message: `Action timed out after ${action.timeout}s`,
            retryable: true,
          },
          duration,
        }));
      }

      return ok(this.createObservation<TResult>(action, {
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
        },
        duration,
      }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * リスク評価
   */
  assessRisk(action: Action): SecurityAssessment {
    const riskFactors: RiskFactor[] = [];

    // カテゴリベースのリスク評価
    const categoryRisks: Record<ActionCategory, number> = {
      read: 0.1,
      write: 0.4,
      execute: 0.7,
      network: 0.5,
      system: 0.8,
      browser: 0.4,
      custom: 0.5,
    };

    const categoryRisk = categoryRisks[action.category] ?? 0.5;
    if (categoryRisk > 0.3) {
      riskFactors.push({
        name: 'category_risk',
        description: `Category '${action.category}' has elevated risk`,
        severity: categoryRisk,
        mitigation: 'Review action parameters carefully',
      });
    }

    // パラメータベースのリスク評価
    const params = action.params as Record<string, unknown>;
    if (params) {
      // ファイルパスの検査
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          if (value.includes('/etc/') || value.includes('/root/')) {
            riskFactors.push({
              name: 'sensitive_path',
              description: `Parameter '${key}' contains sensitive system path`,
              severity: 0.9,
              mitigation: 'Avoid accessing system directories',
            });
          }
          if (value.includes('rm -rf') || value.includes('sudo')) {
            riskFactors.push({
              name: 'dangerous_command',
              description: `Parameter '${key}' contains dangerous command`,
              severity: 1.0,
              mitigation: 'Review and sanitize command input',
            });
          }
        }
      }
    }

    // 最終リスクレベルの計算
    const maxSeverity = Math.max(
      ...riskFactors.map((f) => f.severity),
      categoryRisk
    );
    const finalRiskLevel = this.severityToRiskLevel(maxSeverity);

    // 承認レベルの比較
    const riskLevelOrder: Record<RiskLevel, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    const requiresApproval =
      riskLevelOrder[finalRiskLevel] >=
      riskLevelOrder[this.config.approvalRequiredLevel];

    return {
      id: generateId(),
      actionId: action.id,
      riskLevel: finalRiskLevel,
      riskFactors,
      requiresApproval,
      recommendations: riskFactors.map((f) => f.mitigation).filter(Boolean) as string[],
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * 承認をリクエスト
   */
  private async requestApproval(
    action: Action,
    assessment: SecurityAssessment
  ): Promise<boolean> {
    const timeoutMs = this.config.approvalTimeout * 1000;

    return new Promise((resolve) => {
      // タイムアウト処理
      const timeoutId = setTimeout(() => {
        const pending = this.pendingApprovals.get(action.id);
        if (pending) {
          this.pendingApprovals.delete(action.id);
          this.emit('approval:resolved', {
            actionId: action.id,
            approved: false,
            resolvedBy: 'timeout',
          });
          resolve(false);
        }
      }, timeoutMs);

      // 承認待ちMapに追加
      this.pendingApprovals.set(action.id, { action, resolve, timeoutId });

      // 承認リクエストイベントを発火
      this.emit('approval:required', {
        actionId: action.id,
        toolName: action.toolName,
        assessment,
        action,
        timeoutMs,
      });
    });
  }

  /**
   * 承認を解決（外部から呼び出し）
   */
  resolveApproval(actionId: string, approved: boolean, resolvedBy: 'user' | 'api' = 'user'): boolean {
    const pending = this.pendingApprovals.get(actionId);
    if (pending) {
      // タイムアウトをクリア
      clearTimeout(pending.timeoutId);
      pending.resolve(approved);
      this.pendingApprovals.delete(actionId);
      this.emit('approval:resolved', {
        actionId,
        approved,
        resolvedBy,
      });
      return true;
    }
    return false;
  }

  /**
   * 承認待ちアクションを取得
   */
  getPendingApprovals(): ReadonlyArray<{ actionId: string; action: Action }> {
    return Array.from(this.pendingApprovals.entries()).map(([actionId, pending]) => ({
      actionId,
      action: pending.action,
    }));
  }

  /**
   * 全承認待ちをクリア
   */
  clearPendingApprovals(): void {
    for (const [actionId, pending] of this.pendingApprovals) {
      clearTimeout(pending.timeoutId);
      pending.resolve(false);
      this.emit('approval:resolved', {
        actionId,
        approved: false,
        resolvedBy: 'api',
      });
    }
    this.pendingApprovals.clear();
  }

  /**
   * パラメータをバリデーション（簡易版）
   */
  private validateParams(
    params: Record<string, unknown>,
    schema: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // スキーマがundefinedの場合はバリデーションをスキップ
    if (!schema) {
      return { valid: true, errors: [] };
    }

    // paramsがnull/undefinedの場合は空オブジェクトとして扱う
    const safeParams = params ?? {};

    // required チェック
    const required = (schema.required as string[]) ?? [];
    for (const key of required) {
      if (!(key in safeParams)) {
        errors.push(`Missing required parameter: ${key}`);
      }
    }

    // type チェック（簡易版）
    const properties = (schema.properties as Record<string, { type?: string }>) ?? {};
    for (const [key, value] of Object.entries(safeParams)) {
      const propSchema = properties[key];
      if (propSchema?.type) {
        const actualType = typeof value;
        const expectedType = propSchema.type;
        if (expectedType === 'integer' && !Number.isInteger(value)) {
          errors.push(`Parameter '${key}' must be an integer`);
        } else if (expectedType !== 'integer' && actualType !== expectedType) {
          errors.push(`Parameter '${key}' must be of type ${expectedType}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Observationを作成
   */
  private createObservation<TResult>(
    action: Action,
    data: {
      status: Observation['status'];
      result?: TResult;
      error?: Observation['error'];
      duration: number;
    }
  ): Observation<TResult> {
    return {
      id: generateId(),
      actionId: action.id,
      status: data.status,
      result: data.result,
      error: data.error,
      duration: data.duration,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * ロガーを作成
   */
  private createLogger(actionId: string) {
    const prefix = `[Action:${actionId}]`;
    return {
      debug: (msg: string, ...args: unknown[]) =>
        console.debug(prefix, msg, ...args),
      info: (msg: string, ...args: unknown[]) =>
        console.info(prefix, msg, ...args),
      warn: (msg: string, ...args: unknown[]) =>
        console.warn(prefix, msg, ...args),
      error: (msg: string, ...args: unknown[]) =>
        console.error(prefix, msg, ...args),
    };
  }

  /**
   * 重大度をリスクレベルに変換
   */
  private severityToRiskLevel(severity: number): RiskLevel {
    if (severity >= 0.8) return 'critical';
    if (severity >= 0.5) return 'high';
    if (severity >= 0.3) return 'medium';
    return 'low';
  }
}
