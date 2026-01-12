/**
 * ForecastEngine - 予測エンジン
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import type { TimeSeriesData, ForecastData, ForecastConfig } from './types.js';

/**
 * 時系列データから将来の値を予測するクラス
 *
 * @example
 * ```typescript
 * const forecaster = new ForecastEngine();
 *
 * const forecast = forecaster.forecast(timeSeriesData, {
 *   periods: 7,
 *   method: 'linear',
 *   confidenceLevel: 0.95,
 * });
 * ```
 */
export class ForecastEngine {
  /**
   * 時系列データから将来の値を予測
   */
  forecast(data: TimeSeriesData[], config?: Partial<ForecastConfig>): ForecastData {
    const periods = config?.periods ?? 7;
    const method = config?.method ?? 'linear';
    const confidenceLevel = config?.confidenceLevel ?? 0.95;

    if (data.length < 2) {
      return this.createEmptyForecast(periods);
    }

    const volumes = data.map((d) => d.volume);

    switch (method) {
      case 'linear':
        return this.linearForecast(data, volumes, periods, confidenceLevel);
      case 'exponential':
        return this.exponentialForecast(data, volumes, periods, confidenceLevel);
      case 'movingAverage':
        return this.movingAverageForecast(data, volumes, periods, confidenceLevel);
      default:
        return this.linearForecast(data, volumes, periods, confidenceLevel);
    }
  }

  /**
   * 線形回帰による予測
   */
  private linearForecast(
    data: TimeSeriesData[],
    volumes: number[],
    periods: number,
    confidenceLevel: number
  ): ForecastData {
    const n = volumes.length;

    // 線形回帰パラメータを計算
    const { slope, intercept, stdError } = this.calculateLinearParams(volumes);

    // 時間間隔を推定（最後の2点から）
    const lastItem = data[data.length - 1];
    const prevItem = data.length > 1 ? data[data.length - 2] : lastItem;
    const lastDate = lastItem?.timestamp ?? new Date();
    const prevDate = prevItem?.timestamp ?? lastDate;
    const intervalMs = lastDate.getTime() - prevDate.getTime();

    // 予測値を計算
    const predictions: Array<{ date: Date; value: number }> = [];
    const upperBound: number[] = [];
    const lowerBound: number[] = [];

    const zScore = this.getZScore(confidenceLevel);

    for (let i = 1; i <= periods; i++) {
      const x = n + i - 1;
      const predictedValue = slope * x + intercept;
      const marginOfError = zScore * stdError * Math.sqrt(1 + 1 / n + Math.pow(x - (n - 1) / 2, 2) / this.sumOfSquares(n));

      predictions.push({
        date: new Date(lastDate.getTime() + intervalMs * i),
        value: Math.max(0, predictedValue),
      });
      upperBound.push(Math.max(0, predictedValue + marginOfError));
      lowerBound.push(Math.max(0, predictedValue - marginOfError));
    }

    return {
      method: 'linear',
      predictions,
      upperBound,
      lowerBound,
      confidenceLevel,
      accuracy: this.calculateModelAccuracy(volumes, slope, intercept),
    };
  }

  /**
   * 指数平滑法による予測
   */
  private exponentialForecast(
    data: TimeSeriesData[],
    volumes: number[],
    periods: number,
    confidenceLevel: number
  ): ForecastData {
    const alpha = 0.3; // 平滑化係数
    const n = volumes.length;

    // 指数平滑化された値を計算
    let smoothed = volumes[0] ?? 0;
    for (let i = 1; i < n; i++) {
      const vol = volumes[i] ?? 0;
      smoothed = alpha * vol + (1 - alpha) * smoothed;
    }

    // 標準誤差を計算
    let sse = 0;
    let prevSmoothed = volumes[0] ?? 0;
    for (let i = 1; i < n; i++) {
      const vol = volumes[i] ?? 0;
      const error = vol - prevSmoothed;
      sse += error * error;
      prevSmoothed = alpha * vol + (1 - alpha) * prevSmoothed;
    }
    const stdError = Math.sqrt(sse / (n - 1));

    // 時間間隔を推定
    const lastItem = data[data.length - 1];
    const prevItem = data.length > 1 ? data[data.length - 2] : lastItem;
    const lastDate = lastItem?.timestamp ?? new Date();
    const prevDate = prevItem?.timestamp ?? lastDate;
    const intervalMs = lastDate.getTime() - prevDate.getTime();

    // 予測値を計算（指数平滑法では全期間同じ値）
    const predictions: Array<{ date: Date; value: number }> = [];
    const upperBound: number[] = [];
    const lowerBound: number[] = [];

    const zScore = this.getZScore(confidenceLevel);

    for (let i = 1; i <= periods; i++) {
      const marginOfError = zScore * stdError * Math.sqrt(i);

      predictions.push({
        date: new Date(lastDate.getTime() + intervalMs * i),
        value: Math.max(0, smoothed),
      });
      upperBound.push(Math.max(0, smoothed + marginOfError));
      lowerBound.push(Math.max(0, smoothed - marginOfError));
    }

    return {
      method: 'exponential',
      predictions,
      upperBound,
      lowerBound,
      confidenceLevel,
      accuracy: 1 - stdError / (this.average(volumes) || 1),
    };
  }

  /**
   * 移動平均による予測
   */
  private movingAverageForecast(
    data: TimeSeriesData[],
    volumes: number[],
    periods: number,
    confidenceLevel: number
  ): ForecastData {
    const windowSize = Math.min(5, Math.floor(volumes.length / 2));

    // 移動平均を計算
    const recentValues = volumes.slice(-windowSize);
    const movingAvg = this.average(recentValues);

    // 標準偏差を計算
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, v) => sum + Math.pow(v - movingAvg, 2), 0) / windowSize
    );

    // 時間間隔を推定
    const lastItem = data[data.length - 1];
    const prevItem = data.length > 1 ? data[data.length - 2] : lastItem;
    const lastDate = lastItem?.timestamp ?? new Date();
    const prevDate = prevItem?.timestamp ?? lastDate;
    const intervalMs = lastDate.getTime() - prevDate.getTime();

    // 予測値を計算
    const predictions: Array<{ date: Date; value: number }> = [];
    const upperBound: number[] = [];
    const lowerBound: number[] = [];

    const zScore = this.getZScore(confidenceLevel);

    for (let i = 1; i <= periods; i++) {
      const marginOfError = zScore * stdDev;

      predictions.push({
        date: new Date(lastDate.getTime() + intervalMs * i),
        value: Math.max(0, movingAvg),
      });
      upperBound.push(Math.max(0, movingAvg + marginOfError));
      lowerBound.push(Math.max(0, movingAvg - marginOfError));
    }

    return {
      method: 'movingAverage',
      predictions,
      upperBound,
      lowerBound,
      confidenceLevel,
      accuracy: 1 - stdDev / (movingAvg || 1),
    };
  }

  /**
   * 線形回帰パラメータを計算
   */
  private calculateLinearParams(values: number[]): { slope: number; intercept: number; stdError: number } {
    const n = values.length;
    if (n === 0) return { slope: 0, intercept: 0, stdError: 0 };

    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum || 1);
    const intercept = (ySum - slope * xSum) / n;

    // 残差の標準誤差を計算
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      const val = values[i] ?? 0;
      sse += Math.pow(val - predicted, 2);
    }
    const stdError = Math.sqrt(sse / (n - 2 || 1));

    return { slope, intercept, stdError };
  }

  /**
   * モデルの精度を計算
   */
  private calculateModelAccuracy(values: number[], slope: number, intercept: number): number {
    const n = values.length;
    if (n === 0) return 0;

    const yMean = this.average(values);
    let ssTotal = 0;
    let ssRes = 0;

    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      const val = values[i] ?? 0;
      ssTotal += Math.pow(val - yMean, 2);
      ssRes += Math.pow(val - predicted, 2);
    }

    return ssTotal === 0 ? 0 : Math.max(0, 1 - ssRes / ssTotal);
  }

  /**
   * 信頼水準からZスコアを取得
   */
  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] ?? 1.96;
  }

  /**
   * 平均値を計算
   */
  private average(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 二乗和を計算
   */
  private sumOfSquares(n: number): number {
    let sum = 0;
    const mean = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      sum += Math.pow(i - mean, 2);
    }
    return sum || 1;
  }

  /**
   * 空の予測を作成
   */
  private createEmptyForecast(periods: number): ForecastData {
    const now = new Date();
    return {
      method: 'linear',
      predictions: Array.from({ length: periods }, (_, i) => ({
        date: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
        value: 0,
      })),
      upperBound: Array(periods).fill(0),
      lowerBound: Array(periods).fill(0),
      confidenceLevel: 0.95,
      accuracy: 0,
    };
  }
}
