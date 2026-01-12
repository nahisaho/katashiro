/**
 * VideoGenerator
 * 動画生成エンジン
 * REQ-MEDIA-003: 動画生成
 */

import type {
  Slide,
  VideoOptions,
  VideoOutput,
  VideoMetadata,
  AudioInput,
  TextOverlay,
  VideoInput,
  SlideshowConfig,
  Resolution,
  ResolutionPreset,
  VideoGeneratorOptions,
} from './types.js';

import {
  DEFAULT_VIDEO_OPTIONS,
  DEFAULT_TRANSITION,
  RESOLUTION_PRESETS,
  VideoGeneratorError,
  VIDEO_ERROR_CODES,
} from './types.js';

import { FrameComposer, generateTimeline } from './FrameComposer.js';

/**
 * 動画生成クラス
 */
export class VideoGenerator {
  // @ts-expect-error Reserved for future FFmpeg integration
  private readonly _options: VideoGeneratorOptions;
  private readonly defaultVideoOptions: VideoOptions;

  constructor(options: VideoGeneratorOptions = {}) {
    this._options = options;
    this.defaultVideoOptions = { ...DEFAULT_VIDEO_OPTIONS };
  }

  /**
   * スライドショー動画を作成
   * REQ-MEDIA-003-001: スライドショー動画
   */
  async createSlideshow(
    slides: Slide[],
    options?: VideoOptions
  ): Promise<VideoOutput> {
    // バリデーション
    if (!slides || slides.length === 0) {
      throw new VideoGeneratorError(
        'スライドが指定されていません',
        VIDEO_ERROR_CODES.INVALID_INPUT,
        { slides }
      );
    }

    for (let i = 0; i < slides.length; i++) {
      this.validateSlide(slides[i]!, i);
    }

    const mergedOptions = this.mergeOptions(options);
    const resolution = this.resolveResolution(mergedOptions);
    const frameRate = mergedOptions.frameRate ?? DEFAULT_VIDEO_OPTIONS.frameRate;

    // フレームコンポーザーを作成
    const composer = new FrameComposer(resolution, mergedOptions.backgroundColor);

    // タイムラインを生成
    const timeline = generateTimeline(slides, frameRate);

    // フレームを生成（モック実装ではSVGデータを返す）
    const _frames: string[] = [];
    for (const frameInfo of timeline) {
      const slide = slides[frameInfo.slideIndex]!;
      const nextSlide = slides[frameInfo.slideIndex + 1];
      const frame = composer.composeSlideFrame(slide, frameInfo, nextSlide);
      _frames.push(frame);
    }

    // 合計時間を計算
    const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);

    // メタデータを作成
    const metadata: VideoMetadata = {
      format: mergedOptions.format ?? DEFAULT_VIDEO_OPTIONS.format,
      codec: mergedOptions.videoCodec ?? DEFAULT_VIDEO_OPTIONS.videoCodec,
      resolution,
      frameRate,
      videoBitrate: mergedOptions.videoBitrate ?? DEFAULT_VIDEO_OPTIONS.videoBitrate,
      audioBitrate: mergedOptions.audioBitrate,
      duration: totalDuration,
      fileSize: this.estimateFileSize(totalDuration, mergedOptions),
      slideCount: slides.length,
      createdAt: new Date().toISOString(),
      ...mergedOptions.metadata,
    };

    // モック出力を生成
    const output = this.createMockOutput(_frames, metadata, mergedOptions);

    return output;
  }

  /**
   * スライドショー設定から動画を作成
   */
  async createFromConfig(config: SlideshowConfig): Promise<VideoOutput> {
    // デフォルトトランジションを適用
    const slides = config.slides.map(slide => ({
      ...slide,
      transition: slide.transition ?? config.defaultTransition ?? DEFAULT_TRANSITION,
    }));

    // 動画を生成
    const video = await this.createSlideshow(slides, config.options);

    // 背景音楽を追加
    if (config.backgroundMusic) {
      return this.addAudioTrack(
        { source: 'generated' },
        config.backgroundMusic,
        video
      );
    }

    return video;
  }

  /**
   * 音声トラックを追加
   */
  async addAudioTrack(
    _video: VideoInput,
    audio: AudioInput,
    existingVideo?: VideoOutput
  ): Promise<VideoOutput> {
    // バリデーション
    if (!audio.source) {
      throw new VideoGeneratorError(
        '音声ソースが指定されていません',
        VIDEO_ERROR_CODES.AUDIO_ERROR,
        { audio }
      );
    }

    // 既存の動画出力がある場合はそれを使用
    if (existingVideo) {
      // 音声を追加したことを示すメタデータを更新
      return {
        ...existingVideo,
        metadata: {
          ...existingVideo.metadata,
          audioBitrate: DEFAULT_VIDEO_OPTIONS.audioBitrate,
        },
      };
    }

    // VideoInputからの処理（モック実装）
    const mockDuration = 30; // デフォルト30秒
    const resolution = RESOLUTION_PRESETS['1080p'];

    const metadata: VideoMetadata = {
      format: 'mp4',
      codec: 'h264',
      resolution,
      frameRate: 30,
      videoBitrate: 5000,
      audioBitrate: 192,
      duration: mockDuration,
      fileSize: this.estimateFileSize(mockDuration, this.defaultVideoOptions),
      createdAt: new Date().toISOString(),
    };

    return {
      data: this.generateMockVideoData(mockDuration),
      format: 'mp4',
      fileSize: metadata.fileSize,
      duration: mockDuration,
      resolution,
      frameRate: 30,
      metadata,
    };
  }

  /**
   * テキストオーバーレイを追加
   * REQ-MEDIA-003-002: テキストオーバーレイ
   */
  async addTextOverlay(
    _video: VideoInput,
    overlays: TextOverlay[]
  ): Promise<VideoOutput> {
    // バリデーション
    if (!overlays || overlays.length === 0) {
      throw new VideoGeneratorError(
        'オーバーレイが指定されていません',
        VIDEO_ERROR_CODES.INVALID_INPUT,
        { overlays }
      );
    }

    for (const overlay of overlays) {
      if (!overlay.text) {
        throw new VideoGeneratorError(
          'オーバーレイテキストが空です',
          VIDEO_ERROR_CODES.INVALID_INPUT,
          { overlay }
        );
      }
    }

    // モック実装
    const mockDuration = 30;
    const resolution = RESOLUTION_PRESETS['1080p'];

    const metadata: VideoMetadata = {
      format: 'mp4',
      codec: 'h264',
      resolution,
      frameRate: 30,
      videoBitrate: 5000,
      duration: mockDuration,
      fileSize: this.estimateFileSize(mockDuration, this.defaultVideoOptions),
      createdAt: new Date().toISOString(),
    };

    return {
      data: this.generateMockVideoData(mockDuration),
      format: 'mp4',
      fileSize: metadata.fileSize,
      duration: mockDuration,
      resolution,
      frameRate: 30,
      metadata,
    };
  }

  /**
   * 動画をトリム
   */
  async trim(
    _video: VideoInput,
    startTime: number,
    endTime: number
  ): Promise<VideoOutput> {
    if (startTime < 0 || endTime <= startTime) {
      throw new VideoGeneratorError(
        '無効な時間範囲です',
        VIDEO_ERROR_CODES.INVALID_OPTIONS,
        { startTime, endTime }
      );
    }

    const duration = endTime - startTime;
    const resolution = RESOLUTION_PRESETS['1080p'];

    const metadata: VideoMetadata = {
      format: 'mp4',
      codec: 'h264',
      resolution,
      frameRate: 30,
      videoBitrate: 5000,
      duration,
      fileSize: this.estimateFileSize(duration, this.defaultVideoOptions),
      createdAt: new Date().toISOString(),
    };

    return {
      data: this.generateMockVideoData(duration),
      format: 'mp4',
      fileSize: metadata.fileSize,
      duration,
      resolution,
      frameRate: 30,
      metadata,
    };
  }

  /**
   * 動画を結合
   */
  async concat(videos: VideoInput[]): Promise<VideoOutput> {
    if (!videos || videos.length === 0) {
      throw new VideoGeneratorError(
        '結合する動画が指定されていません',
        VIDEO_ERROR_CODES.INVALID_INPUT,
        { videos }
      );
    }

    // モック実装
    const mockDuration = videos.length * 30;
    const resolution = RESOLUTION_PRESETS['1080p'];

    const metadata: VideoMetadata = {
      format: 'mp4',
      codec: 'h264',
      resolution,
      frameRate: 30,
      videoBitrate: 5000,
      duration: mockDuration,
      fileSize: this.estimateFileSize(mockDuration, this.defaultVideoOptions),
      createdAt: new Date().toISOString(),
    };

    return {
      data: this.generateMockVideoData(mockDuration),
      format: 'mp4',
      fileSize: metadata.fileSize,
      duration: mockDuration,
      resolution,
      frameRate: 30,
      metadata,
    };
  }

  /**
   * GIFを生成
   */
  async createGif(
    slides: Slide[],
    options?: VideoOptions
  ): Promise<VideoOutput> {
    const mergedOptions: VideoOptions = {
      ...options,
      format: 'gif',
      resolution: options?.resolution ?? '480p',
      frameRate: options?.frameRate ?? 15,
    };

    const video = await this.createSlideshow(slides, mergedOptions);
    return {
      ...video,
      format: 'gif',
    };
  }

  /**
   * サポートされているフォーマットを取得
   */
  getSupportedFormats(): string[] {
    return ['mp4', 'webm', 'mov', 'gif'];
  }

  /**
   * 解像度プリセットを取得
   */
  getResolutionPreset(preset: ResolutionPreset): Resolution {
    return RESOLUTION_PRESETS[preset];
  }

  /**
   * 推定ファイルサイズを計算
   */
  estimateFileSize(duration: number, options?: VideoOptions): number {
    const videoBitrate = options?.videoBitrate ?? DEFAULT_VIDEO_OPTIONS.videoBitrate;
    const audioBitrate = options?.audioBitrate ?? 0;
    
    // ビットレート（kbps）から秒あたりのバイト数を計算
    const bytesPerSecond = (videoBitrate + audioBitrate) * 1000 / 8;
    return Math.round(bytesPerSecond * duration);
  }

  /**
   * スライドをバリデート
   */
  private validateSlide(slide: Slide, index: number): void {
    if (!slide.id) {
      throw new VideoGeneratorError(
        `スライド${index + 1}: IDが指定されていません`,
        VIDEO_ERROR_CODES.INVALID_SLIDE,
        { index, slide }
      );
    }

    if (!slide.imageSource) {
      throw new VideoGeneratorError(
        `スライド${index + 1}: 画像ソースが指定されていません`,
        VIDEO_ERROR_CODES.INVALID_SLIDE,
        { index, slide }
      );
    }

    if (typeof slide.duration !== 'number' || slide.duration <= 0) {
      throw new VideoGeneratorError(
        `スライド${index + 1}: 無効な表示時間です`,
        VIDEO_ERROR_CODES.INVALID_SLIDE,
        { index, slide }
      );
    }
  }

  /**
   * オプションをマージ
   */
  private mergeOptions(options?: VideoOptions): VideoOptions {
    return {
      ...this.defaultVideoOptions,
      ...options,
    };
  }

  /**
   * 解像度を解決
   */
  private resolveResolution(options: VideoOptions): Resolution {
    if (typeof options.resolution === 'string') {
      return RESOLUTION_PRESETS[options.resolution as ResolutionPreset];
    }
    return options.resolution ?? RESOLUTION_PRESETS['1080p'];
  }

  /**
   * モック出力を作成
   */
  private createMockOutput(
    _frames: string[],
    metadata: VideoMetadata,
    options: VideoOptions
  ): VideoOutput {
    const resolution = this.resolveResolution(options);

    return {
      data: this.generateMockVideoData(metadata.duration),
      format: options.format ?? 'mp4',
      fileSize: metadata.fileSize,
      duration: metadata.duration,
      resolution,
      frameRate: options.frameRate ?? DEFAULT_VIDEO_OPTIONS.frameRate,
      metadata,
    };
  }

  /**
   * モック動画データを生成
   */
  private generateMockVideoData(duration: number): string {
    // 実際の実装ではFFmpegで動画を生成
    // モック実装ではダミーのBase64データを返す
    const mockHeader = `MOCK_VIDEO_DATA_${duration}s_`;
    return Buffer.from(mockHeader).toString('base64');
  }
}

/**
 * VideoGeneratorのファクトリ関数
 */
export function createVideoGenerator(
  options?: VideoGeneratorOptions
): VideoGenerator {
  return new VideoGenerator(options);
}

// デフォルトエクスポート
export default VideoGenerator;
