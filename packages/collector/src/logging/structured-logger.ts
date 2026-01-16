/**
 * StructuredLogger - 構造化ログ出力
 *
 * @requirement REQ-DR-U-002 - ログ機構
 * @design DES-KATASHIRO-005-DR-LOG §3.1
 * @task TASK-009
 */

import {
  DEFAULT_LOGGER_CONFIG,
  LOG_LEVEL_PRIORITY,
  type LogEntry,
  type LogFormat,
  type LoggerConfig,
  type LogLevel,
  type LogTransport,
} from './types.js';
import { SensitiveDataMasker } from './sensitive-data-masker.js';

/**
 * コンソール出力トランスポート
 */
export class ConsoleTransport implements LogTransport {
  public readonly name = 'console';
  private readonly format: LogFormat;

  constructor(format: LogFormat = 'pretty') {
    this.format = format;
  }

  public write(entry: LogEntry): void {
    const output = this.formatEntry(entry);
    const method = this.getConsoleMethod(entry.level);
    method(output);
  }

  private formatEntry(entry: LogEntry): string {
    switch (this.format) {
      case 'json':
        return JSON.stringify(this.serializeEntry(entry));

      case 'text':
        return `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.component}: ${entry.message}`;

      case 'pretty':
      default:
        return this.formatPretty(entry);
    }
  }

  private formatPretty(entry: LogEntry): string {
    const time = entry.timestamp.toISOString().split('T')[1]?.slice(0, 12) ?? '';
    const levelIcon = this.getLevelIcon(entry.level);
    const parts = [`${levelIcon} ${time} [${entry.component}] ${entry.message}`];

    if (entry.url) {
      parts.push(`  URL: ${entry.url}`);
    }
    if (entry.durationMs !== undefined) {
      parts.push(`  Duration: ${entry.durationMs}ms`);
    }
    if (entry.retry) {
      parts.push(`  Retry: ${entry.retry.attempt}/${entry.retry.maxRetries}`);
    }
    if (entry.error) {
      parts.push(`  Error: ${entry.error.name}: ${entry.error.message}`);
    }
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`  Context: ${JSON.stringify(entry.context)}`);
    }

    return parts.join('\n');
  }

  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '🔍';
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
    }
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
    }
  }

  private serializeEntry(entry: LogEntry): Record<string, unknown> {
    return {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    };
  }
}

/**
 * メモリバッファトランスポート（テスト用）
 */
export class MemoryTransport implements LogTransport {
  public readonly name = 'memory';
  private readonly entries: LogEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  public write(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  public getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  public clear(): void {
    this.entries.length = 0;
  }

  public getLastEntry(): LogEntry | undefined {
    return this.entries[this.entries.length - 1];
  }
}

/**
 * 構造化ロガー
 *
 * @example
 * ```typescript
 * const logger = new StructuredLogger({
 *   component: 'WebScraper',
 *   level: 'info',
 * });
 *
 * logger.info('Starting scrape', { url: 'https://example.com' });
 * logger.error('Scrape failed', { url }, error);
 * ```
 */
export class StructuredLogger {
  private readonly config: LoggerConfig;
  private readonly masker: SensitiveDataMasker;
  private requestId?: string;

  constructor(options?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...options };
    this.masker = new SensitiveDataMasker();

    // デフォルトでコンソールトランスポートを追加
    if (this.config.transports.length === 0) {
      this.config.transports.push(new ConsoleTransport(this.config.format));
    }
  }

  /**
   * リクエストIDを設定
   */
  public setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * 子ロガーを作成（コンポーネント名を変更）
   */
  public child(component: string): StructuredLogger {
    const child = new StructuredLogger({
      ...this.config,
      component: `${this.config.component}:${component}`,
    });
    if (this.requestId) {
      child.setRequestId(this.requestId);
    }
    return child;
  }

  /**
   * デバッグログ
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * 情報ログ
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * 警告ログ
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * エラーログ
   */
  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * 操作の開始をログ
   */
  public startOperation(operation: string, context?: Record<string, unknown>): () => void {
    const startTime = Date.now();
    this.debug(`Starting ${operation}`, context);

    return () => {
      const durationMs = Date.now() - startTime;
      this.info(`Completed ${operation}`, { ...context, durationMs });
    };
  }

  /**
   * リトライイベントをログ
   */
  public logRetry(
    message: string,
    retry: { attempt: number; maxRetries: number; delayMs?: number },
    context?: Record<string, unknown>
  ): void {
    const entry = this.createEntry('warn', message, context);
    entry.retry = retry;
    this.writeEntry(entry);
  }

  /**
   * HTTP操作をログ
   */
  public logHttp(
    message: string,
    http: { url: string; statusCode?: number; durationMs?: number },
    context?: Record<string, unknown>
  ): void {
    const level: LogLevel = http.statusCode && http.statusCode >= 400 ? 'error' : 'info';
    const entry = this.createEntry(level, message, context);
    entry.url = this.config.maskSensitiveData ? this.masker.maskUrl(http.url) : http.url;
    entry.statusCode = http.statusCode;
    entry.durationMs = http.durationMs;
    this.writeEntry(entry);
  }

  /**
   * 内部ログメソッド
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    // ログレベルフィルタリング
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }

    const entry = this.createEntry(level, message, context);

    if (error) {
      entry.error = this.config.maskSensitiveData ? this.masker.maskError(error) : this.serializeError(error);
    }

    this.writeEntry(entry);
  }

  /**
   * ログエントリを作成
   */
  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      level,
      message: this.config.maskSensitiveData ? this.masker.mask(message) : message,
      timestamp: new Date(),
      component: this.config.component,
    };

    if (context) {
      entry.context = this.config.maskSensitiveData ? this.masker.maskObject(context) : context;
    }

    if (this.config.includeRequestId && this.requestId) {
      entry.requestId = this.requestId;
    }

    return entry;
  }

  /**
   * エントリを全トランスポートに書き込み
   */
  private writeEntry(entry: LogEntry): void {
    for (const transport of this.config.transports) {
      try {
        transport.write(entry);
      } catch (err) {
        // トランスポートエラーはコンソールに直接出力
        console.error(`[Logger] Transport "${transport.name}" failed:`, err);
      }
    }
  }

  /**
   * エラーをシリアライズ
   */
  private serializeError(error: Error): { name: string; message: string; stack?: string } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  /**
   * トランスポートを追加
   */
  public addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * 全トランスポートをクローズ
   */
  public async close(): Promise<void> {
    for (const transport of this.config.transports) {
      if (transport.close) {
        await transport.close();
      }
    }
  }
}

/**
 * グローバルロガーインスタンス
 */
let globalLogger: StructuredLogger | null = null;

/**
 * グローバルロガーを取得
 */
export function getLogger(component?: string): StructuredLogger {
  if (!globalLogger) {
    globalLogger = new StructuredLogger({ component: 'collector' });
  }

  if (component) {
    return globalLogger.child(component);
  }

  return globalLogger;
}

/**
 * グローバルロガーを設定
 */
export function setLogger(logger: StructuredLogger): void {
  globalLogger = logger;
}
