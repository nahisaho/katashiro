/**
 * Action-Observation Tool System Types
 *
 * @fileoverview REQ-010: Action-Observation型安全ツールシステム
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.0
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

// =============================================================================
// REQ-010: Action-Observation型ツールシステム
// =============================================================================

/**
 * リスクレベル
 * EARS: The system shall evaluate action risk level before execution
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * アクションカテゴリ
 */
export type ActionCategory =
  | 'read'      // 読み取り（低リスク）
  | 'write'     // 書き込み（中リスク）
  | 'execute'   // 実行（高リスク）
  | 'network'   // ネットワーク（中〜高リスク）
  | 'system'    // システム操作（高リスク）
  | 'browser'   // ブラウザ操作（中リスク）
  | 'custom';   // カスタム

/**
 * Action定義（型安全な入力）
 * EARS: When a tool is invoked, the system shall validate input against Action schema
 */
export interface Action<TParams = Record<string, unknown>> {
  /** アクションID */
  readonly id: ID;
  /** アクション名 */
  readonly name: string;
  /** ツール名 */
  readonly toolName: string;
  /** カテゴリ */
  readonly category: ActionCategory;
  /** パラメータ（型安全） */
  readonly params: TParams;
  /** パラメータスキーマ（JSON Schema） */
  readonly paramsSchema: Record<string, unknown>;
  /** リスクレベル */
  readonly riskLevel: RiskLevel;
  /** タイムアウト（秒） */
  readonly timeout: number;
  /** 作成日時 */
  readonly createdAt: Timestamp;
  /** リクエスト元エージェントID */
  readonly requestedBy: ID;
}

/**
 * Observation定義（型安全な出力）
 * EARS: When a tool execution completes, the system shall return a typed Observation
 */
export interface Observation<TResult = unknown> {
  /** ObservationID */
  readonly id: ID;
  /** 対応するActionID */
  readonly actionId: ID;
  /** ステータス */
  readonly status: 'success' | 'error' | 'timeout' | 'cancelled';
  /** 結果データ（型安全） */
  readonly result?: TResult;
  /** 結果スキーマ（JSON Schema） */
  readonly resultSchema?: Record<string, unknown>;
  /** エラー情報 */
  readonly error?: ObservationError;
  /** 実行時間（ミリ秒） */
  readonly duration: number;
  /** 完了日時 */
  readonly completedAt: Timestamp;
  /** メタデータ */
  readonly metadata?: ObservationMetadata;
}

/**
 * Observationエラー
 */
export interface ObservationError {
  /** エラーコード */
  readonly code: string;
  /** エラーメッセージ */
  readonly message: string;
  /** スタックトレース（デバッグ用） */
  readonly stack?: string;
  /** リトライ可能か */
  readonly retryable: boolean;
}

/**
 * Observationメタデータ
 */
export interface ObservationMetadata {
  /** リソース使用量 */
  readonly resourceUsage?: ResourceUsage;
  /** ログ出力 */
  readonly logs?: string[];
  /** 警告 */
  readonly warnings?: string[];
}

/**
 * リソース使用量
 */
export interface ResourceUsage {
  /** CPU時間（ミリ秒） */
  readonly cpuTime?: number;
  /** メモリ使用量（バイト） */
  readonly memoryUsed?: number;
  /** ネットワーク送信量（バイト） */
  readonly networkSent?: number;
  /** ネットワーク受信量（バイト） */
  readonly networkReceived?: number;
}

// =============================================================================
// ツール定義
// =============================================================================

/**
 * ツール定義
 * EARS: The system shall support tool registration with schema validation
 */
export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  /** ツール名（一意） */
  readonly name: string;
  /** ツール説明 */
  readonly description: string;
  /** カテゴリ */
  readonly category: ActionCategory;
  /** パラメータスキーマ（JSON Schema） */
  readonly paramsSchema: Record<string, unknown>;
  /** 結果スキーマ（JSON Schema） */
  readonly resultSchema: Record<string, unknown>;
  /** デフォルトリスクレベル */
  readonly defaultRiskLevel: RiskLevel;
  /** デフォルトタイムアウト（秒） */
  readonly defaultTimeout: number;
  /** ツール実行関数 */
  readonly execute: ToolExecutor<TParams, TResult>;
  /** 許可されるロール */
  readonly allowedRoles?: readonly string[];
  /** 必要な権限 */
  readonly requiredPermissions?: readonly string[];
}

/**
 * ツール実行関数
 */
export type ToolExecutor<TParams, TResult> = (
  params: TParams,
  context: ToolExecutionContext
) => Promise<TResult>;

/**
 * ツール実行コンテキスト
 */
export interface ToolExecutionContext {
  /** 実行エージェントID */
  readonly agentId: ID;
  /** アクションID */
  readonly actionId: ID;
  /** タイムアウト（秒） */
  readonly timeout: number;
  /** キャンセルシグナル */
  readonly signal: AbortSignal;
  /** ロガー */
  readonly logger: ToolLogger;
  /** サンドボックス環境か */
  readonly isSandboxed: boolean;
}

/**
 * ツールロガー
 */
export interface ToolLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// =============================================================================
// セキュリティ分析 (REQ-012の一部)
// =============================================================================

/**
 * セキュリティ評価結果
 * EARS: If action risk level is 'critical', the system shall require explicit approval
 */
export interface SecurityAssessment {
  /** 評価ID */
  readonly id: ID;
  /** 対象ActionID */
  readonly actionId: ID;
  /** 最終リスクレベル */
  readonly riskLevel: RiskLevel;
  /** リスク要因 */
  readonly riskFactors: readonly RiskFactor[];
  /** 承認必要か */
  readonly requiresApproval: boolean;
  /** 推奨事項 */
  readonly recommendations: readonly string[];
  /** 評価日時 */
  readonly assessedAt: Timestamp;
}

/**
 * リスク要因
 */
export interface RiskFactor {
  /** 要因名 */
  readonly name: string;
  /** 説明 */
  readonly description: string;
  /** 重大度（0-1） */
  readonly severity: number;
  /** 対策 */
  readonly mitigation?: string;
}

/**
 * 承認リクエスト
 * EARS: When approval is required, the system shall pause and request user confirmation
 */
export interface ApprovalRequest {
  /** リクエストID */
  readonly id: ID;
  /** 対象ActionID */
  readonly actionId: ID;
  /** セキュリティ評価 */
  readonly assessment: SecurityAssessment;
  /** リクエスト理由 */
  readonly reason: string;
  /** リクエスト日時 */
  readonly requestedAt: Timestamp;
  /** 有効期限 */
  readonly expiresAt: Timestamp;
  /** 状態 */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  /** 承認/却下日時 */
  resolvedAt?: Timestamp;
  /** 承認/却下者 */
  resolvedBy?: string;
}

// =============================================================================
// ツールレジストリ設定
// =============================================================================

/**
 * ツールレジストリ設定
 */
export interface ToolRegistryConfig {
  /** 未登録ツールの実行を許可 */
  readonly allowUnregistered: boolean;
  /** デフォルトタイムアウト（秒） */
  readonly defaultTimeout: number;
  /** スキーマバリデーションを強制 */
  readonly enforceSchemaValidation: boolean;
  /** リスク評価を有効化 */
  readonly enableRiskAssessment: boolean;
  /** 承認が必要なリスクレベル */
  readonly approvalRequiredLevel: RiskLevel;
  /** 承認タイムアウト（秒） */
  readonly approvalTimeout: number;
}

/**
 * デフォルトツールレジストリ設定
 */
export const DEFAULT_TOOL_REGISTRY_CONFIG: ToolRegistryConfig = {
  allowUnregistered: false,
  defaultTimeout: 30,
  enforceSchemaValidation: true,
  enableRiskAssessment: true,
  approvalRequiredLevel: 'critical',
  approvalTimeout: 30, // 30秒タイムアウト
};
