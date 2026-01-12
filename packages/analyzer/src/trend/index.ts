/**
 * Trend Analysis Module
 *
 * @module @nahisaho/katashiro-analyzer/trend
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

// Main orchestrator
export { TrendAnalyzer } from './TrendAnalyzer.js';

// Component classes
export { TimeSeriesCollector } from './TimeSeriesCollector.js';
export { TrendDetector } from './TrendDetector.js';
export { ForecastEngine } from './ForecastEngine.js';
export { VisualizationGenerator } from './VisualizationGenerator.js';

// Types
export type {
  // Query & Result
  TrendAnalysisQuery,
  TrendAnalysisResult,
  TrendAnalyzerConfig,
  TrendAnalysisError,
  
  // Time Series
  TimeSeriesData,
  CollectionQuery,
  SampleDocument,
  
  // Trends
  DetectedTrend,
  TrendType,
  TrendDetectorConfig,
  TrendSummary,
  
  // Forecast
  ForecastData,
  ForecastConfig,
  ForecastMethod,
  
  // Visualization
  VisualizationData,
  LineChartData,
  HeatmapData,
  PieChartData,
  
  // Comparison
  TopicComparison,
  
  // Metadata & Config
  TrendMetadata,
  TrendSource,
  TimeGranularity,
} from './types.js';

// Default config
export { DEFAULT_TREND_CONFIG } from './types.js';
