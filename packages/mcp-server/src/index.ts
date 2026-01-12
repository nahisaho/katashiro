/**
 * @nahisaho/katashiro-mcp-server
 * MCP (Model Context Protocol) サーバー実装
 *
 * Official MCP Specification: https://modelcontextprotocol.io
 *
 * @design DES-KATASHIRO-001 §2.4 MCP Server
 */

// Server
export { KatashiroMCPServer } from './server/mcp-server.js';
export type {
  MCPTool,
  MCPPrompt,
  MCPResource,
  ToolResult,
  PromptResult,
  ServerCapabilities,
  ServerInfo,
} from './server/mcp-server.js';

// Transport
export {
  StdioTransport,
  createSuccessResponse,
  createErrorResponse,
  JsonRpcErrorCode,
} from './transport/index.js';
export type {
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcResponse,
  JsonRpcError,
  MessageHandler,
  TransportState,
} from './transport/index.js';

// Protocol
export { MCPProtocolHandler, MCP_PROTOCOL_VERSION } from './protocol/index.js';
export type {
  InitializeParams,
  InitializeResult,
  ToolsListResult,
  ToolsCallParams,
  ResourcesListResult,
  ResourcesReadParams,
  PromptsListResult,
  PromptsGetParams,
  ProtocolState,
} from './protocol/index.js';

// Tools (legacy, for backward compatibility)
export { ToolRegistry } from './tools/tool-registry.js';
export type {
  ToolContent,
  ToolExecutionResult,
  ToolHandler,
  RegisteredTool,
} from './tools/tool-registry.js';

// Prompts (legacy, for backward compatibility)
export { PromptRegistry } from './prompts/prompt-registry.js';
export type {
  PromptArgument,
  RegisteredPrompt,
  ValidationResult,
} from './prompts/prompt-registry.js';

// Resources (legacy, for backward compatibility)
export { ResourceManager } from './resources/resource-manager.js';
export type {
  ResourceContent,
  ContentProvider,
  ResourceDefinition,
  ResourceTemplate,
  SubscriptionCallback,
} from './resources/resource-manager.js';
