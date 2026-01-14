/**
 * RAG Package - Main Entry Point
 *
 * @packageDocumentation
 * @module @nahisaho/katashiro-rag
 */

// Types
export type {
  Document,
  Chunk,
  SearchResult,
  RetrievalResult,
  Vector,
  EmbeddingProvider,
  VectorStore,
  ChunkingConfig,
  RetrieverConfig,
  RAGEngineConfig,
} from './types.js';

// Embedding
export { EmbeddingManager } from './embedding/index.js';
export { MockEmbeddingProvider } from './embedding/index.js';
export type { MockEmbeddingProviderConfig } from './embedding/index.js';

// Vector Store
export { InMemoryVectorStore } from './vectordb/index.js';
export type { InMemoryVectorStoreConfig } from './vectordb/index.js';

// Chunking
export { DocumentChunker } from './chunking/index.js';

// Retriever
export { Retriever } from './Retriever.js';

// RAG Engine
export { RAGEngine } from './RAGEngine.js';

// RAG Pipeline (REQ-RAG-101)
export { RAGPipeline, DEFAULT_RAG_SYSTEM_PROMPT, DEFAULT_CONTEXT_TEMPLATE } from './RAGPipeline.js';
export type { RAGPipelineConfig, RAGPipelineResult, RAGQueryOptions } from './RAGPipeline.js';

// Reranking (REQ-RAG-103)
export {
  LLMReranker,
  rerankResults,
  DEFAULT_RERANKER_CONFIG,
  DEFAULT_RERANKER_PROMPT,
} from './reranking/index.js';
export type {
  LLMRerankerConfig,
  RerankedResult,
  RerankerResponse,
} from './reranking/index.js';
