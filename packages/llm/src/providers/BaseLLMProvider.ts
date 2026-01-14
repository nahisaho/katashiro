/**
 * Base LLM Provider
 *
 * @requirement REQ-LLM-001
 * @design DES-KATASHIRO-003-LLM §3.1.1
 */

import type { z, ZodType } from 'zod';
import type {
  LLMProvider,
  ProviderConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
} from '../types.js';

/**
 * 抽象LLMプロバイダー基底クラス
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  protected config: ProviderConfig;
  protected defaultModel: string;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
    this.defaultModel = config.defaultModel ?? this.getDefaultModel();
  }

  /**
   * デフォルトモデル取得
   */
  protected abstract getDefaultModel(): string;

  /**
   * テキスト生成（抽象メソッド）
   */
  abstract generate(request: GenerateRequest): Promise<GenerateResponse>;

  /**
   * ストリーミング生成（抽象メソッド）
   */
  abstract generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;

  /**
   * 構造化出力生成
   */
  async generateStructured<T extends ZodType>(
    request: GenerateRequest,
    schema: T
  ): Promise<z.infer<T>> {
    const jsonSchema = this.zodToJsonSchema(schema);

    const enhancedRequest: GenerateRequest = {
      ...request,
      responseFormat: { type: 'json_object' },
      messages: [
        ...request.messages,
        {
          role: 'user',
          content: `Respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
        },
      ],
    };

    const response = await this.generate(enhancedRequest);
    const parsed = JSON.parse(response.content);
    return schema.parse(parsed);
  }

  /**
   * トークン数カウント（デフォルト実装）
   */
  async countTokens(text: string, _model?: string): Promise<number> {
    // 簡易実装: 4文字 ≈ 1トークン
    return Math.ceil(text.length / 4);
  }

  /**
   * モデルサポート確認
   */
  isModelSupported(model: string): boolean {
    return this.supportedModels.includes(model);
  }

  /**
   * モデル取得（デフォルトまたは指定）
   */
  protected getModel(request: GenerateRequest): string {
    return request.model ?? this.defaultModel;
  }

  /**
   * Zodスキーマ→JSONスキーマ変換（簡易実装）
   */
  protected zodToJsonSchema(schema: ZodType): Record<string, unknown> {
    // 実際にはzod-to-json-schemaライブラリを使用
    const description = (schema as { description?: string }).description;
    return {
      type: 'object',
      description: description ?? 'Generated schema',
    };
  }
}
