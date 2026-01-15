/**
 * TokenTracker - トークン使用量追跡
 *
 * @requirement REQ-DR-007
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { TokenUsage } from './types.js';

/**
 * TokenTrackerオプション
 */
export interface TokenTrackerOptions {
  /** トークン予算 */
  budget: number;
}

/**
 * トークン使用量を追跡するクラス
 *
 * @example
 * ```typescript
 * const tracker = new TokenTracker({ budget: 1_000_000 });
 *
 * tracker.trackUsage(100, 50); // promptTokens, completionTokens
 *
 * console.log(`Remaining: ${tracker.getRemainingBudget()}`);
 * console.log(`Usage: ${(tracker.getUsageRatio() * 100).toFixed(1)}%`);
 * ```
 */
export class TokenTracker {
  private budget: number;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private usage: Map<string, number>;
  private history: Array<{ tool: string; usage: TokenUsage; timestamp: string }>;

  constructor(options: TokenTrackerOptions | number) {
    if (typeof options === 'number') {
      this.budget = options;
    } else {
      this.budget = options.budget;
    }
    this.usage = new Map();
    this.history = [];
  }

  /**
   * トークン使用量を記録（prompt/completionトークン）
   */
  trackUsage(promptTokens: number, completionTokens: number): void;
  /**
   * トークン使用量を記録（ツール名付き）
   */
  trackUsage(tool: string, usage: TokenUsage): void;
  trackUsage(arg1: number | string, arg2: number | TokenUsage): void {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      // trackUsage(promptTokens, completionTokens)
      this.promptTokens += arg1;
      this.completionTokens += arg2;
      const total = arg1 + arg2;
      const current = this.usage.get('llm') || 0;
      this.usage.set('llm', current + total);
      this.history.push({
        tool: 'llm',
        usage: { promptTokens: arg1, completionTokens: arg2, totalTokens: total },
        timestamp: new Date().toISOString(),
      });
    } else if (typeof arg1 === 'string' && typeof arg2 === 'object') {
      // trackUsage(tool, usage)
      const tool = arg1;
      const usage = arg2 as TokenUsage;
      this.promptTokens += usage.promptTokens;
      this.completionTokens += usage.completionTokens;
      const current = this.usage.get(tool) || 0;
      this.usage.set(tool, current + usage.totalTokens);
      this.history.push({
        tool,
        usage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 総使用量を取得
   */
  getTotalUsage(): number {
    return this.promptTokens + this.completionTokens;
  }

  /**
   * トークン使用量を取得
   */
  getUsage(): TokenUsage {
    return {
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.promptTokens + this.completionTokens,
    };
  }

  /**
   * 残り予算を取得
   */
  getRemainingBudget(): number {
    return Math.max(0, this.budget - this.getTotalUsage());
  }

  /**
   * ツール別の使用量を取得
   */
  getBreakdown(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [tool, count] of this.usage.entries()) {
      result[tool] = count;
    }
    return result;
  }

  /**
   * 予算を超過しているか
   */
  isExceeded(): boolean {
    return this.getTotalUsage() >= this.budget;
  }

  /**
   * 使用率を取得（0-1）
   */
  getUsageRatio(): number {
    return this.getTotalUsage() / this.budget;
  }

  /**
   * 残り予算の比率を取得（0-1）
   */
  getRemainingRatio(): number {
    return this.getRemainingBudget() / this.budget;
  }

  /**
   * 履歴を取得
   */
  getHistory(): Array<{ tool: string; usage: TokenUsage; timestamp: string }> {
    return [...this.history];
  }

  /**
   * 予算を更新
   */
  setBudget(budget: number): void {
    this.budget = budget;
  }

  /**
   * リセット
   */
  reset(): void {
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.usage.clear();
    this.history = [];
  }

  /**
   * 現在の状態をサマリーとして取得
   */
  getSummary(): {
    budget: number;
    used: number;
    remaining: number;
    usageRatio: number;
    isExceeded: boolean;
    breakdown: Record<string, number>;
  } {
    return {
      budget: this.budget,
      used: this.getTotalUsage(),
      remaining: this.getRemainingBudget(),
      usageRatio: this.getUsageRatio(),
      isExceeded: this.isExceeded(),
      breakdown: this.getBreakdown(),
    };
  }
}

// 型のエクスポート
export type { TokenUsage };
