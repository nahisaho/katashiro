/**
 * ログ機構 型定義
 *
 * @requirement REQ-DR-U-002 - ログ機構
 * @design DES-KATASHIRO-005-DR-LOG
 * @task TASK-007
 */

import { z } from 'zod';

/**
 * ログレベル
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * ログレベルの数値マッピング（フィルタリング用）
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ログエントリ
 */
export interface LogEntry {
  /** ログレベル */
  level: LogLevel;
  /** メッセージ */
  message: string;
  /** タイムスタンプ */
  timestamp: Date;
  /** コンポーネント名 */
  component: string;
  /** 追加コンテキスト */
  context?: Record<string, unknown>;
  /** リクエストID（トレーシング用） */
  requestId?: string;
  /** エラー情報 */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  /** 処理時間（ミリ秒） */
  durationMs?: number;
  /** URL（Web操作の場合） */
  url?: string;
  /** HTTPステータスコード */
  statusCode?: number;
  /** リトライ情報 */
  retry?: {
    attempt: number;
    maxRetries: number;
    delayMs?: number;
  };
}

/**
 * ログエントリのZodスキーマ
 */
export const LogEntrySchema = z.object({
  level: LogLevelSchema,
  message: z.string(),
  timestamp: z.date(),
  component: z.string(),
  context: z.record(z.unknown()).optional(),
  requestId: z.string().optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  durationMs: z.number().optional(),
  url: z.string().optional(),
  statusCode: z.number().optional(),
  retry: z
    .object({
      attempt: z.number(),
      maxRetries: z.number(),
      delayMs: z.number().optional(),
    })
    .optional(),
});

/**
 * ログフォーマット
 */
export type LogFormat = 'json' | 'text' | 'pretty';

/**
 * ログ出力先
 */
export interface LogTransport {
  /** 出力先名 */
  name: string;
  /** ログを書き込む */
  write(entry: LogEntry): void | Promise<void>;
  /** リソースをクリーンアップ */
  close?(): void | Promise<void>;
}

/**
 * ロガー設定
 */
export interface LoggerConfig {
  /** 最小ログレベル */
  level: LogLevel;
  /** コンポーネント名 */
  component: string;
  /** 出力フォーマット */
  format: LogFormat;
  /** 出力先 */
  transports: LogTransport[];
  /** 機密データマスキングを有効化 */
  maskSensitiveData: boolean;
  /** コンテキストにタイムスタンプを含める */
  includeTimestamp: boolean;
  /** コンテキストにリクエストIDを含める */
  includeRequestId: boolean;
}

/**
 * デフォルトロガー設定
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  component: 'collector',
  format: 'json',
  transports: [],
  maskSensitiveData: true,
  includeTimestamp: true,
  includeRequestId: true,
};

/**
 * マスキングパターン
 */
export interface MaskingPattern {
  /** パターン名 */
  name: string;
  /** マッチする正規表現 */
  pattern: RegExp;
  /** 置換文字列 */
  replacement: string;
}

/**
 * デフォルトマスキングパターン
 */
export const DEFAULT_MASKING_PATTERNS: MaskingPattern[] = [
  {
    name: 'api_key',
    pattern: /(?:api[_-]?key|apikey|token|secret|password|auth)[\s:="']+([^\s"'&]+)/gi,
    replacement: '$1[MASKED]',
  },
  {
    name: 'bearer_token',
    pattern: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
    replacement: 'Bearer [MASKED]',
  },
  {
    name: 'email',
    pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: '[EMAIL]@$2',
  },
  {
    name: 'credit_card',
    pattern: /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
    replacement: '$1-****-****-$4',
  },
  {
    name: 'ip_address',
    pattern: /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
    replacement: '$1.$2.xxx.xxx',
  },
  {
    name: 'phone_japan',
    pattern: /\b(0\d{1,4})[- ]?(\d{1,4})[- ]?(\d{4})\b/g,
    replacement: '$1-****-$3',
  },
];
