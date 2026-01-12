/**
 * Result Formatter
 * 実行結果のフォーマッタ
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import * as path from 'path';
import {
  ExecutionResult,
  OutputFile,
  GeneratedImage,
  ErrorType,
  SupportedLanguage,
  SecurityConstraints,
  SandboxExecutionResult,
  BLOCKED_PYTHON_MODULES,
} from './types.js';

/**
 * フォーマットオプション
 */
export interface FormatOptions {
  /** 言語 */
  language: SupportedLanguage;
  /** 開始時刻 */
  startTime: number;
  /** インストールパッケージ */
  packages?: string[];
  /** セキュリティ設定 */
  securityConfig: {
    allowNetwork: boolean;
    allowedHosts: string[];
    timeout: number;
    memoryLimit: number;
  };
}

/**
 * 結果フォーマッタ
 *
 * 実行結果を整形し、出力ファイルや画像を抽出する。
 */
export class ResultFormatter {
  /**
   * 実行結果をフォーマット
   */
  format(
    execResult: SandboxExecutionResult,
    outputFiles: Array<{ name: string; content: Buffer; size: number }>,
    options: FormatOptions
  ): ExecutionResult {
    const now = Date.now();
    const formattedFiles = this.formatOutputFiles(outputFiles);
    const images = this.extractImages(formattedFiles);

    return {
      success: execResult.exitCode === 0,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      returnValue: execResult.returnValue,
      outputFiles: formattedFiles,
      images,
      executionTime: now - options.startTime,
      memoryUsage: execResult.memoryUsage || 0,
      logs: execResult.logs || [],
      error:
        execResult.exitCode !== 0
          ? {
              type: this.classifyError(execResult.stderr),
              message: execResult.stderr,
              stack: execResult.stderr,
              ...this.extractLineInfo(execResult.stderr),
            }
          : undefined,
      metadata: {
        startedAt: new Date(options.startTime),
        completedAt: new Date(now),
        language: options.language,
        runtimeVersion: execResult.runtimeVersion || 'unknown',
        installedPackages: options.packages || [],
        securityConstraints: this.getSecurityConstraints(options.securityConfig),
      },
    };
  }

  /**
   * エラー結果を作成
   */
  createErrorResult(
    errorType: ErrorType,
    message: string,
    options: FormatOptions
  ): ExecutionResult {
    const now = Date.now();

    return {
      success: false,
      stdout: '',
      stderr: message,
      executionTime: now - options.startTime,
      memoryUsage: 0,
      logs: [],
      error: {
        type: errorType,
        message,
      },
      metadata: {
        startedAt: new Date(options.startTime),
        completedAt: new Date(now),
        language: options.language,
        runtimeVersion: 'N/A',
        installedPackages: [],
        securityConstraints: this.getSecurityConstraints(options.securityConfig),
      },
    };
  }

  /**
   * 出力ファイルをフォーマット
   */
  private formatOutputFiles(
    files: Array<{ name: string; content: Buffer; size: number }>
  ): OutputFile[] {
    return files.map((file) => ({
      name: file.name,
      content: file.content,
      mimeType: this.getMimeType(file.name),
      size: file.size,
    }));
  }

  /**
   * 画像を抽出
   */
  private extractImages(files: OutputFile[]): GeneratedImage[] {
    return files
      .filter((f) => f.mimeType.startsWith('image/'))
      .map((f) => ({
        type: this.getImageType(f.name),
        data: f.content.toString('base64'),
      }));
  }

  /**
   * 画像タイプを取得
   */
  private getImageType(filename: string): 'png' | 'jpeg' | 'svg' {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'png';
    if (ext === '.svg') return 'svg';
    return 'jpeg';
  }

  /**
   * MIMEタイプを取得
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.xml': 'application/xml',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * エラータイプを分類
   */
  private classifyError(stderr: string): ErrorType {
    const errorPatterns: Array<{ pattern: RegExp; type: ErrorType }> = [
      { pattern: /SyntaxError/i, type: 'syntax_error' },
      { pattern: /IndentationError/i, type: 'syntax_error' },
      { pattern: /ImportError/i, type: 'import_error' },
      { pattern: /ModuleNotFoundError/i, type: 'import_error' },
      { pattern: /PermissionError/i, type: 'permission_error' },
      { pattern: /blocked for security/i, type: 'permission_error' },
      { pattern: /MemoryError/i, type: 'memory_error' },
      { pattern: /memory limit/i, type: 'memory_error' },
      { pattern: /timed out/i, type: 'timeout_error' },
      { pattern: /TimeoutError/i, type: 'timeout_error' },
    ];

    for (const { pattern, type } of errorPatterns) {
      if (pattern.test(stderr)) {
        return type;
      }
    }

    return 'runtime_error';
  }

  /**
   * 行情報を抽出
   */
  private extractLineInfo(
    stderr: string
  ): { line?: number; column?: number } {
    // Python: File "script.py", line 5
    const pythonMatch = stderr.match(/line (\d+)/i);
    if (pythonMatch?.[1]) {
      return { line: parseInt(pythonMatch[1], 10) };
    }

    // JavaScript: at script.js:5:10
    const jsMatch = stderr.match(/:(\d+):(\d+)/);
    if (jsMatch?.[1] && jsMatch?.[2]) {
      return {
        line: parseInt(jsMatch[1], 10),
        column: parseInt(jsMatch[2], 10),
      };
    }

    return {};
  }

  /**
   * セキュリティ制約を取得
   */
  private getSecurityConstraints(config: {
    allowNetwork: boolean;
    allowedHosts: string[];
    timeout: number;
    memoryLimit: number;
  }): SecurityConstraints {
    return {
      fileSystemAccess: 'sandbox',
      networkAccess: config.allowNetwork,
      allowedHosts: config.allowedHosts,
      timeout: config.timeout,
      memoryLimit: config.memoryLimit,
      blockedModules: [...BLOCKED_PYTHON_MODULES],
    };
  }
}
