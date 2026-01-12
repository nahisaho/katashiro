/**
 * Session Manager
 * REPLセッション管理
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import {
  ExecutionSession,
  SupportedLanguage,
  SessionHistoryEntry,
} from './types.js';

/**
 * セッションマネージャー
 *
 * REPLモード用のセッションを管理する。
 * セッション内では変数やインポートが保持される。
 *
 * @example
 * ```typescript
 * const manager = new SessionManager();
 *
 * // セッション作成
 * const session = await manager.create('python');
 *
 * // セッション情報
 * console.log(session.id);       // "session-xxx"
 * console.log(session.language); // "python"
 * console.log(session.state);    // "active"
 *
 * // 履歴追加
 * manager.addHistory(session.id, {
 *   input: 'x = 1',
 *   output: '',
 *   executedAt: new Date(),
 *   success: true,
 * });
 *
 * // セッション終了
 * await manager.terminate(session.id);
 * ```
 */
export class SessionManager {
  private sessions: Map<string, ExecutionSession> = new Map();
  private readonly maxIdleTime = 30 * 60 * 1000; // 30分

  /**
   * セッションを作成
   */
  async create(language: SupportedLanguage): Promise<ExecutionSession> {
    const id = this.generateId();
    const now = new Date();

    const session: ExecutionSession = {
      id,
      language,
      state: 'active',
      history: [],
      globals: {},
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * セッションを取得
   */
  get(id: string): ExecutionSession | undefined {
    const session = this.sessions.get(id);

    if (session) {
      // アイドルタイムアウトチェック
      const idleTime = Date.now() - session.lastActivity.getTime();
      if (idleTime > this.maxIdleTime && session.state === 'active') {
        session.state = 'idle';
      }
    }

    return session;
  }

  /**
   * セッションが存在するかチェック
   */
  has(id: string): boolean {
    return this.sessions.has(id);
  }

  /**
   * セッションを終了
   */
  async terminate(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.state = 'terminated';
      this.sessions.delete(id);
    }
  }

  /**
   * セッションをアクティブ化
   */
  activate(id: string): void {
    const session = this.sessions.get(id);
    if (session && session.state !== 'terminated') {
      session.state = 'active';
      session.lastActivity = new Date();
    }
  }

  /**
   * 履歴を追加
   */
  addHistory(id: string, entry: SessionHistoryEntry): void {
    const session = this.sessions.get(id);
    if (session) {
      session.history.push(entry);
      session.lastActivity = new Date();

      // 履歴の上限（100エントリ）
      if (session.history.length > 100) {
        session.history = session.history.slice(-100);
      }
    }
  }

  /**
   * グローバル変数を設定
   */
  setGlobal(id: string, key: string, value: unknown): void {
    const session = this.sessions.get(id);
    if (session) {
      session.globals[key] = value;
      session.lastActivity = new Date();
    }
  }

  /**
   * グローバル変数を取得
   */
  getGlobal(id: string, key: string): unknown {
    const session = this.sessions.get(id);
    return session?.globals[key];
  }

  /**
   * すべてのグローバル変数を取得
   */
  getAllGlobals(id: string): Record<string, unknown> {
    const session = this.sessions.get(id);
    return session?.globals || {};
  }

  /**
   * セッション一覧
   */
  list(): ExecutionSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * アクティブセッション一覧
   */
  listActive(): ExecutionSession[] {
    return this.list().filter((s) => s.state === 'active');
  }

  /**
   * すべてのセッションを終了
   */
  async terminateAll(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map((id) => this.terminate(id)));
  }

  /**
   * アイドルセッションをクリーンアップ
   */
  async cleanupIdle(): Promise<number> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, session] of this.sessions) {
      const idleTime = now - session.lastActivity.getTime();
      if (idleTime > this.maxIdleTime) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      await this.terminate(id);
    }

    return toRemove.length;
  }

  /**
   * セッション数
   */
  get count(): number {
    return this.sessions.size;
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
