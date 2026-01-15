/**
 * アクションハンドラの基底クラスとインターフェース
 *
 * @requirement REQ-DR-001
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { ActionType, KnowledgeItem, AgentConfig } from '../types.js';
import type { TokenTracker } from '../TokenTracker.js';

/**
 * アクション実行結果
 */
export interface ActionResult {
  /** 成功したか */
  success: boolean;
  /** 取得したナレッジアイテム */
  knowledgeItems: KnowledgeItem[];
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * アクションハンドラのオプション
 */
export interface ActionHandlerOptions {
  /** エージェント設定 */
  config: AgentConfig;
  /** トークントラッカー */
  tokenTracker: TokenTracker;
}

/**
 * アクションハンドラの基底インターフェース
 */
export interface IActionHandler<TParams = unknown> {
  /** アクションタイプ */
  readonly actionType: ActionType;

  /**
   * アクションを実行
   */
  execute(params: TParams, context: ExecutionContext): Promise<ActionResult>;
}

/**
 * アクション実行コンテキスト（簡易版）
 */
export interface ExecutionContext {
  /** 元の質問 */
  question: string;
  /** 現在のステップ番号 */
  stepNumber: number;
  /** 訪問済みURL */
  visitedUrls: string[];
  /** 検索結果からのURL候補 */
  searchResultUrls: { index: number; url: string; title: string }[];
  /** 現在のナレッジ */
  currentKnowledge: KnowledgeItem[];
}

/**
 * アクションハンドラの基底抽象クラス
 */
export abstract class BaseActionHandler<TParams = unknown> implements IActionHandler<TParams> {
  abstract readonly actionType: ActionType;

  protected config: AgentConfig;
  protected tokenTracker: TokenTracker;

  constructor(options: ActionHandlerOptions) {
    this.config = options.config;
    this.tokenTracker = options.tokenTracker;
  }

  abstract execute(params: TParams, context: ExecutionContext): Promise<ActionResult>;

  /**
   * ナレッジアイテムを生成
   */
  protected createKnowledgeItem(
    content: string,
    source: { url?: string; title?: string; type: 'web' | 'code' | 'reflection' }
  ): KnowledgeItem {
    const now = new Date();
    const id = `ki-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id,
      sourceId: source.url || `internal-${id}`,
      sourceType: source.type,
      summary: this.createSummary(content),
      content,
      keywords: this.extractKeywords(content),
      timestamp: now.toISOString(),
      metadata: {
        title: source.title,
        url: source.url,
      },
    };
  }

  /**
   * コンテンツから要約を生成
   */
  private createSummary(content: string): string {
    // 最初の300文字を要約として使用
    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 300) {
      return cleaned;
    }
    return cleaned.slice(0, 297) + '...';
  }

  /**
   * コンテンツからキーワードを抽出
   */
  private extractKeywords(content: string): string[] {
    // 簡易的なキーワード抽出
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // 頻度でソート
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 10).map(([word]) => word);
  }
}
