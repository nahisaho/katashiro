/**
 * Runway ML Provider
 *
 * Runway Gen-2/Gen-3 動画生成プロバイダー
 *
 * @task TASK-012-2
 */

import type { VideoGenerationConfig, VideoGenerationResult } from '../../types.js';
import {
  BaseVideoProvider,
  VideoProviderConfig,
  VideoJobStatus,
} from '../VideoProviderInterface.js';

/**
 * Runway モデル
 */
export type RunwayModel = 'gen-2' | 'gen-3-alpha';

/**
 * Runway プロバイダー設定
 */
export interface RunwayProviderConfig extends VideoProviderConfig {
  type: 'runway';
  model?: RunwayModel;
  /** ポーリング間隔（ミリ秒） */
  pollingInterval?: number;
}

/**
 * Runway API レスポンス
 */
interface RunwayGenerationResponse {
  id: string;
  status: string;
  createdAt: string;
}

interface RunwayJobResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  output?: {
    url: string;
    duration: number;
  }[];
  failure?: string;
}

/**
 * Runway ML 動画生成プロバイダー
 */
export class RunwayProvider extends BaseVideoProvider {
  readonly name = 'Runway';
  readonly type = 'runway';

  private readonly model: RunwayModel;
  private readonly pollingInterval: number;

  constructor(config: RunwayProviderConfig) {
    super(config);
    this.model = config.model || 'gen-2';
    this.pollingInterval = config.pollingInterval || 5000;
  }

  async generate(config: VideoGenerationConfig): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    // 生成リクエスト
    const response = await this.request<RunwayGenerationResponse>(
      '/v1/generations',
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
      width: config.width || 1280,
      height: config.height || 720,
      durationSeconds: result.result?.durationSeconds || config.duration || 4,
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
      await this.request<{ status: string }>('/v1/health');
      return true;
    } catch {
      return false;
    }
  }

  async getJobStatus(jobId: string): Promise<VideoJobStatus> {
    const response = await this.request<RunwayJobResponse>(
      `/v1/generations/${jobId}`
    );

    return this.mapJobStatus(response);
  }

  async listModels(): Promise<string[]> {
    return ['gen-2', 'gen-3-alpha'];
  }

  protected getCapabilities(): string[] {
    return [
      'text-to-video',
      'image-to-video',
      'video-extension',
      'motion-brush',
      'camera-control',
    ];
  }

  protected getLimits(): Record<string, number> {
    return {
      maxDuration: this.model === 'gen-3-alpha' ? 10 : 4,
      maxWidth: 1920,
      maxHeight: 1080,
      maxFps: 24,
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.runwayml.com';
  }

  private buildRequest(config: VideoGenerationConfig): Record<string, unknown> {
    const request: Record<string, unknown> = {
      model: this.model,
      promptText: config.prompt,
      duration: config.duration || 4,
      aspectRatio: this.getAspectRatio(config),
    };

    if (config.negativePrompt) {
      request.negativePrompt = config.negativePrompt;
    }

    if (config.startImage) {
      request.imageAsset = config.startImage;
    }

    if (config.seed !== undefined) {
      request.seed = config.seed;
    }

    // カメラモーション
    if (config.cameraMotion) {
      request.camera = {
        zoom: config.cameraMotion.zoom,
        pan: config.cameraMotion.pan,
        tilt: config.cameraMotion.tilt,
        roll: config.cameraMotion.roll,
      };
    }

    return request;
  }

  private getAspectRatio(config: VideoGenerationConfig): string {
    const width = config.width || 1280;
    const height = config.height || 720;
    const ratio = width / height;

    if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    return '16:9';
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

  private mapJobStatus(response: RunwayJobResponse): VideoJobStatus {
    const statusMap: Record<string, VideoJobStatus['status']> = {
      PENDING: 'pending',
      RUNNING: 'processing',
      SUCCEEDED: 'completed',
      FAILED: 'failed',
    };

    const status: VideoJobStatus = {
      jobId: response.id,
      status: statusMap[response.status] || 'pending',
      progress: response.progress,
    };

    if (response.output && response.output.length > 0) {
      const output = response.output[0]!;
      status.result = {
        video: '', // URLから取得が必要
        videoUrl: output.url,
        format: 'mp4',
        width: 1280,
        height: 720,
        durationSeconds: output.duration,
        fps: 24,
        metadata: {
          provider: this.name,
          model: this.model,
          generatedAt: new Date(),
          durationMs: 0,
        },
      };
    }

    if (response.failure) {
      status.error = response.failure;
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
    const duration = config.duration || 4;
    // Runway pricing: approximately $0.05 per second for Gen-2
    const costPerSecond = this.model === 'gen-3-alpha' ? 0.10 : 0.05;
    return duration * costPerSecond;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
