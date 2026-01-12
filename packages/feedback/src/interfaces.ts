/**
 * Feedbackインターフェース定義
 */

import type { Result, ID } from '@nahisaho/katashiro-core';
import type { Feedback, FeedbackAction, Pattern } from './types.js';

export interface IFeedbackCollector {
  record(feedback: Feedback): Promise<Result<void, Error>>;
  get(id: ID): Promise<Result<Feedback | null, Error>>;
  list(filter?: { action?: FeedbackAction }): Promise<Result<Feedback[], Error>>;
  export(format: 'json' | 'jsonl'): Promise<Result<string, Error>>;
}

export interface IPatternExtractor {
  extract(feedbacks: Feedback[]): Promise<Result<Pattern[], Error>>;
  getPatterns(): Promise<Result<Pattern[], Error>>;
  applyPattern(patternId: ID, context: unknown): Promise<Result<unknown, Error>>;
}
