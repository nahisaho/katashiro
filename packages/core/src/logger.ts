/**
 * ロガー
 *
 * @requirement REQ-NFR-006
 * @design DES-KATASHIRO-001 §2.2
 * @task TSK-001
 */

import { formatTimestamp } from './utils.js';
import type { Timestamp } from './types.js';

/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ログエントリ
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Timestamp;
}

/**
 * ロガーインターフェース
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * ロガー実装クラス
 * new Logger(name, minLevel?) で使用可能
 */
export class LoggerClass implements Logger {
  constructor(
    private readonly name: string,
    private readonly minLevel: LogLevel = 'info'
  ) {}

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: formatTimestamp(),
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.name}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}${contextStr}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${contextStr}`);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

/**
 * ロガーを作成
 */
export function createLogger(name: string, minLevel?: LogLevel): Logger {
  return new LoggerClass(name, minLevel);
}

/**
 * Logger - クラスとしてもファクトリとしても使用可能
 * 
 * 使用方法1: new Logger(name, minLevel?)
 * 使用方法2: Logger.create(name, minLevel?)
 */
export const Logger = Object.assign(
  LoggerClass,
  { create: createLogger }
) as typeof LoggerClass & { create: typeof createLogger };
