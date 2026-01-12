/**
 * Pattern Quality Evaluator
 * 
 * @fileoverview パターン品質評価システム
 * @module @nahisaho/katashiro-feedback
 * @since 0.2.12
 */

import type { 
  LearnedPattern, 
  PatternQuality, 
  ObservationType 
} from './wake-sleep-types.js';

/**
 * 品質評価設定
 */
export interface QualityEvaluatorConfig {
  /** 最小頻度（これ以下は低品質） */
  readonly minFrequency: number;
  /** 理想的なホール数の範囲 */
  readonly idealHolesRange: [number, number];
  /** 鮮度減衰期間（日数） */
  readonly freshnessDecayDays: number;
  /** 各スコアの重み */
  readonly weights: {
    frequency: number;
    generality: number;
    utility: number;
    freshness: number;
  };
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: QualityEvaluatorConfig = {
  minFrequency: 2,
  idealHolesRange: [1, 5],
  freshnessDecayDays: 30,
  weights: {
    frequency: 0.25,
    generality: 0.25,
    utility: 0.30,
    freshness: 0.20,
  },
};

/**
 * Pattern Quality Evaluator
 * 
 * パターンの品質を多角的に評価：
 * - 頻度: よく使われるパターンは高品質
 * - 汎用性: 適度に抽象化されたパターンは高品質
 * - 有用性: 成功率が高いパターンは高品質
 * - 鮮度: 最近使われたパターンは高品質
 */
export class PatternQualityEvaluator {
  private config: QualityEvaluatorConfig;

  constructor(config?: Partial<QualityEvaluatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * パターンの品質を評価
   */
  evaluate(pattern: LearnedPattern): PatternQuality {
    const reasons: string[] = [];

    // 1. 頻度スコア
    const frequencyScore = this.calculateFrequencyScore(pattern);
    if (frequencyScore < 0.3) {
      reasons.push('使用頻度が低い');
    } else if (frequencyScore > 0.8) {
      reasons.push('高頻度で使用');
    }

    // 2. 汎用性スコア
    const generalityScore = this.calculateGeneralityScore(pattern);
    if (generalityScore < 0.3) {
      reasons.push('汎用性が低い（具体的すぎる/抽象的すぎる）');
    } else if (generalityScore > 0.7) {
      reasons.push('適度な汎用性');
    }

    // 3. 有用性スコア
    const utilityScore = this.calculateUtilityScore(pattern);
    if (utilityScore < 0.3) {
      reasons.push('成功率が低い');
    } else if (utilityScore > 0.7) {
      reasons.push('高い成功率');
    }

    // 4. 鮮度スコア
    const freshnessScore = this.calculateFreshnessScore(pattern);
    if (freshnessScore < 0.3) {
      reasons.push('長期間未使用');
    } else if (freshnessScore > 0.8) {
      reasons.push('最近使用');
    }

    // 重み付き総合スコア
    const { weights } = this.config;
    const score = 
      frequencyScore * weights.frequency +
      generalityScore * weights.generality +
      utilityScore * weights.utility +
      freshnessScore * weights.freshness;

    return {
      score: Math.min(1, Math.max(0, score)),
      frequencyScore,
      generalityScore,
      utilityScore,
      freshnessScore,
      reasons,
    };
  }

  /**
   * パターンリストを品質でフィルタリング
   */
  filterByQuality(
    patterns: LearnedPattern[], 
    minScore: number
  ): LearnedPattern[] {
    return patterns.filter(p => this.evaluate(p).score >= minScore);
  }

  /**
   * パターンをランキング
   */
  rankPatterns(
    patterns: LearnedPattern[]
  ): Array<{ pattern: LearnedPattern; quality: PatternQuality }> {
    return patterns
      .map(pattern => ({
        pattern,
        quality: this.evaluate(pattern),
      }))
      .sort((a, b) => b.quality.score - a.quality.score);
  }

  /**
   * 頻度スコアを計算
   * sigmoid関数で正規化（minFrequency付近で0.5）
   */
  private calculateFrequencyScore(pattern: LearnedPattern): number {
    const { minFrequency } = this.config;
    // Sigmoid: 1 / (1 + e^(-k(x - mid)))
    const k = 0.5; // 傾きパラメータ
    const mid = minFrequency * 2; // 中間点
    return 1 / (1 + Math.exp(-k * (pattern.frequency - mid)));
  }

  /**
   * 汎用性スコアを計算
   * ホール数が理想範囲内なら高スコア
   */
  private calculateGeneralityScore(pattern: LearnedPattern): number {
    const [minHoles, maxHoles] = this.config.idealHolesRange;
    const holes = pattern.holes;

    // 理想範囲内
    if (holes >= minHoles && holes <= maxHoles) {
      return 1.0;
    }

    // 範囲外の場合、距離に応じて減点
    if (holes < minHoles) {
      // 具体的すぎる
      return Math.max(0, 1 - (minHoles - holes) * 0.2);
    } else {
      // 抽象的すぎる
      return Math.max(0, 1 - (holes - maxHoles) * 0.15);
    }
  }

  /**
   * 有用性スコアを計算
   * quality属性を直接使用
   */
  private calculateUtilityScore(pattern: LearnedPattern): number {
    return pattern.quality;
  }

  /**
   * 鮮度スコアを計算
   * 最終使用日からの経過日数に応じて減衰
   */
  private calculateFreshnessScore(pattern: LearnedPattern): number {
    const lastUsed = new Date(pattern.lastUsedAt).getTime();
    const now = Date.now();
    const daysSinceUse = (now - lastUsed) / (1000 * 60 * 60 * 24);

    // 指数減衰: e^(-t/τ)
    const tau = this.config.freshnessDecayDays;
    return Math.exp(-daysSinceUse / tau);
  }

  /**
   * タイプ別の推奨品質閾値を取得
   */
  getRecommendedThreshold(type: ObservationType): number {
    // タイプによって異なる閾値を推奨
    const thresholds: Record<ObservationType, number> = {
      'search_query': 0.25,      // 検索クエリは多様性が重要
      'analysis_result': 0.35,   // 分析は精度重視
      'report_generation': 0.40, // レポートは品質重視
      'user_feedback': 0.30,     // フィードバックは中程度
      'entity_extraction': 0.35, // エンティティは精度重視
      'summary_creation': 0.35,  // 要約は品質重視
      'citation_format': 0.40,   // 引用は正確性重視
    };
    return thresholds[type] ?? 0.3;
  }
}
