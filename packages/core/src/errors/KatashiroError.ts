/**
 * KATASHIROエラークラス
 *
 * @design DES-COMMON-001 §5
 * @task TASK-000
 */

import type {
  ErrorModule,
  ErrorCategory,
  StructuredErrorCode,
  KatashiroErrorOptions,
  SerializedError,
} from './types.js';

/**
 * エラーコードをパース
 *
 * @param code - エラーコード文字列 (e.g., "COL_NTF_001")
 * @returns 構造化エラーコード
 * @throws Error - 無効なフォーマットの場合
 */
export function parseErrorCode(code: string): StructuredErrorCode {
  const parts = code.split('_');
  if (parts.length !== 3) {
    throw new Error(`Invalid error code format: ${code}. Expected format: MODULE_CATEGORY_NUMBER`);
  }

  const module = parts[0]!;
  const category = parts[1]!;
  const number = parts[2]!;

  // モジュール検証
  const validModules: ErrorModule[] = ['COR', 'COL', 'ANA', 'MED', 'GEN', 'KNW'];
  if (!validModules.includes(module as ErrorModule)) {
    throw new Error(`Invalid module: ${module}. Valid modules: ${validModules.join(', ')}`);
  }

  // カテゴリ検証
  const validCategories: ErrorCategory[] = [
    'VAL',
    'AUT',
    'PRM',
    'NTF',
    'CNF',
    'NET',
    'TMO',
    'SEC',
    'SYS',
    'EXT',
  ];
  if (!validCategories.includes(category as ErrorCategory)) {
    throw new Error(
      `Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}`
    );
  }

  // 番号検証
  if (!/^\d{3}$/.test(number)) {
    throw new Error(`Invalid number: ${number}. Expected 3-digit number (e.g., 001)`);
  }

  return {
    code,
    module: module as ErrorModule,
    category: category as ErrorCategory,
    number,
  };
}

/**
 * KATASHIRO共通エラークラス
 *
 * @example
 * ```typescript
 * import { KatashiroError, ErrorCodes } from '@nahisaho/katashiro-core';
 *
 * throw new KatashiroError(
 *   ErrorCodes.FILE_NOT_FOUND,
 *   'File not found: document.pdf',
 *   { details: { filePath: 'document.pdf' }, retryable: false }
 * );
 * ```
 */
export class KatashiroError extends Error {
  /** 構造化エラーコード */
  readonly code: StructuredErrorCode;
  /** 追加詳細情報 */
  readonly details?: Record<string, unknown>;
  /** 原因となったエラー */
  readonly cause?: Error;
  /** リトライ可能か */
  readonly retryable: boolean;
  /** エラー発生時刻 */
  readonly timestamp: Date;

  /**
   * KatashiroErrorを作成
   *
   * @param code - エラーコード (e.g., "COL_NTF_001")
   * @param message - エラーメッセージ
   * @param options - オプション
   */
  constructor(code: string, message: string, options?: KatashiroErrorOptions) {
    super(message);
    this.name = 'KatashiroError';
    this.code = parseErrorCode(code);
    this.details = options?.details;
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? this.determineRetryable();
    this.timestamp = new Date();

    // スタックトレースを正しく設定
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KatashiroError);
    }
  }

  /**
   * カテゴリに基づいてリトライ可能性を判定
   */
  private determineRetryable(): boolean {
    const retryableCategories: ErrorCategory[] = ['NET', 'TMO', 'EXT'];
    return retryableCategories.includes(this.code.category);
  }

  /**
   * エラーコード文字列を取得
   */
  get errorCode(): string {
    return this.code.code;
  }

  /**
   * モジュール識別子を取得
   */
  get module(): ErrorModule {
    return this.code.module;
  }

  /**
   * カテゴリを取得
   */
  get category(): ErrorCategory {
    return this.code.category;
  }

  /**
   * JSON形式に変換
   */
  toJSON(): SerializedError {
    return {
      name: this.name,
      code: this.code.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
    };
  }

  /**
   * 文字列に変換
   */
  toString(): string {
    return `[${this.code.code}] ${this.message}`;
  }

  /**
   * KatashiroErrorかどうかを判定
   */
  static isKatashiroError(error: unknown): error is KatashiroError {
    return error instanceof KatashiroError;
  }

  /**
   * 任意のエラーをKatashiroErrorに変換
   */
  static from(error: unknown, defaultCode = 'COR_SYS_001'): KatashiroError {
    if (KatashiroError.isKatashiroError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new KatashiroError(defaultCode, error.message, {
        cause: error,
        retryable: false,
      });
    }

    return new KatashiroError(defaultCode, String(error), {
      retryable: false,
    });
  }
}
