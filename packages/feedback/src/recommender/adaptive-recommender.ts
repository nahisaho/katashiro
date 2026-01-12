/**
 * AdaptiveRecommender - 適応的推奨
 *
 * パターンの使用履歴から学習し推奨を改善
 *
 * @module @nahisaho/katashiro-feedback
 * @task TSK-054
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { Pattern, PatternType } from '../types.js';

/**
 * Recommendation options
 */
export interface RecommendOptions {
  query: string;
  type?: PatternType;
  limit?: number;
  minConfidence?: number;
}

/**
 * Recommender statistics
 */
export interface RecommenderStats {
  totalPatterns: number;
  totalUsages: number;
  averageConfidence: number;
  topPatterns: Pattern[];
}

/**
 * AdaptiveRecommender
 *
 * Recommends patterns based on usage and learning
 */
export class AdaptiveRecommender {
  private patterns: Map<string, Pattern> = new Map();
  private usageCount = 0;

  /**
   * Add pattern to recommender
   *
   * @param pattern - Pattern to add
   * @returns Result
   */
  addPattern(pattern: Pattern): Result<void, Error> {
    try {
      this.patterns.set(pattern.id, pattern);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Recommend patterns based on options
   *
   * @param options - Recommendation options
   * @returns Recommended patterns
   */
  recommend(options: RecommendOptions): Result<Pattern[], Error> {
    try {
      let patterns = Array.from(this.patterns.values());

      // Filter by type
      if (options.type) {
        patterns = patterns.filter((p) => p.type === options.type);
      }

      // Filter by minimum confidence
      if (options.minConfidence !== undefined) {
        patterns = patterns.filter((p) => p.confidence >= options.minConfidence!);
      }

      // Sort by score (confidence * occurrences)
      patterns.sort((a, b) => {
        const scoreA = a.confidence * Math.log(a.occurrences + 1);
        const scoreB = b.confidence * Math.log(b.occurrences + 1);
        return scoreB - scoreA;
      });

      // Apply limit
      const limit = options.limit ?? 10;
      patterns = patterns.slice(0, limit);

      return ok(patterns);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Record pattern usage
   *
   * @param patternId - Pattern ID
   * @param success - Whether usage was successful
   * @returns Result
   */
  recordUsage(patternId: string, success: boolean): Result<void, Error> {
    try {
      const pattern = this.patterns.get(patternId);
      if (!pattern) {
        return err(new Error(`Pattern not found: ${patternId}`));
      }

      this.usageCount++;

      // Adjust confidence based on success/failure
      const adjustment = success ? 0.05 : -0.05;
      const newConfidence = Math.max(0, Math.min(1, pattern.confidence + adjustment));

      const updated: Pattern = {
        ...pattern,
        confidence: newConfidence,
        occurrences: pattern.occurrences + 1,
        updatedAt: new Date().toISOString(),
      };

      this.patterns.set(patternId, updated);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get pattern by ID
   *
   * @param patternId - Pattern ID
   * @returns Pattern or null
   */
  getPattern(patternId: string): Result<Pattern | null, Error> {
    try {
      return ok(this.patterns.get(patternId) ?? null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get recommender statistics
   *
   * @returns Statistics
   */
  getStats(): Result<RecommenderStats, Error> {
    try {
      const patterns = Array.from(this.patterns.values());
      const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);

      // Get top patterns
      const topPatterns = [...patterns]
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5);

      return ok({
        totalPatterns: patterns.length,
        totalUsages: this.usageCount,
        averageConfidence: patterns.length > 0 ? totalConfidence / patterns.length : 0,
        topPatterns,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Remove pattern
   *
   * @param patternId - Pattern ID
   * @returns Whether removed
   */
  removePattern(patternId: string): Result<boolean, Error> {
    try {
      return ok(this.patterns.delete(patternId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.usageCount = 0;
  }
}
