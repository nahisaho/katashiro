/**
 * Sandbox Manager
 * サンドボックス環境の管理
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  SandboxConfig,
  SupportedLanguage,
  CodeInterpreterError,
  INTERPRETER_ERROR_CODES,
} from './types.js';

/**
 * サンドボックスインスタンス
 */
export interface SandboxInstance {
  /** サンドボックスID */
  id: string;
  /** 作業ディレクトリ */
  workDir: string;
  /** 設定 */
  config: SandboxConfig;
  /** 作成日時 */
  createdAt: Date;
  /** アクティブか */
  active: boolean;
}

/**
 * サンドボックスマネージャー
 *
 * コード実行用のサンドボックス環境を管理する。
 * 現在はファイルシステムベースの簡易サンドボックスを提供。
 * 将来的にはDocker/gVisorによる本格的な分離をサポート予定。
 *
 * @example
 * ```typescript
 * const manager = new SandboxManager();
 *
 * // サンドボックス作成
 * const sandbox = await manager.create({
 *   workDir: '/tmp/sandbox',
 *   timeout: 30000,
 *   memoryLimit: 256,
 *   allowNetwork: false,
 *   allowedHosts: [],
 *   env: {},
 * });
 *
 * // ファイルを配置
 * await manager.writeFile(sandbox.id, 'script.py', 'print("hello")');
 *
 * // クリーンアップ
 * await manager.destroy(sandbox.id);
 * ```
 */
export class SandboxManager {
  private sandboxes: Map<string, SandboxInstance> = new Map();
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.tmpdir(), 'katashiro-sandbox');
  }

  /**
   * サンドボックスを作成
   */
  async create(config: SandboxConfig): Promise<SandboxInstance> {
    const id = this.generateId();
    const workDir = path.join(this.baseDir, id);

    // ディレクトリ作成
    await fs.mkdir(workDir, { recursive: true });

    const sandbox: SandboxInstance = {
      id,
      workDir,
      config,
      createdAt: new Date(),
      active: true,
    };

    this.sandboxes.set(id, sandbox);
    return sandbox;
  }

  /**
   * サンドボックスを取得
   */
  get(id: string): SandboxInstance | undefined {
    return this.sandboxes.get(id);
  }

  /**
   * サンドボックスを破棄
   */
  async destroy(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return;

    sandbox.active = false;

    try {
      // ディレクトリを削除
      await fs.rm(sandbox.workDir, { recursive: true, force: true });
    } catch {
      // クリーンアップエラーは無視
    }

    this.sandboxes.delete(id);
  }

  /**
   * すべてのサンドボックスを破棄
   */
  async destroyAll(): Promise<void> {
    const ids = Array.from(this.sandboxes.keys());
    await Promise.all(ids.map((id) => this.destroy(id)));
  }

  /**
   * ファイルを書き込み
   */
  async writeFile(
    sandboxId: string,
    filename: string,
    content: string | Buffer
  ): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new CodeInterpreterError(
        INTERPRETER_ERROR_CODES.SANDBOX_ERROR,
        `Sandbox not found: ${sandboxId}`
      );
    }

    // パストラバーサル防止
    const safeName = path.basename(filename);
    const filePath = path.join(sandbox.workDir, safeName);

    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * ファイルを読み込み
   */
  async readFile(sandboxId: string, filename: string): Promise<Buffer> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new CodeInterpreterError(
        INTERPRETER_ERROR_CODES.SANDBOX_ERROR,
        `Sandbox not found: ${sandboxId}`
      );
    }

    const safeName = path.basename(filename);
    const filePath = path.join(sandbox.workDir, safeName);

    return fs.readFile(filePath);
  }

  /**
   * ディレクトリ内のファイルを一覧
   */
  async listFiles(sandboxId: string): Promise<string[]> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new CodeInterpreterError(
        INTERPRETER_ERROR_CODES.SANDBOX_ERROR,
        `Sandbox not found: ${sandboxId}`
      );
    }

    try {
      const entries = await fs.readdir(sandbox.workDir);
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * ファイルを収集（出力ファイル取得用）
   */
  async collectFiles(
    sandboxId: string,
    excludePatterns: RegExp[] = [/^script\./]
  ): Promise<
    Array<{
      name: string;
      content: Buffer;
      size: number;
    }>
  > {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return [];

    const files: Array<{ name: string; content: Buffer; size: number }> = [];

    try {
      const entries = await fs.readdir(sandbox.workDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        // 除外パターンチェック
        const shouldExclude = excludePatterns.some((p) => p.test(entry.name));
        if (shouldExclude) continue;

        const filePath = path.join(sandbox.workDir, entry.name);
        const content = await fs.readFile(filePath);
        const stats = await fs.stat(filePath);

        files.push({
          name: entry.name,
          content,
          size: stats.size,
        });
      }
    } catch {
      // エラーは無視
    }

    return files;
  }

  /**
   * コードファイル名を取得
   */
  getCodeFileName(language: SupportedLanguage): string {
    const extensions: Record<SupportedLanguage, string> = {
      python: 'script.py',
      javascript: 'script.js',
      typescript: 'script.ts',
      shell: 'script.sh',
    };
    return extensions[language];
  }

  /**
   * 実行コマンドを取得
   */
  getExecutionCommand(
    language: SupportedLanguage,
    codeFile: string
  ): [string, string[]] {
    const commands: Record<SupportedLanguage, [string, string[]]> = {
      python: ['python3', [codeFile]],
      javascript: ['node', [codeFile]],
      typescript: ['npx', ['ts-node', codeFile]],
      shell: ['bash', [codeFile]],
    };
    return commands[language];
  }

  /**
   * ランタイムバージョンを取得
   */
  getRuntimeVersion(language: SupportedLanguage): string {
    const versions: Record<SupportedLanguage, string> = {
      python: '3.11',
      javascript: '20.x',
      typescript: '5.x',
      shell: 'bash 5.x',
    };
    return versions[language];
  }

  /**
   * アクティブなサンドボックス数
   */
  get activeCount(): number {
    return Array.from(this.sandboxes.values()).filter((s) => s.active).length;
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
