/**
 * Video Module - 動画生成モジュール
 * REQ-MEDIA-003: 動画生成
 */

// 型定義
export type {
  VideoFormat,
  VideoCodec,
  AudioCodec,
  ResolutionPreset,
  AspectRatio,
  TransitionType,
  TextAnimationType,
  HorizontalPosition,
  VerticalPosition,
  Resolution,
  Slide,
  TransitionConfig,
  KenBurnsEffect,
  TextOverlay,
  TextStyle,
  TextAnimation,
  AudioInput,
  VideoOptions,
  VideoMetadataInput,
  VideoOutput,
  VideoMetadata,
  VideoInput,
  SlideshowConfig,
  VideoGeneratorOptions,
} from './types.js';

// 定数
export {
  RESOLUTION_PRESETS,
  getResolutionForAspectRatio,
  DEFAULT_VIDEO_OPTIONS,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSITION,
  VideoGeneratorError,
  VIDEO_ERROR_CODES,
} from './types.js';

// フレームコンポーザー
export {
  FrameComposer,
  generateTimeline,
  type FrameInfo,
  type RenderedFrame,
} from './FrameComposer.js';

// メインクラス
export { VideoGenerator, createVideoGenerator } from './VideoGenerator.js';
export { default } from './VideoGenerator.js';
