/**
 * STDIO Transport テスト
 *
 * @task TSK-061
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Readable, Writable } from 'stream';
import {
  StdioTransport,
  createSuccessResponse,
  createErrorResponse,
  JsonRpcErrorCode,
} from '../../src/transport/stdio-transport.js';

/**
 * Create a mock readable stream
 */
function createMockReadable(): Readable {
  return new Readable({
    read() {
      // Do nothing - we'll push data manually
    },
  });
}

/**
 * Create a mock writable stream that captures output
 */
function createMockWritable(): { writable: Writable; output: string[] } {
  const output: string[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });
  return { writable, output };
}

describe('StdioTransport', () => {
  let transport: StdioTransport;
  let mockInput: Readable;
  let mockOutput: { writable: Writable; output: string[] };

  beforeEach(() => {
    mockInput = createMockReadable();
    mockOutput = createMockWritable();
    transport = new StdioTransport(mockInput, mockOutput.writable);
  });

  describe('initialization', () => {
    it('should start in disconnected state', () => {
      expect(transport.getState()).toBe('disconnected');
    });

    it('should transition to connected state on start', () => {
      transport.start();
      expect(transport.getState()).toBe('connected');
    });

    it('should transition to closed state on stop', () => {
      transport.start();
      transport.stop();
      expect(transport.getState()).toBe('closed');
    });
  });

  describe('message handling', () => {
    it('should call message handler on valid JSON-RPC message', async () => {
      let receivedMessage: unknown = null;

      transport.onMessage(async (message) => {
        receivedMessage = message;
        return createSuccessResponse(1, { result: 'ok' });
      });

      transport.start();

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: {},
      });

      mockInput.push(message + '\n');

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(receivedMessage).not.toBeNull();
      expect((receivedMessage as { method: string }).method).toBe('test');
    });

    it('should handle notifications (no id)', async () => {
      let receivedMessage: unknown = null;

      transport.onMessage(async (message) => {
        receivedMessage = message;
        return;
      });

      transport.start();

      const notification = JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/test',
        params: {},
      });

      mockInput.push(notification + '\n');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(receivedMessage).not.toBeNull();
    });
  });

  describe('message sending', () => {
    it('should send response to output', () => {
      transport.start();

      const response = createSuccessResponse(1, { data: 'test' });
      transport.send(response);

      expect(mockOutput.output.length).toBe(1);
      const sent = JSON.parse(mockOutput.output[0].trim());
      expect(sent.jsonrpc).toBe('2.0');
      expect(sent.id).toBe(1);
      expect(sent.result).toEqual({ data: 'test' });
    });

    it('should throw if transport not connected', () => {
      const response = createSuccessResponse(1, {});
      expect(() => transport.send(response)).toThrow('Transport not connected');
    });
  });
});

describe('JSON-RPC Response Helpers', () => {
  describe('createSuccessResponse', () => {
    it('should create valid success response', () => {
      const response = createSuccessResponse(1, { data: 'test' });
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ data: 'test' });
      expect(response.error).toBeUndefined();
    });

    it('should handle string id', () => {
      const response = createSuccessResponse('abc-123', { value: 42 });
      expect(response.id).toBe('abc-123');
    });
  });

  describe('createErrorResponse', () => {
    it('should create valid error response', () => {
      const response = createErrorResponse(
        1,
        JsonRpcErrorCode.MethodNotFound,
        'Method not found'
      );
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toBe('Method not found');
    });

    it('should include optional data', () => {
      const response = createErrorResponse(
        1,
        JsonRpcErrorCode.InvalidParams,
        'Invalid params',
        { field: 'name' }
      );
      expect(response.error?.data).toEqual({ field: 'name' });
    });
  });
});
