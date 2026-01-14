/**
 * Standard Tools Tests
 *
 * @requirement REQ-AGENT-003
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  SearchTool,
  ScrapeTool,
  AnalyzeTool,
  STANDARD_TOOLS,
  registerStandardTools,
} from '../src/tools/standard-tools.js';
import { ToolRegistry } from '../src/tool-registry.js';
import type { ToolExecutionContext } from '../src/action-observation-types.js';

// テスト用コンテキスト
function createTestContext(): ToolExecutionContext {
  return {
    requestId: 'test-req-1',
    agentId: 'test-agent-1',
    signal: new AbortController().signal,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    metadata: {},
  };
}

describe('SearchTool', () => {
  describe('definition', () => {
    it('should have correct name', () => {
      expect(SearchTool.name).toBe('web_search');
    });

    it('should have correct category', () => {
      expect(SearchTool.category).toBe('network');
    });

    it('should have low risk level', () => {
      expect(SearchTool.defaultRiskLevel).toBe('low');
    });

    it('should have correct schema with required query', () => {
      expect(SearchTool.paramsSchema).toHaveProperty('required');
      expect((SearchTool.paramsSchema as { required?: string[] }).required).toContain('query');
    });
  });

  describe('execute', () => {
    it('should return mock results in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true';

      const result = await SearchTool.execute(
        { query: 'test query' },
        createTestContext(),
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.title).toContain('test query');
      expect(result.provider).toBe('duckduckgo');
      expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should use specified provider', async () => {
      process.env.MOCK_MODE = 'true';

      const result = await SearchTool.execute(
        { query: 'test', provider: 'searxng' },
        createTestContext(),
      );

      expect(result.provider).toBe('searxng');
    });

    it('should respect maxResults parameter', async () => {
      process.env.MOCK_MODE = 'true';

      const result = await SearchTool.execute(
        { query: 'test', maxResults: 5 },
        createTestContext(),
      );

      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('ScrapeTool', () => {
  describe('definition', () => {
    it('should have correct name', () => {
      expect(ScrapeTool.name).toBe('web_scrape');
    });

    it('should have network category', () => {
      expect(ScrapeTool.category).toBe('network');
    });

    it('should have medium risk level', () => {
      expect(ScrapeTool.defaultRiskLevel).toBe('medium');
    });

    it('should require url parameter', () => {
      expect((ScrapeTool.paramsSchema as { required?: string[] }).required).toContain('url');
    });
  });

  describe('execute', () => {
    it('should return mock content in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true';

      const result = await ScrapeTool.execute(
        { url: 'https://example.com' },
        createTestContext(),
      );

      expect(result.content).toContain('Mock content');
      expect(result.title).toContain('example.com');
      expect(result.links).toHaveLength(2);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return contentLength', async () => {
      process.env.MOCK_MODE = 'true';

      const result = await ScrapeTool.execute(
        { url: 'https://test.com' },
        createTestContext(),
      );

      expect(result.contentLength).toBe(result.content.length);
    });
  });
});

describe('AnalyzeTool', () => {
  describe('definition', () => {
    it('should have correct name', () => {
      expect(AnalyzeTool.name).toBe('text_analyze');
    });

    it('should have read category', () => {
      expect(AnalyzeTool.category).toBe('read');
    });

    it('should have low risk level', () => {
      expect(AnalyzeTool.defaultRiskLevel).toBe('low');
    });

    it('should require text parameter', () => {
      expect((AnalyzeTool.paramsSchema as { required?: string[] }).required).toContain('text');
    });
  });

  describe('execute', () => {
    it('should analyze text length', async () => {
      const text = 'Hello world. This is a test.';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      expect(result.textLength).toBe(text.length);
    });

    it('should count words', async () => {
      const text = 'one two three four five';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      expect(result.wordCount).toBe(5);
    });

    it('should count sentences', async () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      expect(result.sentenceCount).toBe(3);
    });

    it('should extract keywords by default', async () => {
      const text = 'programming programming programming test test';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords[0]).toBe('programming');
    });

    it('should extract URLs as entities', async () => {
      const text = 'Visit https://example.com for more info';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      const urls = result.entities.filter((e) => e.type === 'URL');
      expect(urls.length).toBe(1);
      expect(urls[0]?.text).toBe('https://example.com');
    });

    it('should extract email as entities', async () => {
      const text = 'Contact us at test@example.com';
      const result = await AnalyzeTool.execute({ text }, createTestContext());

      const emails = result.entities.filter((e) => e.type === 'EMAIL');
      expect(emails.length).toBe(1);
      expect(emails[0]?.text).toBe('test@example.com');
    });

    it('should analyze sentiment when requested', async () => {
      const text = 'This is great and excellent product!';
      const result = await AnalyzeTool.execute(
        { text, options: { analyzeSentiment: true } },
        createTestContext(),
      );

      expect(result.sentiment).toBeDefined();
      expect(result.sentiment?.label).toBe('positive');
    });

    it('should detect negative sentiment', async () => {
      const text = 'This is terrible and awful experience';
      const result = await AnalyzeTool.execute(
        { text, options: { analyzeSentiment: true } },
        createTestContext(),
      );

      expect(result.sentiment?.label).toBe('negative');
    });

    it('should return processing time', async () => {
      const result = await AnalyzeTool.execute(
        { text: 'test' },
        createTestContext(),
      );

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('STANDARD_TOOLS', () => {
  it('should contain all standard tools', () => {
    expect(STANDARD_TOOLS).toHaveLength(3);
    expect(STANDARD_TOOLS.map((t) => t.name)).toEqual([
      'web_search',
      'web_scrape',
      'text_analyze',
    ]);
  });
});

describe('registerStandardTools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register all standard tools', () => {
    registerStandardTools(registry);

    expect(registry.has('web_search')).toBe(true);
    expect(registry.has('web_scrape')).toBe(true);
    expect(registry.has('text_analyze')).toBe(true);
  });

  it('should allow execution after registration', async () => {
    registerStandardTools(registry);

    const tool = registry.get('text_analyze');
    expect(tool).toBeDefined();

    if (tool) {
      const result = await tool.execute({ text: 'hello' }, createTestContext());
      expect(result).toHaveProperty('textLength');
    }
  });
});

describe('ToolRegistry extensions', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    registerStandardTools(registry);
  });

  describe('listByCategory', () => {
    it('should filter by network category', () => {
      const networkTools = registry.listByCategory('network');

      expect(networkTools).toHaveLength(2);
      expect(networkTools.map((t) => t.name)).toContain('web_search');
      expect(networkTools.map((t) => t.name)).toContain('web_scrape');
    });

    it('should filter by read category', () => {
      const readTools = registry.listByCategory('read');

      expect(readTools).toHaveLength(1);
      expect(readTools[0]?.name).toBe('text_analyze');
    });

    it('should return empty for non-existent category', () => {
      const tools = registry.listByCategory('execute');

      expect(tools).toHaveLength(0);
    });
  });

  describe('listByRiskLevel', () => {
    it('should filter by low risk level', () => {
      const lowRiskTools = registry.listByRiskLevel('low');

      expect(lowRiskTools).toHaveLength(2);
    });

    it('should filter by medium risk level', () => {
      const mediumRiskTools = registry.listByRiskLevel('medium');

      expect(mediumRiskTools).toHaveLength(1);
      expect(mediumRiskTools[0]?.name).toBe('web_scrape');
    });
  });

  describe('size', () => {
    it('should return correct tool count', () => {
      expect(registry.size).toBe(3);
    });
  });
});
