/**
 * Metrics Collector Implementation
 *
 * @requirement REQ-OBS-002
 * @design DES-KATASHIRO-003-OBS §3.2
 */

import type { MetricsSnapshot, HistogramData, MetricsExporter } from './types.js';

/**
 * メトリクスコレクター
 */
export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private exporters: MetricsExporter[] = [];

  /**
   * カウンターインクリメント
   */
  incrementCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  /**
   * ゲージ設定
   */
  setGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * ヒストグラム記録
   */
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * スナップショット取得
   */
  getSnapshot(): MetricsSnapshot {
    const histograms: Record<string, HistogramData> = {};

    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      histograms[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(sorted, 0.5),
        p90: this.percentile(sorted, 0.9),
        p99: this.percentile(sorted, 0.99),
        buckets: this.buildBuckets(values),
      };
    }

    return {
      timestamp: new Date().toISOString(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms,
    };
  }

  /**
   * 特定カウンター取得
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.buildKey(name, labels);
    return this.counters.get(key) ?? 0;
  }

  /**
   * 特定ゲージ取得
   */
  getGauge(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.buildKey(name, labels);
    return this.gauges.get(key);
  }

  /**
   * リセット
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * エクスポーター追加
   */
  addExporter(exporter: MetricsExporter): void {
    this.exporters.push(exporter);
  }

  /**
   * メトリクスエクスポート
   */
  async export(): Promise<void> {
    const snapshot = this.getSnapshot();
    await Promise.all(
      this.exporters.map((exp) => exp.export(snapshot).catch(console.error))
    );
  }

  /**
   * シャットダウン
   */
  async shutdown(): Promise<void> {
    await Promise.all(
      this.exporters.map((exp) => exp.shutdown?.().catch(console.error))
    );
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, idx)] ?? 0;
  }

  private buildBuckets(values: number[]): Record<string, number> {
    const boundaries = [1, 5, 10, 50, 100, 500, 1000, 5000];
    const buckets: Record<string, number> = {};

    for (const b of boundaries) {
      buckets[`le_${b}`] = values.filter((v) => v <= b).length;
    }
    buckets['le_+Inf'] = values.length;

    return buckets;
  }
}

// シングルトン
let metricsCollector: MetricsCollector | null = null;

/**
 * グローバルメトリクスコレクター取得
 */
export function getMetricsCollector(): MetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}

/**
 * メトリクスコレクターリセット（テスト用）
 */
export function resetMetricsCollector(): void {
  metricsCollector = null;
}
