/**
 * ConvergenceDetector - リサーチの収束を検出
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

/**
 * リサーチの収束を検出するクラス
 *
 * @example
 * ```typescript
 * const detector = new ConvergenceDetector();
 *
 * const previousRates = [0.8, 0.5, 0.3];
 * const currentRate = 0.1;
 *
 * const score = detector.calculate(previousRates, currentRate);
 * console.log(`Convergence: ${(score * 100).toFixed(1)}%`);
 *
 * if (detector.hasConverged(previousRates, currentRate, 0.15)) {
 *   console.log('Research has converged');
 * }
 * ```
 */
export class ConvergenceDetector {
  /**
   * 収束スコアを計算 (0-1)
   * 1に近いほど収束している
   */
  calculate(previousRates: number[], currentRate: number): number {
    if (previousRates.length === 0) {
      return 0; // 最初のイテレーションは収束していない
    }

    // 直近3回の新規情報率の平均
    const recentRates = [...previousRates.slice(-2), currentRate];
    const avgRate = recentRates.reduce((sum, r) => sum + r, 0) / recentRates.length;

    // 新規情報率が低いほど収束スコアが高い
    const convergenceFromRate = 1 - avgRate;

    // トレンドも考慮（減少傾向なら収束に近い）
    let trendScore = 0.5;
    if (previousRates.length >= 2) {
      const prevAvg = previousRates.slice(-2).reduce((sum, r) => sum + r, 0) / 2;
      if (currentRate < prevAvg) {
        trendScore = 0.7; // 減少傾向
      } else if (currentRate > prevAvg) {
        trendScore = 0.3; // 増加傾向
      }
    }

    // 加重平均
    return convergenceFromRate * 0.7 + trendScore * 0.3;
  }

  /**
   * 収束したかどうかを判定
   */
  hasConverged(
    previousRates: number[],
    currentRate: number,
    threshold: number
  ): boolean {
    const score = this.calculate(previousRates, currentRate);
    return score >= 1 - threshold;
  }
}
