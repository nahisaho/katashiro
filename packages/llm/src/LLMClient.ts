/**
 * LLM Client - マルチプロバイダーファサード
 *
 * @requirement REQ-LLM-001, REQ-LLM-004
 * @design DES-KATASHIRO-003-LLM §3.4
 */

import type { ZodType, z } from 'zod';
import type {
  LLMProvider,
  LLMClientConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
  FallbackResult,
} from './types.js';

/**
 * LLMクライアント
 *
 * フォールバック機能とリトライ機能を提供するファサードクラス
 */
export class LLMClient {
  private primaryProvider: LLMProvider;
  private fallbackProviders: LLMProvider[];
  private retryCount: number;
  private retryDelay: number;

  constructor(config: LLMClientConfig) {
    this.primaryProvider = config.provider;
    this.fallbackProviders = config.fallbackProviders ?? [];
    this.retryCount = config.enableRetry !== false ? (config.retryCount ?? 3) : 0;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  /**
   * テキスト生成（フォールバック対応）
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse & { _fallback?: FallbackResult }> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];
    const errors: FallbackResult['errors'] = [];

    for (const provider of providers) {
      try {
        const response = await this.withRetry(() => provider.generate(request));
        return {
          ...response,
          _fallback: errors.length > 0 ? {
            provider: provider.name,
            attemptedProviders: errors.map((e) => e.provider),
            errors,
          } : undefined,
        };
      } catch (error) {
        errors.push({
          provider: provider.name,
          error: error as Error,
          timestamp: new Date(),
        });
      }
    }

    // すべてのプロバイダーが失敗
    throw new AggregateError(
      errors.map((e) => e.error),
      `All LLM providers failed: ${errors.map((e) => e.provider).join(', ')}`
    );
  }

  /**
   * ストリーミング生成
   */
  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        yield* provider.generateStream(request);
        return;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    throw new AggregateError(errors, 'All LLM providers failed for streaming');
  }

  /**
   * 構造化出力生成
   */
  async generateStructured<T extends ZodType>(
    request: GenerateRequest,
    schema: T
  ): Promise<z.infer<T>> {
    return this.primaryProvider.generateStructured(request, schema);
  }

  /**
   * トークン数カウント
   */
  async countTokens(text: string, model?: string): Promise<number> {
    return this.primaryProvider.countTokens(text, model);
  }

  /**
   * プライマリプロバイダー取得
   */
  getProvider(): LLMProvider {
    return this.primaryProvider;
  }

  /**
   * プロバイダー一覧取得
   */
  getProviders(): LLMProvider[] {
    return [this.primaryProvider, ...this.fallbackProviders];
  }

  /**
   * リトライラッパー
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retryCount) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// シングルトン管理
let defaultClient: LLMClient | null = null;

/**
 * デフォルトLLMクライアント取得
 */
export function getLLMClient(): LLMClient {
  if (!defaultClient) {
    throw new Error('LLM client not initialized. Call initLLMClient() first.');
  }
  return defaultClient;
}

/**
 * LLMクライアント初期化
 */
export function initLLMClient(config: LLMClientConfig): LLMClient {
  defaultClient = new LLMClient(config);
  return defaultClient;
}

/**
 * LLMクライアントリセット（テスト用）
 */
export function resetLLMClient(): void {
  defaultClient = null;
}
