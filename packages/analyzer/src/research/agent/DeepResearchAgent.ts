/**
 * DeepResearchAgent - jina-ai風の反復型リサーチエージェント
 *
 * @requirement REQ-DR-001
 * @requirement REQ-DR-002
 * @requirement REQ-DR-003
 * @requirement REQ-DR-004
 * @requirement REQ-DR-005
 * @requirement REQ-DR-007
 * @requirement REQ-DR-008
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { WebSearchClient, WebScraper } from '@nahisaho/katashiro-collector';
import type {
  LLMClientInterface,
  ActionType,
  AgentConfig,
  AgentResearchResult,
  StepAction,
  SearchParams,
  VisitParams,
  ReflectParams,
  AnswerParams,
  CodingParams,
} from './types.js';
import { DEFAULT_AGENT_CONFIG } from './types.js';
import { TokenTracker } from './TokenTracker.js';
import { KnowledgeStore } from './KnowledgeStore.js';
import { AnswerEvaluator, type EvaluationResponse } from './AnswerEvaluator.js';
import { ActionTracker } from './ActionTracker.js';
import { ActionRouter, type DecisionContext } from './ActionRouter.js';
import { QueryRewriter } from './QueryRewriter.js';
import {
  SearchActionHandler,
  VisitActionHandler,
  ReflectActionHandler,
  AnswerActionHandler,
  CodingActionHandler,
  type ExecutionContext,
  type ActionResult,
  type CodeExecutor,
} from './actions/index.js';

/**
 * イベントタイプ
 */
export type AgentEventType =
  | 'researchStarted'
  | 'stepStarted'
  | 'stepCompleted'
  | 'actionExecuted'
  | 'answerEvaluated'
  | 'beastModeActivated'
  | 'researchCompleted'
  | 'error';

/**
 * イベントデータ
 */
export interface AgentEvent {
  type: AgentEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * イベントリスナー
 */
export type AgentEventListener = (event: AgentEvent) => void;

/**
 * DeepResearchAgentのオプション
 */
export interface DeepResearchAgentOptions {
  /** LLMクライアント */
  llmClient: LLMClientInterface;
  /** Web検索クライアント */
  searchClient: WebSearchClient;
  /** Webスクレイパー */
  scraper: WebScraper;
  /** コードエグゼキューター（オプション） */
  codeExecutor?: CodeExecutor;
  /** エージェント設定（オプション） */
  config?: Partial<AgentConfig>;
}

/**
 * jina-ai/node-DeepResearch風の反復型リサーチエージェント
 *
 * 5つのアクションタイプをサポート：
 * - search: Web検索
 * - visit: URLアクセス
 * - reflect: サブ質問への分解
 * - answer: 回答生成
 * - coding: コード実行
 *
 * @example
 * ```typescript
 * const agent = new DeepResearchAgent({
 *   llmClient,
 *   searchClient,
 *   scraper,
 * });
 *
 * agent.on((event) => {
 *   console.log(`[${event.type}]`, event.data);
 * });
 *
 * const result = await agent.research('What is the impact of AI on healthcare?');
 * console.log(result.answer);
 * ```
 */
export class DeepResearchAgent {
  private llmClient: LLMClientInterface;
  private searchClient: WebSearchClient;
  private scraper: WebScraper;
  private codeExecutor?: CodeExecutor;
  private config: AgentConfig;

  // 内部コンポーネント
  private tokenTracker!: TokenTracker;
  private knowledgeStore!: KnowledgeStore;
  private evaluator!: AnswerEvaluator;
  private actionTracker!: ActionTracker;
  private actionRouter!: ActionRouter;
  private queryRewriter!: QueryRewriter;

  // アクションハンドラ
  private searchHandler!: SearchActionHandler;
  private visitHandler!: VisitActionHandler;
  private reflectHandler!: ReflectActionHandler;
  private answerHandler!: AnswerActionHandler;
  private codingHandler!: CodingActionHandler;

  // 状態
  private currentStep: number = 0;
  private visitedUrls: string[] = [];
  private searchResultUrls: { index: number; url: string; title: string }[] = [];
  private subQuestions: string[] = [];
  private answeredSubQuestions: string[] = [];
  private lastEvaluation?: EvaluationResponse;
  private beastModeActivated: boolean = false;

  // イベントリスナー
  private eventListeners: AgentEventListener[] = [];

  constructor(options: DeepResearchAgentOptions) {
    this.llmClient = options.llmClient;
    this.searchClient = options.searchClient;
    this.scraper = options.scraper;
    this.codeExecutor = options.codeExecutor;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...options.config };
  }

  /**
   * リサーチを実行
   */
  async research(question: string): Promise<AgentResearchResult> {
    const startTime = Date.now();

    // コンポーネントを初期化
    this.initializeComponents();

    // 状態をリセット
    this.resetState();

    // イベント発行
    this.emitEvent('researchStarted', { question });

    try {
      // クエリを拡張
      const rewriteResult = await this.queryRewriter.rewrite(question);

      // メインループ
      while (this.currentStep < this.config.maxSteps && !this.tokenTracker.isExceeded()) {
        // イベント発行
        this.emitEvent('stepStarted', { step: this.currentStep + 1 });

        // 決定コンテキストを構築
        const decisionContext = this.buildDecisionContext(question, rewriteResult.questionType);

        // 次のアクションを決定
        const decision = await this.actionRouter.decide(decisionContext);

        // アクションを実行
        const result = await this.executeAction(decision.action, decision.params, question);

        // ステップを記録
        const stepAction: StepAction = {
          stepNumber: this.currentStep,
          action: decision.action,
          think: decision.think,
          params: decision.params,
          timestamp: new Date().toISOString(),
          success: result.success,
          error: result.error,
        };
        this.actionTracker.trackAction(stepAction);

        // ナレッジを追加
        for (const item of result.knowledgeItems) {
          this.knowledgeStore.add(item);
        }

        // URL情報を更新
        if (decision.action === 'search' && result.metadata?.urls) {
          this.searchResultUrls = result.metadata.urls as typeof this.searchResultUrls;
        }
        if (decision.action === 'visit' && result.metadata?.visitedUrls) {
          this.visitedUrls.push(...(result.metadata.visitedUrls as string[]));
        }

        // イベント発行
        this.emitEvent('actionExecuted', {
          action: decision.action,
          success: result.success,
          knowledgeCount: result.knowledgeItems.length,
        });

        // 回答アクションの場合、評価結果を保存
        if (decision.action === 'answer' && result.metadata?.evaluation) {
          this.lastEvaluation = result.metadata.evaluation as EvaluationResponse;
          this.emitEvent('answerEvaluated', {
            pass: this.lastEvaluation.pass,
            think: this.lastEvaluation.think,
          });

          // 評価に合格したら終了
          if (this.lastEvaluation.pass || result.metadata.isFinal) {
            break;
          }
        }

        // イベント発行
        this.emitEvent('stepCompleted', {
          step: this.currentStep + 1,
          action: decision.action,
          success: result.success,
        });

        this.currentStep++;

        // Beastモードチェック
        if (this.shouldActivateBeastMode()) {
          this.beastModeActivated = true;
          this.emitEvent('beastModeActivated', {
            reason: 'Token budget or step limit approaching',
          });
        }
      }

      // 最終回答を生成
      const finalAnswer = await this.generateFinalAnswer(question);
      const endTime = Date.now();

      // 結果を構築
      const result: AgentResearchResult = {
        question,
        answer: finalAnswer.answer,
        references: finalAnswer.references,
        knowledgeItems: this.knowledgeStore.getAll(),
        steps: this.actionTracker.getSteps(),
        evaluation: this.lastEvaluation,
        tokenUsage: {
          promptTokens: this.tokenTracker.getUsage().promptTokens,
          completionTokens: this.tokenTracker.getUsage().completionTokens,
          totalTokens: this.tokenTracker.getUsage().totalTokens,
          budget: this.config.tokenBudget,
          remaining: this.tokenTracker.getRemainingBudget(),
        },
        metadata: {
          durationMs: endTime - startTime,
          stepCount: this.currentStep,
          beastModeUsed: this.beastModeActivated,
          questionType: rewriteResult.questionType,
          complexityScore: rewriteResult.complexityScore,
        },
      };

      // イベント発行
      this.emitEvent('researchCompleted', {
        answer: finalAnswer.answer,
        stepCount: this.currentStep,
        durationMs: endTime - startTime,
      });

      return result;
    } catch (error) {
      // エラーイベント発行
      this.emitEvent('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * イベントリスナーを登録
   */
  on(listener: AgentEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * コンポーネントを初期化
   */
  private initializeComponents(): void {
    this.tokenTracker = new TokenTracker({ budget: this.config.tokenBudget });
    this.knowledgeStore = new KnowledgeStore();
    this.evaluator = new AnswerEvaluator({
      llmClient: this.llmClient,
      tokenTracker: this.tokenTracker,
    });
    this.actionTracker = new ActionTracker();
    this.actionRouter = new ActionRouter({
      llmClient: this.llmClient,
      config: this.config,
      tokenTracker: this.tokenTracker,
      actionTracker: this.actionTracker,
    });
    this.queryRewriter = new QueryRewriter({
      llmClient: this.llmClient,
      tokenTracker: this.tokenTracker,
    });

    // アクションハンドラを初期化
    const handlerOptions = {
      config: this.config,
      tokenTracker: this.tokenTracker,
    };

    this.searchHandler = new SearchActionHandler({
      ...handlerOptions,
      searchClient: this.searchClient,
    });
    this.visitHandler = new VisitActionHandler({
      ...handlerOptions,
      scraper: this.scraper,
    });
    this.reflectHandler = new ReflectActionHandler({
      ...handlerOptions,
      llmClient: this.llmClient,
    });
    this.answerHandler = new AnswerActionHandler({
      ...handlerOptions,
      llmClient: this.llmClient,
      evaluator: this.evaluator,
    });
    this.codingHandler = new CodingActionHandler({
      ...handlerOptions,
      codeExecutor: this.codeExecutor,
    });
  }

  /**
   * 状態をリセット
   */
  private resetState(): void {
    this.currentStep = 0;
    this.visitedUrls = [];
    this.searchResultUrls = [];
    this.subQuestions = [];
    this.answeredSubQuestions = [];
    this.lastEvaluation = undefined;
    this.beastModeActivated = false;
  }

  /**
   * 決定コンテキストを構築
   */
  private buildDecisionContext(
    question: string,
    questionType: string
  ): DecisionContext {
    return {
      question,
      questionType: questionType as DecisionContext['questionType'],
      knowledge: this.knowledgeStore.getAll(),
      visitedUrls: this.visitedUrls,
      searchResultUrls: this.searchResultUrls,
      lastEvaluation: this.lastEvaluation,
      stepNumber: this.currentStep,
      beastMode: this.beastModeActivated,
      subQuestions: this.subQuestions,
      answeredSubQuestions: this.answeredSubQuestions,
    };
  }

  /**
   * アクションを実行
   */
  private async executeAction(
    action: ActionType,
    params: SearchParams | VisitParams | ReflectParams | AnswerParams | CodingParams,
    question: string
  ): Promise<ActionResult> {
    const context: ExecutionContext = {
      question,
      stepNumber: this.currentStep,
      visitedUrls: this.visitedUrls,
      searchResultUrls: this.searchResultUrls,
      currentKnowledge: this.knowledgeStore.getAll(),
    };

    switch (action) {
      case 'search':
        return this.searchHandler.execute(params as SearchParams, context);
      case 'visit':
        return this.visitHandler.execute(params as VisitParams, context);
      case 'reflect':
        return this.reflectHandler.execute(params as ReflectParams, context);
      case 'answer':
        return this.answerHandler.execute(params as AnswerParams, context);
      case 'coding':
        return this.codingHandler.execute(params as CodingParams, context);
      default:
        return {
          success: false,
          knowledgeItems: [],
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Beastモードをアクティブにすべきかチェック
   */
  private shouldActivateBeastMode(): boolean {
    if (this.beastModeActivated) return false;

    const usageRatio = this.tokenTracker.getUsageRatio();
    const stepRatio = this.currentStep / this.config.maxSteps;

    // トークン予算の90%以上を使用、またはステップの90%以上を消費
    return usageRatio > 0.9 || stepRatio > 0.9;
  }

  /**
   * 最終回答を生成
   */
  private async generateFinalAnswer(
    question: string
  ): Promise<{ answer: string; references: string[] }> {
    const knowledge = this.knowledgeStore.getAll();

    if (this.beastModeActivated) {
      // Beastモード: 強制的に回答生成
      return this.answerHandler.generateForcedAnswer(question, knowledge);
    }

    // 通常の回答生成
    const params: AnswerParams = {
      answer: '',
      references: [],
      isFinal: true,
    };

    const context: ExecutionContext = {
      question,
      stepNumber: this.currentStep,
      visitedUrls: this.visitedUrls,
      searchResultUrls: this.searchResultUrls,
      currentKnowledge: knowledge,
    };

    const result = await this.answerHandler.execute(params, context);

    return {
      answer: (result.metadata?.answer as string) || 'Unable to generate answer',
      references: (result.metadata?.references as string[]) || [],
    };
  }

  /**
   * イベントを発行
   */
  private emitEvent(type: AgentEventType, data: Record<string, unknown>): void {
    const event: AgentEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}
