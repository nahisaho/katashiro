/**
 * KATASHIRO Sandbox - Unified Sandbox Interface
 *
 * @fileoverview REQ-007: 統一サンドボックスインターフェース
 * @module @nahisaho/katashiro-sandbox
 * @since 0.4.0
 */

import type { Result } from '@nahisaho/katashiro-core';
import type {
  SandboxConfig,
  SandboxRuntime,
  ExecutionResult,
  SupportedLanguage,
  ExecutionRequest,
  SandboxEventType,
  SandboxEventListener,
} from './types';
import { DEFAULT_SANDBOX_CONFIG } from './types';
import { DockerExecutor, SandboxError } from './docker-executor';
import { LocalExecutor } from './local-executor';

// =============================================================================
// Sandbox Factory
// =============================================================================

/**
 * サンドボックスインターフェース
 */
export interface ISandbox {
  /**
   * コードを実行
   */
  execute(
    code: string,
    language: SupportedLanguage,
    options?: Partial<Pick<ExecutionRequest, 'stdin' | 'env' | 'timeout'>>
  ): Promise<Result<ExecutionResult, SandboxError>>;

  /**
   * 指定した実行をキャンセル
   */
  cancel(requestId: string): boolean | Promise<boolean>;

  /**
   * 全アクティブ実行をクリーンアップ
   */
  cleanup(): void | Promise<void>;

  /**
   * イベントリスナー登録
   */
  on(event: SandboxEventType, listener: SandboxEventListener): this;
}

/**
 * サンドボックスファクトリ
 *
 * 環境に応じて適切なExecutorを生成します。
 */
export class SandboxFactory {
  /**
   * サンドボックスを作成
   *
   * @param config サンドボックス設定
   * @param runtime ランタイム（省略時はconfig.runtimeを使用）
   */
  static create(
    config: Partial<SandboxConfig> = {},
    runtime?: SandboxRuntime
  ): ISandbox {
    const resolvedRuntime = runtime ?? config.runtime ?? DEFAULT_SANDBOX_CONFIG.runtime;

    switch (resolvedRuntime) {
      case 'docker':
        return new DockerExecutor(config);
      case 'local':
        return new LocalExecutor(config);
      case 'wasm':
        throw new SandboxError(
          'WASM runtime is not yet implemented',
          'NOT_IMPLEMENTED'
        );
      default:
        throw new SandboxError(
          `Unknown runtime: ${resolvedRuntime}`,
          'UNKNOWN_RUNTIME'
        );
    }
  }

  /**
   * Dockerが利用可能か確認
   */
  static async isDockerAvailable(): Promise<boolean> {
    try {
      const Docker = (await import('dockerode')).default;
      const docker = new Docker();
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 環境に応じて最適なランタイムを自動選択
   */
  static async autoDetect(): Promise<SandboxRuntime> {
    if (await this.isDockerAvailable()) {
      return 'docker';
    }
    return 'local';
  }

  /**
   * 自動検出してサンドボックスを作成
   */
  static async createAuto(
    config: Partial<SandboxConfig> = {}
  ): Promise<ISandbox> {
    const runtime = await this.autoDetect();
    return this.create(config, runtime);
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * コードを実行（簡易関数）
 *
 * @example
 * ```typescript
 * const result = await executeCode('print("Hello")', 'python');
 * if (result.isOk()) {
 *   console.log(result.value.stdout); // "Hello\n"
 * }
 * ```
 */
export async function executeCode(
  code: string,
  language: SupportedLanguage,
  options?: {
    runtime?: SandboxRuntime;
    timeout?: number;
    stdin?: string;
    env?: Record<string, string>;
  }
): Promise<Result<ExecutionResult, SandboxError>> {
  const timeout = options?.timeout ?? DEFAULT_SANDBOX_CONFIG.timeout;
  const sandbox = SandboxFactory.create(
    { timeout },
    options?.runtime ?? 'local'
  );

  try {
    return await sandbox.execute(code, language, {
      stdin: options?.stdin,
      env: options?.env,
      timeout,
    });
  } finally {
    sandbox.cleanup();
  }
}

/**
 * Bashスクリプトを実行
 */
export async function executeBash(
  script: string,
  options?: { timeout?: number; env?: Record<string, string> }
): Promise<Result<ExecutionResult, SandboxError>> {
  return executeCode(script, 'bash', options);
}

/**
 * Pythonコードを実行
 */
export async function executePython(
  code: string,
  options?: { timeout?: number; stdin?: string; env?: Record<string, string> }
): Promise<Result<ExecutionResult, SandboxError>> {
  return executeCode(code, 'python', options);
}

/**
 * JavaScriptコードを実行
 */
export async function executeJavaScript(
  code: string,
  options?: { timeout?: number; env?: Record<string, string> }
): Promise<Result<ExecutionResult, SandboxError>> {
  return executeCode(code, 'javascript', options);
}

/**
 * TypeScriptコードを実行
 */
export async function executeTypeScript(
  code: string,
  options?: { timeout?: number; env?: Record<string, string> }
): Promise<Result<ExecutionResult, SandboxError>> {
  return executeCode(code, 'typescript', options);
}
