/**
 * 画像プロバイダーインターフェース
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-010-1
 */

import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageProviderConfig,
} from '../types.js';

/**
 * 画像生成プロバイダーインターフェース
 */
export interface ImageProviderInterface {
  /** プロバイダー名 */
  readonly name: string;
  /** プロバイダータイプ */
  readonly type: string;

  /**
   * 画像を生成する
   * @param config - 生成設定
   * @returns 生成結果
   */
  generate(config: ImageGenerationConfig): Promise<ImageGenerationResult>;

  /**
   * プロバイダーが利用可能かチェック
   * @returns 利用可能な場合true
   */
  isAvailable(): Promise<boolean>;

  /**
   * 利用可能なモデル一覧を取得
   * @returns モデル名の配列
   */
  listModels(): Promise<string[]>;
}

/**
 * 画像プロバイダー基底クラス
 */
export abstract class BaseImageProvider implements ImageProviderInterface {
  abstract readonly name: string;
  abstract readonly type: string;

  protected config: ImageProviderConfig;

  constructor(config: ImageProviderConfig) {
    this.config = config;
  }

  abstract generate(config: ImageGenerationConfig): Promise<ImageGenerationResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract listModels(): Promise<string[]>;

  /**
   * デフォルト設定とマージ
   */
  protected mergeWithDefaults(config: ImageGenerationConfig): ImageGenerationConfig {
    return {
      ...this.config.defaults,
      ...config,
    };
  }
}
