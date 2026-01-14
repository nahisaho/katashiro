/**
 * Retriever - 検索エンジン
 *
 * @requirement REQ-RAG-004
 * @design DES-KATASHIRO-003-RAG §3.4
 */

import { EmbeddingManager } from './embedding/EmbeddingManager.js';
import type { Chunk, Document, EmbeddingProvider, RetrieverConfig, SearchResult, VectorStore } from './types.js';

/**
 * デフォルト検索設定
 */
const DEFAULT_CONFIG: Required<RetrieverConfig> = {
  topK: 5,
  minScore: 0.5,
};

/**
 * 検索エンジン
 * Embedding生成とVector検索を統合
 */
export class Retriever {
  private embeddingManager: EmbeddingManager;
  private vectorStore: VectorStore;
  private config: Required<RetrieverConfig>;

  constructor(
    embeddingProvider: EmbeddingProvider,
    vectorStore: VectorStore,
    config: RetrieverConfig = {},
  ) {
    this.embeddingManager = new EmbeddingManager(embeddingProvider);
    this.vectorStore = vectorStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ドキュメントをインデックスに追加
   */
  async addDocument(_document: Document, chunks: Chunk[]): Promise<void> {
    const items = await Promise.all(
      chunks.map(async (chunk) => ({
        chunk,
        vector: await this.embeddingManager.embed(chunk.content),
      })),
    );

    await this.vectorStore.addBatch(items);
  }

  /**
   * 複数ドキュメントをバッチでインデックスに追加
   */
  async addDocuments(documents: Array<{ document: Document; chunks: Chunk[] }>): Promise<void> {
    for (const { chunks } of documents) {
      const items = await Promise.all(
        chunks.map(async (chunk) => ({
          chunk,
          vector: await this.embeddingManager.embed(chunk.content),
        })),
      );

      await this.vectorStore.addBatch(items);
    }
  }

  /**
   * クエリで検索
   */
  async search(query: string): Promise<SearchResult[]> {
    const queryVector = await this.embeddingManager.embed(query);
    const results = await this.vectorStore.search(queryVector, this.config.topK);

    // minScoreでフィルタリング
    return results.filter((r) => r.score >= this.config.minScore);
  }

  /**
   * 複数クエリで検索（結果をマージ）
   */
  async searchMultiple(queries: string[]): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    for (const query of queries) {
      const results = await this.search(query);

      for (const result of results) {
        if (!seen.has(result.chunk.id)) {
          seen.add(result.chunk.id);
          allResults.push(result);
        }
      }
    }

    // スコア降順でソートして返却
    return allResults.sort((a, b) => b.score - a.score).slice(0, this.config.topK);
  }

  /**
   * チャンクを削除
   */
  async deleteChunk(chunkId: string): Promise<boolean> {
    return this.vectorStore.delete(chunkId);
  }

  /**
   * 検索設定を取得
   */
  getConfig(): Required<RetrieverConfig> {
    return { ...this.config };
  }

  /**
   * 検索設定を更新
   */
  updateConfig(config: Partial<RetrieverConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
