/**
 * ActionRouter - 次のアクション決定ロジック
 *
 * @requirement REQ-DR-001
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type {
  LLMClientInterface,
  ActionType,
  StepDecision,
  KnowledgeItem,
  AgentConfig,
  SearchParams,
  VisitParams,
  ReflectParams,
  AnswerParams,
  CodingParams,
  EvaluationResponse,
  QuestionType,
} from './types.js';
import type { TokenTracker } from './TokenTracker.js';
import type { ActionTracker } from './ActionTracker.js';

/**
 * アクションルーターのオプション
 */
export interface ActionRouterOptions {
  /** LLMクライアント */
  llmClient: LLMClientInterface;
  /** エージェント設定 */
  config: AgentConfig;
  /** トークントラッカー */
  tokenTracker: TokenTracker;
  /** アクショントラッカー */
  actionTracker: ActionTracker;
}

/**
 * 決定コンテキスト
 */
export interface DecisionContext {
  /** 元の質問 */
  question: string;
  /** 質問タイプ */
  questionType: QuestionType;
  /** 現在のナレッジアイテム */
  knowledge: KnowledgeItem[];
  /** 訪問済みURL */
  visitedUrls: string[];
  /** 検索結果から得たURL候補 */
  searchResultUrls: { index: number; url: string; title: string }[];
  /** 直近の回答評価（あれば） */
  lastEvaluation?: EvaluationResponse;
  /** 現在のステップ番号 */
  stepNumber: number;
  /** Beastモード有効 */
  beastMode?: boolean;
  /** サブ質問（reflectアクションから生成） */
  subQuestions?: string[];
  /** 回答済みサブ質問 */
  answeredSubQuestions?: string[];
}

/**
 * 次のアクションを決定するルーター
 *
 * jina-aiの実装を参考に、以下の5アクションをサポート：
 * - search: Web検索
 * - visit: URLアクセス
 * - reflect: サブ質問への分解
 * - answer: 回答生成
 * - coding: コード実行（計算・データ処理）
 */
export class ActionRouter {
  private llmClient: LLMClientInterface;
  private config: AgentConfig;
  private tokenTracker: TokenTracker;
  private actionTracker: ActionTracker;

  constructor(options: ActionRouterOptions) {
    this.llmClient = options.llmClient;
    this.config = options.config;
    this.tokenTracker = options.tokenTracker;
    this.actionTracker = options.actionTracker;
  }

  /**
   * 次のアクションを決定
   */
  async decide(context: DecisionContext): Promise<StepDecision> {
    // Beastモードの場合は強制的に回答
    if (context.beastMode) {
      return this.createAnswerDecision(context, true);
    }

    // トークン予算超過の場合は回答を強制
    if (this.tokenTracker.isExceeded()) {
      return this.createAnswerDecision(context, true);
    }

    // 最大ステップ数超過の場合も回答を強制
    if (context.stepNumber >= this.config.maxSteps) {
      return this.createAnswerDecision(context, true);
    }

    // パターン検出（ループや進捗なし）
    const pattern = this.actionTracker.detectPattern();
    if (pattern.stuckInLoop || pattern.noProgress) {
      return this.createAnswerDecision(context, true);
    }

    // LLMに次のアクションを決定させる
    return this.askLLMForDecision(context);
  }

  /**
   * LLMに次のアクションを問い合わせ
   */
  private async askLLMForDecision(context: DecisionContext): Promise<StepDecision> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    const response = await this.llmClient.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    // トークン使用量を追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    // レスポンスをパース
    return this.parseDecisionResponse(response.content, context);
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(): string {
    return `You are a research agent that decides the next action to take to answer a user's question.

Available actions:
1. **search** - Search the web for information. Use when you need to find new information.
   Parameters: searchQueries (array of 1-5 search queries)

2. **visit** - Visit specific URLs to extract information. Use when you have promising URLs from search results.
   Parameters: urlTargets (array of URL indices to visit)

3. **reflect** - Break down the question into sub-questions. Use when the question is complex.
   Parameters: questions (array of sub-questions)

4. **answer** - Provide an answer based on gathered knowledge. Use when you have enough information.
   Parameters: answer (the answer text), references (cited sources)

5. **coding** - Execute code for calculations or data processing. Use for math, dates, or data analysis.
   Parameters: codingIssue (description of what to compute), code (Python code to execute)

Decision Guidelines:
- Start with **search** if you have no knowledge about the topic
- Use **visit** to get detailed information from promising search results
- Use **reflect** for complex questions that need to be broken down
- Use **answer** when you have sufficient information (at least 3-5 knowledge items)
- Use **coding** for calculations, date computations, or data analysis

Respond in JSON format:
{
  "think": "Your reasoning for this decision",
  "action": "search|visit|reflect|answer|coding",
  "params": { ... }
}`;
  }

  /**
   * ユーザープロンプトを構築
   */
  private buildUserPrompt(context: DecisionContext): string {
    const parts: string[] = [];

    // 元の質問
    parts.push(`## Question\n${context.question}`);
    parts.push(`Question Type: ${context.questionType}`);

    // 現在のナレッジ
    if (context.knowledge.length > 0) {
      parts.push(`\n## Current Knowledge (${context.knowledge.length} items)`);
      for (const item of context.knowledge.slice(-10)) {
        // 直近10件
        parts.push(`- [${item.id}] ${item.summary.slice(0, 200)}...`);
      }
    } else {
      parts.push('\n## Current Knowledge\nNo knowledge gathered yet.');
    }

    // 検索結果からのURL候補
    if (context.searchResultUrls.length > 0) {
      parts.push(`\n## Available URLs from Search`);
      for (const url of context.searchResultUrls.slice(0, 10)) {
        const visited = context.visitedUrls.includes(url.url) ? ' (visited)' : '';
        parts.push(`[${url.index}] ${url.title}${visited}\n    ${url.url}`);
      }
    }

    // ダイアリーコンテキスト
    const diary = this.actionTracker.getDiaryContext();
    if (diary.length > 0) {
      parts.push(`\n## Previous Actions`);
      parts.push(diary.slice(-5).join('\n')); // 直近5件
    }

    // 直近の評価結果
    if (context.lastEvaluation) {
      parts.push(`\n## Last Answer Evaluation`);
      parts.push(`Pass: ${context.lastEvaluation.pass}`);
      if (!context.lastEvaluation.pass) {
        parts.push(`Missing: ${context.lastEvaluation.think}`);
      }
    }

    // サブ質問
    if (context.subQuestions && context.subQuestions.length > 0) {
      parts.push(`\n## Sub-questions to Answer`);
      for (const q of context.subQuestions) {
        const answered = context.answeredSubQuestions?.includes(q) ? ' ✓' : '';
        parts.push(`- ${q}${answered}`);
      }
    }

    // 残りトークン予算
    const remaining = this.tokenTracker.getRemainingBudget();
    const usageRatio = this.tokenTracker.getUsageRatio();
    parts.push(`\n## Token Budget`);
    parts.push(`Remaining: ${remaining} tokens (${((1 - usageRatio) * 100).toFixed(1)}%)`);

    parts.push(`\n## Current Step: ${context.stepNumber + 1}/${this.config.maxSteps}`);
    parts.push('\nDecide the next action:');

    return parts.join('\n');
  }

  /**
   * LLMレスポンスをパース
   */
  private parseDecisionResponse(response: string, context: DecisionContext): StepDecision {
    try {
      // JSON部分を抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        think: string;
        action: ActionType;
        params: Record<string, unknown>;
      };

      // アクションタイプを検証
      const validActions: ActionType[] = ['search', 'visit', 'reflect', 'answer', 'coding'];
      if (!validActions.includes(parsed.action)) {
        throw new Error(`Invalid action: ${parsed.action}`);
      }

      // パラメータを正規化
      const params = this.normalizeParams(parsed.action, parsed.params, context);

      return {
        think: parsed.think || 'Proceeding with action',
        action: parsed.action,
        params,
      };
    } catch (error) {
      // パース失敗時はデフォルトアクションを返す
      console.warn('Failed to parse decision response:', error);
      return this.createDefaultDecision(context);
    }
  }

  /**
   * パラメータを正規化
   */
  private normalizeParams(
    action: ActionType,
    params: Record<string, unknown>,
    context: DecisionContext
  ): SearchParams | VisitParams | ReflectParams | AnswerParams | CodingParams {
    switch (action) {
      case 'search':
        return {
          searchQueries: Array.isArray(params.searchQueries)
            ? (params.searchQueries as string[]).slice(0, 5)
            : [context.question],
        } as SearchParams;

      case 'visit':
        return {
          urlTargets: Array.isArray(params.urlTargets)
            ? (params.urlTargets as number[]).slice(0, 5)
            : [0],
        } as VisitParams;

      case 'reflect':
        return {
          questions: Array.isArray(params.questions)
            ? (params.questions as string[]).slice(0, 5)
            : [`What are the key aspects of: ${context.question}`],
        } as ReflectParams;

      case 'answer':
        return {
          answer: typeof params.answer === 'string' ? params.answer : '',
          references: Array.isArray(params.references)
            ? (params.references as string[])
            : [],
          isFinal: params.isFinal as boolean | undefined,
        } as AnswerParams;

      case 'coding':
        return {
          codingIssue: typeof params.codingIssue === 'string' ? params.codingIssue : '',
          code: typeof params.code === 'string' ? params.code : '',
        } as CodingParams;

      default:
        return { searchQueries: [context.question] } as SearchParams;
    }
  }

  /**
   * 回答決定を生成
   */
  private createAnswerDecision(context: DecisionContext, forced: boolean): StepDecision {
    const reason = forced
      ? 'Forced to answer due to constraints (budget/steps/loop)'
      : 'Sufficient information gathered to answer';

    // ナレッジから回答を生成する基盤を準備
    const knowledgeSummary = context.knowledge
      .map((k) => k.summary)
      .join('\n')
      .slice(0, 5000);

    return {
      think: reason,
      action: 'answer',
      params: {
        answer: `Based on the gathered information:\n\n${knowledgeSummary || 'No information available.'}`,
        references: context.knowledge.map((k) => k.sourceId),
        isFinal: forced,
      } as AnswerParams,
    };
  }

  /**
   * デフォルト決定を生成（パース失敗時）
   */
  private createDefaultDecision(context: DecisionContext): StepDecision {
    // ナレッジがない場合は検索
    if (context.knowledge.length === 0) {
      return {
        think: 'Starting with a web search to gather initial information',
        action: 'search',
        params: { searchQueries: [context.question] } as SearchParams,
      };
    }

    // 未訪問URLがある場合は訪問
    const unvisitedUrls = context.searchResultUrls.filter(
      (u) => !context.visitedUrls.includes(u.url)
    );
    if (unvisitedUrls.length > 0) {
      return {
        think: 'Visiting unread URLs to gather more information',
        action: 'visit',
        params: { urlTargets: unvisitedUrls.slice(0, 3).map((u) => u.index) } as VisitParams,
      };
    }

    // 十分なナレッジがある場合は回答
    return this.createAnswerDecision(context, false);
  }
}
