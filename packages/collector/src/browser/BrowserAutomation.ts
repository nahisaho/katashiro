/**
 * BrowserAutomation - ブラウザ自動化メインクラス
 *
 * Puppeteerベースのブラウザ自動化機能を提供する。
 * JavaScriptで動的に生成されるページや認証が必要なサイトから情報を収集する。
 *
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type {
  BrowserConfig,
  BrowserAction,
  ActionResult,
  PageScrapeResult,
  SessionInfo,
  AuthCredentials,
  LoginSelectors,
  BrowserScript,
  NavigationOptions,
  ExtractorConfig,
  ScreenshotOptions,
  PdfOptions,
} from './types.js';
import { DEFAULT_BROWSER_CONFIG } from './types.js';
import { ActionExecutor, type BrowserPage } from './ActionExecutor.js';
import { ContentExtractor } from './ContentExtractor.js';
import { SessionManager } from './SessionManager.js';

/**
 * Puppeteer Browser インターフェース（抽象化）
 */
export interface Browser {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
}

/**
 * Puppeteer ランチャー
 */
export interface PuppeteerLauncher {
  launch(options?: unknown): Promise<Browser>;
}

/**
 * 拡張Pageインターフェース
 */
interface ExtendedPage extends BrowserPage {
  setViewport(viewport: { width: number; height: number }): Promise<void>;
  setUserAgent(userAgent: string): Promise<void>;
  setJavaScriptEnabled(enabled: boolean): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: string, handler: (req: unknown) => void): void;
  url(): string;
  title(): Promise<string>;
  content(): Promise<string>;
  close(): Promise<void>;
}

/**
 * BrowserAutomation エラーコード
 */
export type BrowserAutomationErrorCode =
  | 'BROWSER_NOT_INITIALIZED'
  | 'NAVIGATION_FAILED'
  | 'ACTION_FAILED'
  | 'EXTRACTION_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'AUTHENTICATION_FAILED'
  | 'TIMEOUT';

/**
 * BrowserAutomation エラー
 */
export class BrowserAutomationError extends Error {
  constructor(
    public readonly code: BrowserAutomationErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'BrowserAutomationError';
  }
}

/**
 * Browser Automation
 *
 * @example
 * ```typescript
 * const browser = new BrowserAutomation();
 *
 * // シンプルなスクレイピング
 * const result = await browser.scrape('https://example.com');
 * if (isOk(result)) {
 *   console.log(result.value.content);
 * }
 *
 * // スクリーンショット
 * const screenshot = await browser.screenshot('https://example.com');
 *
 * await browser.close();
 * ```
 */
export class BrowserAutomation {
  private config: BrowserConfig;
  private browser: Browser | null = null;
  private executor: ActionExecutor;
  private extractor: ContentExtractor;
  private sessionManager: SessionManager;
  private puppeteer: PuppeteerLauncher | null = null;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_BROWSER_CONFIG, ...config };
    this.executor = new ActionExecutor();
    this.extractor = new ContentExtractor();
    this.sessionManager = new SessionManager();
  }

  /**
   * Puppeteerランチャーを設定（DI用）
   */
  setPuppeteer(puppeteer: PuppeteerLauncher): void {
    this.puppeteer = puppeteer;
  }

  /**
   * ブラウザを初期化
   */
  async initialize(): Promise<void> {
    if (this.browser) return;

    if (!this.puppeteer) {
      // 動的インポートを試みる
      try {
        // @ts-ignore - puppeteer is optional peer dependency
        const puppeteer = await import(/* webpackIgnore: true */ 'puppeteer');
        this.puppeteer = puppeteer.default || puppeteer;
      } catch {
        throw new BrowserAutomationError(
          'BROWSER_NOT_INITIALIZED',
          'Puppeteer is not available. Please install puppeteer: npm install puppeteer'
        );
      }
    }

    this.browser = await this.puppeteer!.launch({
      headless: this.config.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        ...(this.config.args || []),
      ],
    });
  }

  /**
   * ブラウザを終了
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * ブラウザが初期化されているか
   */
  isInitialized(): boolean {
    return this.browser !== null;
  }

  /**
   * ページをスクレイピング
   */
  async scrape(
    url: string,
    options?: NavigationOptions & {
      extractors?: ExtractorConfig[];
      screenshot?: boolean;
    }
  ): Promise<Result<PageScrapeResult, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        // ページに移動
        await (page as ExtendedPage).goto(url, {
          waitUntil: options?.waitUntil || 'domcontentloaded',
          timeout: options?.timeout || this.config.timeout,
          referer: options?.referer,
        });

        // コンテンツを抽出
        const result = await this.extractor.extract(page, options?.extractors);

        // スクリーンショット（オプション）
        let screenshot: Buffer | undefined;
        if (options?.screenshot) {
          screenshot = (await page.screenshot({ type: 'png' })) as Buffer;
        }

        const extPage = page as ExtendedPage;
        return ok({
          url: extPage.url(),
          title: await extPage.title(),
          content: result.content,
          html: result.html,
          extractedData: result.extractedData,
          links: result.links,
          images: result.images,
          metadata: result.metadata,
          screenshot,
        });
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'NAVIGATION_FAILED',
          `Failed to scrape ${url}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * スクリプトを実行
   */
  async runScript(
    script: BrowserScript
  ): Promise<Result<ActionResult[], BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();
      const results: ActionResult[] = [];

      try {
        for (const action of script.actions) {
          // 変数を置換
          const processedAction = this.processVariables(action, script.variables);

          const result = await this.executor.execute(page, processedAction);
          results.push(result);

          if (!result.success) {
            break;
          }
        }

        return ok(results);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'ACTION_FAILED',
          `Script execution failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * 単一アクションを実行
   */
  async executeAction(
    url: string,
    action: BrowserAction
  ): Promise<Result<ActionResult, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        // まずURLに移動
        await (page as ExtendedPage).goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout,
        });

        // アクションを実行
        const result = await this.executor.execute(page, action);

        return ok(result);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'ACTION_FAILED',
          `Action execution failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * スクリーンショットを取得
   */
  async screenshot(
    url: string,
    options?: ScreenshotOptions & {
      waitUntil?: NavigationOptions['waitUntil'];
    }
  ): Promise<Result<Buffer, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        await (page as ExtendedPage).goto(url, {
          waitUntil: options?.waitUntil || 'networkidle2',
          timeout: this.config.timeout,
        });

        const screenshot = (await page.screenshot({
          fullPage: options?.fullPage ?? true,
          type: options?.type || 'png',
          quality: options?.type === 'jpeg' ? options?.quality : undefined,
        })) as Buffer;

        return ok(screenshot);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'ACTION_FAILED',
          `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * PDFを生成
   */
  async pdf(
    url: string,
    options?: PdfOptions & {
      waitUntil?: NavigationOptions['waitUntil'];
    }
  ): Promise<Result<Buffer, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        await (page as ExtendedPage).goto(url, {
          waitUntil: options?.waitUntil || 'networkidle2',
          timeout: this.config.timeout,
        });

        const pdf = await page.pdf({
          format: options?.format || 'A4',
          landscape: options?.landscape || false,
          printBackground: options?.printBackground ?? true,
        });

        return ok(pdf);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'ACTION_FAILED',
          `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * 認証付きでページにアクセス
   */
  async scrapeWithAuth(
    url: string,
    loginUrl: string,
    credentials: AuthCredentials,
    loginSelectors: LoginSelectors
  ): Promise<Result<PageScrapeResult, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();
      const extPage = page as ExtendedPage;

      try {
        // ログインページに移動
        await extPage.goto(loginUrl, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        });

        // 認証情報を入力
        await page.type(loginSelectors.username, credentials.username);
        await page.type(loginSelectors.password, credentials.password);

        // ログインボタンをクリック
        await Promise.all([
          page.waitForSelector('body'), // ナビゲーション待機の代替
          page.click(loginSelectors.submit),
        ]);

        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ログイン成功を確認
        if (loginSelectors.successIndicator) {
          await page.waitForSelector(loginSelectors.successIndicator, {
            timeout: 10000,
          });
        }

        // 目的のURLに移動
        await extPage.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        });

        // コンテンツを抽出
        const result = await this.extractor.extract(page);

        return ok({
          url: extPage.url(),
          title: await extPage.title(),
          content: result.content,
          html: result.html,
          links: result.links,
          images: result.images,
          metadata: result.metadata,
        });
      } finally {
        await extPage.close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'AUTHENTICATION_FAILED',
          `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * 無限スクロールを処理
   */
  async scrapeInfiniteScroll(
    url: string,
    options?: {
      maxScrolls?: number;
      scrollDelay?: number;
      contentSelector?: string;
    }
  ): Promise<Result<PageScrapeResult, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();
      const extPage = page as ExtendedPage;
      const maxScrolls = options?.maxScrolls || 10;
      const scrollDelay = options?.scrollDelay || 1000;

      try {
        await extPage.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        });

        let previousHeight = 0;
        let scrollCount = 0;

        while (scrollCount < maxScrolls) {
          // ページの高さを取得
          const currentHeight = await page.evaluate(
            'document.body.scrollHeight'
          ) as number;

          if (currentHeight === previousHeight) {
            break;
          }

          previousHeight = currentHeight;

          // 下までスクロール
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

          // 待機
          await new Promise(resolve => setTimeout(resolve, scrollDelay));

          scrollCount++;
        }

        // コンテンツを抽出
        const result = await this.extractor.extract(page);

        return ok({
          url: extPage.url(),
          title: await extPage.title(),
          content: result.content,
          html: result.html,
          links: result.links,
          images: result.images,
          metadata: result.metadata,
        });
      } finally {
        await extPage.close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'NAVIGATION_FAILED',
          `Infinite scroll scraping failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * セッションを保存
   */
  async saveSession(
    name: string
  ): Promise<Result<SessionInfo, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        const session = await this.sessionManager.save(page, name);
        return ok(session);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'ACTION_FAILED',
          `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * セッションを復元
   */
  async loadSession(name: string): Promise<Result<void, BrowserAutomationError>> {
    try {
      await this.initialize();

      const page = await this.createPage();

      try {
        await this.sessionManager.load(page, name);
        return ok(undefined);
      } finally {
        await (page as ExtendedPage).close();
      }
    } catch (error) {
      return err(
        new BrowserAutomationError(
          'SESSION_NOT_FOUND',
          `Failed to load session: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * 新しいページを作成
   */
  private async createPage(): Promise<BrowserPage> {
    if (!this.browser) {
      throw new BrowserAutomationError(
        'BROWSER_NOT_INITIALIZED',
        'Browser not initialized. Call initialize() first.'
      );
    }

    const page = (await this.browser.newPage()) as ExtendedPage;

    // ビューポート設定
    if (this.config.viewport) {
      await page.setViewport(this.config.viewport);
    }

    // ユーザーエージェント設定
    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }

    // JavaScript無効化
    if (this.config.disableJavaScript) {
      await page.setJavaScriptEnabled(false);
    }

    // リクエストインターセプト（画像ブロック等）
    if (this.config.disableImages) {
      await page.setRequestInterception(true);
      page.on('request', (req: unknown) => {
        const request = req as { resourceType: () => string; abort: () => void; continue: () => void };
        if (request.resourceType() === 'image') {
          request.abort();
        } else {
          request.continue();
        }
      });
    }

    return page;
  }

  /**
   * 変数を置換
   */
  private processVariables(
    action: BrowserAction,
    variables?: Record<string, string>
  ): BrowserAction {
    if (!variables) return action;

    const actionStr = JSON.stringify(action);
    let processed = actionStr;

    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    return JSON.parse(processed);
  }

  /**
   * 設定を取得
   */
  getConfig(): BrowserConfig {
    return { ...this.config };
  }

  /**
   * セッションマネージャーを取得
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

// デフォルトエクスポート
export default BrowserAutomation;
