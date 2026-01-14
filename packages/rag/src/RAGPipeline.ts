/**
 * RAG Pipeline - End-to-End RAG処理パイプライン
 *
 * 検索→コンテキスト構築→回答生成を統合したパイプライン
 *
 * @requirement REQ-RAG-101
 * @design DES-KATASHIRO-003-RAG §3.6
 */

import { RAGEngine } from './RAGEngine.js';
import type {
  Document,
  Chunk,
  SearchResult,
  RAGEngineConfig,
  EmbeddingProvider,
  VectorStore,
} from './types.js';

// LLMProvider型を定義（循環依存を避けるため）
interface LLMProviderLike {
  generate(request: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
}

/**
 * RAGパイプライン設定
 */
export interface RAGPipelineConfig extends RAGEngineConfig {
  /** システムプロンプト */
  systemPrompt?: string;
  /** コンテキストテンプレート */
  contextTemplate?: string;
  /** 最大コンテキスト長（文字数） */
  maxContextLength?: number;
  /** 回答生成温度パラメータ */
  temperature?: number;
  /** 最大回答トークン数 */
  maxAnswerTokens?: number;
  /** デフォルトのtopK */
  defaultTopK?: number;
  /** 検索結果の最小スコア */
  minSearchScore?: number;
  /** ストリーミング有効化 */
  enableStreaming?: boolean;
}

/**
 * RAGパイプライン結果
 */
export interface RAGPipelineResult {
  /** 生成された回答 */
  answer: string;
  /** 使用されたコンテキスト */
  contexts: string[];
  /** 検索されたチャンク */
  retrievedChunks: SearchResult[];
  /** 使用されたクエリ */
  query: string;
  /** トークン使用量 */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * RAGパイプラインオプション（クエリごと）
 */
export interface RAGQueryOptions {
  /** 検索件数 */
  topK?: number;
  /** 最小スコア */
  minScore?: number;
  /** 温度パラメータ */
  temperature?: number;
  /** 追加コンテキスト */
  additionalContext?: string;
  /** システムプロンプトオーバーライド */
  systemPromptOverride?: string;
  /** 会話履歴 */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * デフォルトのシステムプロンプト
 */
export const DEFAULT_RAG_SYSTEM_PROMPT = `あなたは与えられたコンテキスト情報に基づいて質問に回答するアシスタントです。
以下のルールに従ってください:
1. コンテキストに含まれる情報のみを使用して回答してください
2. コンテキストに情報がない場合は、その旨を正直に伝えてください
3. 回答は簡潔かつ正確にしてください
4. 推測や仮定を避け、事実に基づいた回答をしてください`;

/**
 * デフォルトのコンテキストテンプレート
 */
export const DEFAULT_CONTEXT_TEMPLATE = `## 関連情報
{{contexts}}

## 質問
{{query}}

上記の情報に基づいて質問に回答してください。`;

/**
 * RAGパイプライン
 * 検索→コンテキスト構築→回答生成を統合
 */
export class RAGPipeline {
  private ragEngine: RAGEngine;
  private llmProvider: LLMProviderLike;
  private config: Required<Omit<RAGPipelineConfig, keyof RAGEngineConfig>>;
  private ragEngineConfig: RAGEngineConfig;

  constructor(
    embeddingProvider: EmbeddingProvider,
    vectorStore: VectorStore,
    llmProvider: LLMProviderLike,
    config: RAGPipelineConfig = {},
  ) {
    const { systemPrompt, contextTemplate, maxContextLength, temperature, maxAnswerTokens, defaultTopK, minSearchScore, enableStreaming, ...ragEngineConfig } = config;
    
    this.ragEngine = new RAGEngine(embeddingProvider, vectorStore, ragEngineConfig);
    this.llmProvider = llmProvider;
    this.ragEngineConfig = ragEngineConfig;
    
    this.config = {
      systemPrompt: systemPrompt ?? DEFAULT_RAG_SYSTEM_PROMPT,
      contextTemplate: contextTemplate ?? DEFAULT_CONTEXT_TEMPLATE,
      maxContextLength: maxContextLength ?? 8000,
      temperature: temperature ?? 0.3,
      maxAnswerTokens: maxAnswerTokens ?? 2048,
      defaultTopK: defaultTopK ?? 5,
      minSearchScore: minSearchScore ?? 0.3,
      enableStreaming: enableStreaming ?? false,
    };
  }

  /**
   * ドキュメントをインジェスト
   */
  async ingest(document: Document): Promise<Chunk[]> {
    return this.ragEngine.ingest(document);
  }

  /**
   * 複数ドキュメントをバッチインジェスト
   */
  async ingestBatch(documents: Document[]): Promise<Chunk[]> {
    return this.ragEngine.ingestBatch(documents);
  }

  /**
   * RAGクエリを実行（検索→回答生成）
   */
  async query(query: string, options: RAGQueryOptions = {}): Promise<RAGPipelineResult> {
    const startTime = Date.now();

    // 1. 検索
    const topK = options.topK ?? this.config.defaultTopK;
    const minScore = options.minScore ?? this.config.minSearchScore;
    
    this.ragEngine.updateRetrieverConfig({ topK, minScore });
    const searchResults = await this.ragEngine.query(query);

    // 2. コンテキスト構築
    const contexts = this.buildContexts(searchResults);
    const contextText = this.truncateContext(contexts.join('\n\n'));

    // 3. プロンプト構築
    const systemPrompt = options.systemPromptOverride ?? this.config.systemPrompt;
    const userPrompt = this.buildUserPrompt(query, contextText, options.additionalContext);
    
    // 4. メッセージ配列構築
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 会話履歴があれば追加
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      for (const msg of options.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    // 5. 回答生成
    const temperature = options.temperature ?? this.config.temperature;
    const response = await this.llmProvider.generate({
      messages,
      temperature,
      maxTokens: this.config.maxAnswerTokens,
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      answer: response.content,
      contexts,
      retrievedChunks: searchResults,
      query,
      tokenUsage: response.usage,
      processingTimeMs,
      metadata: {
        topK,
        minScore,
        temperature,
        searchResultCount: searchResults.length,
        contextLength: contextText.length,
      },
    };
  }

  /**
   * 会話形式でクエリ（履歴を自動管理）
   */
  async chat(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: Omit<RAGQueryOptions, 'conversationHistory'> = {},
  ): Promise<RAGPipelineResult> {
    return this.query(query, { ...options, conversationHistory });
  }

  /**
   * 検索のみ実行（回答生成なし）
   */
  async search(query: string, topK?: number): Promise<SearchResult[]> {
    if (topK) {
      this.ragEngine.updateRetrieverConfig({ topK });
    }
    return this.ragEngine.query(query);
  }

  /**
   * コンテキストを構築
   */
  private buildContexts(searchResults: SearchResult[]): string[] {
    return searchResults.map((result, index) => {
      const metadata = result.chunk.metadata;
      const source = metadata.source ?? metadata.documentId ?? 'unknown';
      return `[情報源 ${index + 1}] (score: ${result.score.toFixed(2)}, source: ${source})\n${result.chunk.content}`;
    });
  }

  /**
   * ユーザープロンプトを構築
   */
  private buildUserPrompt(query: string, contextText: string, additionalContext?: string): string {
    let prompt = this.config.contextTemplate
      .replace('{{contexts}}', contextText)
      .replace('{{query}}', query);

    if (additionalContext) {
      prompt = `## 追加情報\n${additionalContext}\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * コンテキストを最大長に切り詰め
   */
  private truncateContext(context: string): string {
    if (context.length <= this.config.maxContextLength) {
      return context;
    }

    // 文境界で切り詰め
    const truncated = context.slice(0, this.config.maxContextLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('\n'),
    );

    if (lastSentenceEnd > this.config.maxContextLength * 0.8) {
      return truncated.slice(0, lastSentenceEnd + 1) + '\n[...以下省略...]';
    }

    return truncated + '...\n[...以下省略...]';
  }

  /**
   * チャンクを削除
   */
  async deleteChunk(chunkId: string): Promise<boolean> {
    return this.ragEngine.deleteChunk(chunkId);
  }

  /**
   * ドキュメントを削除
   */
  async deleteDocument(documentId: string, chunkCount: number): Promise<number> {
    return this.ragEngine.deleteDocument(documentId, chunkCount);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RAGPipelineConfig>): void {
    if (config.systemPrompt !== undefined) {
      this.config.systemPrompt = config.systemPrompt;
    }
    if (config.contextTemplate !== undefined) {
      this.config.contextTemplate = config.contextTemplate;
    }
    if (config.maxContextLength !== undefined) {
      this.config.maxContextLength = config.maxContextLength;
    }
    if (config.temperature !== undefined) {
      this.config.temperature = config.temperature;
    }
    if (config.maxAnswerTokens !== undefined) {
      this.config.maxAnswerTokens = config.maxAnswerTokens;
    }
    if (config.defaultTopK !== undefined) {
      this.config.defaultTopK = config.defaultTopK;
    }
    if (config.minSearchScore !== undefined) {
      this.config.minSearchScore = config.minSearchScore;
    }

    // RAGEngine設定の更新
    const { chunking, retriever } = config;
    if (chunking) {
      this.ragEngine.updateChunkingConfig(chunking);
    }
    if (retriever) {
      this.ragEngine.updateRetrieverConfig(retriever);
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): Readonly<RAGPipelineConfig> {
    return { ...this.config, ...this.ragEngineConfig };
  }
}
