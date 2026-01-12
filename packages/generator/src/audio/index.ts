/**
 * Audio Module - 音声生成モジュール
 * REQ-MEDIA-005: 音声/ポッドキャスト生成
 */

// 型定義
export type {
  AudioProvider,
  AudioFormat,
  AudioQuality,
  VoiceGender,
  SpeakingStyle,
  LanguageCode,
  VoiceConfig,
  TTSOptions,
  SSMLElement,
  TextSegment,
  PodcastSpeaker,
  PodcastSegment,
  PodcastScript,
  AudioBuffer,
  GeneratedAudio,
  AudioMetadata,
  AvailableVoice,
  AudioGeneratorOptions,
} from './types.js';

// 定数
export {
  PRESET_VOICES,
  QUALITY_PRESETS,
  DEFAULT_TTS_OPTIONS,
  AUDIO_ERROR_CODES,
  AudioGeneratorError,
} from './types.js';

// SSMLビルダー
export { SSMLBuilder, buildSSML, segmentText } from './SSMLBuilder.js';

// メインクラス
export { AudioGenerator } from './AudioGenerator.js';
export { default } from './AudioGenerator.js';
