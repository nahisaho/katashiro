/**
 * FeedbackStorage - フィードバックの永続化
 *
 * フィードバックの保存・読み込み・エクスポート
 *
 * @module @nahisaho/katashiro-feedback
 * @task TSK-051
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { Feedback, FeedbackAction } from '../types.js';

/**
 * List options
 */
export interface ListOptions {
  offset?: number;
  limit?: number;
  action?: FeedbackAction;
}

/**
 * Export format
 */
export interface FeedbackExport {
  version: string;
  feedbacks: Feedback[];
  exportedAt: string;
}

/**
 * FeedbackStorage
 *
 * Manages feedback persistence
 */
export class FeedbackStorage {
  private feedbacks: Map<string, Feedback> = new Map();
  private readonly version = '1.0.0';

  /**
   * Save feedback
   *
   * @param feedback - Feedback to save
   * @returns Saved feedback
   */
  save(feedback: Feedback): Result<Feedback, Error> {
    try {
      this.feedbacks.set(feedback.id, feedback);
      return ok(feedback);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Load feedback by ID
   *
   * @param id - Feedback ID
   * @returns Feedback or null
   */
  load(id: string): Result<Feedback | null, Error> {
    try {
      return ok(this.feedbacks.get(id) ?? null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete feedback
   *
   * @param id - Feedback ID
   * @returns Whether deleted
   */
  delete(id: string): Result<boolean, Error> {
    try {
      return ok(this.feedbacks.delete(id));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List feedback with options
   *
   * @param options - List options
   * @returns Feedback list
   */
  list(options: ListOptions = {}): Result<Feedback[], Error> {
    try {
      let feedbacks = Array.from(this.feedbacks.values());

      // Filter by action
      if (options.action) {
        feedbacks = feedbacks.filter((f) => f.action === options.action);
      }

      // Apply pagination
      const offset = options.offset ?? 0;
      const limit = options.limit ?? feedbacks.length;
      feedbacks = feedbacks.slice(offset, offset + limit);

      return ok(feedbacks);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Export to JSON
   *
   * @returns JSON string
   */
  exportToJSON(): Result<string, Error> {
    try {
      const data: FeedbackExport = {
        version: this.version,
        feedbacks: Array.from(this.feedbacks.values()),
        exportedAt: new Date().toISOString(),
      };
      return ok(JSON.stringify(data, null, 2));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Import from JSON
   *
   * @param json - JSON string
   * @returns Number of imported feedbacks
   */
  importFromJSON(json: string): Result<number, Error> {
    try {
      const data = JSON.parse(json) as FeedbackExport;

      if (!data.feedbacks || !Array.isArray(data.feedbacks)) {
        return err(new Error('Invalid format: feedbacks array required'));
      }

      for (const feedback of data.feedbacks) {
        this.feedbacks.set(feedback.id, feedback);
      }

      return ok(data.feedbacks.length);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get total count
   *
   * @returns Count
   */
  count(): Result<number, Error> {
    try {
      return ok(this.feedbacks.size);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all feedback
   */
  clear(): void {
    this.feedbacks.clear();
  }
}
