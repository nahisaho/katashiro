/**
 * Video Generator Tests
 * REQ-MEDIA-003: 動画生成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VideoGenerator,
  createVideoGenerator,
  FrameComposer,
  generateTimeline,
  RESOLUTION_PRESETS,
  getResolutionForAspectRatio,
  DEFAULT_VIDEO_OPTIONS,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSITION,
  VIDEO_ERROR_CODES,
  VideoGeneratorError,
  type Slide,
  type VideoOptions,
  type TextOverlay,
  type SlideshowConfig,
} from '../src/video/index.js';

describe('VideoGenerator', () => {
  let generator: VideoGenerator;

  beforeEach(() => {
    generator = new VideoGenerator();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const gen = new VideoGenerator();
      expect(gen).toBeInstanceOf(VideoGenerator);
    });

    it('should create instance with custom options', () => {
      const gen = new VideoGenerator({
        ffmpegPath: '/usr/bin/ffmpeg',
        tempDir: '/tmp/video',
      });
      expect(gen).toBeInstanceOf(VideoGenerator);
    });
  });

  describe('createSlideshow', () => {
    const createTestSlides = (): Slide[] => [
      {
        id: 'slide-1',
        imageSource: 'data:image/png;base64,test1',
        duration: 3,
      },
      {
        id: 'slide-2',
        imageSource: 'data:image/png;base64,test2',
        duration: 5,
      },
    ];

    it('should create slideshow from slides', async () => {
      const slides = createTestSlides();
      const result = await generator.createSlideshow(slides);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.format).toBe('mp4');
      expect(result.duration).toBe(8); // 3 + 5
      expect(result.metadata.slideCount).toBe(2);
    });

    it('should create slideshow with custom options', async () => {
      const slides = createTestSlides();
      const options: VideoOptions = {
        format: 'webm',
        resolution: '720p',
        frameRate: 24,
      };

      const result = await generator.createSlideshow(slides, options);

      expect(result.format).toBe('webm');
      expect(result.frameRate).toBe(24);
      expect(result.resolution).toEqual(RESOLUTION_PRESETS['720p']);
    });

    it('should create slideshow with transitions', async () => {
      const slides: Slide[] = [
        {
          id: 'slide-1',
          imageSource: 'data:image/png;base64,test1',
          duration: 3,
          transition: { type: 'fade', duration: 1 },
        },
        {
          id: 'slide-2',
          imageSource: 'data:image/png;base64,test2',
          duration: 3,
          transition: { type: 'crossfade', duration: 1.5 },
        },
      ];

      const result = await generator.createSlideshow(slides);

      expect(result.duration).toBe(6);
    });

    it('should create slideshow with text overlays', async () => {
      const slides: Slide[] = [
        {
          id: 'slide-1',
          imageSource: 'data:image/png;base64,test1',
          duration: 5,
          overlays: [
            {
              text: 'タイトル',
              position: { horizontal: 'center', vertical: 'middle' },
              style: { fontSize: 64, color: '#FFFFFF' },
            },
          ],
        },
      ];

      const result = await generator.createSlideshow(slides);

      expect(result).toBeDefined();
    });

    it('should throw error for empty slides', async () => {
      await expect(generator.createSlideshow([])).rejects.toThrow(VideoGeneratorError);
    });

    it('should throw error for invalid slide', async () => {
      const invalidSlides = [
        { id: '', imageSource: 'test', duration: 3 },
      ];

      await expect(generator.createSlideshow(invalidSlides)).rejects.toThrow(VideoGeneratorError);
    });

    it('should throw error for missing image source', async () => {
      const invalidSlides = [
        { id: 'slide-1', imageSource: '', duration: 3 },
      ];

      await expect(generator.createSlideshow(invalidSlides)).rejects.toThrow(VideoGeneratorError);
    });

    it('should throw error for invalid duration', async () => {
      const invalidSlides = [
        { id: 'slide-1', imageSource: 'test', duration: -1 },
      ];

      await expect(generator.createSlideshow(invalidSlides)).rejects.toThrow(VideoGeneratorError);
    });
  });

  describe('createFromConfig', () => {
    it('should create video from config', async () => {
      const config: SlideshowConfig = {
        slides: [
          { id: 's1', imageSource: 'img1', duration: 3 },
          { id: 's2', imageSource: 'img2', duration: 4 },
        ],
        defaultTransition: { type: 'fade', duration: 1 },
        options: { resolution: '720p' },
      };

      const result = await generator.createFromConfig(config);

      expect(result.duration).toBe(7);
      expect(result.resolution).toEqual(RESOLUTION_PRESETS['720p']);
    });

    it('should apply default transition to all slides', async () => {
      const config: SlideshowConfig = {
        slides: [
          { id: 's1', imageSource: 'img1', duration: 3 },
          { id: 's2', imageSource: 'img2', duration: 3 },
        ],
        defaultTransition: { type: 'crossfade', duration: 0.5 },
      };

      const result = await generator.createFromConfig(config);

      expect(result).toBeDefined();
    });

    it('should add background music when provided', async () => {
      const config: SlideshowConfig = {
        slides: [
          { id: 's1', imageSource: 'img1', duration: 5 },
        ],
        backgroundMusic: {
          source: 'music.mp3',
          volume: 0.5,
          fadeIn: 2,
          fadeOut: 2,
        },
      };

      const result = await generator.createFromConfig(config);

      expect(result.metadata.audioBitrate).toBeDefined();
    });
  });

  describe('addAudioTrack', () => {
    it('should add audio to video', async () => {
      const result = await generator.addAudioTrack(
        { source: 'video.mp4' },
        { source: 'audio.mp3', volume: 0.8 }
      );

      expect(result).toBeDefined();
      expect(result.metadata.audioBitrate).toBeDefined();
    });

    it('should throw error for missing audio source', async () => {
      await expect(
        generator.addAudioTrack(
          { source: 'video.mp4' },
          { source: '' }
        )
      ).rejects.toThrow(VideoGeneratorError);
    });

    it('should handle audio with fade effects', async () => {
      const result = await generator.addAudioTrack(
        { source: 'video.mp4' },
        { source: 'audio.mp3', fadeIn: 2, fadeOut: 3 }
      );

      expect(result).toBeDefined();
    });
  });

  describe('addTextOverlay', () => {
    it('should add text overlay to video', async () => {
      const overlays: TextOverlay[] = [
        {
          text: 'テストテキスト',
          position: { horizontal: 'center', vertical: 'bottom' },
          style: { fontSize: 48 },
        },
      ];

      const result = await generator.addTextOverlay(
        { source: 'video.mp4' },
        overlays
      );

      expect(result).toBeDefined();
    });

    it('should handle multiple overlays', async () => {
      const overlays: TextOverlay[] = [
        {
          text: 'タイトル',
          position: { horizontal: 'center', vertical: 'top' },
          style: { fontSize: 64 },
        },
        {
          text: 'サブタイトル',
          position: { horizontal: 'center', vertical: 'bottom' },
          style: { fontSize: 32 },
        },
      ];

      const result = await generator.addTextOverlay(
        { source: 'video.mp4' },
        overlays
      );

      expect(result).toBeDefined();
    });

    it('should throw error for empty overlays', async () => {
      await expect(
        generator.addTextOverlay({ source: 'video.mp4' }, [])
      ).rejects.toThrow(VideoGeneratorError);
    });

    it('should throw error for empty text', async () => {
      await expect(
        generator.addTextOverlay(
          { source: 'video.mp4' },
          [{ text: '', position: { horizontal: 'center', vertical: 'middle' }, style: {} }]
        )
      ).rejects.toThrow(VideoGeneratorError);
    });
  });

  describe('trim', () => {
    it('should trim video', async () => {
      const result = await generator.trim(
        { source: 'video.mp4' },
        5,
        15
      );

      expect(result.duration).toBe(10);
    });

    it('should throw error for invalid time range', async () => {
      await expect(
        generator.trim({ source: 'video.mp4' }, 10, 5)
      ).rejects.toThrow(VideoGeneratorError);
    });

    it('should throw error for negative start time', async () => {
      await expect(
        generator.trim({ source: 'video.mp4' }, -5, 10)
      ).rejects.toThrow(VideoGeneratorError);
    });
  });

  describe('concat', () => {
    it('should concatenate videos', async () => {
      const result = await generator.concat([
        { source: 'video1.mp4' },
        { source: 'video2.mp4' },
        { source: 'video3.mp4' },
      ]);

      expect(result.duration).toBe(90); // 3 * 30秒（モック）
    });

    it('should throw error for empty videos array', async () => {
      await expect(generator.concat([])).rejects.toThrow(VideoGeneratorError);
    });
  });

  describe('createGif', () => {
    it('should create GIF from slides', async () => {
      const slides: Slide[] = [
        { id: 's1', imageSource: 'img1', duration: 2 },
        { id: 's2', imageSource: 'img2', duration: 2 },
      ];

      const result = await generator.createGif(slides);

      expect(result.format).toBe('gif');
    });

    it('should use lower frame rate for GIF', async () => {
      const slides: Slide[] = [
        { id: 's1', imageSource: 'img1', duration: 2 },
      ];

      const result = await generator.createGif(slides);

      expect(result.frameRate).toBe(15);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const formats = generator.getSupportedFormats();

      expect(formats).toContain('mp4');
      expect(formats).toContain('webm');
      expect(formats).toContain('gif');
    });
  });

  describe('getResolutionPreset', () => {
    it('should return resolution for preset', () => {
      const res = generator.getResolutionPreset('1080p');

      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
    });
  });

  describe('estimateFileSize', () => {
    it('should estimate file size', () => {
      const size = generator.estimateFileSize(60, { videoBitrate: 5000 });

      expect(size).toBeGreaterThan(0);
    });

    it('should include audio bitrate in estimate', () => {
      const sizeWithAudio = generator.estimateFileSize(60, {
        videoBitrate: 5000,
        audioBitrate: 192,
      });
      const sizeWithoutAudio = generator.estimateFileSize(60, {
        videoBitrate: 5000,
      });

      expect(sizeWithAudio).toBeGreaterThan(sizeWithoutAudio);
    });
  });
});

describe('createVideoGenerator', () => {
  it('should create VideoGenerator instance', () => {
    const generator = createVideoGenerator();
    expect(generator).toBeInstanceOf(VideoGenerator);
  });

  it('should pass options to constructor', () => {
    const generator = createVideoGenerator({
      logLevel: 'verbose',
    });
    expect(generator).toBeInstanceOf(VideoGenerator);
  });
});

describe('FrameComposer', () => {
  let composer: FrameComposer;

  beforeEach(() => {
    composer = new FrameComposer({ width: 1920, height: 1080 });
  });

  describe('composeSlideFrame', () => {
    it('should compose basic frame', () => {
      const slide: Slide = {
        id: 'test',
        imageSource: 'data:image/png;base64,test',
        duration: 5,
      };

      const frame = composer.composeSlideFrame(slide, {
        frameNumber: 0,
        time: 0,
        slideIndex: 0,
        inTransition: false,
      });

      expect(frame).toContain('<svg');
      expect(frame).toContain('</svg>');
      expect(frame).toContain('image');
    });

    it('should include text overlay', () => {
      const slide: Slide = {
        id: 'test',
        imageSource: 'test.png',
        duration: 5,
        overlays: [
          {
            text: 'テスト',
            position: { horizontal: 'center', vertical: 'middle' },
            style: {},
          },
        ],
      };

      const frame = composer.composeSlideFrame(slide, {
        frameNumber: 0,
        time: 0,
        slideIndex: 0,
        inTransition: false,
      });

      expect(frame).toContain('テスト');
    });

    it('should apply transition effect', () => {
      const slide: Slide = {
        id: 'test1',
        imageSource: 'test1.png',
        duration: 3,
        transition: { type: 'crossfade', duration: 1 },
      };
      const nextSlide: Slide = {
        id: 'test2',
        imageSource: 'test2.png',
        duration: 3,
      };

      const frame = composer.composeSlideFrame(slide, {
        frameNumber: 90,
        time: 2.5,
        slideIndex: 0,
        inTransition: true,
        transitionProgress: 0.5,
      }, nextSlide);

      expect(frame).toContain('opacity');
    });
  });

  describe('renderTextOverlay', () => {
    it('should render text with style', () => {
      const overlay: TextOverlay = {
        text: 'スタイルテスト',
        position: { horizontal: 'left', vertical: 'top' },
        style: {
          fontSize: 48,
          color: '#FF0000',
          fontWeight: 'bold',
        },
      };

      const svg = composer.renderTextOverlay(overlay, 0);

      expect(svg).toContain('font-size="48"');
      expect(svg).toContain('fill="#FF0000"');
      expect(svg).toContain('font-weight="bold"');
    });

    it('should apply animation', () => {
      const overlay: TextOverlay = {
        text: 'アニメーション',
        position: { horizontal: 'center', vertical: 'middle' },
        style: {},
        animation: {
          type: 'fade-in',
          duration: 1,
        },
      };

      const frameMid = composer.renderTextOverlay(overlay, 0.5);
      expect(frameMid).toContain('opacity');
    });
  });
});

describe('generateTimeline', () => {
  it('should generate timeline for slides', () => {
    const slides: Slide[] = [
      { id: 's1', imageSource: 'img1', duration: 2 },
      { id: 's2', imageSource: 'img2', duration: 3 },
    ];

    const timeline = generateTimeline(slides, 30);

    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].frameNumber).toBe(0);
    expect(timeline[0].slideIndex).toBe(0);
  });

  it('should mark transition frames', () => {
    const slides: Slide[] = [
      { id: 's1', imageSource: 'img1', duration: 2, transition: { type: 'fade', duration: 0.5 } },
      { id: 's2', imageSource: 'img2', duration: 2 },
    ];

    const timeline = generateTimeline(slides, 30);
    const transitionFrames = timeline.filter(f => f.inTransition);

    expect(transitionFrames.length).toBeGreaterThan(0);
  });
});

describe('Constants', () => {
  describe('RESOLUTION_PRESETS', () => {
    it('should have common presets', () => {
      expect(RESOLUTION_PRESETS['4k']).toEqual({ width: 3840, height: 2160 });
      expect(RESOLUTION_PRESETS['1080p']).toEqual({ width: 1920, height: 1080 });
      expect(RESOLUTION_PRESETS['720p']).toEqual({ width: 1280, height: 720 });
    });
  });

  describe('getResolutionForAspectRatio', () => {
    it('should calculate resolution for 16:9', () => {
      const res = getResolutionForAspectRatio('16:9', 1080);
      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
    });

    it('should calculate resolution for 9:16 (vertical)', () => {
      const res = getResolutionForAspectRatio('9:16', 1920);
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1920);
    });

    it('should calculate resolution for 1:1 (square)', () => {
      const res = getResolutionForAspectRatio('1:1', 1080);
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1080);
    });
  });

  describe('DEFAULT_VIDEO_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_VIDEO_OPTIONS.format).toBe('mp4');
      expect(DEFAULT_VIDEO_OPTIONS.videoCodec).toBe('h264');
      expect(DEFAULT_VIDEO_OPTIONS.frameRate).toBe(30);
      expect(DEFAULT_VIDEO_OPTIONS.resolution).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('DEFAULT_TEXT_STYLE', () => {
    it('should have readable defaults', () => {
      expect(DEFAULT_TEXT_STYLE.fontFamily).toBeDefined();
      expect(DEFAULT_TEXT_STYLE.fontSize).toBeGreaterThan(0);
      expect(DEFAULT_TEXT_STYLE.color).toBeDefined();
    });
  });

  describe('DEFAULT_TRANSITION', () => {
    it('should have default transition', () => {
      expect(DEFAULT_TRANSITION.type).toBe('crossfade');
      expect(DEFAULT_TRANSITION.duration).toBe(1.0);
    });
  });
});

describe('VideoGeneratorError', () => {
  it('should create error with code and message', () => {
    const error = new VideoGeneratorError(
      'Test error',
      VIDEO_ERROR_CODES.INVALID_INPUT
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(VIDEO_ERROR_CODES.INVALID_INPUT);
    expect(error.name).toBe('VideoGeneratorError');
  });

  it('should include details', () => {
    const error = new VideoGeneratorError(
      'Error with details',
      VIDEO_ERROR_CODES.INVALID_SLIDE,
      { slideIndex: 0 }
    );

    expect(error.details).toEqual({ slideIndex: 0 });
  });
});
