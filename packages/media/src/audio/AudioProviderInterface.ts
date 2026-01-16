/**
 * 音声プロバイダーインターフェース
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-011-1
 */

import type {
  AudioSynthesisConfig,
  AudioSynthesisResult,
  TTSProviderConfig,
} from '../types.js';

/**
 * 音声合成プロバイダーインターフェース
 */
export interface AudioProviderInterface {
  /** プロバイダー名 */
  readonly name: string;
  /** プロバイダータイプ */
  readonly type: string;

  /**
   * 音声を合成する
   * @param config - 合成設定
   * @returns 合成結果
   */
  synthesize(config: AudioSynthesisConfig): Promise<AudioSynthesisResult>;

  /**
   * プロバイダーが利用可能かチェック
   * @returns 利用可能な場合true
   */
  isAvailable(): Promise<boolean>;

  /**
   * 利用可能な音声一覧を取得
   * @returns 音声ID/名前の配列
   */
  listVoices(): Promise<string[]>;
}

/**
 * 音声プロバイダー基底クラス
 */
export abstract class BaseAudioProvider implements AudioProviderInterface {
  abstract readonly name: string;
  abstract readonly type: string;

  protected config: TTSProviderConfig;

  constructor(config: TTSProviderConfig) {
    this.config = config;
  }

  abstract synthesize(config: AudioSynthesisConfig): Promise<AudioSynthesisResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract listVoices(): Promise<string[]>;

  /**
   * デフォルト設定とマージ
   */
  protected mergeWithDefaults(config: AudioSynthesisConfig): AudioSynthesisConfig {
    return {
      ...this.config.defaults,
      ...config,
    };
  }
}
