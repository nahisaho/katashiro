/**
 * VisualizationGenerator - 可視化データ生成
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import type {
  TimeSeriesData,
  DetectedTrend,
  ForecastData,
  VisualizationData,
  LineChartData,
  HeatmapData,
  PieChartData,
  TopicComparison,
  TrendSource,
} from './types.js';

/**
 * トレンドデータを可視化用のフォーマットに変換するクラス
 *
 * @example
 * ```typescript
 * const vizGen = new VisualizationGenerator();
 *
 * const chartData = vizGen.generate({
 *   timeSeries: timeSeriesData,
 *   trends: detectedTrends,
 *   forecast: forecastData,
 * });
 * ```
 */
export class VisualizationGenerator {
  /**
   * 可視化データを生成
   */
  generate(input: {
    timeSeries: TimeSeriesData[];
    trends?: DetectedTrend[];
    forecast?: ForecastData;
    comparison?: TopicComparison;
  }): VisualizationData {
    return {
      lineChart: this.generateLineChart(input.timeSeries, input.forecast),
      heatmap: this.generateHeatmap(input.timeSeries),
      pieChart: this.generatePieChart(input.timeSeries),
      annotations: this.generateAnnotations(input.trends || []),
    };
  }

  /**
   * 折れ線グラフデータを生成
   */
  generateLineChart(timeSeries: TimeSeriesData[], forecast?: ForecastData): LineChartData {
    const labels = timeSeries.map((ts) => this.formatDate(ts.timestamp));

    const datasets: LineChartData['datasets'] = [
      {
        label: '実績値',
        data: timeSeries.map((ts) => ts.volume),
        color: '#3498db',
        type: 'line',
      },
      {
        label: '正規化スコア',
        data: timeSeries.map((ts) => ts.normalizedScore),
        color: '#2ecc71',
        type: 'line',
      },
    ];

    // 予測データがある場合は追加
    if (forecast && forecast.predictions.length > 0) {
      const forecastLabels = forecast.predictions.map((p) => this.formatDate(p.date));
      labels.push(...forecastLabels);

      // 予測値用のデータセット（実績値の後に続く）
      const forecastValues = [...Array(timeSeries.length).fill(null), ...forecast.predictions.map((p) => p.value)];
      const upperBoundValues = [...Array(timeSeries.length).fill(null), ...forecast.upperBound];
      const lowerBoundValues = [...Array(timeSeries.length).fill(null), ...forecast.lowerBound];

      datasets.push({
        label: '予測値',
        data: forecastValues,
        color: '#9b59b6',
        type: 'line',
      });

      datasets.push({
        label: '予測上限',
        data: upperBoundValues,
        color: '#9b59b6',
        type: 'area',
      });

      datasets.push({
        label: '予測下限',
        data: lowerBoundValues,
        color: '#9b59b6',
        type: 'area',
      });
    }

    return { labels, datasets };
  }

  /**
   * ヒートマップデータを生成
   */
  generateHeatmap(timeSeries: TimeSeriesData[]): HeatmapData {
    // ソースごとにデータを集計
    const sources: TrendSource[] = ['news', 'web', 'rss', 'academic', 'social'];
    const matrix: number[][] = [];
    const labels = timeSeries.map((ts) => this.formatDate(ts.timestamp));

    for (const source of sources) {
      const row = timeSeries.map((ts) => ts.sourceBreakdown[source] || 0);
      matrix.push(row);
    }

    // 最大値を取得（正規化用）
    const maxValue = Math.max(...matrix.flat(), 1);

    return {
      xLabels: labels,
      yLabels: sources,
      values: matrix,
      maxValue,
    };
  }

  /**
   * 円グラフデータを生成
   */
  generatePieChart(timeSeries: TimeSeriesData[]): PieChartData {
    // ソース別の合計を計算
    const sourceTotals: Partial<Record<TrendSource, number>> = {};

    for (const ts of timeSeries) {
      for (const [source, count] of Object.entries(ts.sourceBreakdown)) {
        sourceTotals[source as TrendSource] = (sourceTotals[source as TrendSource] || 0) + count;
      }
    }

    const sourceColors: Record<TrendSource, string> = {
      news: '#e74c3c',
      web: '#3498db',
      rss: '#f39c12',
      academic: '#2ecc71',
      social: '#9b59b6',
    };

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    for (const [source, total] of Object.entries(sourceTotals)) {
      if (total > 0) {
        labels.push(this.formatSourceLabel(source as TrendSource));
        data.push(total);
        colors.push(sourceColors[source as TrendSource]);
      }
    }

    return { labels, data, colors };
  }

  /**
   * トレンドのアノテーションを生成
   */
  generateAnnotations(trends: DetectedTrend[]): Array<{
    type: 'spike' | 'trend' | 'event';
    position: Date;
    label: string;
    color: string;
  }> {
    const annotations: Array<{
      type: 'spike' | 'trend' | 'event';
      position: Date;
      label: string;
      color: string;
    }> = [];

    for (const trend of trends) {
      switch (trend.type) {
        case 'spike':
          annotations.push({
            type: 'spike',
            position: trend.startDate,
            label: `スパイク (${trend.magnitude.toFixed(0)}%増)`,
            color: '#e74c3c',
          });
          break;
        case 'rising':
          annotations.push({
            type: 'trend',
            position: trend.startDate,
            label: '上昇トレンド開始',
            color: '#2ecc71',
          });
          break;
        case 'falling':
          annotations.push({
            type: 'trend',
            position: trend.startDate,
            label: '下降トレンド開始',
            color: '#e67e22',
          });
          break;
        case 'emerging':
          annotations.push({
            type: 'event',
            position: trend.startDate,
            label: '新興トレンド検出',
            color: '#9b59b6',
          });
          break;
        case 'seasonal':
          annotations.push({
            type: 'event',
            position: trend.startDate,
            label: '季節性パターン',
            color: '#3498db',
          });
          break;
      }
    }

    return annotations;
  }

  /**
   * トピック比較用のマルチラインチャートを生成
   */
  generateComparisonChart(comparison: TopicComparison): LineChartData {
    const labels: string[] = [];

    // 全トピックの日付を統合
    for (const topicData of comparison.topics) {
      for (const ts of topicData.data) {
        const label = this.formatDate(ts.timestamp);
        if (!labels.includes(label)) {
          labels.push(label);
        }
      }
    }

    labels.sort();

    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
    const datasets: LineChartData['datasets'] = comparison.topics.map((topicData, index) => {
      const data: (number | null)[] = labels.map((label) => {
        const ts = topicData.data.find((d) => this.formatDate(d.timestamp) === label);
        return ts?.normalizedScore ?? null;
      });

      return {
        label: topicData.topic,
        data,
        color: colors[index % colors.length] ?? '#3498db',
        type: 'line' as const,
      };
    });

    return { labels, datasets };
  }

  /**
   * 相関マトリクスを生成
   */
  generateCorrelationMatrix(comparison: TopicComparison): HeatmapData {
    const topics = comparison.topics.map((t) => t.topic);
    const matrix: number[][] = [];

    for (let i = 0; i < topics.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < topics.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const topicI = comparison.topics[i];
          const topicJ = comparison.topics[j];
          if (!topicI || !topicJ) {
            row.push(0);
          } else {
            const correlation = this.calculateCorrelation(
              topicI.data.map((d) => d.normalizedScore),
              topicJ.data.map((d) => d.normalizedScore)
            );
            row.push(correlation);
          }
        }
      }
      matrix.push(row);
    }

    return {
      xLabels: topics,
      yLabels: topics,
      values: matrix,
      maxValue: 1,
    };
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
   * 日付をフォーマット
   */
  private formatDate(date: Date): string {
    const result = date.toISOString().split('T')[0];
    return result ?? '';
  }

  /**
   * ソースラベルをフォーマット
   */
  private formatSourceLabel(source: TrendSource): string {
    const labels: Record<TrendSource, string> = {
      news: 'ニュース',
      web: 'Web',
      rss: 'RSS',
      academic: '学術',
      social: 'ソーシャル',
    };
    return labels[source] || source;
  }
}
