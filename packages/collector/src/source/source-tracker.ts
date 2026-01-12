/**
 * SourceTracker - ソース追跡・変更検出
 *
 * @since 0.2.0
 * @requirement REQ-COLLECT-007-ENH-001
 * @design DES-KATASHIRO-002 §4.6 ソース追跡強化
 */

import { createHash } from 'node:crypto';

/**
 * ソースメタデータ
 */
export interface SourceMetadata {
  /** タイトル */
  title?: string;
  /** 著者 */
  author?: string;
  /** 公開日 */
  publishedAt?: Date;
  /** ドメイン */
  domain: string;
  /** 追加メタデータ */
  [key: string]: unknown;
}

/**
 * 追跡されたソース
 */
export interface TrackedSource {
  /** 一意識別子 */
  id: string;
  /** URL */
  url: string;
  /** アクセス日時 */
  accessedAt: Date;
  /** コンテンツハッシュ (SHA-256) */
  contentHash: string;
  /** 信頼度スコア (0-100) */
  credibilityScore: number;
  /** メタデータ */
  metadata: SourceMetadata;
  /** 使用されたコンテンツIDリスト */
  usedIn: string[];
}

/**
 * ソース追跡クラス
 */
export class SourceTracker {
  /** インメモリストア */
  private sources: Map<string, TrackedSource> = new Map();
  /** URLからIDへのマッピング */
  private urlIndex: Map<string, string> = new Map();
  /** ハッシュからIDへのマッピング */
  private hashIndex: Map<string, string> = new Map();

  /**
   * ソースを追跡
   */
  async track(url: string, content: string): Promise<TrackedSource> {
    const contentHash = this.computeHash(content);
    const domain = this.extractDomain(url);
    
    // 既存チェック
    const existingId = this.urlIndex.get(url);
    if (existingId) {
      const existing = this.sources.get(existingId);
      if (existing) {
        // コンテンツが変更されたか確認
        if (existing.contentHash !== contentHash) {
          // 変更あり - 更新
          existing.contentHash = contentHash;
          existing.accessedAt = new Date();
          this.hashIndex.set(contentHash, existingId);
        }
        return existing;
      }
    }

    // 新規作成
    const id = this.generateId();
    const trackedSource: TrackedSource = {
      id,
      url,
      accessedAt: new Date(),
      contentHash,
      credibilityScore: 0, // 後でCredibilityScorerで計算
      metadata: {
        domain,
      },
      usedIn: [],
    };

    this.sources.set(id, trackedSource);
    this.urlIndex.set(url, id);
    this.hashIndex.set(contentHash, id);

    return trackedSource;
  }

  /**
   * URLでソースを取得
   */
  async getByUrl(url: string): Promise<TrackedSource | null> {
    const id = this.urlIndex.get(url);
    if (!id) return null;
    return this.sources.get(id) || null;
  }

  /**
   * ハッシュでソースを取得
   */
  async getByHash(hash: string): Promise<TrackedSource | null> {
    const id = this.hashIndex.get(hash);
    if (!id) return null;
    return this.sources.get(id) || null;
  }

  /**
   * IDでソースを取得
   */
  async getById(id: string): Promise<TrackedSource | null> {
    return this.sources.get(id) || null;
  }

  /**
   * ソースをコンテンツに紐付け
   */
  async linkToContent(sourceId: string, contentId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (source && !source.usedIn.includes(contentId)) {
      source.usedIn.push(contentId);
    }
  }

  /**
   * コンテンツIDからソースを逆引き
   */
  async getSourcesByContent(contentId: string): Promise<TrackedSource[]> {
    const results: TrackedSource[] = [];
    for (const source of this.sources.values()) {
      if (source.usedIn.includes(contentId)) {
        results.push(source);
      }
    }
    return results;
  }

  /**
   * コンテンツ変更を検出
   */
  async detectChange(url: string, newContent: string): Promise<boolean> {
    const existing = await this.getByUrl(url);
    if (!existing) {
      return true; // 新規は「変更あり」扱い
    }
    const newHash = this.computeHash(newContent);
    return existing.contentHash !== newHash;
  }

  /**
   * メタデータを更新
   */
  async updateMetadata(
    sourceId: string, 
    metadata: Partial<SourceMetadata>
  ): Promise<TrackedSource | null> {
    const source = this.sources.get(sourceId);
    if (!source) return null;
    
    source.metadata = {
      ...source.metadata,
      ...metadata,
    };
    return source;
  }

  /**
   * 信頼度スコアを設定
   */
  async setCredibilityScore(sourceId: string, score: number): Promise<void> {
    const source = this.sources.get(sourceId);
    if (source) {
      source.credibilityScore = Math.max(0, Math.min(100, score));
    }
  }

  /**
   * すべてのソースを取得
   */
  async getAll(): Promise<TrackedSource[]> {
    return Array.from(this.sources.values());
  }

  /**
   * ソース数を取得
   */
  get size(): number {
    return this.sources.size;
  }

  /**
   * エクスポート（永続化用）
   */
  export(): TrackedSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * インポート（復元用）
   */
  import(sources: TrackedSource[]): void {
    for (const source of sources) {
      this.sources.set(source.id, source);
      this.urlIndex.set(source.url, source.id);
      this.hashIndex.set(source.contentHash, source.id);
    }
  }

  /**
   * クリア
   */
  clear(): void {
    this.sources.clear();
    this.urlIndex.clear();
    this.hashIndex.clear();
  }

  /**
   * SHA-256ハッシュを計算
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * ドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 一意IDを生成
   */
  private generateId(): string {
    return `src-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
