/**
 * StdioTransport - STDIO based JSON-RPC transport for MCP
 *
 * MCP specification compliant transport layer
 * Uses newline-delimited JSON (NDJSON) for message framing
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-061
 */

import * as readline from 'readline';
import type { Readable, Writable } from 'stream';

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Notification (no id)
 */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

/**
 * JSON-RPC 2.0 Error
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Standard JSON-RPC error codes
 */
export const JsonRpcErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

/**
 * Message handler type
 */
export type MessageHandler = (
  message: JsonRpcRequest | JsonRpcNotification
) => Promise<JsonRpcResponse | void>;

/**
 * Transport state
 */
export type TransportState = 'disconnected' | 'connected' | 'closed';

/**
 * StdioTransport
 *
 * Handles STDIO communication for MCP servers
 * Implements JSON-RPC 2.0 over newline-delimited JSON
 */
export class StdioTransport {
  private state: TransportState = 'disconnected';
  private readline: readline.Interface | null = null;
  private messageHandler: MessageHandler | null = null;
  private errorHandler: ((error: Error) => void) | null = null;

  constructor(
    private readonly input: Readable = process.stdin,
    private readonly output: Writable = process.stdout
  ) {}

  /**
   * Get current state
   */
  getState(): TransportState {
    return this.state;
  }

  /**
   * Set message handler
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Set error handler
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Start the transport
   */
  start(): void {
    if (this.state !== 'disconnected') {
      return;
    }

    this.readline = readline.createInterface({
      input: this.input,
      terminal: false,
    });

    this.readline.on('line', (line) => {
      this.handleLine(line);
    });

    this.readline.on('close', () => {
      this.state = 'closed';
    });

    this.readline.on('error', (error) => {
      if (this.errorHandler) {
        this.errorHandler(error);
      }
    });

    this.state = 'connected';
  }

  /**
   * Stop the transport
   */
  stop(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    this.state = 'closed';
  }

  /**
   * Send a response
   */
  send(message: JsonRpcResponse | JsonRpcNotification): void {
    if (this.state !== 'connected') {
      throw new Error('Transport not connected');
    }

    const json = JSON.stringify(message);
    this.output.write(json + '\n');
  }

  /**
   * Handle incoming line
   */
  private async handleLine(line: string): Promise<void> {
    if (!line.trim()) {
      return;
    }

    try {
      const message = JSON.parse(line) as JsonRpcRequest | JsonRpcNotification;

      // Validate JSON-RPC message
      if (!this.isValidJsonRpcMessage(message)) {
        this.sendError(null, JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
        return;
      }

      if (this.messageHandler) {
        const response = await this.messageHandler(message);
        if (response) {
          this.send(response);
        }
      }
    } catch (error) {
      // Parse error
      this.sendError(null, JsonRpcErrorCode.ParseError, 'Parse error');
    }
  }

  /**
   * Validate JSON-RPC message
   */
  private isValidJsonRpcMessage(
    message: unknown
  ): message is JsonRpcRequest | JsonRpcNotification {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Record<string, unknown>;
    if (msg['jsonrpc'] !== '2.0') {
      return false;
    }

    if (typeof msg['method'] !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Send error response
   */
  private sendError(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
  ): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: id ?? 0,
      error: {
        code,
        message,
        data,
      },
    };

    this.send(response);
  }
}

/**
 * Create a success response
 */
export function createSuccessResponse(
  id: string | number,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  id: string | number,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}
