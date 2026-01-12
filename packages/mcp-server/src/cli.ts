#!/usr/bin/env node
/**
 * KATASHIRO MCP Server CLI
 *
 * Entry point for running the MCP server via STDIO transport
 *
 * Usage:
 *   npx @nahisaho/katashiro-mcp-server
 *   katashiro-mcp-server
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-062
 */

import { KatashiroMCPServer } from './server/mcp-server.js';
import { StdioTransport } from './transport/stdio-transport.js';
import { MCPProtocolHandler } from './protocol/protocol-handler.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Create server instance
  const server = new KatashiroMCPServer();

  // Create protocol handler
  const protocolHandler = new MCPProtocolHandler(server);

  // Create STDIO transport
  const transport = new StdioTransport();

  // Set up message handling
  transport.onMessage(async (message) => {
    return protocolHandler.handleMessage(message);
  });

  // Set up error handling
  transport.onError((error) => {
    console.error('[KATASHIRO MCP] Transport error:', error.message);
  });

  // Handle process signals
  process.on('SIGINT', () => {
    transport.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    transport.stop();
    process.exit(0);
  });

  // Start the transport
  transport.start();

  // Log startup (to stderr, not stdout which is used for JSON-RPC)
  console.error(`[KATASHIRO MCP] Server started: ${server.getName()} v${server.getServerInfo().version}`);
}

// Run main
main().catch((error) => {
  console.error('[KATASHIRO MCP] Fatal error:', error);
  process.exit(1);
});
