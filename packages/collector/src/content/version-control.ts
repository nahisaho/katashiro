/**
 * VersionControl - コンテンツバージョン管理・差分検出
 *
 * @requirement REQ-DR-S-001 - チェックポイント保存
 * @design DES-KATASHIRO-005-DR-CONTENT §2.2
 * @task TASK-026
 */

import { createHash } from 'crypto';
import type { ContentVersion, ContentEntry, ContentDiff } from './types.js';

/**
 * バージョン管理クラス
 */
export class VersionControl {
  private readonly maxVersionHistory: number;
  private readonly diffThreshold: number;

  constructor(options?: { maxVersionHistory?: number; diffThreshold?: number }) {
    this.maxVersionHistory = options?.maxVersionHistory ?? 5;
    this.diffThreshold = options?.diffThreshold ?? 0.1;
  }

  /**
   * コンテンツのハッシュを計算
   */
  public calculateHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * 新しいバージョンを作成
   */
  public createVersion(
    content: string,
    options?: {
      statusCode?: number;
      headers?: Record<string, string>;
      source?: string;
    }
  ): ContentVersion {
    const now = new Date().toISOString();
    const hash = this.calculateHash(content);

    return {
      versionId: `v-${Date.now()}-${hash.slice(0, 8)}`,
      hash,
      fetchedAt: now,
      size: Buffer.byteLength(content, 'utf8'),
      statusCode: options?.statusCode,
      headers: options?.headers,
      source: options?.source,
    };
  }

  /**
   * コンテンツが変更されたかチェック
   */
  public hasChanged(oldContent: string, newContent: string): boolean {
    return this.calculateHash(oldContent) !== this.calculateHash(newContent);
  }

  /**
   * 差分を計算
   */
  public calculateDiff(oldContent: string, newContent: string): ContentDiff {
    if (oldContent === newContent) {
      return {
        hasChanges: false,
        changeRatio: 0,
        addedChars: 0,
        removedChars: 0,
        changeType: 'none',
      };
    }

    // 簡易的な差分計算（Levenshtein距離の概算）
    const oldLen = oldContent.length;
    const newLen = newContent.length;
    const maxLen = Math.max(oldLen, newLen);

    if (maxLen === 0) {
      return {
        hasChanges: false,
        changeRatio: 0,
        addedChars: 0,
        removedChars: 0,
        changeType: 'none',
      };
    }

    // 行単位での差分計算
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    let addedChars = 0;
    let removedChars = 0;

    // 追加された行
    for (const line of newLines) {
      if (!oldSet.has(line)) {
        addedChars += line.length;
      }
    }

    // 削除された行
    for (const line of oldLines) {
      if (!newSet.has(line)) {
        removedChars += line.length;
      }
    }

    const changeRatio = (addedChars + removedChars) / (2 * maxLen);

    let changeType: ContentDiff['changeType'];
    if (changeRatio === 0) {
      changeType = 'none';
    } else if (changeRatio < 0.1) {
      changeType = 'minor';
    } else if (changeRatio < 0.5) {
      changeType = 'major';
    } else {
      changeType = 'complete';
    }

    return {
      hasChanges: true,
      changeRatio,
      addedChars,
      removedChars,
      changeType,
    };
  }

  /**
   * バージョン変更が閾値を超えているかチェック
   */
  public isSignificantChange(diff: ContentDiff): boolean {
    return diff.changeRatio >= this.diffThreshold;
  }

  /**
   * エントリにバージョンを追加
   */
  public addVersion(entry: ContentEntry, newVersion: ContentVersion): ContentEntry {
    const versions = [entry.currentVersion, ...entry.versions];

    // 履歴数を制限
    const trimmedVersions = versions.slice(0, this.maxVersionHistory);

    return {
      ...entry,
      currentVersion: newVersion,
      versions: trimmedVersions,
    };
  }

  /**
   * エントリを更新（変更があれば新バージョン作成）
   */
  public updateEntry(
    entry: ContentEntry,
    newContent: string,
    options?: {
      statusCode?: number;
      headers?: Record<string, string>;
      source?: string;
      forceNewVersion?: boolean;
    }
  ): { entry: ContentEntry; diff: ContentDiff; versionCreated: boolean } {
    const diff = this.calculateDiff(entry.content, newContent);

    // 変更なし、または閾値未満の場合
    if (!options?.forceNewVersion && !this.isSignificantChange(diff)) {
      return {
        entry: {
          ...entry,
          lastAccessedAt: new Date().toISOString(),
          accessCount: entry.accessCount + 1,
        },
        diff,
        versionCreated: false,
      };
    }

    // 新バージョンを作成
    const newVersion = this.createVersion(newContent, options);
    const updatedEntry = this.addVersion(
      {
        ...entry,
        content: newContent,
        status: 'success',
        lastAccessedAt: new Date().toISOString(),
        accessCount: entry.accessCount + 1,
      },
      newVersion
    );

    return {
      entry: updatedEntry,
      diff,
      versionCreated: true,
    };
  }

  /**
   * 特定のバージョンに戻す（復元機能）
   */
  public getVersionInfo(entry: ContentEntry, versionId: string): ContentVersion | undefined {
    if (entry.currentVersion.versionId === versionId) {
      return entry.currentVersion;
    }
    return entry.versions.find((v) => v.versionId === versionId);
  }

  /**
   * バージョン間の差分を取得
   */
  public getVersionHistory(entry: ContentEntry): ContentVersion[] {
    return [entry.currentVersion, ...entry.versions];
  }
}
