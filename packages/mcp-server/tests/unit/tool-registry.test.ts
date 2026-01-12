/**
 * ToolRegistry テスト
 *
 * @task TSK-061
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../src/tools/tool-registry.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registration', () => {
    it('should register a tool', () => {
      const result = registry.register({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        handler: async () => ({ content: [{ type: 'text', text: 'OK' }] }),
      });

      expect(isOk(result)).toBe(true);
    });

    it('should reject duplicate registration', () => {
      registry.register({
        name: 'test_tool',
        description: 'First',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });

      const result = registry.register({
        name: 'test_tool',
        description: 'Second',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });

      expect(isOk(result)).toBe(false);
    });
  });

  describe('lookup', () => {
    it('should get registered tool', () => {
      registry.register({
        name: 'my_tool',
        description: 'My tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });

      const result = registry.get('my_tool');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value?.name).toBe('my_tool');
      }
    });

    it('should return null for unknown tool', () => {
      const result = registry.get('unknown');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it('should list all tools', () => {
      registry.register({
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });
      registry.register({
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });

      const result = registry.list();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('execution', () => {
    it('should execute tool handler', async () => {
      registry.register({
        name: 'echo',
        description: 'Echo input',
        inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
        handler: async (args) => ({
          content: [{ type: 'text', text: String(args['message']) }],
        }),
      });

      const result = await registry.execute('echo', { message: 'Hello' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content[0]?.text).toBe('Hello');
      }
    });

    it('should return error for unknown tool', async () => {
      const result = await registry.execute('unknown', {});
      expect(isOk(result)).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister tool', () => {
      registry.register({
        name: 'temp_tool',
        description: 'Temporary',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [] }),
      });

      const result = registry.unregister('temp_tool');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });
  });
});
