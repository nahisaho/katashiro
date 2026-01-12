/**
 * MoA (Mixture of Agents) モジュール
 *
 * @module @nahisaho/katashiro-analyzer/moa
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

// 型定義のエクスポート
export type {
  MoARequest,
  MoAResult,
  MoAConfig,
  AgentConfig,
  AgentType,
  AgentParameters,
  AgentResponse,
  PeerScore,
  TokenUsage,
  AggregationStrategy,
  AggregationDetails,
  AgentContribution,
  RoundResult,
  MoAMetadata,
  TaskAnalysis,
  AggregationResult,
} from './types.js';

// 定数のエクスポート
export { AGENT_PRESETS, DEFAULT_MOA_CONFIG } from './types.js';

// クラスのエクスポート
export { TaskAnalyzer } from './TaskAnalyzer.js';

export { AgentOrchestrator } from './AgentOrchestrator.js';
export type { LLMProvider } from './AgentOrchestrator.js';

export { ResponseAggregator } from './ResponseAggregator.js';

export { ConsensusCalculator } from './ConsensusCalculator.js';
export type { ConsensusAnalysis, ConsensusLevel } from './ConsensusCalculator.js';

export { MoAEngine } from './MoAEngine.js';
export type { MoAEngineOptions } from './MoAEngine.js';

// デフォルトエクスポート
export { MoAEngine as default } from './MoAEngine.js';
