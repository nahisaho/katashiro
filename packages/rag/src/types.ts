/**
 * RAG Package Types
 *
 * @requirement REQ-RAG-001〜006
 * @design DES-KATASHIRO-003-RAG
 */

/**
 * ベクトル（埋め込み）
 */
export type Vector = number[];

/**
 * ドキュメント
 */
export interface Document {
  /** ドキュメントID */
  id: string;
  /** コンテンツ */
  content: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * チャンク
 */
export interface Chunk {
  /** チャンクID */
  id: string;
  /** 元ドキュメントID */
  documentId: string;
  /** チャンクコンテンツ */
  content: string;
  /** メタデータ */
  metadata: Record<string, unknown>;
}

/**
 * 検索結果
 */
export interface SearchResult {
  /** チャンク */
  chunk: Chunk;
  /** スコア（類似度） */
  score: number;
}

/**
 * 検索取得結果（リランキング用）
 */
export interface RetrievalResult {
  /** コンテンツ */
  content: string;
  /** スコア（類似度） */
  score: number;
  /** メタデータ */
  metadata?: Record<string, unknown>;
  /** ソース（元のチャンクIDなど） */
  source?: string;
}

/**
 * Embeddingプロバイダーインターフェース
 */
export interface EmbeddingProvider {
  /** プロバイダー名 */
  readonly name: string;
  /** ベクトル次元数 */
  readonly dimensions: number;

  /**
   * 単一テキストの埋め込み生成
   */
  embed(text: string): Promise<Vector>;

  /**
   * バッチ埋め込み生成
   */
  embedBatch(texts: string[]): Promise<Vector[]>;
}

/**
 * VectorStoreインターフェース
 */
export interface VectorStore {
  /** ストア名 */
  readonly name: string;

  /**
   * チャンクとベクトルの追加
   */
  add(chunk: Chunk, vector: Vector): Promise<void>;

  /**
   * バッチ追加
   */
  addBatch(items: Array<{ chunk: Chunk; vector: Vector }>): Promise<void>;

  /**
   * 類似検索
   */
  search(queryVector: Vector, topK: number): Promise<SearchResult[]>;

  /**
   * 削除
   */
  delete(chunkId: string): Promise<boolean>;
}

/**
 * チャンク分割設定
 */
export interface ChunkingConfig {
  /** 分割戦略 */
  strategy?: 'fixed' | 'sentence' | 'paragraph';
  /** チャンクサイズ（文字数） */
  chunkSize?: number;
  /** オーバーラップサイズ */
  chunkOverlap?: number;
  /** セパレータ */
  separators?: string[];
}

/**
 * Retriever設定
 */
export interface RetrieverConfig {
  /** デフォルトのtopK */
  topK?: number;
  /** 最小スコア */
  minScore?: number;
}

/**
 * RAGエンジン設定
 */
export interface RAGEngineConfig {
  /** Chunking設定 */
  chunking?: ChunkingConfig;
  /** Retriever設定 */
  retriever?: RetrieverConfig;
}

/**
 * Embeddingプロバイダー設定
 */
export interface EmbeddingConfig {
  /** バッチサイズ */
  batchSize?: number;
  /** ベクトル次元数 */
  dimensions?: number;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 最大リトライ回数 */
  maxRetries?: number;
}
