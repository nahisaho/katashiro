/**
 * PatternDetector - パターン検出
 *
 * フィードバックからコードパターンを検出・分類
 *
 * @module @nahisaho/katashiro-feedback
 * @task TSK-053
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { Feedback, Pattern, PatternType } from '../types.js';

/**
 * Detection result
 */
export interface DetectionResult {
  patterns: Pattern[];
  feedbackAnalyzed: number;
  timestamp: string;
}

/**
 * Context-grouped patterns
 */
export interface ContextPatterns {
  [context: string]: Pattern[];
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  totalFeedback: number;
  acceptRate: number;
  rejectRate: number;
  modifyRate: number;
  topPatterns: Pattern[];
}

/**
 * PatternDetector
 *
 * Detects patterns from feedback data
 */
export class PatternDetector {
  private patternCounter = 0;

  /**
   * Detect patterns from feedback
   *
   * @param feedbacks - Feedbacks to analyze
   * @returns Detection result
   */
  detect(feedbacks: Feedback[]): Result<DetectionResult, Error> {
    try {
      const patterns: Pattern[] = [];
      const contentGroups = this.groupByContent(feedbacks);

      for (const [_key, group] of contentGroups) {
        if (group.length >= 2) {
          // Multiple similar feedbacks - likely a pattern
          const pattern = this.createPatternFromGroup(group);
          patterns.push(pattern);
        }
      }

      return ok({
        patterns,
        feedbackAnalyzed: feedbacks.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Detect patterns grouped by context
   *
   * @param feedbacks - Feedbacks to analyze
   * @returns Context-grouped patterns
   */
  detectByContext(feedbacks: Feedback[]): Result<ContextPatterns, Error> {
    try {
      const contextGroups: Map<string, Feedback[]> = new Map();

      // Group by context
      for (const feedback of feedbacks) {
        const contextKey = feedback.context
          ? JSON.stringify(feedback.context)
          : 'default';
        
        if (!contextGroups.has(contextKey)) {
          contextGroups.set(contextKey, []);
        }
        contextGroups.get(contextKey)!.push(feedback);
      }

      // Detect patterns for each context
      const result: ContextPatterns = {};
      for (const [context, group] of contextGroups) {
        const detected = this.detect(group);
        if (detected._tag === 'Ok') {
          result[context] = detected.value.patterns;
        }
      }

      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Analyze feedback patterns
   *
   * @param feedbacks - Feedbacks to analyze
   * @returns Analysis result
   */
  analyze(feedbacks: Feedback[]): Result<AnalysisResult, Error> {
    try {
      const total = feedbacks.length;
      if (total === 0) {
        return ok({
          totalFeedback: 0,
          acceptRate: 0,
          rejectRate: 0,
          modifyRate: 0,
          topPatterns: [],
        });
      }

      const acceptCount = feedbacks.filter((f) => f.action === 'accept').length;
      const rejectCount = feedbacks.filter((f) => f.action === 'reject').length;
      const modifyCount = feedbacks.filter((f) => f.action === 'modify').length;

      // Get top patterns
      const detectResult = this.detect(feedbacks);
      const topPatterns = detectResult._tag === 'Ok'
        ? detectResult.value.patterns.slice(0, 5)
        : [];

      return ok({
        totalFeedback: total,
        acceptRate: acceptCount / total,
        rejectRate: rejectCount / total,
        modifyRate: modifyCount / total,
        topPatterns,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Calculate similarity between two contents
   *
   * @param content1 - First content
   * @param content2 - Second content
   * @returns Similarity score (0-1)
   */
  getSimilarity(content1: string, content2: string): Result<number, Error> {
    try {
      // Simple token-based similarity
      const tokens1 = this.tokenize(content1);
      const tokens2 = this.tokenize(content2);

      const set1 = new Set(tokens1);
      const set2 = new Set(tokens2);

      const intersection = new Set([...set1].filter((t) => set2.has(t)));
      const union = new Set([...set1, ...set2]);

      const similarity = union.size > 0
        ? intersection.size / union.size
        : 0;

      return ok(similarity);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Group feedbacks by content similarity
   */
  private groupByContent(feedbacks: Feedback[]): Map<string, Feedback[]> {
    const groups: Map<string, Feedback[]> = new Map();

    for (const feedback of feedbacks) {
      // Normalize content for grouping
      const normalizedKey = this.normalizeContent(feedback.originalContent);
      
      if (!groups.has(normalizedKey)) {
        groups.set(normalizedKey, []);
      }
      groups.get(normalizedKey)!.push(feedback);
    }

    return groups;
  }

  /**
   * Normalize content for comparison
   */
  private normalizeContent(content: string): string {
    // Remove whitespace variations and normalize
    return content
      .replace(/\s+/g, ' ')
      .replace(/\b(var|let|const)\b/g, 'VAR')
      .replace(/\b[a-z_][a-z0-9_]*\b/gi, 'ID')
      .trim();
  }

  /**
   * Tokenize content
   */
  private tokenize(content: string): string[] {
    return content
      .split(/[\s{}()[\];,.<>:=+\-*/!?&|^~]+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Create pattern from group of feedbacks
   */
  private createPatternFromGroup(group: Feedback[]): Pattern {
    const id = `PAT-${++this.patternCounter}`;
    const now = new Date().toISOString();

    // Determine type by most common action
    const actions = group.map((f) => f.action);
    const acceptCount = actions.filter((a) => a === 'accept').length;
    const rejectCount = actions.filter((a) => a === 'reject').length;
    const modifyCount = actions.filter((a) => a === 'modify').length;

    let type: PatternType;
    if (acceptCount >= rejectCount && acceptCount >= modifyCount) {
      type = 'success';
    } else if (rejectCount > acceptCount && rejectCount > modifyCount) {
      type = 'error';
    } else {
      type = 'modification';
    }

    // Calculate confidence based on consistency
    const maxCount = Math.max(acceptCount, rejectCount, modifyCount);
    const confidence = maxCount / group.length;

    return {
      id,
      type,
      name: `Detected pattern ${id}`,
      description: `Pattern detected from ${group.length} similar feedbacks`,
      confidence,
      occurrences: group.length,
      template: group[0]?.originalContent,
      createdAt: now,
      updatedAt: now,
    };
  }
}
