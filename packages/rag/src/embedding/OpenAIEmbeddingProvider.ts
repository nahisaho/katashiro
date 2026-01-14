/**
 * OpenAI Embedding Provider
 *
 * OpenAI API embedding provider
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG
 */

import { BaseEmbeddingProvider } from './BaseEmbeddingProvider.js';
import type { EmbeddingConfig } from '../types.js';

/**
 * OpenAI Embedding設定
 */
export interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  /** APIキー */
  apiKey?: string;
  /** ベースURL（カスタムエンドポイント用） */
  baseUrl?: string;
  /** モデル名 */
  model?: string;
  /** 組織ID */
  organization?: string;
  /** エンコーディングフォーマット */
  encodingFormat?: 'float' | 'base64';
}

/**
 * OpenAI Embedding APIレスポンス
 */
interface OpenAIEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Embeddingプロバイダー
 *
 * OpenAI API（またはOpenAI互換API）を使用した埋め込み生成
 *
 * @example
 * ```typescript
 * // OpenAI API
 * const provider = new OpenAIEmbeddingProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'text-embedding-3-small',
 * });
 *
 * // OpenAI互換API（vLLM, LocalAI等）
 * const localProvider = new OpenAIEmbeddingProvider({
 *   baseUrl: 'http://localhost:8000/v1',
 *   model: 'local-embedding-model',
 * });
 *
 * const embedding = await provider.embed('Hello, world!');
 * ```
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'openai';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly organization?: string;
  private readonly encodingFormat: 'float' | 'base64';
  private _dimensions: number;

  get dimensions(): number {
    return this._dimensions;
  }

  constructor(config: OpenAIEmbeddingConfig = {}) {
    super(config);

    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model ?? 'text-embedding-3-small';
    this.organization = config.organization;
    this.encodingFormat = config.encodingFormat ?? 'float';

    // モデルごとのデフォルト次元数
    this._dimensions = config.dimensions ?? this.getDefaultDimensions(this.model);
  }

  /**
   * モデルごとのデフォルト次元数
   */
  private getDefaultDimensions(model: string): number {
    const dimensionMap: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };

    return dimensionMap[model] ?? 1536;
  }

  /**
   * 単一テキストの埋め込み生成
   */
  async embed(text: string): Promise<number[]> {
    const embeddings = await this.embedBatchInternal([text]);
    const result = embeddings[0];
    if (!result) {
      throw new Error('Failed to generate embedding');
    }
    return result;
  }

  /**
   * バッチ埋め込み生成（OpenAI固有実装）
   *
   * OpenAI APIはネイティブでバッチ処理をサポート
   */
  protected override async embedBatchInternal(
    texts: string[]
  ): Promise<number[][]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/embeddings`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const body: Record<string, unknown> = {
        model: this.model,
        input: texts,
        encoding_format: this.encodingFormat,
      };

      // 次元数指定（text-embedding-3系のみサポート）
      if (
        this._dimensions &&
        (this.model.includes('text-embedding-3') ||
          this.baseUrl !== 'https://api.openai.com/v1')
      ) {
        body.dimensions = this._dimensions;
      }

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        },
        this.config.timeout
      );

      const data = (await response.json()) as OpenAIEmbeddingResponse;

      // インデックス順にソート
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);

      // 実際の次元数を更新
      const firstItem = sortedData[0];
      if (firstItem) {
        this._dimensions = firstItem.embedding.length;
      }

      return sortedData.map((d) => d.embedding);
    });
  }

  /**
   * 利用可能なモデル一覧取得
   */
  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/models`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });

    interface OpenAIModelsResponse {
      data: Array<{ id: string; owned_by: string }>;
    }

    const data = (await response.json()) as OpenAIModelsResponse;

    // embeddingモデルをフィルタ
    return data.data.filter((m) => m.id.includes('embedding')).map((m) => m.id);
  }
}

/**
 * OpenAI互換プロバイダー（ファクトリ関数）
 *
 * vLLM, LocalAI, LM Studio等のOpenAI互換エンドポイント用
 */
export function createOpenAICompatibleEmbeddingProvider(
  baseUrl: string,
  model: string,
  config: Partial<OpenAIEmbeddingConfig> = {}
): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider({
    ...config,
    baseUrl,
    model,
    apiKey: config.apiKey ?? 'not-required', // 一部のローカルAPIはキー不要
  });
}
