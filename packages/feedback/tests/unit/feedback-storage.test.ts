/**
 * FeedbackStorage テスト
 *
 * @task TSK-051
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackStorage } from '../../src/storage/feedback-storage.js';
import { isOk } from '@nahisaho/katashiro-core';
import type { Feedback } from '../../src/types.js';

describe('FeedbackStorage', () => {
  let storage: FeedbackStorage;

  const createFeedback = (id: string, action: 'accept' | 'reject' | 'modify' = 'accept'): Feedback => ({
    id,
    action,
    originalContent: `Content for ${id}`,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    storage = new FeedbackStorage();
  });

  describe('save', () => {
    it('should save feedback', () => {
      const feedback = createFeedback('FB-001');
      const result = storage.save(feedback);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe('FB-001');
      }
    });

    it('should update existing feedback', () => {
      const feedback1 = createFeedback('FB-001');
      storage.save(feedback1);

      const feedback2: Feedback = {
        ...feedback1,
        originalContent: 'Updated content',
      };
      const result = storage.save(feedback2);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.originalContent).toBe('Updated content');
      }
    });
  });

  describe('load', () => {
    it('should load feedback by id', () => {
      const feedback = createFeedback('FB-001');
      storage.save(feedback);

      const result = storage.load('FB-001');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value?.id).toBe('FB-001');
      }
    });

    it('should return null for non-existent id', () => {
      const result = storage.load('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('delete', () => {
    it('should delete feedback', () => {
      const feedback = createFeedback('FB-001');
      storage.save(feedback);

      const deleteResult = storage.delete('FB-001');
      expect(isOk(deleteResult)).toBe(true);

      const loadResult = storage.load('FB-001');
      if (isOk(loadResult)) {
        expect(loadResult.value).toBeNull();
      }
    });

    it('should return false for non-existent id', () => {
      const result = storage.delete('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('list', () => {
    it('should list all feedback', () => {
      storage.save(createFeedback('FB-001'));
      storage.save(createFeedback('FB-002'));
      storage.save(createFeedback('FB-003'));

      const result = storage.list();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(3);
      }
    });

    it('should support pagination', () => {
      for (let i = 1; i <= 10; i++) {
        storage.save(createFeedback(`FB-${String(i).padStart(3, '0')}`));
      }

      const result = storage.list({ offset: 2, limit: 3 });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(3);
      }
    });

    it('should filter by action', () => {
      storage.save(createFeedback('FB-001', 'accept'));
      storage.save(createFeedback('FB-002', 'reject'));
      storage.save(createFeedback('FB-003', 'accept'));

      const result = storage.list({ action: 'accept' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every((f) => f.action === 'accept')).toBe(true);
      }
    });
  });

  describe('export/import', () => {
    it('should export to JSON', () => {
      storage.save(createFeedback('FB-001'));
      storage.save(createFeedback('FB-002'));

      const result = storage.exportToJSON();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const data = JSON.parse(result.value);
        expect(data.feedbacks).toHaveLength(2);
        expect(data.version).toBeDefined();
      }
    });

    it('should import from JSON', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        feedbacks: [
          createFeedback('FB-001'),
          createFeedback('FB-002'),
        ],
      });

      const result = storage.importFromJSON(json);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(2);
      }
    });

    it('should validate JSON format on import', () => {
      const result = storage.importFromJSON('invalid json');
      expect(isOk(result)).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total count', () => {
      storage.save(createFeedback('FB-001'));
      storage.save(createFeedback('FB-002'));

      const result = storage.count();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(2);
      }
    });
  });
});
