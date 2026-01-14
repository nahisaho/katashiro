/**
 * Composite Evaluator
 *
 * @requirement REQ-EVAL-002
 * @design DES-KATASHIRO-003-EVAL §3.2
 */

import type { Evaluator, EvaluationInput, EvaluationResult } from '../types.js';

/**
 * 複合評価器設定
 */
export interface CompositeEvaluatorConfig {
  /** 評価器名 */
  name?: string;
  /** 評価器リスト */
  evaluators: Array<{
    evaluator: Evaluator;
    weight?: number;
  }>;
  /** 集約方法 */
  aggregation?: 'weighted' | 'min' | 'max' | 'average';
}

/**
 * 複合評価器
 */
export class CompositeEvaluator implements Evaluator {
  readonly name: string;
  private evaluators: Array<{ evaluator: Evaluator; weight: number }>;
  private aggregation: CompositeEvaluatorConfig['aggregation'];

  constructor(config: CompositeEvaluatorConfig) {
    this.name = config.name ?? 'composite';
    this.evaluators = config.evaluators.map((e) => ({
      evaluator: e.evaluator,
      weight: e.weight ?? 1,
    }));
    this.aggregation = config.aggregation ?? 'weighted';
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const results = await Promise.all(
      this.evaluators.map((e) => e.evaluator.evaluate(input))
    );

    const scores: Array<{ score: number; weight: number }> = results.map((r, i) => ({
      score: r.normalizedScore,
      weight: this.evaluators[i]?.weight ?? 1,
    }));

    let aggregatedScore: number;
    switch (this.aggregation) {
      case 'min':
        aggregatedScore = Math.min(...scores.map((s: { score: number }) => s.score));
        break;
      case 'max':
        aggregatedScore = Math.max(...scores.map((s: { score: number }) => s.score));
        break;
      case 'average':
        aggregatedScore =
          scores.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / scores.length;
        break;
      case 'weighted':
      default: {
        const totalWeight = scores.reduce((sum: number, s: { weight: number }) => sum + s.weight, 0);
        aggregatedScore =
          totalWeight > 0
            ? scores.reduce((sum: number, s: { score: number; weight: number }) => sum + s.score * s.weight, 0) / totalWeight
            : 0;
      }
    }

    const reasoning = results
      .map((r: EvaluationResult) => `${r.evaluator}: ${r.score.toFixed(2)} (${r.reasoning})`)
      .join('; ');

    return {
      evaluator: this.name,
      score: aggregatedScore,
      normalizedScore: aggregatedScore,
      reasoning: `複合評価 [${this.aggregation}]: ${reasoning}`,
      passed: aggregatedScore >= 0.5,
      metadata: {
        componentResults: results,
        componentScores: results.map((r: EvaluationResult, i: number) => ({
          evaluator: this.evaluators[i]?.evaluator.name ?? 'unknown',
          score: r.normalizedScore,
        })),
        aggregation: this.aggregation,
      },
    };
  }
}

/**
 * 評価器レジストリ
 */
export class EvaluatorRegistry {
  private evaluators: Map<string, Evaluator> = new Map();

  /**
   * 評価器登録
   */
  register(name: string, evaluator: Evaluator): void {
    this.evaluators.set(name, evaluator);
  }

  /**
   * 評価器取得
   */
  get(name: string): Evaluator | undefined {
    return this.evaluators.get(name);
  }

  /**
   * 評価器削除
   */
  unregister(name: string): boolean {
    return this.evaluators.delete(name);
  }

  /**
   * 全評価器取得
   */
  getAll(): Evaluator[] {
    return Array.from(this.evaluators.values());
  }

  /**
   * 評価器名一覧
   */
  list(): string[] {
    return Array.from(this.evaluators.keys());
  }
}

// シングルトンレジストリ
let evaluatorRegistry: EvaluatorRegistry | null = null;

/**
 * グローバル評価器レジストリ取得
 */
export function getEvaluatorRegistry(): EvaluatorRegistry {
  if (!evaluatorRegistry) {
    evaluatorRegistry = new EvaluatorRegistry();
  }
  return evaluatorRegistry;
}

/**
 * 評価器レジストリリセット（テスト用）
 */
export function resetEvaluatorRegistry(): void {
  evaluatorRegistry = null;
}
