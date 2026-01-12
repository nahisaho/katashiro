/**
 * SessionManager - ブラウザセッションを管理
 *
 * @requirement REQ-COLLECT-009
 * @design DES-COLLECT-009-BrowserAutomation
 */

import type { SessionInfo, Cookie } from './types.js';
import type { BrowserPage } from './ActionExecutor.js';

/**
 * Cookie取得用の拡張Pageインターフェース
 */
interface PageWithCookies extends BrowserPage {
  cookies(): Promise<Cookie[]>;
  setCookie(...cookies: Cookie[]): Promise<void>;
}

/**
 * ブラウザセッションを管理
 */
export class SessionManager {
  private sessions: Map<string, SessionInfo> = new Map();

  /**
   * セッションを保存
   */
  async save(page: BrowserPage, name: string): Promise<SessionInfo> {
    const pageWithCookies = page as PageWithCookies;

    // Cookieを取得
    const cookies = await this.getCookies(pageWithCookies);

    // ストレージを取得
    const { localStorage, sessionStorage } = await this.getStorage(page);

    const session: SessionInfo = {
      id: `${name}-${Date.now()}`,
      cookies,
      localStorage,
      sessionStorage,
    };

    this.sessions.set(name, session);
    return session;
  }

  /**
   * セッションを復元
   */
  async load(page: BrowserPage, name: string): Promise<void> {
    const session = this.sessions.get(name);
    if (!session) {
      throw new Error(`Session not found: ${name}`);
    }

    const pageWithCookies = page as PageWithCookies;

    // Cookieを設定
    await this.setCookies(pageWithCookies, session.cookies);

    // ストレージを設定
    await this.setStorage(page, session.localStorage, session.sessionStorage);
  }

  /**
   * セッションを削除
   */
  delete(name: string): boolean {
    return this.sessions.delete(name);
  }

  /**
   * セッション一覧を取得
   */
  list(): string[] {
    return [...this.sessions.keys()];
  }

  /**
   * セッションが存在するか
   */
  has(name: string): boolean {
    return this.sessions.has(name);
  }

  /**
   * 全セッションをクリア
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * セッションを取得
   */
  get(name: string): SessionInfo | undefined {
    return this.sessions.get(name);
  }

  /**
   * セッションをエクスポート
   */
  export(name: string): string {
    const session = this.sessions.get(name);
    if (!session) {
      throw new Error(`Session not found: ${name}`);
    }
    return JSON.stringify(session);
  }

  /**
   * セッションをインポート
   */
  import(name: string, data: string): void {
    const session = JSON.parse(data) as SessionInfo;
    this.sessions.set(name, session);
  }

  /**
   * Cookieを取得
   */
  private async getCookies(page: PageWithCookies): Promise<Cookie[]> {
    try {
      if (typeof page.cookies === 'function') {
        return await page.cookies();
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Cookieを設定
   */
  private async setCookies(page: PageWithCookies, cookies: Cookie[]): Promise<void> {
    try {
      if (typeof page.setCookie === 'function' && cookies.length > 0) {
        await page.setCookie(...cookies);
      }
    } catch {
      // Cookie設定失敗を無視
    }
  }

  /**
   * ストレージを取得
   */
  private async getStorage(page: BrowserPage): Promise<{
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
  }> {
    try {
      return await page.evaluate(`
        (() => {
          const getStorageData = (storage) => {
            const data = {};
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (key) {
                data[key] = storage.getItem(key) || '';
              }
            }
            return data;
          };
          return {
            localStorage: getStorageData(localStorage),
            sessionStorage: getStorageData(sessionStorage),
          };
        })()
      `);
    } catch {
      return { localStorage: {}, sessionStorage: {} };
    }
  }

  /**
   * ストレージを設定
   */
  private async setStorage(
    page: BrowserPage,
    localStorage: Record<string, string>,
    sessionStorage: Record<string, string>
  ): Promise<void> {
    try {
      const localStorageJson = JSON.stringify(localStorage);
      const sessionStorageJson = JSON.stringify(sessionStorage);

      await page.evaluate(`
        (() => {
          const localData = ${localStorageJson};
          const sessionData = ${sessionStorageJson};
          
          Object.entries(localData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
          
          Object.entries(sessionData).forEach(([key, value]) => {
            sessionStorage.setItem(key, value);
          });
        })()
      `);
    } catch {
      // ストレージ設定失敗を無視
    }
  }
}
