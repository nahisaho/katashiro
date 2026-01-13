/**
 * KATASHIRO Consensus Research Module
 *
 * 反復合議型リサーチワークフロー（Iterative Consensus Research Workflow）
 * - 3エージェント × 3イテレーションの多視点調査
 * - レポートスコアリングと矛盾検出
 * - コンセンサスベースの最終レポート生成
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

