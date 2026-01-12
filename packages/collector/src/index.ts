/**
 * @nahisaho/katashiro-collector
 * 情報収集パッケージ
 *
 * @requirement REQ-COLLECT-001 ~ REQ-COLLECT-009
 * @design DES-KATASHIRO-001 §2.2 Collector Container, DES-COLLECT-003, DES-COLLECT-008
 * @task TSK-010 ~ TSK-015, TASK-001, TASK-002
 */

// インターフェース
export type {
  IWebSearchClient,
  IWebScraper,
  IFeedReader,
  IAPIClient,
  IYouTubeTranscript,
  IMediaExtractor,
} from './interfaces.js';

// 型定義
export type {
  WebSearchOptions,
  ScrapingOptions,
  ScrapingResult,
  FeedItem,
  TranscriptSegment,
  MediaMetadata,
} from './types.js';

// 実装
export { WebSearchClient } from './web-search/index.js';
export { WebScraper } from './scraper/index.js';
export { YouTubeTranscript } from './youtube/index.js';
export { FeedReader } from './feed/index.js';
export { APIClient, type APIClientOptions } from './api/index.js';
export { MediaExtractor, type ExtractedMedia } from './media/index.js';

// AGENTS.md互換エイリアス（APIClientをApiClientとしてもエクスポート）
export { APIClient as ApiClient } from './api/index.js';

// Source tracking (v0.2.0)
export {
  SourceTracker,
  type TrackedSource,
  type SourceMetadata,
  CredibilityScorer,
  type CredibilityFactors,
  type CredibilityScore,
} from './source/index.js';

// Document parsing (v0.2.3) - DES-COLLECT-003
export {
  DocumentParser,
  PDFParser,
  DOCXParser,
  XLSXParser,
  DEFAULT_PARSE_OPTIONS,
} from './document/index.js';

export type {
  ParsedDocument,
  DocumentError,
  DocumentErrorCode,
  ParseOptions,
  SupportedFormat,
  IDocumentParser,
  DocumentStructure,
  DocumentMetadata,
  Heading,
  Paragraph,
  ParagraphStyle,
  Section,
  TableOfContents,
  TocEntry,
  TableData,
  TableRow,
  TableCell,
  ImageReference,
  PageInfo,
  SheetInfo,
} from './document/index.js';

// Wide Research (v0.2.3) - DES-COLLECT-008
export {
  WideResearchEngine,
  QueryPlanner,
  ResultAggregator,
  CoverageAnalyzer,
  WebSearchAgent,
  NewsSearchAgent,
  AcademicSearchAgent,
  EncyclopediaAgent,
  DEFAULT_RESEARCH_CONFIG,
} from './research/index.js';

export type {
  WideResearchQuery,
  WideResearchResult,
  ResearchError,
  ResearchErrorCode,
  ResearchDepth,
  SourceType,
  Finding,
  SourceInfo,
  SourceStatus,
  CoverageReport,
  CoverageGap,
  TemporalCoverage,
  TimeDistribution,
  ResearchStatistics,
  CompletionStatus,
  AgentConfig,
  DateRange,
  DepthConfig,
  QueryPlan,
  ISearchAgent,
  AgentSearchQuery,
  AgentSearchResult,
  AgentExecutionResult,
} from './research/index.js';

// Browser Automation (v0.2.3) - DES-COLLECT-009
export {
  // Main class
  BrowserAutomation,
  BrowserAutomationError,
  // Sub-components
  ActionExecutor,
  ContentExtractor,
  SessionManager,
  // Config
  DEFAULT_BROWSER_CONFIG,
  // Types
  type BrowserConfig,
  type Viewport,
  type ProxyConfig,
  type ResourceLimits,
  type WaitUntilOption,
  type NavigationOptions,
  type ClickOptions,
  type TypeOptions,
  type ScrollOptions,
  type ScreenshotOptions,
  type PdfOptions,
  type NavigateAction,
  type ClickAction,
  type TypeAction,
  type WaitAction,
  type ScrollAction,
  type SelectAction,
  type HoverAction,
  type ScreenshotAction,
  type PdfAction,
  type EvaluateAction,
  type WaitForSelectorAction,
  type ExtractAction,
  type BrowserAction,
  type ActionResult,
  type PageScrapeResult,
  type PageLink,
  type PageImage,
  type PageMetadata,
  type Cookie,
  type SessionInfo,
  type AuthCredentials,
  type LoginSelectors,
  type BrowserScript,
  type ExtractorConfig,
  type ExtractionResult,
  type BrowserPage,
} from './browser/index.js';
