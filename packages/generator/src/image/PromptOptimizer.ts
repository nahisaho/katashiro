/**
 * Prompt Optimizer
 * AI画像生成プロンプトの最適化
 * REQ-MEDIA-001-002: プロンプト最適化
 */

import type {
  ImageStyle,
  ImageQuality,
  PromptOptimizationOptions,
  OptimizedPrompt,
} from './types.js';
import {
  STYLE_KEYWORDS,
  QUALITY_KEYWORDS,
  DEFAULT_NEGATIVE_PROMPT,
} from './types.js';

/**
 * デフォルトの最適化オプション
 */
const DEFAULT_OPTIMIZATION_OPTIONS: PromptOptimizationOptions = {
  addStyleKeywords: true,
  addQualityKeywords: true,
  addDetails: true,
  generateNegativePrompt: true,
  maxTokens: 300,
};

/**
 * プロンプト最適化クラス
 */
export class PromptOptimizer {
  private readonly options: PromptOptimizationOptions;

  constructor(options?: Partial<PromptOptimizationOptions>) {
    this.options = { ...DEFAULT_OPTIMIZATION_OPTIONS, ...options };
  }

  /**
   * プロンプトを最適化
   * @param prompt 元のプロンプト
   * @param style 画像スタイル
   * @param quality 画像品質
   * @returns 最適化されたプロンプト
   */
  optimize(
    prompt: string,
    style?: ImageStyle,
    quality?: ImageQuality
  ): OptimizedPrompt {
    const addedKeywords: string[] = [];
    let optimized = this.cleanPrompt(prompt);

    // スタイルキーワードを追加
    if (this.options.addStyleKeywords && style) {
      const styleKeywords = this.getStyleKeywords(style, optimized);
      if (styleKeywords.length > 0) {
        addedKeywords.push(...styleKeywords);
      }
    }

    // 品質キーワードを追加
    if (this.options.addQualityKeywords && quality) {
      const qualityKeywords = this.getQualityKeywords(quality, optimized);
      if (qualityKeywords.length > 0) {
        addedKeywords.push(...qualityKeywords);
      }
    }

    // 詳細を追加
    if (this.options.addDetails) {
      const details = this.suggestDetails(optimized);
      if (details.length > 0) {
        addedKeywords.push(...details);
      }
    }

    // キーワードを結合
    if (addedKeywords.length > 0) {
      optimized = this.combinePromptWithKeywords(optimized, addedKeywords);
    }

    // トークン制限を適用
    if (this.options.maxTokens) {
      optimized = this.truncatePrompt(optimized, this.options.maxTokens);
    }

    // ネガティブプロンプトを生成
    let negativePrompt: string | undefined;
    if (this.options.generateNegativePrompt) {
      negativePrompt = this.generateNegativePrompt(prompt, style);
    }

    // 推奨スタイルを検出
    const suggestedStyle = this.detectSuggestedStyle(prompt);

    return {
      original: prompt,
      optimized,
      negativePrompt,
      addedKeywords,
      suggestedStyle,
    };
  }

  /**
   * プロンプトをクリーンアップ
   */
  private cleanPrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, ' ')  // 複数スペースを1つに
      .replace(/[^\w\s,.!?;:'"()-]/g, '')  // 特殊文字を除去
      .replace(/\s+([,.!?;:])/g, '$1');  // 句読点前のスペースを除去
  }

  /**
   * スタイルキーワードを取得
   */
  private getStyleKeywords(style: ImageStyle, currentPrompt: string): string[] {
    const keywords = STYLE_KEYWORDS[style] || [];
    // 既にプロンプトに含まれているキーワードは除外
    return keywords.filter(
      (kw) => !currentPrompt.toLowerCase().includes(kw.toLowerCase())
    );
  }

  /**
   * 品質キーワードを取得
   */
  private getQualityKeywords(quality: ImageQuality, currentPrompt: string): string[] {
    const keywords = QUALITY_KEYWORDS[quality] || [];
    return keywords.filter(
      (kw) => !currentPrompt.toLowerCase().includes(kw.toLowerCase())
    );
  }

  /**
   * 詳細を提案
   */
  private suggestDetails(prompt: string): string[] {
    const suggestions: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // 照明の詳細がない場合
    if (
      !lowerPrompt.includes('lighting') &&
      !lowerPrompt.includes('light') &&
      !lowerPrompt.includes('dark') &&
      !lowerPrompt.includes('bright')
    ) {
      suggestions.push('good lighting');
    }

    // 構図の詳細がない場合
    if (
      !lowerPrompt.includes('composition') &&
      !lowerPrompt.includes('centered') &&
      !lowerPrompt.includes('close-up') &&
      !lowerPrompt.includes('wide shot')
    ) {
      // 追加しない（ユーザーの意図を尊重）
    }

    return suggestions;
  }

  /**
   * プロンプトとキーワードを結合
   */
  private combinePromptWithKeywords(prompt: string, keywords: string[]): string {
    const keywordString = keywords.join(', ');
    
    // プロンプトが句点で終わっていない場合
    if (!prompt.endsWith('.') && !prompt.endsWith(',')) {
      return `${prompt}, ${keywordString}`;
    }
    
    return `${prompt} ${keywordString}`;
  }

  /**
   * プロンプトを切り詰める（単語単位）
   */
  private truncatePrompt(prompt: string, maxTokens: number): string {
    // 簡易的なトークン推定（1トークン ≈ 4文字）
    const estimatedTokens = prompt.length / 4;
    
    if (estimatedTokens <= maxTokens) {
      return prompt;
    }

    // 単語単位で切り詰め
    const words = prompt.split(' ');
    let result = '';
    let currentTokens = 0;

    for (const word of words) {
      const wordTokens = word.length / 4;
      if (currentTokens + wordTokens > maxTokens) {
        break;
      }
      result += (result ? ' ' : '') + word;
      currentTokens += wordTokens;
    }

    return result;
  }

  /**
   * ネガティブプロンプトを生成
   */
  private generateNegativePrompt(_prompt: string, style?: ImageStyle): string {
    const negatives: string[] = [DEFAULT_NEGATIVE_PROMPT];

    // スタイル固有のネガティブプロンプト
    if (style) {
      switch (style) {
        case 'photorealistic':
          negatives.push('cartoon, illustration, anime, drawing');
          break;
        case 'anime':
          negatives.push('realistic, photograph, 3d');
          break;
        case 'cartoon':
          negatives.push('realistic, photograph');
          break;
        case 'sketch':
          negatives.push('colored, painting, photograph');
          break;
        case 'oil-painting':
          negatives.push('digital, photograph, modern');
          break;
        case 'pixel-art':
          negatives.push('realistic, high resolution, smooth');
          break;
      }
    }

    return negatives.join(', ');
  }

  /**
   * 推奨スタイルを検出
   */
  private detectSuggestedStyle(prompt: string): ImageStyle | undefined {
    const lowerPrompt = prompt.toLowerCase();

    // キーワードからスタイルを推測
    if (
      lowerPrompt.includes('anime') ||
      lowerPrompt.includes('manga') ||
      lowerPrompt.includes('japanese animation')
    ) {
      return 'anime';
    }

    if (
      lowerPrompt.includes('cartoon') ||
      lowerPrompt.includes('animated')
    ) {
      return 'cartoon';
    }

    if (
      lowerPrompt.includes('photo') ||
      lowerPrompt.includes('realistic') ||
      lowerPrompt.includes('real')
    ) {
      return 'photorealistic';
    }

    if (
      lowerPrompt.includes('sketch') ||
      lowerPrompt.includes('pencil') ||
      lowerPrompt.includes('drawing')
    ) {
      return 'sketch';
    }

    if (
      lowerPrompt.includes('oil painting') ||
      lowerPrompt.includes('classical')
    ) {
      return 'oil-painting';
    }

    if (
      lowerPrompt.includes('watercolor') ||
      lowerPrompt.includes('water color')
    ) {
      return 'watercolor';
    }

    if (
      lowerPrompt.includes('pixel') ||
      lowerPrompt.includes('8-bit') ||
      lowerPrompt.includes('16-bit')
    ) {
      return 'pixel-art';
    }

    if (
      lowerPrompt.includes('3d') ||
      lowerPrompt.includes('render') ||
      lowerPrompt.includes('cgi')
    ) {
      return '3d-render';
    }

    if (
      lowerPrompt.includes('cinematic') ||
      lowerPrompt.includes('movie') ||
      lowerPrompt.includes('film')
    ) {
      return 'cinematic';
    }

    return undefined;
  }

  /**
   * プロンプトを強化（シンプルな強化）
   */
  enhance(prompt: string): string {
    const result = this.optimize(prompt, 'natural', 'hd');
    return result.optimized;
  }

  /**
   * プロンプトを翻訳用に準備（日本語→英語のヒント）
   */
  prepareForTranslation(prompt: string): {
    original: string;
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // よく使われる日本語表現の英語ヒント
    const translations: Record<string, string> = {
      '美しい': 'beautiful',
      '風景': 'landscape',
      '人物': 'person, portrait',
      '動物': 'animal',
      '建物': 'building, architecture',
      '自然': 'nature',
      '夜景': 'night view, cityscape at night',
      '夕焼け': 'sunset',
      '朝日': 'sunrise',
      '海': 'ocean, sea',
      '山': 'mountain',
      '森': 'forest',
      '花': 'flower',
      '猫': 'cat',
      '犬': 'dog',
    };

    for (const [ja, en] of Object.entries(translations)) {
      if (prompt.includes(ja)) {
        suggestions.push(`"${ja}" → "${en}"`);
      }
    }

    return {
      original: prompt,
      suggestions,
    };
  }
}

/**
 * プロンプト最適化のユーティリティ関数
 */
export function optimizePrompt(
  prompt: string,
  style?: ImageStyle,
  quality?: ImageQuality,
  options?: Partial<PromptOptimizationOptions>
): OptimizedPrompt {
  const optimizer = new PromptOptimizer(options);
  return optimizer.optimize(prompt, style, quality);
}

/**
 * プロンプトを簡易強化
 */
export function enhancePrompt(prompt: string): string {
  const optimizer = new PromptOptimizer();
  return optimizer.enhance(prompt);
}
