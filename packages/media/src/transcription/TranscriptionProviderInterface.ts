/**
 * Transcription Provider Interface
 *
 * 音声文字起こしプロバイダーの基底インターフェース
 *
 * @task TASK-013-1
 */

import type {
  TranscriptionConfig,
  TranscriptionResult,
  MediaProviderInfo,
} from '../types.js';

/**
 * 文字起こしプロバイダーインターフェース
 */
export interface TranscriptionProviderInterface {
  /** プロバイダー名 */
  readonly name: string;

  /** プロバイダータイプ */
  readonly type: string;

  /**
   * 音声を文字起こし
   */
  transcribe(config: TranscriptionConfig): Promise<TranscriptionResult>;

  /**
   * プロバイダーが利用可能かチェック
   */
  isAvailable(): Promise<boolean>;

  /**
   * サポートされている言語一覧を取得
   */
  listLanguages(): Promise<string[]>;

  /**
   * サポートされているモデル一覧を取得
   */
  listModels(): Promise<string[]>;

  /**
   * プロバイダー情報を取得
   */
  getInfo(): MediaProviderInfo;
}

/**
 * 文字起こしプロバイダー設定の基底型
 */
export interface TranscriptionProviderConfig {
  type: string;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * 文字起こしプロバイダーの基底クラス
 */
export abstract class BaseTranscriptionProvider
  implements TranscriptionProviderInterface
{
  abstract readonly name: string;
  abstract readonly type: string;

  protected readonly config: TranscriptionProviderConfig;

  constructor(config: TranscriptionProviderConfig) {
    this.config = config;
  }

  abstract transcribe(config: TranscriptionConfig): Promise<TranscriptionResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract listLanguages(): Promise<string[]>;
  abstract listModels(): Promise<string[]>;

  getInfo(): MediaProviderInfo {
    return {
      name: this.name,
      type: this.type,
      capabilities: this.getCapabilities(),
      limits: this.getLimits(),
    };
  }

  protected abstract getCapabilities(): string[];
  protected abstract getLimits(): Record<string, number>;

  /**
   * APIリクエストを実行
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = this.config.baseUrl || this.getDefaultBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    return response.json() as T;
  }

  protected abstract getDefaultBaseUrl(): string;
}
