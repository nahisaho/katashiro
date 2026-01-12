/**
 * MCPProtocolHandler - MCP Protocol implementation
 *
 * Implements the Model Context Protocol JSON-RPC handlers
 * Handles lifecycle, tools, resources, and prompts methods
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-061
 */

import { isOk } from '@nahisaho/katashiro-core';
import type {
  KatashiroMCPServer,
  ServerCapabilities,
  ServerInfo,
  MCPResource,
} from '../server/mcp-server.js';
import {
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  JsonRpcErrorCode,
  createSuccessResponse,
  createErrorResponse,
} from '../transport/stdio-transport.js';

/**
 * MCP Protocol version
 */
export const MCP_PROTOCOL_VERSION = '2024-11-05';

/**
 * Initialize request params
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * Initialize result
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}

/**
 * Tools/list result
 */
export interface ToolsListResult {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
}

/**
 * Tools/call params
 */
export interface ToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * Resources/list result
 */
export interface ResourcesListResult {
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
}

/**
 * Resources/read params
 */
export interface ResourcesReadParams {
  uri: string;
}

/**
 * Prompts/list result
 */
export interface PromptsListResult {
  prompts: Array<{
    name: string;
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required?: boolean;
    }>;
  }>;
}

/**
 * Prompts/get params
 */
export interface PromptsGetParams {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * Protocol state
 */
export type ProtocolState = 'uninitialized' | 'initializing' | 'ready' | 'shutdown';

/**
 * MCPProtocolHandler
 *
 * Handles MCP protocol messages and delegates to KatashiroMCPServer
 */
export class MCPProtocolHandler {
  private state: ProtocolState = 'uninitialized';
  private clientInfo: { name: string; version: string } | null = null;

  constructor(private readonly server: KatashiroMCPServer) {}

  /**
   * Get current protocol state
   */
  getState(): ProtocolState {
    return this.state;
  }

  /**
   * Get client info (after initialization)
   */
  getClientInfo(): { name: string; version: string } | null {
    return this.clientInfo;
  }

  /**
   * Handle incoming JSON-RPC message
   */
  async handleMessage(
    message: JsonRpcRequest | JsonRpcNotification
  ): Promise<JsonRpcResponse | void> {
    const isRequest = 'id' in message;
    const method = message.method;

    // Handle notifications (no response expected)
    if (!isRequest) {
      await this.handleNotification(message as JsonRpcNotification);
      return;
    }

    const request = message as JsonRpcRequest;

    // Route based on method
    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(request);

        case 'ping':
          return this.handlePing(request);

        case 'tools/list':
          return this.handleToolsList(request);

        case 'tools/call':
          return this.handleToolsCall(request);

        case 'resources/list':
          return this.handleResourcesList(request);

        case 'resources/read':
          return this.handleResourcesRead(request);

        case 'prompts/list':
          return this.handlePromptsList(request);

        case 'prompts/get':
          return this.handlePromptsGet(request);

        default:
          return createErrorResponse(
            request.id,
            JsonRpcErrorCode.MethodNotFound,
            `Method not found: ${method}`
          );
      }
    } catch (error) {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  /**
   * Handle notifications
   */
  private async handleNotification(
    notification: JsonRpcNotification
  ): Promise<void> {
    switch (notification.method) {
      case 'notifications/initialized':
        if (this.state === 'initializing') {
          this.state = 'ready';
        }
        break;

      case 'notifications/cancelled':
        // Handle cancellation (not implemented yet)
        break;

      default:
        // Unknown notification - ignore
        break;
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    if (this.state !== 'uninitialized') {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InvalidRequest,
        'Already initialized'
      );
    }

    const params = request.params as InitializeParams;
    this.clientInfo = params.clientInfo;
    this.state = 'initializing';

    const result: InitializeResult = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: this.server.getCapabilities(),
      serverInfo: this.server.getServerInfo(),
    };

    return createSuccessResponse(request.id, result);
  }

  /**
   * Handle ping request
   */
  private handlePing(request: JsonRpcRequest): JsonRpcResponse {
    return createSuccessResponse(request.id, {});
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
    this.ensureReady();

    const tools = this.server.getTools();
    const toolsResult: ToolsListResult = {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };

    return createSuccessResponse(request.id, toolsResult);
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    this.ensureReady();

    const params = request.params as ToolsCallParams;
    if (!params.name) {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InvalidParams,
        'Tool name required'
      );
    }

    const result = await this.server.executeTool(
      params.name,
      params.arguments || {}
    );

    if (isOk(result)) {
      return createSuccessResponse(request.id, result.value);
    } else {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        result.error.message
      );
    }
  }

  /**
   * Handle resources/list request
   */
  private async handleResourcesList(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    this.ensureReady();

    const result = await this.server.listResources();

    if (isOk(result)) {
      const resources: ResourcesListResult = {
        resources: result.value.map((r: MCPResource) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
      return createSuccessResponse(request.id, resources);
    } else {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        result.error.message
      );
    }
  }

  /**
   * Handle resources/read request
   */
  private async handleResourcesRead(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    this.ensureReady();

    const params = request.params as ResourcesReadParams;
    if (!params.uri) {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InvalidParams,
        'Resource URI required'
      );
    }

    const result = await this.server.readResource(params.uri);

    if (isOk(result)) {
      return createSuccessResponse(request.id, {
        contents: [
          {
            uri: params.uri,
            mimeType: 'text/plain',
            text: result.value,
          },
        ],
      });
    } else {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        result.error.message
      );
    }
  }

  /**
   * Handle prompts/list request
   */
  private handlePromptsList(request: JsonRpcRequest): JsonRpcResponse {
    this.ensureReady();

    const prompts = this.server.getPrompts();
    const promptsResult: PromptsListResult = {
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    };

    return createSuccessResponse(request.id, promptsResult);
  }

  /**
   * Handle prompts/get request
   */
  private async handlePromptsGet(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    this.ensureReady();

    const params = request.params as PromptsGetParams;
    if (!params.name) {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InvalidParams,
        'Prompt name required'
      );
    }

    const result = await this.server.executePrompt(
      params.name,
      params.arguments || {}
    );

    if (isOk(result)) {
      return createSuccessResponse(request.id, result.value);
    } else {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        result.error.message
      );
    }
  }

  /**
   * Ensure server is ready for operations
   */
  private ensureReady(): void {
    // Allow operations in both initializing and ready states
    // This matches MCP spec where operations can happen after initialize
    if (this.state === 'uninitialized') {
      throw new Error('Server not initialized');
    }
  }
}
