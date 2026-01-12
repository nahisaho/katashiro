/**
 * FeedbackCollector - ユーザーフィードバック収集
 *
 * accept/reject/modifyアクションでフィードバックを収集
 *
 * @module @nahisaho/katashiro-feedback
 * @task TSK-050
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { Feedback, FeedbackAction } from '../types.js';

/**
 * Feedback input for collection
 */
export interface FeedbackInput {
  action: FeedbackAction;
  originalContent: string;
  modifiedContent?: string;
  rating?: number;
  context?: Record<string, unknown>;
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  acceptCount: number;
  rejectCount: number;
  modifyCount: number;
  averageRating: number;
}

/**
 * FeedbackCollector
 *
 * Collects and manages user feedback for learning
 */
export class FeedbackCollector {
  private feedbacks: Map<string, Feedback> = new Map();
  private counter = 0;

  /**
   * Collect feedback
   *
   * @param input - Feedback input
   * @returns Collected feedback
   */
  collect(input: FeedbackInput): Result<Feedback, Error> {
    try {
      // Validate rating if provided
      if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
        return err(new Error('Rating must be between 1 and 5'));
      }

      const id = `FB-${++this.counter}`;
      const feedback: Feedback = {
        id,
        action: input.action,
        originalContent: input.originalContent,
        modifiedContent: input.modifiedContent,
        rating: input.rating,
        context: input.context,
        createdAt: new Date().toISOString(),
      };

      this.feedbacks.set(id, feedback);
      return ok(feedback);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all feedback
   *
   * @returns All collected feedback
   */
  getAll(): Result<Feedback[], Error> {
    try {
      return ok(Array.from(this.feedbacks.values()));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get feedback by ID
   *
   * @param id - Feedback ID
   * @returns Feedback or null
   */
  getById(id: string): Result<Feedback | null, Error> {
    try {
      return ok(this.feedbacks.get(id) ?? null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get feedback by action type
   *
   * @param action - Action type
   * @returns Filtered feedback
   */
  getByAction(action: FeedbackAction): Result<Feedback[], Error> {
    try {
      const filtered = Array.from(this.feedbacks.values()).filter(
        (f) => f.action === action
      );
      return ok(filtered);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get feedback statistics
   *
   * @returns Statistics
   */
  getStats(): Result<FeedbackStats, Error> {
    try {
      const all = Array.from(this.feedbacks.values());
      const withRating = all.filter((f) => f.rating !== undefined);
      const totalRating = withRating.reduce((sum, f) => sum + (f.rating ?? 0), 0);

      return ok({
        total: all.length,
        acceptCount: all.filter((f) => f.action === 'accept').length,
        rejectCount: all.filter((f) => f.action === 'reject').length,
        modifyCount: all.filter((f) => f.action === 'modify').length,
        averageRating: withRating.length > 0 ? totalRating / withRating.length : 0,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all feedback
   */
  clear(): void {
    this.feedbacks.clear();
    this.counter = 0;
  }
}
