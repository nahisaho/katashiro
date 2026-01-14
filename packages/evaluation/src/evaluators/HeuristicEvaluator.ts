/**
 * Heuristic Evaluators
 *
 * @requirement REQ-EVAL-002
 * @design DES-KATASHIRO-003-EVAL §3.2
 */

import type { Evaluator, EvaluationInput, EvaluationResult } from '../types.js';

/**
 * 長さ評価器設定
 */
export interface LengthEvaluatorConfig {
  minLength?: number;
  maxLength?: number;
  optimalLength?: number;
  tolerance?: number;
}

/**
 * 長さベース評価器
 */
export class LengthEvaluator implements Evaluator {
  readonly name = 'length';

  constructor(private config: LengthEvaluatorConfig = {}) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const length = input.output.length;
    const {
      minLength = 0,
      maxLength = Infinity,
      optimalLength,
      tolerance = 0.2,
    } = this.config;

    let score: number;
    let reasoning: string;
    let passed = true;

    if (length < minLength) {
      score = minLength > 0 ? length / minLength : 0;
      reasoning = `出力が短すぎます（${length}文字 < 最小${minLength}文字）`;
      passed = false;
    } else if (length > maxLength && maxLength !== Infinity) {
      score = maxLength / length;
      reasoning = `出力が長すぎます（${length}文字 > 最大${maxLength}文字）`;
      passed = false;
    } else if (optimalLength) {
      const deviation = Math.abs(length - optimalLength) / optimalLength;
      score = Math.max(0, 1 - deviation / tolerance);
      reasoning = `理想的な長さ（${optimalLength}文字）からの偏差: ${(deviation * 100).toFixed(1)}%`;
      passed = score >= 0.5;
    } else {
      score = 1;
      reasoning = `適切な長さ（${length}文字）`;
    }

    return {
      evaluator: this.name,
      score,
      normalizedScore: score,
      passed,
      reasoning,
      metadata: { length, minLength, maxLength, optimalLength },
    };
  }
}

/**
 * キーワード評価器設定
 */
export interface KeywordEvaluatorConfig {
  requiredKeywords?: string[];
  forbiddenKeywords?: string[];
  caseSensitive?: boolean;
}

/**
 * キーワード評価器
 */
export class KeywordEvaluator implements Evaluator {
  readonly name = 'keyword';

  constructor(private config: KeywordEvaluatorConfig = {}) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const text = this.config.caseSensitive
      ? input.output
      : input.output.toLowerCase();
    const { requiredKeywords = [], forbiddenKeywords = [] } = this.config;

    const foundKeywords = requiredKeywords.filter((kw) =>
      text.includes(this.config.caseSensitive ? kw : kw.toLowerCase())
    );
    const missingKeywords = requiredKeywords.filter(
      (kw) => !text.includes(this.config.caseSensitive ? kw : kw.toLowerCase())
    );
    const foundForbidden = forbiddenKeywords.filter((kw) =>
      text.includes(this.config.caseSensitive ? kw : kw.toLowerCase())
    );

    const requiredScore =
      requiredKeywords.length > 0 ? foundKeywords.length / requiredKeywords.length : 1;
    const forbiddenScore =
      forbiddenKeywords.length > 0 ? 1 - foundForbidden.length / forbiddenKeywords.length : 1;
    const score = forbiddenKeywords.length > 0 
      ? (requiredScore + forbiddenScore) / 2 
      : requiredScore;

    const passed = score >= 1.0;

    const reasoning = [
      requiredKeywords.length > 0
        ? `必須キーワード: ${foundKeywords.length}/${requiredKeywords.length}`
        : '',
      forbiddenKeywords.length > 0
        ? `禁止キーワード: ${foundForbidden.length}/${forbiddenKeywords.length}`
        : '',
    ]
      .filter(Boolean)
      .join(', ');

    return {
      evaluator: this.name,
      score,
      normalizedScore: score,
      passed,
      reasoning: reasoning || '評価完了',
      metadata: {
        foundKeywords,
        missingKeywords,
        foundForbidden,
        requiredScore,
        forbiddenScore,
      },
    };
  }
}

/**
 * 正規表現評価器設定
 */
export interface RegexEvaluatorConfig {
  patterns: RegExp[];
}

/**
 * 正規表現評価器
 */
export class RegexEvaluator implements Evaluator {
  readonly name = 'regex';

  constructor(private config: RegexEvaluatorConfig) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const { patterns } = this.config;
    const matches: Array<{ pattern: string; matched: boolean }> = [];

    let matchedCount = 0;

    for (const regex of patterns) {
      const matched = regex.test(input.output);
      matches.push({ pattern: regex.source, matched });
      if (matched) {
        matchedCount++;
      }
    }

    const score = patterns.length > 0 ? matchedCount / patterns.length : 1;

    return {
      evaluator: this.name,
      score,
      normalizedScore: score,
      reasoning: `${matchedCount}/${patterns.length} パターン一致`,
      metadata: { matches },
    };
  }
}

/**
 * JSON構造評価器
 */
export class JsonStructureEvaluator implements Evaluator {
  readonly name = 'json-structure';

  constructor(
    private config: {
      requiredFields?: string[];
      types?: Record<string, string>; // field -> expected type
    } = {}
  ) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    try {
      const parsed = JSON.parse(input.output);
      const { requiredFields = [], types = {} } = this.config;

      // 必須フィールドチェック
      const missingFields = requiredFields.filter(
        (f) => !(f in parsed) || parsed[f] === undefined
      );

      // 型チェック
      const typeErrors: string[] = [];
      for (const [field, expectedType] of Object.entries(types)) {
        if (field in parsed) {
          const actualType = Array.isArray(parsed[field])
            ? 'array'
            : typeof parsed[field];
          if (actualType !== expectedType) {
            typeErrors.push(
              `${field}: expected ${expectedType}, got ${actualType}`
            );
          }
        }
      }

      const missingScore =
        requiredFields.length > 0
          ? 1 - missingFields.length / requiredFields.length
          : 1;
      const typeScore =
        Object.keys(types).length > 0
          ? 1 - typeErrors.length / Object.keys(types).length
          : 1;
      const score = (missingScore + typeScore) / 2;
      const passed = missingFields.length === 0 && typeErrors.length === 0;

      return {
        evaluator: this.name,
        score,
        normalizedScore: score,
        passed,
        reasoning: [
          missingFields.length > 0
            ? `欠落フィールド: ${missingFields.join(', ')}`
            : '',
          typeErrors.length > 0 ? `型エラー: ${typeErrors.join('; ')}` : '',
          passed ? '有効なJSON構造' : '',
        ]
          .filter(Boolean)
          .join('. '),
        metadata: { missingFields, typeErrors },
      };
    } catch {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        passed: false,
        reasoning: '無効なJSON形式',
        metadata: { error: 'JSON parse failed' },
      };
    }
  }
}

/**
 * 類似度評価器（Jaccard係数）
 */
export class SimilarityEvaluator implements Evaluator {
  readonly name = 'similarity';

  constructor(
    private config: {
      threshold?: number;
      tokenize?: (text: string) => string[];
    } = {}
  ) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    if (!input.expected) {
      return {
        evaluator: this.name,
        score: 0,
        normalizedScore: 0,
        reasoning: '期待出力がないため評価できません',
      };
    }

    const tokenize =
      this.config.tokenize ?? ((text: string) => text.toLowerCase().split(/\s+/));

    const outputTokens = new Set(tokenize(input.output));
    const expectedTokens = new Set(tokenize(input.expected));

    const intersection = new Set(
      [...outputTokens].filter((t) => expectedTokens.has(t))
    );
    const union = new Set([...outputTokens, ...expectedTokens]);

    const score = union.size > 0 ? intersection.size / union.size : 0;

    return {
      evaluator: this.name,
      score,
      normalizedScore: score,
      reasoning: `Jaccard類似度: ${(score * 100).toFixed(1)}% (共通トークン: ${intersection.size}/${union.size})`,
      metadata: {
        intersectionSize: intersection.size,
        unionSize: union.size,
        outputTokenCount: outputTokens.size,
        expectedTokenCount: expectedTokens.size,
      },
    };
  }
}
