/**
 * MetricsCollector Tests
 *
 * @design DES-KATASHIRO-003-OBS §8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
} from '../src/MetricsCollector.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    resetMetricsCollector();
    collector = new MetricsCollector();
  });

  describe('incrementCounter', () => {
    it('カウンターをインクリメント', () => {
      collector.incrementCounter('requests');
      collector.incrementCounter('requests');
      collector.incrementCounter('requests', 3);

      expect(collector.getCounter('requests')).toBe(5);
    });

    it('ラベル付きカウンター', () => {
      collector.incrementCounter('requests', 1, { method: 'GET' });
      collector.incrementCounter('requests', 2, { method: 'POST' });
      collector.incrementCounter('requests', 1, { method: 'GET' });

      expect(collector.getCounter('requests', { method: 'GET' })).toBe(2);
      expect(collector.getCounter('requests', { method: 'POST' })).toBe(2);
    });
  });

  describe('setGauge', () => {
    it('ゲージを設定', () => {
      collector.setGauge('memory_usage', 1024);
      expect(collector.getGauge('memory_usage')).toBe(1024);

      collector.setGauge('memory_usage', 2048);
      expect(collector.getGauge('memory_usage')).toBe(2048);
    });

    it('ラベル付きゲージ', () => {
      collector.setGauge('connections', 10, { type: 'active' });
      collector.setGauge('connections', 5, { type: 'idle' });

      expect(collector.getGauge('connections', { type: 'active' })).toBe(10);
      expect(collector.getGauge('connections', { type: 'idle' })).toBe(5);
    });
  });

  describe('recordHistogram', () => {
    it('ヒストグラムを記録', () => {
      collector.recordHistogram('latency', 10);
      collector.recordHistogram('latency', 20);
      collector.recordHistogram('latency', 30);
      collector.recordHistogram('latency', 100);
      collector.recordHistogram('latency', 50);

      const snapshot = collector.getSnapshot();
      const histogram = snapshot.histograms['latency'];

      expect(histogram.count).toBe(5);
      expect(histogram.min).toBe(10);
      expect(histogram.max).toBe(100);
      expect(histogram.sum).toBe(210);
      expect(histogram.avg).toBe(42);
    });

    it('パーセンタイル計算', () => {
      // 1-100の値を記録
      for (let i = 1; i <= 100; i++) {
        collector.recordHistogram('response_time', i);
      }

      const snapshot = collector.getSnapshot();
      const histogram = snapshot.histograms['response_time'];

      expect(histogram.p50).toBe(50);
      expect(histogram.p90).toBe(90);
      expect(histogram.p99).toBe(99);
    });

    it('バケット計算', () => {
      collector.recordHistogram('size', 0.5);
      collector.recordHistogram('size', 2);
      collector.recordHistogram('size', 8);
      collector.recordHistogram('size', 60);
      collector.recordHistogram('size', 1500);

      const snapshot = collector.getSnapshot();
      const buckets = snapshot.histograms['size'].buckets;

      expect(buckets['le_1']).toBe(1);
      expect(buckets['le_5']).toBe(2);
      expect(buckets['le_10']).toBe(3);
      expect(buckets['le_100']).toBe(4);
      expect(buckets['le_+Inf']).toBe(5);
    });
  });

  describe('getSnapshot', () => {
    it('全メトリクスのスナップショットを返す', () => {
      collector.incrementCounter('counter1', 5);
      collector.setGauge('gauge1', 100);
      collector.recordHistogram('hist1', 50);

      const snapshot = collector.getSnapshot();

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.counters['counter1']).toBe(5);
      expect(snapshot.gauges['gauge1']).toBe(100);
      expect(snapshot.histograms['hist1']).toBeDefined();
    });
  });

  describe('reset', () => {
    it('全メトリクスをリセット', () => {
      collector.incrementCounter('counter1', 5);
      collector.setGauge('gauge1', 100);
      collector.recordHistogram('hist1', 50);

      collector.reset();

      const snapshot = collector.getSnapshot();
      expect(Object.keys(snapshot.counters)).toHaveLength(0);
      expect(Object.keys(snapshot.gauges)).toHaveLength(0);
      expect(Object.keys(snapshot.histograms)).toHaveLength(0);
    });
  });

  describe('getMetricsCollector', () => {
    it('シングルトンインスタンスを返す', () => {
      const collector1 = getMetricsCollector();
      const collector2 = getMetricsCollector();
      expect(collector1).toBe(collector2);
    });
  });
});
