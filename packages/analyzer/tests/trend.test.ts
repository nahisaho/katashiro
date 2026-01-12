/**
 * TrendAnalyzer テスト
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOk, isErr } from '@nahisaho/katashiro-core';
import {
  TrendAnalyzer,
  TimeSeriesCollector,
  TrendDetector,
  ForecastEngine,
  VisualizationGenerator,
} from '../src/trend/index.js';
import type {
  TimeSeriesData,
  DetectedTrend,
  TrendAnalysisQuery,
} from '../src/trend/types.js';

// テスト用のダミー時系列データを生成
function generateMockTimeSeries(
  startDate: Date,
  days: number,
  pattern: 'rising' | 'falling' | 'spike' | 'plateau' = 'plateau'
): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    let volume: number;
    switch (pattern) {
      case 'rising':
        volume = 10 + i * 2 + Math.random() * 3;
        break;
      case 'falling':
        volume = 50 - i * 2 + Math.random() * 3;
        break;
      case 'spike':
        volume = i === Math.floor(days / 2) ? 100 : 10 + Math.random() * 5;
        break;
      case 'plateau':
      default:
        volume = 25 + Math.random() * 5;
    }
    
    data.push({
      timestamp: date,
      volume: Math.max(0, volume),
      normalizedScore: 0,
      sourceBreakdown: { news: Math.floor(volume * 0.6), web: Math.floor(volume * 0.4) },
      sampleDocs: [],
    });
  }
  
  // 正規化
  const maxVolume = Math.max(...data.map(d => d.volume), 1);
  for (const d of data) {
    d.normalizedScore = (d.volume / maxVolume) * 100;
  }
  
  return data;
}

describe('TrendDetector', () => {
  let detector: TrendDetector;
  
  beforeEach(() => {
    detector = new TrendDetector({
      sensitivityThreshold: 0.1,
      minDataPoints: 3,
      detectSeasonality: true,
    });
  });
  
  describe('detect', () => {
    it('上昇トレンドを検出できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'rising');
      const trends = detector.detect(data);
      
      expect(trends.length).toBeGreaterThan(0);
      const risingTrend = trends.find(t => t.type === 'rising');
      expect(risingTrend).toBeDefined();
      if (risingTrend) {
        expect(risingTrend.confidence).toBeGreaterThan(0.3);
      }
    });
    
    it('下降トレンドを検出できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'falling');
      const trends = detector.detect(data);
      
      expect(trends.length).toBeGreaterThan(0);
      const fallingTrend = trends.find(t => t.type === 'falling');
      expect(fallingTrend).toBeDefined();
      if (fallingTrend) {
        expect(fallingTrend.confidence).toBeGreaterThan(0.3);
      }
    });
    
    it('スパイクを検出できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'spike');
      const trends = detector.detect(data);
      
      const spikeTrend = trends.find(t => t.type === 'spike');
      expect(spikeTrend).toBeDefined();
      if (spikeTrend) {
        expect(spikeTrend.magnitude).toBeGreaterThan(100);
      }
    });
    
    it('データポイントが不足している場合は空の配列を返す', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 2, 'plateau');
      const trends = detector.detect(data);
      
      expect(trends).toEqual([]);
    });
  });
  
  describe('generateSummary', () => {
    it('サマリーを生成できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'rising');
      const trends = detector.detect(data);
      const summary = detector.generateSummary(data, trends);
      
      expect(summary.dominantTrend).toBeDefined();
      expect(summary.growthRate).toBeDefined();
      expect(summary.narrative).toBeTruthy();
      expect(summary.keyInsights).toBeInstanceOf(Array);
    });
    
    it('空データでもエラーにならない', () => {
      const summary = detector.generateSummary([], []);
      
      expect(summary.dominantTrend).toBe('plateau');
      expect(summary.narrative).toBeTruthy();
    });
  });
});

describe('ForecastEngine', () => {
  let forecaster: ForecastEngine;
  
  beforeEach(() => {
    forecaster = new ForecastEngine();
  });
  
  describe('forecast', () => {
    it('線形予測を実行できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'rising');
      const forecast = forecaster.forecast(data, {
        periods: 7,
        method: 'linear',
        confidenceLevel: 0.95,
      });
      
      expect(forecast.method).toBe('linear');
      expect(forecast.predictions).toHaveLength(7);
      expect(forecast.upperBound).toHaveLength(7);
      expect(forecast.lowerBound).toHaveLength(7);
      expect(forecast.confidenceLevel).toBe(0.95);
      expect(forecast.accuracy).toBeGreaterThanOrEqual(0);
    });
    
    it('指数平滑法予測を実行できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'plateau');
      const forecast = forecaster.forecast(data, {
        periods: 5,
        method: 'exponential',
        confidenceLevel: 0.95,
      });
      
      expect(forecast.method).toBe('exponential');
      expect(forecast.predictions).toHaveLength(5);
    });
    
    it('移動平均予測を実行できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'plateau');
      const forecast = forecaster.forecast(data, {
        periods: 5,
        method: 'movingAverage',
        confidenceLevel: 0.95,
      });
      
      expect(forecast.method).toBe('movingAverage');
      expect(forecast.predictions).toHaveLength(5);
    });
    
    it('データが少なすぎる場合は空の予測を返す', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 1, 'plateau');
      const forecast = forecaster.forecast(data, { periods: 3 });
      
      expect(forecast.predictions).toHaveLength(3);
      expect(forecast.accuracy).toBe(0);
    });
    
    it('予測値は常に0以上', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'falling');
      const forecast = forecaster.forecast(data, { periods: 30, method: 'linear' });
      
      for (const pred of forecast.predictions) {
        expect(pred.value).toBeGreaterThanOrEqual(0);
      }
      for (const bound of forecast.lowerBound) {
        expect(bound).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe('VisualizationGenerator', () => {
  let visualizer: VisualizationGenerator;
  
  beforeEach(() => {
    visualizer = new VisualizationGenerator();
  });
  
  describe('generate', () => {
    it('可視化データを生成できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 30, 'rising');
      const trends: DetectedTrend[] = [{
        type: 'rising',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-30'),
        confidence: 0.8,
        magnitude: 50,
        description: 'Test trend',
      }];
      
      const viz = visualizer.generate({ timeSeries: data, trends });
      
      expect(viz.lineChart).toBeDefined();
      expect(viz.lineChart.labels).toHaveLength(30);
      expect(viz.lineChart.datasets.length).toBeGreaterThan(0);
      
      expect(viz.heatmap).toBeDefined();
      expect(viz.pieChart).toBeDefined();
      expect(viz.annotations).toBeInstanceOf(Array);
    });
    
    it('予測データも含めた可視化データを生成できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 10, 'plateau');
      const forecaster = new ForecastEngine();
      const forecast = forecaster.forecast(data, { periods: 5 });
      
      const viz = visualizer.generate({ timeSeries: data, forecast });
      
      // 予測データがラベルに追加される
      expect(viz.lineChart.labels.length).toBeGreaterThan(10);
    });
  });
  
  describe('generatePieChart', () => {
    it('ソース別の円グラフデータを生成できる', () => {
      const data = generateMockTimeSeries(new Date('2025-01-01'), 10, 'plateau');
      const viz = visualizer.generate({ timeSeries: data });
      
      expect(viz.pieChart.labels.length).toBeGreaterThan(0);
      expect(viz.pieChart.data.length).toBe(viz.pieChart.labels.length);
      expect(viz.pieChart.colors.length).toBe(viz.pieChart.labels.length);
    });
  });
  
  describe('generateAnnotations', () => {
    it('トレンドからアノテーションを生成できる', () => {
      const trends: DetectedTrend[] = [
        {
          type: 'spike',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          confidence: 0.9,
          magnitude: 150,
          description: 'Spike detected',
        },
        {
          type: 'rising',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-30'),
          confidence: 0.8,
          magnitude: 50,
          description: 'Rising trend',
        },
      ];
      
      const viz = visualizer.generate({ timeSeries: [], trends });
      
      expect(viz.annotations.length).toBe(2);
      expect(viz.annotations.some(a => a.type === 'spike')).toBe(true);
      expect(viz.annotations.some(a => a.type === 'trend')).toBe(true);
    });
  });
});

describe('TimeSeriesCollector', () => {
  let collector: TimeSeriesCollector;
  
  beforeEach(() => {
    collector = new TimeSeriesCollector();
  });
  
  describe('collect', () => {
    it('時系列データを収集できる', async () => {
      const result = await collector.collect({
        topic: 'test',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        granularity: 'daily',
        sources: ['news', 'web'],
      });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // 7日分のバケット
        expect(result.value.length).toBe(6);
        for (const ts of result.value) {
          expect(ts.timestamp).toBeInstanceOf(Date);
          expect(typeof ts.volume).toBe('number');
          expect(typeof ts.normalizedScore).toBe('number');
        }
      }
    });
    
    it('週次の粒度で収集できる', async () => {
      const result = await collector.collect({
        topic: 'test',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-29'),
        granularity: 'weekly',
        sources: ['news'],
      });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // 4週分
        expect(result.value.length).toBe(4);
      }
    });
    
    it('月次の粒度で収集できる', async () => {
      const result = await collector.collect({
        topic: 'test',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-04-01'),
        granularity: 'monthly',
        sources: ['web'],
      });
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // 3ヶ月分
        expect(result.value.length).toBe(3);
      }
    });
  });
});

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;
  
  beforeEach(() => {
    analyzer = new TrendAnalyzer({
      maxSources: 5,
      defaultGranularity: 'daily',
      forecastPeriods: 7,
      enableCaching: false,
    });
  });
  
  describe('analyze', () => {
    it('基本的な分析を実行できる', async () => {
      const query: TrendAnalysisQuery = {
        topic: 'AI',
        dateRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-10'),
        },
        options: {
          granularity: 'daily',
          sources: ['news', 'web'],
          includeForecast: true,
        },
      };
      
      const result = await analyzer.analyze(query);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.topic).toBe('AI');
        expect(result.value.timeSeries).toBeInstanceOf(Array);
        expect(result.value.trends).toBeInstanceOf(Array);
        expect(result.value.summary).toBeDefined();
        expect(result.value.visualization).toBeDefined();
        expect(result.value.metadata.processingTimeMs).toBeGreaterThan(0);
      }
    });
    
    it('空のトピックでエラーを返す', async () => {
      const query: TrendAnalysisQuery = {
        topic: '',
        dateRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-10'),
        },
      };
      
      const result = await analyzer.analyze(query);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
    
    it('無効な日付範囲でエラーを返す', async () => {
      const query: TrendAnalysisQuery = {
        topic: 'Test',
        dateRange: {
          start: new Date('2025-12-31'),
          end: new Date('2025-01-01'),
        },
      };
      
      const result = await analyzer.analyze(query);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
    
    it('2年を超える期間でエラーを返す', async () => {
      const query: TrendAnalysisQuery = {
        topic: 'Test',
        dateRange: {
          start: new Date('2020-01-01'),
          end: new Date('2025-01-01'),
        },
      };
      
      const result = await analyzer.analyze(query);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_INPUT');
        expect(result.error.message).toContain('2 years');
      }
    });
  });
  
  describe('compare', () => {
    it('複数トピックを比較できる', async () => {
      const result = await analyzer.compare(
        ['AI', 'ML'],
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-10'),
        },
        { granularity: 'daily' }
      );
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.topics).toHaveLength(2);
        expect(result.value.correlations).toHaveLength(1); // 2トピックで1つの相関
        expect(result.value.comparisonSummary).toBeDefined();
      }
    });
    
    it('トピックが2つ未満でエラーを返す', async () => {
      const result = await analyzer.compare(
        ['AI'],
        { start: new Date('2025-01-01'), end: new Date('2025-01-10') }
      );
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
    
    it('トピックが6つ以上でエラーを返す', async () => {
      const result = await analyzer.compare(
        ['A', 'B', 'C', 'D', 'E', 'F'],
        { start: new Date('2025-01-01'), end: new Date('2025-01-10') }
      );
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });
});
