/**
 * ContentManager - コンテンツ統合マネージャー
 *
 * @requirement REQ-DR-S-001 - チェックポイント保存
 * @requirement REQ-DR-S-003 - キャッシュサイズ管理
 * @requirement REQ-DR-E-005 - キャッシュヒット時の高速応答
 * @design DES-KATASHIRO-005-DR-CONTENT
 * @task TASK-028
 */

import {
  DEFAULT_CONTENT_MANAGER_CONFIG,
  type ContentManagerConfig,
  type ContentEntry,
  type ContentVersion,
  type CacheStats,
  type CheckpointInfo,
  type CheckpointData,
  type ContentDiff,
  type ContentManagerEvent,
  type ContentManagerEventListener,
} from './types.js';
import { ContentCache } from './content-cache.js';
import { VersionControl } from './version-control.js';
import { CheckpointManager, CheckpointError } from './checkpoint-manager.js';

/**
 * ContentManager - コンテンツ管理統合クラス
 */
export class ContentManager {
  private readonly config: ContentManagerConfig;
  private readonly cache: ContentCache;
  private readonly versionControl: VersionControl;
  private readonly checkpointManager: CheckpointManager;
  private readonly listeners: Set<ContentManagerEventListener> = new Set();

  // 処理状態
  private processedUrls: Set<string> = new Set();
  private pendingUrls: Set<string> = new Set();
  private failedUrls: Set<string> = new Set();

  constructor(config?: Partial<ContentManagerConfig>) {
    this.config = { ...DEFAULT_CONTENT_MANAGER_CONFIG, ...config };

    this.cache = new ContentCache(this.config.cache);
    this.versionControl = new VersionControl({
      maxVersionHistory: this.config.maxVersionHistory,
      diffThreshold: this.config.diffThreshold,
    });
    this.checkpointManager = new CheckpointManager(this.config.checkpoint);

    // イベントを転送
    this.cache.addEventListener((event) => this.emit(event));
    this.checkpointManager.addEventListener((event) => this.emit(event));
  }

  // ==================== キャッシュ操作 ====================

  /**
   * コンテンツを取得（キャッシュから）
   */
  public get(url: string): ContentEntry | undefined {
    return this.cache.get(url);
  }

  /**
   * コンテンツを設定
   */
  public set(
    url: string,
    content: string,
    options?: {
      contentType?: string;
      statusCode?: number;
      headers?: Record<string, string>;
      source?: string;
      ttlMs?: number;
      metadata?: Record<string, unknown>;
    }
  ): ContentEntry {
    const existingEntry = this.cache.get(url);

    if (existingEntry && this.config.enableDiffDetection) {
      // 既存エントリがある場合は差分チェック
      const { entry, diff, versionCreated } = this.versionControl.updateEntry(existingEntry, content, {
        statusCode: options?.statusCode,
        headers: options?.headers,
        source: options?.source,
      });

      if (versionCreated) {
        this.emit({
          type: 'version:created',
          timestamp: new Date().toISOString(),
          url,
        });
      }

      if (diff.hasChanges) {
        this.emit({
          type: 'content:changed',
          timestamp: new Date().toISOString(),
          url,
          metadata: { diff },
        });
      }

      this.cache.set(entry, { ttlMs: options?.ttlMs });
      this.markProcessed(url);
      return entry;
    }

    // 新規エントリを作成
    const version = this.versionControl.createVersion(content, {
      statusCode: options?.statusCode,
      headers: options?.headers,
      source: options?.source,
    });

    const entry: ContentEntry = {
      url,
      content,
      contentType: options?.contentType ?? 'text/html',
      status: 'success',
      currentVersion: version,
      versions: [],
      lastAccessedAt: new Date().toISOString(),
      accessCount: 1,
      metadata: options?.metadata,
    };

    this.cache.set(entry, { ttlMs: options?.ttlMs });
    this.markProcessed(url);

    return entry;
  }

  /**
   * キャッシュにコンテンツが存在するか確認
   */
  public has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * コンテンツを削除
   */
  public delete(url: string): boolean {
    return this.cache.delete(url);
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  public getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * 期限切れエントリを削除
   */
  public purgeExpired(): number {
    return this.cache.purgeExpired();
  }

  // ==================== バージョン管理 ====================

  /**
   * コンテンツのハッシュを計算
   */
  public calculateHash(content: string): string {
    return this.versionControl.calculateHash(content);
  }

  /**
   * 差分を計算
   */
  public calculateDiff(oldContent: string, newContent: string): ContentDiff {
    return this.versionControl.calculateDiff(oldContent, newContent);
  }

  /**
   * バージョン履歴を取得
   */
  public getVersionHistory(url: string): ContentVersion[] {
    const entry = this.cache.get(url);
    if (!entry) {
      return [];
    }
    return this.versionControl.getVersionHistory(entry);
  }

  // ==================== チェックポイント管理 ====================

  /**
   * チェックポイントを保存
   */
  public async saveCheckpoint(metadata?: Record<string, unknown>): Promise<CheckpointInfo> {
    const data = this.checkpointManager.createCheckpointData(this.cache.entries(), this.getProcessingState(), metadata);

    return this.checkpointManager.save(data);
  }

  /**
   * チェックポイントから復元
   */
  public async loadCheckpoint(idOrPath: string): Promise<void> {
    const data = await this.checkpointManager.load(idOrPath);
    await this.restoreFromCheckpoint(data);
  }

  /**
   * 最新のチェックポイントから復元
   */
  public async loadLatestCheckpoint(): Promise<boolean> {
    const data = await this.checkpointManager.loadLatest();
    if (!data) {
      return false;
    }
    await this.restoreFromCheckpoint(data);
    return true;
  }

  /**
   * チェックポイント一覧を取得
   */
  public async listCheckpoints(): Promise<CheckpointInfo[]> {
    return this.checkpointManager.list();
  }

  /**
   * 自動チェックポイントを開始
   */
  public startAutoCheckpoint(): void {
    this.checkpointManager.startAutoSave(() =>
      this.checkpointManager.createCheckpointData(this.cache.entries(), this.getProcessingState())
    );
  }

  /**
   * 自動チェックポイントを停止
   */
  public stopAutoCheckpoint(): void {
    this.checkpointManager.stopAutoSave();
  }

  // ==================== 処理状態管理 ====================

  /**
   * URLを処理対象に追加
   */
  public addPending(url: string): void {
    if (!this.processedUrls.has(url) && !this.failedUrls.has(url)) {
      this.pendingUrls.add(url);
    }
  }

  /**
   * 複数のURLを処理対象に追加
   */
  public addPendingBatch(urls: string[]): void {
    for (const url of urls) {
      this.addPending(url);
    }
  }

  /**
   * URLを処理済みとしてマーク
   */
  public markProcessed(url: string): void {
    this.pendingUrls.delete(url);
    this.failedUrls.delete(url);
    this.processedUrls.add(url);
  }

  /**
   * URLを失敗としてマーク
   */
  public markFailed(url: string): void {
    this.pendingUrls.delete(url);
    this.processedUrls.delete(url);
    this.failedUrls.add(url);
  }

  /**
   * 処理状態を取得
   */
  public getProcessingState(): CheckpointData['processingState'] {
    const total = this.processedUrls.size + this.pendingUrls.size + this.failedUrls.size;
    return {
      processedUrls: Array.from(this.processedUrls),
      pendingUrls: Array.from(this.pendingUrls),
      failedUrls: Array.from(this.failedUrls),
      progress: total > 0 ? this.processedUrls.size / total : 0,
    };
  }

  /**
   * 処理状態をリセット
   */
  public resetProcessingState(): void {
    this.processedUrls.clear();
    this.pendingUrls.clear();
    this.failedUrls.clear();
  }

  // ==================== イベント管理 ====================

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

  // ==================== プライベートメソッド ====================

  /**
   * チェックポイントからの復元
   */
  private async restoreFromCheckpoint(data: CheckpointData): Promise<void> {
    // キャッシュをクリアして復元
    this.cache.clear();

    for (const entry of data.entries) {
      this.cache.set(entry);
    }

    // 処理状態を復元
    this.processedUrls = new Set(data.processingState.processedUrls);
    this.pendingUrls = new Set(data.processingState.pendingUrls);
    this.failedUrls = new Set(data.processingState.failedUrls);
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

// CheckpointErrorを再エクスポート
export { CheckpointError };
