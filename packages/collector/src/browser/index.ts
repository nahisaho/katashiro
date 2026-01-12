/**
 * Browser Automation モジュール
 *
 * @module @nahisaho/katashiro-collector/browser
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

// 型定義のエクスポート
export type {
  BrowserConfig,
  Viewport,
  ProxyConfig,
  ResourceLimits,
  NavigationOptions,
  WaitUntilOption,
  ClickOptions,
  TypeOptions,
  ScrollOptions,
  WaitForSelectorOptions,
  ScreenshotOptions,
  PdfOptions,
  BrowserAction,
  NavigateAction,
  ClickAction,
  TypeAction,
  WaitAction,
  ScrollAction,
  SelectAction,
  HoverAction,
  ScreenshotAction,
  PdfAction,
  EvaluateAction,
  WaitForSelectorAction,
  ExtractAction,
  ActionResult,
  PageScrapeResult,
  PageLink,
  PageImage,
  PageMetadata,
  Cookie,
  SessionInfo,
  AuthCredentials,
  LoginSelectors,
  BrowserScript,
  ExtractorConfig,
  ExtractionResult,
} from './types.js';

// 定数のエクスポート
export { DEFAULT_BROWSER_CONFIG } from './types.js';

// クラスのエクスポート
export { ActionExecutor } from './ActionExecutor.js';
export type { BrowserPage } from './ActionExecutor.js';

export { ContentExtractor } from './ContentExtractor.js';

export { SessionManager } from './SessionManager.js';

export {
  BrowserAutomation,
  BrowserAutomationError,
} from './BrowserAutomation.js';
export type {
  Browser,
  PuppeteerLauncher,
  BrowserAutomationErrorCode,
} from './BrowserAutomation.js';

// デフォルトエクスポート
export { BrowserAutomation as default } from './BrowserAutomation.js';
