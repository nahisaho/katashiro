/**
 * KATASHIRO Sandbox - Type Definitions
 *
 * @fileoverview REQ-007: コード実行サンドボックスの型定義
 * @module @nahisaho/katashiro-sandbox
 * @since 0.4.0
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

// =============================================================================
// 実行環境
// =============================================================================

/**
 * サンドボックスランタイム
 */
export type SandboxRuntime = 'docker' | 'local' | 'wasm';

/**
 * サポートされるプログラミング言語
 */
export type SupportedLanguage = 'bash' | 'python' | 'javascript' | 'typescript';

/**
 * 実行状態
 */
export type ExecutionStatus =
  | 'pending'     // 待機中
  | 'running'     // 実行中
  | 'completed'   // 完了
  | 'failed'      // 失敗
  | 'timeout'     // タイムアウト
  | 'cancelled';  // キャンセル

// =============================================================================
// サンドボックス設定
// =============================================================================

/**
 * サンドボックス設定
 * EARS: The Sandbox shall execute code in an isolated Docker/VM environment
 */
export interface SandboxConfig {
  /** ランタイム種別 */
  readonly runtime: SandboxRuntime;
  /** タイムアウト（秒） */
  readonly timeout: number;
  /** メモリ制限（バイト） */
  readonly memoryLimit: number;
  /** CPU制限（0.0-1.0 = 100%） */
  readonly cpuLimit: number;
  /** 作業ディレクトリ */
  readonly workingDir: string;
  /** ネットワークアクセス許可 */
  readonly networkEnabled: boolean;
  /** 一時ファイルシステムサイズ（バイト） */
  readonly tmpfsSize: number;
}

/**
 * デフォルトサンドボックス設定
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  runtime: 'docker',
  timeout: 30,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  cpuLimit: 0.5,
  workingDir: '/workspace',
  networkEnabled: false,
  tmpfsSize: 64 * 1024 * 1024, // 64MB
};

// =============================================================================
// Docker設定
// =============================================================================

/**
 * Docker固有の設定
 */
export interface DockerConfig {
  /** Dockerデーモンソケットパス */
  readonly socketPath?: string;
  /** Dockerホスト（TCP接続時） */
  readonly host?: string;
  /** 使用するイメージ（言語別） */
  readonly images: Record<SupportedLanguage, string>;
  /** コンテナ自動削除 */
  readonly autoRemove: boolean;
  /** コンテナ名プレフィックス */
  readonly containerPrefix: string;
}

/**
 * デフォルトDockerイメージ
 */
export const DEFAULT_DOCKER_IMAGES: Record<SupportedLanguage, string> = {
  bash: 'alpine:3.19',
  python: 'python:3.12-slim',
  javascript: 'node:22-slim',
  typescript: 'node:22-slim',
};

/**
 * デフォルトDocker設定
 */
export const DEFAULT_DOCKER_CONFIG: DockerConfig = {
  socketPath: '/var/run/docker.sock',
  images: DEFAULT_DOCKER_IMAGES,
  autoRemove: true,
  containerPrefix: 'katashiro-sandbox-',
};

// =============================================================================
// 実行リクエスト・結果
// =============================================================================

/**
 * コード実行リクエスト
 */
export interface ExecutionRequest {
  /** リクエストID */
  readonly id: ID;
  /** 実行するコード */
  readonly code: string;
  /** 言語 */
  readonly language: SupportedLanguage;
  /** 入力データ（stdin） */
  readonly stdin?: string;
  /** 環境変数 */
  readonly env?: Record<string, string>;
  /** タイムアウト上書き（秒） */
  readonly timeout?: number;
  /** リクエスト日時 */
  readonly createdAt: Timestamp;
}

/**
 * ファイル出力
 */
export interface FileOutput {
  /** ファイルパス（コンテナ内） */
  readonly path: string;
  /** ファイル内容 */
  readonly content: string | Buffer;
  /** ファイルサイズ（バイト） */
  readonly size: number;
  /** MIMEタイプ */
  readonly mimeType?: string;
}

/**
 * 実行結果
 * EARS: The Sandbox shall provide a temporary file system for code execution
 */
export interface ExecutionResult {
  /** リクエストID */
  readonly requestId: ID;
  /** 実行ステータス */
  readonly status: ExecutionStatus;
  /** 終了コード */
  readonly exitCode: number;
  /** 標準出力 */
  readonly stdout: string;
  /** 標準エラー出力 */
  readonly stderr: string;
  /** 実行時間（ミリ秒） */
  readonly duration: number;
  /** 出力ファイル */
  readonly files: readonly FileOutput[];
  /** メモリ使用量（バイト） */
  readonly memoryUsed?: number;
  /** CPU使用時間（ミリ秒） */
  readonly cpuTime?: number;
  /** エラー詳細（失敗時） */
  readonly error?: ExecutionError;
  /** 完了日時 */
  readonly completedAt: Timestamp;
}

/**
 * 実行エラー
 */
export interface ExecutionError {
  /** エラーコード */
  readonly code: string;
  /** エラーメッセージ */
  readonly message: string;
  /** 行番号（コンパイルエラー時） */
  readonly line?: number;
  /** 列番号（コンパイルエラー時） */
  readonly column?: number;
  /** スタックトレース */
  readonly stack?: string;
}

// =============================================================================
// セキュリティ
// =============================================================================

/**
 * セキュリティポリシー
 * EARS: If code attempts to access the host system, then the Sandbox shall block the access
 */
export interface SecurityPolicy {
  /** 許可するシステムコール */
  readonly allowedSyscalls?: readonly string[];
  /** ブロックするシステムコール */
  readonly blockedSyscalls?: readonly string[];
  /** 許可するネットワークポート */
  readonly allowedPorts?: readonly number[];
  /** 読み取り専用パス */
  readonly readOnlyPaths?: readonly string[];
  /** 書き込み可能パス */
  readonly writablePaths?: readonly string[];
  /** 最大プロセス数 */
  readonly maxProcesses: number;
  /** 最大ファイルディスクリプタ数 */
  readonly maxOpenFiles: number;
}

/**
 * デフォルトセキュリティポリシー
 */
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  blockedSyscalls: ['ptrace', 'mount', 'umount', 'reboot', 'swapon', 'swapoff'],
  readOnlyPaths: ['/etc', '/usr', '/bin', '/lib'],
  writablePaths: ['/workspace', '/tmp'],
  maxProcesses: 10,
  maxOpenFiles: 100,
};

// =============================================================================
// イベント
// =============================================================================

/**
 * サンドボックスイベントタイプ
 */
export type SandboxEventType =
  | 'execution:start'
  | 'execution:output'
  | 'execution:complete'
  | 'execution:error'
  | 'execution:timeout'
  | 'container:create'
  | 'container:start'
  | 'container:stop'
  | 'security:violation';

/**
 * サンドボックスイベント
 */
export interface SandboxEvent {
  /** イベントタイプ */
  readonly type: SandboxEventType;
  /** リクエストID */
  readonly requestId?: ID;
  /** コンテナID */
  readonly containerId?: string;
  /** イベントデータ */
  readonly data?: unknown;
  /** タイムスタンプ */
  readonly timestamp: Timestamp;
}

/**
 * サンドボックスイベントリスナー
 */
export type SandboxEventListener = (event: SandboxEvent) => void;

// =============================================================================
// コンテナ情報
// =============================================================================

/**
 * コンテナ情報
 */
export interface ContainerInfo {
  /** コンテナID */
  readonly id: string;
  /** コンテナ名 */
  readonly name: string;
  /** イメージ */
  readonly image: string;
  /** 状態 */
  readonly status: 'created' | 'running' | 'paused' | 'exited' | 'dead';
  /** 作成日時 */
  readonly createdAt: Timestamp;
  /** 開始日時 */
  readonly startedAt?: Timestamp;
  /** 終了日時 */
  readonly finishedAt?: Timestamp;
}

// =============================================================================
// リソース使用量
// =============================================================================

/**
 * リソース使用量統計
 */
export interface ResourceStats {
  /** メモリ使用量（バイト） */
  readonly memoryUsage: number;
  /** メモリ上限（バイト） */
  readonly memoryLimit: number;
  /** CPU使用率（0-100） */
  readonly cpuPercent: number;
  /** ネットワーク送信バイト */
  readonly networkTx: number;
  /** ネットワーク受信バイト */
  readonly networkRx: number;
  /** ディスクIO読み取りバイト */
  readonly diskRead: number;
  /** ディスクIO書き込みバイト */
  readonly diskWrite: number;
}
