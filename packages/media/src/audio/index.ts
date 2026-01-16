/**
 * 音声合成モジュール エクスポート
 *
 * @module @nahisaho/katashiro-media/audio
 * @task TASK-011
 */

export { AudioSynthesizer, type AudioSynthesizerConfig } from './AudioSynthesizer.js';
export {
  BaseAudioProvider,
  type AudioProviderInterface,
} from './AudioProviderInterface.js';
export {
  OpenAITTSProvider,
  type OpenAITTSProviderConfig,
  type OpenAITTSModel,
  type OpenAIVoice,
} from './providers/OpenAITTSProvider.js';
export {
  ElevenLabsProvider,
  type ElevenLabsProviderConfig,
  type ElevenLabsModel,
} from './providers/ElevenLabsProvider.js';
