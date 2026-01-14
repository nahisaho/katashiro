/**
 * LLM Judge Evaluator
 *
 * LLMを使用してテキスト品質を評価する評価器
 *
 * @requirement REQ-EVAL-101
 * @design DES-KATASHIRO-003-EVAL §3.3
 */

import type {
  Evaluator,
  EvaluationInput,
  EvaluationCriteria,
  LLMJudgeEvaluatorConfig,
  LLMJudgeResult,
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
 * デフォルトの評価基準
 */
export const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    name: 'relevance',
    description: '回答が質問や入力に対して関連性があるか',
    scale: { min: 1, max: 5 },
    rubric: {
      1: '全く関連がない',
      2: '部分的に関連があるが、主要な点を外している',
      3: '概ね関連があるが、改善の余地がある',
      4: '非常に関連性が高い',
      5: '完全に関連性があり、質問に的確に答えている',
    },
  },
  {
    name: 'coherence',
    description: '回答が論理的で一貫性があるか',
    scale: { min: 1, max: 5 },
    rubric: {
      1: '論理的でなく、理解困難',
      2: '部分的に論理的だが、矛盾がある',
      3: '概ね論理的だが、一部不明瞭な部分がある',
      4: '論理的で理解しやすい',
      5: '非常に論理的で明確、流れが自然',
    },
  },
  {
    name: 'helpfulness',
    description: '回答がユーザーにとって有用か',
    scale: { min: 1, max: 5 },
    rubric: {
      1: '全く役に立たない',
      2: '限定的に役立つが、不十分',
      3: '概ね役立つ',
      4: '非常に役立つ',
      5: '極めて有用で、期待以上の価値がある',
    },
  },
];

/**
 * デフォルトのシステムプロンプト
 */
export const DEFAULT_SYSTEM_PROMPT = `あなたはLLM出力の品質を評価する専門家です。
与えられた入力と出力を分析し、指定された基準に基づいて評価してください。
評価は客観的かつ一貫性のある基準で行ってください。`;

/**
 * デフォルトの評価プロンプトテンプレート
 */
export const DEFAULT_EVALUATION_PROMPT_TEMPLATE = `以下の入力と出力を評価してください。

## 入力
{{input}}

## 出力
{{output}}

## 評価基準
{{criteria}}

## 評価形式
以下のJSON形式で評価結果を返してください:
{
  "scores": {
    "基準名": {
      "score": 1-5のスコア,
      "reasoning": "スコアの根拠"
    }
  },
  "overallAssessment": "全体的な評価コメント"
}`;

/**
 * LLMJudge評価器
 */
export class LLMJudgeEvaluator implements Evaluator {
  readonly name: string;
  private llmProvider: LLMProviderLike;
  private criteria: EvaluationCriteria[];
  private scale: { min: number; max: number };
  private systemPrompt: string;
  private evaluationPromptTemplate: string;
  private maxRetries: number;
  private temperature: number;
  private forceJsonOutput: boolean;

  constructor(
    llmProvider: LLMProviderLike,
    config: LLMJudgeEvaluatorConfig = { criteria: DEFAULT_CRITERIA }
  ) {
    this.llmProvider = llmProvider;
    this.name = config.name ?? 'llm-judge';
    this.criteria = config.criteria && config.criteria.length > 0 ? config.criteria : DEFAULT_CRITERIA;
    this.scale = config.scale ?? { min: 1, max: 5 };
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.evaluationPromptTemplate =
      config.evaluationPromptTemplate ?? DEFAULT_EVALUATION_PROMPT_TEMPLATE;
    this.maxRetries = config.maxRetries ?? 3;
    this.temperature = config.temperature ?? 0.1;
    this.forceJsonOutput = config.forceJsonOutput ?? true;
  }

  /**
   * 評価実行
   */
  async evaluate(input: EvaluationInput): Promise<LLMJudgeResult> {
    const prompt = this.buildEvaluationPrompt(input);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.llmProvider.generate({
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: this.temperature,
          ...(this.forceJsonOutput && { responseFormat: { type: 'json_object' } }),
        });

        const parsed = this.parseResponse(response.content);
        const normalizedScore = this.calculateNormalizedScore(parsed.scores);

        return {
          evaluator: this.name,
          score: normalizedScore,
          normalizedScore,
          passed: normalizedScore >= 0.6,
          reasoning: parsed.overallAssessment ?? this.buildReasoning(parsed.scores),
          criteriaScores: parsed.scores,
          rawLLMOutput: response.content,
          tokenUsage: response.usage,
          metadata: {
            criteria: this.criteria.map((c) => c.name),
            scale: this.scale,
            attempt: attempt + 1,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // 最後の試行でなければ継続
        if (attempt < this.maxRetries - 1) {
          continue;
        }
      }
    }

    // 全リトライ失敗
    return {
      evaluator: this.name,
      score: 0,
      normalizedScore: 0,
      passed: false,
      reasoning: `評価に失敗しました: ${lastError?.message ?? 'Unknown error'}`,
      criteriaScores: {},
      rawLLMOutput: undefined,
      metadata: {
        error: lastError?.message,
        retries: this.maxRetries,
      },
    };
  }

  /**
   * 評価プロンプト構築
   */
  private buildEvaluationPrompt(input: EvaluationInput): string {
    const criteriaText = this.criteria
      .map((c) => {
        let text = `### ${c.name}\n${c.description}`;
        if (c.rubric) {
          text += '\n評価基準:';
          for (const [score, desc] of Object.entries(c.rubric)) {
            text += `\n  ${score}: ${desc}`;
          }
        }
        return text;
      })
      .join('\n\n');

    return this.evaluationPromptTemplate
      .replace('{{input}}', input.input ?? '(入力なし)')
      .replace('{{output}}', input.output)
      .replace('{{criteria}}', criteriaText)
      .replace('{{expected}}', input.expected ?? '(期待出力なし)');
  }

  /**
   * LLMレスポンスのパース
   */
  private parseResponse(content: string): {
    scores: Record<string, { score: number; reasoning: string }>;
    overallAssessment?: string;
  } {
    // JSONを抽出（コードブロック内の場合も対応）
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1]!.trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        scores: parsed.scores ?? this.extractScoresFromLegacy(parsed),
        overallAssessment: parsed.overallAssessment,
      };
    } catch {
      // JSONパース失敗時はテキストから抽出を試みる
      return this.extractScoresFromText(content);
    }
  }

  /**
   * 旧形式からスコア抽出
   */
  private extractScoresFromLegacy(
    parsed: Record<string, unknown>
  ): Record<string, { score: number; reasoning: string }> {
    const scores: Record<string, { score: number; reasoning: string }> = {};

    for (const criterion of this.criteria) {
      const key = criterion.name;
      const value = parsed[key];

      if (typeof value === 'number') {
        scores[key] = { score: value, reasoning: '' };
      } else if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        scores[key] = {
          score: typeof obj.score === 'number' ? obj.score : this.scale.min,
          reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
        };
      }
    }

    return scores;
  }

  /**
   * テキストからスコア抽出（フォールバック）
   */
  private extractScoresFromText(
    text: string
  ): { scores: Record<string, { score: number; reasoning: string }>; overallAssessment?: string } {
    const scores: Record<string, { score: number; reasoning: string }> = {};

    for (const criterion of this.criteria) {
      // パターン: "基準名: 4" や "基準名: 4/5"
      const pattern = new RegExp(
        `${criterion.name}[:\\s]+(\\d+)(?:\\/\\d+)?`,
        'i'
      );
      const match = text.match(pattern);

      if (match) {
        scores[criterion.name] = {
          score: parseInt(match[1]!, 10),
          reasoning: '',
        };
      } else {
        // スコアが見つからない場合は中央値
        scores[criterion.name] = {
          score: Math.round((this.scale.min + this.scale.max) / 2),
          reasoning: 'スコアを抽出できませんでした',
        };
      }
    }

    return { scores };
  }

  /**
   * 正規化スコア計算
   */
  private calculateNormalizedScore(
    scores: Record<string, { score: number; reasoning: string }>
  ): number {
    const criteriaMap = new Map(this.criteria.map((c) => [c.name, c]));
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [name, result] of Object.entries(scores)) {
      const criterion = criteriaMap.get(name);
      const weight = criterion?.weight ?? 1;
      const scale = criterion?.scale ?? this.scale;

      // スコアを0-1に正規化
      const normalized = (result.score - scale.min) / (scale.max - scale.min);
      weightedSum += normalized * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 根拠テキスト構築
   */
  private buildReasoning(
    scores: Record<string, { score: number; reasoning: string }>
  ): string {
    const parts: string[] = [];

    for (const [name, result] of Object.entries(scores)) {
      const criterion = this.criteria.find((c) => c.name === name);
      const maxScore = criterion?.scale?.max ?? this.scale.max;
      parts.push(`${name}: ${result.score}/${maxScore}${result.reasoning ? ` - ${result.reasoning}` : ''}`);
    }

    return parts.join('; ');
  }

  /**
   * 評価基準を取得
   */
  getCriteria(): EvaluationCriteria[] {
    return [...this.criteria];
  }

  /**
   * 評価基準を設定
   */
  setCriteria(criteria: EvaluationCriteria[]): void {
    this.criteria = criteria;
  }
}
