/**
 * FeedbackCollector テスト
 *
 * @task TSK-050
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackCollector } from '../../src/collector/feedback-collector.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('FeedbackCollector', () => {
  let collector: FeedbackCollector;

  beforeEach(() => {
    collector = new FeedbackCollector();
  });

  describe('collect', () => {
    it('should collect accept feedback', () => {
      const result = collector.collect({
        action: 'accept',
        originalContent: 'Generated code',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.action).toBe('accept');
        expect(result.value.originalContent).toBe('Generated code');
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeDefined();
      }
    });

    it('should collect reject feedback', () => {
      const result = collector.collect({
        action: 'reject',
        originalContent: 'Bad code',
        rating: 1,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.action).toBe('reject');
        expect(result.value.rating).toBe(1);
      }
    });

    it('should collect modify feedback with modified content', () => {
      const result = collector.collect({
        action: 'modify',
        originalContent: 'Original code',
        modifiedContent: 'Modified code',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.action).toBe('modify');
        expect(result.value.modifiedContent).toBe('Modified code');
      }
    });

    it('should include context when provided', () => {
      const context = { feature: 'auth', language: 'typescript' };
      const result = collector.collect({
        action: 'accept',
        originalContent: 'Code',
        context,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.context).toEqual(context);
      }
    });

    it('should validate rating range (1-5)', () => {
      const result = collector.collect({
        action: 'accept',
        originalContent: 'Code',
        rating: 6,
      });

      expect(isOk(result)).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all collected feedback', () => {
      collector.collect({ action: 'accept', originalContent: 'Code 1' });
      collector.collect({ action: 'reject', originalContent: 'Code 2' });

      const result = collector.getAll();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should return empty array when no feedback', () => {
      const result = collector.getAll();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('getById', () => {
    it('should return feedback by id', () => {
      const collectResult = collector.collect({
        action: 'accept',
        originalContent: 'Code',
      });

      if (isOk(collectResult)) {
        const result = collector.getById(collectResult.value.id);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value?.id).toBe(collectResult.value.id);
        }
      }
    });

    it('should return null for non-existent id', () => {
      const result = collector.getById('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('getByAction', () => {
    it('should filter feedback by action', () => {
      collector.collect({ action: 'accept', originalContent: 'Code 1' });
      collector.collect({ action: 'reject', originalContent: 'Code 2' });
      collector.collect({ action: 'accept', originalContent: 'Code 3' });

      const result = collector.getByAction('accept');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every((f) => f.action === 'accept')).toBe(true);
      }
    });
  });

  describe('getStats', () => {
    it('should return feedback statistics', () => {
      collector.collect({ action: 'accept', originalContent: 'Code 1', rating: 5 });
      collector.collect({ action: 'accept', originalContent: 'Code 2', rating: 4 });
      collector.collect({ action: 'reject', originalContent: 'Code 3', rating: 1 });

      const result = collector.getStats();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.total).toBe(3);
        expect(result.value.acceptCount).toBe(2);
        expect(result.value.rejectCount).toBe(1);
        expect(result.value.modifyCount).toBe(0);
        expect(result.value.averageRating).toBeCloseTo(3.33, 1);
      }
    });
  });
});
