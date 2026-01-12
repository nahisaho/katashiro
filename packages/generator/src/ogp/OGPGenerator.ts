/**
 * OGP Generator
 * OGP画像・サムネイル生成
 * REQ-MEDIA-004: サムネイル・OGP生成
 */

import type {
  OGPContent,
  OGPOptions,
  OGPImage,
  Platform,
  AspectRatio,
  OGPTheme,
  PlatformConfig,
} from './types.js';
import {
  PLATFORM_CONFIGS,
  THEME_STYLES,
  DEFAULT_OGP_OPTIONS,
  OGPGeneratorError,
  OGP_ERROR_CODES,
} from './types.js';
import { OGPSvgBuilder } from './OGPSvgBuilder.js';

/**
 * OGP画像生成クラス
 * REQ-MEDIA-004-001: OGP画像生成
 * REQ-MEDIA-004-002: サムネイル生成
 * REQ-MEDIA-004-003: プラットフォーム最適化
 */
export class OGPGenerator {
  private readonly defaultOptions: OGPOptions;

  constructor(defaultOptions?: Partial<OGPOptions>) {
    this.defaultOptions = { ...DEFAULT_OGP_OPTIONS, ...defaultOptions };
  }

  /**
   * OGP画像を生成
   * @param content OGPコンテンツ
   * @param options 生成オプション
   * @returns 生成されたOGP画像
   */
  async generate(content: OGPContent, options?: OGPOptions): Promise<OGPImage> {
    this.validateContent(content);

    const mergedOptions = { ...this.defaultOptions, ...options };
    const width = mergedOptions.width ?? 1200;
    const height = mergedOptions.height ?? 630;
    const theme = mergedOptions.theme ?? 'default';
    const format = mergedOptions.format ?? 'svg';

    // SVGを生成
    const svg = this.generateSvg(content, width, height, theme, mergedOptions);

    // メタデータを作成
    const metadata = this.createMetadata(content, width, height, mergedOptions);

    return {
      svg,
      width,
      height,
      format,
      metadata,
    };
  }

  /**
   * プラットフォーム向けOGP画像を生成
   * REQ-MEDIA-004-003: プラットフォーム最適化
   * @param content OGPコンテンツ
   * @param platform 対象プラットフォーム
   * @param options 追加オプション
   * @returns 生成されたOGP画像
   */
  async generateForPlatform(
    content: OGPContent,
    platform: Platform,
    options?: Partial<OGPOptions>
  ): Promise<OGPImage> {
    const platformConfig = this.getPlatformConfig(platform);

    const platformOptions: OGPOptions = {
      ...this.defaultOptions,
      width: platformConfig.width,
      height: platformConfig.height,
      ...options,
    };

    const result = await this.generate(content, platformOptions);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        platform: platformConfig.name,
        platformId: platform,
      },
    };
  }

  /**
   * 複数プラットフォーム向けOGP画像を一括生成
   * @param content OGPコンテンツ
   * @param platforms 対象プラットフォーム配列
   * @param options 追加オプション
   * @returns プラットフォームごとのOGP画像マップ
   */
  async generateForPlatforms(
    content: OGPContent,
    platforms: Platform[],
    options?: Partial<OGPOptions>
  ): Promise<Map<Platform, OGPImage>> {
    const results = new Map<Platform, OGPImage>();

    for (const platform of platforms) {
      const image = await this.generateForPlatform(content, platform, options);
      results.set(platform, image);
    }

    return results;
  }

  /**
   * サムネイル画像を生成
   * REQ-MEDIA-004-002: サムネイル生成
   * @param content OGPコンテンツ
   * @param aspectRatio アスペクト比
   * @param options 追加オプション
   * @returns 生成されたサムネイル画像
   */
  async generateThumbnail(
    content: OGPContent,
    aspectRatio: AspectRatio,
    options?: Partial<OGPOptions>
  ): Promise<OGPImage> {
    const { width, height } = this.calculateDimensions(
      aspectRatio,
      options?.width ?? 1200
    );

    const thumbnailOptions: OGPOptions = {
      ...this.defaultOptions,
      width,
      height,
      ...options,
    };

    const result = await this.generate(content, thumbnailOptions);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        aspectRatio,
        isThumbnail: true,
      },
    };
  }

  /**
   * 複数アスペクト比のサムネイルを一括生成
   * @param content OGPコンテンツ
   * @param aspectRatios アスペクト比配列
   * @param options 追加オプション
   * @returns アスペクト比ごとのサムネイルマップ
   */
  async generateThumbnails(
    content: OGPContent,
    aspectRatios: AspectRatio[],
    options?: Partial<OGPOptions>
  ): Promise<Map<AspectRatio, OGPImage>> {
    const results = new Map<AspectRatio, OGPImage>();

    for (const ratio of aspectRatios) {
      const image = await this.generateThumbnail(content, ratio, options);
      results.set(ratio, image);
    }

    return results;
  }

  /**
   * テーマプレビューを生成
   * @param content OGPコンテンツ
   * @param themes テーマ配列
   * @returns テーマごとのプレビューマップ
   */
  async generateThemePreviews(
    content: OGPContent,
    themes: OGPTheme[]
  ): Promise<Map<OGPTheme, OGPImage>> {
    const results = new Map<OGPTheme, OGPImage>();

    for (const theme of themes) {
      const image = await this.generate(content, { theme });
      results.set(theme, image);
    }

    return results;
  }

  /**
   * プラットフォーム設定を取得
   */
  getPlatformConfig(platform: Platform): PlatformConfig {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      throw new OGPGeneratorError(
        OGP_ERROR_CODES.INVALID_PLATFORM,
        `Invalid platform: ${platform}`
      );
    }
    return config;
  }

  /**
   * 利用可能なプラットフォーム一覧を取得
   */
  getAvailablePlatforms(): Platform[] {
    return Object.keys(PLATFORM_CONFIGS) as Platform[];
  }

  /**
   * 利用可能なテーマ一覧を取得
   */
  getAvailableThemes(): OGPTheme[] {
    return Object.keys(THEME_STYLES) as OGPTheme[];
  }

  /**
   * SVGを生成
   */
  private generateSvg(
    content: OGPContent,
    width: number,
    height: number,
    theme: OGPTheme,
    options: OGPOptions
  ): string {
    const builder = new OGPSvgBuilder(width, height, theme, options.customStyle);

    // ヘッダー
    builder.addHeader();

    // 背景
    if (content.backgroundImage) {
      builder.addBackgroundImage(content.backgroundImage);
    } else {
      builder.addBackground();
    }

    // 装飾（オプション）
    if (options.decoration) {
      builder.addDecoration(options.decoration);
    }

    // メインコンテンツ
    builder.addContent(content);

    // フッター
    if (options.showFooter !== false) {
      builder.addFooter(content);
    }

    // ロゴ
    if (content.logo) {
      builder.addLogo(content.logo);
    }

    return builder.build();
  }

  /**
   * メタデータを作成
   */
  private createMetadata(
    content: OGPContent,
    width: number,
    height: number,
    options: OGPOptions
  ): Record<string, unknown> {
    return {
      title: content.title,
      description: content.description,
      author: content.author,
      siteName: content.siteName,
      width,
      height,
      theme: options.theme,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * コンテンツを検証
   */
  private validateContent(content: OGPContent): void {
    if (!content) {
      throw new OGPGeneratorError(
        OGP_ERROR_CODES.INVALID_CONTENT,
        'Content is required'
      );
    }

    if (!content.title || content.title.trim() === '') {
      throw new OGPGeneratorError(
        OGP_ERROR_CODES.INVALID_CONTENT,
        'Title is required'
      );
    }
  }

  /**
   * アスペクト比から寸法を計算
   */
  private calculateDimensions(
    aspectRatio: AspectRatio,
    baseWidth: number
  ): { width: number; height: number } {
    const ratioMap: Record<AspectRatio, number> = {
      '16:9': 16 / 9,
      '1:1': 1,
      '4:3': 4 / 3,
      '2:1': 2,
      '1.91:1': 1.91,
    };

    const ratio = ratioMap[aspectRatio];
    if (!ratio) {
      throw new OGPGeneratorError(
        OGP_ERROR_CODES.INVALID_DIMENSIONS,
        `Invalid aspect ratio: ${aspectRatio}`
      );
    }

    return {
      width: baseWidth,
      height: Math.round(baseWidth / ratio),
    };
  }
}

/**
 * ファクトリ関数
 */
export function createOGPGenerator(
  defaultOptions?: Partial<OGPOptions>
): OGPGenerator {
  return new OGPGenerator(defaultOptions);
}
