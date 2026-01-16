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
  Feed,
  TranscriptSegment,
  MediaMetadata,
} from './types.js';

// 実装
export { WebSearchClient } from './web-search/index.js';
export { WebScraper } from './scraper/index.js';
export { YouTubeTranscript } from './youtube/index.js';
export { FeedReader } from './feed/index.js';
export { 
  APIClient, 
  type APIClientOptions,
  ApiClientError,
  NetworkError,
  JsonParseError,
} from './api/index.js';
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
  // Deep Research (v2.2.0) - REQ-DR-S-001, REQ-DR-S-002, REQ-DR-S-003
  DeepResearchQuery,
  DeepResearchConfig,
  DeepResearchResult,
  DeepResearchError,
  DeepResearchErrorCode,
  DeepResearchFinding,
  DeepResearchState,
  DeepResearchStatistics,
  ProcessingPhase,
  UrlStatus,
  IterationResult,
  ReasoningStep,
  ParallelConfig,
  TimeoutConfig,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
  UrlProcessorConfig,
  UrlProcessResult,
  IScraperAdapter,
  UrlProcessorEventType,
  IterationConfig,
  IterationState,
  IterationEventType,
  ShouldContinueResult,
} from './research/index.js';

// Deep Research Orchestrator (v2.2.0)
export {
  DeepResearchOrchestrator,
  UrlProcessor,
  IterationController,
  DeepResearchQuerySchema,
  DEFAULT_DEEP_RESEARCH_CONFIG,
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

// Search Cache (v0.4.3) - REQ-IMP-001
export { SearchCache, type SearchCacheOptions } from './cache/index.js';

// Real-Time Data Fetcher (v0.5.0) - REQ-EXT-RTD-001, REQ-EXT-RTD-002
export { RealTimeDataFetcher } from './realtime-data/index.js';

export type {
  RealTimeDataSource,
  RealTimeDataType,
  RealTimeDataQuery,
  RealTimeDataResult,
  CommodityPrice,
  StatisticsData,
  DataPoint,
  TimeSeriesData,
  RealTimeDataFetcherOptions,
} from './realtime-data/index.js';

// Retry Mechanism (v2.2.0) - REQ-DR-U-001, REQ-DR-W-001
export {
  RetryHandler,
  ExponentialBackoff,
  RetryError,
  isRetryError,
  RetryPolicySchema,
  DEFAULT_RETRY_POLICY,
  RetryContextSchema,
} from './retry/index.js';

export type {
  RetryPolicy,
  RetryContext,
  RetryEvent,
  BackoffResult,
  BackoffOptions,
  RetryErrorOptions,
  RetryHandlerOptions,
  ErrorHistoryEntry,
} from './retry/index.js';

// Logging (v2.2.0) - REQ-DR-U-002
export {
  StructuredLogger,
  ConsoleTransport,
  MemoryTransport,
  SensitiveDataMasker,
  getLogger,
  setLogger,
  LogLevelSchema,
  LogEntrySchema,
  LOG_LEVEL_PRIORITY,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_MASKING_PATTERNS,
} from './logging/index.js';

export type {
  LogLevel,
  LogEntry,
  LogFormat,
  LogTransport,
  LoggerConfig,
  MaskingPattern,
} from './logging/index.js';

// Fallback Mechanism (v2.2.0) - REQ-DR-U-003
export {
  FallbackHandler,
  FallbackError,
  WaybackMachineClient,
  WaybackError,
  FallbackSourceTypeSchema,
  DEFAULT_FALLBACK_CONFIG,
} from './fallback/index.js';

export type {
  FallbackSourceType,
  FallbackResult,
  FallbackConfig,
  WaybackSnapshot,
  CacheEntry,
  AlternativeSource,
  FallbackEvent,
  FallbackEventListener,
} from './fallback/index.js';

// Content Management (v2.2.0) - REQ-DR-S-001, REQ-DR-S-003, REQ-DR-E-005
export {
  ContentCache,
  VersionControl,
  CheckpointManager,
  CheckpointError,
  ContentManager,
  ContentStatusSchema,
  ContentVersionSchema,
  ContentEntrySchema,
  CacheConfigSchema,
  CheckpointConfigSchema,
  ContentManagerConfigSchema,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CHECKPOINT_CONFIG,
  DEFAULT_CONTENT_MANAGER_CONFIG,
} from './content/index.js';

export type {
  ContentStatus,
  ContentVersion,
  ContentEntry,
  CacheConfig,
  CheckpointConfig,
  ContentManagerConfig,
  CacheStats,
  CheckpointInfo,
  CheckpointData,
  ContentManagerEventType,
  ContentManagerEvent,
  ContentManagerEventListener,
  ContentDiff,
} from './content/index.js';

// robots.txt (v2.2.0) - REQ-DR-W-003
export {
  RobotsParser,
  RobotsConfigSchema,
  DEFAULT_ROBOTS_CONFIG,
} from './robots/index.js';

export type {
  RobotsConfig,
  RobotsRule,
  ParsedRobotsTxt,
  RobotsCacheEntry,
  RobotsCheckResult,
} from './robots/index.js';

// LRU Cache (v2.2.0) - REQ-DR-E-005, REQ-DR-S-003
export {
  LRUCache,
  CacheKeyGenerator,
  TTLManager,
  CachePersistence,
  BackupCachePersistence,
  CacheManager,
  LRUCacheConfigSchema,
  CacheKeyGeneratorConfigSchema,
  CacheManagerConfigSchema,
  DEFAULT_LRU_CACHE_CONFIG,
  DEFAULT_CACHE_KEY_GENERATOR_CONFIG,
  DEFAULT_CACHE_MANAGER_CONFIG,
  TTL_PRESETS,
  RECOMMENDED_PATTERNS,
} from './cache/index.js';

export type {
  CacheMetadata,
  CacheEntry as LRUCacheEntry,
  LRUCacheConfig,
  CacheStatistics,
  CacheKeyGeneratorConfig,
  CacheManagerConfig,
  PersistedCacheData,
  CacheEvent,
  CacheEventListener,
} from './cache/index.js';

// Parallel Processing (v2.2.0) - REQ-DR-S-002, REQ-DR-W-004
export {
  Semaphore,
  DomainRateLimiter,
  ConcurrencyQueue,
  ResourceMonitor,
  AdaptiveConcurrencyController,
  ContentStreamHandler,
  ParallelExecutor,
  SemaphoreConfigSchema,
  DomainConfigSchema,
  DomainRateLimiterConfigSchema,
  ConcurrencyQueueConfigSchema,
  ResourceMonitorConfigSchema,
  AdaptiveConcurrencyConfigSchema,
  ParallelExecutorConfigSchema,
  ContentStreamConfigSchema,
  DEFAULT_SEMAPHORE_CONFIG,
  DEFAULT_DOMAIN_RATE_LIMITER_CONFIG,
  DEFAULT_CONCURRENCY_QUEUE_CONFIG,
  DEFAULT_RESOURCE_MONITOR_CONFIG,
  DEFAULT_ADAPTIVE_CONCURRENCY_CONFIG,
  DEFAULT_PARALLEL_EXECUTOR_CONFIG,
  DEFAULT_CONTENT_STREAM_CONFIG,
} from './parallel/index.js';

export type {
  SemaphoreConfig,
  DomainConfig,
  DomainRateLimiterConfig,
  TaskPriority,
  QueueTask,
  ConcurrencyQueueConfig,
  ResourceUsage,
  ResourceMonitorConfig,
  AdaptiveConcurrencyConfig,
  ParallelExecutorConfig,
  ContentStreamConfig,
  ParallelEvent,
  ParallelEventListener,
  TaskResult,
  BatchResult,
  TaskInput,
  StreamResult,
  StreamSource,
} from './parallel/index.js';
