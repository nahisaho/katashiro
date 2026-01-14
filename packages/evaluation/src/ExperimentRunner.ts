/**
 * Experiment Runner
 *
 * @requirement REQ-EVAL-005
 * @design DES-KATASHIRO-003-EVAL §3.5
 */

import type {
  ExperimentConfig,
  ExperimentResult,
  ExperimentSummary,
  ExperimentDetailResult,
  Evaluator,
  EvaluationInput,
} from './types.js';
import { getDatasetManager } from './DatasetManager.js';
import { getEvaluatorRegistry } from './evaluators/CompositeEvaluator.js';

/**
 * 実験ランナー設定
 */
export interface ExperimentRunnerConfig {
  /** 並列実行数 */
  concurrency?: number;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 進捗コールバック */
  onProgress?: (current: number, total: number) => void;
}

/**
 * 実験ランナー
 */
export class ExperimentRunner {
  private config: Required<ExperimentRunnerConfig>;
  private experiments: Map<string, ExperimentResult> = new Map();

  constructor(config?: ExperimentRunnerConfig) {
    this.config = {
      concurrency: config?.concurrency ?? 5,
      timeout: config?.timeout ?? 30000,
      onProgress: config?.onProgress ?? (() => {}),
    };
  }

  /**
   * 実験実行
   */
  async run(
    experimentConfig: ExperimentConfig,
    generator: (input: string) => Promise<string>
  ): Promise<ExperimentResult> {
    const startTime = Date.now();
    const experimentId = `exp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // データセット取得
    const datasetMgr = getDatasetManager();
    const items = datasetMgr.getItems(experimentConfig.datasetId);

    if (items.length === 0) {
      throw new Error(`Dataset ${experimentConfig.datasetId} is empty or not found`);
    }

    // 評価器取得
    const registry = getEvaluatorRegistry();
    const evaluators: Evaluator[] = [];
    for (const name of experimentConfig.evaluators) {
      const evaluator = registry.get(name);
      if (evaluator) {
        evaluators.push(evaluator);
      }
    }

    if (evaluators.length === 0) {
      throw new Error('No evaluators found');
    }

    // 実験実行
    const details: ExperimentDetailResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      this.config.onProgress(i + 1, items.length);

      try {
        // 出力生成
        const output = await Promise.race([
          generator(item.input),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Generation timeout')),
              this.config.timeout
            )
          ),
        ]);

        // 評価実行
        const evalInput: EvaluationInput = {
          input: item.input,
          output,
          expected: item.expected,
          context: item.metadata,
        };

        const evaluations = await Promise.all(
          evaluators.map((e) => e.evaluate(evalInput))
        );

        details.push({
          itemId: item.id,
          input: item.input,
          output,
          expected: item.expected,
          evaluations,
          success: true,
        });

        successCount++;
      } catch (error) {
        details.push({
          itemId: item.id,
          input: item.input,
          output: '',
          expected: item.expected,
          evaluations: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        errorCount++;
      }
    }

    // サマリー計算
    const summary = this.calculateSummary(details, evaluators);

    const result: ExperimentResult = {
      id: experimentId,
      name: experimentConfig.name,
      timestamp: new Date().toISOString(),
      datasetId: experimentConfig.datasetId,
      summary,
      details,
      durationMs: Date.now() - startTime,
      metadata: {
        tags: experimentConfig.tags,
      },
    };

    this.experiments.set(experimentId, result);

    return result;
  }

  /**
   * 実験結果取得
   */
  getResult(experimentId: string): ExperimentResult | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * 全実験結果取得
   */
  listResults(): ExperimentResult[] {
    return Array.from(this.experiments.values());
  }

  /**
   * サマリー計算
   */
  private calculateSummary(
    details: ExperimentDetailResult[],
    evaluators: Evaluator[]
  ): ExperimentSummary {
    const successDetails = details.filter((d) => d.success);
    const averageScores: Record<string, number> = {};
    const stdDevs: Record<string, number> = {};

    for (const evaluator of evaluators) {
      const scores = successDetails
        .map((d) => d.evaluations.find((e) => e.evaluator === evaluator.name))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map((e) => e.normalizedScore);

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        averageScores[evaluator.name] = avg;

        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
          scores.length;
        stdDevs[evaluator.name] = Math.sqrt(variance);
      }
    }

    const overallScore =
      Object.keys(averageScores).length > 0
        ? Object.values(averageScores).reduce((a, b) => a + b, 0) /
          Object.keys(averageScores).length
        : 0;

    return {
      averageScores,
      stdDevs,
      overallScore,
      totalItems: details.length,
      successCount: successDetails.length,
      errorCount: details.length - successDetails.length,
    };
  }
}

// シングルトン
let experimentRunner: ExperimentRunner | null = null;

/**
 * グローバル実験ランナー取得
 */
export function getExperimentRunner(): ExperimentRunner {
  if (!experimentRunner) {
    experimentRunner = new ExperimentRunner();
  }
  return experimentRunner;
}

/**
 * 実験ランナーリセット（テスト用）
 */
export function resetExperimentRunner(): void {
  experimentRunner = null;
}
