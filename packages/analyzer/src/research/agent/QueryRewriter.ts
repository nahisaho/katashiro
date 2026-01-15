/**
 * QueryRewriter - クエリ拡張・意図マイニング
 *
 * @requirement REQ-DR-002
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { LLMClientInterface, QuestionType } from './types.js';
import type { TokenTracker } from './TokenTracker.js';

/**
 * 意図マイニングの層
 */
export interface IntentLayer {
  /** 層の番号（1-5） */
  layer: number;
  /** 層の名前 */
  name: string;
  /** この層で抽出された意図 */
  intent: string;
  /** 生成されたサブクエリ */
  queries: string[];
}

/**
 * クエリ書き換え結果
 */
export interface RewriteResult {
  /** 元のクエリ */
  originalQuery: string;
  /** 拡張されたクエリのリスト */
  expandedQueries: string[];
  /** 意図マイニング結果 */
  intentLayers: IntentLayer[];
  /** 質問タイプ */
  questionType: QuestionType;
  /** 複雑さスコア（1-10） */
  complexityScore: number;
}

/**
 * クエリ書き換えオプション
 */
export interface QueryRewriterOptions {
  /** LLMクライアント */
  llmClient: LLMClientInterface;
  /** トークントラッカー */
  tokenTracker: TokenTracker;
  /** 最大クエリ数 */
  maxQueries?: number;
  /** 言語 */
  language?: string;
}

/**
 * jina-ai風の5層意図マイニングを実装するクエリリライター
 *
 * 5つの層：
 * 1. Surface Intent - 表面的な意図
 * 2. Deep Intent - 深層の意図
 * 3. Context Intent - 文脈的な意図
 * 4. Domain Intent - ドメイン固有の意図
 * 5. Meta Intent - メタ意図（なぜこの質問をしているか）
 */
export class QueryRewriter {
  private llmClient: LLMClientInterface;
  private tokenTracker: TokenTracker;
  private maxQueries: number;
  private languageCode: string;

  constructor(options: QueryRewriterOptions) {
    this.llmClient = options.llmClient;
    this.tokenTracker = options.tokenTracker;
    this.maxQueries = options.maxQueries ?? 10;
    this.languageCode = options.language ?? 'en';
  }

  /**
   * 言語コードを取得
   */
  get language(): string {
    return this.languageCode;
  }

  /**
   * クエリを拡張・書き換え
   */
  async rewrite(query: string): Promise<RewriteResult> {
    // 1. 質問タイプを分析
    const questionType = await this.analyzeQuestionType(query);

    // 2. 5層意図マイニング
    const intentLayers = await this.mineIntents(query, questionType);

    // 3. 拡張クエリを生成
    const expandedQueries = this.extractQueries(intentLayers);

    // 4. 複雑さスコアを計算
    const complexityScore = this.calculateComplexity(query, intentLayers);

    return {
      originalQuery: query,
      expandedQueries,
      intentLayers,
      questionType,
      complexityScore,
    };
  }

  /**
   * 質問タイプを分析
   */
  private async analyzeQuestionType(query: string): Promise<QuestionType> {
    const prompt = `Analyze the following question and determine its type.

Question: "${query}"

Question Types:
- FACTUAL: Questions seeking specific facts (who, what, when, where)
- EXPLORATORY: Questions seeking broad understanding
- COMPARATIVE: Questions comparing multiple items
- CAUSAL: Questions about cause and effect (why, how)
- PROCEDURAL: Questions about how to do something
- EVALUATIVE: Questions seeking judgment or opinion

Respond with only the type name (e.g., "FACTUAL").`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 50,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    const typeMap: Record<string, QuestionType> = {
      FACTUAL: 'factual',
      EXPLORATORY: 'exploratory',
      COMPARATIVE: 'comparative',
      CAUSAL: 'causal',
      PROCEDURAL: 'procedural',
      EVALUATIVE: 'evaluative',
    };

    const content = response.content.trim().toUpperCase();
    return typeMap[content] || 'exploratory';
  }

  /**
   * 5層意図マイニング
   */
  private async mineIntents(query: string, questionType: QuestionType): Promise<IntentLayer[]> {
    const prompt = `Perform 5-layer intent mining for the following question.

Question: "${query}"
Question Type: ${questionType}

Analyze the question at 5 different layers and generate search queries for each:

1. **Surface Intent**: What is the literal meaning of the question?
2. **Deep Intent**: What underlying information is the user really seeking?
3. **Context Intent**: What contextual knowledge is needed to fully answer?
4. **Domain Intent**: What domain-specific aspects should be explored?
5. **Meta Intent**: Why might the user be asking this question?

For each layer, provide:
- The intent (what the user wants)
- 2-3 search queries to gather relevant information

Respond in JSON format:
{
  "layers": [
    {
      "layer": 1,
      "name": "Surface Intent",
      "intent": "...",
      "queries": ["query1", "query2"]
    },
    ...
  ]
}`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 1500,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createDefaultIntentLayers(query);
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        layers: Array<{
          layer: number;
          name: string;
          intent: string;
          queries: string[];
        }>;
      };

      return parsed.layers.map((l) => ({
        layer: l.layer,
        name: l.name,
        intent: l.intent,
        queries: l.queries.slice(0, 3),
      }));
    } catch {
      return this.createDefaultIntentLayers(query);
    }
  }

  /**
   * デフォルトの意図層を生成
   */
  private createDefaultIntentLayers(query: string): IntentLayer[] {
    return [
      {
        layer: 1,
        name: 'Surface Intent',
        intent: `Direct answer to: ${query}`,
        queries: [query, `${query} definition`, `${query} explanation`],
      },
      {
        layer: 2,
        name: 'Deep Intent',
        intent: 'Understanding the core concept',
        queries: [`${query} details`, `${query} in depth`],
      },
      {
        layer: 3,
        name: 'Context Intent',
        intent: 'Related context and background',
        queries: [`${query} background`, `${query} history`],
      },
      {
        layer: 4,
        name: 'Domain Intent',
        intent: 'Domain-specific aspects',
        queries: [`${query} applications`, `${query} examples`],
      },
      {
        layer: 5,
        name: 'Meta Intent',
        intent: 'Practical implications',
        queries: [`${query} importance`, `${query} impact`],
      },
    ];
  }

  /**
   * 意図層からクエリを抽出
   */
  private extractQueries(layers: IntentLayer[]): string[] {
    const allQueries: string[] = [];

    for (const layer of layers) {
      allQueries.push(...layer.queries);
    }

    // 重複を除去して最大数に制限
    const unique = [...new Set(allQueries)];
    return unique.slice(0, this.maxQueries);
  }

  /**
   * 複雑さスコアを計算
   */
  private calculateComplexity(query: string, layers: IntentLayer[]): number {
    let score = 1;

    // クエリの長さ
    if (query.length > 100) score += 1;
    if (query.length > 200) score += 1;

    // 単語数
    const wordCount = query.split(/\s+/).length;
    if (wordCount > 10) score += 1;
    if (wordCount > 20) score += 1;

    // 疑問詞の数
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
    const questionWordCount = questionWords.filter((w) =>
      query.toLowerCase().includes(w)
    ).length;
    score += Math.min(questionWordCount, 2);

    // 意図層の多様性
    const uniqueIntents = new Set(layers.map((l) => l.intent)).size;
    if (uniqueIntents >= 4) score += 1;
    if (uniqueIntents >= 5) score += 1;

    return Math.min(score, 10);
  }

  /**
   * サブ質問を生成（reflectアクション用）
   */
  async generateSubQuestions(query: string, existingKnowledge: string[]): Promise<string[]> {
    const knowledgeContext =
      existingKnowledge.length > 0
        ? `\n\nExisting knowledge:\n${existingKnowledge.slice(0, 5).join('\n')}`
        : '';

    const prompt = `Generate 3-5 sub-questions to help answer the main question.

Main Question: "${query}"
${knowledgeContext}

Generate sub-questions that:
1. Break down the main question into smaller, answerable parts
2. Cover different aspects of the question
3. Are specific and focused
4. Avoid overlapping with existing knowledge

Respond with a JSON array of questions:
["sub-question 1", "sub-question 2", ...]`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 500,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.createDefaultSubQuestions(query);
      }

      const parsed = JSON.parse(jsonMatch[0]) as string[];
      return parsed.slice(0, 5);
    } catch {
      return this.createDefaultSubQuestions(query);
    }
  }

  /**
   * デフォルトのサブ質問を生成
   */
  private createDefaultSubQuestions(query: string): string[] {
    return [
      `What is the definition of ${this.extractMainTopic(query)}?`,
      `What are the key aspects of ${this.extractMainTopic(query)}?`,
      `What are the recent developments in ${this.extractMainTopic(query)}?`,
    ];
  }

  /**
   * クエリからメイントピックを抽出
   */
  private extractMainTopic(query: string): string {
    // 疑問詞と一般的な単語を除去
    const stopWords = [
      'what',
      'why',
      'how',
      'when',
      'where',
      'who',
      'which',
      'is',
      'are',
      'the',
      'a',
      'an',
      'of',
      'in',
      'to',
      'for',
      'about',
    ];

    const words = query
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter((w) => !stopWords.includes(w));

    // 最初の3語を結合
    return words.slice(0, 3).join(' ') || query.slice(0, 50);
  }

  /**
   * フォローアップクエリを生成
   */
  async generateFollowUpQueries(
    originalQuery: string,
    currentKnowledge: string[],
    gaps: string[]
  ): Promise<string[]> {
    const prompt = `Generate follow-up search queries to fill knowledge gaps.

Original Question: "${originalQuery}"

Current Knowledge Summary:
${currentKnowledge.slice(0, 5).join('\n')}

Identified Gaps:
${gaps.join('\n')}

Generate 3-5 specific search queries to fill these gaps.
Respond with a JSON array:
["query1", "query2", ...]`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 300,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as string[];
        return parsed.slice(0, 5);
      }
    } catch {
      // パース失敗
    }

    // ギャップからクエリを生成
    return gaps.slice(0, 3).map((gap) => `${originalQuery} ${gap}`);
  }
}
