/**
 * Base Embedding Provider
 *
 * Esperanto-style abstraction for embedding providers
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG
 */

import type { EmbeddingProvider, EmbeddingConfig } from '../types.js';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: EmbeddingConfig = {
  batchSize: 100,
  dimensions: 1536,
  timeout: 60000,
  maxRetries: 3,
};

/**
 * 抽象Embeddingプロバイダー基底クラス
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract readonly name: string;
  abstract readonly dimensions: number;

  protected config: EmbeddingConfig;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * 単一テキストの埋め込み生成
   */
  abstract embed(text: string): Promise<number[]>;

  /**
   * バッチ埋め込み生成
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = this.config.batchSize ?? 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await this.embedBatchInternal(batch);
      results.push(...embeddings);
    }

    return results;
  }

  /**
   * 内部バッチ処理（プロバイダー固有実装）
   */
  protected async embedBatchInternal(texts: string[]): Promise<number[][]> {
    // デフォルト: 個別に処理
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  /**
   * HTTPリクエストヘルパー（タイムアウト対応）
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout?: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout ?? this.config.timeout
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * リトライ付き実行
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * スリープヘルパー
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
