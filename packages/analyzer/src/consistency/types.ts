/**
 * DocumentConsistencyChecker 型定義
 * @module consistency/types
 * @see DES-KATASHIRO-004-DCC
 */

// ==================== 基本型 ====================

/**
 * 重大度レベル
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Issue severity type alias
 */
export type IssueSeverity = Severity;

/**
 * 数値形式
 */
export type NumericFormat =
  | 'integer'     // 123
  | 'decimal'     // 123.45
  | 'percentage'  // 12.3%
  | 'currency'    // ¥1,234 / $1,234
  | 'scientific'; // 1.23e10

/**
 * 日付形式
 */
export type DateFormat =
  | 'iso8601'   // 2026-01-15
  | 'japanese'  // 2026年1月15日
  | 'us'        // 01/15/2026
  | 'eu'        // 15/01/2026
  | 'relative'; // 来週、3ヶ月後

/**
 * 参照タイプ
 */
export type ReferenceType = 'file' | 'section' | 'external';

/**
 * 用語カテゴリ
 */
export type TermCategory =
  | 'acronym'    // 略語
  | 'technical'  // 技術用語
  | 'loanword'   // 外来語
  | 'quoted'     // 引用
  | 'code'       // コード
  | 'custom';    // カスタム

// ==================== 位置情報 ====================

/**
 * 位置情報
 */
export interface Location {
  /** ファイルパス */
  file: string;
  /** 行番号（1始まり） */
  line: number;
  /** 列番号（0始まり） */
  column?: number;
}

// ==================== 文書型 ====================

/**
 * 入力文書
 */
export interface Document {
  /** ファイルパス */
  path: string;
  /** 文書内容 */
  content: string;
  /** 文書形式 */
  format: 'markdown' | 'text' | 'json';
}

// ==================== 抽出結果型 ====================

/**
 * 抽出された数値
 */
export interface ExtractedNumeric {
  /** 元の文字列 */
  rawValue: string;
  /** 正規化された値 */
  value: number;
  /** 単位 */
  unit?: string;
  /** 形式 */
  format: NumericFormat;
  /** 位置情報 */
  location: Location;
  /** ラベル（関連する見出しやキー） */
  label?: string;
}

/**
 * 抽出された日付
 */
export interface ExtractedDate {
  /** 元の文字列 */
  rawValue: string;
  /** パースされた日付 */
  parsedDate?: Date;
  /** 形式 */
  format: DateFormat;
  /** 位置情報 */
  location: Location;
  /** ラベル */
  label?: string;
}

/**
 * 抽出された用語
 */
export interface ExtractedTerm {
  /** 元の用語 */
  rawValue: string;
  /** 正規化された用語 */
  normalizedValue: string;
  /** カテゴリ */
  category: TermCategory;
  /** コンテキスト */
  context: string;
  /** 位置情報 */
  location: Location;
}

/**
 * 抽出された参照
 */
export interface ExtractedReference {
  /** 参照タイプ */
  type: ReferenceType;
  /** 参照先 */
  target: string;
  /** 参照先が存在するか */
  targetExists?: boolean;
  /** リンクテキスト */
  linkText?: string;
  /** 位置情報 */
  location: Location;
}

// ==================== 不整合Issue型 ====================

/**
 * 不整合の種類
 */
export type IssueType =
  | 'numeric_inconsistency'
  | 'date_inconsistency'
  | 'term_inconsistency'
  | 'broken_reference';

/**
 * 一貫性の問題
 */
export interface ConsistencyIssue {
  /** 問題の種類 */
  type: IssueType;
  /** 重大度 */
  severity: IssueSeverity;
  /** メッセージ */
  message: string;
  /** 位置情報一覧 */
  locations: Location[];
  /** 修正提案 */
  suggestion?: string;
  /** 追加詳細 */
  details?: Record<string, unknown>;
}

// ==================== レポート型 ====================

/**
 * 整合性チェック結果
 */
export interface ConsistencyCheckResult {
  /** チェックが成功したか */
  isValid: boolean;
  /** 総合スコア（0-100） */
  score: number;
  /** 発見された問題 */
  issues: ConsistencyIssue[];
  /** 統計情報 */
  statistics: CheckStatistics;
  /** チェック実行時間（ミリ秒） */
  executionTimeMs: number;
}

/**
 * 統計情報
 */
export interface CheckStatistics {
  /** チェック対象文書数 */
  documentsChecked: number;
  /** 抽出された数値数 */
  numericsFound: number;
  /** 抽出された日付数 */
  datesFound: number;
  /** 抽出された用語数 */
  termsFound: number;
  /** 抽出された参照数 */
  referencesFound: number;
  /** エラー数 */
  errorCount: number;
  /** 警告数 */
  warningCount: number;
  /** 情報数 */
  infoCount: number;
}

// ==================== 設定型 ====================

/**
 * チェッカー設定
 */
export interface CheckerConfig {
  /** 抽出対象の数値形式 */
  numericFormats: NumericFormat[];
  /** 抽出対象の日付形式 */
  dateFormats: DateFormat[];
  /** 用語抽出の言語 */
  language: 'ja' | 'en';
  /** 重大度の閾値 */
  severityThreshold: Severity;
  /** カスタム検証ルール */
  customRules?: CustomRule[];
  /** 無視するパターン */
  ignorePatterns?: RegExp[];
}

/**
 * カスタム検証ルール
 */
export interface CustomRule {
  /** ルールID */
  id: string;
  /** ルール名 */
  name: string;
  /** ルールの説明 */
  description: string;
  /** 検証対象のパターン（正規表現） */
  pattern: RegExp;
  /** 検証関数 */
  validate: (matches: RegExpMatchArray[], documents: Document[]) => ConsistencyIssue[];
  /** 重大度 */
  severity: Severity;
  /** 有効/無効 */
  enabled: boolean;
}

// ==================== レポーター設定 ====================

/**
 * レポーター設定
 */
export interface ReporterConfig {
  /** 出力形式 */
  format: 'text' | 'markdown' | 'json' | 'html';
  /** 詳細レベル */
  verbosity: 'minimal' | 'normal' | 'detailed';
  /** グループ化方法 */
  groupBy: 'severity' | 'type' | 'file';
  /** 最大出力件数 */
  maxIssues?: number;
  /** 日本語化 */
  locale: 'ja' | 'en';
}
