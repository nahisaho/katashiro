/**
 * Image Generator
 * AI画像生成クラス
 * REQ-MEDIA-001: 画像生成
 */

import type {
  ImageModel,
  ImageGenerationOptions,
  GeneratedImage,
  ImageInput,
  VariationOptions,
  ImageEditOptions,
  ModelProviderConfig,
  ImageMetadata,
  ImageFormat,
} from './types.js';
import {
  SIZE_PRESETS,
  DEFAULT_IMAGE_OPTIONS,
  ImageGeneratorError,
  IMAGE_ERROR_CODES,
} from './types.js';
import { PromptOptimizer } from './PromptOptimizer.js';

/**
 * 画像ジェネレーター設定
 */
export interface ImageGeneratorConfig {
  /** デフォルトモデル */
  defaultModel?: ImageModel;
  /** モデルプロバイダー設定 */
  providers?: Partial<Record<ImageModel, ModelProviderConfig>>;
  /** デフォルトオプション */
  defaultOptions?: Partial<ImageGenerationOptions>;
  /** プロンプト最適化を有効化 */
  enablePromptOptimization?: boolean;
}

/**
 * 画像ジェネレータークラス
 * REQ-MEDIA-001-001: AI画像生成
 * REQ-MEDIA-001-002: プロンプト最適化
 * REQ-MEDIA-001-003: 出力形式
 */
export class ImageGenerator {
  private readonly config: ImageGeneratorConfig;
  private readonly promptOptimizer: PromptOptimizer;
  private readonly defaultOptions: ImageGenerationOptions;

  constructor(config?: ImageGeneratorConfig) {
    this.config = config ?? {};
    this.promptOptimizer = new PromptOptimizer();
    this.defaultOptions = {
      ...DEFAULT_IMAGE_OPTIONS,
      model: config?.defaultModel ?? 'mock',
      ...config?.defaultOptions,
    };
  }

  /**
   * 画像を生成
   * REQ-MEDIA-001-001: AI画像生成
   * @param prompt 画像の説明
   * @param options 生成オプション
   * @returns 生成された画像
   */
  async generate(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<GeneratedImage> {
    this.validatePrompt(prompt);

    const mergedOptions = this.mergeOptions(options);
    const { width, height } = this.resolveSize(mergedOptions);

    // プロンプト最適化
    let finalPrompt = prompt;
    let revisedPrompt: string | undefined;

    if (mergedOptions.optimizePrompt !== false && this.config.enablePromptOptimization !== false) {
      const optimized = this.promptOptimizer.optimize(
        prompt,
        mergedOptions.style,
        mergedOptions.quality
      );
      finalPrompt = optimized.optimized;
      if (finalPrompt !== prompt) {
        revisedPrompt = finalPrompt;
      }

      // ネガティブプロンプトが未設定の場合は自動設定
      if (!mergedOptions.negativePrompt && optimized.negativePrompt) {
        mergedOptions.negativePrompt = optimized.negativePrompt;
      }
    }

    const startTime = Date.now();

    // モデルに応じた生成処理
    const model = mergedOptions.model ?? 'mock';
    const imageData = await this.generateWithModel(
      model,
      finalPrompt,
      width,
      height,
      mergedOptions
    );

    const generationTime = Date.now() - startTime;

    const metadata: ImageMetadata = {
      model,
      style: mergedOptions.style,
      seed: mergedOptions.seed,
      guidanceScale: mergedOptions.guidanceScale,
      steps: mergedOptions.steps,
      generatedAt: new Date().toISOString(),
      generationTime,
    };

    return {
      data: imageData.data,
      dataType: imageData.dataType,
      format: mergedOptions.format ?? 'png',
      width,
      height,
      prompt: finalPrompt,
      revisedPrompt,
      metadata,
    };
  }

  /**
   * 複数の画像を生成
   * @param prompt 画像の説明
   * @param count 生成数
   * @param options 生成オプション
   * @returns 生成された画像配列
   */
  async generateMultiple(
    prompt: string,
    count: number,
    options?: ImageGenerationOptions
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (let i = 0; i < count; i++) {
      // シードを変えて生成
      const opts = {
        ...options,
        seed: options?.seed ? options.seed + i : Math.floor(Math.random() * 1000000),
      };
      const image = await this.generate(prompt, opts);
      results.push(image);
    }

    return results;
  }

  /**
   * バリエーションを生成
   * @param image 元画像
   * @param options バリエーションオプション
   * @returns 生成されたバリエーション
   */
  async generateVariations(
    image: ImageInput,
    options?: VariationOptions
  ): Promise<GeneratedImage[]> {
    this.validateImageInput(image);

    const count = options?.count ?? 4;
    const results: GeneratedImage[] = [];
    const model = this.defaultOptions.model ?? 'mock';

    for (let i = 0; i < count; i++) {
      const result = await this.generateVariationWithModel(
        model,
        image,
        options?.strength ?? 0.7,
        {
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          format: options?.format ?? 'png',
        }
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 画像を編集
   * @param image 元画像
   * @param options 編集オプション
   * @returns 編集された画像
   */
  async edit(
    image: ImageInput,
    options: ImageEditOptions
  ): Promise<GeneratedImage> {
    this.validateImageInput(image);
    this.validatePrompt(options.prompt);

    const model = this.defaultOptions.model ?? 'mock';
    return this.editWithModel(model, image, options);
  }

  /**
   * 利用可能なモデルを取得
   */
  getAvailableModels(): ImageModel[] {
    return ['dall-e-3', 'dall-e-2', 'stable-diffusion', 'stable-diffusion-xl', 'midjourney', 'mock'];
  }

  /**
   * 利用可能なスタイルを取得
   */
  getAvailableStyles(): string[] {
    return [
      'natural',
      'vivid',
      'artistic',
      'photorealistic',
      'anime',
      'cartoon',
      'sketch',
      'oil-painting',
      'watercolor',
      'digital-art',
      'pixel-art',
      '3d-render',
      'cinematic',
    ];
  }

  /**
   * サイズプリセットを取得
   */
  getSizePresets(): Record<string, { width: number; height: number }> {
    return { ...SIZE_PRESETS };
  }

  /**
   * モデルに応じた生成処理
   */
  private async generateWithModel(
    model: ImageModel,
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): Promise<{ data: string; dataType: 'base64' | 'url' }> {
    switch (model) {
      case 'dall-e-3':
      case 'dall-e-2':
        return this.generateWithOpenAI(model, prompt, width, height, options);
      case 'stable-diffusion':
      case 'stable-diffusion-xl':
        return this.generateWithStableDiffusion(model, prompt, width, height, options);
      case 'midjourney':
        return this.generateWithMidjourney(prompt, width, height, options);
      case 'mock':
      default:
        return this.generateMock(prompt, width, height, options);
    }
  }

  /**
   * OpenAI (DALL-E) で生成
   */
  private async generateWithOpenAI(
    model: 'dall-e-3' | 'dall-e-2',
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): Promise<{ data: string; dataType: 'base64' | 'url' }> {
    const providerConfig = this.config.providers?.[model];
    
    if (!providerConfig?.apiKey) {
      // APIキーがない場合はモックを返す
      return this.generateMock(prompt, width, height, options);
    }

    // 実際のOpenAI API呼び出し（未実装時はモック）
    // 本番環境では openai パッケージを使用
    return this.generateMock(prompt, width, height, options);
  }

  /**
   * Stable Diffusion で生成
   */
  private async generateWithStableDiffusion(
    model: 'stable-diffusion' | 'stable-diffusion-xl',
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): Promise<{ data: string; dataType: 'base64' | 'url' }> {
    const providerConfig = this.config.providers?.[model];
    
    if (!providerConfig?.endpoint) {
      // エンドポイントがない場合はモックを返す
      return this.generateMock(prompt, width, height, options);
    }

    // 実際のStable Diffusion API呼び出し（未実装時はモック）
    return this.generateMock(prompt, width, height, options);
  }

  /**
   * Midjourney で生成
   */
  private async generateWithMidjourney(
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): Promise<{ data: string; dataType: 'base64' | 'url' }> {
    // Midjourney APIは現時点で公式APIがないためモックを返す
    return this.generateMock(prompt, width, height, options);
  }

  /**
   * モック画像を生成
   */
  private async generateMock(
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): Promise<{ data: string; dataType: 'base64' | 'url' }> {
    // SVGでプレースホルダー画像を生成
    const svg = this.createMockSvg(prompt, width, height, options);
    const base64 = Buffer.from(svg).toString('base64');
    
    return {
      data: `data:image/svg+xml;base64,${base64}`,
      dataType: 'base64',
    };
  }

  /**
   * モック用SVGを作成
   */
  private createMockSvg(
    prompt: string,
    width: number,
    height: number,
    options: ImageGenerationOptions
  ): string {
    const style = options.style ?? 'natural';
    const bgColor = this.getStyleBackgroundColor(style);
    const textColor = this.getStyleTextColor(style);
    
    // プロンプトを短縮
    const shortPrompt = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${textColor}" stroke-width="0.5" opacity="0.1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${textColor}" opacity="0.8">
        [AI Generated Image]
      </text>
      <text x="50%" y="55%" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${textColor}" opacity="0.6">
        ${this.escapeXml(shortPrompt)}
      </text>
      <text x="50%" y="65%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${textColor}" opacity="0.4">
        ${width}×${height} • ${style}
      </text>
    </svg>`;
  }

  /**
   * スタイルに応じた背景色を取得
   */
  private getStyleBackgroundColor(style: string): string {
    const colors: Record<string, string> = {
      natural: '#f5f5f5',
      vivid: '#ffe0e0',
      artistic: '#e0f0ff',
      photorealistic: '#e8e8e8',
      anime: '#ffe8f0',
      cartoon: '#fff0e0',
      sketch: '#fafafa',
      'oil-painting': '#f0e8d8',
      watercolor: '#e8f8f8',
      'digital-art': '#e0e8ff',
      'pixel-art': '#d0e0d0',
      '3d-render': '#e0e0f0',
      cinematic: '#181818',
    };
    return colors[style] ?? '#f0f0f0';
  }

  /**
   * スタイルに応じたテキスト色を取得
   */
  private getStyleTextColor(style: string): string {
    if (style === 'cinematic') {
      return '#ffffff';
    }
    return '#333333';
  }

  /**
   * バリエーション生成
   */
  private async generateVariationWithModel(
    model: ImageModel,
    _image: ImageInput,
    strength: number,
    options: { width: number; height: number; format: ImageFormat }
  ): Promise<GeneratedImage> {
    // モック実装
    const svg = this.createVariationMockSvg(options.width, options.height, strength);
    const base64 = Buffer.from(svg).toString('base64');

    return {
      data: `data:image/svg+xml;base64,${base64}`,
      dataType: 'base64',
      format: options.format,
      width: options.width,
      height: options.height,
      prompt: 'variation',
      metadata: {
        model,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * バリエーション用モックSVG
   */
  private createVariationMockSvg(width: number, height: number, strength: number): string {
    const hue = Math.floor(Math.random() * 360);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="hsl(${hue}, 50%, 90%)"/>
      <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#666">
        Variation (strength: ${strength})
      </text>
    </svg>`;
  }

  /**
   * 画像編集
   */
  private async editWithModel(
    model: ImageModel,
    _image: ImageInput,
    options: ImageEditOptions
  ): Promise<GeneratedImage> {
    const width = options.width ?? 1024;
    const height = options.height ?? 1024;

    // モック実装
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#e8e8e8"/>
      <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#666">
        [Edited Image]
      </text>
      <text x="50%" y="55%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#888">
        ${this.escapeXml(options.prompt.slice(0, 40))}
      </text>
    </svg>`;

    const base64 = Buffer.from(svg).toString('base64');

    return {
      data: `data:image/svg+xml;base64,${base64}`,
      dataType: 'base64',
      format: options.format ?? 'png',
      width,
      height,
      prompt: options.prompt,
      metadata: {
        model,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * オプションをマージ
   */
  private mergeOptions(options?: ImageGenerationOptions): ImageGenerationOptions {
    return {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * サイズを解決
   */
  private resolveSize(options: ImageGenerationOptions): { width: number; height: number } {
    if (options.sizePreset && options.sizePreset !== 'custom') {
      return SIZE_PRESETS[options.sizePreset];
    }

    return {
      width: options.width ?? 1024,
      height: options.height ?? 1024,
    };
  }

  /**
   * プロンプトを検証
   */
  private validatePrompt(prompt: string): void {
    if (!prompt || prompt.trim() === '') {
      throw new ImageGeneratorError(
        IMAGE_ERROR_CODES.INVALID_PROMPT,
        'Prompt is required and cannot be empty'
      );
    }

    if (prompt.length > 4000) {
      throw new ImageGeneratorError(
        IMAGE_ERROR_CODES.INVALID_PROMPT,
        'Prompt exceeds maximum length of 4000 characters'
      );
    }
  }

  /**
   * 画像入力を検証
   */
  private validateImageInput(image: ImageInput): void {
    if (!image || !image.data) {
      throw new ImageGeneratorError(
        IMAGE_ERROR_CODES.INVALID_IMAGE,
        'Image data is required'
      );
    }
  }

  /**
   * XMLエスケープ
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * ファクトリ関数
 */
export function createImageGenerator(config?: ImageGeneratorConfig): ImageGenerator {
  return new ImageGenerator(config);
}
