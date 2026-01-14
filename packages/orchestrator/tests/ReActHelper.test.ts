/**
 * ReActHelper Tests
 *
 * @requirement REQ-AGENT-004
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReActHelper,
  parseReActOutput,
  extractNextReActAction,
  DEFAULT_REACT_FORMAT,
  REACT_SYSTEM_PROMPT,
} from '../src/agent/ReActHelper.js';

describe('ReActHelper', () => {
  let helper: ReActHelper;

  beforeEach(() => {
    helper = new ReActHelper();
  });

  describe('parse', () => {
    it('should parse simple ReAct output', () => {
      const text = `
Thought: I need to search for information about AI.
Action: search
Action Input: artificial intelligence
`;
      const result = helper.parse(text);

      expect(result.success).toBe(true);
      expect(result.actions.length).toBe(1);
      expect(result.actions[0]?.thought).toBe(
        'I need to search for information about AI.',
      );
      expect(result.actions[0]?.action?.tool).toBe('search');
      expect(result.actions[0]?.action?.input).toBe('artificial intelligence');
    });

    it('should parse multiple steps', () => {
      const text = `
Thought: First, let me search for the topic.
Action: search
Action Input: machine learning

Thought: Now I have enough information.
Action: summarize
Action Input: {"text": "ML is..."}
`;
      const result = helper.parse(text);

      expect(result.success).toBe(true);
      expect(result.actions.length).toBe(2);
      expect(result.actions[0]?.action?.tool).toBe('search');
      expect(result.actions[1]?.action?.tool).toBe('summarize');
    });

    it('should parse final answer', () => {
      const text = `
Thought: I have all the information I need.
Final Answer: The answer is 42.
`;
      const result = helper.parse(text);

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('The answer is 42.');
      expect(result.actions[0]?.finalAnswer).toBe('The answer is 42.');
    });

    it('should parse observation', () => {
      const text = `
Thought: Let me check the result.
Action: search
Action Input: test query
Observation: Found 10 results about test query.
`;
      const result = helper.parse(text);

      expect(result.actions[0]?.observation).toBe(
        'Found 10 results about test query.',
      );
    });

    it('should handle JSON action input', () => {
      const text = `
Thought: Need to analyze data.
Action: analyze
Action Input: {"query": "test", "limit": 10}
`;
      const result = helper.parse(text);

      expect(result.actions[0]?.action?.input).toEqual({
        query: 'test',
        limit: 10,
      });
    });

    it('should handle multi-line action input', () => {
      const text = `
Thought: Need to process text.
Action: process
Action Input: This is a long
multi-line input
that spans several lines

Thought: Done processing.
`;
      const result = helper.parse(text);

      expect(result.actions[0]?.action?.input).toContain('multi-line input');
      expect(result.actions.length).toBe(2);
    });

    it('should return empty result for invalid input', () => {
      const text = 'Just some random text without ReAct format.';
      const result = helper.parse(text);

      expect(result.success).toBe(false);
      expect(result.actions.length).toBe(0);
    });

    it('should be case insensitive by default', () => {
      const text = `
thought: This should work.
action: test
action input: input value
`;
      const result = helper.parse(text);

      expect(result.success).toBe(true);
      expect(result.actions[0]?.thought).toBe('This should work.');
    });
  });

  describe('toAgentActions', () => {
    it('should convert ReActSteps to AgentActions', () => {
      const steps = [
        {
          step: 1,
          thought: 'Let me think',
          action: { tool: 'search', input: 'query' },
        },
      ];

      const actions = helper.toAgentActions(steps);

      expect(actions.length).toBe(2); // thought + tool_call
      expect(actions[0]?.type).toBe('thought');
      expect(actions[1]?.type).toBe('tool_call');
    });

    it('should handle observation', () => {
      const steps = [
        {
          step: 1,
          action: { tool: 'search', input: 'query' },
          observation: 'Found results',
        },
      ];

      const actions = helper.toAgentActions(steps);

      const obsAction = actions.find((a) => a.type === 'observation');
      expect(obsAction).toBeDefined();
      expect(obsAction?.content.result?.data).toBe('Found results');
    });

    it('should handle final answer', () => {
      const steps = [
        {
          step: 1,
          thought: 'I know the answer',
          finalAnswer: 'The answer is 42',
        },
      ];

      const actions = helper.toAgentActions(steps);

      const finalAction = actions.find((a) => a.type === 'final_answer');
      expect(finalAction).toBeDefined();
      expect(finalAction?.content.answer).toBe('The answer is 42');
    });
  });

  describe('format', () => {
    it('should format AgentActions to ReAct text', () => {
      const actions = [
        {
          step: 1,
          timestamp: new Date().toISOString(),
          type: 'thought' as const,
          content: { thought: 'Let me think' },
        },
        {
          step: 1,
          timestamp: new Date().toISOString(),
          type: 'tool_call' as const,
          content: { tool: 'search', params: { input: 'query' } },
        },
      ];

      const text = helper.format(actions);

      expect(text).toContain('Thought: Let me think');
      expect(text).toContain('Action: search');
      expect(text).toContain('Action Input: query');
    });

    it('should format observation', () => {
      const actions = [
        {
          step: 1,
          timestamp: new Date().toISOString(),
          type: 'observation' as const,
          content: {
            result: { toolName: 'search', success: true, data: 'Results here' },
          },
        },
      ];

      const text = helper.format(actions);

      expect(text).toContain('Observation: Results here');
    });

    it('should format final answer', () => {
      const actions = [
        {
          step: 1,
          timestamp: new Date().toISOString(),
          type: 'final_answer' as const,
          content: { answer: 'The answer is 42' },
        },
      ];

      const text = helper.format(actions);

      expect(text).toContain('Final Answer: The answer is 42');
    });
  });

  describe('extractNextAction', () => {
    it('should extract the next action', () => {
      const text = `
Thought: I need to search.
Action: search
Action Input: test query
`;
      const action = helper.extractNextAction(text);

      expect(action).not.toBeNull();
      expect(action?.tool).toBe('search');
      expect(action?.input).toBe('test query');
    });

    it('should return null for no action', () => {
      const text = `
Thought: Just thinking...
`;
      const action = helper.extractNextAction(text);

      expect(action).toBeNull();
    });

    it('should return the last action when multiple exist', () => {
      const text = `
Thought: First step.
Action: search
Action Input: first

Thought: Second step.
Action: analyze
Action Input: second
`;
      const action = helper.extractNextAction(text);

      expect(action?.tool).toBe('analyze');
      expect(action?.input).toBe('second');
    });
  });

  describe('isFinalAnswer', () => {
    it('should detect final answer', () => {
      expect(helper.isFinalAnswer('Final Answer: done')).toBe(true);
      expect(helper.isFinalAnswer('final answer: done')).toBe(true);
      expect(helper.isFinalAnswer('Thought: not final')).toBe(false);
    });
  });

  describe('extractFinalAnswer', () => {
    it('should extract final answer', () => {
      const text = `
Thought: I have the answer.
Final Answer: The result is 42.
`;
      const answer = helper.extractFinalAnswer(text);

      expect(answer).toBe('The result is 42.');
    });

    it('should return null when no final answer', () => {
      const text = `
Thought: Still thinking...
Action: search
Action Input: more info
`;
      const answer = helper.extractFinalAnswer(text);

      expect(answer).toBeNull();
    });
  });

  describe('appendObservation', () => {
    it('should append observation to prompt', () => {
      const prompt = `
Thought: Let me search.
Action: search
Action Input: test
`;
      const result = helper.appendObservation(prompt, 'Found 5 results');

      expect(result).toContain('Observation: Found 5 results');
    });
  });

  describe('generateSystemPrompt', () => {
    it('should generate system prompt with tools', () => {
      const tools = [
        { name: 'search', description: 'Search the web' },
        { name: 'analyze', description: 'Analyze text' },
      ];

      const prompt = helper.generateSystemPrompt(tools);

      expect(prompt).toContain('search: Search the web');
      expect(prompt).toContain('analyze: Analyze text');
      expect(prompt).toContain('ReAct');
    });
  });

  describe('custom config', () => {
    it('should use custom prefixes', () => {
      const customHelper = new ReActHelper({
        thoughtPrefix: '考え:',
        actionPrefix: '行動:',
        actionInputPrefix: '入力:',
        finalAnswerPrefix: '回答:',
      });

      const text = `
考え: 検索する必要がある
行動: search
入力: テスト
`;
      const result = customHelper.parse(text);

      expect(result.success).toBe(true);
      expect(result.actions[0]?.thought).toBe('検索する必要がある');
    });

    it('should respect case sensitivity option', () => {
      const caseSensitiveHelper = new ReActHelper({
        caseInsensitive: false,
      });

      const text = `
thought: lowercase should fail
Thought: This should work
`;
      const result = caseSensitiveHelper.parse(text);

      expect(result.actions.length).toBe(1);
      expect(result.actions[0]?.thought).toBe('This should work');
    });
  });
});

describe('parseReActOutput helper', () => {
  it('should parse ReAct output', () => {
    const result = parseReActOutput(`
Thought: Testing
Action: test
Action Input: input
`);

    expect(result.success).toBe(true);
    expect(result.actions[0]?.action?.tool).toBe('test');
  });
});

describe('extractNextReActAction helper', () => {
  it('should extract next action', () => {
    const action = extractNextReActAction(`
Thought: Need to search
Action: search
Action Input: query
`);

    expect(action).not.toBeNull();
    expect(action?.tool).toBe('search');
  });
});

describe('DEFAULT_REACT_FORMAT', () => {
  it('should have expected prefixes', () => {
    expect(DEFAULT_REACT_FORMAT.thoughtPrefix).toBe('Thought:');
    expect(DEFAULT_REACT_FORMAT.actionPrefix).toBe('Action:');
    expect(DEFAULT_REACT_FORMAT.actionInputPrefix).toBe('Action Input:');
    expect(DEFAULT_REACT_FORMAT.observationPrefix).toBe('Observation:');
    expect(DEFAULT_REACT_FORMAT.finalAnswerPrefix).toBe('Final Answer:');
  });
});

describe('REACT_SYSTEM_PROMPT', () => {
  it('should contain key instructions', () => {
    expect(REACT_SYSTEM_PROMPT).toContain('Thought');
    expect(REACT_SYSTEM_PROMPT).toContain('Action');
    expect(REACT_SYSTEM_PROMPT).toContain('Observation');
    expect(REACT_SYSTEM_PROMPT).toContain('Final Answer');
    expect(REACT_SYSTEM_PROMPT).toContain('{tools}');
  });
});
