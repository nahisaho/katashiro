/**
 * Deep Research Type Definitions
 * 
 * MUSUBIXを参考にした新設計
 * @version 3.0.0
 */

/**
 * Consulting Framework Type
 */
export type ConsultingFramework =
  | 'auto'         // Automatically select based on query
  | 'swot'         // Strengths, Weaknesses, Opportunities, Threats
  | '3c'           // Company, Customer, Competitor
  | '4p'           // Product, Price, Place, Promotion
  | '5forces'      // Porter's Five Forces
  | 'valuechain'   // Value Chain Analysis
  | 'pestel'       // Political, Economic, Social, Technological, Environmental, Legal
  | 'none';        // No framework (general research)

/**
 * Research Configuration
 */
export interface ResearchConfig {
  /** Research query */
  query: string;
  /** Maximum number of iterations (default: 10) */
  maxIterations?: number;
  /** Token budget for LM API calls (default: 15000) */
  tokenBudget?: number;
  /** Search provider configuration */
  providers?: ProviderConfig;
  /** Output format (default: 'markdown') */
  outputFormat?: 'markdown' | 'json';
  /** Language for search (default: 'ja') */
  language?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Consulting framework to use (default: 'auto') */
  framework?: ConsultingFramework;
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  /** Jina AI API Key (optional - free tier available) */
  jinaApiKey?: string;
  /** Brave Search API Key */
  braveApiKey?: string;
  /** DuckDuckGo region */
  duckduckgoRegion?: string;
}

/**
 * SERP Query
 */
export interface SERPQuery {
  /** Search keywords */
  keywords: string;
  /** Number of results to return (default: 10) */
  topK?: number;
  /** Timestamp of the query */
  timestamp: number;
  /** Iteration number */
  iteration: number;
}

/**
 * Search Result
 */
export interface SearchResult {
  /** Page title */
  title: string;
  /** Page URL */
  url: string;
  /** Snippet/description */
  snippet: string;
  /** Published date (if available) */
  date?: string;
  /** Relevance score (0-1) */
  relevance?: number;
}

/**
 * Web Content (extracted from URL)
 */
export interface WebContent {
  /** Source URL */
  url: string;
  /** Page title */
  title: string;
  /** Markdown content */
  content: string;
  /** Extracted facts */
  extractedFacts: string[];
  /** Word count */
  wordCount?: number;
  /** Extraction timestamp */
  extractedAt?: number;
}

/**
 * Web Read Request
 */
export interface WebReadRequest {
  /** URL to read */
  url: string;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Knowledge Item - Single piece of extracted knowledge
 */
export interface KnowledgeItem {
  /** Unique ID */
  id: string;
  /** Item type */
  type: 'fact' | 'opinion' | 'question' | 'recommendation';
  /** Content text */
  content: string;
  /** Source URLs */
  sources: string[];
  /** Relevance score (0-1) */
  relevance: number;
  /** Iteration number */
  iteration: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Reflective Question - Generated for deeper research
 */
export interface ReflectiveQuestion {
  /** Question text */
  question: string;
  /** Reason for asking */
  reason: string;
  /** Priority (1-5, higher = more important) */
  priority: number;
}

/**
 * Research Context (for LM reasoning)
 */
export interface ResearchContext {
  /** Research query */
  query: string;
  /** Current iteration */
  iteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Current knowledge base */
  knowledgeBase: KnowledgeItem[];
  /** Previous questions asked */
  previousQuestions: ReflectiveQuestion[];
}

/**
 * Finding - Key insight from research
 */
export interface Finding {
  /** Finding statement */
  statement: string;
  /** Supporting citations */
  citations: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Technical Option
 */
export interface TechnicalOption {
  /** Option name */
  name: string;
  /** Description */
  description: string;
  /** Pros */
  pros: string[];
  /** Cons */
  cons: string[];
  /** Use cases */
  useCases: string[];
}

/**
 * Recommendation
 */
export interface Recommendation {
  /** Recommendation text */
  recommendation: string;
  /** Rationale */
  rationale: string;
  /** Priority (1-5) */
  priority: number;
}

/**
 * Reference (Citation)
 */
export interface Reference {
  /** Reference ID */
  id: string;
  /** Source URL */
  url: string;
  /** Source title */
  title: string;
  /** Access date */
  accessDate: string;
}

/**
 * Report Metadata
 */
export interface ReportMetadata {
  /** Number of iterations */
  iterations: number;
  /** Total tokens used */
  tokensUsed: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Overall confidence (0-1) */
  confidence: number;
  /** Total knowledge items collected */
  knowledgeCount: number;
  /** Total URLs visited */
  urlsVisited: number;
}

/**
 * Research Report - Final output
 */
export interface ResearchReport {
  /** Original query */
  query: string;
  /** Executive summary */
  summary: string;
  /** Key findings */
  findings: Finding[];
  /** Technical options */
  options: TechnicalOption[];
  /** Recommendations */
  recommendations: Recommendation[];
  /** References/citations */
  references: Reference[];
  /** Metadata */
  metadata: ReportMetadata;
  /** Raw markdown (if outputFormat is markdown) */
  markdown?: string;
}

/**
 * Iteration Log
 */
export interface IterationLog {
  /** Iteration number */
  iteration: number;
  /** Action taken */
  action: ResearchAction;
  /** Tokens used in this iteration */
  tokensUsed: number;
  /** Knowledge items gained */
  knowledgeGained: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Research Action (Union Type)
 */
export type ResearchAction =
  | { type: 'search'; query: string; resultsCount: number }
  | { type: 'read'; url: string; success: boolean; factsExtracted: number }
  | { type: 'reason'; tokensUsed: number; knowledgeGained: number }
  | { type: 'answer'; answer: string; isDefinitive: boolean };

/**
 * Token Usage
 */
export interface TokenUsage {
  /** Operation name */
  operation: string;
  /** Tokens consumed */
  tokens: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Search Provider Interface
 */
export interface SearchProvider {
  /** Provider name */
  name: string;
  /** Search method */
  search(query: SERPQuery): Promise<SearchResult[]>;
  /** Read web content (optional) */
  read?(request: WebReadRequest): Promise<WebContent>;
  /** Availability check */
  isAvailable(): Promise<boolean>;
}

/**
 * LM Provider Interface
 */
export interface LMProvider {
  /** Provider name */
  name: string;
  /** Generate text completion */
  generate(prompt: string, options?: LMGenerationOptions): Promise<string>;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/**
 * LM Generation Options
 */
export interface LMGenerationOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1, higher = more random) */
  temperature?: number;
  /** Stop sequences */
  stop?: string[];
  /** System prompt */
  systemPrompt?: string;
}

/**
 * Evaluation Result
 */
export interface EvaluationResult {
  /** Is the answer definitive? */
  isDefinitive: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Missing aspects */
  missingAspects: string[];
  /** Reasoning for the evaluation */
  reasoning: string;
}

/**
 * Deep Research Events
 */
export type ResearchEventType =
  | 'start'
  | 'iteration_start'
  | 'search_complete'
  | 'read_complete'
  | 'reason_complete'
  | 'iteration_complete'
  | 'answer_found'
  | 'complete'
  | 'error'
  | 'framework_selected';

/**
 * Research Event
 */
export interface ResearchEvent {
  type: ResearchEventType;
  iteration?: number;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Event Listener
 */
export type ResearchEventListener = (event: ResearchEvent) => void;

/**
 * Deep Research Error
 */
export class DeepResearchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DeepResearchError';
  }
}

/**
 * All Providers Failed Error
 */
export class AllProvidersFailedError extends DeepResearchError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ALL_PROVIDERS_FAILED', details);
    this.name = 'AllProvidersFailedError';
  }
}

/**
 * Invalid Configuration Error
 */
export class InvalidConfigurationError extends DeepResearchError {
  constructor(message: string) {
    super(message, 'INVALID_CONFIGURATION');
    this.name = 'InvalidConfigurationError';
  }
}

/**
 * Token Budget Exceeded Error
 */
export class TokenBudgetExceededError extends DeepResearchError {
  constructor(used: number, budget: number) {
    super(
      `Token budget exceeded: ${used}/${budget}`,
      'TOKEN_BUDGET_EXCEEDED',
      { used, budget }
    );
    this.name = 'TokenBudgetExceededError';
  }
}
