/**
 * Feedback型定義
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

export type FeedbackAction = 'accept' | 'reject' | 'modify';

export interface Feedback {
  readonly id: ID;
  readonly action: FeedbackAction;
  readonly rating?: number; // 1-5
  readonly originalContent: string;
  readonly modifiedContent?: string;
  readonly context?: Record<string, unknown>;
  readonly createdAt: Timestamp;
}

export type PatternType = 'success' | 'error' | 'modification';

export interface Pattern {
  readonly id: ID;
  readonly type: PatternType;
  readonly name: string;
  readonly description: string;
  readonly confidence: number;
  readonly occurrences: number;
  readonly template?: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
