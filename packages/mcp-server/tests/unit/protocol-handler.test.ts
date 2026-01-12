/**
 * Protocol Handler テスト
 *
 * @task TSK-061
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KatashiroMCPServer } from '../../src/server/mcp-server.js';
import {
  MCPProtocolHandler,
  MCP_PROTOCOL_VERSION,
} from '../../src/protocol/protocol-handler.js';
import type {
  JsonRpcRequest,
  JsonRpcNotification,
} from '../../src/transport/stdio-transport.js';

describe('MCPProtocolHandler', () => {
  let server: KatashiroMCPServer;
  let handler: MCPProtocolHandler;

  beforeEach(() => {
    server = new KatashiroMCPServer();
    handler = new MCPProtocolHandler(server);
  });

  describe('initialization', () => {
    it('should start in uninitialized state', () => {
      expect(handler.getState()).toBe('uninitialized');
    });

    it('should have null client info before initialization', () => {
      expect(handler.getClientInfo()).toBeNull();
    });
  });

  describe('initialize method', () => {
    it('should handle initialize request', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      const response = await handler.handleMessage(request);

      expect(response).toBeDefined();
      expect(response?.result).toBeDefined();

      const result = response?.result as {
        protocolVersion: string;
        serverInfo: { name: string; version: string };
      };
      expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
      expect(result.serverInfo.name).toBe('katashiro');
      expect(handler.getState()).toBe('initializing');
    });

    it('should store client info after initialization', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      await handler.handleMessage(request);

      expect(handler.getClientInfo()).toEqual({
        name: 'test-client',
        version: '1.0.0',
      });
    });

    it('should reject double initialization', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      };

      // First initialization
      await handler.handleMessage(request);

      // Second initialization should fail
      const response2 = await handler.handleMessage({ ...request, id: 2 });

      expect(response2?.error).toBeDefined();
    });
  });

  describe('notifications', () => {
    it('should handle initialized notification', async () => {
      // First initialize
      const initRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      };
      await handler.handleMessage(initRequest);

      // Then send initialized notification
      const notification: JsonRpcNotification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      };

      const result = await handler.handleMessage(notification);

      expect(result).toBeUndefined(); // Notifications don't return responses
      expect(handler.getState()).toBe('ready');
    });
  });

  describe('ping method', () => {
    it('should respond to ping', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toEqual({});
    });
  });

  describe('tools methods', () => {
    beforeEach(async () => {
      // Initialize first
      await handler.handleMessage({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      });
    });

    it('should list tools', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
      const result = response?.result as { tools: unknown[] };
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should call tool', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'web_search',
          arguments: { query: 'test' },
        },
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
      expect(response?.error).toBeUndefined();
    });

    it('should return error for missing tool name', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const response = await handler.handleMessage(request);

      expect(response?.error).toBeDefined();
      expect(response?.error?.message).toContain('Tool name required');
    });
  });

  describe('resources methods', () => {
    beforeEach(async () => {
      await handler.handleMessage({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      });
    });

    it('should list resources', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list',
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
      const result = response?.result as { resources: unknown[] };
      expect(Array.isArray(result.resources)).toBe(true);
    });

    it('should read resource', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: {
          uri: 'katashiro://knowledge/graph',
        },
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
    });
  });

  describe('prompts methods', () => {
    beforeEach(async () => {
      await handler.handleMessage({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      });
    });

    it('should list prompts', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/list',
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
      const result = response?.result as { prompts: unknown[] };
      expect(Array.isArray(result.prompts)).toBe(true);
    });

    it('should get prompt', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: {
          name: 'research_topic',
          arguments: { topic: 'AI' },
        },
      };

      const response = await handler.handleMessage(request);

      expect(response?.result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return method not found for unknown methods', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown/method',
      };

      const response = await handler.handleMessage(request);

      expect(response?.error).toBeDefined();
      expect(response?.error?.code).toBe(-32601); // Method not found
    });

    it('should reject operations before initialization', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const response = await handler.handleMessage(request);

      expect(response?.error).toBeDefined();
    });
  });
});
