/**
 * Workspace 型定義
 *
 * @requirement REQ-011
 * @design REQ-011-01〜REQ-011-06
 */

// ============================================================================
// ワークスペースタイプ
// ============================================================================

/**
 * ワークスペースの種類
 */
export type WorkspaceType = 'local' | 'remote' | 'docker';

/**
 * ファイル情報
 */
export interface FileInfo {
  /** ファイル名 */
  name: string;
  /** フルパス */
  path: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** ディレクトリかどうか */
  isDirectory: boolean;
  /** 最終更新日時 */
  modifiedAt: Date;
  /** 作成日時 */
  createdAt: Date;
}

/**
 * ディレクトリエントリ
 */
export interface DirectoryEntry {
  /** ファイル名 */
  name: string;
  /** ディレクトリかどうか */
  isDirectory: boolean;
}

/**
 * ワークスペース設定ベース
 */
export interface WorkspaceConfigBase {
  /** 作業ディレクトリ */
  workingDir: string;
  /** 読み取り専用モード */
  readOnly?: boolean;
}

/**
 * ローカルワークスペース設定
 */
export interface LocalWorkspaceConfig extends WorkspaceConfigBase {
  type: 'local';
}

/**
 * リモートワークスペース設定
 */
export interface RemoteWorkspaceConfig extends WorkspaceConfigBase {
  type: 'remote';
  /** APIベースURL */
  apiUrl: string;
  /** 認証トークン */
  authToken?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * Dockerワークスペース設定
 */
export interface DockerWorkspaceConfig extends WorkspaceConfigBase {
  type: 'docker';
  /** コンテナID */
  containerId: string;
  /** Docker ソケット */
  socketPath?: string;
}

/**
 * ワークスペース設定
 */
export type WorkspaceConfig =
  | LocalWorkspaceConfig
  | RemoteWorkspaceConfig
  | DockerWorkspaceConfig;

// ============================================================================
// ワークスペースインターフェース
// ============================================================================

/**
 * ワークスペースインターフェース（REQ-011-01）
 */
export interface Workspace {
  /** ワークスペースタイプ */
  readonly type: WorkspaceType;
  /** 作業ディレクトリ */
  readonly workingDir: string;
  /** 読み取り専用かどうか */
  readonly readOnly: boolean;

  /**
   * ファイルを読み取る
   * @param path ファイルパス
   * @param encoding エンコーディング（デフォルト: utf-8）
   */
  read(path: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * ファイルをバイナリとして読み取る
   * @param path ファイルパス
   */
  readBuffer(path: string): Promise<Buffer>;

  /**
   * ファイルに書き込む
   * @param path ファイルパス
   * @param content コンテンツ
   */
  write(path: string, content: string): Promise<void>;

  /**
   * バイナリを書き込む
   * @param path ファイルパス
   * @param buffer バッファ
   */
  writeBuffer(path: string, buffer: Buffer): Promise<void>;

  /**
   * ディレクトリの内容をリスト
   * @param path ディレクトリパス
   */
  list(path: string): Promise<FileInfo[]>;

  /**
   * 簡易ディレクトリリスト（名前のみ）
   * @param path ディレクトリパス
   */
  listEntries(path: string): Promise<DirectoryEntry[]>;

  /**
   * globパターンでファイルを検索（REQ-011-06）
   * @param pattern globパターン
   */
  search(pattern: string): Promise<string[]>;

  /**
   * ファイル/ディレクトリの存在確認
   * @param path パス
   */
  exists(path: string): Promise<boolean>;

  /**
   * ファイル/ディレクトリを削除
   * @param path パス
   */
  delete(path: string): Promise<void>;

  /**
   * ディレクトリを作成
   * @param path ディレクトリパス
   * @param recursive 再帰的に作成するか
   */
  mkdir(path: string, recursive?: boolean): Promise<void>;

  /**
   * ファイル情報を取得
   * @param path パス
   */
  stat(path: string): Promise<FileInfo>;

  /**
   * ファイル/ディレクトリをコピー
   * @param src ソースパス
   * @param dest 宛先パス
   */
  copy(src: string, dest: string): Promise<void>;

  /**
   * ファイル/ディレクトリを移動
   * @param src ソースパス
   * @param dest 宛先パス
   */
  move(src: string, dest: string): Promise<void>;

  /**
   * ワークスペースを初期化
   */
  initialize?(): Promise<void>;

  /**
   * ワークスペースをクリーンアップ
   */
  cleanup?(): Promise<void>;
}

// ============================================================================
// エラー
// ============================================================================

/**
 * ワークスペースエラーコード
 */
export type WorkspaceErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'ALREADY_EXISTS'
  | 'IS_DIRECTORY'
  | 'NOT_DIRECTORY'
  | 'READ_ONLY'
  | 'OPERATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'TIMEOUT';

/**
 * ワークスペースエラー
 */
export class WorkspaceError extends Error {
  constructor(
    public readonly code: WorkspaceErrorCode,
    message: string,
    public readonly path?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

// ============================================================================
// デフォルト設定
// ============================================================================

export const DEFAULT_REMOTE_TIMEOUT = 30000;
export const DEFAULT_DOCKER_SOCKET = '/var/run/docker.sock';
