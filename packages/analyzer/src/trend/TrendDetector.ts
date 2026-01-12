/**
 * TrendDetector - トレンド検出エンジン
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import type {
  TimeSeriesData,
  DetectedTrend,
  TrendType,
  TrendDetectorConfig,
  TrendSummary,
} from './types.js';

/**
 * 時系列データからトレンドを検出するクラス
 *
 * @example
 * ```typescript
 * const detector = new TrendDetector();
 *
 * const trends = detector.detect(timeSeriesData, {
 *   sensitivityThreshold: 0.1,
 *   minDataPoints: 3,
 *   detectSeasonality: true,
 * });
 * ```
 */
export class TrendDetector {
  private config: Required<TrendDetectorConfig>;

  constructor(config?: Partial<TrendDetectorConfig>) {
    this.config = {
      sensitivityThreshold: config?.sensitivityThreshold ?? 0.1,
      minDataPoints: config?.minDataPoints ?? 3,
      detectSeasonality: config?.detectSeasonality ?? true,
    };
  }

  /**
   * 時系列データからトレンドを検出
   */
  detect(data: TimeSeriesData[]): DetectedTrend[] {
    if (data.length < this.config.minDataPoints) {
      return [];
    }

    const trends: DetectedTrend[] = [];

    // 全体的なトレンドを検出
    const overallTrend = this.detectOverallTrend(data);
    if (overallTrend) {
      trends.push(overallTrend);
    }

    // スパイク（急上昇）を検出
    const spikes = this.detectSpikes(data);
    trends.push(...spikes);

    // 季節性を検出（有効な場合）
    if (this.config.detectSeasonality && data.length >= 12) {
      const seasonalTrend = this.detectSeasonality(data);
      if (seasonalTrend) {
        trends.push(seasonalTrend);
      }
    }

    // 新興トレンドを検出
    const emergingTrend = this.detectEmerging(data);
    if (emergingTrend) {
      trends.push(emergingTrend);
    }

    // 信頼度でソート
    trends.sort((a, b) => b.confidence - a.confidence);

    return trends;
  }

  /**
   * トレンドサマリーを生成
   */
  generateSummary(data: TimeSeriesData[], trends: DetectedTrend[]): TrendSummary {
    const volumes = data.map((d) => d.volume);
    const currentVolume = volumes[volumes.length - 1] ?? 0;
    const previousVolume = volumes.length > 1 ? (volumes[volumes.length - 2] ?? currentVolume) : currentVolume;

    // 成長率を計算
    const growthRate = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;

    // ピークを検出
    const peakIndex = volumes.indexOf(Math.max(...volumes));
    const peakPeriod = data[peakIndex]?.timestamp ?? new Date();
    const peakVolume = volumes[peakIndex] ?? 0;

    // 主要トレンドを特定
    const dominantTrend = trends.length > 0 ? trends[0] : null;

    // ナラティブを生成
    const narrative = this.generateNarrative(data, trends, growthRate);

    return {
      dominantTrend: dominantTrend?.type ?? 'plateau',
      confidence: dominantTrend?.confidence ?? 0.5,
      growthRate,
      peakPeriod,
      peakVolume,
      narrative,
      keyInsights: this.generateKeyInsights(data, trends),
    };
  }

  /**
   * 全体的なトレンドを検出
   */
  private detectOverallTrend(data: TimeSeriesData[]): DetectedTrend | null {
    if (data.length < 2) return null;

    const firstData = data[0];
    const lastData = data[data.length - 1];
    if (!firstData || !lastData) return null;

    const volumes = data.map((d) => d.volume);
    const { slope, r2 } = this.linearRegression(volumes);

    // R²が十分高い場合のみトレンドとして認識
    if (r2 < 0.3) {
      return {
        type: 'plateau',
        startDate: firstData.timestamp,
        endDate: lastData.timestamp,
        confidence: 0.5,
        magnitude: 0,
        description: 'トレンドに明確な方向性がありません',
      };
    }

    const magnitude = slope * data.length;
    const type: TrendType = slope > this.config.sensitivityThreshold ? 'rising' : slope < -this.config.sensitivityThreshold ? 'falling' : 'plateau';

    const descriptions: Record<TrendType, string> = {
      rising: `上昇トレンド: 期間中に${Math.abs(magnitude).toFixed(1)}%の増加`,
      falling: `下降トレンド: 期間中に${Math.abs(magnitude).toFixed(1)}%の減少`,
      plateau: '横ばいトレンド: 大きな変化なし',
      spike: 'スパイク検出',
      seasonal: '季節性パターン',
      cyclical: '周期的パターン',
      emerging: '新興トレンド',
    };

    return {
      type,
      startDate: firstData.timestamp,
      endDate: lastData.timestamp,
      confidence: r2,
      magnitude,
      description: descriptions[type],
    };
  }

  /**
   * スパイク（急上昇）を検出
   */
  private detectSpikes(data: TimeSeriesData[]): DetectedTrend[] {
    if (data.length < 3) return [];

    const volumes = data.map((d) => d.volume);
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const stdDev = Math.sqrt(volumes.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / volumes.length);

    const spikes: DetectedTrend[] = [];
    const threshold = mean + 2 * stdDev; // 2σ以上をスパイクとする

    for (let i = 0; i < data.length; i++) {
      const vol = volumes[i] ?? 0;
      const currentData = data[i];
      if (!currentData || vol <= threshold) continue;

      const prevData = data[Math.max(0, i - 1)];
      const nextData = data[Math.min(data.length - 1, i + 1)];
      if (!prevData || !nextData) continue;

      spikes.push({
        type: 'spike',
        startDate: prevData.timestamp,
        endDate: nextData.timestamp,
        confidence: Math.min((vol - mean) / (3 * stdDev), 1),
        magnitude: ((vol - mean) / mean) * 100,
        description: `${currentData.timestamp.toISOString().split('T')[0]}にスパイクを検出（平均の${(vol / mean).toFixed(1)}倍）`,
      });
    }

    return spikes;
  }

  /**
   * 季節性を検出
   */
  private detectSeasonality(data: TimeSeriesData[]): DetectedTrend | null {
    // 簡易的な季節性検出: 自己相関を計算
    const volumes = data.map((d) => d.volume);
    const lags = [7, 12, 30]; // 週次、月次、四半期

    const firstData = data[0];
    const lastData = data[data.length - 1];
    if (!firstData || !lastData) return null;

    for (const lag of lags) {
      if (data.length >= lag * 2) {
        const correlation = this.autocorrelation(volumes, lag);
        if (correlation > 0.5) {
          return {
            type: 'seasonal',
            startDate: firstData.timestamp,
            endDate: lastData.timestamp,
            confidence: correlation,
            magnitude: 0,
            description: `周期${lag}の季節性パターンを検出（相関係数: ${correlation.toFixed(2)}）`,
          };
        }
      }
    }

    return null;
  }

  /**
   * 新興トレンドを検出
   */
  private detectEmerging(data: TimeSeriesData[]): DetectedTrend | null {
    if (data.length < 5) return null;

    // 直近のデータに限定して分析
    const recentData = data.slice(-5);
    const volumes = recentData.map((d) => d.volume);

    const firstRecent = recentData[0];
    const lastRecent = recentData[recentData.length - 1];
    if (!firstRecent || !lastRecent) return null;

    // 直近の成長率を計算
    const { slope } = this.linearRegression(volumes);

    // 急激な上昇があり、かつボリュームがまだ低い場合に新興トレンドと判定
    const meanVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const overallMean = data.map((d) => d.volume).reduce((a, b) => a + b, 0) / data.length;

    if (slope > 0.2 && meanVolume < overallMean * 0.5) {
      return {
        type: 'emerging',
        startDate: firstRecent.timestamp,
        endDate: lastRecent.timestamp,
        confidence: Math.min(slope, 1),
        magnitude: slope * 100,
        description: '新興トレンドを検出: 低いベースラインから急速に成長中',
      };
    }

    return null;
  }

  /**
   * 線形回帰を計算
   */
  private linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

    const xSum = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    // R²を計算
    const yMean = ySum / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = values.reduce((sum, y, x) => sum + Math.pow(y - (slope * x + intercept), 2), 0);
    const r2 = ssTotal === 0 ? 0 : 1 - ssRes / ssTotal;

    return { slope, intercept, r2 };
  }

  /**
   * 自己相関を計算
   */
  private autocorrelation(values: number[], lag: number): number {
    const n = values.length;
    if (n <= lag) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      const valI = values[i] ?? 0;
      const valLag = values[i + lag] ?? 0;
      numerator += (valI - mean) * (valLag - mean);
    }

    for (let i = 0; i < n; i++) {
      const val = values[i] ?? 0;
      denominator += Math.pow(val - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * ナラティブを生成
   */
  private generateNarrative(data: TimeSeriesData[], trends: DetectedTrend[], growthRate: number): string {
    const parts: string[] = [];

    if (data.length === 0) {
      return '分析対象のデータがありません。';
    }

    const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
    parts.push(`期間中に${totalVolume}件の関連データを収集しました。`);

    if (Math.abs(growthRate) > 10) {
      if (growthRate > 0) {
        parts.push(`直近の期間で${growthRate.toFixed(1)}%の成長が見られます。`);
      } else {
        parts.push(`直近の期間で${Math.abs(growthRate).toFixed(1)}%の減少が見られます。`);
      }
    }

    const dominantTrend = trends.find((t) => t.type !== 'spike');
    if (dominantTrend) {
      parts.push(dominantTrend.description);
    }

    const spikes = trends.filter((t) => t.type === 'spike');
    if (spikes.length > 0) {
      parts.push(`${spikes.length}件の注目すべきスパイクが検出されました。`);
    }

    return parts.join(' ');
  }

  /**
   * キーインサイトを生成
   */
  private generateKeyInsights(data: TimeSeriesData[], trends: DetectedTrend[]): string[] {
    const insights: string[] = [];

    // 最大ボリュームの期間
    if (data.length > 0) {
      let maxData = data[0];
      for (const d of data) {
        if (maxData && d.volume > maxData.volume) {
          maxData = d;
        }
      }
      if (maxData) {
        const dateStr = maxData.timestamp.toISOString().split('T')[0] ?? 'N/A';
        insights.push(`最も活発な期間: ${dateStr}`);
      }
    }

    // トレンドに基づくインサイト
    const risingTrends = trends.filter((t) => t.type === 'rising');
    if (risingTrends.length > 0) {
      insights.push('上昇トレンドが検出されました - 関心が高まっています');
    }

    const emergingTrends = trends.filter((t) => t.type === 'emerging');
    if (emergingTrends.length > 0) {
      insights.push('新興トレンドを検出 - 今後の成長が期待されます');
    }

    const seasonalTrends = trends.filter((t) => t.type === 'seasonal');
    if (seasonalTrends.length > 0) {
      insights.push('季節性パターンが見られます');
    }

    return insights;
  }
}
