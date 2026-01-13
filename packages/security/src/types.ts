/**
 * Security 型定義
 *
 * @requirement REQ-012
 * @design REQ-012-01〜REQ-012-06
 */

// ============================================================================
// リスクレベル
// ============================================================================

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * リスクレベルの数値マッピング
 */
export const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * リスクレベル比較
 */
export function compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
  return RISK_LEVEL_ORDER[a] - RISK_LEVEL_ORDER[b];
}

/**
 * リスクレベルが閾値以上かチェック
 */
export function isRiskLevelAtLeast(level: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_LEVEL_ORDER[level] >= RISK_LEVEL_ORDER[threshold];
}

// ============================================================================
// アクション定義
// ============================================================================

/**
 * アクションタイプ
 */
export type ActionType =
  | 'file_read'
  | 'file_write'
  | 'file_delete'
  | 'file_move'
  | 'file_copy'
  | 'directory_create'
  | 'directory_delete'
  | 'command_execute'
  | 'network_request'
  | 'browser_navigate'
  | 'browser_click'
  | 'browser_type'
  | 'code_execute'
  | 'search'
  | 'analyze'
  | 'custom';

/**
 * アクション
 */
export interface Action {
  /** アクションタイプ */
  type: ActionType;
  /** アクション名 */
  name: string;
  /** ターゲット（ファイルパス、URL等） */
  target?: string;
  /** パラメータ */
  params?: Record<string, unknown>;
  /** コンテキスト情報 */
  context?: ActionContext;
}

/**
 * アクションコンテキスト
 */
export interface ActionContext {
  /** ユーザーID */
  userId?: string;
  /** セッションID */
  sessionId?: string;
  /** ソースツール名 */
  sourceTool?: string;
  /** 親タスクID */
  parentTaskId?: string;
}

// ============================================================================
// オブザベーション（実行結果）
// ============================================================================

/**
 * オブザベーション（アクション実行結果）
 */
export interface Observation {
  /** 成功フラグ */
  success: boolean;
  /** 結果データ */
  data?: unknown;
  /** エラーメッセージ */
  error?: string;
  /** 実行時間（ミリ秒） */
  duration: number;
}

// ============================================================================
// セキュリティポリシー
// ============================================================================

/**
 * パターンルール
 */
export interface PatternRule {
  /** パターン（glob形式） */
  pattern: string;
  /** 説明 */
  description?: string;
  /** 適用するアクションタイプ */
  actionTypes?: ActionType[];
}

/**
 * セキュリティポリシー（REQ-012）
 */
export interface SecurityPolicy {
  /** 許可パターン（REQ-012-04） */
  allowPatterns: PatternRule[];
  /** 拒否パターン（REQ-012-03） */
  denyPatterns: PatternRule[];
  /** 確認が必要なリスクレベル（REQ-012-02） */
  requireConfirmation: RiskLevel[];
  /** 最大許容リスクレベル */
  maxRiskLevel: RiskLevel;
  /** カスタムリスクルール */
  customRiskRules?: RiskRule[];
}

/**
 * リスクルール
 */
export interface RiskRule {
  /** ルール名 */
  name: string;
  /** 説明 */
  description: string;
  /** マッチ条件 */
  match: RiskRuleMatch;
  /** 適用するリスクレベル */
  riskLevel: RiskLevel;
}

/**
 * リスクルールのマッチ条件
 */
export interface RiskRuleMatch {
  /** アクションタイプ */
  actionTypes?: ActionType[];
  /** ターゲットパターン（glob） */
  targetPatterns?: string[];
  /** パラメータ条件 */
  paramConditions?: Record<string, unknown>;
}

// ============================================================================
// セキュリティ分析結果
// ============================================================================

/**
 * セキュリティ分析結果（REQ-012-01）
 */
export interface SecurityAnalysis {
  /** リスクレベル */
  riskLevel: RiskLevel;
  /** リスク理由 */
  reasons: string[];
  /** 確認が必要か（REQ-012-02） */
  requiresConfirmation: boolean;
  /** 許可されるか */
  allowed: boolean;
  /** ブロック理由（許可されない場合） */
  blockReason?: string;
  /** マッチしたルール */
  matchedRules: string[];
}

// ============================================================================
// 監査ログ
// ============================================================================

/**
 * 監査ログエントリ（REQ-012-05）
 */
export interface AuditLogEntry {
  /** エントリID */
  id: string;
  /** タイムスタンプ */
  timestamp: string;
  /** アクション */
  action: Action;
  /** セキュリティ分析結果 */
  analysis: SecurityAnalysis;
  /** 実行結果（実行された場合） */
  observation?: Observation;
  /** ユーザー確認の結果（確認が必要だった場合） */
  userConfirmation?: UserConfirmation;
}

/**
 * ユーザー確認
 */
export interface UserConfirmation {
  /** 確認されたか */
  confirmed: boolean;
  /** 確認時刻 */
  confirmedAt?: string;
  /** 確認者 */
  confirmedBy?: string;
  /** コメント */
  comment?: string;
}

/**
 * 監査ログフィルター
 */
export interface AuditLogFilter {
  /** 開始日時 */
  startTime?: string;
  /** 終了日時 */
  endTime?: string;
  /** アクションタイプ */
  actionTypes?: ActionType[];
  /** リスクレベル（以上） */
  minRiskLevel?: RiskLevel;
  /** 成功/失敗 */
  success?: boolean;
  /** ユーザーID */
  userId?: string;
  /** 検索キーワード */
  keyword?: string;
  /** 最大件数 */
  limit?: number;
  /** オフセット */
  offset?: number;
}

// ============================================================================
// デフォルト設定
// ============================================================================

/**
 * デフォルトセキュリティポリシー
 */
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowPatterns: [
    { pattern: '**/*.md', description: 'Markdown files are safe' },
    { pattern: '**/*.txt', description: 'Text files are safe' },
    { pattern: '**/*.json', description: 'JSON files are generally safe' },
  ],
  denyPatterns: [
    { pattern: '/etc/**', description: 'System configuration files' },
    { pattern: '/usr/**', description: 'System binaries' },
    { pattern: '**/node_modules/**', description: 'Dependencies should not be modified' },
    { pattern: '**/.git/**', description: 'Git internal files' },
    { pattern: '**/.env*', description: 'Environment files with secrets' },
    { pattern: '**/*password*', description: 'Files with password in name' },
    { pattern: '**/*secret*', description: 'Files with secret in name' },
    { pattern: '**/*.key', description: 'Key files' },
    { pattern: '**/*.pem', description: 'Certificate files' },
  ],
  requireConfirmation: ['high', 'critical'],
  maxRiskLevel: 'critical',
  customRiskRules: [],
};

/**
 * ビルトインリスクルール
 */
export const BUILTIN_RISK_RULES: RiskRule[] = [
  {
    name: 'file_delete_high_risk',
    description: 'File deletion is high risk (REQ-012-06)',
    match: { actionTypes: ['file_delete', 'directory_delete'] },
    riskLevel: 'high',
  },
  {
    name: 'command_execute_high_risk',
    description: 'Command execution is high risk',
    match: { actionTypes: ['command_execute'] },
    riskLevel: 'high',
  },
  {
    name: 'code_execute_medium_risk',
    description: 'Code execution is medium risk',
    match: { actionTypes: ['code_execute'] },
    riskLevel: 'medium',
  },
  {
    name: 'network_request_medium_risk',
    description: 'Network requests are medium risk',
    match: { actionTypes: ['network_request'] },
    riskLevel: 'medium',
  },
  {
    name: 'file_write_low_risk',
    description: 'File write is low risk by default',
    match: { actionTypes: ['file_write'] },
    riskLevel: 'low',
  },
  {
    name: 'file_read_low_risk',
    description: 'File read is low risk',
    match: { actionTypes: ['file_read', 'search', 'analyze'] },
    riskLevel: 'low',
  },
];

// ============================================================================
// エラー
// ============================================================================

/**
 * セキュリティエラーコード
 */
export type SecurityErrorCode =
  | 'ACTION_BLOCKED'
  | 'RISK_TOO_HIGH'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_DENIED'
  | 'POLICY_VIOLATION';

/**
 * セキュリティエラー
 */
export class SecurityError extends Error {
  constructor(
    public readonly code: SecurityErrorCode,
    message: string,
    public readonly analysis?: SecurityAnalysis
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
