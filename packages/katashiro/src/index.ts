// @nahisaho/katashiro - All-in-one package
// Re-exports all KATASHIRO packages for convenient installation

// Core - Result types, Logger, utilities
export * as core from '@nahisaho/katashiro-core';
export { Result, ok, err, isOk, isErr, Logger, LogLevel, createLogger, generateId, formatTimestamp } from '@nahisaho/katashiro-core';
export type { Content, Source, ContentType, ID, Timestamp } from '@nahisaho/katashiro-core';

// Collector - Web scraping, API, feeds
export * as collector from '@nahisaho/katashiro-collector';
export { WebScraper, APIClient, APIClient as ApiClient, FeedReader, WebSearchClient, MediaExtractor, YouTubeTranscript } from '@nahisaho/katashiro-collector';

// Analyzer - Text analysis, entities, topics
export * as analyzer from '@nahisaho/katashiro-analyzer';
export { TextAnalyzer, EntityExtractor, TopicModeler, RelationAnalyzer, QualityScorer, StructureAnalyzer, FrameworkAnalyzer, DeepResearchOrchestrator } from '@nahisaho/katashiro-analyzer';

// Generator - Reports, summaries, presentations
export * as generator from '@nahisaho/katashiro-generator';
export { ReportGenerator, SummaryGenerator, PresentationGenerator, CitationGenerator, TemplateEngine, ExportService } from '@nahisaho/katashiro-generator';

// Generator - Platform-specific (v0.2.0)
export { QiitaGenerator, ZennGenerator, NoteGenerator, ArticleGenerator } from '@nahisaho/katashiro-generator';

// Generator - Transparency (v0.2.0 Phase 2)
export { ContributionAnalyzer, VersioningManager, CollaborationTracker, TransparencyReportGenerator } from '@nahisaho/katashiro-generator';

// Generator - Workflow (v0.2.0 Phase 3)
export { WorkflowEngine, createWorkflow, QualityGate, createQualityCheck, StyleGuideEnforcer, createStyleRule, PipelineOrchestrator, PipelineConfigBuilder, PipelineTemplates } from '@nahisaho/katashiro-generator';

// Knowledge - Knowledge graph management
export * as knowledge from '@nahisaho/katashiro-knowledge';
export { KnowledgeGraph, GraphQuery, GraphPersistence, GraphVisualization, GraphSync } from '@nahisaho/katashiro-knowledge';

// Feedback - User feedback and learning
export * as feedback from '@nahisaho/katashiro-feedback';
export { FeedbackCollector, FeedbackStorage, LearningEngine, PatternDetector, AdaptiveRecommender } from '@nahisaho/katashiro-feedback';

// Wake-Sleep Learning (v0.2.12)
export { WakeSleepCycle, PatternQualityEvaluator, PatternCompressor } from '@nahisaho/katashiro-feedback';
