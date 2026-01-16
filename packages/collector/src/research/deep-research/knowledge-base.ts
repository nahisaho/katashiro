/**
 * Knowledge Base
 *
 * 収集した知識の蓄積・検索・管理
 *
 * @version 3.0.0
 */

import type { KnowledgeItem, WebContent } from './types.js';

/**
 * Knowledge Base Configuration
 */
export interface KnowledgeBaseConfig {
  /** Maximum items to store */
  maxItems?: number;
  /** Similarity threshold for deduplication (0-1) */
  deduplicationThreshold?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Similar Item Result
 */
interface SimilarItem {
  item: KnowledgeItem;
  similarity: number;
}

/**
 * KnowledgeBase - 知識蓄積・検索エンジン
 */
export class KnowledgeBase {
  private readonly items: Map<string, KnowledgeItem> = new Map();
  private readonly config: Required<KnowledgeBaseConfig>;

  constructor(config: KnowledgeBaseConfig = {}) {
    this.config = {
      maxItems: config.maxItems ?? 1000,
      deduplicationThreshold: config.deduplicationThreshold ?? 0.8,
      debug: config.debug ?? false,
    };
  }

  /**
   * Add knowledge from web content
   */
  addFromContent(content: WebContent, iteration: number): KnowledgeItem[] {
    const added: KnowledgeItem[] = [];

    for (const fact of content.extractedFacts) {
      const item = this.createItem(fact, 'fact', [content.url], iteration);

      // Check for duplicates
      if (!this.isDuplicate(item)) {
        this.items.set(item.id, item);
        added.push(item);

        if (this.debug) {
          console.log(`[KnowledgeBase] Added: ${fact.slice(0, 50)}...`);
        }
      }
    }

    // Enforce max items limit
    this.enforceLimit();

    return added;
  }

  /**
   * Add a single knowledge item
   */
  add(item: Omit<KnowledgeItem, 'id' | 'timestamp'>): KnowledgeItem | null {
    const fullItem: KnowledgeItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    if (this.isDuplicate(fullItem)) {
      return null;
    }

    this.items.set(fullItem.id, fullItem);
    this.enforceLimit();

    return fullItem;
  }

  /**
   * Search for similar items
   */
  searchSimilar(query: string, topK = 5): SimilarItem[] {
    const results: SimilarItem[] = [];

    for (const item of this.items.values()) {
      const similarity = this.calculateSimilarity(query, item.content);
      if (similarity > 0.1) {
        results.push({ item, similarity });
      }
    }

    // Sort by similarity and take top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get items by type
   */
  getByType(type: KnowledgeItem['type']): KnowledgeItem[] {
    return Array.from(this.items.values()).filter((item) => item.type === type);
  }

  /**
   * Get items by iteration
   */
  getByIteration(iteration: number): KnowledgeItem[] {
    return Array.from(this.items.values()).filter(
      (item) => item.iteration === iteration
    );
  }

  /**
   * Get all items
   */
  getAll(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items sorted by relevance
   */
  getTopByRelevance(topK = 10): KnowledgeItem[] {
    return Array.from(this.items.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  /**
   * Get unique sources
   */
  getSources(): string[] {
    const sources = new Set<string>();
    for (const item of this.items.values()) {
      for (const source of item.sources) {
        sources.add(source);
      }
    }
    return Array.from(sources);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalItems: number;
    factCount: number;
    opinionCount: number;
    questionCount: number;
    recommendationCount: number;
    uniqueSources: number;
    averageRelevance: number;
  } {
    const items = this.getAll();
    const relevances = items.map((i) => i.relevance);

    return {
      totalItems: items.length,
      factCount: items.filter((i) => i.type === 'fact').length,
      opinionCount: items.filter((i) => i.type === 'opinion').length,
      questionCount: items.filter((i) => i.type === 'question').length,
      recommendationCount: items.filter((i) => i.type === 'recommendation')
        .length,
      uniqueSources: this.getSources().length,
      averageRelevance:
        relevances.length > 0
          ? relevances.reduce((a, b) => a + b, 0) / relevances.length
          : 0,
    };
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Export as JSON
   */
  export(): KnowledgeItem[] {
    return this.getAll();
  }

  /**
   * Import from JSON
   */
  import(items: KnowledgeItem[]): number {
    let imported = 0;
    for (const item of items) {
      if (!this.isDuplicate(item)) {
        this.items.set(item.id, item);
        imported++;
      }
    }
    this.enforceLimit();
    return imported;
  }

  /**
   * Get summary text
   */
  getSummaryText(): string {
    const items = this.getTopByRelevance(20);
    return items.map((item) => `- ${item.content}`).join('\n');
  }

  // ============ Private Methods ============

  /**
   * Create a knowledge item
   */
  private createItem(
    content: string,
    type: KnowledgeItem['type'],
    sources: string[],
    iteration: number
  ): KnowledgeItem {
    return {
      id: this.generateId(),
      type,
      content: content.trim(),
      sources,
      relevance: this.estimateRelevance(content),
      iteration,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Check if item is duplicate
   */
  private isDuplicate(newItem: KnowledgeItem): boolean {
    for (const existing of this.items.values()) {
      const similarity = this.calculateSimilarity(
        newItem.content,
        existing.content
      );
      if (similarity >= this.config.deduplicationThreshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate text similarity (Jaccard-like)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    // Remove punctuation and split
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }

  /**
   * Estimate relevance score
   */
  private estimateRelevance(content: string): number {
    let score = 0.5;

    // Longer content tends to be more informative
    if (content.length > 100) score += 0.1;
    if (content.length > 200) score += 0.1;

    // Contains numbers (often factual)
    if (/\d+/.test(content)) score += 0.1;

    // Contains citations or references
    if (/によると|according to|研究|調査|報告/i.test(content)) score += 0.1;

    // Contains specific terms
    if (/例えば|具体的|特に|重要/i.test(content)) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Enforce maximum items limit
   */
  private enforceLimit(): void {
    if (this.items.size <= this.config.maxItems) return;

    // Remove lowest relevance items
    const sorted = Array.from(this.items.values()).sort(
      (a, b) => a.relevance - b.relevance
    );

    const toRemove = sorted.slice(0, this.items.size - this.config.maxItems);
    for (const item of toRemove) {
      this.items.delete(item.id);
    }
  }

  /**
   * Debug logging getter
   */
  private get debug(): boolean {
    return this.config.debug;
  }
}

/**
 * Create a KnowledgeBase instance
 */
export function createKnowledgeBase(
  config?: KnowledgeBaseConfig
): KnowledgeBase {
  return new KnowledgeBase(config);
}
