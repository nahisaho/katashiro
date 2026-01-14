/**
 * AgentStateManager Tests
 *
 * @requirement REQ-AGENT-002
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentStateManager,
  defaultAgentStateManager,
  type AgentState,
  type AddActionInput,
} from '../../src/agent';

describe('AgentStateManager', () => {
  let manager: AgentStateManager;

  beforeEach(() => {
    manager = new AgentStateManager();
  });

  describe('create', () => {
    it('should create a new agent state with default values', () => {
      const state = manager.create();

      expect(state.conversationId).toBeDefined();
      expect(state.currentStep).toBe(0);
      expect(state.maxSteps).toBe(10); // default
      expect(state.history).toEqual([]);
      expect(state.context).toEqual({});
      expect(state.intermediateResults).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.createdAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
    });

    it('should create a state with custom options', () => {
      const state = manager.create({
        conversationId: 'custom-id',
        maxSteps: 20,
        context: { user: 'test' },
      });

      expect(state.conversationId).toBe('custom-id');
      expect(state.maxSteps).toBe(20);
      expect(state.context).toEqual({ user: 'test' });
    });

    it('should create a state with custom config', () => {
      const customManager = new AgentStateManager({
        defaultMaxSteps: 50,
        idGenerator: () => 'fixed-id',
      });

      const state = customManager.create();

      expect(state.conversationId).toBe('fixed-id');
      expect(state.maxSteps).toBe(50);
    });
  });

  describe('addAction', () => {
    it('should add a thought action', () => {
      const state = manager.create();
      const action: AddActionInput = {
        type: 'thought',
        content: { thought: 'Analyzing the question...' },
      };

      const newState = manager.addAction(state, action);

      expect(newState.currentStep).toBe(1);
      expect(newState.history).toHaveLength(1);
      expect(newState.history[0].type).toBe('thought');
      expect(newState.history[0].content.thought).toBe('Analyzing the question...');
      expect(newState.history[0].step).toBe(1);
      expect(newState.history[0].timestamp).toBeDefined();
      expect(newState.status).toBe('running');
    });

    it('should add a tool_call action', () => {
      const state = manager.create();
      const action: AddActionInput = {
        type: 'tool_call',
        content: {
          tool: 'web_search',
          params: { query: 'AI news' },
        },
      };

      const newState = manager.addAction(state, action);

      expect(newState.history[0].type).toBe('tool_call');
      expect(newState.history[0].content.tool).toBe('web_search');
      expect(newState.history[0].content.params).toEqual({ query: 'AI news' });
    });

    it('should add an observation action', () => {
      const state = manager.create();
      const action: AddActionInput = {
        type: 'observation',
        content: {
          result: {
            toolName: 'web_search',
            success: true,
            data: { results: [] },
            executionTimeMs: 100,
          },
        },
      };

      const newState = manager.addAction(state, action);

      expect(newState.history[0].type).toBe('observation');
      expect(newState.history[0].content.result?.success).toBe(true);
    });

    it('should set status to completed when final_answer is added', () => {
      const state = manager.create();
      const action: AddActionInput = {
        type: 'final_answer',
        content: { answer: 'The answer is 42' },
      };

      const newState = manager.addAction(state, action);

      expect(newState.status).toBe('completed');
      expect(newState.history[0].content.answer).toBe('The answer is 42');
    });

    it('should set status to failed when max steps reached', () => {
      const state = manager.create({ maxSteps: 2 });
      let currentState = state;

      // Add first action
      currentState = manager.addAction(currentState, {
        type: 'thought',
        content: { thought: 'Step 1' },
      });
      expect(currentState.status).toBe('running');

      // Add second action (reaches max)
      currentState = manager.addAction(currentState, {
        type: 'thought',
        content: { thought: 'Step 2' },
      });
      expect(currentState.status).toBe('failed');
    });

    it('should not mutate original state', () => {
      const state = manager.create();
      const action: AddActionInput = {
        type: 'thought',
        content: { thought: 'Test' },
      };

      const newState = manager.addAction(state, action);

      expect(state.currentStep).toBe(0);
      expect(state.history).toHaveLength(0);
      expect(newState.currentStep).toBe(1);
      expect(newState.history).toHaveLength(1);
    });
  });

  describe('addIntermediateResult', () => {
    it('should add intermediate results', () => {
      const state = manager.create();
      const result1 = { data: 'result1' };
      const result2 = { data: 'result2' };

      let newState = manager.addIntermediateResult(state, result1);
      newState = manager.addIntermediateResult(newState, result2);

      expect(newState.intermediateResults).toHaveLength(2);
      expect(newState.intermediateResults[0]).toEqual(result1);
      expect(newState.intermediateResults[1]).toEqual(result2);
    });
  });

  describe('updateContext', () => {
    it('should update context', () => {
      const state = manager.create({ context: { a: 1 } });
      const newState = manager.updateContext(state, { b: 2 });

      expect(newState.context).toEqual({ a: 1, b: 2 });
    });

    it('should override existing context keys', () => {
      const state = manager.create({ context: { a: 1 } });
      const newState = manager.updateContext(state, { a: 2 });

      expect(newState.context).toEqual({ a: 2 });
    });
  });

  describe('updateStatus', () => {
    it('should update status', () => {
      const state = manager.create();

      const running = manager.updateStatus(state, 'running');
      expect(running.status).toBe('running');

      const cancelled = manager.updateStatus(running, 'cancelled');
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('reset', () => {
    it('should reset state but keep configuration', () => {
      let state = manager.create({ maxSteps: 20, context: { user: 'test' } });
      state = manager.addAction(state, { type: 'thought', content: { thought: 'Test' } });
      state = manager.addIntermediateResult(state, { data: 'result' });

      const resetState = manager.reset(state);

      expect(resetState.currentStep).toBe(0);
      expect(resetState.history).toEqual([]);
      expect(resetState.intermediateResults).toEqual([]);
      expect(resetState.status).toBe('idle');
      // Configuration preserved
      expect(resetState.maxSteps).toBe(20);
      expect(resetState.context).toEqual({ user: 'test' });
      expect(resetState.conversationId).toBe(state.conversationId);
    });
  });

  describe('serialize / deserialize', () => {
    it('should serialize and deserialize state', () => {
      let state = manager.create({
        conversationId: 'test-conv',
        maxSteps: 15,
        context: { key: 'value' },
      });
      state = manager.addAction(state, { type: 'thought', content: { thought: 'Test' } });

      const json = manager.serialize(state);
      const restored = manager.deserialize(json);

      expect(restored.conversationId).toBe(state.conversationId);
      expect(restored.currentStep).toBe(state.currentStep);
      expect(restored.maxSteps).toBe(state.maxSteps);
      expect(restored.context).toEqual(state.context);
      expect(restored.history).toHaveLength(1);
    });

    it('should throw on invalid format', () => {
      expect(() => manager.deserialize('{}')).toThrow('Invalid serialized agent state format');
    });
  });

  describe('helper methods', () => {
    let state: AgentState;

    beforeEach(() => {
      state = manager.create({ maxSteps: 10 });
      state = manager.addAction(state, { type: 'thought', content: { thought: 'T1' } });
      state = manager.addAction(state, { type: 'tool_call', content: { tool: 'search' } });
      state = manager.addAction(state, { type: 'observation', content: { result: { toolName: 'search', success: true } } });
      state = manager.addAction(state, { type: 'thought', content: { thought: 'T2' } });
    });

    it('isMaxStepsReached should return correct value', () => {
      expect(manager.isMaxStepsReached(state)).toBe(false);

      const smallState = manager.create({ maxSteps: 2 });
      const reachedState = manager.addAction(
        manager.addAction(smallState, { type: 'thought', content: { thought: '1' } }),
        { type: 'thought', content: { thought: '2' } },
      );
      expect(manager.isMaxStepsReached(reachedState)).toBe(true);
    });

    it('isCompleted should return correct value', () => {
      expect(manager.isCompleted(state)).toBe(false);

      const completed = manager.addAction(state, {
        type: 'final_answer',
        content: { answer: 'Done' },
      });
      expect(manager.isCompleted(completed)).toBe(true);
    });

    it('isRunning should return correct value', () => {
      expect(manager.isRunning(state)).toBe(true);
    });

    it('getLastAction should return last action', () => {
      const last = manager.getLastAction(state);
      expect(last?.type).toBe('thought');
      expect(last?.content.thought).toBe('T2');
    });

    it('getActionsByType should filter by type', () => {
      const thoughts = manager.getActionsByType(state, 'thought');
      expect(thoughts).toHaveLength(2);

      const toolCalls = manager.getActionsByType(state, 'tool_call');
      expect(toolCalls).toHaveLength(1);
    });

    it('getToolCalls should return tool_call actions', () => {
      const toolCalls = manager.getToolCalls(state);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].content.tool).toBe('search');
    });

    it('getThoughts should return thought actions', () => {
      const thoughts = manager.getThoughts(state);
      expect(thoughts).toHaveLength(2);
    });

    it('getSummary should return state summary', () => {
      const summary = manager.getSummary(state);

      expect(summary.conversationId).toBe(state.conversationId);
      expect(summary.status).toBe('running');
      expect(summary.currentStep).toBe(4);
      expect(summary.maxSteps).toBe(10);
      expect(summary.totalActions).toBe(4);
      expect(summary.toolCallCount).toBe(1);
      expect(summary.thoughtCount).toBe(2);
      expect(summary.observationCount).toBe(1);
      expect(summary.hasIntermediateResults).toBe(false);
    });
  });

  describe('defaultAgentStateManager', () => {
    it('should be a singleton instance', () => {
      const state = defaultAgentStateManager.create();
      expect(state.conversationId).toBeDefined();
    });
  });
});
