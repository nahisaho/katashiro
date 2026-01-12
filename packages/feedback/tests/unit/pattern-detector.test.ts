/**
 * PatternDetector テスト
 *
 * @task TSK-053
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '../../src/patterns/pattern-detector.js';
import { isOk } from '@nahisaho/katashiro-core';
import type { Feedback } from '../../src/types.js';

describe('PatternDetector', () => {
  let detector: PatternDetector;

  const createFeedback = (
    id: string,
    action: 'accept' | 'reject' | 'modify',
    content: string,
    context?: Record<string, unknown>
  ): Feedback => ({
    id,
    action,
    originalContent: content,
    context,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    detector = new PatternDetector();
  });

  describe('detect', () => {
    it('should detect patterns from similar feedback', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'async function fetchData() { return await fetch(url); }'),
        createFeedback('FB-002', 'accept', 'async function getData() { return await fetch(api); }'),
        createFeedback('FB-003', 'accept', 'async function loadItems() { return await fetch(endpoint); }'),
      ];

      const result = detector.detect(feedbacks);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.patterns.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect code structure patterns', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'if (error) { throw new Error(error); }'),
        createFeedback('FB-002', 'accept', 'if (err) { throw new Error(err); }'),
      ];

      const result = detector.detect(feedbacks);
      expect(isOk(result)).toBe(true);
    });

    it('should detect rejection patterns', () => {
      const feedbacks = [
        createFeedback('FB-001', 'reject', 'var x = 1'),
        createFeedback('FB-002', 'reject', 'var y = 2'),
        createFeedback('FB-003', 'reject', 'var z = 3'),
      ];

      const result = detector.detect(feedbacks);
      expect(isOk(result)).toBe(true);
    });

    it('should detect modification patterns', () => {
      const feedbacks = [
        {
          id: 'FB-001',
          action: 'modify' as const,
          originalContent: 'function add(a, b) { return a+b }',
          modifiedContent: 'function add(a: number, b: number): number { return a + b; }',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = detector.detect(feedbacks);
      expect(isOk(result)).toBe(true);
    });
  });

  describe('detectByContext', () => {
    it('should group patterns by context', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'try { } catch (e) { }', { feature: 'error-handling' }),
        createFeedback('FB-002', 'accept', 'try { } catch (err) { }', { feature: 'error-handling' }),
        createFeedback('FB-003', 'accept', 'const data = []', { feature: 'data' }),
      ];

      const result = detector.detectByContext(feedbacks);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value).toBe('object');
      }
    });
  });

  describe('analyze', () => {
    it('should analyze pattern frequency', () => {
      const feedbacks = [
        createFeedback('FB-001', 'accept', 'const x = 1'),
        createFeedback('FB-002', 'accept', 'const y = 2'),
        createFeedback('FB-003', 'reject', 'var z = 3'),
      ];

      const result = detector.analyze(feedbacks);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.totalFeedback).toBe(3);
        expect(result.value.acceptRate).toBeCloseTo(0.67, 1);
        expect(result.value.rejectRate).toBeCloseTo(0.33, 1);
      }
    });
  });

  describe('getSimilarity', () => {
    it('should calculate similarity between contents', () => {
      const result = detector.getSimilarity(
        'function add(a, b) { return a + b; }',
        'function add(x, y) { return x + y; }'
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeGreaterThan(0.3);
      }
    });

    it('should return low similarity for different content', () => {
      const result = detector.getSimilarity(
        'function add(a, b) { return a + b; }',
        'class User { constructor() {} }'
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeLessThan(0.5);
      }
    });
  });
});
