/**
 * KATASHIRO Media - 共通型定義
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-009-2
 */

// ============================================================
// 共通インターフェース
// ============================================================

/**
 * メディアプロバイダーインターフェース
 */
export interface MediaProvider<TConfig, TResult> {
  /** プロバイダー名 */
  readonly name: string;
  /** 生成実行 */
  generate(config: TConfig): Promise<TResult>;
  /** 利用可能かどうか */
  isAvailable(): Promise<boolean>;
}

/**
 * メディア生成オプション共通
 */
export interface MediaGenerationOptions {
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  retries?: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay?: number;
}

/**
 * 生成結果メタデータ
 */
export interface GenerationMetadata {
  /** プロバイダー名 */
  provider: string;
  /** モデル名 */
  model: string;
  /** 生成日時 */
  generatedAt: Date;
  /** 処理時間（ミリ秒） */
  durationMs: number;
  /** 使用トークン数（該当する場合） */
  tokensUsed?: number;
  /** コスト（該当する場合） */
  cost?: number;
}

// ============================================================
// 画像生成（ImageGenerator）
// ============================================================

/**
 * 画像サイズ
 */
export type ImageSize =
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1024x1792'
  | '1792x1024'
  | 'custom';

/**
 * 画像スタイル
 */
export type ImageStyle = 'natural' | 'vivid' | 'artistic' | 'photo' | 'anime' | 'sketch';

/**
 * 画像フォーマット
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * 画像生成設定
 */
export interface ImageGenerationConfig {
  /** プロンプト */
  prompt: string;
  /** ネガティブプロンプト */
  negativePrompt?: string;
  /** サイズ */
  size?: ImageSize;
  /** カスタム幅（size='custom'時） */
  width?: number;
  /** カスタム高さ（size='custom'時） */
  height?: number;
  /** スタイル */
  style?: ImageStyle;
  /** 生成枚数 */
  count?: number;
  /** シード値 */
  seed?: number;
  /** 品質（0-100） */
  quality?: number;
  /** 出力フォーマット */
  format?: ImageFormat;
}

/**
 * 画像生成結果
 */
export interface ImageGenerationResult {
  /** 生成された画像（Base64またはURL） */
  images: GeneratedImage[];
  /** メタデータ */
  metadata: GenerationMetadata;
  /** 修正されたプロンプト（プロバイダーが変更した場合） */
  revisedPrompt?: string;
}

/**
 * 生成された画像
 */
export interface GeneratedImage {
  /** Base64エンコードされた画像データ */
  base64?: string;
  /** 画像URL */
  url?: string;
  /** フォーマット */
  format: ImageFormat;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
}

/**
 * 画像プロバイダータイプ
 */
export type ImageProviderType = 'openai' | 'stability' | 'midjourney' | 'local';

/**
 * 画像プロバイダー設定
 */
export interface ImageProviderConfig {
  /** プロバイダータイプ */
  type: ImageProviderType;
  /** API キー */
  apiKey?: string;
  /** ベースURL（カスタムエンドポイント用） */
  baseUrl?: string;
  /** モデル名 */
  model?: string;
  /** デフォルト設定 */
  defaults?: Partial<ImageGenerationConfig>;
}

// ============================================================
// 音声合成（AudioSynthesizer / TTS）
// ============================================================

/**
 * 音声フォーマット
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac';

/**
 * 音声合成設定
 */
export interface AudioSynthesisConfig {
  /** テキスト */
  text: string;
  /** 音声モデル/ボイスID */
  voice: string;
  /** 言語コード */
  language?: string;
  /** 速度（0.5-2.0） */
  speed?: number;
  /** ピッチ（-1.0 to 1.0） */
  pitch?: number;
  /** 出力フォーマット */
  format?: AudioFormat;
  /** サンプルレート */
  sampleRate?: number;
  /** 感情/スタイル */
  style?: string;
}

/**
 * 音声合成結果
 */
export interface AudioSynthesisResult {
  /** 音声データ（Base64） */
  audio: string;
  /** フォーマット */
  format: AudioFormat;
  /** 長さ（秒） */
  durationSeconds: number;
  /** サンプルレート */
  sampleRate: number;
  /** メタデータ */
  metadata: GenerationMetadata;
}

/**
 * TTSプロバイダータイプ
 */
export type TTSProviderType = 'openai' | 'elevenlabs' | 'azure' | 'google' | 'local';

/**
 * TTSプロバイダー設定
 */
export interface TTSProviderConfig {
  /** プロバイダータイプ */
  type: TTSProviderType;
  /** API キー */
  apiKey?: string;
  /** ベースURL */
  baseUrl?: string;
  /** デフォルト音声 */
  defaultVoice?: string;
  /** デフォルト設定 */
  defaults?: Partial<AudioSynthesisConfig>;
}

// ============================================================
// 音声文字起こし（AudioTranscriber / STT）
// ============================================================

/**
 * 文字起こし設定
 */
export interface TranscriptionConfig {
  /** 音声データ（Base64またはURL） */
  audio: string;
  /** 音声フォーマット */
  format?: AudioFormat;
  /** 言語コード（ヒント） */
  language?: string;
  /** 話者分離を有効化 */
  enableSpeakerDiarization?: boolean;
  /** 想定話者数 */
  speakerCount?: number;
  /** タイムスタンプを含める */
  includeTimestamps?: boolean;
  /** 単語レベルタイムスタンプ */
  wordLevelTimestamps?: boolean;
  /** 単語タイムスタンプを取得（Whisper用） */
  wordTimestamps?: boolean;
  /** ボキャブラリー（プロンプトとして使用） */
  vocabulary?: string[];
}

/**
 * 文字起こしセグメント
 */
export interface TranscriptionSegment {
  /** テキスト */
  text: string;
  /** 開始時間（秒） */
  start: number;
  /** 終了時間（秒） */
  end: number;
  /** 話者ID */
  speakerId?: string;
  /** 信頼度（0-1） */
  confidence: number;
  /** 単語レベル情報 */
  words?: TranscriptionWord[];
}

/**
 * 文字起こし単語
 */
export interface TranscriptionWord {
  /** 単語 */
  word: string;
  /** 開始時間（秒） */
  start: number;
  /** 終了時間（秒） */
  end: number;
  /** 信頼度（0-1） */
  confidence: number;
}

/**
 * 文字起こし結果
 */
export interface TranscriptionResult {
  /** 全文テキスト */
  text: string;
  /** セグメント */
  segments: TranscriptionSegment[];
  /** 検出言語 */
  detectedLanguage: string;
  /** 言語コード（ISO 639-1） */
  language?: string;
  /** 単語レベル情報 */
  words?: TranscriptionWord[];
  /** 音声長（秒） */
  durationSeconds: number;
  /** メタデータ */
  metadata: GenerationMetadata;
}

/**
 * STTプロバイダータイプ
 */
export type STTProviderType = 'openai' | 'azure' | 'google' | 'local';

/**
 * STTプロバイダー設定
 */
export interface STTProviderConfig {
  /** プロバイダータイプ */
  type: STTProviderType;
  /** API キー */
  apiKey?: string;
  /** ベースURL */
  baseUrl?: string;
  /** モデル */
  model?: string;
  /** デフォルト設定 */
  defaults?: Partial<TranscriptionConfig>;
}

// ============================================================
// 動画生成（VideoGenerator）
// ============================================================

/**
 * 動画フォーマット
 */
export type VideoFormat = 'mp4' | 'webm' | 'gif';

/**
 * 動画解像度
 */
export type VideoResolution = '720p' | '1080p' | '4k';

/**
 * カメラモーション設定
 */
export interface CameraMotion {
  /** ズーム（-1.0〜1.0） */
  zoom?: number;
  /** パン（-1.0〜1.0） */
  pan?: number;
  /** チルト（-1.0〜1.0） */
  tilt?: number;
  /** ロール（-1.0〜1.0） */
  roll?: number;
}

/**
 * 動画生成設定
 */
export interface VideoGenerationConfig {
  /** プロンプト */
  prompt: string;
  /** ネガティブプロンプト */
  negativePrompt?: string;
  /** 開始画像（Base64またはURL） */
  startImage?: string;
  /** 終了画像（Base64またはURL） */
  endImage?: string;
  /** 長さ（秒） */
  duration?: number;
  /** 解像度 */
  resolution?: VideoResolution;
  /** 幅（ピクセル） */
  width?: number;
  /** 高さ（ピクセル） */
  height?: number;
  /** FPS */
  fps?: number;
  /** フォーマット */
  format?: VideoFormat;
  /** シード値 */
  seed?: number;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** モーション強度（0.0〜1.0） */
  motionStrength?: number;
  /** カメラモーション */
  cameraMotion?: CameraMotion;
  /** スタイルプリセット */
  style?: string;
}

/**
 * 動画生成結果
 */
export interface VideoGenerationResult {
  /** 動画データ（Base64） */
  video: string;
  /** 動画URL */
  videoUrl?: string;
  /** フォーマット */
  format: VideoFormat;
  /** 幅（ピクセル） */
  width: number;
  /** 高さ（ピクセル） */
  height: number;
  /** 長さ（秒） */
  durationSeconds: number;
  /** FPS */
  fps: number;
  /** メタデータ */
  metadata: GenerationMetadata;
}

/**
 * メディアプロバイダー情報
 */
export interface MediaProviderInfo {
  /** プロバイダー名 */
  name: string;
  /** プロバイダータイプ */
  type: string;
  /** サポート機能 */
  capabilities: string[];
  /** 制限値 */
  limits: Record<string, number>;
}

/**
 * 動画プロバイダータイプ
 */
export type VideoProviderType = 'runway' | 'pika' | 'sora' | 'local';

/**
 * 動画プロバイダー設定
 */
export interface VideoProviderConfig {
  /** プロバイダータイプ */
  type: VideoProviderType;
  /** API キー */
  apiKey?: string;
  /** ベースURL */
  baseUrl?: string;
  /** デフォルト設定 */
  defaults?: Partial<VideoGenerationConfig>;
}

// ============================================================
// エラー型
// ============================================================

/**
 * メディア生成エラーコード
 */
export type MediaErrorCode =
  | 'INVALID_PROMPT'
  | 'CONTENT_POLICY_VIOLATION'
  | 'UNSUPPORTED_FORMAT'
  | 'GENERATION_FAILED'
  | 'GENERATION_TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'AUTHENTICATION_FAILED';

/**
 * メディア生成エラー
 */
export interface MediaError {
  /** エラーコード */
  code: MediaErrorCode;
  /** エラーメッセージ */
  message: string;
  /** プロバイダー固有エラー */
  providerError?: unknown;
}
