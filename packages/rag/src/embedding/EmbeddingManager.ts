/**
 * Embedding Manager
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG §3.1
 */

import type { EmbeddingProvider, Vector } from '../types.js';

/**
 * EmbeddingManager - Embedding生成の管理
 * キャッシュとバッチ処理をサポート
 */
export class EmbeddingManager {
  private provider: EmbeddingProvider;
  private cache: Map<string, Vector> = new Map();

  constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  /**
   * ベクトル次元数
   */
  get dimensions(): number {
    return this.provider.dimensions;
  }

  /**
   * プロバイダー名
   */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * 単一テキストの埋め込み生成
   */
  async embed(text: string): Promise<Vector> {
    // キャッシュチェック
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 生成
    const embedding = await this.provider.embed(text);

    // キャッシュ保存
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * バッチ埋め込み生成
   */
  async embedBatch(texts: string[]): Promise<Vector[]> {
    // 全部キャッシュチェックして、なければ一括生成
    const results: Vector[] = new Array(texts.length);
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!;
      const cacheKey = this.getCacheKey(text);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(i);
      }
    }

    // 未キャッシュのものを生成
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await this.provider.embedBatch(uncachedTexts);

      for (let j = 0; j < newEmbeddings.length; j++) {
        const originalIndex = uncachedIndices[j]!;
        const text = uncachedTexts[j]!;
        const embedding = newEmbeddings[j]!;

        results[originalIndex] = embedding;

        // キャッシュ保存
        const cacheKey = this.getCacheKey(text);
        this.cache.set(cacheKey, embedding);
      }
    }

    return results;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(text: string): string {
    return `${this.provider.name}:${text}`;
  }
}
