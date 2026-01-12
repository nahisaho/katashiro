/**
 * Video Generator Types
 * 動画生成の型定義
 * REQ-MEDIA-003: 動画生成
 */

/**
 * 動画フォーマット
 */
export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'gif';

/**
 * 動画コーデック
 */
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1';

/**
 * 音声コーデック
 */
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'vorbis';

/**
 * 解像度プリセット
 */
export type ResolutionPreset =
  | '4k'      // 3840x2160
  | '1080p'   // 1920x1080
  | '720p'    // 1280x720
  | '480p'    // 854x480
  | '360p';   // 640x360

/**
 * アスペクト比
 */
export type AspectRatio =
  | '16:9'    // 横長（標準）
  | '9:16'    // 縦長（TikTok, Shorts）
  | '1:1'     // 正方形（Instagram）
  | '4:3'     // 旧テレビ
  | '21:9';   // ウルトラワイド

/**
 * トランジションタイプ
 */
export type TransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur';

/**
 * テキストアニメーションタイプ
 */
export type TextAnimationType =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'typewriter'
  | 'bounce'
  | 'scale';

/**
 * 水平位置
 */
export type HorizontalPosition = 'left' | 'center' | 'right';

/**
 * 垂直位置
 */
export type VerticalPosition = 'top' | 'middle' | 'bottom';

/**
 * 解像度設定
 */
export interface Resolution {
  /** 幅（ピクセル） */
  width: number;
  /** 高さ（ピクセル） */
  height: number;
}

/**
 * 解像度プリセット定義
 */
export const RESOLUTION_PRESETS: Record<ResolutionPreset, Resolution> = {
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

/**
 * アスペクト比から解像度を計算
 */
export function getResolutionForAspectRatio(
  aspectRatio: AspectRatio,
  baseHeight: number
): Resolution {
  const ratios: Record<AspectRatio, number> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    '4:3': 4 / 3,
    '21:9': 21 / 9,
  };
  const ratio = ratios[aspectRatio];
  return {
    width: Math.round(baseHeight * ratio),
    height: baseHeight,
  };
}

/**
 * スライド設定
 */
export interface Slide {
  /** スライドID */
  id: string;
  /** 画像ソース（URLまたはBase64） */
  imageSource: string;
  /** 表示時間（秒） */
  duration: number;
  /** トランジション */
  transition?: TransitionConfig;
  /** テキストオーバーレイ */
  overlays?: TextOverlay[];
  /** Ken Burns効果 */
  kenBurns?: KenBurnsEffect;
}

/**
 * トランジション設定
 */
export interface TransitionConfig {
  /** トランジションタイプ */
  type: TransitionType;
  /** 持続時間（秒） */
  duration: number;
  /** イージング関数 */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Ken Burns効果設定
 */
export interface KenBurnsEffect {
  /** 開始ズーム（1.0 = 100%） */
  startZoom: number;
  /** 終了ズーム */
  endZoom: number;
  /** 開始位置（0-1） */
  startPosition: { x: number; y: number };
  /** 終了位置 */
  endPosition: { x: number; y: number };
}

/**
 * テキストオーバーレイ
 */
export interface TextOverlay {
  /** テキスト内容 */
  text: string;
  /** 位置 */
  position: {
    horizontal: HorizontalPosition;
    vertical: VerticalPosition;
    /** オフセット（ピクセル） */
    offsetX?: number;
    offsetY?: number;
  };
  /** スタイル */
  style: TextStyle;
  /** 表示開始時間（秒） */
  startTime?: number;
  /** 表示終了時間（秒） */
  endTime?: number;
  /** アニメーション */
  animation?: TextAnimation;
}

/**
 * テキストスタイル
 */
export interface TextStyle {
  /** フォントファミリー */
  fontFamily?: string;
  /** フォントサイズ（ピクセル） */
  fontSize?: number;
  /** フォント太さ */
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  /** テキストカラー */
  color?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 背景の透明度（0-1） */
  backgroundOpacity?: number;
  /** パディング（ピクセル） */
  padding?: number;
  /** 角丸（ピクセル） */
  borderRadius?: number;
  /** シャドウ */
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  /** 輪郭 */
  stroke?: {
    color: string;
    width: number;
  };
  /** 行間 */
  lineHeight?: number;
  /** 文字間 */
  letterSpacing?: number;
  /** テキスト配置 */
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * テキストアニメーション
 */
export interface TextAnimation {
  /** アニメーションタイプ */
  type: TextAnimationType;
  /** 持続時間（秒） */
  duration: number;
  /** 遅延（秒） */
  delay?: number;
  /** イージング */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * 音声入力
 */
export interface AudioInput {
  /** ソース（ファイルパスまたはURL） */
  source: string;
  /** 開始時間（秒） */
  startTime?: number;
  /** 終了時間（秒） */
  endTime?: number;
  /** 音量（0-1） */
  volume?: number;
  /** フェードイン（秒） */
  fadeIn?: number;
  /** フェードアウト（秒） */
  fadeOut?: number;
  /** ループ */
  loop?: boolean;
}

/**
 * 動画オプション
 */
export interface VideoOptions {
  /** 出力フォーマット */
  format?: VideoFormat;
  /** 動画コーデック */
  videoCodec?: VideoCodec;
  /** 音声コーデック */
  audioCodec?: AudioCodec;
  /** 解像度 */
  resolution?: Resolution | ResolutionPreset;
  /** アスペクト比 */
  aspectRatio?: AspectRatio;
  /** フレームレート */
  frameRate?: number;
  /** 動画ビットレート（kbps） */
  videoBitrate?: number;
  /** 音声ビットレート（kbps） */
  audioBitrate?: number;
  /** 品質（0-51, 低いほど高品質） */
  quality?: number;
  /** 背景色 */
  backgroundColor?: string;
  /** メタデータ */
  metadata?: VideoMetadataInput;
}

/**
 * 動画メタデータ入力
 */
export interface VideoMetadataInput {
  /** タイトル */
  title?: string;
  /** 説明 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 著作権 */
  copyright?: string;
  /** 作成日 */
  creationDate?: string;
  /** タグ */
  tags?: string[];
}

/**
 * 動画出力
 */
export interface VideoOutput {
  /** 動画データ（Base64） */
  data: string;
  /** フォーマット */
  format: VideoFormat;
  /** ファイルサイズ（バイト） */
  fileSize: number;
  /** 持続時間（秒） */
  duration: number;
  /** 解像度 */
  resolution: Resolution;
  /** フレームレート */
  frameRate: number;
  /** メタデータ */
  metadata: VideoMetadata;
}

/**
 * 動画メタデータ
 */
export interface VideoMetadata {
  /** タイトル */
  title?: string;
  /** 説明 */
  description?: string;
  /** フォーマット */
  format: VideoFormat;
  /** コーデック */
  codec: VideoCodec;
  /** 解像度 */
  resolution: Resolution;
  /** フレームレート */
  frameRate: number;
  /** 動画ビットレート */
  videoBitrate: number;
  /** 音声ビットレート */
  audioBitrate?: number;
  /** 持続時間（秒） */
  duration: number;
  /** ファイルサイズ（バイト） */
  fileSize: number;
  /** スライド数 */
  slideCount?: number;
  /** 作成日時 */
  createdAt: string;
}

/**
 * 動画入力
 */
export interface VideoInput {
  /** ソース（ファイルパスまたはURL） */
  source: string;
  /** 開始時間（秒） */
  startTime?: number;
  /** 終了時間（秒） */
  endTime?: number;
}

/**
 * スライドショー設定
 */
export interface SlideshowConfig {
  /** スライド一覧 */
  slides: Slide[];
  /** デフォルトトランジション */
  defaultTransition?: TransitionConfig;
  /** 背景音楽 */
  backgroundMusic?: AudioInput;
  /** ナレーション */
  narration?: AudioInput;
  /** 全体のオプション */
  options?: VideoOptions;
}

/**
 * ジェネレーターオプション
 */
export interface VideoGeneratorOptions {
  /** FFmpegパス（省略時は自動検出） */
  ffmpegPath?: string;
  /** 一時ディレクトリ */
  tempDir?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** ログレベル */
  logLevel?: 'quiet' | 'error' | 'warning' | 'info' | 'verbose';
}

/**
 * デフォルト動画オプション
 */
export const DEFAULT_VIDEO_OPTIONS: Required<Omit<VideoOptions, 'metadata'>> = {
  format: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
  resolution: { width: 1920, height: 1080 },
  aspectRatio: '16:9',
  frameRate: 30,
  videoBitrate: 5000,
  audioBitrate: 192,
  quality: 23,
  backgroundColor: '#000000',
};

/**
 * デフォルトテキストスタイル
 */
export const DEFAULT_TEXT_STYLE: Required<TextStyle> = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  padding: 16,
  borderRadius: 8,
  shadow: {
    color: 'rgba(0, 0, 0, 0.5)',
    offsetX: 2,
    offsetY: 2,
    blur: 4,
  },
  stroke: {
    color: '#000000',
    width: 0,
  },
  lineHeight: 1.4,
  letterSpacing: 0,
  textAlign: 'center',
};

/**
 * デフォルトトランジション設定
 */
export const DEFAULT_TRANSITION: TransitionConfig = {
  type: 'crossfade',
  duration: 1.0,
  easing: 'ease-in-out',
};

/**
 * 動画ジェネレーターエラー
 */
export class VideoGeneratorError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'VideoGeneratorError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, VideoGeneratorError.prototype);
  }
}

/**
 * エラーコード
 */
export const VIDEO_ERROR_CODES = {
  INVALID_INPUT: 'VIDEO_INVALID_INPUT',
  INVALID_OPTIONS: 'VIDEO_INVALID_OPTIONS',
  INVALID_SLIDE: 'VIDEO_INVALID_SLIDE',
  FFMPEG_NOT_FOUND: 'VIDEO_FFMPEG_NOT_FOUND',
  FFMPEG_ERROR: 'VIDEO_FFMPEG_ERROR',
  ENCODING_FAILED: 'VIDEO_ENCODING_FAILED',
  AUDIO_ERROR: 'VIDEO_AUDIO_ERROR',
  FILE_NOT_FOUND: 'VIDEO_FILE_NOT_FOUND',
  TIMEOUT: 'VIDEO_TIMEOUT',
  UNSUPPORTED_FORMAT: 'VIDEO_UNSUPPORTED_FORMAT',
} as const;
