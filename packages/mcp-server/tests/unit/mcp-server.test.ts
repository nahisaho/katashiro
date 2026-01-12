/**
 * MCP Server テスト
 *
 * @task TSK-060
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KatashiroMCPServer } from '../../src/server/mcp-server.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('KatashiroMCPServer', () => {
  let server: KatashiroMCPServer;

  beforeEach(() => {
    server = new KatashiroMCPServer();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(server).toBeDefined();
      expect(server.getName()).toBe('katashiro');
    });

    it('should have server info', () => {
      const info = server.getServerInfo();
      expect(info.name).toBe('katashiro');
      expect(info.version).toBe('0.2.3');
    });

    it('should have capabilities', () => {
      const caps = server.getCapabilities();
      expect(caps.tools).toBeDefined();
      expect(caps.resources).toBeDefined();
      expect(caps.prompts).toBeDefined();
    });

    it('should have all tools registered', () => {
      const tools = server.getTools();
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('web_search');
      expect(toolNames).toContain('web_scrape');
      expect(toolNames).toContain('analyze_content');
      expect(toolNames).toContain('extract_entities');
      expect(toolNames).toContain('generate_summary');
      expect(toolNames).toContain('knowledge_add_node');
      expect(toolNames).toContain('knowledge_query');
      expect(toolNames).toContain('generate_report');
    });

    it('should have all prompts registered', () => {
      const prompts = server.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);

      const promptNames = prompts.map((p) => p.name);
      expect(promptNames).toContain('research_topic');
      expect(promptNames).toContain('analyze_document');
      expect(promptNames).toContain('create_presentation');
    });
  });

  describe('tool execution', () => {
    it('should execute web_search tool', async () => {
      const result = await server.executeTool('web_search', {
        query: 'TypeScript best practices',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBeDefined();
        expect(result.value.content[0].type).toBe('text');
      }
    });

    it('should execute analyze_content tool', async () => {
      const result = await server.executeTool('analyze_content', {
        content: 'This is a sample text for analysis.',
        type: 'text',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBeDefined();
      }
    });

    it('should execute generate_summary tool', async () => {
      const result = await server.executeTool('generate_summary', {
        content: 'Long article about AI developments in 2025...',
        style: 'brief',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should execute knowledge_query tool', async () => {
      const result = await server.executeTool('knowledge_query', {
        query: 'AI research',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should execute generate_report tool', async () => {
      const result = await server.executeTool('generate_report', {
        topic: 'Market Analysis',
        format: 'markdown',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should return error for unknown tool', async () => {
      const result = await server.executeTool('unknown_tool', {});
      expect(isOk(result)).toBe(false);
    });
  });

  describe('prompt execution', () => {
    it('should execute research_topic prompt', async () => {
      const result = await server.executePrompt('research_topic', {
        topic: 'Machine Learning',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
      }
    });

    it('should execute analyze_document prompt', async () => {
      const result = await server.executePrompt('analyze_document', {
        document: 'Sample document content',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should return error for unknown prompt', async () => {
      const result = await server.executePrompt('unknown_prompt', {});
      expect(isOk(result)).toBe(false);
    });
  });

  describe('resource management', () => {
    it('should list resources', async () => {
      const result = await server.listResources();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it('should read resource', async () => {
      const result = await server.readResource('katashiro://knowledge/graph');
      expect(isOk(result)).toBe(true);
    });

    it('should return error for unknown resource', async () => {
      const result = await server.readResource('katashiro://unknown/resource');
      expect(isOk(result)).toBe(false);
    });
  });
});
