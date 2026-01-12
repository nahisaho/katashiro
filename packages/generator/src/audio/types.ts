/**
 * Audio Generator Types
 * 音声生成の型定義
 * REQ-MEDIA-005: 音声/ポッドキャスト生成
 */

/**
 * 音声プロバイダー
 */
export type AudioProvider =
  | 'google-tts'
  | 'amazon-polly'
  | 'elevenlabs'
  | 'openai-tts'
  | 'azure-tts'
  | 'mock';

/**
 * 音声フォーマット
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'flac';

/**
 * 音声品質
 */
export type AudioQuality = 'low' | 'standard' | 'high' | 'ultra';

/**
 * 話者の性別
 */
export type VoiceGender = 'male' | 'female' | 'neutral';

/**
 * 話し方のスタイル
 */
export type SpeakingStyle =
  | 'neutral'
  | 'newscast'
  | 'conversational'
  | 'cheerful'
  | 'empathetic'
  | 'calm'
  | 'sad'
  | 'excited'
  | 'friendly'
  | 'hopeful'
  | 'shouting'
  | 'whispering'
  | 'narration';

/**
 * 言語コード
 */
export type LanguageCode =
  | 'ja-JP'
  | 'en-US'
  | 'en-GB'
  | 'zh-CN'
  | 'zh-TW'
  | 'ko-KR'
  | 'fr-FR'
  | 'de-DE'
  | 'es-ES'
  | 'it-IT'
  | 'pt-BR'
  | 'ru-RU';

/**
 * 音声設定
 */
export interface VoiceConfig {
  /** 音声ID */
  voiceId?: string;
  /** 音声名 */
  voiceName?: string;
  /** 性別 */
  gender?: VoiceGender;
  /** 言語 */
  language?: LanguageCode;
  /** 話し方スタイル */
  style?: SpeakingStyle;
  /** 話速 (0.5-2.0) */
  speed?: number;
  /** ピッチ (-20 to 20) */
  pitch?: number;
  /** 音量 (-96 to 16 dB) */
  volume?: number;
}

/**
 * テキスト読み上げオプション
 */
export interface TTSOptions {
  /** 音声設定 */
  voice?: VoiceConfig;
  /** プロバイダー */
  provider?: AudioProvider;
  /** 出力フォーマット */
  format?: AudioFormat;
  /** 品質 */
  quality?: AudioQuality;
  /** サンプルレート (Hz) */
  sampleRate?: number;
  /** ビットレート (kbps) */
  bitrate?: number;
  /** SSML有効化 */
  enableSSML?: boolean;
  /** 句読点での自動ポーズ */
  autoPause?: boolean;
}

/**
 * SSML要素
 */
export interface SSMLElement {
  /** 要素タイプ */
  type: 'break' | 'emphasis' | 'prosody' | 'say-as' | 'phoneme' | 'sub';
  /** 属性 */
  attributes: Record<string, string>;
  /** 内容 */
  content?: string;
}

/**
 * テキストセグメント
 */
export interface TextSegment {
  /** テキスト */
  text: string;
  /** 話者ID */
  speakerId?: string;
  /** 音声設定（オーバーライド） */
  voice?: Partial<VoiceConfig>;
  /** SSML要素 */
  ssml?: SSMLElement[];
  /** 前のポーズ（ミリ秒） */
  pauseBefore?: number;
  /** 後のポーズ（ミリ秒） */
  pauseAfter?: number;
}

/**
 * ポッドキャスト話者
 */
export interface PodcastSpeaker {
  /** 話者ID */
  id: string;
  /** 話者名 */
  name: string;
  /** 音声設定 */
  voice: VoiceConfig;
  /** 役割 */
  role?: 'host' | 'guest' | 'narrator';
}

/**
 * ポッドキャストセグメント
 */
export interface PodcastSegment {
  /** 話者ID */
  speakerId: string;
  /** テキスト */
  text: string;
  /** スタイル */
  style?: SpeakingStyle;
  /** 感情 */
  emotion?: string;
  /** 前のポーズ（ミリ秒） */
  pauseBefore?: number;
  /** 後のポーズ（ミリ秒） */
  pauseAfter?: number;
}

/**
 * ポッドキャストスクリプト
 */
export interface PodcastScript {
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** イントロテキスト */
  intro?: string;
  /** アウトロテキスト */
  outro?: string;
  /** 話者リスト */
  speakers: PodcastSpeaker[];
  /** セグメント */
  segments: PodcastSegment[];
  /** BGM設定 */
  backgroundMusic?: {
    /** 音声ファイルパス */
    path: string;
    /** 音量 (0-1) */
    volume: number;
    /** フェードイン（ミリ秒） */
    fadeIn?: number;
    /** フェードアウト（ミリ秒） */
    fadeOut?: number;
  };
}

/**
 * 音声バッファ
 */
export interface AudioBuffer {
  /** 生データ */
  data: Uint8Array;
  /** フォーマット */
  format: AudioFormat;
  /** サンプルレート */
  sampleRate: number;
  /** チャンネル数 */
  channels: number;
  /** 持続時間（秒） */
  duration: number;
  /** ビットレート */
  bitrate?: number;
}

/**
 * 生成された音声セグメント
 */
export interface GeneratedAudioSegment {
  /** 開始時間（秒） */
  startTime: number;
  /** 終了時間（秒） */
  endTime: number;
  /** テキスト */
  text: string;
  /** 話者ID */
  speaker?: string;
}

/**
 * 生成された音声
 */
export interface GeneratedAudio {
  /** 音声データ */
  audio: AudioBuffer;
  /** メタデータ */
  metadata: AudioMetadata;
  /** セグメント情報 */
  segments: GeneratedAudioSegment[];
}

/**
 * 音声メタデータ
 */
export interface AudioMetadata {
  /** タイトル */
  title?: string;
  /** 説明 */
  description?: string;
  /** フォーマット */
  format: AudioFormat;
  /** 持続時間（秒） */
  duration: number;
  /** サンプルレート */
  sampleRate: number;
  /** チャンネル数 */
  channels: number;
  /** ビットレート */
  bitrate?: number;
  /** ファイルサイズ（バイト） */
  fileSize: number;
  /** 作成日時 */
  createdAt: string;
  /** 使用プロバイダー */
  provider: AudioProvider;
  /** 使用音声 */
  voice?: string;
  /** 言語 */
  language?: LanguageCode;
  /** テキスト長 */
  textLength?: number;
  /** 単語数 */
  wordCount?: number;
  /** 話者リスト */
  speakers?: string[];
  /** セグメント数 */
  segmentCount?: number;
}

/**
 * 利用可能な音声
 */
export interface AvailableVoice {
  /** 音声ID */
  voiceId: string;
  /** 音声名 */
  name: string;
  /** 言語 */
  language: LanguageCode;
  /** 性別 */
  gender: VoiceGender;
  /** サポートスタイル */
  styles?: SpeakingStyle[];
  /** プレビューURL */
  previewUrl?: string;
}

/**
 * 音声ジェネレーターオプション
 */
export interface AudioGeneratorOptions {
  /** プロバイダー */
  provider?: AudioProvider;
  /** APIキー */
  apiKey?: string;
  /** AWS認証情報 */
  awsCredentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  /** Azure認証情報 */
  azureCredentials?: {
    subscriptionKey: string;
    region: string;
  };
  /** デフォルト音声フォーマット */
  defaultFormat?: AudioFormat;
  /** デフォルト品質 */
  defaultQuality?: AudioQuality;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  maxRetries?: number;
}

/**
 * プリセット音声
 */
export const PRESET_VOICES: Record<string, VoiceConfig> = {
  // 日本語
  'ja-female-1': {
    voiceName: 'ja-JP-Wavenet-A',
    language: 'ja-JP',
    gender: 'female',
    style: 'neutral',
  },
  'ja-male-1': {
    voiceName: 'ja-JP-Wavenet-C',
    language: 'ja-JP',
    gender: 'male',
    style: 'neutral',
  },
  'ja-news': {
    voiceName: 'ja-JP-Neural2-B',
    language: 'ja-JP',
    gender: 'female',
    style: 'newscast',
  },
  // 英語
  'en-female-1': {
    voiceName: 'en-US-Wavenet-F',
    language: 'en-US',
    gender: 'female',
    style: 'neutral',
  },
  'en-male-1': {
    voiceName: 'en-US-Wavenet-D',
    language: 'en-US',
    gender: 'male',
    style: 'neutral',
  },
  'en-conversational': {
    voiceName: 'en-US-Neural2-J',
    language: 'en-US',
    gender: 'male',
    style: 'conversational',
  },
};

/**
 * 品質プリセット
 */
export const QUALITY_PRESETS: Record<AudioQuality, { sampleRate: number; bitrate: number }> = {
  low: { sampleRate: 16000, bitrate: 64 },
  standard: { sampleRate: 22050, bitrate: 128 },
  high: { sampleRate: 44100, bitrate: 192 },
  ultra: { sampleRate: 48000, bitrate: 320 },
};

/**
 * デフォルトTTSオプション
 */
export const DEFAULT_TTS_OPTIONS: TTSOptions = {
  provider: 'mock',
  format: 'mp3',
  quality: 'standard',
  sampleRate: 22050,
  bitrate: 128,
  enableSSML: false,
  autoPause: true,
};

/**
 * 音声ジェネレーターエラー
 */
export class AudioGeneratorError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AudioGeneratorError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AudioGeneratorError.prototype);
  }
}

/**
 * エラーコード
 */
export const AUDIO_ERROR_CODES = {
  INVALID_TEXT: 'AUDIO_INVALID_TEXT',
  INVALID_OPTIONS: 'AUDIO_INVALID_OPTIONS',
  INVALID_SCRIPT: 'AUDIO_INVALID_SCRIPT',
  PROVIDER_NOT_CONFIGURED: 'AUDIO_PROVIDER_NOT_CONFIGURED',
  PROVIDER_NOT_AVAILABLE: 'AUDIO_PROVIDER_NOT_AVAILABLE',
  VOICE_NOT_AVAILABLE: 'AUDIO_VOICE_NOT_AVAILABLE',
  VOICE_NOT_FOUND: 'AUDIO_VOICE_NOT_FOUND',
  SPEAKER_NOT_FOUND: 'AUDIO_SPEAKER_NOT_FOUND',
  SYNTHESIS_FAILED: 'AUDIO_SYNTHESIS_FAILED',
  EXPORT_FAILED: 'AUDIO_EXPORT_FAILED',
  RATE_LIMITED: 'AUDIO_RATE_LIMITED',
  QUOTA_EXCEEDED: 'AUDIO_QUOTA_EXCEEDED',
  API_ERROR: 'AUDIO_API_ERROR',
} as const;
