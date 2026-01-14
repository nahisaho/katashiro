/**
 * Dialogue Module Exports
 *
 * @fileoverview MUSUBIX風対話型情報収集システム
 * @module @nahisaho/katashiro-orchestrator/dialogue
 * @since 0.4.1
 */

// Types
export type {
  DialogueSession,
  DialogueExchange,
  DialogueQuestion,
  DialogueAnswer,
  DialogueStatus,
  QuestionType,
  QuestionCategory,
  ExtractedContext,
  BackgroundInfo,
  Constraint,
  Stakeholder,
  SuccessCriterion,
  Priority,
  Risk,
  InferredIntent,
  AlternativeInterpretation,
  DialogueCollectorConfig,
  QuestionStrategy,
} from './types';

// Constants
export { DEFAULT_DIALOGUE_CONFIG } from './types';

// Classes
export { QuestionGenerator } from './question-generator';
export { IntentAnalyzer } from './intent-analyzer';
export { DialogueCollector, runSimpleDialogue } from './dialogue-collector';

// LLM-Powered Dialogue Collector (v2.0.0)
export {
  LLMDialogueCollector,
  runDeepDiveDialogue,
} from './llm-dialogue-collector';
export type {
  LLMProvider,
  LLMDialogueConfig,
  DeepDiveSession,
  DeepDiveResult,
} from './llm-dialogue-collector';
