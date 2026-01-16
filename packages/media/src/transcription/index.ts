/**
 * Transcription module exports
 *
 * @task TASK-013-5
 */

export { AudioTranscriber } from './AudioTranscriber.js';
export type {
  AudioTranscriberConfig,
  ExtendedTranscriptionResult,
} from './AudioTranscriber.js';

export {
  BaseTranscriptionProvider,
  type TranscriptionProviderInterface,
  type TranscriptionProviderConfig,
} from './TranscriptionProviderInterface.js';

export { WhisperProvider } from './providers/WhisperProvider.js';
export type {
  WhisperProviderConfig,
  WhisperModel,
} from './providers/WhisperProvider.js';

export { SpeakerLabeler } from './SpeakerLabeler.js';
export type {
  Speaker,
  SpeakerDiarizationConfig,
  SpeakerDiarizationResult,
  LabeledSegment,
} from './SpeakerLabeler.js';
