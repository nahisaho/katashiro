/**
 * Tool Registry Tests
 *
 * @fileoverview REQ-010: Action-Observation型ツールシステムのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../src/tool-registry';
import type { ToolDefinition } from '../src/action-observation-types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const mockTool: ToolDefinition<{ query: string }, { result: string }> = {
    name: 'mock_tool',
    description: 'A mock tool for testing',
    category: 'read',
    paramsSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
    resultSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
    },
    defaultRiskLevel: 'low',
    defaultTimeout: 10,
    execute: async (params) => {
      return { result: `Executed with: ${params.query}` };
    },
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool successfully', () => {
      const result = registry.register(mockTool);

      expect(result.isOk()).toBe(true);
      expect(registry.has('mock_tool')).toBe(true);
    });

    it('should reject duplicate tool registration', () => {
      registry.register(mockTool);
      const result = registry.register(mockTool);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TOOL_ALREADY_EXISTS');
      }
    });
  });

  describe('createAction', () => {
    beforeEach(() => {
      registry.register(mockTool);
    });

    it('should create an action for a registered tool', () => {
      const result = registry.createAction({
        toolName: 'mock_tool',
        params: { query: 'test' },
        requestedBy: 'agent-001',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toolName).toBe('mock_tool');
        expect(result.value.params.query).toBe('test');
        expect(result.value.riskLevel).toBe('low');
      }
    });

    it('should reject action for unregistered tool', () => {
      const result = registry.createAction({
        toolName: 'unknown_tool',
        params: { query: 'test' },
        requestedBy: 'agent-001',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TOOL_NOT_FOUND');
      }
    });

    it('should validate required parameters', () => {
      const result = registry.createAction({
        toolName: 'mock_tool',
        params: {} as { query: string },
        requestedBy: 'agent-001',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('VALIDATION_FAILED');
      }
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      registry.register(mockTool);
    });

    it('should execute an action and return observation', async () => {
      const actionResult = registry.createAction({
        toolName: 'mock_tool',
        params: { query: 'test query' },
        requestedBy: 'agent-001',
      });

      expect(actionResult.isOk()).toBe(true);
      if (actionResult.isOk()) {
        const observation = await registry.execute(actionResult.value);

        expect(observation.isOk()).toBe(true);
        if (observation.isOk()) {
          expect(observation.value.status).toBe('success');
          expect(observation.value.result).toEqual({ result: 'Executed with: test query' });
          expect(observation.value.duration).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle tool execution errors', async () => {
      const errorTool: ToolDefinition<{ query: string }, never> = {
        ...mockTool,
        name: 'error_tool',
        execute: async () => {
          throw new Error('Execution failed');
        },
      };
      registry.register(errorTool);

      const actionResult = registry.createAction({
        toolName: 'error_tool',
        params: { query: 'test' },
        requestedBy: 'agent-001',
      });

      expect(actionResult.isOk()).toBe(true);
      if (actionResult.isOk()) {
        const observation = await registry.execute(actionResult.value);

        expect(observation.isOk()).toBe(true);
        if (observation.isOk()) {
          expect(observation.value.status).toBe('error');
          expect(observation.value.error?.message).toContain('Execution failed');
        }
      }
    });
  });

  describe('assessRisk', () => {
    beforeEach(() => {
      registry.register(mockTool);
    });

    it('should assess risk level based on category', () => {
      const actionResult = registry.createAction({
        toolName: 'mock_tool',
        params: { query: 'test' },
        requestedBy: 'agent-001',
      });

      expect(actionResult.isOk()).toBe(true);
      if (actionResult.isOk()) {
        const assessment = registry.assessRisk(actionResult.value);

        expect(assessment.riskLevel).toBe('low');
        expect(assessment.requiresApproval).toBe(false);
      }
    });

    it('should detect dangerous commands', () => {
      const dangerousTool: ToolDefinition<{ command: string }, void> = {
        name: 'shell_tool',
        description: 'Execute shell commands',
        category: 'execute',
        paramsSchema: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command'],
        },
        resultSchema: {},
        defaultRiskLevel: 'high',
        defaultTimeout: 30,
        execute: async () => {},
      };
      registry.register(dangerousTool);

      const actionResult = registry.createAction({
        toolName: 'shell_tool',
        params: { command: 'rm -rf /' },
        requestedBy: 'agent-001',
      });

      expect(actionResult.isOk()).toBe(true);
      if (actionResult.isOk()) {
        const assessment = registry.assessRisk(actionResult.value);

        expect(assessment.riskLevel).toBe('critical');
        expect(assessment.requiresApproval).toBe(true);
        expect(assessment.riskFactors.some(f => f.name === 'dangerous_command')).toBe(true);
      }
    });
  });

  describe('list', () => {
    it('should list all registered tools', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'another_tool' });

      const tools = registry.list();

      expect(tools.length).toBe(2);
      expect(tools.map(t => t.name)).toContain('mock_tool');
      expect(tools.map(t => t.name)).toContain('another_tool');
    });
  });

  describe('approval events', () => {
    it('should emit approval:required event for critical risk actions', async () => {
      // 承認が必要なツールを登録
      const criticalTool: ToolDefinition<{ target: string }, void> = {
        name: 'critical_tool',
        description: 'A critical tool',
        category: 'execute',
        paramsSchema: {
          type: 'object',
          properties: { target: { type: 'string' } },
          required: ['target'],
        },
        resultSchema: {},
        defaultRiskLevel: 'critical',
        defaultTimeout: 30,
        execute: async () => {},
      };
      registry.register(criticalTool);

      const events: unknown[] = [];
      registry.on('approval:required', (event) => {
        events.push(event);
        // 承認を即座に解決
        registry.resolveApproval(event.actionId, true);
      });

      const actionResult = registry.createAction({
        toolName: 'critical_tool',
        params: { target: '/etc/passwd' },
        requestedBy: 'agent-001',
      });

      if (actionResult.isOk()) {
        await registry.execute(actionResult.value, {});
      }

      expect(events.length).toBeGreaterThan(0);
    });

    it('should allow resolving approval externally', () => {
      registry.register({ ...mockTool, name: 'approve_test' });

      const actionResult = registry.createAction({
        toolName: 'approve_test',
        params: { query: 'test' },
        requestedBy: 'agent-001',
      });

      if (actionResult.isOk()) {
        // 承認待ちを確認
        const pending = registry.getPendingApprovals();
        expect(pending.length).toBe(0); // まだ実行していないので空

        // resolveApproval は承認待ちがないとfalseを返す
        const resolved = registry.resolveApproval(actionResult.value.id, true);
        expect(resolved).toBe(false);
      }
    });

    it('should clear pending approvals', () => {
      registry.clearPendingApprovals();
      const pending = registry.getPendingApprovals();
      expect(pending.length).toBe(0);
    });
  });
});
