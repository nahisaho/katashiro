/**
 * KATASHIRO Media Package
 *
 * 画像・音声・動画生成機能を提供するパッケージ
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-009-3
 */

// ============================================================
// 型定義のエクスポート
// ============================================================

export type {
  // 共通
  MediaProvider,
  MediaGenerationOptions,
  GenerationMetadata,
  MediaErrorCode,
  MediaError,
  MediaProviderInfo,
  // 画像
  ImageSize,
  ImageStyle,
  ImageFormat,
  ImageGenerationConfig,
  ImageGenerationResult,
  GeneratedImage,
  ImageProviderType,
  ImageProviderConfig,
  // 音声合成
  AudioFormat,
  AudioSynthesisConfig,
  AudioSynthesisResult,
  TTSProviderType,
  TTSProviderConfig,
  // 音声文字起こし
  TranscriptionConfig,
  TranscriptionSegment,
  TranscriptionWord,
  TranscriptionResult,
  STTProviderType,
  STTProviderConfig,
  // 動画
  VideoFormat,
  VideoResolution,
  VideoGenerationConfig,
  VideoGenerationResult,
  VideoProviderType,
  VideoProviderConfig,
  CameraMotion,
} from './types.js';

// ============================================================
// クラスのエクスポート
// ============================================================

// TASK-010: ImageGenerator
export {
  ImageGenerator,
  type ImageGeneratorConfig,
  BaseImageProvider,
  type ImageProviderInterface,
  DalleProvider,
  type DalleProviderConfig,
  type DalleModel,
  StabilityProvider,
  type StabilityProviderConfig,
  type StabilityModel,
  PromptEnhancer,
  type PromptEnhanceOptions,
  type EnhancedPrompt,
} from './image/index.js';

// TASK-011: AudioSynthesizer
export {
  AudioSynthesizer,
  type AudioSynthesizerConfig,
  BaseAudioProvider,
  type AudioProviderInterface,
  OpenAITTSProvider,
  type OpenAITTSProviderConfig,
  type OpenAITTSModel,
  type OpenAIVoice,
  ElevenLabsProvider,
  type ElevenLabsProviderConfig,
  type ElevenLabsModel,
} from './audio/index.js';

// TASK-012: VideoGenerator
export {
  VideoGenerator,
  type VideoGeneratorConfig,
  BaseVideoProvider,
  type VideoProviderInterface,
  type VideoJobStatus,
  RunwayProvider,
  type RunwayProviderConfig,
  type RunwayModel,
  PikaProvider,
  type PikaProviderConfig,
  type PikaModel,
} from './video/index.js';

// TASK-013: AudioTranscriber
export {
  AudioTranscriber,
  type AudioTranscriberConfig,
  type ExtendedTranscriptionResult,
  BaseTranscriptionProvider,
  type TranscriptionProviderInterface,
  type TranscriptionProviderConfig,
  WhisperProvider,
  type WhisperProviderConfig,
  type WhisperModel,
  SpeakerLabeler,
  type Speaker,
  type SpeakerDiarizationConfig,
  type SpeakerDiarizationResult,
  type LabeledSegment,
} from './transcription/index.js';
