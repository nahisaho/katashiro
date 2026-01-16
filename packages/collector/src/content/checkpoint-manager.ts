/**
 * CheckpointManager - チェックポイント保存/復元
 *
 * @requirement REQ-DR-S-001 - チェックポイント保存（1分ごと）
 * @design DES-KATASHIRO-005-DR-CONTENT §2.3
 * @task TASK-027
 */

import { mkdir, readFile, writeFile, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { gzipSync, gunzipSync } from 'zlib';
import {
  DEFAULT_CHECKPOINT_CONFIG,
  type CheckpointConfig,
  type CheckpointInfo,
  type CheckpointData,
  type ContentEntry,
  type ContentManagerEvent,
  type ContentManagerEventListener,
} from './types.js';

/**
 * チェックポイントマネージャー
 */
export class CheckpointManager {
  private readonly config: CheckpointConfig;
  private readonly listeners: Set<ContentManagerEventListener> = new Set();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private pendingData: CheckpointData | null = null;

  constructor(config?: Partial<CheckpointConfig>) {
    this.config = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };
  }

  /**
   * チェックポイントを保存
   */
  public async save(data: CheckpointData): Promise<CheckpointInfo> {
    await this.ensureDirectory();

    const id = data.id || `checkpoint-${Date.now()}`;
    const createdAt = data.createdAt || new Date().toISOString();

    const checkpointData: CheckpointData = {
      ...data,
      id,
      createdAt,
      version: '2.2.0',
    };

    let content = JSON.stringify(checkpointData, null, 2);
    let fileName = `${id}.json`;

    if (this.config.compression) {
      const compressed = gzipSync(Buffer.from(content, 'utf8'));
      content = compressed.toString('base64');
      fileName = `${id}.json.gz`;
    }

    const filePath = join(this.config.directory, fileName);
    await writeFile(filePath, content, 'utf8');

    const stats = await stat(filePath);

    const info: CheckpointInfo = {
      id,
      createdAt,
      filePath,
      sizeBytes: stats.size,
      entryCount: data.entries.length,
      compressed: this.config.compression,
    };

    this.emit({ type: 'checkpoint:save', timestamp: createdAt, checkpointId: id });

    // 古いチェックポイントを削除
    await this.pruneOldCheckpoints();

    return info;
  }

  /**
   * チェックポイントを読み込み
   */
  public async load(idOrPath: string): Promise<CheckpointData> {
    let filePath: string;

    if (idOrPath.includes('/') || idOrPath.includes('\\')) {
      filePath = idOrPath;
    } else {
      // IDからファイルパスを推測
      const files = await this.list();
      const found = files.find((f) => f.id === idOrPath);
      if (!found) {
        throw new CheckpointError(`Checkpoint not found: ${idOrPath}`);
      }
      filePath = found.filePath;
    }

    let content = await readFile(filePath, 'utf8');

    // 圧縮されている場合は解凍
    if (filePath.endsWith('.gz')) {
      const compressed = Buffer.from(content, 'base64');
      content = gunzipSync(compressed).toString('utf8');
    }

    const data = JSON.parse(content) as CheckpointData;

    this.emit({ type: 'checkpoint:load', timestamp: new Date().toISOString(), checkpointId: data.id });

    return data;
  }

  /**
   * 最新のチェックポイントを読み込み
   */
  public async loadLatest(): Promise<CheckpointData | null> {
    const checkpoints = await this.list();
    if (checkpoints.length === 0) {
      return null;
    }

    // 作成日時でソート（最新順）
    const sorted = checkpoints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latest = sorted[0];
    if (!latest) {
      return null;
    }

    return this.load(latest.filePath);
  }

  /**
   * チェックポイント一覧を取得
   */
  public async list(): Promise<CheckpointInfo[]> {
    try {
      await this.ensureDirectory();
      const files = await readdir(this.config.directory);
      const checkpoints: CheckpointInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) {
          continue;
        }

        const filePath = join(this.config.directory, file);
        const stats = await stat(filePath);

        // ファイル内容を読み込んでメタデータを取得
        try {
          let content = await readFile(filePath, 'utf8');
          if (file.endsWith('.gz')) {
            const compressed = Buffer.from(content, 'base64');
            content = gunzipSync(compressed).toString('utf8');
          }

          const data = JSON.parse(content) as CheckpointData;

          checkpoints.push({
            id: data.id,
            createdAt: data.createdAt,
            filePath,
            sizeBytes: stats.size,
            entryCount: data.entries.length,
            compressed: file.endsWith('.gz'),
          });
        } catch {
          // 読み込めないファイルはスキップ
        }
      }

      return checkpoints;
    } catch {
      return [];
    }
  }

  /**
   * チェックポイントを削除
   */
  public async delete(idOrPath: string): Promise<boolean> {
    let filePath: string;

    if (idOrPath.includes('/') || idOrPath.includes('\\')) {
      filePath = idOrPath;
    } else {
      const files = await this.list();
      const found = files.find((f) => f.id === idOrPath);
      if (!found) {
        return false;
      }
      filePath = found.filePath;
    }

    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 自動保存を開始
   */
  public startAutoSave(getDataFn: () => CheckpointData): void {
    if (!this.config.enabled) {
      return;
    }

    this.stopAutoSave();

    this.autoSaveTimer = setInterval(async () => {
      try {
        const data = getDataFn();
        await this.save(data);
      } catch {
        // 自動保存のエラーは無視（ログ出力のみ）
      }
    }, this.config.intervalMs);
  }

  /**
   * 自動保存を停止
   */
  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 処理状態を保持（次回の自動保存で使用）
   */
  public setPendingData(data: CheckpointData): void {
    this.pendingData = data;
  }

  /**
   * 処理状態を取得
   */
  public getPendingData(): CheckpointData | null {
    return this.pendingData;
  }

  /**
   * チェックポイントデータを作成
   */
  public createCheckpointData(
    entries: ContentEntry[],
    processingState: CheckpointData['processingState'],
    metadata?: Record<string, unknown>
  ): CheckpointData {
    return {
      id: `checkpoint-${Date.now()}`,
      createdAt: new Date().toISOString(),
      version: '2.2.0',
      entries,
      processingState,
      metadata: metadata ?? {},
    };
  }

  /**
   * イベントリスナーを追加
   */
  public addEventListener(listener: ContentManagerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(listener: ContentManagerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * ディレクトリを確保
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await mkdir(this.config.directory, { recursive: true });
    } catch {
      // 既に存在する場合は無視
    }
  }

  /**
   * 古いチェックポイントを削除
   */
  private async pruneOldCheckpoints(): Promise<void> {
    const checkpoints = await this.list();

    if (checkpoints.length <= this.config.maxCheckpoints) {
      return;
    }

    // 作成日時でソート（古い順）
    const sorted = checkpoints.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 削除対象
    const toDelete = sorted.slice(0, checkpoints.length - this.config.maxCheckpoints);

    for (const cp of toDelete) {
      await this.delete(cp.filePath);
    }
  }

  /**
   * イベントを発火
   */
  private emit(event: ContentManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // リスナーエラーは無視
      }
    }
  }
}

/**
 * チェックポイントエラー
 */
export class CheckpointError extends Error {
  public readonly name = 'CheckpointError';

  constructor(message: string) {
    super(message);
  }
}
