/**
 * DeepResearchAgent Types
 *
 * @requirement REQ-DR-001, REQ-DR-003, REQ-DR-004
 * @design DES-v2.1.0-DeepResearchAgent
 */

/**
 * LLMクライアントインターフェース
 * 
 * DeepResearchAgent内で使用するLLMクライアントの共通インターフェース
 */
export interface LLMClientInterface {
  /**
   * チャット形式でテキスト生成
   */
  chat(options: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
    };
  }>;
}

/**
 * アクションタイプ
 */
export type ActionType = 'search' | 'visit' | 'reflect' | 'answer' | 'coding';

/**
 * 検索プロバイダー
 */
export type SearchProvider = 'duckduckgo' | 'brave' | 'serper' | 'jina' | 'searxng';

/**
 * 質問タイプ
 */
export type QuestionType =
  | 'factual'
  | 'exploratory'
  | 'comparative'
  | 'causal'
  | 'procedural'
  | 'evaluative'
  | 'howto'
  | 'why'
  | 'comparison'
  | 'list';

/**
 * アクション許可フラグ
 */
export interface ActionFlags {
  allowSearch: boolean;
  allowVisit: boolean;
  allowReflect: boolean;
  allowAnswer: boolean;
  allowCoding: boolean;
}

/**
 * トークン使用量
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 参照情報
 */
export interface Reference {
  url: string;
  title: string;
  exactQuote?: string;
  dateTime?: string;
  relevanceScore?: number;
  answerChunk?: string;
}

/**
 * 重み付きURL
 */
export interface WeightedUrl {
  url: string;
  title: string;
  snippet: string;
  weight: number;
  source: string;
  visited?: boolean;
}

/**
 * ナレッジアイテム
 */
export interface KnowledgeItem {
  id: string;
  sourceId: string;
  sourceType: 'web' | 'code' | 'reflection';
  summary: string;
  content: string;
  keywords: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
  // 後方互換性のためのエイリアス
  question?: string;
  answer?: string;
  type?: 'url' | 'side-info' | 'user-provided' | 'computed';
  updated?: string;
  confidence?: number;
  references?: string[];
}

/**
 * 検索パラメータ
 */
export interface SearchParams {
  searchQueries: string[];
}

/**
 * 訪問パラメータ
 */
export interface VisitParams {
  urlTargets: number[];
}

/**
 * リフレクションパラメータ
 */
export interface ReflectParams {
  questions: string[];
}

/**
 * 回答パラメータ
 */
export interface AnswerParams {
  answer: string;
  references: string[];
  isFinal?: boolean;
}

/**
 * コーディングパラメータ
 */
export interface CodingParams {
  codingIssue: string;
  code?: string;
}

/**
 * 各アクションのパラメータ（後方互換性）
 */
export interface ActionParams {
  search: SearchParams;
  visit: VisitParams;
  reflect: ReflectParams;
  answer: { answer: string; references: Reference[]; isFinal?: boolean };
  coding: CodingParams;
}

/**
 * ステップの決定
 */
export interface StepDecision {
  think: string;
  action: ActionType;
  params: SearchParams | VisitParams | ReflectParams | AnswerParams | CodingParams;
}

/**
 * 実行されたステップ
 */
export interface StepAction {
  stepNumber: number;
  action: ActionType;
  think: string;
  params: SearchParams | VisitParams | ReflectParams | AnswerParams | CodingParams;
  timestamp: string;
  success: boolean;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * アクション結果の基底型
 */
export interface ActionResultBase {
  success: boolean;
  message?: string;
}

/**
 * 検索アクション結果
 */
export interface SearchActionResult extends ActionResultBase {
  newKnowledge: KnowledgeItem[];
  newUrls: WeightedUrl[];
  searchedQueries: string[];
}

/**
 * 訪問アクション結果
 */
export interface VisitActionResult extends ActionResultBase {
  visitedUrls: string[];
  newKnowledge: KnowledgeItem[];
  failedUrls: string[];
}

/**
 * 振り返りアクション結果
 */
export interface ReflectActionResult extends ActionResultBase {
  newQuestions: string[];
  duplicateQuestions: string[];
}

/**
 * 回答アクション結果
 */
export interface AnswerActionResult extends ActionResultBase {
  evaluation: EvaluationResponse;
  isFinal: boolean;
}

/**
 * コーディングアクション結果
 */
export interface CodingActionResult extends ActionResultBase {
  output: string;
  error?: string;
}

/**
 * アクション結果のユニオン型
 */
export type ActionResultType =
  | SearchActionResult
  | VisitActionResult
  | ReflectActionResult
  | AnswerActionResult
  | CodingActionResult;

/**
 * 評価タイプ
 */
export type EvaluationType =
  | 'definitive'
  | 'freshness'
  | 'plurality'
  | 'completeness'
  | 'attribution';

/**
 * 評価レスポンス
 */
export interface EvaluationResponse {
  pass: boolean;
  think: string;
  type?: EvaluationType;
  freshnessAnalysis?: {
    daysAgo: number;
    maxAgeDays?: number;
  };
  pluralityAnalysis?: {
    minimumCountRequired: number;
    actualCountProvided: number;
  };
  completenessAnalysis?: {
    aspectsExpected: string;
    aspectsProvided: string;
  };
  improvementPlan?: string;
}

/**
 * リサーチ完了理由
 */
export type CompletionReason =
  | 'answered'
  | 'budget_exceeded'
  | 'max_attempts'
  | 'max_steps'
  | 'timeout'
  | 'user_stopped';

/**
 * エージェント設定
 */
export interface AgentConfig {
  /** トークン予算 */
  tokenBudget: number;
  /** 最大ステップ数 */
  maxSteps: number;
  /** 最大失敗試行回数 */
  maxBadAttempts: number;
  /** 検索オプション */
  searchOptions?: {
    providers?: SearchProvider[];
    maxResultsPerQuery?: number;
  };
  /** Beastモード設定 */
  beastMode?: {
    enabled: boolean;
    threshold: number;
  };
  /** 言語設定 */
  language?: string;
  /** デバッグモード */
  debug?: boolean;
}

/**
 * リサーチ結果
 */
export interface AgentResearchResult {
  question: string;
  answer: string;
  references: string[];
  knowledgeItems: KnowledgeItem[];
  steps: StepAction[];
  evaluation?: EvaluationResponse;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    budget: number;
    remaining: number;
  };
  metadata: {
    durationMs: number;
    stepCount: number;
    beastModeUsed: boolean;
    questionType: QuestionType;
    complexityScore: number;
  };
}

/**
 * 後方互換性のための旧AgentResearchResult
 */
export interface LegacyAgentResearchResult {
  answer: string;
  references: Reference[];
  knowledge: KnowledgeItem[];
  steps: StepAction[];
  tokenUsage: TokenUsage;
  completionReason: CompletionReason;
  totalSteps: number;
  badAttempts: number;
  duration: number;
}

/**
 * リサーチステップ（ストリーミング用）
 */
export interface ResearchStep {
  stepNumber: number;
  action: ActionType;
  think: string;
  status: 'executing' | 'completed' | 'failed';
  details?: string;
  tokenUsage?: TokenUsage;
}

/**
 * アクションコンテキスト
 */
export interface ActionContext {
  question: string;
  currentQuestion: string;
  knowledge: KnowledgeItem[];
  urlList: WeightedUrl[];
  diaryContext: string[];
  previousSteps: StepAction[];
  gaps: string[];
  visitedUrls: string[];
  badUrls: string[];
  allKeywords: string[];
}

/**
 * DeepResearchAgent設定
 */
export interface DeepResearchAgentConfig {
  // トークン予算
  tokenBudget: number;
  reserveFinalRatio: number;

  // 試行回数制限
  maxBadAttempts: number;
  maxSteps: number;

  // 検索設定
  searchProvider: SearchProvider;
  maxQueriesPerStep: number;
  maxUrlsPerStep: number;

  // 評価設定
  minRelevanceScore: number;
  maxReferences: number;

  // チームリサーチ
  teamSize: number;

  // タイムアウト
  stepTimeout: number;
  totalTimeout: number;

  // 言語設定
  languageCode?: string;
  searchLanguageCode?: string;

  // Beastモード
  beastModeEnabled: boolean;
  beastModeThreshold: number;

  // デバッグ
  debug: boolean;
}

/**
 * リサーチオプション
 */
export interface ResearchOptions {
  // 初期メッセージ
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;

  // ホスト名フィルタ
  boostHostnames?: string[];
  badHostnames?: string[];
  onlyHostnames?: string[];

  // 直接回答を禁止（必ず検索を実行）
  noDirectAnswer?: boolean;

  // 画像を含める
  withImages?: boolean;

  // 部分設定の上書き
  config?: Partial<DeepResearchAgentConfig>;
}

/**
 * クエリリライト結果
 */
export interface RewrittenQuery {
  q: string;
  tbs?: 'qdr:h' | 'qdr:d' | 'qdr:w' | 'qdr:m' | 'qdr:y';
  location?: string;
}

/**
 * 意図分析結果
 */
export interface IntentAnalysis {
  surface: string;
  practical: string;
  emotional?: string;
  social?: string;
  identity?: string;
}

/**
 * Webコンテンツ
 */
export interface WebContent {
  url: string;
  title: string;
  content: string;
  chunks?: string[];
  extractedAt: string;
}

/**
 * ダイアリーエントリ
 */
export interface DiaryEntry {
  step: number;
  action: ActionType;
  question: string;
  details: string;
  result: 'success' | 'partial' | 'failure';
  notes?: string;
}

/**
 * デフォルトのAgentConfig
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  tokenBudget: 1_000_000,
  maxSteps: 50,
  maxBadAttempts: 3,
  searchOptions: {
    providers: ['duckduckgo'],
    maxResultsPerQuery: 10,
  },
  beastMode: {
    enabled: true,
    threshold: 0.15,
  },
  language: 'en',
  debug: false,
};

/**
 * デフォルト設定（後方互換性）
 */
export const DEFAULT_DEEP_RESEARCH_AGENT_CONFIG: DeepResearchAgentConfig = {
  tokenBudget: 1_000_000,
  reserveFinalRatio: 0.15,
  maxBadAttempts: 3,
  maxSteps: 50,
  searchProvider: 'duckduckgo',
  maxQueriesPerStep: 3,
  maxUrlsPerStep: 5,
  minRelevanceScore: 0.8,
  maxReferences: 10,
  teamSize: 1,
  stepTimeout: 30000,
  totalTimeout: 600000,
  beastModeEnabled: true,
  beastModeThreshold: 0.15,
  debug: false,
};
