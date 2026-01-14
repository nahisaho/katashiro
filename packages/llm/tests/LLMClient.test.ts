/**
 * LLM Client Tests
 *
 * @design DES-KATASHIRO-003-LLM §3.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LLMClient,
  initLLMClient,
  getLLMClient,
  resetLLMClient,
} from '../src/LLMClient.js';
import { MockLLMProvider } from '../src/providers/MockLLMProvider.js';
import type { GenerateRequest } from '../src/types.js';

describe('LLMClient', () => {
  beforeEach(() => {
    resetLLMClient();
  });

  const makeRequest = (content: string): GenerateRequest => ({
    messages: [{ role: 'user', content }],
  });

  describe('initialization', () => {
    it('should initialize with provider', () => {
      const provider = new MockLLMProvider();
      const client = initLLMClient({ provider });
      expect(client).toBeInstanceOf(LLMClient);
    });

    it('should return singleton via getLLMClient', () => {
      const provider = new MockLLMProvider();
      const client1 = initLLMClient({ provider });
      const client2 = getLLMClient();
      expect(client1).toBe(client2);
    });

    it('should throw if getLLMClient called before init', () => {
      expect(() => getLLMClient()).toThrow('LLM client not initialized');
    });
  });

  describe('generate', () => {
    it('should generate response from primary provider', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Test response',
      });
      const client = new LLMClient({ provider });

      const response = await client.generate(makeRequest('Hello'));

      expect(response.content).toBe('Test response');
      expect(response.model).toBe('mock-model');
    });

    it('should include usage information', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Response',
      });
      const client = new LLMClient({ provider });

      const response = await client.generate(makeRequest('Hello'));

      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThanOrEqual(0);
    });

    it('should use custom response generator', async () => {
      const provider = new MockLLMProvider({
        responseGenerator: (req) => `Echo: ${typeof req.messages[0]?.content === 'string' ? req.messages[0].content : ''}`,
      });
      const client = new LLMClient({ provider });

      const response = await client.generate(makeRequest('Hello World'));

      expect(response.content).toBe('Echo: Hello World');
    });
  });

  describe('fallback', () => {
    it('should fallback to secondary provider on failure', async () => {
      const primary = new MockLLMProvider({
        shouldFail: true,
        errorMessage: 'Primary failed',
      });
      const fallback = new MockLLMProvider({
        defaultResponse: 'Fallback response',
      });

      const client = new LLMClient({
        provider: primary,
        fallbackProviders: [fallback],
        enableRetry: false, // リトライ無効
      });

      const response = await client.generate(makeRequest('Hello'));

      expect(response.content).toBe('Fallback response');
      expect(response._fallback).toBeDefined();
      expect(response._fallback?.provider).toBe('mock');
      expect(response._fallback?.attemptedProviders).toContain('mock');
    });

    it('should throw if all providers fail', async () => {
      const primary = new MockLLMProvider({ shouldFail: true });
      const fallback = new MockLLMProvider({ shouldFail: true });

      const client = new LLMClient({
        provider: primary,
        fallbackProviders: [fallback],
        enableRetry: false,
      });

      await expect(client.generate(makeRequest('Hello')))
        .rejects.toThrow('All LLM providers failed');
    });
  });

  describe('retry', () => {
    it('should retry on failure with delay', async () => {
      let attempts = 0;
      const provider = new MockLLMProvider({
        responseGenerator: () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return 'Success after retry';
        },
      });

      const client = new LLMClient({
        provider,
        enableRetry: true,
        retryCount: 3,
        retryDelay: 10, // 短い遅延でテスト
      });

      const response = await client.generate(makeRequest('Hello'));
      expect(response.content).toBe('Success after retry');
    });
  });

  describe('streaming', () => {
    it('should stream response chunks', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Hello World',
      });
      const client = new LLMClient({ provider });

      const chunks: string[] = [];
      for await (const chunk of client.generateStream(makeRequest('Hi'))) {
        if (chunk.type === 'content' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks.join('')).toBe('Hello World');
    });
  });

  describe('getProviders', () => {
    it('should return all providers', () => {
      const primary = new MockLLMProvider();
      const fallback1 = new MockLLMProvider();
      const fallback2 = new MockLLMProvider();

      const client = new LLMClient({
        provider: primary,
        fallbackProviders: [fallback1, fallback2],
      });

      expect(client.getProviders()).toHaveLength(3);
    });
  });
});
