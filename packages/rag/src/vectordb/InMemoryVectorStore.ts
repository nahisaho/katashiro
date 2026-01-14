/**
 * In-Memory Vector Store
 *
 * @requirement REQ-RAG-002
 * @design DES-KATASHIRO-003-RAG §3.2
 */

import type { Chunk, SearchResult, Vector, VectorStore } from '../types.js';

/**
 * インメモリベクトルストアの設定
 */
export interface InMemoryVectorStoreConfig {
  /** 類似度しきい値（デフォルト: 0.7） */
  similarityThreshold?: number;
}

/**
 * 格納されたベクトルエントリ
 */
interface StoredEntry {
  chunk: Chunk;
  vector: Vector;
}

/**
 * インメモリベクトルストア
 * テスト用およびプロトタイピング用
 */
export class InMemoryVectorStore implements VectorStore {
  readonly name = 'in-memory';

  private entries: Map<string, StoredEntry> = new Map();
  private similarityThreshold: number;

  constructor(config: InMemoryVectorStoreConfig = {}) {
    this.similarityThreshold = config.similarityThreshold ?? 0.7;
  }

  /**
   * 格納エントリ数を取得
   */
  get size(): number {
    return this.entries.size;
  }

  async add(chunk: Chunk, vector: Vector): Promise<void> {
    this.entries.set(chunk.id, { chunk, vector });
  }

  async addBatch(items: Array<{ chunk: Chunk; vector: Vector }>): Promise<void> {
    for (const item of items) {
      this.entries.set(item.chunk.id, { chunk: item.chunk, vector: item.vector });
    }
  }

  async search(vector: Vector, topK: number): Promise<SearchResult[]> {
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
    return this.entries.delete(chunkId);
  }

  /**
   * ストアをクリア
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * 指定IDのチャンクが存在するか確認
   */
  has(chunkId: string): boolean {
    return this.entries.has(chunkId);
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
