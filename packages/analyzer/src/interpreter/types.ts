/**
 * Code Interpreter Types
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

/**
 * サポートされるプログラミング言語
 */
export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'shell';

/**
 * 実行モード
 */
export type ExecutionMode =
  | 'script'      // 単発実行
  | 'repl'        // 対話モード
  | 'notebook';   // ノートブックスタイル

/**
 * エラータイプ
 */
export type ErrorType =
  | 'syntax_error'
  | 'runtime_error'
  | 'timeout_error'
  | 'memory_error'
  | 'permission_error'
  | 'import_error'
  | 'unknown_error';

/**
 * セッション状態
 */
export type SessionState = 'active' | 'idle' | 'terminated';

/**
 * 入力ファイル
 */
export interface InputFile {
  /** ファイル名 */
  name: string;
  /** ファイル内容 */
  content: Buffer | string;
  /** エンコーディング */
  encoding?: BufferEncoding;
}

/**
 * 出力ファイル
 */
export interface OutputFile {
  /** ファイル名 */
  name: string;
  /** ファイル内容 */
  content: Buffer;
  /** MIMEタイプ */
  mimeType: string;
  /** ファイルサイズ */
  size: number;
}

/**
 * 生成された画像
 */
export interface GeneratedImage {
  /** 画像タイプ */
  type: 'png' | 'jpeg' | 'svg';
  /** Base64エンコードされたデータ */
  data: string;
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** 説明 */
  caption?: string;
}

/**
 * 実行ログエントリ
 */
export interface ExecutionLog {
  /** タイムスタンプ */
  timestamp: Date;
  /** ログレベル */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** メッセージ */
  message: string;
  /** ソース（ファイル/行番号） */
  source?: string;
}

/**
 * 実行エラー情報
 */
export interface ExecutionError {
  /** エラータイプ */
  type: ErrorType;
  /** エラーメッセージ */
  message: string;
  /** スタックトレース */
  stack?: string;
  /** エラー発生行 */
  line?: number;
  /** エラー発生列 */
  column?: number;
}

/**
 * セキュリティ制約
 */
export interface SecurityConstraints {
  /** ファイルシステムアクセス範囲 */
  fileSystemAccess: 'none' | 'sandbox' | 'full';
  /** ネットワークアクセス */
  networkAccess: boolean;
  /** 許可されたホスト */
  allowedHosts: string[];
  /** 実行タイムアウト（ミリ秒） */
  timeout: number;
  /** メモリ制限（MB） */
  memoryLimit: number;
  /** ブロックされたモジュール */
  blockedModules: string[];
}

/**
 * 実行メタデータ
 */
export interface ExecutionMetadata {
  /** 開始時刻 */
  startedAt: Date;
  /** 完了時刻 */
  completedAt: Date;
  /** 使用言語 */
  language: SupportedLanguage;
  /** ランタイムバージョン */
  runtimeVersion: string;
  /** インストールされたパッケージ */
  installedPackages: string[];
  /** セキュリティ制約 */
  securityConstraints: SecurityConstraints;
}

/**
 * コード実行リクエスト
 */
export interface ExecutionRequest {
  /** 実行するコード */
  code: string;
  /** プログラミング言語 */
  language: SupportedLanguage;
  /** 入力データ */
  inputs?: Record<string, unknown>;
  /** 入力ファイル */
  inputFiles?: InputFile[];
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** メモリ制限（MB） */
  memoryLimit?: number;
  /** ネットワークアクセス許可 */
  allowNetwork?: boolean;
  /** 許可するホスト */
  allowedHosts?: string[];
  /** 追加パッケージ（pip/npm） */
  packages?: string[];
  /** 環境変数 */
  env?: Record<string, string>;
  /** 実行モード */
  mode?: ExecutionMode;
}

/**
 * 実行結果
 */
export interface ExecutionResult {
  /** 成功したか */
  success: boolean;
  /** 標準出力 */
  stdout: string;
  /** 標準エラー */
  stderr: string;
  /** 戻り値（あれば） */
  returnValue?: unknown;
  /** 生成されたファイル */
  outputFiles?: OutputFile[];
  /** 生成された画像（Base64） */
  images?: GeneratedImage[];
  /** 実行時間（ミリ秒） */
  executionTime: number;
  /** メモリ使用量（MB） */
  memoryUsage: number;
  /** 実行ログ */
  logs: ExecutionLog[];
  /** エラー情報（失敗時） */
  error?: ExecutionError;
  /** メタデータ */
  metadata: ExecutionMetadata;
}

/**
 * コード分析結果
 */
export interface CodeAnalysis {
  /** 有効か */
  valid: boolean;
  /** 問題点 */
  issues: string[];
  /** インポートされるモジュール */
  imports: string[];
  /** 循環的複雑度 */
  complexity: number;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** 有効か */
  valid: boolean;
  /** エラー */
  errors: string[];
  /** 警告 */
  warnings: string[];
}

/**
 * セッション履歴エントリ
 */
export interface SessionHistoryEntry {
  /** 入力コード */
  input: string;
  /** 出力 */
  output: string;
  /** 実行時刻 */
  executedAt: Date;
  /** 成功したか */
  success: boolean;
}

/**
 * 実行セッション（REPLモード用）
 */
export interface ExecutionSession {
  /** セッションID */
  id: string;
  /** 言語 */
  language: SupportedLanguage;
  /** 状態 */
  state: SessionState;
  /** 実行履歴 */
  history: SessionHistoryEntry[];
  /** グローバル変数 */
  globals: Record<string, unknown>;
  /** 作成日時 */
  createdAt: Date;
  /** 最終アクティビティ */
  lastActivity: Date;
}

/**
 * サンドボックス設定
 */
export interface SandboxConfig {
  /** 作業ディレクトリ */
  workDir: string;
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** メモリ制限（MB） */
  memoryLimit: number;
  /** ネットワークアクセス */
  allowNetwork: boolean;
  /** 許可ホスト */
  allowedHosts: string[];
  /** 環境変数 */
  env: Record<string, string>;
}

/**
 * サンドボックス実行結果
 */
export interface SandboxExecutionResult {
  /** 終了コード */
  exitCode: number;
  /** 標準出力 */
  stdout: string;
  /** 標準エラー */
  stderr: string;
  /** 戻り値 */
  returnValue?: unknown;
  /** メモリ使用量（MB） */
  memoryUsage?: number;
  /** ランタイムバージョン */
  runtimeVersion?: string;
  /** 実行ログ */
  logs?: ExecutionLog[];
}

/**
 * ブロックするPythonモジュール
 */
export const BLOCKED_PYTHON_MODULES = [
  'os',
  'sys',
  'subprocess',
  'shutil',
  'socket',
  'multiprocessing',
  'ctypes',
  'pickle',
  'marshal',
  '__builtins__',
  'importlib',
  'builtins',
] as const;

/**
 * 安全に使用可能なPythonモジュール
 */
export const ALLOWED_PYTHON_MODULES = [
  'math',
  'statistics',
  'random',
  'datetime',
  'json',
  're',
  'collections',
  'itertools',
  'functools',
  'operator',
  'string',
  'textwrap',
  'unicodedata',
  'decimal',
  'fractions',
  // データ分析系
  'numpy',
  'pandas',
  'scipy',
  'sklearn',
  'matplotlib',
  'seaborn',
  'plotly',
] as const;

/**
 * デフォルト実行設定
 */
export const DEFAULT_EXECUTION_CONFIG = {
  /** タイムアウト（30秒） */
  timeout: 30000,
  /** メモリ制限（256MB） */
  memoryLimit: 256,
  /** ネットワークアクセス */
  allowNetwork: false,
  /** 実行モード */
  mode: 'script' as ExecutionMode,
} as const;

/**
 * CodeInterpreterエラー
 */
export class CodeInterpreterError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CodeInterpreterError';
    Object.setPrototypeOf(this, CodeInterpreterError.prototype);
  }
}

/**
 * エラーコード定数
 */
export const INTERPRETER_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BLOCKED_MODULE: 'BLOCKED_MODULE',
  DANGEROUS_CODE: 'DANGEROUS_CODE',
  SANDBOX_ERROR: 'SANDBOX_ERROR',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  MEMORY_LIMIT: 'MEMORY_LIMIT',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE',
} as const;
