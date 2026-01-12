/**
 * KatashiroMCPServer - MCP準拠サーバー実装
 *
 * Model Context Protocol (https://modelcontextprotocol.io) に準拠
 * JSON-RPC 2.0ベースのプロトコルでTools, Resources, Promptsを提供
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-060
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import { WebSearchClient, WebScraper } from '@nahisaho/katashiro-collector';
import { TextAnalyzer, EntityExtractor } from '@nahisaho/katashiro-analyzer';
import { SummaryGenerator, ReportGenerator } from '@nahisaho/katashiro-generator';
import { KnowledgeGraph, GraphQuery } from '@nahisaho/katashiro-knowledge';

/**
 * MCP Tool definition (JSON Schema based)
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Prompt definition
 */
export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Tool execution result (MCP content array format)
 */
export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Prompt result (MCP messages format)
 */
export interface PromptResult {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}

/**
 * Server capabilities (MCP capability negotiation)
 */
export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
}

/**
 * Server info
 */
export interface ServerInfo {
  name: string;
  version: string;
}

/**
 * KatashiroMCPServer
 *
 * MCP server implementation for KATASHIRO
 * Provides tools, resources, and prompts for AI-powered research
 */
export class KatashiroMCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  // KATASHIRO service instances
  private webSearchClient: WebSearchClient;
  private webScraper: WebScraper;
  private textAnalyzer: TextAnalyzer;
  private entityExtractor: EntityExtractor;
  private summaryGenerator: SummaryGenerator;
  private reportGenerator: ReportGenerator;
  private knowledgeGraph: KnowledgeGraph;

  private readonly serverInfo: ServerInfo = {
    name: 'katashiro',
    version: '0.2.3',
  };

  private readonly capabilities: ServerCapabilities = {
    tools: { listChanged: true },
    resources: { subscribe: false, listChanged: true },
    prompts: { listChanged: true },
  };

  constructor() {
    // Initialize KATASHIRO services
    this.webSearchClient = new WebSearchClient();
    this.webScraper = new WebScraper();
    this.textAnalyzer = new TextAnalyzer();
    this.entityExtractor = new EntityExtractor();
    this.summaryGenerator = new SummaryGenerator();
    this.reportGenerator = new ReportGenerator();
    this.knowledgeGraph = new KnowledgeGraph();

    this.registerTools();
    this.registerPrompts();
    this.registerResources();
  }

  /**
   * Get server name
   */
  getName(): string {
    return this.serverInfo.name;
  }

  /**
   * Get server info
   */
  getServerInfo(): ServerInfo {
    return this.serverInfo;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): ServerCapabilities {
    return this.capabilities;
  }

  /**
   * Get all registered tools (tools/list)
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all registered prompts (prompts/list)
   */
  getPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Execute a tool (tools/call)
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const tool = this.tools.get(name);
      if (!tool) {
        return err(new Error(`Unknown tool: ${name}`));
      }

      const result = await this.handleToolExecution(name, args);
      return result;
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute a prompt (prompts/get)
   */
  async executePrompt(
    name: string,
    args: Record<string, unknown>
  ): Promise<Result<PromptResult, Error>> {
    try {
      const prompt = this.prompts.get(name);
      if (!prompt) {
        return err(new Error(`Unknown prompt: ${name}`));
      }

      const result = await this.handlePromptExecution(name, args);
      return result;
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List all resources (resources/list)
   */
  async listResources(): Promise<Result<MCPResource[], Error>> {
    try {
      return ok(Array.from(this.resources.values()));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Read a resource (resources/read)
   */
  async readResource(uri: string): Promise<Result<string, Error>> {
    try {
      const resource = this.resources.get(uri);
      if (!resource) {
        return err(new Error(`Resource not found: ${uri}`));
      }

      return ok(`Resource content for: ${uri}`);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Register KATASHIRO tools
   */
  private registerTools(): void {
    // Web Search Tool
    this.tools.set('web_search', {
      name: 'web_search',
      description: 'Search the web for information using DuckDuckGo or SearXNG',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: { type: 'number', description: 'Maximum number of results (default: 10)' },
          provider: { type: 'string', description: 'Search provider: duckduckgo or searxng (default: duckduckgo)' },
        },
        required: ['query'],
      },
    });

    // Web Scrape Tool
    this.tools.set('web_scrape', {
      name: 'web_scrape',
      description: 'Scrape content from a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to scrape' },
        },
        required: ['url'],
      },
    });

    // Analyze Content Tool
    this.tools.set('analyze_content', {
      name: 'analyze_content',
      description: 'Analyze text content for keywords, complexity, and sentiment',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to analyze' },
        },
        required: ['content'],
      },
    });

    // Extract Entities Tool
    this.tools.set('extract_entities', {
      name: 'extract_entities',
      description: 'Extract entities (persons, organizations, locations, dates, URLs, emails) from text',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to extract entities from' },
        },
        required: ['content'],
      },
    });

    // Generate Summary Tool
    this.tools.set('generate_summary', {
      name: 'generate_summary',
      description: 'Generate a summary of the provided content',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to summarize' },
          maxLength: { type: 'number', description: 'Maximum summary length in characters (default: 500)' },
          style: { type: 'string', description: 'Summary style: paragraph, bullets, or headline (default: paragraph)' },
        },
        required: ['content'],
      },
    });

    // Knowledge Add Node Tool
    this.tools.set('knowledge_add_node', {
      name: 'knowledge_add_node',
      description: 'Add a node to the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique node ID' },
          type: { type: 'string', description: 'Node type (e.g., person, organization, concept)' },
          properties: { type: 'object', description: 'Node properties as key-value pairs' },
        },
        required: ['id', 'type'],
      },
    });

    // Knowledge Query Tool
    this.tools.set('knowledge_query', {
      name: 'knowledge_query',
      description: 'Query the knowledge graph for nodes and relationships',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text' },
          type: { type: 'string', description: 'Optional node type filter' },
          limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
        },
        required: ['query'],
      },
    });

    // Generate Report Tool
    this.tools.set('generate_report', {
      name: 'generate_report',
      description: 'Generate a structured report from sections',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Report title' },
          sections: { 
            type: 'array', 
            description: 'Array of sections with heading and content',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                content: { type: 'string' },
              },
            },
          },
          format: { type: 'string', description: 'Output format: markdown or html (default: markdown)' },
        },
        required: ['title', 'sections'],
      },
    });
  }

  /**
   * Register KATASHIRO prompts
   */
  private registerPrompts(): void {
    this.prompts.set('research_topic', {
      name: 'research_topic',
      description: 'Research a topic comprehensively using web search and analysis',
      arguments: [
        { name: 'topic', description: 'Topic to research', required: true },
        { name: 'depth', description: 'Research depth (shallow, moderate, deep)', required: false },
      ],
    });

    this.prompts.set('analyze_document', {
      name: 'analyze_document',
      description: 'Analyze a document for key insights and structure',
      arguments: [
        { name: 'document', description: 'Document content to analyze', required: true },
      ],
    });

    this.prompts.set('create_presentation', {
      name: 'create_presentation',
      description: 'Create a presentation outline from research',
      arguments: [
        { name: 'topic', description: 'Presentation topic', required: true },
        { name: 'slides', description: 'Number of slides', required: false },
      ],
    });
  }

  /**
   * Register KATASHIRO resources
   */
  private registerResources(): void {
    this.resources.set('katashiro://knowledge/graph', {
      uri: 'katashiro://knowledge/graph',
      name: 'Knowledge Graph',
      description: 'The knowledge graph containing research data',
      mimeType: 'application/json',
    });

    this.resources.set('katashiro://patterns/library', {
      uri: 'katashiro://patterns/library',
      name: 'Pattern Library',
      description: 'Learned patterns from user feedback',
      mimeType: 'application/json',
    });

    this.resources.set('katashiro://feedback/stats', {
      uri: 'katashiro://feedback/stats',
      name: 'Feedback Statistics',
      description: 'Statistics about user feedback and learning',
      mimeType: 'application/json',
    });
  }

  /**
   * Handle tool execution
   */
  private async handleToolExecution(
    name: string,
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    switch (name) {
      case 'web_search':
        return this.executeWebSearch(args);
      case 'web_scrape':
        return this.executeWebScrape(args);
      case 'analyze_content':
        return this.executeAnalyzeContent(args);
      case 'extract_entities':
        return this.executeExtractEntities(args);
      case 'generate_summary':
        return this.executeGenerateSummary(args);
      case 'knowledge_add_node':
        return this.executeKnowledgeAddNode(args);
      case 'knowledge_query':
        return this.executeKnowledgeQuery(args);
      case 'generate_report':
        return this.executeGenerateReport(args);
      default:
        return err(new Error(`Unhandled tool: ${name}`));
    }
  }

  /**
   * Handle prompt execution
   */
  private async handlePromptExecution(
    name: string,
    args: Record<string, unknown>
  ): Promise<Result<PromptResult, Error>> {
    const topic = String(args['topic'] || args['document'] || 'Unknown');

    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Execute prompt "${name}" with topic: ${topic}`,
          },
        },
      ],
    });
  }

  // Tool implementations using actual KATASHIRO packages

  private async executeWebSearch(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const query = String(args['query']);
      const maxResults = Number(args['maxResults']) || 10;
      const provider = String(args['provider'] || 'duckduckgo') as 'duckduckgo' | 'searxng';

      const results = await this.webSearchClient.search(
        { query, maxResults },
        { provider }
      );

      const formattedResults = results
        .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || ''}`)
        .join('\n\n');

      return ok({
        content: [
          {
            type: 'text',
            text: `Search results for "${query}" (${results.length} results):\n\n${formattedResults}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Search error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeWebScrape(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const url = String(args['url']);
      const result = await this.webScraper.scrape(url);

      if (isOk(result)) {
        const content = result.value.content;
        // Truncate if too long
        const truncatedContent = content.length > 10000 
          ? content.substring(0, 10000) + '\n\n[Content truncated...]'
          : content;

        return ok({
          content: [
            {
              type: 'text',
              text: `Content from ${url}:\n\nTitle: ${result.value.title || 'N/A'}\n\n${truncatedContent}`,
            },
          ],
        });
      } else {
        return ok({
          content: [{ type: 'text', text: `Scrape error: ${result.error.message}` }],
          isError: true,
        });
      }
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Scrape error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeAnalyzeContent(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const content = String(args['content']);
      const analysis = await this.textAnalyzer.analyze(content);

      const result = {
        keywords: analysis.keywords.slice(0, 20),
        complexity: analysis.complexity,
        sentiment: analysis.sentiment,
        wordCount: analysis.wordCount,
        sentenceCount: analysis.sentenceCount,
      };

      return ok({
        content: [
          {
            type: 'text',
            text: `Text Analysis:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Analysis error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeExtractEntities(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const content = String(args['content']);
      const entities = await this.entityExtractor.extract(content);

      const result = {
        persons: entities.persons,
        organizations: entities.organizations,
        locations: entities.locations,
        dates: entities.dates,
        urls: entities.urls,
        emails: entities.emails,
        money: entities.money,
        percentages: entities.percentages,
        totalCount: entities.all.length,
      };

      return ok({
        content: [
          {
            type: 'text',
            text: `Extracted Entities:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Entity extraction error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeGenerateSummary(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const content = String(args['content']);
      const maxLength = Number(args['maxLength']) || 500;
      const style = String(args['style'] || 'paragraph') as 'paragraph' | 'bullets' | 'headline';

      const summary = await this.summaryGenerator.generate(content, { maxLength, style });

      return ok({
        content: [
          {
            type: 'text',
            text: `Summary (${style}, max ${maxLength} chars):\n\n${summary}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Summary generation error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeKnowledgeAddNode(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const id = String(args['id']);
      const type = String(args['type']);
      const properties = (args['properties'] as Record<string, unknown>) || {};

      this.knowledgeGraph.addNode({
        id,
        type,
        properties,
      });

      return ok({
        content: [
          {
            type: 'text',
            text: `Node added to knowledge graph:\n\nID: ${id}\nType: ${type}\nProperties: ${JSON.stringify(properties)}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Knowledge add error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeKnowledgeQuery(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const queryText = String(args['query']);
      const type = args['type'] ? String(args['type']) : undefined;
      const limit = Number(args['limit']) || 10;

      const graphQuery = new GraphQuery(this.knowledgeGraph);
      let results = graphQuery.search(queryText);

      if (type) {
        results = results.filter(node => node.type === type);
      }

      results = results.slice(0, limit);

      return ok({
        content: [
          {
            type: 'text',
            text: `Knowledge Graph Query Results (${results.length} nodes):\n\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Knowledge query error: ${error}` }],
        isError: true,
      });
    }
  }

  private async executeGenerateReport(
    args: Record<string, unknown>
  ): Promise<Result<ToolResult, Error>> {
    try {
      const title = String(args['title']);
      const sections = (args['sections'] as Array<{ heading: string; content: string }>) || [];
      const format = String(args['format'] || 'markdown') as 'markdown' | 'html';

      const report = await this.reportGenerator.generate({
        title,
        sections,
        format,
      });

      return ok({
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      });
    } catch (error) {
      return ok({
        content: [{ type: 'text', text: `Report generation error: ${error}` }],
        isError: true,
      });
    }
  }
}
