/**
 * OGP Generator Types
 * OGP・サムネイル生成の型定義
 * REQ-MEDIA-004: サムネイル・OGP生成
 */

/**
 * プラットフォーム
 */
export type Platform =
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'discord'
  | 'slack'
  | 'qiita'
  | 'zenn'
  | 'note'
  | 'generic';

/**
 * アスペクト比
 */
export type AspectRatio = '16:9' | '1:1' | '4:3' | '2:1' | '1.91:1';

/**
 * OGPテーマ
 */
export type OGPTheme =
  | 'default'
  | 'dark'
  | 'light'
  | 'gradient'
  | 'minimal'
  | 'vibrant'
  | 'custom';

/**
 * グラデーション方向
 */
export type GradientDirection =
  | 'to-right'
  | 'to-left'
  | 'to-bottom'
  | 'to-top'
  | 'to-bottom-right'
  | 'to-bottom-left'
  | 'to-top-right'
  | 'to-top-left';

/**
 * テキスト配置
 */
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * OGPコンテンツ
 */
export interface OGPContent {
  /** タイトル */
  title: string;
  /** 説明文 */
  description?: string;
  /** 著者名 */
  author?: string;
  /** サイト名 */
  siteName?: string;
  /** 日付 */
  date?: string;
  /** タグ */
  tags?: string[];
  /** カテゴリ */
  category?: string;
  /** 読了時間 */
  readTime?: string;
  /** 絵文字/アイコン */
  emoji?: string;
  /** ロゴURL */
  logo?: string;
  /** 背景画像URL */
  backgroundImage?: string;
}

/**
 * OGPスタイル設定
 */
export interface OGPStyle {
  /** 背景色 */
  backgroundColor?: string;
  /** グラデーション開始色 */
  gradientFrom?: string;
  /** グラデーション終了色 */
  gradientTo?: string;
  /** グラデーション方向 */
  gradientDirection?: GradientDirection;
  /** テキスト色 */
  textColor?: string;
  /** サブテキスト色 */
  secondaryTextColor?: string;
  /** アクセント色 */
  accentColor?: string;
  /** フォント */
  fontFamily?: string;
  /** タイトルフォントサイズ */
  titleFontSize?: number;
  /** 説明フォントサイズ */
  descriptionFontSize?: number;
  /** テキスト配置 */
  textAlign?: TextAlign;
  /** 垂直配置 */
  verticalAlign?: VerticalAlign;
  /** パディング */
  padding?: number;
  /** 角丸 */
  borderRadius?: number;
  /** ボーダー色 */
  borderColor?: string;
  /** ボーダー幅 */
  borderWidth?: number;
  /** オーバーレイ不透明度 */
  overlayOpacity?: number;
}

/**
 * 装飾タイプ
 */
export type DecorationType = 'dots' | 'lines' | 'circles' | 'corner';

/**
 * OGPオプション
 */
export interface OGPOptions {
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** アスペクト比 */
  aspectRatio?: AspectRatio;
  /** テーマ */
  theme?: OGPTheme;
  /** カスタムスタイル設定 */
  customStyle?: Partial<OGPStyle>;
  /** 出力フォーマット */
  format?: 'png' | 'jpeg' | 'svg';
  /** 品質(JPEG用) */
  quality?: number;
  /** 装飾 */
  decoration?: DecorationType;
  /** フッター表示 */
  showFooter?: boolean;
}

/**
 * プラットフォーム設定
 */
export interface PlatformConfig {
  /** プラットフォーム名 */
  name: string;
  /** 推奨幅 */
  width: number;
  /** 推奨高さ */
  height: number;
  /** アスペクト比 */
  aspectRatio: AspectRatio;
  /** 最大ファイルサイズ（バイト） */
  maxFileSize?: number;
  /** 推奨フォーマット */
  format?: 'png' | 'jpeg';
}

/**
 * OGP画像出力
 */
export interface OGPImage {
  /** SVG文字列 */
  svg: string;
  /** フォーマット */
  format: 'png' | 'jpeg' | 'svg';
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** メタデータ */
  metadata: Record<string, unknown>;
}

/**
 * プラットフォーム別設定
 */
export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter: {
    name: 'Twitter/X',
    width: 1200,
    height: 628,
    aspectRatio: '1.91:1',
    maxFileSize: 5 * 1024 * 1024,
    format: 'png',
  },
  facebook: {
    name: 'Facebook',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    maxFileSize: 8 * 1024 * 1024,
    format: 'png',
  },
  linkedin: {
    name: 'LinkedIn',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  discord: {
    name: 'Discord',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  slack: {
    name: 'Slack',
    width: 800,
    height: 418,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  qiita: {
    name: 'Qiita',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  zenn: {
    name: 'Zenn',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  note: {
    name: 'note',
    width: 1280,
    height: 670,
    aspectRatio: '1.91:1',
    format: 'png',
  },
  generic: {
    name: 'Generic',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    format: 'png',
  },
};

/**
 * テーマ別デフォルトスタイル
 */
export const THEME_STYLES: Record<OGPTheme, OGPStyle> = {
  default: {
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    secondaryTextColor: '#666666',
    accentColor: '#2563eb',
    fontFamily: 'sans-serif',
    titleFontSize: 60,
    descriptionFontSize: 28,
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: 60,
  },
  dark: {
    backgroundColor: '#0a0a0a',
    textColor: '#ffffff',
    secondaryTextColor: '#a0a0a0',
    accentColor: '#60a5fa',
    fontFamily: 'sans-serif',
    titleFontSize: 60,
    descriptionFontSize: 28,
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: 60,
  },
  light: {
    backgroundColor: '#f8fafc',
    textColor: '#171717',
    secondaryTextColor: '#737373',
    accentColor: '#3b82f6',
    fontFamily: 'sans-serif',
    titleFontSize: 60,
    descriptionFontSize: 28,
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: 60,
  },
  gradient: {
    gradientFrom: '#667eea',
    gradientTo: '#764ba2',
    gradientDirection: 'to-bottom-right',
    textColor: '#ffffff',
    secondaryTextColor: '#e0e0e0',
    accentColor: '#ffffff',
    fontFamily: 'sans-serif',
    titleFontSize: 60,
    descriptionFontSize: 28,
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: 60,
  },
  minimal: {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    secondaryTextColor: '#666666',
    accentColor: '#000000',
    fontFamily: 'sans-serif',
    titleFontSize: 72,
    descriptionFontSize: 24,
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: 80,
  },
  vibrant: {
    gradientFrom: '#f093fb',
    gradientTo: '#f5576c',
    gradientDirection: 'to-right',
    textColor: '#ffffff',
    secondaryTextColor: '#ffffff',
    accentColor: '#ffffff',
    fontFamily: 'sans-serif',
    titleFontSize: 56,
    descriptionFontSize: 26,
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: 60,
  },
  custom: {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    secondaryTextColor: '#666666',
    accentColor: '#2563eb',
    fontFamily: 'sans-serif',
    titleFontSize: 60,
    descriptionFontSize: 28,
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: 60,
  },
};

/**
 * OGPジェネレーターエラー
 */
export class OGPGeneratorError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OGPGeneratorError';
    Object.setPrototypeOf(this, OGPGeneratorError.prototype);
  }
}

/**
 * エラーコード
 */
export const OGP_ERROR_CODES = {
  INVALID_CONTENT: 'OGP_INVALID_CONTENT',
  INVALID_OPTIONS: 'OGP_INVALID_OPTIONS',
  INVALID_PLATFORM: 'OGP_INVALID_PLATFORM',
  INVALID_DIMENSIONS: 'OGP_INVALID_DIMENSIONS',
  RENDER_ERROR: 'OGP_RENDER_ERROR',
  UNSUPPORTED_PLATFORM: 'OGP_UNSUPPORTED_PLATFORM',
  IMAGE_TOO_LARGE: 'OGP_IMAGE_TOO_LARGE',
} as const;

/**
 * デフォルト設定
 */
export const DEFAULT_OGP_OPTIONS: OGPOptions = {
  width: 1200,
  height: 630,
  theme: 'default',
  format: 'svg',
  quality: 90,
  showFooter: true,
};
