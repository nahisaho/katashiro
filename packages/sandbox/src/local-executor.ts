/**
 * KATASHIRO Sandbox - Local Executor Implementation
 *
 * @fileoverview REQ-007: ローカル環境でのコード実行（開発/テスト用）
 * @module @nahisaho/katashiro-sandbox
 * @since 0.4.0
 */

import { spawn, type ChildProcess } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventEmitter } from 'events';
import { ok, err, type Result, generateId } from '@nahisaho/katashiro-core';
import type {
  SandboxConfig,
  ExecutionRequest,
  ExecutionResult,
  ExecutionError,
  SupportedLanguage,
  SandboxEvent,
  SandboxEventType,
  SandboxEventListener,
} from './types';
import { DEFAULT_SANDBOX_CONFIG } from './types';
import { SandboxError } from './docker-executor';

// =============================================================================
// Local Executor
// =============================================================================

/**
 * Local Executor（開発/テスト用）
 *
 * 注意: このExecutorはホストシステムで直接コードを実行するため、
 * 本番環境では使用しないでください。開発とテスト目的専用です。
 */
export class LocalExecutor extends EventEmitter {
  private readonly config: SandboxConfig;
  private readonly activeProcesses = new Map<string, ChildProcess>();
  private readonly tempDir: string;

  constructor(config: Partial<SandboxConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config, runtime: 'local' };
    this.tempDir = join(tmpdir(), 'katashiro-sandbox');
  }

  /**
   * 型安全なイベントリスナー登録
   */
  on(event: SandboxEventType, listener: SandboxEventListener): this {
    return super.on(event, listener);
  }

  /**
   * イベント発火
   */
  private emitEvent(type: SandboxEventType, data: Partial<SandboxEvent>): void {
    const event: SandboxEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    };
    this.emit(type, event);
  }

  /**
   * コードを実行
   */
  async execute(
    code: string,
    language: SupportedLanguage,
    options: Partial<Pick<ExecutionRequest, 'stdin' | 'env' | 'timeout'>> = {}
  ): Promise<Result<ExecutionResult, SandboxError>> {
    const requestId = generateId();
    const timeout = options.timeout ?? this.config.timeout;
    const startTime = Date.now();

    this.emitEvent('execution:start', { requestId });

    let tempFile: string | undefined;

    try {
      // 一時ディレクトリ作成
      await mkdir(this.tempDir, { recursive: true });

      // コードを一時ファイルに書き込み
      tempFile = join(this.tempDir, `${requestId}${this.getExtension(language)}`);
      await writeFile(tempFile, code, 'utf-8');

      // コマンド構築
      const { command, args } = this.buildCommand(language, tempFile);

      // プロセス起動
      const result = await this.runProcess(
        requestId,
        command,
        args,
        timeout,
        options.stdin,
        options.env
      );

      const duration = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        requestId,
        status: result.exitCode === 0 ? 'completed' : 'failed',
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        files: [],
        completedAt: new Date().toISOString(),
      };

      this.emitEvent('execution:complete', { requestId, data: executionResult });

      return ok(executionResult);
    } catch (error) {
      const duration = Date.now() - startTime;
      const execError = this.parseError(error);

      const executionResult: ExecutionResult = {
        requestId,
        status: execError.code === 'TIMEOUT' ? 'timeout' : 'failed',
        exitCode: -1,
        stdout: '',
        stderr: execError.message,
        duration,
        files: [],
        error: execError,
        completedAt: new Date().toISOString(),
      };

      if (execError.code === 'TIMEOUT') {
        this.emitEvent('execution:timeout', { requestId, data: executionResult });
      } else {
        this.emitEvent('execution:error', { requestId, data: executionResult });
      }

      return err(new SandboxError(execError.message, execError.code, { requestId }));
    } finally {
      // 一時ファイル削除
      if (tempFile) {
        await unlink(tempFile).catch(() => {});
      }
      this.activeProcesses.delete(requestId);
    }
  }

  /**
   * 言語に対応する拡張子を取得
   */
  private getExtension(language: SupportedLanguage): string {
    const extensions: Record<SupportedLanguage, string> = {
      bash: '.sh',
      python: '.py',
      javascript: '.js',
      typescript: '.ts',
    };
    return extensions[language];
  }

  /**
   * コマンドを構築
   */
  private buildCommand(
    language: SupportedLanguage,
    filePath: string
  ): { command: string; args: string[] } {
    switch (language) {
      case 'bash':
        return { command: 'bash', args: [filePath] };
      case 'python':
        return { command: 'python3', args: [filePath] };
      case 'javascript':
        return { command: 'node', args: [filePath] };
      case 'typescript':
        return { command: 'npx', args: ['tsx', filePath] };
      default:
        throw new SandboxError(
          `Unsupported language: ${language}`,
          'UNSUPPORTED_LANGUAGE'
        );
    }
  }

  /**
   * プロセスを実行
   */
  private runProcess(
    requestId: string,
    command: string,
    args: string[],
    timeout: number,
    stdin?: string,
    env?: Record<string, string>
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: this.tempDir,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(requestId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // stdin送信
      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      // タイムアウト
      const timeoutId = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new SandboxError('Execution timeout', 'TIMEOUT', { timeout }));
      }, timeout * 1000);

      proc.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
        });
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  /**
   * エラーをパース
   */
  private parseError(error: unknown): ExecutionError {
    if (error instanceof SandboxError) {
      return {
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    };
  }

  /**
   * 指定した実行をキャンセル
   */
  cancel(requestId: string): boolean {
    const proc = this.activeProcesses.get(requestId);
    if (!proc) return false;

    proc.kill('SIGKILL');
    this.activeProcesses.delete(requestId);
    return true;
  }

  /**
   * 全アクティブプロセスをクリーンアップ
   */
  cleanup(): void {
    for (const [requestId, proc] of this.activeProcesses) {
      proc.kill('SIGKILL');
      this.activeProcesses.delete(requestId);
    }
  }

  /**
   * アクティブなプロセス数を取得
   */
  getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}
