/**
 * Comparator module - Multi-source comparison and analysis
 * @since 0.2.0
 * @requirement REQ-ANALYZE-002-ENH
 * @requirement REQ-EXT-CMP-001 (v0.5.0)
 * @requirement REQ-EXT-CMP-002 (v0.7.0)
 * @design DES-KATASHIRO-002 §4.7 比較分析強化
 */

export {
  MultiSourceComparator,
  type SourceForComparison,
  type ExtractedClaim,
  type ClaimComparison,
  type ComparisonResult,
} from './multi-source-comparator.js';

// Competitor Analyzer (v0.5.0, v0.7.0) - REQ-EXT-CMP-001, REQ-EXT-CMP-002
export {
  CompetitorAnalyzer,
  type CompetitorData,
  type ComparisonDimension,
  type ComparisonTableOptions,
  type ComparisonTableResult,
  type ComparisonSummary,
  type CompetitorSwot,
  // REQ-EXT-CMP-002: 競合情報収集
  type CompetitorIntelligence,
  type PressReleaseInfo,
  type NewsArticleInfo,
  type FinancialDataInfo,
  type CompetitorIntelligenceOptions,
  type ICompetitorCollector,
} from './competitor-analyzer.js';
