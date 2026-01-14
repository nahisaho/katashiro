/**
 * Agent module exports
 *
 * @module @nahisaho/katashiro-orchestrator/agent
 */

// Types
export type {
  AgentActionType,
  ToolResult,
  AgentAction,
  AgentState,
  AgentStateStatus,
  CreateAgentStateOptions,
  AddActionInput,
  SerializedAgentState,
  AgentStateManagerConfig,
} from './types.js';

// Classes
export {
  AgentStateManager,
  defaultAgentStateManager,
  type AgentStateSummary,
} from './AgentStateManager.js';
// ReAct Helper (REQ-AGENT-004)
export {
  ReActHelper,
  parseReActOutput,
  extractNextReActAction,
  DEFAULT_REACT_FORMAT,
  REACT_SYSTEM_PROMPT,
  type ReActParseResult,
  type ReActStep,
  type ReActFormatConfig,
} from './ReActHelper.js';