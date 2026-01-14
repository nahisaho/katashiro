/**
 * Ollama Embedding Provider
 *
 * Local embedding provider using Ollama
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG
 */

import { BaseEmbeddingProvider } from './BaseEmbeddingProvider.js';
import type { EmbeddingConfig } from '../types.js';

/**
 * Ollama設定
 */
export interface OllamaEmbeddingConfig extends EmbeddingConfig {
  /** ベースURL（デフォルト: http://localhost:11434） */
  baseUrl?: string;
  /** モデル名（デフォルト: nomic-embed-text） */
  model?: string;
  /** Keep Alive（モデルをメモリに保持する時間） */
  keepAlive?: string;
}

/**
 * Ollama APIレスポンス
 */
interface OllamaEmbeddingResponse {
  embedding: number[];
  model: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

/**
 * Ollama Embeddingプロバイダー
 *
 * ローカルでOllamaを使用した埋め込み生成
 *
 * @example
 * ```typescript
 * const provider = new OllamaEmbeddingProvider({
 *   baseUrl: 'http://192.168.224.1:11434',
 *   model: 'nomic-embed-text',
 * });
 *
 * const embedding = await provider.embed('Hello, world!');
 * ```
 */
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'ollama';

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly keepAlive: string;
  private _dimensions: number;

  get dimensions(): number {
    return this._dimensions;
  }

  constructor(config: OllamaEmbeddingConfig = {}) {
    super(config);

    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? 'nomic-embed-text';
    this.keepAlive = config.keepAlive ?? '5m';

    // nomic-embed-text: 768次元
    // mxbai-embed-large: 1024次元
    // all-minilm: 384次元
    this._dimensions = config.dimensions ?? this.getDefaultDimensions(this.model);
  }

  /**
   * モデルごとのデフォルト次元数
   */
  private getDefaultDimensions(model: string): number {
    const dimensionMap: Record<string, number> = {
      'nomic-embed-text': 768,
      'mxbai-embed-large': 1024,
      'all-minilm': 384,
      'snowflake-arctic-embed': 1024,
      'bge-m3': 1024,
    };

    // モデル名の先頭マッチで検索
    for (const [key, dims] of Object.entries(dimensionMap)) {
      if (model.includes(key)) {
        return dims;
      }
    }

    return 768; // デフォルト
  }

  /**
   * 単一テキストの埋め込み生成
   */
  async embed(text: string): Promise<number[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/api/embeddings`;

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            prompt: text,
            keep_alive: this.keepAlive,
          }),
        },
        this.config.timeout
      );

      const data = (await response.json()) as OllamaEmbeddingResponse;

      // 次元数を実際の値で更新（初回のみ）
      if (this._dimensions === 768 && data.embedding.length !== 768) {
        this._dimensions = data.embedding.length;
      }

      return data.embedding;
    });
  }

  /**
   * バッチ埋め込み生成（Ollama固有実装）
   *
   * Ollamaはネイティブのバッチ処理をサポートしていないため、
   * 並列リクエストで処理
   */
  protected override async embedBatchInternal(
    texts: string[]
  ): Promise<number[][]> {
    // 並列度を制限（5並列）
    const concurrency = 5;
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(
        batch.map((text) => this.embed(text))
      );

      embeddings.forEach((embedding, j) => {
        results[i + j] = embedding;
      });
    }

    return results;
  }

  /**
   * 利用可能なモデル一覧取得
   */
  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/api/tags`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
    });

    interface OllamaTagsResponse {
      models: Array<{ name: string; model: string }>;
    }

    const data = (await response.json()) as OllamaTagsResponse;

    // embeddingモデルをフィルタ（名前に embed を含むもの）
    return data.models
      .filter(
        (m) =>
          m.name.includes('embed') ||
          m.name.includes('nomic') ||
          m.name.includes('bge')
      )
      .map((m) => m.name);
  }

  /**
   * モデルの存在確認
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some((m) => m.includes(this.model));
    } catch {
      return false;
    }
  }
}
