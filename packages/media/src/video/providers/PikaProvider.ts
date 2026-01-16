/**
 * Pika Labs Provider
 *
 * Pika 動画生成プロバイダー
 *
 * @task TASK-012-3
 */

import type { VideoGenerationConfig, VideoGenerationResult } from '../../types.js';
import {
  BaseVideoProvider,
  VideoProviderConfig,
  VideoJobStatus,
} from '../VideoProviderInterface.js';

/**
 * Pika モデル
 */
export type PikaModel = 'pika-1.0' | 'pika-1.5';

/**
 * Pika プロバイダー設定
 */
export interface PikaProviderConfig extends VideoProviderConfig {
  type: 'pika';
  model?: PikaModel;
  pollingInterval?: number;
}

/**
 * Pika API レスポンス
 */
interface PikaGenerationResponse {
  id: string;
  status: string;
}

interface PikaJobResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  video?: {
    url: string;
    duration: number;
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Pika Labs 動画生成プロバイダー
 */
export class PikaProvider extends BaseVideoProvider {
  readonly name = 'Pika';
  readonly type = 'pika';

  private readonly model: PikaModel;
  private readonly pollingInterval: number;

  constructor(config: PikaProviderConfig) {
    super(config);
    this.model = config.model || 'pika-1.5';
    this.pollingInterval = config.pollingInterval || 5000;
  }

  async generate(config: VideoGenerationConfig): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    // 生成リクエスト
    const response = await this.request<PikaGenerationResponse>(
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify(this.buildRequest(config)),
      }
    );

    // ポーリングで完了を待機
    const result = await this.waitForCompletion(response.id, config.timeout);

    if (result.status === 'failed') {
      throw new Error(`Video generation failed: ${result.error}`);
    }

    const videoUrl = result.result?.videoUrl || '';
    const videoData = await this.fetchVideo(videoUrl);

    return {
      video: videoData,
      format: 'mp4',
      width: result.result?.width || config.width || 1024,
      height: result.result?.height || config.height || 576,
      durationSeconds: result.result?.durationSeconds || config.duration || 3,
      fps: config.fps || 24,
      metadata: {
        provider: this.name,
        model: this.model,
        generatedAt: new Date(),
        durationMs: Date.now() - startTime,
        cost: this.estimateCost(config),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.request<{ status: string }>('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  async getJobStatus(jobId: string): Promise<VideoJobStatus> {
    const response = await this.request<PikaJobResponse>(
      `/api/jobs/${jobId}`
    );

    return this.mapJobStatus(response);
  }

  async listModels(): Promise<string[]> {
    return ['pika-1.0', 'pika-1.5'];
  }

  protected getCapabilities(): string[] {
    return [
      'text-to-video',
      'image-to-video',
      'video-to-video',
      'lip-sync',
      'style-transfer',
    ];
  }

  protected getLimits(): Record<string, number> {
    return {
      maxDuration: 4,
      maxWidth: 1920,
      maxHeight: 1080,
      maxFps: 24,
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.pika.art';
  }

  private buildRequest(config: VideoGenerationConfig): Record<string, unknown> {
    const request: Record<string, unknown> = {
      model: this.model,
      prompt: config.prompt,
      duration: config.duration || 3,
      width: config.width || 1024,
      height: config.height || 576,
      fps: config.fps || 24,
    };

    if (config.negativePrompt) {
      request.negativePrompt = config.negativePrompt;
    }

    if (config.startImage) {
      request.image = config.startImage;
    }

    if (config.seed !== undefined) {
      request.seed = config.seed;
    }

    // モーション強度
    if (config.motionStrength !== undefined) {
      request.motion = config.motionStrength;
    }

    // カメラモーション
    if (config.cameraMotion) {
      request.camera = {
        zoom: config.cameraMotion.zoom || 0,
        pan: config.cameraMotion.pan || 0,
        tilt: config.cameraMotion.tilt || 0,
        rotate: config.cameraMotion.roll || 0,
      };
    }

    // スタイルプリセット
    if (config.style) {
      request.style = this.mapStyle(config.style);
    }

    return request;
  }

  private mapStyle(style: string): string {
    const styleMap: Record<string, string> = {
      cinematic: 'cinematic',
      anime: 'anime',
      '3d': '3d-render',
      realistic: 'photorealistic',
      artistic: 'artistic',
      fantasy: 'fantasy',
      'sci-fi': 'sci-fi',
    };

    return styleMap[style.toLowerCase()] || style;
  }

  private async waitForCompletion(
    jobId: string,
    timeout = 300000
  ): Promise<VideoJobStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await this.sleep(this.pollingInterval);
    }

    throw new Error('Video generation timeout');
  }

  private mapJobStatus(response: PikaJobResponse): VideoJobStatus {
    const statusMap: Record<string, VideoJobStatus['status']> = {
      queued: 'pending',
      processing: 'processing',
      completed: 'completed',
      failed: 'failed',
    };

    const status: VideoJobStatus = {
      jobId: response.id,
      status: statusMap[response.status] || 'pending',
      progress: response.progress,
    };

    if (response.video) {
      status.result = {
        video: '',
        videoUrl: response.video.url,
        format: 'mp4',
        width: response.video.width,
        height: response.video.height,
        durationSeconds: response.video.duration,
        fps: 24,
        metadata: {
          provider: this.name,
          model: this.model,
          generatedAt: new Date(),
          durationMs: 0,
        },
      };
    }

    if (response.error) {
      status.error = response.error;
    }

    return status;
  }

  private async fetchVideo(url: string): Promise<string> {
    if (!url) return '';

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private estimateCost(config: VideoGenerationConfig): number {
    const duration = config.duration || 3;
    // Pika pricing: approximately $0.04 per second
    return duration * 0.04;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
