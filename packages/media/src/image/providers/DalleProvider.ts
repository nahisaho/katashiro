/**
 * OpenAI DALL-E プロバイダー
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-010-3
 */

import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageProviderConfig,
  GeneratedImage,
  GenerationMetadata,
  ImageSize,
} from '../../types.js';
import { BaseImageProvider } from '../ImageProviderInterface.js';

/**
 * DALL-E モデル
 */
export type DalleModel = 'dall-e-2' | 'dall-e-3';

/**
 * DALL-E プロバイダー設定
 */
export interface DalleProviderConfig extends ImageProviderConfig {
  type: 'openai';
  /** OpenAI API キー */
  apiKey: string;
  /** 使用するモデル */
  model?: DalleModel;
  /** ベースURL（オプション） */
  baseUrl?: string;
}

/**
 * OpenAI DALL-E API レスポンス
 */
interface DalleApiResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/**
 * OpenAI DALL-E プロバイダー
 *
 * @example
 * ```typescript
 * const provider = new DalleProvider({
 *   type: 'openai',
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'dall-e-3',
 * });
 *
 * const result = await provider.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   size: '1024x1024',
 * });
 * ```
 */
export class DalleProvider extends BaseImageProvider {
  readonly name = 'OpenAI DALL-E';
  readonly type = 'openai';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: DalleModel;

  constructor(config: DalleProviderConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model ?? 'dall-e-3';
  }

  /**
   * 画像を生成
   */
  async generate(config: ImageGenerationConfig): Promise<ImageGenerationResult> {
    const mergedConfig = this.mergeWithDefaults(config);
    const startTime = Date.now();

    // サイズをDALL-E形式に変換
    const size = this.convertSize(mergedConfig.size ?? '1024x1024');

    // リクエストボディ
    const body: Record<string, unknown> = {
      model: this.model,
      prompt: mergedConfig.prompt,
      n: mergedConfig.count ?? 1,
      size,
      response_format: 'b64_json', // Base64で取得
    };

    // DALL-E 3 専用オプション
    if (this.model === 'dall-e-3') {
      if (mergedConfig.style) {
        body.style = mergedConfig.style === 'vivid' ? 'vivid' : 'natural';
      }
      if (mergedConfig.quality) {
        body.quality = mergedConfig.quality >= 80 ? 'hd' : 'standard';
      }
    }

    // API呼び出し
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `DALL-E API error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    const data = (await response.json()) as DalleApiResponse;
    const durationMs = Date.now() - startTime;

    // サイズを解析
    const [width, height] = this.parseSize(size);

    // 結果を構築
    const images: GeneratedImage[] = data.data.map((item) => ({
      base64: item.b64_json,
      url: item.url,
      format: 'png' as const,
      width,
      height,
    }));

    const metadata: GenerationMetadata = {
      provider: this.name,
      model: this.model,
      generatedAt: new Date(),
      durationMs,
      cost: this.estimateCost(this.model, size, images.length),
    };

    return {
      images,
      metadata,
      revisedPrompt: data.data[0]?.revised_prompt,
    };
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 利用可能なモデル一覧
   */
  async listModels(): Promise<string[]> {
    return ['dall-e-2', 'dall-e-3'];
  }

  /**
   * サイズをDALL-E形式に変換
   */
  private convertSize(size: ImageSize): string {
    if (size === 'custom') {
      throw new Error('DALL-E does not support custom sizes');
    }
    return size;
  }

  /**
   * サイズ文字列を解析
   */
  private parseSize(size: string): [number, number] {
    const parts = size.split('x').map(Number);
    return [parts[0] ?? 1024, parts[1] ?? 1024];
  }

  /**
   * コストを見積もり（USD）
   */
  private estimateCost(model: DalleModel, size: string, count: number): number {
    // DALL-E 3 pricing (as of 2024)
    const prices: Record<string, Record<string, number>> = {
      'dall-e-3': {
        '1024x1024': 0.04,
        '1024x1792': 0.08,
        '1792x1024': 0.08,
      },
      'dall-e-2': {
        '256x256': 0.016,
        '512x512': 0.018,
        '1024x1024': 0.02,
      },
    };

    const modelPrices = prices[model] ?? {};
    const pricePerImage = modelPrices[size] ?? 0.04;
    return pricePerImage * count;
  }
}
