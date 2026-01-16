/**
 * プロンプトエンハンサー
 *
 * LLMを使用してプロンプトを強化・最適化する
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-010-5
 */

import type { ImageStyle, ImageProviderType } from '../types.js';

/**
 * プロンプト強化オプション
 */
export interface PromptEnhanceOptions {
  /** 対象プロバイダー */
  provider?: ImageProviderType;
  /** スタイル */
  style?: ImageStyle;
  /** 詳細度（1-5） */
  detailLevel?: number;
  /** 品質キーワードを追加 */
  addQualityTerms?: boolean;
  /** ネガティブプロンプトを生成 */
  generateNegative?: boolean;
}

/**
 * 強化されたプロンプト
 */
export interface EnhancedPrompt {
  /** 強化されたプロンプト */
  prompt: string;
  /** 生成されたネガティブプロンプト */
  negativePrompt?: string;
  /** 推奨設定 */
  recommendations?: {
    style?: ImageStyle;
    size?: string;
  };
}

/**
 * プロンプトエンハンサー
 *
 * 画像生成用のプロンプトを最適化・強化するユーティリティ
 *
 * @example
 * ```typescript
 * const enhancer = new PromptEnhancer();
 *
 * const enhanced = enhancer.enhance('sunset mountains', {
 *   style: 'photo',
 *   addQualityTerms: true,
 * });
 *
 * console.log(enhanced.prompt);
 * // "A breathtaking photograph of a sunset over mountains,
 * //  golden hour lighting, high resolution, professional photography"
 * ```
 */
export class PromptEnhancer {
  /**
   * プロンプトを強化
   */
  enhance(prompt: string, options: PromptEnhanceOptions = {}): EnhancedPrompt {
    const { style, detailLevel = 3, addQualityTerms = true, generateNegative = true } = options;

    let enhancedPrompt = prompt;

    // スタイル修飾子を追加
    if (style) {
      enhancedPrompt = this.addStyleModifiers(enhancedPrompt, style);
    }

    // 詳細度に応じた修飾
    if (detailLevel >= 3) {
      enhancedPrompt = this.addDetailModifiers(enhancedPrompt, detailLevel);
    }

    // 品質キーワードを追加
    if (addQualityTerms) {
      enhancedPrompt = this.addQualityTerms(enhancedPrompt, style);
    }

    // ネガティブプロンプトを生成
    let negativePrompt: string | undefined;
    if (generateNegative) {
      negativePrompt = this.generateNegativePrompt(style);
    }

    return {
      prompt: enhancedPrompt,
      negativePrompt,
      recommendations: this.getRecommendations(prompt, style),
    };
  }

  /**
   * スタイル修飾子を追加
   */
  private addStyleModifiers(prompt: string, style: ImageStyle): string {
    const styleModifiers: Record<ImageStyle, string> = {
      natural: 'natural, organic, realistic',
      vivid: 'vibrant colors, high contrast, dynamic',
      artistic: 'artistic, creative, expressive',
      photo: 'photograph, professional photography, realistic',
      anime: 'anime style, Japanese animation, cel shading',
      sketch: 'pencil sketch, hand-drawn, line art',
    };

    const modifier = styleModifiers[style];
    if (modifier && !prompt.toLowerCase().includes(modifier.split(',')[0]!)) {
      return `${prompt}, ${modifier}`;
    }
    return prompt;
  }

  /**
   * 詳細度修飾子を追加
   */
  private addDetailModifiers(prompt: string, level: number): string {
    const detailTerms: string[] = [];

    if (level >= 3) {
      detailTerms.push('detailed');
    }
    if (level >= 4) {
      detailTerms.push('intricate details', 'fine textures');
    }
    if (level >= 5) {
      detailTerms.push('hyper-detailed', 'ultra-realistic', '8K resolution');
    }

    if (detailTerms.length > 0) {
      return `${prompt}, ${detailTerms.join(', ')}`;
    }
    return prompt;
  }

  /**
   * 品質キーワードを追加
   */
  private addQualityTerms(prompt: string, style?: ImageStyle): string {
    const qualityTerms: string[] = ['high quality', 'masterpiece'];

    if (style === 'photo') {
      qualityTerms.push('professional lighting', 'sharp focus');
    } else if (style === 'artistic') {
      qualityTerms.push('award-winning', 'gallery quality');
    } else if (style === 'anime') {
      qualityTerms.push('best quality', 'beautiful');
    }

    return `${prompt}, ${qualityTerms.join(', ')}`;
  }

  /**
   * ネガティブプロンプトを生成
   */
  private generateNegativePrompt(style?: ImageStyle): string {
    const commonNegatives = [
      'low quality',
      'blurry',
      'distorted',
      'disfigured',
      'bad anatomy',
      'watermark',
      'signature',
      'text',
    ];

    const styleNegatives: Record<string, string[]> = {
      photo: ['cartoon', 'anime', 'illustration', 'painting', 'drawing'],
      anime: ['realistic', 'photograph', '3D render'],
      sketch: ['color', 'photograph', '3D'],
    };

    const negatives = [...commonNegatives];
    if (style && styleNegatives[style]) {
      negatives.push(...styleNegatives[style]!);
    }

    return negatives.join(', ');
  }

  /**
   * 推奨設定を取得
   */
  private getRecommendations(
    prompt: string,
    style?: ImageStyle
  ): { style?: ImageStyle; size?: string } {
    const recommendations: { style?: ImageStyle; size?: string } = {};

    // プロンプトから最適なスタイルを推測
    if (!style) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('anime') || lowerPrompt.includes('manga')) {
        recommendations.style = 'anime';
      } else if (lowerPrompt.includes('sketch') || lowerPrompt.includes('drawing')) {
        recommendations.style = 'sketch';
      } else if (
        lowerPrompt.includes('photo') ||
        lowerPrompt.includes('realistic') ||
        lowerPrompt.includes('portrait')
      ) {
        recommendations.style = 'photo';
      }
    }

    // プロンプトから最適なサイズを推測
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('portrait') || lowerPrompt.includes('vertical')) {
      recommendations.size = '1024x1792';
    } else if (lowerPrompt.includes('landscape') || lowerPrompt.includes('panorama')) {
      recommendations.size = '1792x1024';
    }

    return recommendations;
  }

  /**
   * プロンプトを翻訳（日本語→英語）
   *
   * 注: 実際の翻訳にはLLMを使用する必要があります。
   * これは簡易的なプレースホルダーです。
   */
  translateToEnglish(prompt: string): string {
    // 日本語を含むかチェック
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(prompt);

    if (hasJapanese) {
      // TODO: LLMを使用して翻訳
      console.warn('Japanese prompt detected. Translation requires LLM integration.');
    }

    return prompt;
  }
}
