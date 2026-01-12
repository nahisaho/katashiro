/**
 * Workflow Types
 * ワークフロー機能の型定義
 *
 * @module workflow/types
 */

/** ワークフローステップの状態 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** ワークフロー全体の状態 */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/** ステップタイプ */
export type StepType =
  | 'collect'    // 情報収集
  | 'analyze'    // 分析
  | 'generate'   // 生成
  | 'validate'   // 検証
  | 'transform'  // 変換
  | 'export'     // エクスポート
  | 'custom';    // カスタム

/** ワークフローステップ定義 */
export interface WorkflowStep {
  /** ステップID */
  id: string;
  /** ステップ名 */
  name: string;
  /** ステップタイプ */
  type: StepType;
  /** 実行関数 */
  execute: (input: unknown, context: WorkflowContext) => Promise<unknown>;
  /** 入力スキーマ（オプション） */
  inputSchema?: Record<string, unknown>;
  /** 出力スキーマ（オプション） */
  outputSchema?: Record<string, unknown>;
  /** 依存ステップID */
  dependsOn?: string[];
  /** リトライ設定 */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 条件（trueの場合のみ実行） */
  condition?: (context: WorkflowContext) => boolean;
  /** エラー時の挙動 */
  onError?: 'fail' | 'skip' | 'continue';
}

/** ワークフロー定義 */
export interface WorkflowDefinition {
  /** ワークフローID */
  id: string;
  /** ワークフロー名 */
  name: string;
  /** 説明 */
  description?: string;
  /** バージョン */
  version: string;
  /** ステップリスト */
  steps: WorkflowStep[];
  /** グローバル設定 */
  config?: {
    /** 並列実行の最大数 */
    maxParallel?: number;
    /** グローバルタイムアウト */
    timeout?: number;
    /** 失敗時の挙動 */
    onStepError?: 'stop' | 'continue';
  };
  /** フック */
  hooks?: WorkflowHooks;
}

/** ワークフローフック */
export interface WorkflowHooks {
  /** ワークフロー開始時 */
  onStart?: (context: WorkflowContext) => Promise<void>;
  /** ワークフロー完了時 */
  onComplete?: (context: WorkflowContext) => Promise<void>;
  /** ワークフロー失敗時 */
  onError?: (error: Error, context: WorkflowContext) => Promise<void>;
  /** ステップ開始時 */
  onStepStart?: (step: WorkflowStep, context: WorkflowContext) => Promise<void>;
  /** ステップ完了時 */
  onStepComplete?: (step: WorkflowStep, result: unknown, context: WorkflowContext) => Promise<void>;
  /** ステップ失敗時 */
  onStepError?: (step: WorkflowStep, error: Error, context: WorkflowContext) => Promise<void>;
}

/** ワークフローコンテキスト */
export interface WorkflowContext {
  /** ワークフローID */
  workflowId: string;
  /** 実行ID */
  executionId: string;
  /** 入力データ */
  input: unknown;
  /** ステップ結果（ステップID → 結果） */
  results: Map<string, unknown>;
  /** メタデータ */
  metadata: Record<string, unknown>;
  /** 開始時刻 */
  startedAt: Date;
  /** 現在のステップ */
  currentStep?: string;
  /** ログ */
  logs: WorkflowLog[];
}

/** ワークフローログ */
export interface WorkflowLog {
  /** タイムスタンプ */
  timestamp: Date;
  /** レベル */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** メッセージ */
  message: string;
  /** ステップID（オプション） */
  stepId?: string;
  /** 追加データ */
  data?: unknown;
}

/** ステップ実行結果 */
export interface StepResult {
  /** ステップID */
  stepId: string;
  /** 状態 */
  status: StepStatus;
  /** 出力 */
  output?: unknown;
  /** エラー */
  error?: Error;
  /** 開始時刻 */
  startedAt: Date;
  /** 完了時刻 */
  completedAt?: Date;
  /** 実行時間（ミリ秒） */
  durationMs?: number;
  /** リトライ回数 */
  retryCount: number;
}

/** ワークフロー実行結果 */
export interface WorkflowResult {
  /** 実行ID */
  executionId: string;
  /** ワークフローID */
  workflowId: string;
  /** 状態 */
  status: WorkflowStatus;
  /** 最終出力 */
  output?: unknown;
  /** ステップ結果 */
  stepResults: Map<string, StepResult>;
  /** 開始時刻 */
  startedAt: Date;
  /** 完了時刻 */
  completedAt?: Date;
  /** 総実行時間（ミリ秒） */
  totalDurationMs?: number;
  /** エラー */
  error?: Error;
  /** ログ */
  logs: WorkflowLog[];
}

/** 品質チェック結果 */
export interface QualityCheckResult {
  /** チェック名 */
  name: string;
  /** 合格/不合格 */
  passed: boolean;
  /** スコア（0-100） */
  score: number;
  /** 閾値 */
  threshold: number;
  /** 詳細メッセージ */
  message: string;
  /** 改善提案 */
  suggestions?: string[];
}

/** 品質ゲート結果 */
export interface QualityGateResult {
  /** 全体合格/不合格 */
  passed: boolean;
  /** 全体スコア */
  overallScore: number;
  /** 個別チェック結果 */
  checks: QualityCheckResult[];
  /** チェック日時 */
  checkedAt: Date;
  /** サマリ */
  summary: string;
}

/** 品質チェック定義 */
export interface QualityCheck {
  /** チェック名 */
  name: string;
  /** チェック関数 */
  check: (content: string, options?: unknown) => Promise<QualityCheckResult>;
  /** 重み（スコア計算用） */
  weight: number;
  /** 有効/無効 */
  enabled: boolean;
}

/** スタイルルール */
export interface StyleRule {
  /** ルールID */
  id: string;
  /** ルール名 */
  name: string;
  /** 説明 */
  description: string;
  /** カテゴリ */
  category: 'formatting' | 'naming' | 'structure' | 'language' | 'custom';
  /** 重要度 */
  severity: 'error' | 'warning' | 'info';
  /** 検証関数 */
  validate: (content: string) => StyleViolation[];
  /** 自動修正関数（オプション） */
  fix?: (content: string) => string;
  /** 有効/無効 */
  enabled: boolean;
}

/** スタイル違反 */
export interface StyleViolation {
  /** ルールID */
  ruleId: string;
  /** 重要度 */
  severity: 'error' | 'warning' | 'info';
  /** メッセージ */
  message: string;
  /** 行番号 */
  line?: number;
  /** 列番号 */
  column?: number;
  /** 該当テキスト */
  text?: string;
  /** 修正提案 */
  suggestion?: string;
}

/** スタイルチェック結果 */
export interface StyleCheckResult {
  /** 違反リスト */
  violations: StyleViolation[];
  /** エラー数 */
  errorCount: number;
  /** 警告数 */
  warningCount: number;
  /** 情報数 */
  infoCount: number;
  /** 合格 */
  passed: boolean;
  /** 修正後コンテンツ（自動修正時） */
  fixedContent?: string;
}

/** パイプラインステージ */
export type PipelineStage = 'collect' | 'analyze' | 'generate' | 'validate' | 'export';

/** パイプライン設定 */
export interface PipelineConfig {
  /** パイプライン名 */
  name: string;
  /** ステージ設定 */
  stages: {
    collect?: CollectStageConfig;
    analyze?: AnalyzeStageConfig;
    generate?: GenerateStageConfig;
    validate?: ValidateStageConfig;
    export?: ExportStageConfig;
  };
  /** エラーハンドリング */
  errorHandling?: 'stop' | 'skip' | 'retry' | 'continue';
  /** 並列処理設定 */
  parallel?: boolean;
}

/** 収集ステージ設定 */
export interface CollectStageConfig {
  /** ソースタイプ */
  sources: Array<{
    type: 'web' | 'api' | 'feed' | 'file';
    config: Record<string, unknown>;
  }>;
  /** 最大ソース数 */
  maxSources?: number;
  /** フィルタ */
  filters?: Record<string, unknown>;
}

/** 分析ステージ設定 */
export interface AnalyzeStageConfig {
  /** 分析タイプ */
  analyzers: Array<'text' | 'entity' | 'topic' | 'sentiment' | 'quality'>;
  /** オプション */
  options?: Record<string, unknown>;
}

/** 生成ステージ設定 */
export interface GenerateStageConfig {
  /** 出力タイプ */
  outputType: 'article' | 'report' | 'summary' | 'presentation';
  /** テンプレート */
  template?: string;
  /** オプション */
  options?: Record<string, unknown>;
}

/** 検証ステージ設定 */
export interface ValidateStageConfig {
  /** 品質ゲート */
  qualityGate?: boolean;
  /** スタイルチェック */
  styleCheck?: boolean;
  /** カスタムバリデータ */
  customValidators?: Array<(content: string) => Promise<boolean>>;
}

/** エクスポートステージ設定 */
export interface ExportStageConfig {
  /** 出力形式 */
  formats: Array<'markdown' | 'html' | 'pdf' | 'docx'>;
  /** 出力先 */
  destination?: string;
}

/** パイプライン結果 */
export interface PipelineResult {
  /** パイプライン名 */
  pipelineName: string;
  /** 状態 */
  status: 'completed' | 'failed' | 'partial';
  /** ステージ結果 */
  stageResults: Map<PipelineStage, unknown>;
  /** 最終出力 */
  output?: unknown;
  /** 実行時間 */
  durationMs: number;
  /** エラー */
  errors: Array<{ stage: PipelineStage; error: Error }>;
}
