/**
 * PipelineOrchestrator
 * 収集→分析→生成パイプラインオーケストレータ
 *
 * @module workflow/pipeline-orchestrator
 */

import {
  PipelineConfig,
  PipelineStage,
  PipelineResult,
  CollectStageConfig,
  AnalyzeStageConfig,
  GenerateStageConfig,
  ValidateStageConfig,
  ExportStageConfig,
} from './types.js';
import { QualityGate } from './quality-gate.js';
import { StyleGuideEnforcer } from './style-guide-enforcer.js';

/**
 * ステージ結果
 */
interface StageResult {
  stage: PipelineStage;
  success: boolean;
  output?: unknown;
  error?: Error;
  durationMs: number;
}

/**
 * パイプラインオーケストレータ
 * 収集→分析→生成→検証→エクスポートのパイプラインを管理
 */
export class PipelineOrchestrator {
  private config: PipelineConfig | null = null;
  private qualityGate: QualityGate;
  private styleEnforcer: StyleGuideEnforcer;
  private stageHandlers: Map<PipelineStage, (config: unknown, input: unknown) => Promise<unknown>>;
  private onProgress?: (stage: PipelineStage, progress: number, message: string) => void;

  constructor() {
    this.qualityGate = new QualityGate();
    this.styleEnforcer = new StyleGuideEnforcer();
    this.stageHandlers = new Map();

    // デフォルトハンドラを登録
    this.registerDefaultHandlers();
  }

  /**
   * デフォルトのステージハンドラを登録
   */
  private registerDefaultHandlers(): void {
    // 収集ステージ
    this.stageHandlers.set('collect', async (config: unknown, _input: unknown) => {
      const collectConfig = config as CollectStageConfig;
      const results: Array<{ type: string; data: unknown }> = [];

      for (const source of collectConfig.sources) {
        // 実際の収集は外部から注入されたコレクターに委譲
        results.push({
          type: source.type,
          data: { config: source.config, collected: true },
        });
      }

      return {
        sources: results,
        totalSources: results.length,
      };
    });

    // 分析ステージ
    this.stageHandlers.set('analyze', async (config: unknown, input: unknown) => {
      const analyzeConfig = config as AnalyzeStageConfig;
      const analysisResults: Record<string, unknown> = {};

      for (const analyzer of analyzeConfig.analyzers) {
        // 実際の分析は外部から注入されたアナライザーに委譲
        analysisResults[analyzer] = {
          type: analyzer,
          analyzed: true,
          input: typeof input === 'object' ? 'object' : typeof input,
        };
      }

      return {
        analyses: analysisResults,
        analyzersUsed: analyzeConfig.analyzers,
      };
    });

    // 生成ステージ
    this.stageHandlers.set('generate', async (config: unknown, input: unknown) => {
      const generateConfig = config as GenerateStageConfig;

      // 実際の生成は外部から注入されたジェネレーターに委譲
      return {
        outputType: generateConfig.outputType,
        template: generateConfig.template,
        content: `Generated ${generateConfig.outputType} content`,
        input: typeof input === 'object' ? 'object' : typeof input,
      };
    });

    // 検証ステージ
    this.stageHandlers.set('validate', async (config: unknown, input: unknown) => {
      const validateConfig = config as ValidateStageConfig;
      const results: Record<string, unknown> = {};

      const content = this.extractContent(input);

      if (validateConfig.qualityGate) {
        results.qualityGate = await this.qualityGate.evaluate(content);
      }

      if (validateConfig.styleCheck) {
        results.styleCheck = this.styleEnforcer.validate(content);
      }

      if (validateConfig.customValidators) {
        const customResults: boolean[] = [];
        for (const validator of validateConfig.customValidators) {
          customResults.push(await validator(content));
        }
        results.customValidations = customResults;
      }

      return {
        validations: results,
        passed: this.checkValidationsPassed(results),
      };
    });

    // エクスポートステージ
    this.stageHandlers.set('export', async (config: unknown, input: unknown) => {
      const exportConfig = config as ExportStageConfig;
      const exports: Array<{ format: string; success: boolean }> = [];

      const content = this.extractContent(input);

      for (const format of exportConfig.formats) {
        // 実際のエクスポートは外部から注入されたエクスポーターに委譲
        exports.push({
          format,
          success: true,
        });
      }

      return {
        exports,
        destination: exportConfig.destination,
        content: content.substring(0, 100) + '...',
      };
    });
  }

  /**
   * 入力からコンテンツを抽出
   */
  private extractContent(input: unknown): string {
    if (typeof input === 'string') {
      return input;
    }
    if (typeof input === 'object' && input !== null) {
      const obj = input as Record<string, unknown>;
      if ('content' in obj && typeof obj.content === 'string') {
        return obj.content;
      }
      if ('text' in obj && typeof obj.text === 'string') {
        return obj.text;
      }
      return JSON.stringify(input);
    }
    return String(input);
  }

  /**
   * 検証結果が合格かチェック
   */
  private checkValidationsPassed(results: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(results)) {
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if ('passed' in obj && obj.passed === false) {
          return false;
        }
      }
      if (key === 'customValidations' && Array.isArray(value)) {
        if (value.some((v) => v === false)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * パイプライン設定をロード
   */
  loadConfig(config: PipelineConfig): void {
    this.config = config;
  }

  /**
   * ステージハンドラを設定
   */
  setStageHandler(
    stage: PipelineStage,
    handler: (config: unknown, input: unknown) => Promise<unknown>
  ): void {
    this.stageHandlers.set(stage, handler);
  }

  /**
   * 進捗コールバックを設定
   */
  setProgressCallback(
    callback: (stage: PipelineStage, progress: number, message: string) => void
  ): void {
    this.onProgress = callback;
  }

  /**
   * パイプラインを実行
   */
  async execute(input?: unknown): Promise<PipelineResult> {
    if (!this.config) {
      throw new Error('No pipeline config loaded');
    }

    const startTime = Date.now();
    const stageResults = new Map<PipelineStage, unknown>();
    const errors: Array<{ stage: PipelineStage; error: Error }> = [];
    let currentInput = input;
    let lastSuccessfulOutput: unknown = undefined;
    let stoppedOnError = false;

    const stages: PipelineStage[] = ['collect', 'analyze', 'generate', 'validate', 'export'];
    const configuredStages = stages.filter(
      (stage) => this.config!.stages[stage as keyof typeof this.config.stages]
    );

    for (let i = 0; i < configuredStages.length; i++) {
      const stage = configuredStages[i]!;
      const stageConfig = this.config.stages[stage as keyof typeof this.config.stages];

      this.onProgress?.(stage, i / configuredStages.length, `Starting ${stage} stage`);

      try {
        const result = await this.executeStage(stage, stageConfig!, currentInput);

        if (result.success) {
          stageResults.set(stage, result.output);
          lastSuccessfulOutput = result.output;
          currentInput = result.output;
        } else {
          errors.push({ stage, error: result.error! });

          if (this.config.errorHandling === 'stop') {
            stoppedOnError = true;
            break;
          } else if (this.config.errorHandling === 'retry') {
            // リトライロジック
            const retryResult = await this.executeStage(stage, stageConfig!, currentInput);
            if (retryResult.success) {
              stageResults.set(stage, retryResult.output);
              lastSuccessfulOutput = retryResult.output;
              currentInput = retryResult.output;
            } else if (this.config.errorHandling === 'retry') {
              // リトライ後も失敗した場合は停止
              stoppedOnError = true;
              break;
            }
          }
          // skip or continue: 次のステージへ
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ stage, error: err });

        if (this.config.errorHandling === 'stop') {
          stoppedOnError = true;
          break;
        }
      }

      this.onProgress?.(stage, (i + 1) / configuredStages.length, `Completed ${stage} stage`);
    }

    const durationMs = Date.now() - startTime;
    const status: PipelineResult['status'] =
      errors.length === 0
        ? 'completed'
        : stoppedOnError
          ? 'failed'
          : errors.length < configuredStages.length
            ? 'partial'
          : 'failed';

    return {
      pipelineName: this.config.name,
      status,
      stageResults,
      output: lastSuccessfulOutput,
      durationMs,
      errors,
    };
  }

  /**
   * 単一ステージを実行
   */
  private async executeStage(
    stage: PipelineStage,
    config: unknown,
    input: unknown
  ): Promise<StageResult> {
    const handler = this.stageHandlers.get(stage);
    if (!handler) {
      return {
        stage,
        success: false,
        error: new Error(`No handler for stage: ${stage}`),
        durationMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      const output = await handler(config, input);
      return {
        stage,
        success: true,
        output,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stage,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 特定のステージのみ実行
   */
  async executeStage2(stage: PipelineStage, input: unknown): Promise<unknown> {
    if (!this.config) {
      throw new Error('No pipeline config loaded');
    }

    const stageConfig = this.config.stages[stage as keyof typeof this.config.stages];
    if (!stageConfig) {
      throw new Error(`Stage ${stage} is not configured`);
    }

    const result = await this.executeStage(stage, stageConfig, input);
    if (!result.success) {
      throw result.error;
    }

    return result.output;
  }

  /**
   * QualityGateを取得
   */
  getQualityGate(): QualityGate {
    return this.qualityGate;
  }

  /**
   * StyleGuideEnforcerを取得
   */
  getStyleEnforcer(): StyleGuideEnforcer {
    return this.styleEnforcer;
  }

  /**
   * 設定を取得
   */
  getConfig(): PipelineConfig | null {
    return this.config;
  }
}

/**
 * パイプライン設定を作成するビルダー
 */
export class PipelineConfigBuilder {
  private config: PipelineConfig;

  constructor(name: string) {
    this.config = {
      name,
      stages: {},
    };
  }

  /**
   * 収集ステージを追加
   */
  addCollectStage(config: CollectStageConfig): this {
    this.config.stages.collect = config;
    return this;
  }

  /**
   * 分析ステージを追加
   */
  addAnalyzeStage(config: AnalyzeStageConfig): this {
    this.config.stages.analyze = config;
    return this;
  }

  /**
   * 生成ステージを追加
   */
  addGenerateStage(config: GenerateStageConfig): this {
    this.config.stages.generate = config;
    return this;
  }

  /**
   * 検証ステージを追加
   */
  addValidateStage(config: ValidateStageConfig): this {
    this.config.stages.validate = config;
    return this;
  }

  /**
   * エクスポートステージを追加
   */
  addExportStage(config: ExportStageConfig): this {
    this.config.stages.export = config;
    return this;
  }

  /**
   * エラーハンドリングを設定
   */
  setErrorHandling(handling: PipelineConfig['errorHandling']): this {
    this.config.errorHandling = handling;
    return this;
  }

  /**
   * 並列処理を設定
   */
  setParallel(parallel: boolean): this {
    this.config.parallel = parallel;
    return this;
  }

  /**
   * 設定をビルド
   */
  build(): PipelineConfig {
    return { ...this.config };
  }
}

/**
 * 定型パイプラインテンプレート
 */
export const PipelineTemplates = {
  /**
   * 記事作成パイプライン
   */
  articleCreation(): PipelineConfig {
    return new PipelineConfigBuilder('Article Creation Pipeline')
      .addCollectStage({
        sources: [
          { type: 'web', config: { maxPages: 10 } },
          { type: 'api', config: { endpoint: 'search' } },
        ],
        maxSources: 10,
      })
      .addAnalyzeStage({
        analyzers: ['text', 'entity', 'topic'],
      })
      .addGenerateStage({
        outputType: 'article',
        options: { style: 'informative' },
      })
      .addValidateStage({
        qualityGate: true,
        styleCheck: true,
      })
      .addExportStage({
        formats: ['markdown', 'html'],
      })
      .setErrorHandling('stop')
      .build();
  },

  /**
   * レポート作成パイプライン
   */
  reportGeneration(): PipelineConfig {
    return new PipelineConfigBuilder('Report Generation Pipeline')
      .addCollectStage({
        sources: [{ type: 'api', config: { dataSource: 'analytics' } }],
      })
      .addAnalyzeStage({
        analyzers: ['text', 'sentiment', 'quality'],
      })
      .addGenerateStage({
        outputType: 'report',
        template: 'business-report',
      })
      .addValidateStage({
        qualityGate: true,
      })
      .addExportStage({
        formats: ['markdown', 'pdf'],
      })
      .setErrorHandling('continue')
      .build();
  },

  /**
   * 要約パイプライン
   */
  summarization(): PipelineConfig {
    return new PipelineConfigBuilder('Summarization Pipeline')
      .addAnalyzeStage({
        analyzers: ['text', 'topic'],
      })
      .addGenerateStage({
        outputType: 'summary',
        options: { maxLength: 500 },
      })
      .addValidateStage({
        qualityGate: true,
      })
      .setErrorHandling('stop')
      .build();
  },
};
