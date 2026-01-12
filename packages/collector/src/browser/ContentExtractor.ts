/**
 * ContentExtractor - ページからコンテンツを抽出
 *
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

import type {
  ExtractionResult,
  ExtractorConfig,
  PageLink,
  PageImage,
  PageMetadata,
} from './types.js';
import type { BrowserPage } from './ActionExecutor.js';

/**
 * ページからコンテンツを抽出
 */
export class ContentExtractor {
  /**
   * ページからコンテンツを抽出
   */
  async extract(
    page: BrowserPage,
    extractors?: ExtractorConfig[]
  ): Promise<ExtractionResult> {
    // メインコンテンツを抽出
    const content = await this.extractMainContent(page);

    // HTML全体を取得
    const html = await this.extractHtml(page);

    // リンクを抽出
    const links = await this.extractLinks(page);

    // 画像を抽出
    const images = await this.extractImages(page);

    // メタデータを抽出
    const metadata = await this.extractMetadata(page);

    // カスタム抽出
    let extractedData: Record<string, unknown> | undefined;
    if (extractors && extractors.length > 0) {
      extractedData = await this.extractCustomData(page, extractors);
    }

    return {
      content,
      html,
      extractedData,
      links,
      images,
      metadata,
    };
  }

  /**
   * メインコンテンツを抽出
   */
  private async extractMainContent(page: BrowserPage): Promise<string> {
    return page.evaluate(`
      (() => {
        const clone = document.body.cloneNode(true);
        const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript'];
        removeSelectors.forEach(sel => {
          clone.querySelectorAll(sel).forEach(el => el.remove());
        });
        return clone.textContent?.replace(/\\s+/g, ' ').trim() || '';
      })()
    `);
  }

  /**
   * HTML全体を取得
   */
  private async extractHtml(page: BrowserPage): Promise<string> {
    return page.evaluate('document.documentElement.outerHTML');
  }

  /**
   * リンクを抽出
   */
  private async extractLinks(page: BrowserPage): Promise<PageLink[]> {
    return page.evaluate(`
      (() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors).map(a => ({
          href: a.href,
          text: a.textContent?.trim() || '',
          rel: a.rel || undefined,
        }));
      })()
    `);
  }

  /**
   * 画像を抽出
   */
  private async extractImages(page: BrowserPage): Promise<PageImage[]> {
    return page.evaluate(`
      (() => {
        const imgs = document.querySelectorAll('img[src]');
        return Array.from(imgs).map(img => ({
          src: img.src,
          alt: img.alt || undefined,
          width: img.naturalWidth || undefined,
          height: img.naturalHeight || undefined,
        }));
      })()
    `);
  }

  /**
   * メタデータを抽出
   */
  private async extractMetadata(page: BrowserPage): Promise<PageMetadata> {
    return page.evaluate(`
      (() => {
        const getMeta = (name) => {
          const el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
          return el?.getAttribute('content') || undefined;
        };

        const ogp = {};
        document.querySelectorAll('meta[property^="og:"]').forEach(el => {
          const property = el.getAttribute('property');
          const content = el.getAttribute('content');
          if (property && content) {
            ogp[property.replace('og:', '')] = content;
          }
        });

        return {
          description: getMeta('description'),
          keywords: getMeta('keywords')?.split(',').map(k => k.trim()),
          ogp: Object.keys(ogp).length > 0 ? ogp : undefined,
          language: document.documentElement.lang || undefined,
        };
      })()
    `);
  }

  /**
   * カスタム抽出
   */
  private async extractCustomData(
    page: BrowserPage,
    extractors: ExtractorConfig[]
  ): Promise<Record<string, unknown>> {
    const extractedData: Record<string, unknown> = {};

    for (const extractor of extractors) {
      try {
        if (extractor.multiple) {
          extractedData[extractor.name] = await page.$$eval(
            extractor.selector,
            (els: any[], attr: any) =>
              els.map((el: any) =>
                attr ? el.getAttribute(attr) : el.textContent?.trim()
              ),
            extractor.attribute
          );
        } else {
          extractedData[extractor.name] = await page.$eval(
            extractor.selector,
            (el: any, attr: any) =>
              attr ? el.getAttribute(attr) : el.textContent?.trim(),
            extractor.attribute
          );
        }
      } catch {
        extractedData[extractor.name] = null;
      }
    }

    return extractedData;
  }

  /**
   * テキストコンテンツを抽出（シンプル版）
   */
  async extractText(page: BrowserPage, selector: string): Promise<string> {
    return page.$eval(
      selector,
      (el: any) => el.textContent?.trim() || ''
    );
  }

  /**
   * 属性を抽出
   */
  async extractAttribute(
    page: BrowserPage,
    selector: string,
    attribute: string
  ): Promise<string | null> {
    return page.$eval(
      selector,
      (el: any, attr: any) => el.getAttribute(attr),
      attribute
    );
  }

  /**
   * 複数要素のテキストを抽出
   */
  async extractAllText(page: BrowserPage, selector: string): Promise<string[]> {
    return page.$$eval(
      selector,
      (els: any[]) => els.map((el: any) => el.textContent?.trim() || '')
    );
  }
}
