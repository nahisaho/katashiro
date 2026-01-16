/**
 * @fileoverview AdaptiveConcurrencyControllerモジュールのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AdaptiveConcurrencyController,
  createAdaptiveConcurrencyController,
} from '../../src/parallel/adaptive-concurrency-controller';

describe('AdaptiveConcurrencyController', () => {
  let controller: AdaptiveConcurrencyController;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = createAdaptiveConcurrencyController({
      initialConcurrency: 5,
      minConcurrency: 1,
      maxConcurrency: 20,
      scaleUpThreshold: 90,
      scaleDownThreshold: 20,
      adjustmentIntervalMs: 5000,
    });
  });

  afterEach(() => {
    controller.stop();
    vi.useRealTimers();
  });

  describe('createAdaptiveConcurrencyController', () => {
    it('デフォルト設定で作成する', () => {
      const ctrl = createAdaptiveConcurrencyController();
      expect(ctrl.getCurrentConcurrency()).toBe(5);
    });

    it('カスタム設定で作成する', () => {
      const ctrl = createAdaptiveConcurrencyController({
        initialConcurrency: 10,
        minConcurrency: 2,
        maxConcurrency: 50,
      });
      expect(ctrl.getCurrentConcurrency()).toBe(10);
    });
  });

  describe('getCurrentConcurrency', () => {
    it('現在の並行数を返す', () => {
      expect(controller.getCurrentConcurrency()).toBe(5);
    });
  });

  describe('recordSuccess / recordFailure', () => {
    it('成功を記録する', () => {
      controller.recordSuccess(100);
      const stats = controller.getStats();
      expect(stats.executionCount).toBe(1);
    });

    it('失敗を記録する', () => {
      controller.recordFailure(100);
      const stats = controller.getStats();
      expect(stats.executionCount).toBe(1);
    });

    it('複数の記録を追跡する', () => {
      controller.recordSuccess(50);
      controller.recordSuccess(100);
      controller.recordFailure(150);
      controller.recordSuccess(200);

      const stats = controller.getStats();
      expect(stats.executionCount).toBe(4);
    });
  });

  describe('start / stop', () => {
    it('制御を開始・停止する', () => {
      expect(controller.isRunning).toBe(false);
      controller.start();
      expect(controller.isRunning).toBe(true);
      controller.stop();
      expect(controller.isRunning).toBe(false);
    });

    it('重複してstartしても問題ない', () => {
      controller.start();
      controller.start();
      expect(controller.isRunning).toBe(true);
    });
  });

  describe('reset', () => {
    it('状態をリセットする', () => {
      controller.recordSuccess(100);
      controller.recordFailure(100);
      controller.start();
      controller.reset();

      expect(controller.isRunning).toBe(false);
      expect(controller.getStats().executionCount).toBe(0);
      expect(controller.getCurrentConcurrency()).toBe(5);
    });
  });

  describe('getStats', () => {
    it('統計情報を返す', () => {
      controller.recordSuccess(100);

      const stats = controller.getStats();

      expect(stats.currentConcurrency).toBe(5);
      expect(stats.minConcurrency).toBe(1);
      expect(stats.maxConcurrency).toBe(20);
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageDurationMs).toBe('number');
      expect(typeof stats.executionCount).toBe('number');
    });
  });

  describe('getSuccessRate', () => {
    it('成功率を計算する（パーセンテージ）', () => {
      controller.recordSuccess(100);
      controller.recordSuccess(100);
      controller.recordFailure(100);

      const rate = controller.getSuccessRate();
      expect(rate).toBeCloseTo(66.67, 0);
    });

    it('記録がない場合は100を返す', () => {
      const rate = controller.getSuccessRate();
      expect(rate).toBe(100);
    });
  });

  describe('getAverageDuration', () => {
    it('平均実行時間を計算する', () => {
      controller.recordSuccess(100);
      controller.recordSuccess(200);
      controller.recordSuccess(300);

      const avg = controller.getAverageDuration();
      expect(avg).toBe(200);
    });

    it('記録がない場合は0を返す', () => {
      const avg = controller.getAverageDuration();
      expect(avg).toBe(0);
    });
  });

  describe('setConcurrency', () => {
    it('手動で並行数を設定する', () => {
      controller.setConcurrency(10);
      expect(controller.getCurrentConcurrency()).toBe(10);
    });

    it('範囲内に制限される', () => {
      controller.setConcurrency(100);
      expect(controller.getCurrentConcurrency()).toBe(20);

      controller.setConcurrency(0);
      expect(controller.getCurrentConcurrency()).toBe(1);
    });
  });

  describe('clearHistory', () => {
    it('実行履歴をクリアする', () => {
      controller.recordSuccess(100);
      controller.recordSuccess(200);
      controller.clearHistory();

      expect(controller.getStats().executionCount).toBe(0);
    });
  });
});
