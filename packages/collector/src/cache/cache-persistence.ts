/**
 * CachePersistence - キャッシュ永続化
 *
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 * @task TASK-040
 */

import { mkdir, readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  CacheEntry,
  CacheStatistics,
  PersistedCacheData,
} from './types.js';
import { PersistedCacheDataSchema } from './types.js';

/**
 * 永続化オプション
 */
export interface CachePersistenceOptions {
  /** 保存先ディレクトリ */
  directory: string;
  /** ファイル名。デフォルト: 'cache.json' */
  filename?: string;
  /** 圧縮有効。デフォルト: false */
  compress?: boolean;
  /** 保存時のインデント。デフォルト: undefined（最小化） */
  indent?: number;
}

/**
 * 永続化結果
 */
export interface PersistenceResult {
  success: boolean;
  path: string;
  entries: number;
  sizeBytes: number;
  error?: Error;
}

/**
 * キャッシュ永続化クラス
 *
 * キャッシュをJSONファイルとして保存・読み込みします。
 */
export class CachePersistence<T = unknown> {
  private readonly directory: string;
  private readonly filename: string;
  private readonly compress: boolean;
  private readonly indent: number | undefined;

  constructor(options: CachePersistenceOptions) {
    this.directory = options.directory;
    this.filename = options.filename ?? 'cache.json';
    this.compress = options.compress ?? false;
    this.indent = options.indent;
  }

  /**
   * キャッシュを保存
   *
   * @param entries キャッシュエントリ
   * @param statistics 統計情報
   * @returns 保存結果
   */
  async save(
    entries: CacheEntry<T>[],
    statistics: CacheStatistics
  ): Promise<PersistenceResult> {
    const path = this.getFilePath();

    try {
      // ディレクトリ作成
      await mkdir(dirname(path), { recursive: true });

      // 期限切れエントリを除外
      const now = Date.now();
      const validEntries = entries.filter((e) => e.expiresAt > now);

      // データ作成
      const data: PersistedCacheData = {
        version: 1,
        createdAt: now,
        entries: validEntries as CacheEntry<unknown>[],
        statistics,
      };

      // JSON化
      let content = JSON.stringify(data, null, this.indent);

      // 圧縮（簡易的な文字列圧縮）
      if (this.compress) {
        content = await this.compressString(content);
      }

      // 書き込み
      await writeFile(path, content, 'utf-8');

      // サイズ取得
      const stats = await stat(path);

      return {
        success: true,
        path,
        entries: validEntries.length,
        sizeBytes: stats.size,
      };
    } catch (error) {
      return {
        success: false,
        path,
        entries: 0,
        sizeBytes: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * キャッシュを読み込み
   *
   * @returns 読み込み結果
   */
  async load(): Promise<
    | { success: true; data: PersistedCacheData }
    | { success: false; error: Error }
  > {
    const path = this.getFilePath();

    try {
      // ファイル読み込み
      let content = await readFile(path, 'utf-8');

      // 解凍
      if (this.compress) {
        content = await this.decompressString(content);
      }

      // パース
      const parsed = JSON.parse(content);

      // バリデーション
      const result = PersistedCacheDataSchema.safeParse(parsed);
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Invalid cache data: ${result.error.message}`),
        };
      }

      // 期限切れエントリを除外
      const now = Date.now();
      result.data.entries = result.data.entries.filter(
        (e) => e.expiresAt > now
      );

      return {
        success: true,
        data: result.data as PersistedCacheData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * キャッシュファイルを削除
   */
  async clear(): Promise<boolean> {
    const path = this.getFilePath();

    try {
      await unlink(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * キャッシュファイルの存在確認
   */
  async exists(): Promise<boolean> {
    const path = this.getFilePath();

    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイルパスを取得
   */
  getFilePath(): string {
    return join(this.directory, this.filename);
  }

  // ========== Private Methods ==========

  /**
   * 簡易文字列圧縮（Base64エンコード）
   * 本格的な圧縮が必要な場合はzlib等を使用
   */
  private async compressString(input: string): Promise<string> {
    // 簡易的にBase64エンコード（実際にはzlibを使うべき）
    return Buffer.from(input, 'utf-8').toString('base64');
  }

  /**
   * 簡易文字列解凍
   */
  private async decompressString(input: string): Promise<string> {
    return Buffer.from(input, 'base64').toString('utf-8');
  }
}

/**
 * バックアップ付き永続化
 */
export class BackupCachePersistence<T = unknown> extends CachePersistence<T> {
  private readonly maxBackups: number;

  constructor(
    options: CachePersistenceOptions & { maxBackups?: number }
  ) {
    super(options);
    this.maxBackups = options.maxBackups ?? 3;
  }

  /**
   * バックアップ付きで保存
   */
  override async save(
    entries: CacheEntry<T>[],
    statistics: CacheStatistics
  ): Promise<PersistenceResult> {
    const path = this.getFilePath();

    try {
      // 既存ファイルがあればバックアップ
      if (await this.exists()) {
        await this.rotateBackups();
      }

      // 通常の保存
      return super.save(entries, statistics);
    } catch (error) {
      return {
        success: false,
        path,
        entries: 0,
        sizeBytes: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * バックアップからリカバリ
   */
  async loadFromBackup(
    backupIndex = 1
  ): Promise<
    | { success: true; data: PersistedCacheData }
    | { success: false; error: Error }
  > {
    const backupPath = `${this.getFilePath()}.bak${backupIndex}`;

    try {
      const content = await readFile(backupPath, 'utf-8');
      const parsed = JSON.parse(content);
      const result = PersistedCacheDataSchema.safeParse(parsed);

      if (!result.success) {
        return {
          success: false,
          error: new Error(`Invalid backup data: ${result.error.message}`),
        };
      }

      return {
        success: true,
        data: result.data as PersistedCacheData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private async rotateBackups(): Promise<void> {
    const basePath = this.getFilePath();

    // 古いバックアップを削除
    for (let i = this.maxBackups; i >= 1; i--) {
      const oldPath = i === 1 ? basePath : `${basePath}.bak${i - 1}`;
      const newPath = `${basePath}.bak${i}`;

      try {
        if (i === this.maxBackups) {
          // 最古のバックアップは削除
          await unlink(newPath).catch(() => {});
        }
        await readFile(oldPath); // 存在確認
        const content = await readFile(oldPath);
        await writeFile(newPath, content);
      } catch {
        // ファイルが存在しない場合はスキップ
      }
    }
  }
}
