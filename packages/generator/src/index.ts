/**
 * @nahisaho/katashiro-generator
 * コンテンツ生成パッケージ
 *
 * @requirement REQ-GENERATE-001 ~ REQ-GENERATE-010
 * @design DES-KATASHIRO-001 §2.2 Generator Container
 */

export type {
  IContentGenerator,
  ICitationManager,
  IOutlineGenerator,
  ISummaryGenerator,
  ITranslationGenerator,
  IChartGenerator,
  IPlatformFormatter,
} from './interfaces.js';

export type {
  GenerationOptions,
  Outline,
  Citation,
  ChartConfig,
  PlatformFormat,
} from './types.js';

// 実装
export {
  ReportGenerator,
  type ReportConfig,
  type ReportSection,
  type ChunkResult,
  type ChunkCallback,
  type ChunkGeneratorOptions,
} from './report/index.js';

export {
  SummaryGenerator,
  type SummaryConfig,
} from './summary/index.js';

export {
  CitationGenerator,
  type CitationStyle,
  type GeneratedCitation,
} from './citation/index.js';

export {
  TemplateEngine,
  type Template,
  type HelperFunction,
} from './template/index.js';

export {
  PresentationGenerator,
  type SlideType,
  type Slide,
  type Presentation,
  type PresentationConfig,
} from './presentation/index.js';

export {
  ExportService,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
} from './export/index.js';

// Platform-specific generators (v0.2.0)
export {
  QiitaGenerator,
  type QiitaArticleOptions,
  type QiitaArticle,
  ZennGenerator,
  type ZennArticleOptions,
  type ZennArticle,
  type ZennBookOptions,
  type ZennBook,
  type ZennBookChapter,
  NoteGenerator,
  type NoteArticleOptions,
  type NoteArticle,
} from './platform/index.js';

// Article generator (v0.2.0)
export {
  ArticleGenerator,
  type ArticleTone,
  type ArticleAudience,
  type ArticleLength,
  type ArticleOptions,
  type GeneratedArticle,
  type ArticleCTA,
  type ArticleSEO,
} from './article/index.js';

// Transparency module (v0.2.0 Phase 2)
export {
  ContributionAnalyzer,
  VersioningManager,
  CollaborationTracker,
  TransparencyReportGenerator,
  type ContributorType,
  type AIContributionType,
  type HumanContributionType,
  type SectionContribution,
  type ContributionAnalysis,
  type ContributionSummary,
  type Version,
  type VersionDiff,
  type VersionHistory,
  type CollaborationSession,
  type SessionParticipant,
  type SessionOperation,
  type SessionStats,
  type TransparencyReport,
  type AIDisclosure,
  type TransparencyReportOptions,
  type SectionInput,
  type AnalysisOptions,
  type CreateVersionOptions,
  type DiffOptions,
  type AddParticipantOptions,
  type RecordOperationOptions,
  type ReportGeneratorConfig,
} from './transparency/index.js';

// Workflow module (v0.2.0 Phase 3)
export {
  // Workflow Engine
  WorkflowEngine,
  createWorkflow,
  // Quality Gate
  QualityGate,
  createQualityCheck,
  // Style Guide Enforcer
  StyleGuideEnforcer,
  createStyleRule,
  // Pipeline Orchestrator
  PipelineOrchestrator,
  PipelineConfigBuilder,
  PipelineTemplates,
  // Types
  type StepStatus,
  type WorkflowStatus,
  type StepType,
  type WorkflowStep,
  type WorkflowDefinition,
  type WorkflowHooks,
  type WorkflowContext,
  type WorkflowLog,
  type StepResult,
  type WorkflowResult,
  type QualityCheckResult,
  type QualityGateResult,
  type QualityCheck,
  type StyleRule,
  type StyleViolation,
  type StyleCheckResult,
  type PipelineStage,
  type PipelineConfig,
  type CollectStageConfig,
  type AnalyzeStageConfig,
  type GenerateStageConfig,
  type ValidateStageConfig,
  type ExportStageConfig,
  type PipelineResult,
} from './workflow/index.js';

// Chart/Diagram module (REQ-MEDIA-002)
export {
  // Generators
  ChartGenerator,
  DiagramGenerator,
  // Builders
  SvgBuilder,
  MermaidBuilder,
  // Types
  type ChartType,
  type DiagramType,
  type OutputFormat,
  type ChartTheme,
  type DataPoint,
  type DataSeries,
  type ChartData,
  type AxisConfig,
  type LegendConfig,
  type ChartOptions,
  type DiagramOptions,
  type ChartOutput,
  type DiagramOutput,
  type ChartGeneratorConfig,
  type FlowchartNode,
  type FlowchartEdge,
  type FlowchartData,
  type SequenceParticipant,
  type SequenceMessage,
  type SequenceData,
  type ClassDefinition,
  type ClassRelation,
  type ClassDiagramData,
  type GanttTask,
  type GanttData,
  // Constants
  DEFAULT_CHART_CONFIG,
  ChartGeneratorError,
  CHART_ERROR_CODES,
  THEME_PALETTES,
} from './chart/index.js';

// OGP/Thumbnail module (REQ-MEDIA-004)
export {
  // Generator
  OGPGenerator,
  createOGPGenerator,
  // Builder
  OGPSvgBuilder,
  // Types
  type Platform,
  type AspectRatio,
  type OGPTheme,
  type GradientDirection,
  type TextAlign,
  type VerticalAlign,
  type OGPContent,
  type OGPStyle,
  type OGPOptions,
  type OGPImage,
  type PlatformConfig,
  type DecorationType,
  // Constants
  PLATFORM_CONFIGS,
  THEME_STYLES,
  DEFAULT_OGP_OPTIONS,
  OGPGeneratorError,
  OGP_ERROR_CODES,
} from './ogp/index.js';

// Image Generation module (REQ-MEDIA-001)
export {
  // Generator
  ImageGenerator,
  createImageGenerator,
  // Prompt Optimizer
  PromptOptimizer,
  optimizePrompt,
  enhancePrompt,
  // Types
  type ImageModel,
  type ImageStyle,
  type ImageSizePreset,
  type ImageFormat,
  type ImageQuality,
  type ImageGenerationOptions,
  type PromptOptimizationOptions,
  type OptimizedPrompt,
  type GeneratedImage,
  type ImageMetadata,
  type ImageInput,
  type VariationOptions,
  type ImageEditOptions,
  type ModelProviderConfig,
  type ImageGeneratorConfig,
  // Constants
  SIZE_PRESETS,
  STYLE_KEYWORDS,
  QUALITY_KEYWORDS,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_IMAGE_OPTIONS,
  ImageGeneratorError,
  IMAGE_ERROR_CODES,
} from './image/index.js';

// Audio/Podcast Generation module (REQ-MEDIA-005)
export {
  // Generator
  AudioGenerator,
  // SSML Builder
  SSMLBuilder,
  buildSSML,
  segmentText,
  // Types
  type AudioProvider,
  type AudioFormat,
  type AudioQuality,
  type VoiceGender,
  type SpeakingStyle,
  type LanguageCode,
  type VoiceConfig,
  type TTSOptions,
  type SSMLElement,
  type TextSegment,
  type PodcastSpeaker,
  type PodcastSegment,
  type PodcastScript,
  type AudioBuffer,
  type GeneratedAudio,
  type AudioMetadata,
  type AvailableVoice,
  type AudioGeneratorOptions,
  // Constants
  PRESET_VOICES,
  QUALITY_PRESETS,
  DEFAULT_TTS_OPTIONS,
  AUDIO_ERROR_CODES,
  AudioGeneratorError,
} from './audio/index.js';

// Video Generation module (REQ-MEDIA-003)
export {
  // Generator
  VideoGenerator,
  createVideoGenerator,
  // Frame Composer
  FrameComposer,
  generateTimeline,
  // Types (renamed to avoid conflicts with presentation module)
  type VideoFormat,
  type VideoCodec,
  type AudioCodec,
  type ResolutionPreset,
  type AspectRatio as VideoAspectRatio,
  type TransitionType,
  type TextAnimationType,
  type HorizontalPosition,
  type VerticalPosition,
  type Resolution,
  type Slide as VideoSlide,
  type TransitionConfig,
  type KenBurnsEffect,
  type TextOverlay,
  type TextStyle,
  type TextAnimation,
  type AudioInput as VideoAudioInput,
  type VideoOptions,
  type VideoMetadataInput,
  type VideoOutput,
  type VideoMetadata,
  type VideoInput,
  type SlideshowConfig,
  type VideoGeneratorOptions,
  type FrameInfo,
  type RenderedFrame,
  // Constants
  RESOLUTION_PRESETS,
  getResolutionForAspectRatio,
  DEFAULT_VIDEO_OPTIONS,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSITION,
  VideoGeneratorError,
  VIDEO_ERROR_CODES,
} from './video/index.js';
