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

  describe('accuracy with 50+ patterns', () => {
    /**
     * REQ-IMP-004: 50+パターンでのレコメンデーション精度検証
     */
    it('should maintain recommendation accuracy with 50+ patterns', () => {
      // 50パターンを追加（高信頼度から低信頼度まで分散）
      for (let i = 1; i <= 50; i++) {
        const type: 'success' | 'error' | 'modification' = 
          i % 3 === 0 ? 'error' : (i % 3 === 1 ? 'success' : 'modification');
        const confidence = 0.3 + (i / 100); // 0.31 - 0.80
        const occurrences = Math.floor(Math.random() * 20) + 1;
        
        recommender.addPattern(createPattern(`PAT-${i.toString().padStart(3, '0')}`, type, confidence, occurrences));
      }

      const stats = recommender.getStats();
      expect(isOk(stats)).toBe(true);
      if (isOk(stats)) {
        expect(stats.value.totalPatterns).toBe(50);
      }

      // レコメンデーションがソートされていることを確認
      const result = recommender.recommend({ query: 'test', limit: 10 });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeLessThanOrEqual(10);
        // スコアが降順であることを確認
        // スコア計算: confidence * log(occurrences + 1)
        for (let i = 1; i < result.value.length; i++) {
          const current = result.value[i]!;
          const previous = result.value[i - 1]!;
          const scoreA = previous.confidence * Math.log(previous.occurrences + 1);
          const scoreB = current.confidence * Math.log(current.occurrences + 1);
          expect(scoreA).toBeGreaterThanOrEqual(scoreB);
        }
      }
    });

    it('should handle 100+ patterns efficiently', () => {
      // 100パターンを追加
      for (let i = 1; i <= 100; i++) {
        const type: 'success' | 'error' | 'modification' = 
          i % 3 === 0 ? 'error' : (i % 3 === 1 ? 'success' : 'modification');
        recommender.addPattern(createPattern(
          `PERF-${i.toString().padStart(3, '0')}`,
          type,
          Math.random() * 0.5 + 0.3, // 0.3-0.8
          Math.floor(Math.random() * 50)
        ));
      }

      const start = performance.now();
      
      // 複数回のレコメンデーションを実行
      for (let i = 0; i < 100; i++) {
        recommender.recommend({ query: `query-${i}`, limit: 10 });
      }
      
      const elapsed = performance.now() - start;

      // 100回のレコメンデーションが1秒以内に完了すること
      expect(elapsed).toBeLessThan(1000);
    });

    it('should adapt to usage patterns with 50+ patterns', () => {
      // 50パターンを初期信頼度0.5で追加
      for (let i = 1; i <= 50; i++) {
        recommender.addPattern(createPattern(`ADAPT-${i}`, 'success', 0.5, 1));
      }

      // 特定のパターンを成功として10回使用
      for (let i = 0; i < 10; i++) {
        recommender.recordUsage('ADAPT-1', true);
        recommender.recordUsage('ADAPT-2', true);
      }

      // 特定のパターンを失敗として10回使用
      for (let i = 0; i < 10; i++) {
        recommender.recordUsage('ADAPT-49', false);
        recommender.recordUsage('ADAPT-50', false);
      }

      // 成功パターンの信頼度が上がっていることを確認
      const pattern1 = recommender.getPattern('ADAPT-1');
      expect(isOk(pattern1)).toBe(true);
      if (isOk(pattern1) && pattern1.value) {
        expect(pattern1.value.confidence).toBeGreaterThan(0.5);
      }

      // 失敗パターンの信頼度が下がっていることを確認
      const pattern49 = recommender.getPattern('ADAPT-49');
      expect(isOk(pattern49)).toBe(true);
      if (isOk(pattern49) && pattern49.value) {
        expect(pattern49.value.confidence).toBeLessThan(0.5);
      }

      // レコメンデーションで成功パターンが上位に来ることを確認
      const result = recommender.recommend({ query: 'test', limit: 5 });
      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value.length > 0) {
        const topIds = result.value.map(p => p.id);
        // ADAPT-1 or ADAPT-2 should be in top 5
        expect(topIds.includes('ADAPT-1') || topIds.includes('ADAPT-2')).toBe(true);
      }
    });

    it('should filter by type accurately with large pattern set', () => {
      // 各タイプ20パターンずつ、計60パターン
      for (let i = 1; i <= 20; i++) {
        recommender.addPattern(createPattern(`SUCCESS-${i}`, 'success', 0.7, i));
        recommender.addPattern(createPattern(`ERROR-${i}`, 'error', 0.7, i));
        recommender.addPattern(createPattern(`MOD-${i}`, 'modification', 0.7, i));
      }

      const successResult = recommender.recommend({ query: 'test', type: 'success' });
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.value.every(p => p.type === 'success')).toBe(true);
      }

      const errorResult = recommender.recommend({ query: 'test', type: 'error' });
      expect(isOk(errorResult)).toBe(true);
      if (isOk(errorResult)) {
        expect(errorResult.value.every(p => p.type === 'error')).toBe(true);
      }
    });
  });
});
