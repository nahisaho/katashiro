/**
 * File-based Vector Store
 *
 * @requirement REQ-RAG-102
 * @design DES-KATASHIRO-003-RAG §3.3
 */

import type { Chunk, SearchResult, Vector, VectorStore } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * FileVectorStoreの設定
 */
export interface FileVectorStoreConfig {
  /** 保存先ファイルパス */
  filePath: string;
  /** 類似度しきい値（デフォルト: 0.7） */
  similarityThreshold?: number;
  /** 自動保存（デフォルト: true） */
  autoSave?: boolean;
  /** 保存間隔（ミリ秒、デフォルト: 1000） */
  saveIntervalMs?: number;
}

/**
 * 格納されたベクトルエントリ
 */
interface StoredEntry {
  chunk: Chunk;
  vector: Vector;
}

/**
 * ファイル保存用データ構造
 */
interface PersistedData {
  version: string;
  createdAt: string;
  updatedAt: string;
  entries: Array<{
    chunkId: string;
    chunk: Chunk;
    vector: Vector;
  }>;
}

/**
 * ファイルベースのベクトルストア
 * データをJSONファイルに永続化
 */
export class FileVectorStore implements VectorStore {
  readonly name = 'file';

  private entries: Map<string, StoredEntry> = new Map();
  private filePath: string;
  private similarityThreshold: number;
  private autoSave: boolean;
  private saveIntervalMs: number;
  private isDirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private createdAt: string;
  private isInitialized = false;

  constructor(config: FileVectorStoreConfig) {
    this.filePath = path.resolve(config.filePath);
    this.similarityThreshold = config.similarityThreshold ?? 0.7;
    this.autoSave = config.autoSave ?? true;
    this.saveIntervalMs = config.saveIntervalMs ?? 1000;
    this.createdAt = new Date().toISOString();
  }

  /**
   * 格納エントリ数を取得
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * ストアを初期化（ファイルから読み込み）
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (fs.existsSync(this.filePath)) {
      try {
        const data = await fs.promises.readFile(this.filePath, 'utf-8');
        const parsed = JSON.parse(data) as PersistedData;

        // データを読み込み
        for (const entry of parsed.entries) {
          this.entries.set(entry.chunkId, {
            chunk: entry.chunk,
            vector: entry.vector,
          });
        }

        if (parsed.createdAt) {
          this.createdAt = parsed.createdAt;
        }
      } catch (error) {
        // ファイルが壊れている場合は空で開始
        console.warn(`Failed to load vector store from ${this.filePath}:`, error);
        this.entries.clear();
      }
    }

    this.isInitialized = true;
  }

  async add(chunk: Chunk, vector: Vector): Promise<void> {
    await this.ensureInitialized();
    this.entries.set(chunk.id, { chunk, vector });
    this.markDirty();
  }

  async addBatch(items: Array<{ chunk: Chunk; vector: Vector }>): Promise<void> {
    await this.ensureInitialized();
    for (const item of items) {
      this.entries.set(item.chunk.id, { chunk: item.chunk, vector: item.vector });
    }
    this.markDirty();
  }

  async search(vector: Vector, topK: number): Promise<SearchResult[]> {
    await this.ensureInitialized();
    const results: Array<{ entry: StoredEntry; similarity: number }> = [];

    for (const entry of this.entries.values()) {
      const similarity = this.cosineSimilarity(vector, entry.vector);

      if (similarity >= this.similarityThreshold) {
        results.push({ entry, similarity });
      }
    }

    // スコア降順でソート
    results.sort((a, b) => b.similarity - a.similarity);

    // topKに制限
    return results.slice(0, topK).map(({ entry, similarity }) => ({
      chunk: entry.chunk,
      score: similarity,
    }));
  }

  async delete(chunkId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = this.entries.delete(chunkId);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  /**
   * ストアをクリア
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.entries.clear();
    this.markDirty();
  }

  /**
   * 指定IDのチャンクが存在するか確認
   */
  async has(chunkId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.entries.has(chunkId);
  }

  /**
   * 即座にファイルに保存
   */
  async save(): Promise<void> {
    await this.ensureInitialized();

    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    const data: PersistedData = {
      version: '1.0.0',
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      entries: Array.from(this.entries.entries()).map(([chunkId, entry]) => ({
        chunkId,
        chunk: entry.chunk,
        vector: entry.vector,
      })),
    };

    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.isDirty = false;
  }

  /**
   * 未保存の変更があるか確認
   */
  get dirty(): boolean {
    return this.isDirty;
  }

  /**
   * ストアを閉じる（保留中の保存を実行）
   */
  async close(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.isDirty) {
      await this.save();
    }
  }

  /**
   * ファイルパスを取得
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * 初期化を確認
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * 変更をマーク
   */
  private markDirty(): void {
    this.isDirty = true;

    if (this.autoSave) {
      this.scheduleSave();
    }
  }

  /**
   * 保存をスケジュール
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.save().catch((err) => {
        console.error('Failed to auto-save vector store:', err);
      });
    }, this.saveIntervalMs);
  }

  /**
   * コサイン類似度を計算
   */
  private cosineSimilarity(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}
