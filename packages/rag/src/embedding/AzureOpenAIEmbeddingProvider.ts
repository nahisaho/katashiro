/**
 * Azure OpenAI Embedding Provider
 *
 * Azure OpenAI Service embedding provider
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG
 */

import { BaseEmbeddingProvider } from './BaseEmbeddingProvider.js';
import type { EmbeddingConfig } from '../types.js';

/**
 * Azure OpenAI Embedding設定
 */
export interface AzureOpenAIEmbeddingConfig extends EmbeddingConfig {
  /** Azure OpenAI エンドポイント */
  endpoint?: string;
  /** APIキー */
  apiKey?: string;
  /** デプロイメント名 */
  deploymentName?: string;
  /** APIバージョン */
  apiVersion?: string;
}

/**
 * Azure OpenAI Embedding APIレスポンス
 */
interface AzureEmbeddingResponse {
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
 * Azure OpenAI Embeddingプロバイダー
 *
 * Azure OpenAI Serviceを使用した埋め込み生成
 *
 * @example
 * ```typescript
 * const provider = new AzureOpenAIEmbeddingProvider({
 *   endpoint: 'https://your-resource.openai.azure.com',
 *   apiKey: process.env.AZURE_OPENAI_API_KEY,
 *   deploymentName: 'text-embedding-ada-002',
 *   apiVersion: '2024-02-15-preview',
 * });
 *
 * const embedding = await provider.embed('Hello, world!');
 * ```
 */
export class AzureOpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'azure-openai';

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;
  private readonly apiVersion: string;
  private _dimensions: number;

  get dimensions(): number {
    return this._dimensions;
  }

  constructor(config: AzureOpenAIEmbeddingConfig = {}) {
    super(config);

    this.endpoint = config.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? '';
    this.apiKey = config.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? '';
    this.deploymentName =
      config.deploymentName ?? process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? '';
    this.apiVersion = config.apiVersion ?? '2024-02-15-preview';

    // デフォルト次元数
    this._dimensions = config.dimensions ?? 1536;

    // 設定検証
    if (!this.endpoint) {
      throw new Error(
        'Azure OpenAI endpoint is required. Set AZURE_OPENAI_ENDPOINT or provide endpoint in config.'
      );
    }
    if (!this.apiKey) {
      throw new Error(
        'Azure OpenAI API key is required. Set AZURE_OPENAI_API_KEY or provide apiKey in config.'
      );
    }
    if (!this.deploymentName) {
      throw new Error(
        'Azure OpenAI deployment name is required. Set AZURE_OPENAI_EMBEDDING_DEPLOYMENT or provide deploymentName in config.'
      );
    }
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
   * バッチ埋め込み生成（Azure OpenAI固有実装）
   */
  protected override async embedBatchInternal(
    texts: string[]
  ): Promise<number[][]> {
    return this.withRetry(async () => {
      // エンドポイントの正規化
      const baseUrl = this.endpoint.endsWith('/')
        ? this.endpoint.slice(0, -1)
        : this.endpoint;

      const url = `${baseUrl}/openai/deployments/${this.deploymentName}/embeddings?api-version=${this.apiVersion}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      };

      const body: Record<string, unknown> = {
        input: texts,
      };

      // 次元数指定（embedding-3系のみ）
      if (this._dimensions && this.deploymentName.includes('embedding-3')) {
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

      const data = (await response.json()) as AzureEmbeddingResponse;

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
   * デプロイメント一覧取得
   */
  async listDeployments(): Promise<string[]> {
    const baseUrl = this.endpoint.endsWith('/')
      ? this.endpoint.slice(0, -1)
      : this.endpoint;

    const url = `${baseUrl}/openai/deployments?api-version=${this.apiVersion}`;

    const headers: Record<string, string> = {
      'api-key': this.apiKey,
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers,
      });

      interface AzureDeploymentsResponse {
        data: Array<{
          id: string;
          model: string;
          status: string;
        }>;
      }

      const data = (await response.json()) as AzureDeploymentsResponse;

      // embeddingモデルをフィルタ
      return data.data
        .filter((d) => d.model.includes('embedding') && d.status === 'succeeded')
        .map((d) => d.id);
    } catch {
      // Azure Management API権限がない場合はエラー
      return [];
    }
  }
}
