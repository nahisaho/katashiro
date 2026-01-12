/**
 * Browser Automation 型定義
 *
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

/**
 * ビューポート設定
 */
export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

/**
 * プロキシ設定
 */
export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/**
 * リソース制限
 */
export interface ResourceLimits {
  /** 最大メモリ使用量（MB） */
  maxMemory?: number;
  /** 最大同時ページ数 */
  maxPages?: number;
  /** 最大実行時間（ミリ秒） */
  maxExecutionTime?: number;
}

/**
 * ブラウザ設定
 */
export interface BrowserConfig {
  /** ヘッドレスモード */
  headless?: boolean;
  /** ビューポートサイズ */
  viewport?: Viewport;
  /** ユーザーエージェント */
  userAgent?: string;
  /** プロキシ設定 */
  proxy?: ProxyConfig;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 言語設定 */
  locale?: string;
  /** タイムゾーン */
  timezone?: string;
  /** JavaScript無効化 */
  disableJavaScript?: boolean;
  /** 画像読み込み無効化 */
  disableImages?: boolean;
  /** リソース制限 */
  resourceLimits?: ResourceLimits;
  /** 追加の起動引数 */
  args?: string[];
}

/**
 * 待機条件
 */
export type WaitUntilOption =
  | 'load'
  | 'domcontentloaded'
  | 'networkidle0'
  | 'networkidle2';

/**
 * ナビゲーションオプション
 */
export interface NavigationOptions {
  /** 待機条件 */
  waitUntil?: WaitUntilOption | WaitUntilOption[];
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リファラー */
  referer?: string;
}

/**
 * クリックオプション
 */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

/**
 * タイプオプション
 */
export interface TypeOptions {
  delay?: number;
  clear?: boolean;
}

/**
 * スクロールオプション
 */
export interface ScrollOptions {
  behavior?: 'auto' | 'smooth';
}

/**
 * セレクタ待機オプション
 */
export interface WaitForSelectorOptions {
  visible?: boolean;
  hidden?: boolean;
  timeout?: number;
}

/**
 * スクリーンショットオプション
 */
export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  type?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * PDFオプション
 */
export interface PdfOptions {
  path?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  printBackground?: boolean;
}

// ============================================================================
// アクション定義
// ============================================================================

export interface NavigateAction {
  type: 'navigate';
  url: string;
  options?: NavigationOptions;
}

export interface ClickAction {
  type: 'click';
  selector: string;
  options?: ClickOptions;
}

export interface TypeAction {
  type: 'type';
  selector: string;
  text: string;
  options?: TypeOptions;
}

export interface WaitAction {
  type: 'wait';
  duration: number;
}

export interface ScrollAction {
  type: 'scroll';
  target?: string | { x: number; y: number };
  options?: ScrollOptions;
}

export interface SelectAction {
  type: 'select';
  selector: string;
  values: string[];
}

export interface HoverAction {
  type: 'hover';
  selector: string;
}

export interface ScreenshotAction {
  type: 'screenshot';
  options?: ScreenshotOptions;
}

export interface PdfAction {
  type: 'pdf';
  options?: PdfOptions;
}

export interface EvaluateAction {
  type: 'evaluate';
  script: string;
  args?: unknown[];
}

export interface WaitForSelectorAction {
  type: 'waitForSelector';
  selector: string;
  options?: WaitForSelectorOptions;
}

export interface ExtractAction {
  type: 'extract';
  selector: string;
  attribute?: string;
  multiple?: boolean;
}

/**
 * ブラウザアクション
 */
export type BrowserAction =
  | NavigateAction
  | ClickAction
  | TypeAction
  | WaitAction
  | ScrollAction
  | SelectAction
  | HoverAction
  | ScreenshotAction
  | PdfAction
  | EvaluateAction
  | WaitForSelectorAction
  | ExtractAction;

/**
 * アクション結果
 */
export interface ActionResult {
  /** アクションタイプ */
  actionType: BrowserAction['type'];
  /** 成功したか */
  success: boolean;
  /** 結果データ */
  data?: unknown;
  /** スクリーンショット（バイナリ） */
  screenshot?: Buffer;
  /** PDF（バイナリ） */
  pdf?: Buffer;
  /** 抽出されたテキスト */
  extractedText?: string | string[];
  /** エラーメッセージ */
  error?: string;
  /** 実行時間（ミリ秒） */
  duration: number;
}

// ============================================================================
// ページ関連
// ============================================================================

/**
 * ページリンク
 */
export interface PageLink {
  href: string;
  text: string;
  rel?: string;
}

/**
 * ページ画像
 */
export interface PageImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * ページメタデータ
 */
export interface PageMetadata {
  /** メタディスクリプション */
  description?: string;
  /** キーワード */
  keywords?: string[];
  /** OGP情報 */
  ogp?: Record<string, string>;
  /** 最終更新日 */
  lastModified?: string;
  /** 言語 */
  language?: string;
}

/**
 * ページスクレイプ結果
 */
export interface PageScrapeResult {
  /** URL */
  url: string;
  /** ページタイトル */
  title: string;
  /** メインコンテンツ */
  content: string;
  /** HTML全体 */
  html: string;
  /** 抽出されたデータ */
  extractedData?: Record<string, unknown>;
  /** リンク一覧 */
  links: PageLink[];
  /** 画像一覧 */
  images: PageImage[];
  /** メタデータ */
  metadata: PageMetadata;
  /** スクリーンショット */
  screenshot?: Buffer;
}

// ============================================================================
// セッション関連
// ============================================================================

/**
 * Cookie
 */
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * セッション情報
 */
export interface SessionInfo {
  /** セッションID */
  id: string;
  /** Cookie一覧 */
  cookies: Cookie[];
  /** ローカルストレージ */
  localStorage: Record<string, string>;
  /** セッションストレージ */
  sessionStorage: Record<string, string>;
}

/**
 * 認証情報
 */
export interface AuthCredentials {
  /** ユーザー名 */
  username: string;
  /** パスワード */
  password: string;
  /** 追加フィールド */
  additionalFields?: Record<string, string>;
}

/**
 * ログインセレクタ
 */
export interface LoginSelectors {
  username: string;
  password: string;
  submit: string;
  successIndicator?: string;
}

// ============================================================================
// スクリプト関連
// ============================================================================

/**
 * ブラウザスクリプト
 */
export interface BrowserScript {
  /** スクリプト名 */
  name: string;
  /** 説明 */
  description?: string;
  /** アクション一覧 */
  actions: BrowserAction[];
  /** 変数 */
  variables?: Record<string, string>;
}

/**
 * 抽出器設定
 */
export interface ExtractorConfig {
  name: string;
  selector: string;
  attribute?: string;
  multiple?: boolean;
}

/**
 * 抽出結果
 */
export interface ExtractionResult {
  content: string;
  html: string;
  extractedData?: Record<string, unknown>;
  links: PageLink[];
  images: PageImage[];
  metadata: PageMetadata;
}

// ============================================================================
// デフォルト設定
// ============================================================================

/**
 * デフォルトブラウザ設定
 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: true,
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  resourceLimits: {
    maxMemory: 512,
    maxPages: 5,
    maxExecutionTime: 300000,
  },
};
