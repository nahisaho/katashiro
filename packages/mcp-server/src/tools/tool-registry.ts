/**
 * ToolRegistry - ツール登録・管理
 *
 * MCPツールの登録と実行を管理
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-061
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';

/**
 * Tool content item
 */
export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

/**
 * Tool result
 */
export interface ToolExecutionResult {
  content: ToolContent[];
  isError?: boolean;
}

/**
 * Tool handler function
 */
export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<ToolExecutionResult>;

/**
 * Registered tool
 */
export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: ToolHandler;
}

/**
 * ToolRegistry
 *
 * Manages MCP tool registration and execution
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a tool
   *
   * @param tool - Tool to register
   * @returns Result
   */
  register(tool: RegisteredTool): Result<void, Error> {
    try {
      if (this.tools.has(tool.name)) {
        return err(new Error(`Tool already registered: ${tool.name}`));
      }
      this.tools.set(tool.name, tool);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get a registered tool
   *
   * @param name - Tool name
   * @returns Tool or null
   */
  get(name: string): Result<RegisteredTool | null, Error> {
    try {
      return ok(this.tools.get(name) ?? null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List all registered tools
   *
   * @returns Array of tools
   */
  list(): Result<RegisteredTool[], Error> {
    try {
      return ok(Array.from(this.tools.values()));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute a tool
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns Execution result
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<Result<ToolExecutionResult, Error>> {
    try {
      const tool = this.tools.get(name);
      if (!tool) {
        return err(new Error(`Unknown tool: ${name}`));
      }

      const result = await tool.handler(args);
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unregister a tool
   *
   * @param name - Tool name
   * @returns Whether unregistered
   */
  unregister(name: string): Result<boolean, Error> {
    try {
      return ok(this.tools.delete(name));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if tool exists
   *
   * @param name - Tool name
   * @returns Whether exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}
