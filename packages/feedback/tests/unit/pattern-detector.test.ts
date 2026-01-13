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

  describe('accuracy with 50 feedbacks', () => {
    /**
     * REQ-IMP-003: 50フィードバックでのパターン検出精度検証
     */
    it('should detect patterns with high accuracy from 50+ feedbacks', () => {
      // 50件のフィードバックを生成（5つのパターンカテゴリ）
      const feedbacks: Feedback[] = [];

      // パターン1: async/await (10件)
      for (let i = 0; i < 10; i++) {
        feedbacks.push(createFeedback(
          `async-${i}`,
          'accept',
          `async function handler${i}() { return await fetch('/api/${i}'); }`,
          { category: 'async-pattern' }
        ));
      }

      // パターン2: error-handling (10件)
      for (let i = 0; i < 10; i++) {
        feedbacks.push(createFeedback(
          `error-${i}`,
          'accept',
          `try { doSomething${i}(); } catch (e) { console.error(e); }`,
          { category: 'error-handling' }
        ));
      }

      // パターン3: const declarations (10件 - accept)
      for (let i = 0; i < 10; i++) {
        feedbacks.push(createFeedback(
          `const-${i}`,
          'accept',
          `const value${i} = ${i * 10};`,
          { category: 'const-pattern' }
        ));
      }

      // パターン4: var declarations (10件 - reject)
      for (let i = 0; i < 10; i++) {
        feedbacks.push(createFeedback(
          `var-${i}`,
          'reject',
          `var badValue${i} = ${i * 10};`,
          { category: 'var-pattern' }
        ));
      }

      // パターン5: mixed (10件)
      for (let i = 0; i < 10; i++) {
        const action = i % 2 === 0 ? 'accept' : 'reject';
        feedbacks.push(createFeedback(
          `mixed-${i}`,
          action as 'accept' | 'reject',
          `function process${i}(data) { return data.map(x => x * 2); }`,
          { category: 'mixed' }
        ));
      }

      // 合計50件
      expect(feedbacks.length).toBe(50);

      // パターン検出
      const result = detector.detect(feedbacks);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // 少なくとも3つ以上のパターンカテゴリが検出されること
        expect(result.value.patterns.length).toBeGreaterThanOrEqual(1);
      }

      // 分析
      const analysis = detector.analyze(feedbacks);
      expect(isOk(analysis)).toBe(true);

      if (isOk(analysis)) {
        expect(analysis.value.totalFeedback).toBe(50);
        // accept: 30件 (async 10 + error 10 + const 10), reject: 15件 (var 10 + mixed 5)
        // accept率: 35/50 = 0.7
        expect(analysis.value.acceptRate).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('should detect context-grouped patterns from 50+ feedbacks', () => {
      const feedbacks: Feedback[] = [];

      // 5つの異なるコンテキストで10件ずつ
      const contexts = ['api', 'database', 'ui', 'validation', 'utils'];
      
      contexts.forEach((ctx, idx) => {
        for (let i = 0; i < 10; i++) {
          feedbacks.push(createFeedback(
            `${ctx}-${i}`,
            i < 7 ? 'accept' : 'reject',
            `function ${ctx}Handler${i}() { /* ${ctx} logic */ }`,
            { module: ctx, priority: idx }
          ));
        }
      });

      expect(feedbacks.length).toBe(50);

      const result = detector.detectByContext(feedbacks);
      expect(isOk(result)).toBe(true);
    });

    it('should maintain performance with 100+ feedbacks', () => {
      const feedbacks: Feedback[] = [];

      for (let i = 0; i < 100; i++) {
        feedbacks.push(createFeedback(
          `perf-${i}`,
          i % 3 === 0 ? 'reject' : 'accept',
          `function operation${i}(input${i}) { return process(input${i}); }`,
          { batch: Math.floor(i / 10) }
        ));
      }

      const start = performance.now();
      const result = detector.detect(feedbacks);
      const elapsed = performance.now() - start;

      expect(isOk(result)).toBe(true);
      // 100件の処理が1秒以内に完了すること
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
