/**
 * Stability AI プロバイダー
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-010-4
 */

import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageProviderConfig,
  GeneratedImage,
  GenerationMetadata,
} from '../../types.js';
import { BaseImageProvider } from '../ImageProviderInterface.js';

/**
 * Stability AI モデル
 */
export type StabilityModel =
  | 'stable-diffusion-xl-1024-v1-0'
  | 'stable-diffusion-v1-6'
  | 'stable-diffusion-3'
  | 'stable-image-core'
  | 'stable-image-ultra';

/**
 * Stability AI プロバイダー設定
 */
export interface StabilityProviderConfig extends ImageProviderConfig {
  type: 'stability';
  /** Stability AI API キー */
  apiKey: string;
  /** 使用するモデル */
  model?: StabilityModel;
  /** ベースURL（オプション） */
  baseUrl?: string;
}

/**
 * Stability AI API レスポンス
 */
interface StabilityApiResponse {
  artifacts: Array<{
    base64: string;
    seed: number;
    finishReason: 'SUCCESS' | 'ERROR' | 'CONTENT_FILTERED';
  }>;
}

/**
 * Stability AI プロバイダー
 *
 * @example
 * ```typescript
 * const provider = new StabilityProvider({
 *   type: 'stability',
 *   apiKey: process.env.STABILITY_API_KEY!,
 *   model: 'stable-diffusion-xl-1024-v1-0',
 * });
 *
 * const result = await provider.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   negativePrompt: 'blurry, low quality',
 *   size: '1024x1024',
 * });
 * ```
 */
export class StabilityProvider extends BaseImageProvider {
  readonly name = 'Stability AI';
  readonly type = 'stability';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: StabilityModel;

  constructor(config: StabilityProviderConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.stability.ai/v1';
    this.model = config.model ?? 'stable-diffusion-xl-1024-v1-0';
  }

  /**
   * 画像を生成
   */
  async generate(config: ImageGenerationConfig): Promise<ImageGenerationResult> {
    const mergedConfig = this.mergeWithDefaults(config);
    const startTime = Date.now();

    // サイズを解析
    const [width, height] = this.parseSize(mergedConfig.size ?? '1024x1024', mergedConfig);

    // プロンプトを構築
    const textPrompts: Array<{ text: string; weight: number }> = [
      { text: mergedConfig.prompt, weight: 1 },
    ];

    if (mergedConfig.negativePrompt) {
      textPrompts.push({ text: mergedConfig.negativePrompt, weight: -1 });
    }

    // リクエストボディ
    const body: Record<string, unknown> = {
      text_prompts: textPrompts,
      cfg_scale: 7,
      height,
      width,
      samples: mergedConfig.count ?? 1,
      steps: 30,
    };

    if (mergedConfig.seed !== undefined) {
      body.seed = mergedConfig.seed;
    }

    if (mergedConfig.style) {
      body.style_preset = this.mapStyle(mergedConfig.style);
    }

    // API呼び出し
    const response = await fetch(
      `${this.baseUrl}/generation/${this.model}/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Stability AI API error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    const data = (await response.json()) as StabilityApiResponse;
    const durationMs = Date.now() - startTime;

    // 結果を構築
    const images: GeneratedImage[] = data.artifacts
      .filter((a) => a.finishReason === 'SUCCESS')
      .map((artifact) => ({
        base64: artifact.base64,
        format: 'png' as const,
        width,
        height,
      }));

    const metadata: GenerationMetadata = {
      provider: this.name,
      model: this.model,
      generatedAt: new Date(),
      durationMs,
      cost: this.estimateCost(this.model, width, height, images.length),
    };

    return {
      images,
      metadata,
    };
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/engines/list`, {
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
    return [
      'stable-diffusion-xl-1024-v1-0',
      'stable-diffusion-v1-6',
      'stable-diffusion-3',
      'stable-image-core',
      'stable-image-ultra',
    ];
  }

  /**
   * サイズを解析
   */
  private parseSize(
    size: string,
    config: ImageGenerationConfig
  ): [number, number] {
    if (size === 'custom') {
      return [config.width ?? 1024, config.height ?? 1024];
    }
    const parts = size.split('x').map(Number);
    return [parts[0] ?? 1024, parts[1] ?? 1024];
  }

  /**
   * スタイルをStability形式にマップ
   */
  private mapStyle(style: string): string {
    const styleMap: Record<string, string> = {
      natural: 'photographic',
      vivid: 'enhance',
      artistic: 'digital-art',
      photo: 'photographic',
      anime: 'anime',
      sketch: 'line-art',
    };
    return styleMap[style] ?? 'photographic';
  }

  /**
   * コストを見積もり（USD）
   */
  private estimateCost(
    _model: StabilityModel,
    _width: number,
    _height: number,
    count: number
  ): number {
    // Stability AI pricing varies, using approximate values
    const pricePerImage = 0.002; // $0.002 per image (approximate)
    return pricePerImage * count;
  }
}
