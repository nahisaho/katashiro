/**
 * AdaptiveRecommender テスト
 *
 * @task TSK-054
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveRecommender } from '../../src/recommender/adaptive-recommender.js';
import { isOk } from '@nahisaho/katashiro-core';
import type { Pattern } from '../../src/types.js';

describe('AdaptiveRecommender', () => {
  let recommender: AdaptiveRecommender;

  const createPattern = (
    id: string,
    type: 'success' | 'error' | 'modification',
    confidence: number,
    occurrences: number = 1
  ): Pattern => ({
    id,
    type,
    name: `Pattern ${id}`,
    description: `Description for ${id}`,
    confidence,
    occurrences,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    recommender = new AdaptiveRecommender();
  });

  describe('addPattern', () => {
    it('should add pattern to recommender', () => {
      const pattern = createPattern('PAT-001', 'success', 0.8);
      const result = recommender.addPattern(pattern);

      expect(isOk(result)).toBe(true);
    });

    it('should update existing pattern', () => {
      const pattern1 = createPattern('PAT-001', 'success', 0.8);
      recommender.addPattern(pattern1);

      const pattern2 = createPattern('PAT-001', 'success', 0.9);
      const result = recommender.addPattern(pattern2);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('recommend', () => {
    it('should recommend patterns based on context', () => {
      recommender.addPattern(createPattern('PAT-001', 'success', 0.9, 10));
      recommender.addPattern(createPattern('PAT-002', 'success', 0.7, 5));
      recommender.addPattern(createPattern('PAT-003', 'error', 0.8, 3));

      const result = recommender.recommend({ query: 'code pattern' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize by confidence and occurrences', () => {
      recommender.addPattern(createPattern('PAT-001', 'success', 0.9, 10));
      recommender.addPattern(createPattern('PAT-002', 'success', 0.5, 2));

      const result = recommender.recommend({ query: 'any' });
      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value.length >= 2) {
        // Higher confidence/occurrences should rank first
        expect(result.value[0]?.id).toBe('PAT-001');
      }
    });

    it('should filter by type', () => {
      recommender.addPattern(createPattern('PAT-001', 'success', 0.9));
      recommender.addPattern(createPattern('PAT-002', 'error', 0.9));

      const result = recommender.recommend({ query: 'any', type: 'success' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.every((p) => p.type === 'success')).toBe(true);
      }
    });

    it('should limit results', () => {
      for (let i = 1; i <= 10; i++) {
        recommender.addPattern(createPattern(`PAT-${i}`, 'success', 0.5));
      }

      const result = recommender.recommend({ query: 'any', limit: 3 });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('recordUsage', () => {
    it('should record pattern usage', () => {
      const pattern = createPattern('PAT-001', 'success', 0.8);
      recommender.addPattern(pattern);

      const result = recommender.recordUsage('PAT-001', true);
      expect(isOk(result)).toBe(true);
    });

    it('should increase confidence on successful usage', () => {
      const pattern = createPattern('PAT-001', 'success', 0.5);
      recommender.addPattern(pattern);
      recommender.recordUsage('PAT-001', true);

      const result = recommender.getPattern('PAT-001');
      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value) {
        expect(result.value.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should decrease confidence on failed usage', () => {
      const pattern = createPattern('PAT-001', 'success', 0.5);
      recommender.addPattern(pattern);
      recommender.recordUsage('PAT-001', false);

      const result = recommender.getPattern('PAT-001');
      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value) {
        expect(result.value.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('getPattern', () => {
    it('should get pattern by id', () => {
      const pattern = createPattern('PAT-001', 'success', 0.8);
      recommender.addPattern(pattern);

      const result = recommender.getPattern('PAT-001');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value?.id).toBe('PAT-001');
      }
    });

    it('should return null for non-existent pattern', () => {
      const result = recommender.getPattern('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('getStats', () => {
    it('should return recommender statistics', () => {
      recommender.addPattern(createPattern('PAT-001', 'success', 0.8));
      recommender.addPattern(createPattern('PAT-002', 'error', 0.6));
      recommender.recordUsage('PAT-001', true);

      const result = recommender.getStats();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.totalPatterns).toBe(2);
        expect(result.value.totalUsages).toBe(1);
      }
    });
  });
});
