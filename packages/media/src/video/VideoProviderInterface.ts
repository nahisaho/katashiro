/**
 * Video Provider Interface
 *
 * 動画生成プロバイダーの基底インターフェース
 *
 * @task TASK-012-1
 */

import type {
  VideoGenerationConfig,
  VideoGenerationResult,
  MediaProviderInfo,
} from '../types.js';

/**
 * 動画プロバイダーインターフェース
 */
export interface VideoProviderInterface {
  /** プロバイダー名 */
  readonly name: string;

  /** プロバイダータイプ */
  readonly type: string;

  /**
   * 動画を生成
   */
  generate(config: VideoGenerationConfig): Promise<VideoGenerationResult>;

  /**
   * プロバイダーが利用可能かチェック
   */
  isAvailable(): Promise<boolean>;

  /**
   * 生成ジョブのステータスを確認
   */
  getJobStatus(jobId: string): Promise<VideoJobStatus>;

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
 * 動画生成ジョブのステータス
 */
export interface VideoJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: VideoGenerationResult;
  error?: string;
  estimatedTimeRemaining?: number;
}

/**
 * 動画プロバイダー設定の基底型
 */
export interface VideoProviderConfig {
  type: string;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * 動画プロバイダーの基底クラス
 */
export abstract class BaseVideoProvider implements VideoProviderInterface {
  abstract readonly name: string;
  abstract readonly type: string;

  protected readonly config: VideoProviderConfig;

  constructor(config: VideoProviderConfig) {
    this.config = config;
  }

  abstract generate(config: VideoGenerationConfig): Promise<VideoGenerationResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract getJobStatus(jobId: string): Promise<VideoJobStatus>;
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
        'Content-Type': 'application/json',
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
