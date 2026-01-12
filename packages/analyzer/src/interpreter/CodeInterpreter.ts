/**
 * Code Interpreter
 * メインオーケストレータークラス
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import { ok, err, Result } from '@nahisaho/katashiro-core';
import {
  ExecutionRequest,
  ExecutionResult,
  ExecutionSession,
  SupportedLanguage,
  CodeAnalysis,
  DEFAULT_EXECUTION_CONFIG,
  CodeInterpreterError,
  INTERPRETER_ERROR_CODES,
} from './types.js';
import { CodeValidator } from './CodeValidator.js';
import { SandboxManager } from './SandboxManager.js';
import { ExecutionEngine } from './ExecutionEngine.js';
import { ResultFormatter, FormatOptions } from './ResultFormatter.js';
import { SessionManager } from './SessionManager.js';

/**
 * Code Interpreter
 *
 * サンドボックス環境でコードを安全に実行する。
 * Python, JavaScript, TypeScript, Shell をサポート。
 *
 * @example
 * ```typescript
 * const interpreter = new CodeInterpreter();
 *
 * // Pythonコードの実行
 * const result = await interpreter.execute({
 *   code: `
 *     numbers = [1, 2, 3, 4, 5]
 *     print(f"Sum: {sum(numbers)}")
 *     print(f"Average: {sum(numbers) / len(numbers)}")
 *   `,
 *   language: 'python',
 * });
 *
 * if (isOk(result) && result.value.success) {
 *   console.log(result.value.stdout);
 *   // "Sum: 15"
 *   // "Average: 3.0"
 * }
 *
 * // データ可視化
 * const vizResult = await interpreter.execute({
 *   code: `
 *     import matplotlib.pyplot as plt
 *     import numpy as np
 *
 *     x = np.linspace(0, 2 * np.pi, 100)
 *     plt.plot(x, np.sin(x))
 *     plt.savefig('sine_wave.png')
 *   `,
 *   language: 'python',
 * });
 *
 * // 入力データを渡す
 * const dataResult = await interpreter.execute({
 *   code: `
 *     import json
 *     data = json.loads(input_data)
 *     total = sum(item['price'] * item['quantity'] for item in data['items'])
 *     print(f"Total: ${total:.2f}")
 *   `,
 *   language: 'python',
 *   inputs: {
 *     input_data: JSON.stringify({
 *       items: [
 *         { name: 'Apple', price: 1.5, quantity: 3 },
 *         { name: 'Banana', price: 0.8, quantity: 5 },
 *       ],
 *     }),
 *   },
 * });
 * ```
 */
export class CodeInterpreter {
  private validator: CodeValidator;
  private sandboxManager: SandboxManager;
  private executionEngine: ExecutionEngine;
  private resultFormatter: ResultFormatter;
  private sessionManager: SessionManager;

  constructor() {
    this.validator = new CodeValidator();
    this.sandboxManager = new SandboxManager();
    this.executionEngine = new ExecutionEngine(this.sandboxManager);
    this.resultFormatter = new ResultFormatter();
    this.sessionManager = new SessionManager();
  }

  /**
   * コードを実行
   */
  async execute(
    request: ExecutionRequest
  ): Promise<Result<ExecutionResult, Error>> {
    const config = {
      ...DEFAULT_EXECUTION_CONFIG,
      ...request,
    };

    const startTime = Date.now();
    const formatOptions: FormatOptions = {
      language: config.language,
      startTime,
      packages: config.packages,
      securityConfig: {
        allowNetwork: config.allowNetwork || false,
        allowedHosts: config.allowedHosts || [],
        timeout: config.timeout || DEFAULT_EXECUTION_CONFIG.timeout,
        memoryLimit: config.memoryLimit || DEFAULT_EXECUTION_CONFIG.memoryLimit,
      },
    };

    try {
      // 1. コードを検証
      const validation = this.validator.validate(config.code, config.language);

      if (!validation.valid) {
        return ok(
          this.resultFormatter.createErrorResult(
            'permission_error',
            `Code validation failed: ${validation.errors.join(', ')}`,
            formatOptions
          )
        );
      }

      // 2. サンドボックスを作成
      const sandbox = await this.sandboxManager.create({
        workDir: '',
        timeout: config.timeout || DEFAULT_EXECUTION_CONFIG.timeout,
        memoryLimit: config.memoryLimit || DEFAULT_EXECUTION_CONFIG.memoryLimit,
        allowNetwork: config.allowNetwork || false,
        allowedHosts: config.allowedHosts || [],
        env: config.env || {},
      });

      try {
        // 3. 入力ファイルを配置
        if (config.inputFiles) {
          for (const file of config.inputFiles) {
            await this.sandboxManager.writeFile(
              sandbox.id,
              file.name,
              file.content
            );
          }
        }

        // 4. コードを実行
        const execResult = await this.executionEngine.execute(
          sandbox,
          config.code,
          config.language,
          {
            timeout: config.timeout || DEFAULT_EXECUTION_CONFIG.timeout,
            memoryLimit:
              config.memoryLimit || DEFAULT_EXECUTION_CONFIG.memoryLimit,
            env: config.env || {},
            inputs: config.inputs,
          }
        );

        // 5. 出力ファイルを収集
        const outputFiles = await this.sandboxManager.collectFiles(sandbox.id);

        // 6. 結果をフォーマット
        const result = this.resultFormatter.format(
          execResult,
          outputFiles,
          formatOptions
        );

        return ok(result);
      } finally {
        // サンドボックスをクリーンアップ
        await this.sandboxManager.destroy(sandbox.id);
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * REPLセッションを開始
   */
  async startSession(
    language: SupportedLanguage
  ): Promise<Result<ExecutionSession, Error>> {
    try {
      const session = await this.sessionManager.create(language);
      return ok(session);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * セッションでコードを実行
   */
  async executeInSession(
    sessionId: string,
    code: string
  ): Promise<Result<ExecutionResult, Error>> {
    const session = this.sessionManager.get(sessionId);

    if (!session) {
      return err(
        new CodeInterpreterError(
          INTERPRETER_ERROR_CODES.SESSION_NOT_FOUND,
          `Session not found: ${sessionId}`
        )
      );
    }

    // セッションをアクティブ化
    this.sessionManager.activate(sessionId);

    // 実行
    const result = await this.execute({
      code,
      language: session.language,
      mode: 'repl',
      inputs: session.globals,
    });

    // 履歴に追加
    if (result._tag === 'Ok') {
      this.sessionManager.addHistory(sessionId, {
        input: code,
        output: result.value.stdout,
        executedAt: new Date(),
        success: result.value.success,
      });
    }

    return result;
  }

  /**
   * セッションを終了
   */
  async endSession(sessionId: string): Promise<void> {
    await this.sessionManager.terminate(sessionId);
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessionManager.get(sessionId);
  }

  /**
   * アクティブなセッション一覧
   */
  listSessions(): ExecutionSession[] {
    return this.sessionManager.listActive();
  }

  /**
   * コードを分析（実行せず）
   */
  async analyze(
    code: string,
    language: SupportedLanguage
  ): Promise<CodeAnalysis> {
    const validation = this.validator.validate(code, language);
    const imports = this.validator.extractImports(code, language);
    const complexity = this.validator.calculateComplexity(code);

    return {
      valid: validation.valid,
      issues: [...validation.errors, ...validation.warnings],
      imports,
      complexity,
    };
  }

  /**
   * コードを検証
   */
  validate(
    code: string,
    language: SupportedLanguage
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    return this.validator.validate(code, language);
  }

  /**
   * サポートされる言語
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['python', 'javascript', 'typescript', 'shell'];
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.sandboxManager.destroyAll();
    await this.sessionManager.terminateAll();
  }
}
