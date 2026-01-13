/**
 * KATASHIRO Consensus Research Module
 *
 * 反復合議型リサーチワークフロー（Iterative Consensus Research Workflow）
 * - 3エージェント × 3イテレーションの多視点調査
 * - レポートスコアリングと矛盾検出
 * - コンセンサスベースの最終レポート生成
 * - ASCII図のMermaid/Markdown変換（v1.3.0）
 *
 * @packageDocumentation
 * @module consensus
 * @since v1.2.0
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export type {
  // Configuration
  ConsensusResearchConfig,
  SearchConfig,
  PostProcessorOptions,

  // Report Types
  ReportScore,
  AgentReport,
  ConflictDetail,
  ConflictStatement,
  ConsensusSelection,
  SourceReference,

  // Agent Types
  AgentStrategy,
  SourceType,

  // Iteration Types
  IterationResult,
  IterationContext,

  // Final Result
  ConsensusResearchResult,
  ConsensusResearchMetadata,

  // Post-Processing (v1.3.0)
  PostProcessResult,
  ConversionRecord,
  AsciiDiagram,
  AsciiDiagramType,

  // Events
  ConsensusResearchEvent,
  ResearchStartedEvent,
  IterationStartedEvent,
  AgentStartedEvent,
  AgentCompletedEvent,
  ScoringCompletedEvent,
  ConsensusSelectedEvent,
  IterationCompletedEvent,
  ResearchCompletedEvent,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

export {
  DEFAULT_CONSENSUS_CONFIG,
  DEFAULT_AGENT_STRATEGIES,
  DEFAULT_POST_PROCESSOR_OPTIONS,
  ConsensusResearchError,
  ConsensusResearchErrorCode,
} from './types.js';

// =============================================================================
// Core Classes
// =============================================================================

export { ReportScorer } from './ReportScorer.js';
export { ConsensusSelector } from './ConsensusSelector.js';
export { ResearchAgent } from './ResearchAgent.js';
export { ConsensusResearchEngine } from './ConsensusResearchEngine.js';

// Post-Processing (v1.3.0)
export { AsciiDiagramConverter } from './AsciiDiagramConverter.js';
export { ReportPostProcessor } from './ReportPostProcessor.js';

