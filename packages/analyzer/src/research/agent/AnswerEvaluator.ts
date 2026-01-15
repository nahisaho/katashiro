/**
 * AnswerEvaluator - 回答品質評価
 *
 * @requirement REQ-DR-004
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type {
  EvaluationResponse as EvaluationResponseType,
  EvaluationType,
  KnowledgeItem,
  QuestionType,
} from './types.js';
import type { TokenTracker } from './TokenTracker.js';

/**
 * EvaluationResponseをエクスポート
 */
export type EvaluationResponse = EvaluationResponseType;

/**
 * 参照情報
 */
export interface Reference {
  url: string;
  title: string;
  dateTime?: string;
}

/**
 * AnswerEvaluatorオプション
 */
export interface AnswerEvaluatorOptions {
  /** LLMクライアント */
  llmClient: {
    chat: (options: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    }) => Promise<{
      content: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
      };
    }>;
  };
  /** トークントラッカー */
  tokenTracker: TokenTracker;
}

/**
 * 質問分析結果
 */
export interface QuestionAnalysis {
  questionType: QuestionType;
  requiredEvaluations: EvaluationType[];
  freshnessRequired: boolean;
  pluralityRequired: boolean;
  minimumCount?: number;
  expectedAspects?: string[];
}

/**
 * 回答の品質を評価するクラス
 *
 * @example
 * ```typescript
 * const evaluator = new AnswerEvaluator({
 *   llmClient,
 *   tokenTracker,
 * });
 *
 * const result = await evaluator.evaluate(
 *   'What is the population of Tokyo?',
 *   'The population of Tokyo is approximately 14 million.',
 *   knowledge
 * );
 *
 * if (result.pass) {
 *   console.log('Answer is acceptable');
 * } else {
 *   console.log(`Improvement needed: ${result.improvementPlan}`);
 * }
 * ```
 */
export class AnswerEvaluator {
  // 将来のLLMベース評価用に保持
  private _llmClient: AnswerEvaluatorOptions['llmClient'];
  private _tokenTracker: TokenTracker;

  constructor(options: AnswerEvaluatorOptions) {
    this._llmClient = options.llmClient;
    this._tokenTracker = options.tokenTracker;
  }

  /**
   * LLMクライアントを取得（将来の拡張用）
   */
  get llmClient(): AnswerEvaluatorOptions['llmClient'] {
    return this._llmClient;
  }

  /**
   * トークントラッカーを取得（将来の拡張用）
   */
  get tokenTracker(): TokenTracker {
    return this._tokenTracker;
  }

  /**
   * 回答を評価
   */
  async evaluate(
    question: string,
    answer: string,
    knowledge: KnowledgeItem[]
  ): Promise<EvaluationResponse> {
    // 質問タイプを分析
    const analysis = await this.analyzeQuestion(question);
    const requiredEvaluations = analysis.requiredEvaluations;

    // KnowledgeItemをReferenceに変換
    const references = this.toReferences(knowledge);

    // 各評価を実行
    const evaluations: EvaluationResponse[] = [];

    // 1. 基本的な回答品質チェック
    const basicEval = this.evaluateBasic(answer);
    if (!basicEval.pass) {
      return basicEval;
    }

    // 2. 参照チェック（attribution）
    if (requiredEvaluations.includes('attribution')) {
      const attrEval = this.evaluateAttribution(answer, references);
      evaluations.push(attrEval);
      if (!attrEval.pass) {
        return attrEval;
      }
    }

    // 3. 鮮度チェック（freshness）
    if (requiredEvaluations.includes('freshness')) {
      const freshEval = this.evaluateFreshness(question, references);
      evaluations.push(freshEval);
      if (!freshEval.pass) {
        return freshEval;
      }
    }

    // 4. 複数例チェック（plurality）
    if (requiredEvaluations.includes('plurality')) {
      const pluralEval = this.evaluatePlurality(question, answer);
      evaluations.push(pluralEval);
      if (!pluralEval.pass) {
        return pluralEval;
      }
    }

    // 5. 網羅性チェック（completeness）
    if (requiredEvaluations.includes('completeness')) {
      const completeEval = this.evaluateCompleteness(question, answer, knowledge);
      evaluations.push(completeEval);
      if (!completeEval.pass) {
        return completeEval;
      }
    }

    // 全て合格
    return {
      pass: true,
      think: 'The answer satisfies all evaluation criteria.',
      type: 'definitive',
    };
  }

  /**
   * KnowledgeItemをReferenceに変換
   */
  private toReferences(knowledge: KnowledgeItem[]): Reference[] {
    return knowledge.map((item) => ({
      url: item.sourceId ?? '',
      title: item.summary ?? item.content?.substring(0, 100) ?? '',
      dateTime: item.timestamp,
    }));
  }

  /**
   * 質問タイプを分析（同期版）
   */
  analyzeQuestionSync(question: string): EvaluationType[] {
    const types: EvaluationType[] = [];
    const lowerQuestion = question.toLowerCase();

    // 鮮度が必要なキーワード
    const freshnessKeywords = [
      'latest',
      'recent',
      'current',
      'today',
      'now',
      '最新',
      '現在',
      '今',
      '2024',
      '2025',
      '2026',
    ];
    if (freshnessKeywords.some((k) => lowerQuestion.includes(k))) {
      types.push('freshness');
    }

    // 複数例が必要なキーワード
    const pluralityKeywords = [
      'list',
      'examples',
      'all',
      'many',
      'several',
      'multiple',
      'リスト',
      '一覧',
      '複数',
      'すべて',
    ];
    if (pluralityKeywords.some((k) => lowerQuestion.includes(k))) {
      types.push('plurality');
    }

    // 網羅性が必要なキーワード
    const completenessKeywords = [
      'explain',
      'describe',
      'detail',
      'comprehensive',
      'complete',
      '説明',
      '詳細',
      '完全',
    ];
    if (completenessKeywords.some((k) => lowerQuestion.includes(k))) {
      types.push('completeness');
    }

    // 参照が必要な質問（事実を問う質問）
    const factKeywords = [
      'who',
      'what',
      'when',
      'where',
      'how many',
      'how much',
      'price',
      'cost',
      '誰',
      '何',
      'いつ',
      'どこ',
      'いくら',
    ];
    if (factKeywords.some((k) => lowerQuestion.includes(k))) {
      types.push('attribution');
    }

    // デフォルトでdefinitiveを要求
    if (types.length === 0) {
      types.push('definitive');
    }

    return types;
  }

  /**
   * 質問タイプを分析（非同期版 - 将来的にLLM使用）
   */
  async analyzeQuestion(question: string): Promise<QuestionAnalysis> {
    // 同期版で評価タイプを取得
    const evaluationTypes = this.analyzeQuestionSync(question);
    
    // QuestionAnalysisオブジェクトを構築
    return {
      questionType: this.inferQuestionType(question),
      requiredEvaluations: evaluationTypes,
      freshnessRequired: evaluationTypes.includes('freshness'),
      pluralityRequired: evaluationTypes.includes('plurality'),
      minimumCount: evaluationTypes.includes('plurality') ? this.estimateRequiredCount(question) : undefined,
      expectedAspects: this.extractExpectedAspects(question),
    };
  }

  /**
   * 質問タイプを推定
   */
  private inferQuestionType(question: string): QuestionType {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('how') || lowerQuestion.includes('どうやって') || lowerQuestion.includes('方法')) {
      return 'howto';
    }
    if (lowerQuestion.includes('why') || lowerQuestion.includes('なぜ') || lowerQuestion.includes('理由')) {
      return 'why';
    }
    if (lowerQuestion.includes('compare') || lowerQuestion.includes('比較') || lowerQuestion.includes('違い')) {
      return 'comparison';
    }
    if (lowerQuestion.includes('list') || lowerQuestion.includes('一覧') || lowerQuestion.includes('リスト')) {
      return 'list';
    }
    
    return 'factual';
  }

  /**
   * 期待されるアスペクトを抽出
   */
  private extractExpectedAspects(question: string): string[] {
    const aspects: string[] = [];
    const lowerQuestion = question.toLowerCase();
    
    // 一般的なアスペクトキーワード
    const aspectKeywords: Record<string, string> = {
      'advantage': 'advantages',
      'disadvantage': 'disadvantages',
      'pro': 'pros',
      'con': 'cons',
      'benefit': 'benefits',
      'risk': 'risks',
      'cost': 'cost',
      'feature': 'features',
      'メリット': 'advantages',
      'デメリット': 'disadvantages',
      '特徴': 'features',
      'コスト': 'cost',
    };
    
    for (const [keyword, aspect] of Object.entries(aspectKeywords)) {
      if (lowerQuestion.includes(keyword)) {
        aspects.push(aspect);
      }
    }

    // 「とは」「について」などの説明を求める場合
    if (
      lowerQuestion.includes('explain') ||
      lowerQuestion.includes('describe') ||
      lowerQuestion.includes('説明') ||
      lowerQuestion.includes('とは')
    ) {
      aspects.push('definition', 'examples', 'importance');
    }

    // 「メリット・デメリット」パターン
    if (
      lowerQuestion.includes('pros and cons') ||
      lowerQuestion.includes('advantages and disadvantages')
    ) {
      aspects.push('advantages', 'disadvantages');
    }

    // 「比較」パターン
    if (
      lowerQuestion.includes('compare') ||
      lowerQuestion.includes('difference') ||
      lowerQuestion.includes('比較') ||
      lowerQuestion.includes('違い')
    ) {
      aspects.push('similarities', 'differences');
    }

    // 「方法」パターン
    if (
      lowerQuestion.includes('how to') ||
      lowerQuestion.includes('方法') ||
      lowerQuestion.includes('やり方')
    ) {
      aspects.push('steps', 'requirements', 'tips');
    }
    
    // 重複を除去してデフォルトを返す
    const uniqueAspects = [...new Set(aspects)];
    return uniqueAspects.length > 0 ? uniqueAspects : ['main_point'];
  }

  /**
   * 基本的な回答品質チェック
   */
  private evaluateBasic(answer: string): EvaluationResponse {
    if (!answer || answer.trim().length === 0) {
      return {
        pass: false,
        think: 'The answer is empty.',
        improvementPlan: 'Provide a substantive answer to the question.',
      };
    }

    if (answer.trim().length < 10) {
      return {
        pass: false,
        think: 'The answer is too short to be informative.',
        improvementPlan: 'Provide a more detailed and informative answer.',
      };
    }

    // 「わかりません」系の回答を検出
    const uncertainPhrases = [
      "i don't know",
      "i'm not sure",
      'unable to find',
      'no information',
      'わかりません',
      '不明',
      '情報がありません',
    ];
    const lowerAnswer = answer.toLowerCase();
    if (uncertainPhrases.some((p) => lowerAnswer.includes(p))) {
      return {
        pass: false,
        think: 'The answer indicates uncertainty without providing useful information.',
        improvementPlan: 'Continue searching for relevant information.',
      };
    }

    return {
      pass: true,
      think: 'Basic answer quality is acceptable.',
    };
  }

  /**
   * 参照チェック
   */
  private evaluateAttribution(_answer: string, references: Reference[]): EvaluationResponse {
    if (references.length === 0) {
      return {
        pass: false,
        think: 'The answer lacks source references.',
        type: 'attribution',
        improvementPlan: 'Include reliable sources to support the claims in the answer.',
      };
    }

    // 参照の品質をチェック
    const validRefs = references.filter(
      (ref) => ref.url && ref.url.startsWith('http') && ref.title
    );

    if (validRefs.length === 0) {
      return {
        pass: false,
        think: 'The references are not valid URLs.',
        type: 'attribution',
        improvementPlan: 'Provide valid URL references with proper titles.',
      };
    }

    return {
      pass: true,
      think: `Answer is supported by ${validRefs.length} reference(s).`,
      type: 'attribution',
    };
  }

  /**
   * 鮮度チェック
   */
  private evaluateFreshness(question: string, references: Reference[]): EvaluationResponse {
    // 要求される鮮度を推定
    const maxAgeDays = this.estimateMaxAge(question);

    // 参照の日付をチェック
    const refsWithDates = references.filter((ref) => ref.dateTime);
    if (refsWithDates.length === 0) {
      return {
        pass: false,
        think: 'Cannot verify freshness without dated references.',
        type: 'freshness',
        freshnessAnalysis: {
          daysAgo: -1,
          maxAgeDays,
        },
        improvementPlan: 'Find more recent sources with clear publication dates.',
      };
    }

    // 最新の参照の日付を取得
    const now = Date.now();
    let mostRecentDaysAgo = Infinity;

    for (const ref of refsWithDates) {
      const refDate = new Date(ref.dateTime!).getTime();
      const daysAgo = (now - refDate) / (1000 * 60 * 60 * 24);
      if (daysAgo < mostRecentDaysAgo) {
        mostRecentDaysAgo = daysAgo;
      }
    }

    if (mostRecentDaysAgo > maxAgeDays) {
      return {
        pass: false,
        think: `Most recent reference is ${Math.round(mostRecentDaysAgo)} days old, but freshness requires ${maxAgeDays} days or less.`,
        type: 'freshness',
        freshnessAnalysis: {
          daysAgo: Math.round(mostRecentDaysAgo),
          maxAgeDays,
        },
        improvementPlan: `Find sources from the last ${maxAgeDays} days.`,
      };
    }

    return {
      pass: true,
      think: `References are fresh enough (${Math.round(mostRecentDaysAgo)} days old).`,
      type: 'freshness',
      freshnessAnalysis: {
        daysAgo: Math.round(mostRecentDaysAgo),
        maxAgeDays,
      },
    };
  }

  /**
   * 鮮度の最大許容日数を推定
   */
  private estimateMaxAge(question: string): number {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('today') || lowerQuestion.includes('今日')) {
      return 1;
    }
    if (
      lowerQuestion.includes('this week') ||
      lowerQuestion.includes('今週') ||
      lowerQuestion.includes('latest')
    ) {
      return 7;
    }
    if (lowerQuestion.includes('this month') || lowerQuestion.includes('今月')) {
      return 30;
    }
    if (lowerQuestion.includes('recent') || lowerQuestion.includes('最新')) {
      return 90;
    }

    return 365; // デフォルト1年
  }

  /**
   * 複数例チェック
   */
  private evaluatePlurality(question: string, answer: string): EvaluationResponse {
    // 要求される数を推定
    const minCount = this.estimateRequiredCount(question);

    // 回答内のアイテム数をカウント
    const actualCount = this.countItems(answer);

    if (actualCount < minCount) {
      return {
        pass: false,
        think: `The question asks for multiple items, but only ${actualCount} were provided.`,
        type: 'plurality',
        pluralityAnalysis: {
          minimumCountRequired: minCount,
          actualCountProvided: actualCount,
        },
        improvementPlan: `Provide at least ${minCount} items or examples.`,
      };
    }

    return {
      pass: true,
      think: `Answer provides ${actualCount} items, meeting the plurality requirement.`,
      type: 'plurality',
      pluralityAnalysis: {
        minimumCountRequired: minCount,
        actualCountProvided: actualCount,
      },
    };
  }

  /**
   * 要求される数を推定
   */
  private estimateRequiredCount(question: string): number {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('top 10') || lowerQuestion.includes('トップ10')) {
      return 10;
    }
    if (lowerQuestion.includes('top 5') || lowerQuestion.includes('トップ5')) {
      return 5;
    }
    if (lowerQuestion.includes('top 3') || lowerQuestion.includes('トップ3')) {
      return 3;
    }
    if (lowerQuestion.includes('all') || lowerQuestion.includes('すべて')) {
      return 5; // 「すべて」は少なくとも5つ
    }
    if (
      lowerQuestion.includes('list') ||
      lowerQuestion.includes('examples') ||
      lowerQuestion.includes('一覧')
    ) {
      return 3;
    }

    return 2; // デフォルト
  }

  /**
   * 回答内のアイテム数をカウント
   */
  private countItems(answer: string): number {
    // 番号付きリストをカウント
    const numberedMatches = answer.match(/^\d+[.)\]]/gm);
    if (numberedMatches && numberedMatches.length > 1) {
      return numberedMatches.length;
    }

    // 箇条書きをカウント
    const bulletMatches = answer.match(/^[-*•]/gm);
    if (bulletMatches && bulletMatches.length > 1) {
      return bulletMatches.length;
    }

    // カンマ区切りをカウント
    const commaItems = answer.split(',').length;
    if (commaItems > 2) {
      return commaItems;
    }

    return 1;
  }

  /**
   * 網羅性チェック
   */
  private evaluateCompleteness(
    question: string,
    answer: string,
    _knowledge: KnowledgeItem[]
  ): EvaluationResponse {
    // 質問から期待されるアスペクトを抽出
    const expectedAspects = this.extractExpectedAspects(question);

    // 回答から提供されたアスペクトを抽出
    const providedAspects = this.extractProvidedAspects(answer);

    // カバー率を計算
    const coveredCount = expectedAspects.filter((aspect) =>
      providedAspects.some((p) => this.aspectMatches(aspect, p))
    ).length;

    const coverageRatio = expectedAspects.length > 0 ? coveredCount / expectedAspects.length : 1;

    if (coverageRatio < 0.7) {
      return {
        pass: false,
        think: `The answer covers only ${Math.round(coverageRatio * 100)}% of expected aspects.`,
        type: 'completeness',
        completenessAnalysis: {
          aspectsExpected: expectedAspects.join(', '),
          aspectsProvided: providedAspects.join(', '),
        },
        improvementPlan: `Include information about: ${expectedAspects
          .filter((a) => !providedAspects.some((p) => this.aspectMatches(a, p)))
          .join(', ')}`,
      };
    }

    return {
      pass: true,
      think: `Answer covers ${Math.round(coverageRatio * 100)}% of expected aspects.`,
      type: 'completeness',
      completenessAnalysis: {
        aspectsExpected: expectedAspects.join(', '),
        aspectsProvided: providedAspects.join(', '),
      },
    };
  }

  /**
   * 回答から提供されたアスペクトを抽出
   */
  private extractProvidedAspects(answer: string): string[] {
    const aspects: string[] = [];
    const lowerAnswer = answer.toLowerCase();

    // 定義系
    if (
      lowerAnswer.includes('is a') ||
      lowerAnswer.includes('is the') ||
      lowerAnswer.includes('refers to') ||
      lowerAnswer.includes('とは')
    ) {
      aspects.push('definition');
    }

    // 例
    if (
      lowerAnswer.includes('for example') ||
      lowerAnswer.includes('such as') ||
      lowerAnswer.includes('例えば') ||
      lowerAnswer.includes('など')
    ) {
      aspects.push('examples');
    }

    // 重要性
    if (
      lowerAnswer.includes('important') ||
      lowerAnswer.includes('significant') ||
      lowerAnswer.includes('重要') ||
      lowerAnswer.includes('大切')
    ) {
      aspects.push('importance');
    }

    // メリット
    if (
      lowerAnswer.includes('advantage') ||
      lowerAnswer.includes('benefit') ||
      lowerAnswer.includes('メリット') ||
      lowerAnswer.includes('利点')
    ) {
      aspects.push('advantages');
    }

    // デメリット
    if (
      lowerAnswer.includes('disadvantage') ||
      lowerAnswer.includes('drawback') ||
      lowerAnswer.includes('デメリット') ||
      lowerAnswer.includes('欠点')
    ) {
      aspects.push('disadvantages');
    }

    // 類似点
    if (
      lowerAnswer.includes('similar') ||
      lowerAnswer.includes('same') ||
      lowerAnswer.includes('共通') ||
      lowerAnswer.includes('類似')
    ) {
      aspects.push('similarities');
    }

    // 相違点
    if (
      lowerAnswer.includes('different') ||
      lowerAnswer.includes('unlike') ||
      lowerAnswer.includes('違い') ||
      lowerAnswer.includes('異なる')
    ) {
      aspects.push('differences');
    }

    // ステップ
    if (
      lowerAnswer.includes('step') ||
      lowerAnswer.includes('first') ||
      lowerAnswer.includes('then') ||
      lowerAnswer.includes('ステップ') ||
      lowerAnswer.includes('まず')
    ) {
      aspects.push('steps');
    }

    // 要件
    if (
      lowerAnswer.includes('require') ||
      lowerAnswer.includes('need') ||
      lowerAnswer.includes('必要') ||
      lowerAnswer.includes('要件')
    ) {
      aspects.push('requirements');
    }

    // ヒント
    if (
      lowerAnswer.includes('tip') ||
      lowerAnswer.includes('hint') ||
      lowerAnswer.includes('advice') ||
      lowerAnswer.includes('ヒント') ||
      lowerAnswer.includes('コツ')
    ) {
      aspects.push('tips');
    }

    // メインポイントは常にチェック
    if (answer.length > 50) {
      aspects.push('main_point');
    }

    return aspects;
  }

  /**
   * アスペクトがマッチするかチェック
   */
  private aspectMatches(expected: string, provided: string): boolean {
    return expected === provided;
  }
}
