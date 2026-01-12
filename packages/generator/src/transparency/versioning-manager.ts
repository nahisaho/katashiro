/**
 * VersioningManager
 * ドキュメントのバージョン管理と変更履歴追跡
 *
 * @module transparency/versioning-manager
 * @requirement Phase 2 - 透明性機能
 */

import type {
  Version,
  VersionDiff,
  VersionHistory,
  ContributorType,
} from './types.js';

/** バージョン作成オプション */
export interface CreateVersionOptions {
  /** 変更サマリ */
  changeSummary: string;
  /** 変更者情報 */
  author: {
    type: ContributorType;
    name: string;
    aiModel?: string;
  };
  /** 変更タイプ */
  changeType?: 'create' | 'update' | 'delete' | 'merge';
  /** タグ */
  tags?: string[];
}

/** 差分計算オプション */
export interface DiffOptions {
  /** 空白を無視 */
  ignoreWhitespace?: boolean;
  /** 大文字小文字を無視 */
  ignoreCase?: boolean;
}

/**
 * VersioningManager
 * ドキュメントのバージョン管理を行うクラス
 */
export class VersioningManager {
  private histories: Map<string, VersionHistory> = new Map();
  private versionCounter: number = 0;

  /**
   * 新しいドキュメントのバージョン履歴を初期化
   */
  initializeHistory(documentId: string, initialContent: string, options: CreateVersionOptions): VersionHistory {
    const now = new Date();
    const versionId = this.generateVersionId();

    const initialVersion: Version = {
      id: versionId,
      version: '1.0.0',
      content: initialContent,
      changeSummary: options.changeSummary || 'Initial version',
      author: options.author,
      changeType: 'create',
      createdAt: now,
      tags: options.tags,
    };

    const history: VersionHistory = {
      documentId,
      currentVersion: '1.0.0',
      versions: [initialVersion],
      totalVersions: 1,
      firstVersionAt: now,
      lastVersionAt: now,
    };

    this.histories.set(documentId, history);
    return history;
  }

  /**
   * 新しいバージョンを作成
   */
  createVersion(
    documentId: string,
    newContent: string,
    options: CreateVersionOptions
  ): Version {
    const history = this.histories.get(documentId);
    if (!history) {
      throw new Error(`No history found for document: ${documentId}`);
    }

    const currentVersion = this.getCurrentVersion(documentId);
    if (!currentVersion) {
      throw new Error(`No current version found for document: ${documentId}`);
    }

    // 差分を計算
    const diff = this.calculateDiff(currentVersion.content, newContent);

    // 新バージョン番号を計算
    const newVersionNumber = this.incrementVersion(
      history.currentVersion,
      options.changeType || 'update'
    );

    const versionId = this.generateVersionId();
    const now = new Date();

    const newVersion: Version = {
      id: versionId,
      version: newVersionNumber,
      parentId: currentVersion.id,
      content: newContent,
      changeSummary: options.changeSummary,
      author: options.author,
      changeType: options.changeType || 'update',
      diff,
      createdAt: now,
      tags: options.tags,
    };

    history.versions.push(newVersion);
    history.currentVersion = newVersionNumber;
    history.totalVersions = history.versions.length;
    history.lastVersionAt = now;

    return newVersion;
  }

  /**
   * 現在のバージョンを取得
   */
  getCurrentVersion(documentId: string): Version | null {
    const history = this.histories.get(documentId);
    if (!history) {
      return null;
    }

    return history.versions.find(v => v.version === history.currentVersion) || null;
  }

  /**
   * 特定バージョンを取得
   */
  getVersion(documentId: string, versionNumber: string): Version | null {
    const history = this.histories.get(documentId);
    if (!history) {
      return null;
    }

    return history.versions.find(v => v.version === versionNumber) || null;
  }

  /**
   * バージョンIDで取得
   */
  getVersionById(documentId: string, versionId: string): Version | null {
    const history = this.histories.get(documentId);
    if (!history) {
      return null;
    }

    return history.versions.find(v => v.id === versionId) || null;
  }

  /**
   * バージョン履歴を取得
   */
  getHistory(documentId: string): VersionHistory | null {
    return this.histories.get(documentId) || null;
  }

  /**
   * 全バージョンリストを取得
   */
  listVersions(documentId: string): Version[] {
    const history = this.histories.get(documentId);
    if (!history) {
      return [];
    }

    return [...history.versions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * 2つのバージョン間の差分を取得
   */
  getDiff(documentId: string, fromVersion: string, toVersion: string, options?: DiffOptions): VersionDiff | null {
    const from = this.getVersion(documentId, fromVersion);
    const to = this.getVersion(documentId, toVersion);

    if (!from || !to) {
      return null;
    }

    return this.calculateDiff(from.content, to.content, options);
  }

  /**
   * 差分を計算
   */
  calculateDiff(oldContent: string, newContent: string, options?: DiffOptions): VersionDiff {
    const opts = {
      ignoreWhitespace: false,
      ignoreCase: false,
      ...options,
    };

    let old = oldContent;
    let newC = newContent;

    if (opts.ignoreWhitespace) {
      old = old.replace(/\s+/g, ' ').trim();
      newC = newC.replace(/\s+/g, ' ').trim();
    }

    if (opts.ignoreCase) {
      old = old.toLowerCase();
      newC = newC.toLowerCase();
    }

    const oldLines = old.split('\n');
    const newLines = newC.split('\n');

    const changes: VersionDiff['changes'] = [];
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    // シンプルな行ベース差分アルゴリズム
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        // 新規追加行
        additions++;
        changes.push({
          type: 'add',
          line: i + 1,
          newContent: newLine,
        });
      } else if (oldLine !== undefined && newLine === undefined) {
        // 削除行
        deletions++;
        changes.push({
          type: 'delete',
          line: i + 1,
          oldContent: oldLine,
        });
      } else if (oldLine !== newLine) {
        // 変更行
        modifications++;
        changes.push({
          type: 'modify',
          line: i + 1,
          oldContent: oldLine,
          newContent: newLine,
        });
      }
    }

    return {
      additions,
      deletions,
      modifications,
      changes,
    };
  }

  /**
   * 特定のバージョンに戻す
   */
  revertTo(documentId: string, targetVersion: string, author: CreateVersionOptions['author']): Version {
    const target = this.getVersion(documentId, targetVersion);
    if (!target) {
      throw new Error(`Version not found: ${targetVersion}`);
    }

    return this.createVersion(documentId, target.content, {
      changeSummary: `Reverted to version ${targetVersion}`,
      author,
      changeType: 'update',
      tags: ['revert'],
    });
  }

  /**
   * バージョンにタグを追加
   */
  addTag(documentId: string, versionNumber: string, tag: string): void {
    const history = this.histories.get(documentId);
    if (!history) {
      throw new Error(`No history found for document: ${documentId}`);
    }

    const version = history.versions.find(v => v.version === versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    if (!version.tags) {
      version.tags = [];
    }

    if (!version.tags.includes(tag)) {
      version.tags.push(tag);
    }
  }

  /**
   * タグでバージョンを検索
   */
  findByTag(documentId: string, tag: string): Version[] {
    const history = this.histories.get(documentId);
    if (!history) {
      return [];
    }

    return history.versions.filter(v => v.tags?.includes(tag));
  }

  /**
   * 著者でバージョンをフィルタ
   */
  findByAuthor(documentId: string, authorName: string): Version[] {
    const history = this.histories.get(documentId);
    if (!history) {
      return [];
    }

    return history.versions.filter(v => v.author.name === authorName);
  }

  /**
   * 期間でバージョンをフィルタ
   */
  findByDateRange(documentId: string, start: Date, end: Date): Version[] {
    const history = this.histories.get(documentId);
    if (!history) {
      return [];
    }

    return history.versions.filter(v => {
      const createdAt = new Date(v.createdAt);
      return createdAt >= start && createdAt <= end;
    });
  }

  /**
   * バージョン番号をインクリメント
   */
  private incrementVersion(
    current: string,
    changeType: 'create' | 'update' | 'delete' | 'merge'
  ): string {
    const parts = current.split('.').map(Number);
    if (parts.length !== 3) {
      return '1.0.0';
    }

    const major = parts[0] ?? 1;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;

    switch (changeType) {
      case 'create':
      case 'merge':
        // メジャーバージョンアップ
        return `${major + 1}.0.0`;
      case 'delete':
        // マイナーバージョンアップ
        return `${major}.${minor + 1}.0`;
      case 'update':
      default:
        // パッチバージョンアップ
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * バージョンIDを生成
   */
  private generateVersionId(): string {
    this.versionCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.versionCounter.toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 6);
    return `v-${timestamp}-${counter}-${random}`;
  }

  /**
   * バージョン履歴の統計を取得
   */
  getStatistics(documentId: string): {
    totalVersions: number;
    aiVersions: number;
    humanVersions: number;
    mixedVersions: number;
    totalAdditions: number;
    totalDeletions: number;
    totalModifications: number;
    averageChangeSize: number;
  } | null {
    const history = this.histories.get(documentId);
    if (!history) {
      return null;
    }

    let aiVersions = 0;
    let humanVersions = 0;
    let mixedVersions = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalModifications = 0;

    for (const version of history.versions) {
      switch (version.author.type) {
        case 'ai':
          aiVersions++;
          break;
        case 'human':
          humanVersions++;
          break;
        case 'mixed':
          mixedVersions++;
          break;
      }

      if (version.diff) {
        totalAdditions += version.diff.additions;
        totalDeletions += version.diff.deletions;
        totalModifications += version.diff.modifications;
      }
    }

    const versionsWithDiff = history.versions.filter(v => v.diff).length;
    const averageChangeSize = versionsWithDiff > 0
      ? Math.round((totalAdditions + totalDeletions + totalModifications) / versionsWithDiff)
      : 0;

    return {
      totalVersions: history.totalVersions,
      aiVersions,
      humanVersions,
      mixedVersions,
      totalAdditions,
      totalDeletions,
      totalModifications,
      averageChangeSize,
    };
  }

  /**
   * 履歴をエクスポート
   */
  exportHistory(documentId: string): string | null {
    const history = this.histories.get(documentId);
    if (!history) {
      return null;
    }

    return JSON.stringify(history, null, 2);
  }

  /**
   * 履歴をインポート
   */
  importHistory(json: string): VersionHistory {
    const history = JSON.parse(json) as VersionHistory;
    
    // 日付を復元
    history.firstVersionAt = new Date(history.firstVersionAt);
    history.lastVersionAt = new Date(history.lastVersionAt);
    history.versions.forEach(v => {
      v.createdAt = new Date(v.createdAt);
    });

    this.histories.set(history.documentId, history);
    return history;
  }

  /**
   * 履歴を削除
   */
  deleteHistory(documentId: string): boolean {
    return this.histories.delete(documentId);
  }

  /**
   * 全履歴をクリア
   */
  clearAll(): void {
    this.histories.clear();
    this.versionCounter = 0;
  }
}
