/**
 * Mock LLM Provider - テスト用モックプロバイダー
 *
 * @requirement REQ-LLM-001
 * @design DES-KATASHIRO-003-LLM §3.1
 */

import type { ZodType, z } from 'zod';
import type {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
} from '../types.js';

/**
 * モックプロバイダー設定
 */
export interface MockProviderConfig {
  /** デフォルトレスポンス */
  defaultResponse?: string;
  /** 遅延（ミリ秒） */
  delay?: number;
  /** エラーを発生させるか */
  shouldFail?: boolean;
  /** エラーメッセージ */
  errorMessage?: string;
  /** カスタムレスポンス生成関数 */
  responseGenerator?: (request: GenerateRequest) => string;
}

/**
 * テスト用モックLLMプロバイダー
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  readonly supportedModels = ['mock-model', 'mock-model-v2'];

  private config: MockProviderConfig;
  private callCount = 0;
  private callHistory: GenerateRequest[] = [];

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      defaultResponse: 'This is a mock response.',
      delay: 0,
      shouldFail: false,
      ...config,
    };
  }

  /**
   * 呼び出し回数取得
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * 呼び出し履歴取得
   */
  getCallHistory(): GenerateRequest[] {
    return [...this.callHistory];
  }

  /**
   * リセット
   */
  reset(): void {
    this.callCount = 0;
    this.callHistory = [];
  }

  /**
   * 設定更新
   */
  updateConfig(config: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    this.callCount++;
    this.callHistory.push(request);

    if (this.config.delay && this.config.delay > 0) {
      await this.sleep(this.config.delay);
    }

    if (this.config.shouldFail) {
      throw new Error(this.config.errorMessage ?? 'Mock provider error');
    }

    const content = this.config.responseGenerator
      ? this.config.responseGenerator(request)
      : this.config.defaultResponse ?? '';

    return {
      id: `mock-${Date.now()}-${this.callCount}`,
      model: request.model ?? 'mock-model',
      content,
      usage: {
        promptTokens: this.estimateTokens(request.messages.map((m) => 
          typeof m.content === 'string' ? m.content : ''
        ).join('')),
        completionTokens: this.estimateTokens(content),
        totalTokens: 0, // 後で計算
      },
      finishReason: 'stop',
    };
  }

  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
    this.callCount++;
    this.callHistory.push(request);

    if (this.config.shouldFail) {
      throw new Error(this.config.errorMessage ?? 'Mock provider error');
    }

    const content = this.config.responseGenerator
      ? this.config.responseGenerator(request)
      : this.config.defaultResponse ?? '';

    // 文字ごとにストリーミング
    const words = content.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (this.config.delay && this.config.delay > 0) {
        await this.sleep(this.config.delay / words.length);
      }
      yield { type: 'content', content: (i > 0 ? ' ' : '') + words[i] };
    }

    yield {
      type: 'done',
      usage: {
        promptTokens: this.estimateTokens(request.messages.map((m) => 
          typeof m.content === 'string' ? m.content : ''
        ).join('')),
        completionTokens: this.estimateTokens(content),
        totalTokens: 0,
      },
    };
  }

  async generateStructured<T extends ZodType>(
    request: GenerateRequest,
    schema: T
  ): Promise<z.infer<T>> {
    this.callCount++;
    this.callHistory.push(request);

    if (this.config.shouldFail) {
      throw new Error(this.config.errorMessage ?? 'Mock provider error');
    }

    // デフォルトの空オブジェクトを返す（実際のテストでは適切なデータを設定）
    const defaultValue = {};
    return schema.parse(defaultValue);
  }

  async countTokens(text: string, _model?: string): Promise<number> {
    return this.estimateTokens(text);
  }

  private estimateTokens(text: string): number {
    // 簡易トークン推定: 4文字 ≈ 1トークン
    return Math.ceil(text.length / 4);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
