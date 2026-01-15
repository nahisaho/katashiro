/**
 * KnowledgeStore - 中間知識の管理
 *
 * @requirement REQ-DR-003
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { KnowledgeItem } from './types.js';

/**
 * 調査中に得た知識を構造化して蓄積するストア
 *
 * @example
 * ```typescript
 * const store = new KnowledgeStore();
 *
 * const id = store.add({
 *   question: 'What is AI ethics?',
 *   answer: 'AI ethics is...',
 *   type: 'url',
 *   references: ['https://example.com'],
 *   confidence: 0.9,
 * });
 *
 * const items = store.search('ethics');
 * const messages = store.toMessages();
 * ```
 */
export class KnowledgeStore {
  private items: Map<string, KnowledgeItem>;
  private idCounter: number;

  constructor() {
    this.items = new Map();
    this.idCounter = 0;
  }

  /**
   * ナレッジアイテムを追加
   */
  add(item: Omit<KnowledgeItem, 'id' | 'updated'>): string {
    const id = `knowledge-${++this.idCounter}`;
    const fullItem: KnowledgeItem = {
      ...item,
      id,
      updated: new Date().toISOString(),
    };
    this.items.set(id, fullItem);
    return id;
  }

  /**
   * IDでアイテムを取得
   */
  get(id: string): KnowledgeItem | undefined {
    return this.items.get(id);
  }

  /**
   * 全アイテムを取得
   */
  getAll(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }

  /**
   * タイプでフィルタリング
   */
  getByType(type: KnowledgeItem['type']): KnowledgeItem[] {
    return this.getAll().filter((item) => item.type === type);
  }

  /**
   * キーワードで検索
   */
  search(query: string): KnowledgeItem[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (item) =>
        (item.question?.toLowerCase().includes(lowerQuery) ?? false) ||
        (item.answer?.toLowerCase().includes(lowerQuery) ?? false) ||
        (item.summary?.toLowerCase().includes(lowerQuery) ?? false) ||
        (item.content?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }

  /**
   * 信頼度でソート
   */
  getByConfidence(minConfidence: number = 0): KnowledgeItem[] {
    return this.getAll()
      .filter((item) => (item.confidence ?? 0) >= minConfidence)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  }

  /**
   * Q&A形式のメッセージに変換
   */
  toMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const item of this.getAll()) {
      // ユーザーの質問（questionがなければスキップ）
      const questionText = item.question ?? item.summary ?? '';
      if (!questionText) continue;

      messages.push({
        role: 'user',
        content: questionText.trim(),
      });

      // アシスタントの回答（メタデータ付き）
      let answerContent = '';

      if (item.updated && (item.type === 'url' || item.type === 'side-info')) {
        answerContent += `<answer-datetime>\n${item.updated}\n</answer-datetime>\n\n`;
      }

      if (item.references && item.references.length > 0 && item.type === 'url') {
        answerContent += `<url>\n${item.references[0]}\n</url>\n\n`;
      }

      answerContent += item.answer;

      messages.push({
        role: 'assistant',
        content: answerContent.trim(),
      });
    }

    return messages;
  }

  /**
   * アイテムを更新
   */
  update(id: string, updates: Partial<Omit<KnowledgeItem, 'id'>>): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this.items.set(id, {
      ...item,
      ...updates,
      updated: new Date().toISOString(),
    });
    return true;
  }

  /**
   * アイテムを削除
   */
  delete(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * 全てクリア
   */
  clear(): void {
    this.items.clear();
    this.idCounter = 0;
  }

  /**
   * アイテム数を取得
   */
  size(): number {
    return this.items.size;
  }

  /**
   * 重複チェック（同じ質問が既にあるか）
   */
  hasSimilarQuestion(question: string, threshold: number = 0.8): boolean {
    const normalizedQuestion = question.toLowerCase().trim();
    for (const item of this.items.values()) {
      const itemQuestion = item.question ?? item.summary ?? '';
      const normalizedExisting = itemQuestion.toLowerCase().trim();
      if (this.similarity(normalizedQuestion, normalizedExisting) >= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * 簡易的な類似度計算（Jaccard係数）
   */
  private similarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  /**
   * JSONにシリアライズ
   */
  toJSON(): KnowledgeItem[] {
    return this.getAll();
  }

  /**
   * JSONからデシリアライズ
   */
  fromJSON(items: KnowledgeItem[]): void {
    this.clear();
    for (const item of items) {
      this.items.set(item.id, item);
      const numId = parseInt(item.id.replace('knowledge-', ''), 10);
      if (!isNaN(numId) && numId > this.idCounter) {
        this.idCounter = numId;
      }
    }
  }
}
