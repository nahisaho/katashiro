/**
 * LearningEngine テスト
 *
 * @task TSK-052
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningEngine } from '../../src/learning/learning-engine.js';
import { isOk } from '@nahisaho/katashiro-core';
import type { Feedback, Pattern } from '../../src/types.js';

describe('LearningEngine', () => {
  let engine: LearningEngine;

  const createFeedback = (
    id: string,
    action: 'accept' | 'reject' | 'modify',
    content: string
  ): Feedback => ({
    id,
    action,
    originalContent: content,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    engine = new LearningEngine();
  });

  describe('learn', () => {
    it('should learn from accept feedback', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'function add(a, b) { return a + b; }'),
        createFeedback('FB-002', 'accept', 'function subtract(a, b) { return a - b; }'),
      ];

      const result = engine.learn(feedbacks);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.patternsLearned).toBeGreaterThanOrEqual(0);
        expect(result.value.feedbacksProcessed).toBe(2);
      }
    });

    it('should learn from reject feedback', () => {
      const feedbacks = [
        createFeedback('FB-001', 'reject', 'var x = 1'),
        createFeedback('FB-002', 'reject', 'var y = 2'),
      ];

      const result = engine.learn(feedbacks);
      expect(isOk(result)).toBe(true);
    });

    it('should learn from modify feedback with diff', () => {
      const feedback: Feedback = {
        id: 'FB-001',
        action: 'modify',
        originalContent: 'function add(a, b) { return a+b }',
        modifiedContent: 'function add(a: number, b: number): number { return a + b; }',
        createdAt: new Date().toISOString(),
      };

      const result = engine.learn([feedback]);
      expect(isOk(result)).toBe(true);
    });

    it('should handle empty feedback array', () => {
      const result = engine.learn([]);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.feedbacksProcessed).toBe(0);
      }
    });
  });

  describe('getPatterns', () => {
    it('should return learned patterns', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'const x = 1'),
        createFeedback('FB-002', 'accept', 'const y = 2'),
        createFeedback('FB-003', 'accept', 'const z = 3'),
      ];

      engine.learn(feedbacks);
      const result = engine.getPatterns();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('should filter patterns by type', () => {
      engine.learn([
        createFeedback('FB-001', 'accept', 'good code'),
        createFeedback('FB-002', 'reject', 'bad code'),
      ]);

      const result = engine.getPatterns({ type: 'success' });
      expect(isOk(result)).toBe(true);
    });

    it('should filter patterns by minimum confidence', () => {
      engine.learn([
        createFeedback('FB-001', 'accept', 'code'),
      ]);

      const result = engine.getPatterns({ minConfidence: 0.8 });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('suggest', () => {
    it('should suggest patterns for given context', () => {
      // Learn some patterns first
      engine.learn([
        createFeedback('FB-001', 'accept', 'function handleError(err) { console.error(err); }'),
      ]);

      const result = engine.suggest({ context: 'error handling' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('should limit suggestions', () => {
      const result = engine.suggest({ context: 'any', limit: 5 });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('getStats', () => {
    it('should return learning statistics', () => {
      engine.learn([
        createFeedback('FB-001', 'accept', 'code 1'),
        createFeedback('FB-002', 'reject', 'code 2'),
      ]);

      const result = engine.getStats();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.totalPatterns).toBeGreaterThanOrEqual(0);
        expect(result.value.totalFeedbackProcessed).toBe(2);
      }
    });
  });
});
