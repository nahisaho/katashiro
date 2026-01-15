/**
 * Deep Research Agent モジュール
 *
 * jina-ai/node-DeepResearch風の反復型リサーチエージェント
 *
 * @requirement REQ-DR-001 ~ REQ-DR-009
 * @design DES-v2.1.0-DeepResearchAgent
 *
 * @example
 * ```typescript
 * import {
 *   DeepResearchAgent,
 *   AgentConfig,
 *   AgentResearchResult,
 * } from '@nahisaho/katashiro-analyzer/research/agent';
 *
 * const agent = new DeepResearchAgent({
 *   llmClient,
 *   searchClient,
 *   scraper,
 *   config: {
 *     maxSteps: 30,
 *     tokenBudget: 500000,
 *   },
 * });
 *
 * // イベントリスナーを登録
 * agent.on((event) => {
 *   console.log(`[${event.type}]`, event.data);
 * });
 *
 * // リサーチを実行
 * const result = await agent.research('What is the impact of AI on healthcare?');
 *
 * console.log('Answer:', result.answer);
 * console.log('Steps:', result.steps.length);
 * console.log('Knowledge Items:', result.knowledgeItems.length);
 * ```
 */

// メインエージェント
export { DeepResearchAgent } from './DeepResearchAgent.js';
export type {
  DeepResearchAgentOptions,
  AgentEvent,
  AgentEventType,
  AgentEventListener,
} from './DeepResearchAgent.js';

// 型定義（明示的にエクスポート）
export type {
  LLMClientInterface,
  ActionType,
  SearchProvider,
  QuestionType,
  ActionFlags,
  TokenUsage,
  Reference,
  WeightedUrl,
  KnowledgeItem,
  SearchParams,
  VisitParams,
  ReflectParams,
  AnswerParams,
  CodingParams,
  ActionParams,
  StepDecision,
  StepAction,
  ActionResultBase,
  SearchActionResult,
  VisitActionResult,
  ReflectActionResult,
  AnswerActionResult,
  CodingActionResult,
  ActionResultType,
  ActionContext,
  DeepResearchAgentConfig,
  ResearchOptions,
  AgentConfig,
  AgentResearchResult,
} from './types.js';

export { DEFAULT_DEEP_RESEARCH_AGENT_CONFIG } from './types.js';

// コンポーネント
export { TokenTracker } from './TokenTracker.js';
export type { TokenTrackerOptions } from './TokenTracker.js';

export { KnowledgeStore } from './KnowledgeStore.js';

export { AnswerEvaluator } from './AnswerEvaluator.js';
export type {
  AnswerEvaluatorOptions,
  EvaluationResponse,
  QuestionAnalysis,
} from './AnswerEvaluator.js';

export { ActionTracker } from './ActionTracker.js';

export { ActionRouter } from './ActionRouter.js';
export type {
  ActionRouterOptions,
  DecisionContext,
} from './ActionRouter.js';

export { QueryRewriter } from './QueryRewriter.js';
export type {
  QueryRewriterOptions,
  RewriteResult,
  IntentLayer,
} from './QueryRewriter.js';

// アクションハンドラ（明示的にエクスポート）
export { BaseActionHandler } from './actions/BaseActionHandler.js';
export type {
  ActionResult,
  ActionHandlerOptions,
  IActionHandler,
  ExecutionContext,
} from './actions/BaseActionHandler.js';

export { SearchActionHandler } from './actions/SearchActionHandler.js';
export { VisitActionHandler } from './actions/VisitActionHandler.js';
export { ReflectActionHandler } from './actions/ReflectActionHandler.js';
export { AnswerActionHandler } from './actions/AnswerActionHandler.js';
export { CodingActionHandler } from './actions/CodingActionHandler.js';
export type {
  CodingActionHandlerOptions,
  CodeExecutor,
} from './actions/CodingActionHandler.js';
