/**
 * LearningEngine - フィードバックからの学習
 *
 * フィードバックデータからパターンを学習し推論を改善
 *
 * @module @nahisaho/katashiro-feedback
 * @task TSK-052
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { Feedback, Pattern, PatternType } from '../types.js';

/**
 * Learning result
 */
export interface LearningResult {
  patternsLearned: number;
  feedbacksProcessed: number;
  timestamp: string;
}

/**
 * Pattern query options
 */
export interface PatternQueryOptions {
  type?: PatternType;
  minConfidence?: number;
  limit?: number;
}

/**
 * Suggestion options
 */
export interface SuggestionOptions {
  context: string;
  limit?: number;
}

/**
 * Learning statistics
 */
export interface LearningStats {
  totalPatterns: number;
  totalFeedbackProcessed: number;
  patternsByType: Record<PatternType, number>;
  averageConfidence: number;
}

/**
 * LearningEngine
 *
 * Learns patterns from user feedback
 */
export class LearningEngine {
  private patterns: Map<string, Pattern> = new Map();
  private feedbackProcessed = 0;
  private patternCounter = 0;

  /**
   * Learn from feedback
   *
   * @param feedbacks - Feedbacks to learn from
   * @returns Learning result
   */
  learn(feedbacks: Feedback[]): Result<LearningResult, Error> {
    try {
      let patternsLearned = 0;

      for (const feedback of feedbacks) {
        this.feedbackProcessed++;

        // Extract pattern based on action type
        const pattern = this.extractPattern(feedback);
        if (pattern) {
          const existingPattern = this.findSimilarPattern(pattern);
          if (existingPattern) {
            // Update existing pattern
            this.updatePattern(existingPattern, feedback);
          } else {
            // Add new pattern
            this.patterns.set(pattern.id, pattern);
            patternsLearned++;
          }
        }
      }

      return ok({
        patternsLearned,
        feedbacksProcessed: feedbacks.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get learned patterns
   *
   * @param options - Query options
   * @returns Patterns
   */
  getPatterns(options: PatternQueryOptions = {}): Result<Pattern[], Error> {
    try {
      let patterns = Array.from(this.patterns.values());

      // Filter by type
      if (options.type) {
        patterns = patterns.filter((p) => p.type === options.type);
      }

      // Filter by confidence
      if (options.minConfidence !== undefined) {
        patterns = patterns.filter((p) => p.confidence >= options.minConfidence!);
      }

      // Apply limit
      if (options.limit) {
        patterns = patterns.slice(0, options.limit);
      }

      return ok(patterns);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Suggest patterns for context
   *
   * @param options - Suggestion options
   * @returns Suggested patterns
   */
  suggest(options: SuggestionOptions): Result<Pattern[], Error> {
    try {
      let patterns = Array.from(this.patterns.values());

      // Sort by confidence
      patterns.sort((a, b) => b.confidence - a.confidence);

      // Apply limit
      const limit = options.limit ?? 10;
      patterns = patterns.slice(0, limit);

      return ok(patterns);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get learning statistics
   *
   * @returns Statistics
   */
  getStats(): Result<LearningStats, Error> {
    try {
      const patterns = Array.from(this.patterns.values());
      const patternsByType: Record<PatternType, number> = {
        success: 0,
        error: 0,
        modification: 0,
      };

      let totalConfidence = 0;
      for (const pattern of patterns) {
        patternsByType[pattern.type]++;
        totalConfidence += pattern.confidence;
      }

      return ok({
        totalPatterns: patterns.length,
        totalFeedbackProcessed: this.feedbackProcessed,
        patternsByType,
        averageConfidence: patterns.length > 0 ? totalConfidence / patterns.length : 0,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Extract pattern from feedback
   */
  private extractPattern(feedback: Feedback): Pattern | null {
    const type: PatternType = feedback.action === 'accept'
      ? 'success'
      : feedback.action === 'reject'
        ? 'error'
        : 'modification';

    const id = `PAT-${++this.patternCounter}`;
    const now = new Date().toISOString();

    return {
      id,
      type,
      name: `Pattern from ${feedback.id}`,
      description: `Extracted from ${feedback.action} feedback`,
      confidence: 0.5, // Initial confidence
      occurrences: 1,
      template: feedback.originalContent,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find similar existing pattern
   */
  private findSimilarPattern(newPattern: Pattern): Pattern | null {
    for (const pattern of this.patterns.values()) {
      if (pattern.type === newPattern.type &&
          pattern.template === newPattern.template) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Update existing pattern with new feedback
   */
  private updatePattern(pattern: Pattern, _feedback: Feedback): void {
    const updated: Pattern = {
      ...pattern,
      occurrences: pattern.occurrences + 1,
      confidence: Math.min(pattern.confidence + 0.1, 1.0),
      updatedAt: new Date().toISOString(),
    };
    this.patterns.set(pattern.id, updated);
  }

  /**
   * Clear learned patterns
   */
  clear(): void {
    this.patterns.clear();
    this.feedbackProcessed = 0;
    this.patternCounter = 0;
  }
}
