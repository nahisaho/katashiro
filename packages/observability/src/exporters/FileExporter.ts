/**
 * File Exporter Implementation
 *
 * @requirement REQ-OBS-001, REQ-OBS-002
 * @design DES-KATASHIRO-003-OBS §3.5
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type {
  TraceExporter,
  TraceRecord,
  MetricsExporter,
  MetricsSnapshot,
} from '../types.js';

/**
 * ファイルエクスポーター設定
 */
export interface FileExporterConfig {
  /** 出力ファイルパス */
  path: string;
  /** 追記モード */
  append?: boolean;
  /** 行区切り */
  delimiter?: string;
}

/**
 * ファイルトレースエクスポーター
 */
export class FileTraceExporter implements TraceExporter {
  readonly name = 'file';
  private config: Required<FileExporterConfig>;
  private initialized = false;

  constructor(config: FileExporterConfig) {
    this.config = {
      path: config.path,
      append: config.append ?? true,
      delimiter: config.delimiter ?? '\n',
    };
  }

  async export(record: TraceRecord): Promise<void> {
    await this.ensureDir();

    const line = JSON.stringify(record) + this.config.delimiter;

    if (this.config.append) {
      await appendFile(this.config.path, line, 'utf-8');
    } else {
      await writeFile(this.config.path, line, 'utf-8');
    }
  }

  async shutdown(): Promise<void> {
    // No-op for file
  }

  private async ensureDir(): Promise<void> {
    if (this.initialized) return;
    const dir = dirname(this.config.path);
    await mkdir(dir, { recursive: true });
    this.initialized = true;
  }
}

/**
 * ファイルメトリクスエクスポーター
 */
export class FileMetricsExporter implements MetricsExporter {
  readonly name = 'file';
  private config: Required<FileExporterConfig>;
  private initialized = false;

  constructor(config: FileExporterConfig) {
    this.config = {
      path: config.path,
      append: config.append ?? true,
      delimiter: config.delimiter ?? '\n',
    };
  }

  async export(snapshot: MetricsSnapshot): Promise<void> {
    await this.ensureDir();

    const line = JSON.stringify(snapshot) + this.config.delimiter;

    if (this.config.append) {
      await appendFile(this.config.path, line, 'utf-8');
    } else {
      await writeFile(this.config.path, line, 'utf-8');
    }
  }

  async shutdown(): Promise<void> {
    // No-op for file
  }

  private async ensureDir(): Promise<void> {
    if (this.initialized) return;
    const dir = dirname(this.config.path);
    await mkdir(dir, { recursive: true });
    this.initialized = true;
  }
}
