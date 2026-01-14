/**
 * RAGAS Evaluators
 *
 * RAG評価用のRAGASメトリクスを実装する評価器群
 *
 * @requirement REQ-EVAL-102
 * @design DES-KATASHIRO-003-EVAL §3.4
 */

import type {
  Evaluator,
  EvaluationInput,
  EvaluationResult,
  RAGEvaluationInput,
  RAGASEvaluationResult,
} from '../types.js';

// LLMProvider型を定義（循環依存を避けるため）
interface LLMProviderLike {
  generate(request: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    responseFormat?: { type: string };
  }): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
}

/**
 * RAG評価入力かどうかを判定
 */
export function isRAGEvaluationInput(input: EvaluationInput): input is RAGEvaluationInput {
  return (
    'query' in input &&
    'retrievedContexts' in input &&
    'generatedAnswer' in input &&
    typeof input.query === 'string' &&
    Array.isArray(input.retrievedContexts) &&
    typeof input.generatedAnswer === 'string'
  );
}

/**
 * RAG評価共通設定
 */
export interface RAGEvaluatorConfig {
  /** 評価器名 */
  name?: string;
  /** リトライ回数 */
  maxRetries?: number;
  /** 温度パラメータ */
  temperature?: number;
}

/**
 * Faithfulness評価器
 * 
 * 回答がコンテキストに基づいているか（幻覚がないか）を評価
 */
export class FaithfulnessEvaluator implements Evaluator {
  readonly name: string;
  private llmProvider: LLMProviderLike;
  private temperature: number;

  constructor(llmProvider: LLMProviderLike, config: RAGEvaluatorConfig = {}) {
    this.llmProvider = llmProvider;
    this.name = config.name ?? 'faithfulness';
    this.temperature = config.temperature ?? 0.1;
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    if (!isRAGEvaluationInput(input)) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'RAG評価入力ではありません',
      };
    }

    const { generatedAnswer, retrievedContexts } = input;
    const context = retrievedContexts.join('\n\n');

    // ステートメント抽出プロンプト
    const extractPrompt = `以下の回答から、主要なファクト/ステートメントを抽出してください。

## 回答
${generatedAnswer}

## 出力形式
JSON配列形式で出力してください:
["ステートメント1", "ステートメント2", ...]`;

    // 各ステートメントのサポート確認プロンプト
    const verifyPromptTemplate = (statements: string[]) => `以下のステートメントがコンテキストでサポートされているか確認してください。

## コンテキスト
${context}

## ステートメント
${statements.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 出力形式
JSON形式で出力してください:
{
  "supported": ["サポートされているステートメント"],
  "unsupported": ["サポートされていないステートメント"]
}`;

    try {
      // ステートメント抽出
      const extractResponse = await this.llmProvider.generate({
        messages: [{ role: 'user', content: extractPrompt }],
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
      });

      let statements: string[];
      try {
        const parsed = JSON.parse(extractResponse.content);
        statements = Array.isArray(parsed) ? parsed : (parsed.statements ?? []);
      } catch {
        statements = this.extractStatementsFromText(extractResponse.content);
      }

      if (statements.length === 0) {
        return {
          evaluator: this.name,
          score: 1,
          normalizedScore: 1,
          passed: true,
          reasoning: '抽出されたステートメントがありません',
        };
      }

      // サポート確認
      const verifyResponse = await this.llmProvider.generate({
        messages: [{ role: 'user', content: verifyPromptTemplate(statements) }],
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
      });

      let supported: string[] = [];
      let unsupported: string[] = [];

      try {
        const parsed = JSON.parse(verifyResponse.content);
        supported = parsed.supported ?? [];
        unsupported = parsed.unsupported ?? [];
      } catch {
        // フォールバック: 全てサポートされていると仮定
        supported = statements;
      }

      const total = supported.length + unsupported.length;
      const score = total > 0 ? supported.length / total : 1;

      return {
        evaluator: this.name,
        score,
        normalizedScore: score,
        passed: score >= 0.7,
        reasoning: `${supported.length}/${total} ステートメントがコンテキストでサポートされています`,
        metadata: {
          statements,
          supportedStatements: supported,
          unsupportedStatements: unsupported,
        },
      };
    } catch (error) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: `評価に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private extractStatementsFromText(text: string): string[] {
    // 箇条書きや番号付きリストからステートメントを抽出
    const lines = text.split('\n').filter((line) => line.trim());
    return lines
      .map((line) => line.replace(/^[\d\-\*\.]+\s*/, '').trim())
      .filter((line) => line.length > 10);
  }
}

/**
 * Context Relevancy評価器
 * 
 * 取得されたコンテキストがクエリに関連しているかを評価
 */
export class ContextRelevancyEvaluator implements Evaluator {
  readonly name: string;
  private llmProvider: LLMProviderLike;
  private temperature: number;

  constructor(llmProvider: LLMProviderLike, config: RAGEvaluatorConfig = {}) {
    this.llmProvider = llmProvider;
    this.name = config.name ?? 'context-relevancy';
    this.temperature = config.temperature ?? 0.1;
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    if (!isRAGEvaluationInput(input)) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'RAG評価入力ではありません',
      };
    }

    const { query, retrievedContexts } = input;

    const prompt = `以下のクエリに対して、各コンテキストの関連性を0-1のスコアで評価してください。

## クエリ
${query}

## コンテキスト
${retrievedContexts.map((c, i) => `### コンテキスト ${i + 1}\n${c}`).join('\n\n')}

## 出力形式
JSON形式で出力してください:
{
  "scores": [0.8, 0.6, ...],
  "reasoning": "関連性の説明"
}`;

    try {
      const response = await this.llmProvider.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
      });

      let scores: number[] = [];
      let reasoning = '';

      try {
        const parsed = JSON.parse(response.content);
        scores = parsed.scores ?? [];
        reasoning = parsed.reasoning ?? '';
      } catch {
        // フォールバック: 中央値スコア
        scores = retrievedContexts.map(() => 0.5);
        reasoning = 'スコアを抽出できませんでした';
      }

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      return {
        evaluator: this.name,
        score: avgScore,
        normalizedScore: avgScore,
        passed: avgScore >= 0.6,
        reasoning,
        metadata: {
          contextScores: scores,
          contextCount: retrievedContexts.length,
        },
      };
    } catch (error) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: `評価に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Answer Relevancy評価器
 * 
 * 回答がクエリに対して関連しているかを評価
 */
export class AnswerRelevancyEvaluator implements Evaluator {
  readonly name: string;
  private llmProvider: LLMProviderLike;
  private temperature: number;

  constructor(llmProvider: LLMProviderLike, config: RAGEvaluatorConfig = {}) {
    this.llmProvider = llmProvider;
    this.name = config.name ?? 'answer-relevancy';
    this.temperature = config.temperature ?? 0.1;
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    if (!isRAGEvaluationInput(input)) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'RAG評価入力ではありません',
      };
    }

    const { query, generatedAnswer } = input;

    const prompt = `以下のクエリに対する回答の関連性を評価してください。

## クエリ
${query}

## 回答
${generatedAnswer}

## 評価基準
- 回答がクエリの質問に直接答えているか
- 回答が質問の意図を理解しているか
- 不要な情報が含まれていないか

## 出力形式
JSON形式で出力してください:
{
  "score": 0.0-1.0,
  "reasoning": "評価の根拠",
  "directlyAnswers": true/false,
  "hasIrrelevantInfo": true/false
}`;

    try {
      const response = await this.llmProvider.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
      });

      let score = 0;
      let reasoning = '';
      let directlyAnswers = false;
      let hasIrrelevantInfo = false;

      try {
        const parsed = JSON.parse(response.content);
        score = typeof parsed.score === 'number' ? parsed.score : 0.5;
        reasoning = parsed.reasoning ?? '';
        directlyAnswers = parsed.directlyAnswers ?? false;
        hasIrrelevantInfo = parsed.hasIrrelevantInfo ?? false;
      } catch {
        score = 0.5;
        reasoning = 'スコアを抽出できませんでした';
      }

      return {
        evaluator: this.name,
        score,
        normalizedScore: score,
        passed: score >= 0.6,
        reasoning,
        metadata: {
          directlyAnswers,
          hasIrrelevantInfo,
        },
      };
    } catch (error) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: `評価に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Context Recall評価器
 * 
 * コンテキストがグラウンドトゥルースをカバーしているかを評価
 */
export class ContextRecallEvaluator implements Evaluator {
  readonly name: string;
  private llmProvider: LLMProviderLike;
  private temperature: number;

  constructor(llmProvider: LLMProviderLike, config: RAGEvaluatorConfig = {}) {
    this.llmProvider = llmProvider;
    this.name = config.name ?? 'context-recall';
    this.temperature = config.temperature ?? 0.1;
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    if (!isRAGEvaluationInput(input)) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'RAG評価入力ではありません',
      };
    }

    const { retrievedContexts, groundTruth } = input;

    if (!groundTruth) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'グラウンドトゥルースが指定されていません',
      };
    }

    const context = retrievedContexts.join('\n\n');

    const prompt = `以下のグラウンドトゥルース（正解）が、取得されたコンテキストでカバーされているかを評価してください。

## グラウンドトゥルース
${groundTruth}

## 取得コンテキスト
${context}

## 出力形式
JSON形式で出力してください:
{
  "coveredPoints": ["カバーされているポイント"],
  "missedPoints": ["カバーされていないポイント"],
  "score": 0.0-1.0,
  "reasoning": "評価の根拠"
}`;

    try {
      const response = await this.llmProvider.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
      });

      let score = 0;
      let reasoning = '';
      let coveredPoints: string[] = [];
      let missedPoints: string[] = [];

      try {
        const parsed = JSON.parse(response.content);
        score = typeof parsed.score === 'number' ? parsed.score : 0.5;
        reasoning = parsed.reasoning ?? '';
        coveredPoints = parsed.coveredPoints ?? [];
        missedPoints = parsed.missedPoints ?? [];
      } catch {
        score = 0.5;
        reasoning = 'スコアを抽出できませんでした';
      }

      return {
        evaluator: this.name,
        score,
        normalizedScore: score,
        passed: score >= 0.7,
        reasoning,
        metadata: {
          coveredPoints,
          missedPoints,
          coverageRatio:
            coveredPoints.length /
            Math.max(1, coveredPoints.length + missedPoints.length),
        },
      };
    } catch (error) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: `評価に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * RAGAS複合評価器設定
 */
export interface RAGASCompositeEvaluatorConfig {
  /** 評価器名 */
  name?: string;
  /** 有効化するメトリクス */
  enabledMetrics?: Array<'faithfulness' | 'contextRelevancy' | 'answerRelevancy' | 'contextRecall'>;
  /** 各メトリクスの重み */
  weights?: {
    faithfulness?: number;
    contextRelevancy?: number;
    answerRelevancy?: number;
    contextRecall?: number;
  };
  /** 共通設定 */
  evaluatorConfig?: RAGEvaluatorConfig;
}

/**
 * RAGAS複合評価器
 * 
 * 複数のRAGASメトリクスを組み合わせて評価
 */
export class RAGASCompositeEvaluator implements Evaluator {
  readonly name: string;
  private evaluators: Map<string, { evaluator: Evaluator; weight: number }>;
  private enabledMetrics: string[];

  constructor(llmProvider: LLMProviderLike, config: RAGASCompositeEvaluatorConfig = {}) {
    this.name = config.name ?? 'ragas-composite';
    const evaluatorConfig = config.evaluatorConfig ?? {};
    const weights = config.weights ?? {};

    const defaultMetrics: Array<'faithfulness' | 'contextRelevancy' | 'answerRelevancy' | 'contextRecall'> = [
      'faithfulness',
      'contextRelevancy',
      'answerRelevancy',
    ];
    this.enabledMetrics = config.enabledMetrics ?? defaultMetrics;

    this.evaluators = new Map();

    if (this.enabledMetrics.includes('faithfulness')) {
      this.evaluators.set('faithfulness', {
        evaluator: new FaithfulnessEvaluator(llmProvider, evaluatorConfig),
        weight: weights.faithfulness ?? 1,
      });
    }

    if (this.enabledMetrics.includes('contextRelevancy')) {
      this.evaluators.set('contextRelevancy', {
        evaluator: new ContextRelevancyEvaluator(llmProvider, evaluatorConfig),
        weight: weights.contextRelevancy ?? 1,
      });
    }

    if (this.enabledMetrics.includes('answerRelevancy')) {
      this.evaluators.set('answerRelevancy', {
        evaluator: new AnswerRelevancyEvaluator(llmProvider, evaluatorConfig),
        weight: weights.answerRelevancy ?? 1,
      });
    }

    if (this.enabledMetrics.includes('contextRecall')) {
      this.evaluators.set('contextRecall', {
        evaluator: new ContextRecallEvaluator(llmProvider, evaluatorConfig),
        weight: weights.contextRecall ?? 1,
      });
    }
  }

  async evaluate(input: EvaluationInput): Promise<RAGASEvaluationResult> {
    if (!isRAGEvaluationInput(input)) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: 'RAG評価入力ではありません',
        metrics: {},
      };
    }

    // 全評価器を並列実行
    const results = await Promise.all(
      Array.from(this.evaluators.entries()).map(async ([name, { evaluator }]) => ({
        name,
        result: await evaluator.evaluate(input),
      }))
    );

    // メトリクスを集約
    const metrics: RAGASEvaluationResult['metrics'] = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const { name, result } of results) {
      const metricName = name as keyof RAGASEvaluationResult['metrics'];
      metrics[metricName] = result.normalizedScore;

      const weight = this.evaluators.get(name)?.weight ?? 1;
      weightedSum += result.normalizedScore * weight;
      totalWeight += weight;
    }

    const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const reasoning = results
      .map(({ name, result }) => `${name}: ${result.normalizedScore.toFixed(2)} (${result.reasoning})`)
      .join('; ');

    // 分析情報を集約
    const analysis: RAGASEvaluationResult['analysis'] = {};
    const faithfulnessResult = results.find((r) => r.name === 'faithfulness');
    if (faithfulnessResult?.result.metadata) {
      analysis.statements = faithfulnessResult.result.metadata.statements as string[];
      analysis.supportedStatements = faithfulnessResult.result.metadata.supportedStatements as string[];
      analysis.unsupportedStatements = faithfulnessResult.result.metadata.unsupportedStatements as string[];
    }

    return {
      evaluator: this.name,
      score: avgScore,
      normalizedScore: avgScore,
      passed: avgScore >= 0.6,
      reasoning,
      metrics,
      analysis: Object.keys(analysis).length > 0 ? analysis : undefined,
      metadata: {
        enabledMetrics: this.enabledMetrics,
        individualResults: results.map(({ name, result }) => ({
          metric: name,
          score: result.normalizedScore,
          passed: result.passed,
        })),
      },
    };
  }

  /**
   * 有効化されているメトリクスを取得
   */
  getEnabledMetrics(): string[] {
    return [...this.enabledMetrics];
  }
}
