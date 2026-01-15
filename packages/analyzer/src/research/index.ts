/**
 * Deep Research モジュール
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-ANALYZE-008
 * @task TASK-003
 */

export { DeepResearchOrchestrator } from './DeepResearchOrchestrator.js';
export { GapAnalyzer } from './GapAnalyzer.js';
export { ConvergenceDetector } from './ConvergenceDetector.js';
export { QueryGenerator } from './QueryGenerator.js';
export { FindingIntegrator } from './FindingIntegrator.js';

export type {
  DeepResearchQuery,
  DeepResearchResult,
  ResearchProgress,
  ResearchPhase,
  SimpleKnowledgeGraph,
  KeyFinding,
  ImportanceLevel,
  SourceReference,
  IterationRecord,
  KnowledgeGap,
  GapType,
  GapPriority,
  UserGuidance,
  IntegrationResult,
  DeepResearchStatistics,
  CompletionReason,
  DepthPriority,
  ReasoningStep,
  MermaidDiagrams,
} from './types.js';

// v2.1.0: jina-ai風 DeepResearchAgent
export * from './agent/index.js';
