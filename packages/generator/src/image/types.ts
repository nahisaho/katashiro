/**
 * Image Generator Types
 * AI画像生成の型定義
 * REQ-MEDIA-001: 画像生成
 */

/**
 * 画像生成モデル
 */
export type ImageModel =
  | 'dall-e-3'
  | 'dall-e-2'
  | 'stable-diffusion'
  | 'stable-diffusion-xl'
  | 'midjourney'
  | 'mock';

/**
 * 画像スタイル
 */
export type ImageStyle =
  | 'natural'
  | 'vivid'
  | 'artistic'
  | 'photorealistic'
  | 'anime'
  | 'cartoon'
  | 'sketch'
  | 'oil-painting'
  | 'watercolor'
  | 'digital-art'
  | 'pixel-art'
  | '3d-render'
  | 'cinematic';

/**
 * 画像サイズプリセット
 */
export type ImageSizePreset =
  | 'thumbnail'   // 256x256
  | 'small'       // 512x512
  | 'medium'      // 1024x1024
  | 'large'       // 1792x1024
  | 'portrait'    // 1024x1792
  | 'landscape'   // 1792x1024
  | 'square'      // 1024x1024
  | 'banner'      // 1920x480
  | 'custom';

/**
 * 画像フォーマット
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * 画像品質
 */
export type ImageQuality = 'standard' | 'hd';

/**
 * 画像生成オプション
 */
export interface ImageGenerationOptions {
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** サイズプリセット */
  sizePreset?: ImageSizePreset;
  /** スタイル */
  style?: ImageStyle;
  /** 品質 */
  quality?: ImageQuality;
  /** 使用モデル */
  model?: ImageModel;
  /** ネガティブプロンプト（生成しないもの） */
  negativePrompt?: string;
  /** シード値（再現性用） */
  seed?: number;
  /** ガイダンススケール */
  guidanceScale?: number;
  /** ステップ数 */
  steps?: number;
  /** 出力形式 */
  format?: ImageFormat;
  /** 透過背景 */
  transparentBackground?: boolean;
  /** プロンプト最適化を有効化 */
  optimizePrompt?: boolean;
  /** 追加のモデル固有パラメータ */
  modelParams?: Record<string, unknown>;
}

/**
 * プロンプト最適化オプション
 */
export interface PromptOptimizationOptions {
  /** スタイルキーワードを追加 */
  addStyleKeywords?: boolean;
  /** 品質キーワードを追加 */
  addQualityKeywords?: boolean;
  /** 詳細を追加 */
  addDetails?: boolean;
  /** ネガティブプロンプトを生成 */
  generateNegativePrompt?: boolean;
  /** 最大トークン数 */
  maxTokens?: number;
}

/**
 * 最適化されたプロンプト
 */
export interface OptimizedPrompt {
  /** 元のプロンプト */
  original: string;
  /** 最適化されたプロンプト */
  optimized: string;
  /** 生成されたネガティブプロンプト */
  negativePrompt?: string;
  /** 追加されたキーワード */
  addedKeywords: string[];
  /** 推奨スタイル */
  suggestedStyle?: ImageStyle;
}

/**
 * 生成された画像
 */
export interface GeneratedImage {
  /** 画像データ（Base64またはURL） */
  data: string;
  /** データタイプ */
  dataType: 'base64' | 'url';
  /** フォーマット */
  format: ImageFormat;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** 使用したプロンプト */
  prompt: string;
  /** 修正されたプロンプト（モデルによる修正がある場合） */
  revisedPrompt?: string;
  /** メタデータ */
  metadata: ImageMetadata;
}

/**
 * 画像メタデータ
 */
export interface ImageMetadata {
  /** 使用モデル */
  model: ImageModel;
  /** 使用スタイル */
  style?: ImageStyle;
  /** シード値 */
  seed?: number;
  /** ガイダンススケール */
  guidanceScale?: number;
  /** ステップ数 */
  steps?: number;
  /** 生成日時 */
  generatedAt: string;
  /** 生成時間（ミリ秒） */
  generationTime?: number;
  /** コスト情報 */
  cost?: {
    credits?: number;
    currency?: string;
    amount?: number;
  };
}

/**
 * 画像入力（バリエーション生成用）
 */
export interface ImageInput {
  /** Base64データまたはURL */
  data: string;
  /** データタイプ */
  dataType: 'base64' | 'url';
  /** フォーマット */
  format?: ImageFormat;
}

/**
 * バリエーション生成オプション
 */
export interface VariationOptions {
  /** 生成数 */
  count?: number;
  /** 変化の強さ (0-1) */
  strength?: number;
  /** サイズ */
  width?: number;
  height?: number;
  /** 出力形式 */
  format?: ImageFormat;
}

/**
 * 画像編集オプション
 */
export interface ImageEditOptions {
  /** マスク画像（編集範囲） */
  mask?: ImageInput;
  /** 編集指示 */
  prompt: string;
  /** サイズ */
  width?: number;
  height?: number;
  /** 出力形式 */
  format?: ImageFormat;
}

/**
 * モデルプロバイダー設定
 */
export interface ModelProviderConfig {
  /** APIキー */
  apiKey?: string;
  /** エンドポイントURL */
  endpoint?: string;
  /** 組織ID */
  organization?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  maxRetries?: number;
}

/**
 * サイズプリセット定義
 */
export const SIZE_PRESETS: Record<ImageSizePreset, { width: number; height: number }> = {
  thumbnail: { width: 256, height: 256 },
  small: { width: 512, height: 512 },
  medium: { width: 1024, height: 1024 },
  large: { width: 1792, height: 1024 },
  portrait: { width: 1024, height: 1792 },
  landscape: { width: 1792, height: 1024 },
  square: { width: 1024, height: 1024 },
  banner: { width: 1920, height: 480 },
  custom: { width: 1024, height: 1024 },
};

/**
 * スタイルキーワードマッピング
 */
export const STYLE_KEYWORDS: Record<ImageStyle, string[]> = {
  natural: ['natural lighting', 'realistic', 'authentic'],
  vivid: ['vibrant colors', 'high saturation', 'dynamic'],
  artistic: ['artistic', 'creative', 'expressive'],
  photorealistic: ['photorealistic', '8k', 'ultra-detailed', 'sharp focus'],
  anime: ['anime style', 'japanese animation', 'cel shading'],
  cartoon: ['cartoon style', 'illustrated', 'colorful'],
  sketch: ['pencil sketch', 'hand-drawn', 'line art'],
  'oil-painting': ['oil painting', 'classical art', 'textured brushstrokes'],
  watercolor: ['watercolor', 'soft colors', 'fluid'],
  'digital-art': ['digital art', 'modern illustration', 'clean lines'],
  'pixel-art': ['pixel art', '16-bit', 'retro gaming'],
  '3d-render': ['3D render', 'CGI', 'volumetric lighting', 'ray tracing'],
  cinematic: ['cinematic', 'film grain', 'dramatic lighting', 'movie still'],
};

/**
 * 品質キーワード
 */
export const QUALITY_KEYWORDS = {
  standard: ['good quality', 'well-composed'],
  hd: [
    'masterpiece',
    'best quality',
    'highly detailed',
    'sharp focus',
    '8k resolution',
    'professional',
  ],
};

/**
 * デフォルトネガティブプロンプト
 */
export const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, duplicate, watermark, text, logo';

/**
 * デフォルトオプション
 */
export const DEFAULT_IMAGE_OPTIONS: ImageGenerationOptions = {
  width: 1024,
  height: 1024,
  style: 'natural',
  quality: 'standard',
  model: 'mock',
  format: 'png',
  transparentBackground: false,
  optimizePrompt: true,
};

/**
 * 画像ジェネレーターエラー
 */
export class ImageGeneratorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ImageGeneratorError';
    Object.setPrototypeOf(this, ImageGeneratorError.prototype);
  }
}

/**
 * エラーコード
 */
export const IMAGE_ERROR_CODES = {
  INVALID_PROMPT: 'IMAGE_INVALID_PROMPT',
  INVALID_OPTIONS: 'IMAGE_INVALID_OPTIONS',
  INVALID_IMAGE: 'IMAGE_INVALID_IMAGE',
  MODEL_NOT_AVAILABLE: 'IMAGE_MODEL_NOT_AVAILABLE',
  GENERATION_FAILED: 'IMAGE_GENERATION_FAILED',
  RATE_LIMITED: 'IMAGE_RATE_LIMITED',
  CONTENT_POLICY: 'IMAGE_CONTENT_POLICY',
  TIMEOUT: 'IMAGE_TIMEOUT',
  API_ERROR: 'IMAGE_API_ERROR',
} as const;
