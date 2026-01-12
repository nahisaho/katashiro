/**
 * Execution Engine
 * コード実行エンジン
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import { spawn, ChildProcess } from 'child_process';
import {
  SupportedLanguage,
  SandboxExecutionResult,
  ExecutionLog,
  BLOCKED_PYTHON_MODULES,
} from './types.js';
import { SandboxManager, SandboxInstance } from './SandboxManager.js';

/**
 * 実行オプション
 */
export interface ExecutionOptions {
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** メモリ制限（MB） */
  memoryLimit: number;
  /** 環境変数 */
  env: Record<string, string>;
  /** 入力データ */
  inputs?: Record<string, unknown>;
}

/**
 * 実行エンジン
 *
 * サンドボックス内でコードを実行する。
 * タイムアウト、メモリ制限などのリソース制約を適用。
 *
 * @example
 * ```typescript
 * const engine = new ExecutionEngine(sandboxManager);
 *
 * const result = await engine.execute(
 *   sandbox,
 *   'print("Hello, World!")',
 *   'python',
 *   { timeout: 30000, memoryLimit: 256, env: {} }
 * );
 *
 * console.log(result.stdout); // "Hello, World!"
 * ```
 */
export class ExecutionEngine {
  constructor(private sandboxManager: SandboxManager) {}

  /**
   * コードを実行
   */
  async execute(
    sandbox: SandboxInstance,
    code: string,
    language: SupportedLanguage,
    options: ExecutionOptions
  ): Promise<SandboxExecutionResult> {
    const logs: ExecutionLog[] = [];
    const startTime = Date.now();

    this.log(logs, 'info', `Starting ${language} execution`);

    // コードファイルを作成
    const codeFileName = this.sandboxManager.getCodeFileName(language);
    const wrappedCode = this.wrapCode(code, language, options.inputs);

    const codeFilePath = await this.sandboxManager.writeFile(
      sandbox.id,
      codeFileName,
      wrappedCode
    );

    this.log(logs, 'debug', `Code file created: ${codeFileName}`);

    // 実行コマンドを取得
    const [command, args] = this.sandboxManager.getExecutionCommand(
      language,
      codeFilePath
    );

    // 実行
    const result = await this.executeProcess(
      command,
      args,
      sandbox.workDir,
      options,
      logs
    );

    this.log(
      logs,
      'info',
      `Execution completed in ${Date.now() - startTime}ms`
    );

    return {
      ...result,
      runtimeVersion: this.sandboxManager.getRuntimeVersion(language),
      logs,
    };
  }

  /**
   * プロセスを実行
   */
  private executeProcess(
    command: string,
    args: string[],
    cwd: string,
    options: ExecutionOptions,
    logs: ExecutionLog[]
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const memoryExceeded = false;
      let childProcess: ChildProcess | null = null;

      try {
        childProcess = spawn(command, args, {
          cwd,
          env: {
            PATH: globalThis.process?.env?.PATH || '/usr/bin:/bin',
            ...options.env,
          },
        });

        // stdout収集
        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();

          // 出力サイズ制限（1MB）
          if (stdout.length > 1024 * 1024) {
            stdout = stdout.slice(0, 1024 * 1024) + '\n[Output truncated]';
            this.log(logs, 'warn', 'Output truncated due to size limit');
          }
        });

        // stderr収集
        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();

          if (stderr.length > 1024 * 1024) {
            stderr = stderr.slice(0, 1024 * 1024) + '\n[Error output truncated]';
          }
        });

        // タイムアウト設定
        const timeoutId = setTimeout(() => {
          timedOut = true;
          this.log(logs, 'error', `Execution timed out after ${options.timeout}ms`);
          childProcess?.kill('SIGKILL');
        }, options.timeout);

        // メモリ監視（簡易版 - Node.js環境ではプロセスメモリを直接制限できないため警告のみ）
        const memoryCheckInterval = setInterval(() => {
          // 本格的なメモリ制限はDocker/cgroupsで実装予定
        }, 1000);

        // 完了時
        childProcess.on('close', (exitCode) => {
          clearTimeout(timeoutId);
          clearInterval(memoryCheckInterval);

          if (timedOut) {
            resolve({
              exitCode: -1,
              stdout,
              stderr: 'Execution timed out',
              memoryUsage: 0,
            });
          } else if (memoryExceeded) {
            resolve({
              exitCode: -1,
              stdout,
              stderr: 'Memory limit exceeded',
              memoryUsage: options.memoryLimit,
            });
          } else {
            resolve({
              exitCode: exitCode || 0,
              stdout,
              stderr,
              memoryUsage: 0, // 実際の値はDocker環境で取得
            });
          }
        });

        // エラー時
        childProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          clearInterval(memoryCheckInterval);
          this.log(logs, 'error', `Process error: ${error.message}`);

          resolve({
            exitCode: -1,
            stdout: '',
            stderr: error.message,
            memoryUsage: 0,
          });
        });
      } catch (error) {
        this.log(
          logs,
          'error',
          `Failed to spawn process: ${error instanceof Error ? error.message : String(error)}`
        );

        resolve({
          exitCode: -1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          memoryUsage: 0,
        });
      }
    });
  }

  /**
   * コードをラップ（セキュリティ制約適用）
   */
  private wrapCode(
    code: string,
    language: SupportedLanguage,
    inputs?: Record<string, unknown>
  ): string {
    if (language === 'python') {
      return this.wrapPythonCode(code, inputs);
    }

    if (language === 'javascript' || language === 'typescript') {
      return this.wrapJavaScriptCode(code, inputs);
    }

    if (language === 'shell') {
      return this.wrapShellCode(code, inputs);
    }

    return code;
  }

  /**
   * Pythonコードをラップ
   */
  private wrapPythonCode(
    code: string,
    inputs?: Record<string, unknown>
  ): string {
    const blockedModulesJson = JSON.stringify([...BLOCKED_PYTHON_MODULES]);

    // 入力変数の設定
    const inputSetup = inputs
      ? Object.entries(inputs)
          .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
          .join('\n')
      : '';

    return `
# Security restrictions
import sys

BLOCKED_MODULES = ${blockedModulesJson}

class ImportBlocker:
    def find_module(self, name, path=None):
        if name in BLOCKED_MODULES or name.split('.')[0] in BLOCKED_MODULES:
            raise ImportError(f"Module '{name}' is blocked for security reasons")
        return None

sys.meta_path.insert(0, ImportBlocker())

# Disable dangerous builtins
import builtins
_original_open = builtins.open
def _restricted_open(file, mode='r', *args, **kwargs):
    # Only allow reading/writing in current directory
    import os
    abs_path = os.path.abspath(file)
    cwd = os.getcwd()
    if not abs_path.startswith(cwd):
        raise PermissionError(f"Access to '{file}' is not allowed")
    return _original_open(file, mode, *args, **kwargs)
builtins.open = _restricted_open

# Input variables
${inputSetup}

# User code
${code}
`;
  }

  /**
   * JavaScriptコードをラップ
   */
  private wrapJavaScriptCode(
    code: string,
    inputs?: Record<string, unknown>
  ): string {
    const inputSetup = inputs
      ? Object.entries(inputs)
          .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
          .join('\n')
      : '';

    return `
// Security: Override dangerous globals
const _originalRequire = typeof require !== 'undefined' ? require : null;
const blockedModules = ['fs', 'child_process', 'net', 'dgram', 'cluster', 'vm', 'worker_threads'];

if (_originalRequire) {
  global.require = function(module) {
    if (blockedModules.includes(module)) {
      throw new Error(\`Module '\${module}' is blocked for security reasons\`);
    }
    return _originalRequire(module);
  };
}

// Input variables
${inputSetup}

// User code
${code}
`;
  }

  /**
   * Shellコードをラップ
   */
  private wrapShellCode(
    code: string,
    inputs?: Record<string, unknown>
  ): string {
    const inputSetup = inputs
      ? Object.entries(inputs)
          .map(([k, v]) => `export ${k}=${JSON.stringify(String(v))}`)
          .join('\n')
      : '';

    return `#!/bin/bash
set -e

# Input variables
${inputSetup}

# User code
${code}
`;
  }

  /**
   * ログを追加
   */
  private log(
    logs: ExecutionLog[],
    level: ExecutionLog['level'],
    message: string
  ): void {
    logs.push({
      timestamp: new Date(),
      level,
      message,
    });
  }
}
