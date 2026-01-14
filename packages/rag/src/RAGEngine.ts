/**
 * RAG Engine - RAGシステムのファサード
 *
 * @requirement REQ-RAG-005
 * @design DES-KATASHIRO-003-RAG §3.5
 */

import { DocumentChunker } from './chunking/DocumentChunker.js';
import { Retriever } from './Retriever.js';
import type {
  Chunk,
  ChunkingConfig,
  Document,
  EmbeddingProvider,
  RAGEngineConfig,
  RetrieverConfig,
  SearchResult,
  VectorStore,
} from './types.js';

/**
 * RAGエンジン
 * ドキュメント処理、インデックス作成、検索を統合したファサード
 */
export class RAGEngine {
  private chunker: DocumentChunker;
  private retriever: Retriever;

  constructor(
    embeddingProvider: EmbeddingProvider,
    vectorStore: VectorStore,
    config: RAGEngineConfig = {},
  ) {
    this.chunker = new DocumentChunker(config.chunking);
    this.retriever = new Retriever(embeddingProvider, vectorStore, config.retriever);
  }

  /**
   * ドキュメントをインデックスに追加
   * チャンキング、埋め込み生成、インデックス追加を一括実行
   */
  async ingest(document: Document): Promise<Chunk[]> {
    const chunks = this.chunker.chunk(document);
    await this.retriever.addDocument(document, chunks);
    return chunks;
  }

  /**
   * 複数ドキュメントをバッチでインデックスに追加
   */
  async ingestBatch(documents: Document[]): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];

    for (const document of documents) {
      const chunks = this.chunker.chunk(document);
      allChunks.push(...chunks);
      await this.retriever.addDocument(document, chunks);
    }

    return allChunks;
  }

  /**
   * クエリで関連チャンクを検索
   */
  async query(query: string): Promise<SearchResult[]> {
    return this.retriever.search(query);
  }

  /**
   * 複数クエリで検索
   */
  async queryMultiple(queries: string[]): Promise<SearchResult[]> {
    return this.retriever.searchMultiple(queries);
  }

  /**
   * チャンクを削除
   */
  async deleteChunk(chunkId: string): Promise<boolean> {
    return this.retriever.deleteChunk(chunkId);
  }

  /**
   * ドキュメントの全チャンクを削除
   */
  async deleteDocument(documentId: string, chunkCount: number): Promise<number> {
    let deleted = 0;

    for (let i = 0; i < chunkCount; i++) {
      const chunkId = `${documentId}_chunk_${i}`;
      if (await this.retriever.deleteChunk(chunkId)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * チャンキング設定を更新して新しいチャンカーを作成
   */
  updateChunkingConfig(config: ChunkingConfig): void {
    this.chunker = new DocumentChunker(config);
  }

  /**
   * 検索設定を更新
   */
  updateRetrieverConfig(config: Partial<RetrieverConfig>): void {
    this.retriever.updateConfig(config);
  }

  /**
   * ドキュメントをチャンキングのみ実行（インデックス追加なし）
   */
  chunk(document: Document): Chunk[] {
    return this.chunker.chunk(document);
  }

  /**
   * 複数ドキュメントをチャンキングのみ実行
   */
  chunkBatch(documents: Document[]): Chunk[] {
    return this.chunker.chunkBatch(documents);
  }
}
