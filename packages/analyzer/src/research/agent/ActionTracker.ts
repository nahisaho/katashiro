/**
 * ActionTracker - アクション履歴追跡
 *
 * @requirement REQ-DR-005
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { ActionType, DiaryEntry, StepAction } from './types.js';

/**
 * 実行されたアクションの履歴を追跡するクラス
 *
 * @example
 * ```typescript
 * const tracker = new ActionTracker();
 *
 * tracker.trackAction({
 *   stepNumber: 1,
 *   action: 'search',
 *   think: 'Looking for information about...',
 *   params: { searchQueries: ['AI ethics'] },
 *   timestamp: new Date().toISOString(),
 *   success: true,
 * });
 *
 * const diary = tracker.getDiaryContext();
 * ```
 */
export class ActionTracker {
  private steps: StepAction[];
  private diaryEntries: DiaryEntry[];
  private thoughts: string[];

  constructor() {
    this.steps = [];
    this.diaryEntries = [];
    this.thoughts = [];
  }

  /**
   * アクションを記録
   */
  trackAction(step: StepAction): void {
    this.steps.push(step);

    // ダイアリーエントリを生成
    const entry = this.createDiaryEntry(step);
    this.diaryEntries.push(entry);
  }

  /**
   * 思考を記録
   */
  trackThink(think: string, _languageCode?: string, params?: Record<string, string>): void {
    let formattedThink = think;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        formattedThink = formattedThink.replace(`{${key}}`, value);
      }
    }
    this.thoughts.push(formattedThink);
  }

  /**
   * 全ステップを取得
   */
  getSteps(): StepAction[] {
    return [...this.steps];
  }

  /**
   * 最新のステップを取得
   */
  getLastStep(): StepAction | undefined {
    return this.steps[this.steps.length - 1];
  }

  /**
   * 特定タイプのステップを取得
   */
  getStepsByAction(action: ActionType): StepAction[] {
    return this.steps.filter((s) => s.action === action);
  }

  /**
   * ダイアリーコンテキストを取得（人間が読める形式）
   */
  getDiaryContext(): string[] {
    return this.diaryEntries.map((entry) => this.formatDiaryEntry(entry));
  }

  /**
   * ステップ数を取得
   */
  getStepCount(): number {
    return this.steps.length;
  }

  /**
   * 成功したステップ数を取得
   */
  getSuccessCount(): number {
    return this.steps.filter((s) => s.success).length;
  }

  /**
   * 失敗したステップ数を取得
   */
  getFailureCount(): number {
    return this.steps.filter((s) => !s.success).length;
  }

  /**
   * アクションタイプ別の統計を取得
   */
  getActionStats(): Record<ActionType, { total: number; success: number; failure: number }> {
    const stats: Record<ActionType, { total: number; success: number; failure: number }> = {
      search: { total: 0, success: 0, failure: 0 },
      visit: { total: 0, success: 0, failure: 0 },
      reflect: { total: 0, success: 0, failure: 0 },
      answer: { total: 0, success: 0, failure: 0 },
      coding: { total: 0, success: 0, failure: 0 },
    };

    for (const step of this.steps) {
      stats[step.action].total++;
      if (step.success) {
        stats[step.action].success++;
      } else {
        stats[step.action].failure++;
      }
    }

    return stats;
  }

  /**
   * リセット
   */
  reset(): void {
    this.steps = [];
    this.diaryEntries = [];
    this.thoughts = [];
  }

  /**
   * ダイアリーエントリを生成
   */
  private createDiaryEntry(step: StepAction): DiaryEntry {
    let details = '';
    let result: 'success' | 'partial' | 'failure' = step.success ? 'success' : 'failure';

    switch (step.action) {
      case 'search': {
        const params = step.params as { searchQueries: string[] };
        details = `Searched for: "${params.searchQueries.join('", "')}"`;
        break;
      }
      case 'visit': {
        const params = step.params as { urlTargets: number[] };
        details = `Visited ${params.urlTargets.length} URL(s)`;
        break;
      }
      case 'reflect': {
        const params = step.params as { questions: string[] };
        details = `Reflected on ${params.questions.length} sub-question(s)`;
        break;
      }
      case 'answer': {
        const params = step.params as { answer: string; isFinal?: boolean };
        details = params.isFinal
          ? 'Provided final answer'
          : `Attempted answer (${params.answer.length} chars)`;
        break;
      }
      case 'coding': {
        const params = step.params as { codingIssue: string };
        details = `Coding task: ${params.codingIssue.slice(0, 50)}...`;
        break;
      }
    }

    return {
      step: step.stepNumber,
      action: step.action,
      question: step.think,
      details,
      result,
    };
  }

  /**
   * ダイアリーエントリをフォーマット
   */
  private formatDiaryEntry(entry: DiaryEntry): string {
    const resultEmoji = entry.result === 'success' ? '✓' : entry.result === 'partial' ? '~' : '✗';

    let text = `${resultEmoji} At step ${entry.step}, you took the **${entry.action}** action.\n`;
    text += `${entry.details}\n`;

    if (entry.notes) {
      text += `Notes: ${entry.notes}\n`;
    }

    return text;
  }

  /**
   * 特定のパターンを検出（同じ検索を繰り返しているなど）
   */
  detectPattern(): {
    repeatedSearches: boolean;
    stuckInLoop: boolean;
    noProgress: boolean;
  } {
    const searchSteps = this.getStepsByAction('search');
    const allQueries: string[] = [];

    for (const step of searchSteps) {
      const params = step.params as { searchQueries: string[] };
      allQueries.push(...params.searchQueries);
    }

    // 重複検索を検出
    const uniqueQueries = new Set(allQueries.map((q) => q.toLowerCase().trim()));
    const repeatedSearches = uniqueQueries.size < allQueries.length * 0.7;

    // ループ検出（直近5ステップで同じアクションパターン）
    const recentActions = this.steps.slice(-5).map((s) => s.action);
    const stuckInLoop =
      recentActions.length === 5 && new Set(recentActions).size === 1 && recentActions[0] !== 'answer';

    // 進捗なし（直近5ステップすべて失敗）
    const recentSteps = this.steps.slice(-5);
    const noProgress = recentSteps.length === 5 && recentSteps.every((s) => !s.success);

    return {
      repeatedSearches,
      stuckInLoop,
      noProgress,
    };
  }

  /**
   * JSONにシリアライズ
   */
  toJSON(): {
    steps: StepAction[];
    diaryEntries: DiaryEntry[];
    thoughts: string[];
  } {
    return {
      steps: this.steps,
      diaryEntries: this.diaryEntries,
      thoughts: this.thoughts,
    };
  }
}
