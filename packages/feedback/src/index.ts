/**
 * @nahisaho/katashiro-feedback
 * フィードバック学習パッケージ
 *
 * @requirement REQ-UX-003
 * @design DES-KATASHIRO-001 §3.2
 */

// Collector
export { FeedbackCollector } from './collector/feedback-collector.js';
export type { FeedbackInput, FeedbackStats } from './collector/feedback-collector.js';

// Storage
export { FeedbackStorage } from './storage/feedback-storage.js';
export type { ListOptions, FeedbackExport } from './storage/feedback-storage.js';

// Learning
export { LearningEngine } from './learning/learning-engine.js';
export type {
  LearningResult,
  PatternQueryOptions,
  SuggestionOptions,
  LearningStats,
} from './learning/learning-engine.js';

// Wake-Sleep Learning (v0.2.12)
export { WakeSleepCycle } from './learning/wake-sleep-cycle.js';
export { PatternQualityEvaluator } from './learning/quality-evaluator.js';
export type { QualityEvaluatorConfig } from './learning/quality-evaluator.js';
export { PatternCompressor } from './learning/pattern-compressor.js';
export type { PatternCompressorConfig, MDLResult } from './learning/pattern-compressor.js';
export type {
  WakeSleepConfig,
  WakeObservation,
  ObservationType,
  LearnedPattern,
  PatternQuality,
  SleepResult,
  WakeSleepStats,
  PatternMatch,
  LibraryExport,
} from './learning/wake-sleep-types.js';

// Patterns
export { PatternDetector } from './patterns/pattern-detector.js';
export type {
  DetectionResult,
  ContextPatterns,
  AnalysisResult,
} from './patterns/pattern-detector.js';

// Recommender
export { AdaptiveRecommender } from './recommender/adaptive-recommender.js';
export type { RecommendOptions, RecommenderStats } from './recommender/adaptive-recommender.js';

// Interfaces
export type {
  IFeedbackCollector,
  IPatternExtractor,
} from './interfaces.js';

// Types
export type {
  Feedback,
  FeedbackAction,
  Pattern,
  PatternType,
} from './types.js';
