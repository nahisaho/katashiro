/**
 * ActionExecutor - ブラウザアクションを実行
 *
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

import type {
  BrowserAction,
  ActionResult,
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
} from './types.js';

/**
 * Puppeteer Page インターフェース（抽象化）
 */
export interface BrowserPage {
  goto(url: string, options?: unknown): Promise<unknown>;
  click(selector: string, options?: unknown): Promise<void>;
  type(selector: string, text: string, options?: unknown): Promise<void>;
  select(selector: string, ...values: string[]): Promise<string[]>;
  hover(selector: string): Promise<void>;
  screenshot(options?: unknown): Promise<Buffer | string>;
  pdf(options?: unknown): Promise<Buffer>;
  evaluate<T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
  waitForSelector(selector: string, options?: unknown): Promise<unknown>;
  $eval<T>(selector: string, fn: (el: any, ...args: any[]) => T, ...args: any[]): Promise<T>;
  $$eval<T>(selector: string, fn: (els: any[], ...args: any[]) => T, ...args: any[]): Promise<T>;
}

/**
 * ブラウザアクションを実行
 */
export class ActionExecutor {
  /**
   * アクションを実行
   */
  async execute(page: BrowserPage, action: BrowserAction): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeAction(page, action);
      return {
        actionType: action.type,
        success: true,
        duration: Date.now() - startTime,
        ...result,
      };
    } catch (error) {
      return {
        actionType: action.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * アクションを内部実行
   */
  private async executeAction(
    page: BrowserPage,
    action: BrowserAction
  ): Promise<Partial<ActionResult>> {
    switch (action.type) {
      case 'navigate':
        return this.executeNavigate(page, action);
      case 'click':
        return this.executeClick(page, action);
      case 'type':
        return this.executeType(page, action);
      case 'wait':
        return this.executeWait(action);
      case 'scroll':
        return this.executeScroll(page, action);
      case 'select':
        return this.executeSelect(page, action);
      case 'hover':
        return this.executeHover(page, action);
      case 'screenshot':
        return this.executeScreenshot(page, action);
      case 'pdf':
        return this.executePdf(page, action);
      case 'evaluate':
        return this.executeEvaluate(page, action);
      case 'waitForSelector':
        return this.executeWaitForSelector(page, action);
      case 'extract':
        return this.executeExtract(page, action);
      default:
        throw new Error(`Unknown action type: ${(action as BrowserAction).type}`);
    }
  }

  /**
   * navigate アクション
   */
  private async executeNavigate(
    page: BrowserPage,
    action: NavigateAction
  ): Promise<Partial<ActionResult>> {
    await page.goto(action.url, action.options);
    return {};
  }

  /**
   * click アクション
   */
  private async executeClick(
    page: BrowserPage,
    action: ClickAction
  ): Promise<Partial<ActionResult>> {
    await page.click(action.selector, action.options);
    return {};
  }

  /**
   * type アクション
   */
  private async executeType(
    page: BrowserPage,
    action: TypeAction
  ): Promise<Partial<ActionResult>> {
    if (action.options?.clear) {
      await page.click(action.selector, { clickCount: 3 });
    }
    await page.type(action.selector, action.text, {
      delay: action.options?.delay,
    });
    return {};
  }

  /**
   * wait アクション
   */
  private async executeWait(action: WaitAction): Promise<Partial<ActionResult>> {
    await new Promise(resolve => setTimeout(resolve, action.duration));
    return {};
  }

  /**
   * scroll アクション
   */
  private async executeScroll(
    page: BrowserPage,
    action: ScrollAction
  ): Promise<Partial<ActionResult>> {
    if (typeof action.target === 'string') {
      await page.evaluate(`document.querySelector('${action.target}')?.scrollIntoView()`);
    } else if (action.target) {
      await page.evaluate(`window.scrollTo(${action.target.x}, ${action.target.y})`);
    } else {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    }
    return {};
  }

  /**
   * select アクション
   */
  private async executeSelect(
    page: BrowserPage,
    action: SelectAction
  ): Promise<Partial<ActionResult>> {
    const selected = await page.select(action.selector, ...action.values);
    return { data: selected };
  }

  /**
   * hover アクション
   */
  private async executeHover(
    page: BrowserPage,
    action: HoverAction
  ): Promise<Partial<ActionResult>> {
    await page.hover(action.selector);
    return {};
  }

  /**
   * screenshot アクション
   */
  private async executeScreenshot(
    page: BrowserPage,
    action: ScreenshotAction
  ): Promise<Partial<ActionResult>> {
    const screenshot = await page.screenshot(action.options);
    return { screenshot: screenshot as Buffer };
  }

  /**
   * pdf アクション
   */
  private async executePdf(
    page: BrowserPage,
    action: PdfAction
  ): Promise<Partial<ActionResult>> {
    const pdf = await page.pdf(action.options);
    return { pdf };
  }

  /**
   * evaluate アクション
   */
  private async executeEvaluate(
    page: BrowserPage,
    action: EvaluateAction
  ): Promise<Partial<ActionResult>> {
    const data = await page.evaluate(action.script, ...(action.args || []));
    return { data };
  }

  /**
   * waitForSelector アクション
   */
  private async executeWaitForSelector(
    page: BrowserPage,
    action: WaitForSelectorAction
  ): Promise<Partial<ActionResult>> {
    await page.waitForSelector(action.selector, action.options);
    return {};
  }

  /**
   * extract アクション
   */
  private async executeExtract(
    page: BrowserPage,
    action: ExtractAction
  ): Promise<Partial<ActionResult>> {
    let extractedText: string | string[];

    if (action.multiple) {
      extractedText = await page.$$eval(
        action.selector,
        (els: any[], attr: any) =>
          els.map((el: any) =>
            attr ? el.getAttribute(attr) || '' : el.textContent || ''
          ),
        action.attribute
      );
    } else {
      extractedText = await page.$eval(
        action.selector,
        (el: any, attr: any) =>
          attr ? el.getAttribute(attr) || '' : el.textContent || '',
        action.attribute
      );
    }

    return { extractedText };
  }
}
