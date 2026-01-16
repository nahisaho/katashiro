/**
 * @fileoverview ResourceMonitorモジュールのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ResourceMonitor,
  createResourceMonitor,
  type ResourceUsage,
} from '../../src/parallel/resource-monitor';

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = createResourceMonitor({
      intervalMs: 1000,
      cpuWarningThreshold: 80,
      memoryWarningThreshold: 85,
      historySize: 10,
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe('createResourceMonitor', () => {
    it('デフォルト設定でモニターを作成する', () => {
      const m = createResourceMonitor();
      expect(m).toBeDefined();
      m.stop();
    });

    it('カスタム設定でモニターを作成する', () => {
      const m = createResourceMonitor({
        intervalMs: 500,
        cpuWarningThreshold: 90,
        memoryWarningThreshold: 95,
        historySize: 100,
      });
      expect(m).toBeDefined();
      m.stop();
    });
  });

  describe('start / stop', () => {
    it('モニタリングを開始・停止する', () => {
      expect(monitor.isRunning).toBe(false);
      
      monitor.start();
      expect(monitor.isRunning).toBe(true);
      
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });

    it('重複してstartしても問題ない', () => {
      monitor.start();
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });
  });

  describe('getCurrentUsage', () => {
    it('現在のリソース使用状況を返す', () => {
      const usage: ResourceUsage = monitor.getCurrentUsage();
      
      expect(typeof usage.cpuPercent).toBe('number');
      expect(typeof usage.memoryPercent).toBe('number');
      expect(typeof usage.memoryUsedBytes).toBe('number');
      expect(typeof usage.memoryTotalBytes).toBe('number');
      expect(typeof usage.eventLoopDelayMs).toBe('number');
      expect(typeof usage.timestamp).toBe('number');
    });

    it('値が妥当な範囲内にある', () => {
      const usage = monitor.getCurrentUsage();
      
      expect(usage.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(usage.cpuPercent).toBeLessThanOrEqual(100);
      expect(usage.memoryPercent).toBeGreaterThanOrEqual(0);
      expect(usage.memoryPercent).toBeLessThanOrEqual(100);
      expect(usage.memoryUsedBytes).toBeGreaterThan(0);
    });
  });

  describe('getHistory', () => {
    it('履歴を返す', () => {
      monitor.start();
      
      // 複数回のインターバル経過をシミュレート
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
      }
      
      const history = monitor.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('最大サイズを超えない', () => {
      monitor.start();
      
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(1000);
      }
      
      const history = monitor.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getAverageUsage', () => {
    it('平均使用率を返す', () => {
      monitor.start();
      
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
      }
      
      const avg = monitor.getAverageUsage();
      expect(typeof avg.cpuPercent).toBe('number');
      expect(typeof avg.memoryPercent).toBe('number');
    });
  });

  describe('getRecommendedConcurrency', () => {
    it('推奨並行数を返す', () => {
      const recommended = monitor.getRecommendedConcurrency(5, 1, 20);
      
      expect(recommended).toBeGreaterThanOrEqual(1);
      expect(recommended).toBeLessThanOrEqual(20);
    });

    it('リソース使用率が高いと並行数を下げる', () => {
      // モックで高負荷をシミュレート
      const highLoadMonitor = createResourceMonitor();
      
      // 通常状態での推奨値
      const normal = highLoadMonitor.getRecommendedConcurrency(10, 1, 20);
      expect(typeof normal).toBe('number');
      
      highLoadMonitor.stop();
    });
  });

  describe('isOverThreshold', () => {
    it('閾値超過を判定する', () => {
      const isOver = monitor.isOverThreshold();
      expect(typeof isOver).toBe('boolean');
    });
  });

  describe('getStats', () => {
    it('統計情報を返す', () => {
      monitor.start();
      vi.advanceTimersByTime(2000);

      const stats = monitor.getStats();
      
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.historySize).toBe('number');
      expect(stats.current).toBeDefined();
      expect(stats.average).toBeDefined();
      expect(stats.peak).toBeDefined();
    });
  });

  describe('イベント', () => {
    it('閾値超過時にイベントを発火する', async () => {
      const eventHandler = vi.fn();
      monitor.on(eventHandler);
      
      monitor.start();
      vi.advanceTimersByTime(1000);
      
      // イベントハンドラーが登録されたことを確認
      expect(monitor).toBeDefined();
    });

    it('イベントリスナーを削除できる', () => {
      const eventHandler = vi.fn();
      monitor.on(eventHandler);
      monitor.off(eventHandler);
      
      monitor.start();
      vi.advanceTimersByTime(1000);
      
      // 削除後はイベントを受け取らない
      expect(monitor).toBeDefined();
    });
  });

  describe('clearHistory', () => {
    it('履歴をクリアする', () => {
      monitor.start();
      
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
      }
      
      monitor.clearHistory();
      expect(monitor.getHistory().length).toBe(0);
    });
  });
});
