/**
 * TrendAnalyzer - トレンド分析オーケストレータ
 *
 * 時系列データの収集、トレンド検出、予測、可視化を統合的に実行する
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import { TimeSeriesCollector } from './TimeSeriesCollector.js';
import { TrendDetector } from './TrendDetector.js';
import { ForecastEngine } from './ForecastEngine.js';
import { VisualizationGenerator } from './VisualizationGenerator.js';
import type {
  TrendAnalysisQuery,
  TrendAnalysisResult,
  TrendAnalyzerConfig,
  TrendAnalysisError,
  TimeSeriesData,
  TopicComparison,
} from './types.js';

/**
 * トレンド分析を統合的に実行するメインクラス
 *
 * @example
 * ```typescript
 * const analyzer = new TrendAnalyzer();
 *
 * const result = await analyzer.analyze({
 *   topic: 'AI',
 *   dateRange: {
 *     start: new Date('2025-01-01'),
 *     end: new Date('2025-12-31'),
 *   },
 *   options: {
 *     granularity: 'weekly',
 *     sources: ['news', 'web'],
 *     includeForecast: true,
 *   },
 * });
 *
 * if (isOk(result)) {
 *   console.log(result.value.summary);
 * }
 * ```
 */
export class TrendAnalyzer {
  private collector: TimeSeriesCollector;
  private detector: TrendDetector;
  private forecaster: ForecastEngine;
  private visualizer: VisualizationGenerator;
  private config: TrendAnalyzerConfig;

  constructor(config?: Partial<TrendAnalyzerConfig>) {
    this.config = {
      maxSources: config?.maxSources ?? 5,
      defaultGranularity: config?.defaultGranularity ?? 'weekly',
      forecastPeriods: config?.forecastPeriods ?? 7,
      enableCaching: config?.enableCaching ?? false,
    };

    this.collector = new TimeSeriesCollector();
    this.detector = new TrendDetector({
      sensitivityThreshold: 0.1,
      minDataPoints: 3,
      detectSeasonality: true,
    });
    this.forecaster = new ForecastEngine();
    this.visualizer = new VisualizationGenerator();
  }

  /**
   * トレンド分析を実行
   */
  async analyze(query: TrendAnalysisQuery): Promise<Result<TrendAnalysisResult, TrendAnalysisError>> {
    const startTime = Date.now();

    try {
      // 入力検証
      const validationError = this.validateQuery(query);
      if (validationError) {
        return err(validationError);
      }

      // デフォルト値を適用
      const granularity = query.options?.granularity ?? this.config.defaultGranularity;
      const sources = query.options?.sources ?? ['news', 'web'];
      const includeForecast = query.options?.includeForecast ?? true;
      const forecastPeriods = query.options?.forecastPeriods ?? this.config.forecastPeriods;

      // 時系列データを収集
      const collectionResult = await this.collector.collect({
        topic: query.topic,
        startDate: query.dateRange.start,
        endDate: query.dateRange.end,
        granularity,
        sources,
      });

      if (!isOk(collectionResult)) {
        return err(collectionResult.error);
      }

      const timeSeries = collectionResult.value;

      // トレンドを検出
      const trends = this.detector.detect(timeSeries);

      // サマリーを生成
      const summary = this.detector.generateSummary(timeSeries, trends);

      // 予測を生成（オプション）
      let forecast = undefined;
      if (includeForecast && timeSeries.length >= 3) {
        forecast = this.forecaster.forecast(timeSeries, {
          periods: forecastPeriods,
          method: 'linear',
          confidenceLevel: 0.95,
        });
      }

      // 可視化データを生成
      const visualization = this.visualizer.generate({
        timeSeries,
        trends,
        forecast,
      });

      const processingTime = Date.now() - startTime;

      return ok({
        topic: query.topic,
        dateRange: query.dateRange,
        timeSeries,
        trends,
        summary,
        forecast,
        visualization,
        metadata: {
          sources,
          granularity,
          dataPoints: timeSeries.length,
          analysisTimestamp: new Date(),
          processingTimeMs: processingTime,
        },
      });
    } catch (error) {
      return err({
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown analysis error',
        details: error,
      });
    }
  }

  /**
   * 複数トピックを比較分析
   */
  async compare(
    topics: string[],
    dateRange: { start: Date; end: Date },
    options?: TrendAnalysisQuery['options']
  ): Promise<Result<TopicComparison, TrendAnalysisError>> {
    try {
      if (topics.length < 2) {
        return err({
          code: 'INVALID_INPUT',
          message: 'At least 2 topics are required for comparison',
        });
      }

      if (topics.length > 5) {
        return err({
          code: 'INVALID_INPUT',
          message: 'Maximum 5 topics can be compared at once',
        });
      }

      const granularity = options?.granularity ?? this.config.defaultGranularity;
      const sources = options?.sources ?? ['news', 'web'];

      // 各トピックのデータを収集
      const topicsData = await Promise.all(
        topics.map(async (topic) => {
          const result = await this.collector.collect({
            topic,
            startDate: dateRange.start,
            endDate: dateRange.end,
            granularity,
            sources,
          });

          return {
            topic,
            data: isOk(result) ? result.value : [],
          };
        })
      );

      // 相関分析
      const correlations = this.calculateTopicCorrelations(topicsData);

      // 比較サマリーを生成
      const comparisonSummary = this.generateComparisonSummary(topicsData, correlations);

      // 比較用の可視化データ
      const comparison: TopicComparison = {
        topics: topicsData,
        correlations,
        comparisonSummary,
      };

      return ok(comparison);
    } catch (error) {
      return err({
        code: 'COMPARISON_FAILED',
        message: error instanceof Error ? error.message : 'Unknown comparison error',
        details: error,
      });
    }
  }

  /**
   * クエリの検証
   */
  private validateQuery(query: TrendAnalysisQuery): TrendAnalysisError | null {
    if (!query.topic || query.topic.trim().length === 0) {
      return {
        code: 'INVALID_INPUT',
        message: 'Topic is required',
      };
    }

    if (!query.dateRange?.start || !query.dateRange?.end) {
      return {
        code: 'INVALID_INPUT',
        message: 'Date range is required',
      };
    }

    if (query.dateRange.start >= query.dateRange.end) {
      return {
        code: 'INVALID_INPUT',
        message: 'Start date must be before end date',
      };
    }

    // 1年以上の範囲は制限
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (query.dateRange.end.getTime() - query.dateRange.start.getTime() > oneYear * 2) {
      return {
        code: 'INVALID_INPUT',
        message: 'Date range cannot exceed 2 years',
      };
    }

    return null;
  }

  /**
   * トピック間の相関を計算
   */
  private calculateTopicCorrelations(
    topicsData: Array<{ topic: string; data: TimeSeriesData[] }>
  ): Array<{ topic1: string; topic2: string; correlation: number }> {
    const correlations: Array<{ topic1: string; topic2: string; correlation: number }> = [];

    for (let i = 0; i < topicsData.length; i++) {
      for (let j = i + 1; j < topicsData.length; j++) {
        const topicI = topicsData[i];
        const topicJ = topicsData[j];
        if (!topicI || !topicJ) continue;

        const correlation = this.calculateCorrelation(
          topicI.data.map((d) => d.normalizedScore),
          topicJ.data.map((d) => d.normalizedScore)
        );

        correlations.push({
          topic1: topicI.topic,
          topic2: topicJ.topic,
          correlation,
        });
      }
    }

    return correlations;
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xSumSq = 0;
    let ySumSq = 0;

    for (let i = 0; i < n; i++) {
      const xVal = xSlice[i] ?? 0;
      const yVal = ySlice[i] ?? 0;
      const xDiff = xVal - xMean;
      const yDiff = yVal - yMean;
      numerator += xDiff * yDiff;
      xSumSq += xDiff * xDiff;
      ySumSq += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xSumSq * ySumSq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 比較サマリーを生成
   */
  private generateComparisonSummary(
    topicsData: Array<{ topic: string; data: TimeSeriesData[] }>,
    correlations: Array<{ topic1: string; topic2: string; correlation: number }>
  ): string {
    const parts: string[] = [];

    // トピックごとの総ボリューム
    const topicVolumes = topicsData.map((t) => ({
      topic: t.topic,
      volume: t.data.reduce((sum, d) => sum + d.volume, 0),
    }));

    topicVolumes.sort((a, b) => b.volume - a.volume);
    const topTopic = topicVolumes[0];
    if (topTopic) {
      parts.push(`最も関心が高いトピック: ${topTopic.topic}`);
    }

    // 強い相関があるペア
    const strongCorrelations = correlations.filter((c) => Math.abs(c.correlation) > 0.7);
    const pair = strongCorrelations[0];
    if (pair) {
      parts.push(`${pair.topic1}と${pair.topic2}は強い相関（${pair.correlation.toFixed(2)}）があります`);
    }

    return parts.join('。');
  }
}
