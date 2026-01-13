/**
 * BrowserOperator - REQ-008準拠のブラウザ操作クラス
 *
 * オーケストレーターと統合するためのシンプルなインターフェースを提供。
 * 内部で既存のBrowserAutomationを活用する。
 *
 * @requirement REQ-008
 * @design REQ-008-01〜REQ-008-06
 */

import { EventEmitter } from 'events';
import { isErr } from '@nahisaho/katashiro-core';
import {
  BrowserAutomation,
  BrowserAutomationError,
  type PuppeteerLauncher,
} from './BrowserAutomation.js';
import type {
  BrowserConfig,
  ActionResult,
  NavigationOptions,
  ClickOptions,
  TypeOptions,
  ScrollOptions,
  ScreenshotOptions,
  WaitForSelectorOptions,
} from './types.js';

// ============================================================================
// REQ-008 型定義
// ============================================================================

/**
 * ブラウザアクションタイプ（REQ-008準拠）
 */
export type BrowserActionType =
  | 'goto'
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'evaluate'
  | 'waitForSelector';

/**
 * ブラウザアクション（REQ-008準拠）
 */
export interface BrowserAction {
  /** アクションタイプ */
  type: BrowserActionType;
  /** CSSセレクタ（click, type, scroll, waitForSelector用） */
  selector?: string;
  /** 値（type: テキスト, goto: URL, evaluate: スクリプト） */
  value?: string;
  /** オプション */
  options?: Record<string, unknown>;
}

/**
 * ブラウザ観察結果（REQ-008準拠）
 */
export interface BrowserObservation {
  /** 成功フラグ */
  success: boolean;
  /** アクションタイプ */
  actionType: BrowserActionType;
  /** 結果データ */
  data?: unknown;
  /** スクリーンショット */
  screenshot?: Buffer;
  /** エラーメッセージ（REQ-008-06: セレクタ詳細含む） */
  error?: string;
  /** 実行時間（ミリ秒） */
  duration: number;
}

/**
 * BrowserOperatorオプション
 */
export interface BrowserOptions extends BrowserConfig {
  /** 要素検索のデフォルトタイムアウト（ミリ秒） */
  defaultSelectorTimeout?: number;
}

/**
 * BrowserOperatorエラーコード
 */
export type BrowserOperatorErrorCode =
  | 'NOT_LAUNCHED'
  | 'ELEMENT_NOT_FOUND'
  | 'NAVIGATION_FAILED'
  | 'ACTION_FAILED'
  | 'EVALUATION_FAILED'
  | 'TIMEOUT';

/**
 * BrowserOperatorエラー
 */
export class BrowserOperatorError extends Error {
  constructor(
    public readonly code: BrowserOperatorErrorCode,
    message: string,
    public readonly selector?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'BrowserOperatorError';
  }
}

// ============================================================================
// BrowserOperator
// ============================================================================

/**
 * BrowserOperator - オーケストレーター統合用ブラウザ操作クラス
 *
 * REQ-008準拠:
 * - REQ-008-01: Puppeteer/Playwrightでヘッドレスブラウザを制御
 * - REQ-008-02: goto アクションでURL遷移
 * - REQ-008-03: click, type, scroll, wait 操作
 * - REQ-008-04: screenshot でページキャプチャ
 * - REQ-008-05: evaluate でJavaScript実行
 * - REQ-008-06: 要素未検出時にセレクタ詳細付きエラー
 *
 * @example
 * ```typescript
 * const operator = new BrowserOperator({ headless: true });
 * await operator.launch();
 *
 * const result = await operator.execute({
 *   type: 'goto',
 *   value: 'https://example.com'
 * });
 *
 * const clickResult = await operator.execute({
 *   type: 'click',
 *   selector: '#submit-button'
 * });
 *
 * await operator.close();
 * ```
 */
export class BrowserOperator extends EventEmitter {
  private automation: BrowserAutomation;
  private options: BrowserOptions;
  private currentUrl: string | null = null;
  private launched = false;

  constructor(options: Partial<BrowserOptions> = {}) {
    super();
    this.options = {
      headless: true,
      timeout: 30000,
      defaultSelectorTimeout: 5000,
      ...options,
    };
    this.automation = new BrowserAutomation(this.options);
  }

  /**
   * Puppeteerランチャーを設定（DI用）
   */
  setPuppeteer(puppeteer: PuppeteerLauncher): void {
    this.automation.setPuppeteer(puppeteer);
  }

  /**
   * ブラウザを起動（REQ-008-01）
   */
  async launch(): Promise<void> {
    if (this.launched) return;

    this.emit('launching');
    await this.automation.initialize();
    this.launched = true;
    this.emit('launched');
  }

  /**
   * ブラウザを終了
   */
  async close(): Promise<void> {
    if (!this.launched) return;

    this.emit('closing');
    await this.automation.close();
    this.launched = false;
    this.currentUrl = null;
    this.emit('closed');
  }

  /**
   * 起動状態を確認
   */
  isLaunched(): boolean {
    return this.launched;
  }

  /**
   * 現在のURLを取得
   */
  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * アクションを実行（REQ-008-02〜05）
   */
  async execute(action: BrowserAction): Promise<BrowserObservation> {
    const startTime = Date.now();

    if (!this.launched) {
      return this.createErrorObservation(
        action.type,
        'NOT_LAUNCHED',
        'Browser not launched. Call launch() first.',
        startTime
      );
    }

    this.emit('action:start', action);

    try {
      let result: BrowserObservation;

      switch (action.type) {
        case 'goto':
          result = await this.executeGoto(action, startTime);
          break;
        case 'click':
          result = await this.executeClick(action, startTime);
          break;
        case 'type':
          result = await this.executeType(action, startTime);
          break;
        case 'scroll':
          result = await this.executeScroll(action, startTime);
          break;
        case 'wait':
          result = await this.executeWait(action, startTime);
          break;
        case 'screenshot':
          result = await this.executeScreenshot(action, startTime);
          break;
        case 'evaluate':
          result = await this.executeEvaluate(action, startTime);
          break;
        case 'waitForSelector':
          result = await this.executeWaitForSelector(action, startTime);
          break;
        default:
          result = this.createErrorObservation(
            action.type,
            'ACTION_FAILED',
            `Unknown action type: ${action.type}`,
            startTime
          );
      }

      this.emit('action:complete', action, result);
      return result;
    } catch (error) {
      const observation = this.handleError(action, error, startTime);
      this.emit('action:error', action, observation);
      return observation;
    }
  }

  /**
   * 複数アクションを順次実行
   */
  async executeSequence(actions: BrowserAction[]): Promise<BrowserObservation[]> {
    const results: BrowserObservation[] = [];

    for (const action of actions) {
      const result = await this.execute(action);
      results.push(result);

      // エラー時は中断
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  // ============================================================================
  // 個別アクション実装
  // ============================================================================

  /**
   * goto - URL遷移（REQ-008-02）
   */
  private async executeGoto(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!action.value) {
      return this.createErrorObservation(
        'goto',
        'ACTION_FAILED',
        'URL is required for goto action',
        startTime
      );
    }

    const options: NavigationOptions = {
      waitUntil: (action.options?.waitUntil as NavigationOptions['waitUntil']) || 'domcontentloaded',
      timeout: (action.options?.timeout as number) || this.options.timeout,
    };

    const result = await this.automation.scrape(action.value, {
      ...options,
      screenshot: false,
    });

    if (isErr(result)) {
      return this.createErrorObservation(
        'goto',
        'NAVIGATION_FAILED',
        result.error.message,
        startTime,
        result.error
      );
    }

    this.currentUrl = result.value.url;

    return {
      success: true,
      actionType: 'goto',
      data: {
        url: result.value.url,
        title: result.value.title,
      },
      duration: Date.now() - startTime,
    };
  }

  /**
   * click - クリック操作（REQ-008-03）
   */
  private async executeClick(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!action.selector) {
      return this.createErrorObservation(
        'click',
        'ACTION_FAILED',
        'Selector is required for click action',
        startTime
      );
    }

    if (!this.currentUrl) {
      return this.createErrorObservation(
        'click',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const clickAction = {
      type: 'click' as const,
      selector: action.selector,
      options: action.options as ClickOptions,
    };

    const result = await this.automation.executeAction(this.currentUrl, clickAction);

    if (isErr(result)) {
      return this.createSelectorError('click', action.selector, result.error.message, startTime);
    }

    return this.convertActionResult('click', result.value, startTime);
  }

  /**
   * type - テキスト入力（REQ-008-03）
   */
  private async executeType(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!action.selector) {
      return this.createErrorObservation(
        'type',
        'ACTION_FAILED',
        'Selector is required for type action',
        startTime
      );
    }

    if (!action.value) {
      return this.createErrorObservation(
        'type',
        'ACTION_FAILED',
        'Value is required for type action',
        startTime
      );
    }

    if (!this.currentUrl) {
      return this.createErrorObservation(
        'type',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const typeAction = {
      type: 'type' as const,
      selector: action.selector,
      text: action.value,
      options: action.options as TypeOptions,
    };

    const result = await this.automation.executeAction(this.currentUrl, typeAction);

    if (isErr(result)) {
      return this.createSelectorError('type', action.selector, result.error.message, startTime);
    }

    return this.convertActionResult('type', result.value, startTime);
  }

  /**
   * scroll - スクロール操作（REQ-008-03）
   */
  private async executeScroll(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!this.currentUrl) {
      return this.createErrorObservation(
        'scroll',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const scrollTarget = action.selector || action.options?.target;
    const scrollAction = {
      type: 'scroll' as const,
      target: scrollTarget as string | { x: number; y: number } | undefined,
      options: action.options as ScrollOptions,
    };

    const result = await this.automation.executeAction(this.currentUrl, scrollAction);

    if (isErr(result)) {
      if (action.selector) {
        return this.createSelectorError('scroll', action.selector, result.error.message, startTime);
      }
      return this.createErrorObservation('scroll', 'ACTION_FAILED', result.error.message, startTime);
    }

    return this.convertActionResult('scroll', result.value, startTime);
  }

  /**
   * wait - 待機（REQ-008-03）
   */
  private async executeWait(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    const duration = (action.options?.duration as number) || 1000;

    await new Promise(resolve => setTimeout(resolve, duration));

    return {
      success: true,
      actionType: 'wait',
      data: { duration },
      duration: Date.now() - startTime,
    };
  }

  /**
   * screenshot - スクリーンショット（REQ-008-04）
   */
  private async executeScreenshot(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!this.currentUrl) {
      return this.createErrorObservation(
        'screenshot',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const options: ScreenshotOptions = {
      fullPage: (action.options?.fullPage as boolean) ?? true,
      type: (action.options?.type as 'png' | 'jpeg') || 'png',
    };

    const result = await this.automation.screenshot(this.currentUrl, options);

    if (isErr(result)) {
      return this.createErrorObservation(
        'screenshot',
        'ACTION_FAILED',
        result.error.message,
        startTime
      );
    }

    return {
      success: true,
      actionType: 'screenshot',
      screenshot: result.value,
      duration: Date.now() - startTime,
    };
  }

  /**
   * evaluate - JavaScript実行（REQ-008-05）
   */
  private async executeEvaluate(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!action.value) {
      return this.createErrorObservation(
        'evaluate',
        'ACTION_FAILED',
        'Script is required for evaluate action',
        startTime
      );
    }

    if (!this.currentUrl) {
      return this.createErrorObservation(
        'evaluate',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const evaluateAction = {
      type: 'evaluate' as const,
      script: action.value,
      args: action.options?.args as unknown[],
    };

    const result = await this.automation.executeAction(this.currentUrl, evaluateAction);

    if (isErr(result)) {
      return this.createErrorObservation(
        'evaluate',
        'EVALUATION_FAILED',
        result.error.message,
        startTime
      );
    }

    return {
      success: true,
      actionType: 'evaluate',
      data: result.value.data,
      duration: Date.now() - startTime,
    };
  }

  /**
   * waitForSelector - セレクタ待機
   */
  private async executeWaitForSelector(
    action: BrowserAction,
    startTime: number
  ): Promise<BrowserObservation> {
    if (!action.selector) {
      return this.createErrorObservation(
        'waitForSelector',
        'ACTION_FAILED',
        'Selector is required for waitForSelector action',
        startTime
      );
    }

    if (!this.currentUrl) {
      return this.createErrorObservation(
        'waitForSelector',
        'ACTION_FAILED',
        'No page loaded. Call goto first.',
        startTime
      );
    }

    const waitAction = {
      type: 'waitForSelector' as const,
      selector: action.selector,
      options: {
        timeout: (action.options?.timeout as number) || this.options.defaultSelectorTimeout,
        visible: action.options?.visible as boolean,
        hidden: action.options?.hidden as boolean,
      } as WaitForSelectorOptions,
    };

    const result = await this.automation.executeAction(this.currentUrl, waitAction);

    if (isErr(result)) {
      return this.createSelectorError(
        'waitForSelector',
        action.selector,
        result.error.message,
        startTime
      );
    }

    return this.convertActionResult('waitForSelector', result.value, startTime);
  }

  // ============================================================================
  // ヘルパーメソッド
  // ============================================================================

  /**
   * ActionResultをBrowserObservationに変換
   */
  private convertActionResult(
    actionType: BrowserActionType,
    result: ActionResult,
    _startTime: number
  ): BrowserObservation {
    return {
      success: result.success,
      actionType,
      data: result.data,
      screenshot: result.screenshot,
      error: result.error,
      duration: result.duration,
    };
  }

  /**
   * エラーObservationを作成
   */
  private createErrorObservation(
    actionType: BrowserActionType,
    code: BrowserOperatorErrorCode,
    message: string,
    startTime: number,
    cause?: Error
  ): BrowserObservation {
    const error = new BrowserOperatorError(code, message, undefined, cause);
    return {
      success: false,
      actionType,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }

  /**
   * セレクタエラーObservationを作成（REQ-008-06）
   */
  private createSelectorError(
    actionType: BrowserActionType,
    selector: string,
    originalMessage: string,
    startTime: number
  ): BrowserObservation {
    const error = new BrowserOperatorError(
      'ELEMENT_NOT_FOUND',
      `Element not found for selector: "${selector}". ${originalMessage}`,
      selector
    );
    return {
      success: false,
      actionType,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }

  /**
   * エラーをハンドリング
   */
  private handleError(
    action: BrowserAction,
    error: unknown,
    startTime: number
  ): BrowserObservation {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // セレクタ関連のエラーかチェック
    if (
      action.selector &&
      (errorMessage.includes('not found') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('selector'))
    ) {
      return this.createSelectorError(action.type, action.selector, errorMessage, startTime);
    }

    // 一般的なエラー
    return this.createErrorObservation(
      action.type,
      error instanceof BrowserAutomationError ? this.mapErrorCode(error.code) : 'ACTION_FAILED',
      errorMessage,
      startTime,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * BrowserAutomationErrorCodeをBrowserOperatorErrorCodeにマッピング
   */
  private mapErrorCode(
    code: string
  ): BrowserOperatorErrorCode {
    switch (code) {
      case 'BROWSER_NOT_INITIALIZED':
        return 'NOT_LAUNCHED';
      case 'NAVIGATION_FAILED':
        return 'NAVIGATION_FAILED';
      case 'TIMEOUT':
        return 'TIMEOUT';
      default:
        return 'ACTION_FAILED';
    }
  }
}

// デフォルトエクスポート
export default BrowserOperator;
