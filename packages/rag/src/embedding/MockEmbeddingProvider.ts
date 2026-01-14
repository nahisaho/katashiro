/**
 * Mock Embedding Provider - テスト用
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG §3.1
 */

import type { EmbeddingProvider, Vector } from '../types.js';

/**
 * MockEmbeddingProvider設定
 */
export interface MockEmbeddingProviderConfig {
  /** ベクトル次元数 */
  dimensions?: number;
  /** 遅延（ミリ秒） */
  delay?: number;
  /** エラーを発生させるか */
  shouldFail?: boolean;
}

/**
 * テスト用モックEmbeddingプロバイダー
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly dimensions: number;

  private delay: number;
  private shouldFail: boolean;
  private callCount = 0;

  constructor(config: MockEmbeddingProviderConfig = {}) {
    this.dimensions = config.dimensions ?? 1536;
    this.delay = config.delay ?? 0;
    this.shouldFail = config.shouldFail ?? false;
  }

  /**
   * 呼び出し回数取得
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * リセット
   */
  reset(): void {
    this.callCount = 0;
  }

  async embed(text: string): Promise<Vector> {
    this.callCount++;

    if (this.delay > 0) {
      await this.sleep(this.delay);
    }

    if (this.shouldFail) {
      throw new Error('Mock embedding provider error');
    }

    return this.generateDeterministicVector(text);
  }

  async embedBatch(texts: string[]): Promise<Vector[]> {
    this.callCount++;

    if (this.delay > 0) {
      await this.sleep(this.delay);
    }

    if (this.shouldFail) {
      throw new Error('Mock embedding provider error');
    }

    return texts.map((text) => this.generateDeterministicVector(text));
  }

  /**
   * テキストから決定的なベクトルを生成
   * 同じテキストからは常に同じベクトルが生成される
   */
  private generateDeterministicVector(text: string): Vector {
    const vector: Vector = new Array(this.dimensions);
    let seed = this.hashString(text);

    for (let i = 0; i < this.dimensions; i++) {
      seed = this.nextRandom(seed);
      // -1から1の範囲に正規化
      vector[i] = (seed / 2147483647) * 2 - 1;
    }

    // L2正規化
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map((v) => v / norm);
  }

  /**
   * 文字列のシンプルなハッシュ
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 線形合同法による擬似乱数
   */
  private nextRandom(seed: number): number {
    return (seed * 1103515245 + 12345) & 2147483647;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
