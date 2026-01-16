/**
 * ImageGenerator - 画像生成メインクラス
 *
 * 複数の画像生成プロバイダーを統合して使用できるファサード
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-010-2
 */

import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageProviderType,
  MediaGenerationOptions,
} from '../types.js';
import type { ImageProviderInterface } from './ImageProviderInterface.js';
import { DalleProvider, type DalleProviderConfig } from './providers/DalleProvider.js';
import { StabilityProvider, type StabilityProviderConfig } from './providers/StabilityProvider.js';
import { PromptEnhancer, type PromptEnhanceOptions } from './PromptEnhancer.js';

/**
 * ImageGenerator 設定
 */
export interface ImageGeneratorConfig {
  /** デフォルトプロバイダー */
  defaultProvider?: ImageProviderType;
  /** プロバイダー設定 */
  providers?: {
    openai?: DalleProviderConfig;
    stability?: StabilityProviderConfig;
  };
  /** 共通オプション */
  options?: MediaGenerationOptions;
  /** プロンプト強化を有効化 */
  enhancePrompts?: boolean;
}

/**
 * 画像生成ファサードクラス
 *
 * 複数の画像生成プロバイダー（OpenAI DALL-E, Stability AI等）を
 * 統一されたインターフェースで使用できます。
 *
 * @example
 * ```typescript
 * const generator = new ImageGenerator({
 *   defaultProvider: 'openai',
 *   providers: {
 *     openai: {
 *       type: 'openai',
 *       apiKey: process.env.OPENAI_API_KEY!,
 *       model: 'dall-e-3',
 *     },
 *   },
 *   enhancePrompts: true,
 * });
 *
 * const result = await generator.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   size: '1024x1024',
 * });
 *
 * console.log(result.images[0].base64);
 * ```
 */
export class ImageGenerator {
  private readonly providers: Map<ImageProviderType, ImageProviderInterface> = new Map();
  private readonly defaultProvider: ImageProviderType;
  private readonly options: MediaGenerationOptions;
  private readonly promptEnhancer: PromptEnhancer;
  private readonly enhancePrompts: boolean;

  constructor(config: ImageGeneratorConfig = {}) {
    this.defaultProvider = config.defaultProvider ?? 'openai';
    this.options = config.options ?? {};
    this.promptEnhancer = new PromptEnhancer();
    this.enhancePrompts = config.enhancePrompts ?? false;

    // プロバイダーを初期化
    if (config.providers?.openai) {
      this.providers.set('openai', new DalleProvider(config.providers.openai));
    }
    if (config.providers?.stability) {
      this.providers.set('stability', new StabilityProvider(config.providers.stability));
    }
  }

  /**
   * 画像を生成
   *
   * @param config - 生成設定
   * @param providerType - 使用するプロバイダー（省略時はデフォルト）
   * @returns 生成結果
   */
  async generate(
    config: ImageGenerationConfig,
    providerType?: ImageProviderType
  ): Promise<ImageGenerationResult> {
    const type = providerType ?? this.defaultProvider;
    const provider = this.providers.get(type);

    if (!provider) {
      throw new Error(
        `Provider '${type}' is not configured. Available: ${[...this.providers.keys()].join(', ')}`
      );
    }

    // プロンプト強化
    let processedConfig = config;
    if (this.enhancePrompts) {
      const enhanced = this.promptEnhancer.enhance(config.prompt, {
        style: config.style,
        addQualityTerms: true,
        generateNegative: !config.negativePrompt,
      });

      processedConfig = {
        ...config,
        prompt: enhanced.prompt,
        negativePrompt: config.negativePrompt ?? enhanced.negativePrompt,
      };
    }

    // タイムアウト付きで実行
    const timeout = this.options.timeout ?? 60000;
    const result = await Promise.race([
      provider.generate(processedConfig),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), timeout)
      ),
    ]);

    return result;
  }

  /**
   * プロンプトを強化
   */
  enhancePrompt(prompt: string, options?: PromptEnhanceOptions) {
    return this.promptEnhancer.enhance(prompt, options);
  }

  /**
   * プロバイダーを追加
   */
  addProvider(type: ImageProviderType, provider: ImageProviderInterface): void {
    this.providers.set(type, provider);
  }

  /**
   * プロバイダーを取得
   */
  getProvider(type: ImageProviderType): ImageProviderInterface | undefined {
    return this.providers.get(type);
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  listProviders(): ImageProviderType[] {
    return [...this.providers.keys()];
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isProviderAvailable(type?: ImageProviderType): Promise<boolean> {
    const providerType = type ?? this.defaultProvider;
    const provider = this.providers.get(providerType);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * ファクトリーメソッド: OpenAI プロバイダーで作成
   */
  static withOpenAI(apiKey: string, model?: 'dall-e-2' | 'dall-e-3'): ImageGenerator {
    return new ImageGenerator({
      defaultProvider: 'openai',
      providers: {
        openai: {
          type: 'openai',
          apiKey,
          model: model ?? 'dall-e-3',
        },
      },
    });
  }

  /**
   * ファクトリーメソッド: Stability AI プロバイダーで作成
   */
  static withStability(apiKey: string): ImageGenerator {
    return new ImageGenerator({
      defaultProvider: 'stability',
      providers: {
        stability: {
          type: 'stability',
          apiKey,
        },
      },
    });
  }
}
