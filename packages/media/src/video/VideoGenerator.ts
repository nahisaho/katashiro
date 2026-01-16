/**
 * VideoGenerator
 *
 * 動画生成のメインファサードクラス
 * 複数のプロバイダーを統合し、統一的なインターフェースを提供
 *
 * @task TASK-012-4
 */

import type {
  VideoGenerationConfig,
  VideoGenerationResult,
} from '../types.js';
import {
  VideoProviderInterface,
  VideoJobStatus,
} from './VideoProviderInterface.js';
import { RunwayProvider, RunwayProviderConfig } from './providers/RunwayProvider.js';
import { PikaProvider, PikaProviderConfig } from './providers/PikaProvider.js';

/**
 * VideoGenerator設定
 */
export interface VideoGeneratorConfig {
  /** デフォルトプロバイダー */
  defaultProvider?: string;
  /** プロバイダー設定 */
  providers?: {
    runway?: RunwayProviderConfig;
    pika?: PikaProviderConfig;
    [key: string]: unknown;
  };
  /** 共通オプション */
  options?: {
    /** タイムアウト（ミリ秒） */
    timeout?: number;
    /** リトライ回数 */
    maxRetries?: number;
    /** プログレスコールバック */
    onProgress?: (progress: number, jobId: string) => void;
  };
}

/**
 * 動画生成ファサードクラス
 */
export class VideoGenerator {
  private providers: Map<string, VideoProviderInterface> = new Map();
  private defaultProvider: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: VideoGeneratorConfig = {}) {
    this.defaultProvider = config.defaultProvider || 'runway';
    this.timeout = config.options?.timeout || 300000;
    this.maxRetries = config.options?.maxRetries || 3;

    this.initializeProviders(config.providers);
  }

  /**
   * OpenAI (Sora) プロバイダーで初期化（将来対応）
   */
  static withRunway(apiKey: string, model?: 'gen-2' | 'gen-3-alpha'): VideoGenerator {
    return new VideoGenerator({
      defaultProvider: 'runway',
      providers: {
        runway: {
          type: 'runway',
          apiKey,
          model,
        },
      },
    });
  }

  /**
   * Pika プロバイダーで初期化
   */
  static withPika(apiKey: string, model?: 'pika-1.0' | 'pika-1.5'): VideoGenerator {
    return new VideoGenerator({
      defaultProvider: 'pika',
      providers: {
        pika: {
          type: 'pika',
          apiKey,
          model,
        },
      },
    });
  }

  /**
   * 動画を生成
   */
  async generate(
    config: VideoGenerationConfig,
    providerName?: string
  ): Promise<VideoGenerationResult> {
    const provider = this.getProvider(providerName || this.defaultProvider);

    if (!provider) {
      throw new Error(
        `Provider '${providerName || this.defaultProvider}' is not configured`
      );
    }

    const generateWithTimeout = async (): Promise<VideoGenerationResult> => {
      return Promise.race([
        provider.generate({
          ...config,
          timeout: config.timeout || this.timeout,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Generation timeout')),
            config.timeout || this.timeout
          )
        ),
      ]);
    };

    // リトライロジック
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await generateWithTimeout();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries - 1) {
          await this.sleep(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Generation failed after retries');
  }

  /**
   * ジョブステータスを取得
   */
  async getJobStatus(
    jobId: string,
    providerName?: string
  ): Promise<VideoJobStatus> {
    const provider = this.getProvider(providerName || this.defaultProvider);

    if (!provider) {
      throw new Error(
        `Provider '${providerName || this.defaultProvider}' is not configured`
      );
    }

    return provider.getJobStatus(jobId);
  }

  /**
   * 非同期で動画生成を開始し、ジョブIDを返す
   */
  async startGeneration(
    config: VideoGenerationConfig,
    providerName?: string
  ): Promise<string> {
    const provider = this.getProvider(providerName || this.defaultProvider);

    if (!provider) {
      throw new Error(
        `Provider '${providerName || this.defaultProvider}' is not configured`
      );
    }

    // 非同期生成を開始
    // 実際の実装では、プロバイダー固有の非同期APIを呼び出す
    // ここでは簡易実装として、generateを呼び出してジョブIDを返す
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // バックグラウンドで生成を開始
    this.runGenerationJob(jobId, config, provider);

    return jobId;
  }

  /**
   * プロバイダーを追加
   */
  addProvider(name: string, provider: VideoProviderInterface): void {
    this.providers.set(name, provider);
  }

  /**
   * プロバイダーを取得
   */
  getProvider(name: string): VideoProviderInterface | undefined {
    return this.providers.get(name);
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isProviderAvailable(providerName?: string): Promise<boolean> {
    const provider = this.getProvider(providerName || this.defaultProvider);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * モデル一覧を取得
   */
  async listModels(providerName?: string): Promise<string[]> {
    const provider = this.getProvider(providerName || this.defaultProvider);
    if (!provider) return [];
    return provider.listModels();
  }

  /**
   * コスト見積もり
   */
  estimateCost(config: VideoGenerationConfig, providerName?: string): number {
    const name = providerName || this.defaultProvider;
    const duration = config.duration || 4;

    // プロバイダーごとのコスト計算
    const costs: Record<string, number> = {
      runway: duration * 0.05,
      pika: duration * 0.04,
    };

    return costs[name] || duration * 0.05;
  }

  private initializeProviders(
    providersConfig?: VideoGeneratorConfig['providers']
  ): void {
    if (!providersConfig) return;

    if (providersConfig.runway) {
      this.providers.set('runway', new RunwayProvider(providersConfig.runway));
    }

    if (providersConfig.pika) {
      this.providers.set('pika', new PikaProvider(providersConfig.pika));
    }
  }

  private async runGenerationJob(
    _jobId: string,
    config: VideoGenerationConfig,
    provider: VideoProviderInterface
  ): Promise<void> {
    try {
      await provider.generate(config);
    } catch {
      // エラーハンドリング（実際の実装ではジョブステータスを更新）
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
