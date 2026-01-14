/**
 * MockLLMProvider Tests
 *
 * @design DES-KATASHIRO-003-LLM §3.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMProvider } from '../src/providers/MockLLMProvider.js';
import type { GenerateRequest } from '../src/types.js';

describe('MockLLMProvider', () => {
  const makeRequest = (content: string): GenerateRequest => ({
    messages: [{ role: 'user', content }],
  });

  describe('basic generation', () => {
    it('should return default response', async () => {
      const provider = new MockLLMProvider();
      const response = await provider.generate(makeRequest('Hello'));

      expect(response.content).toBe('This is a mock response.');
      expect(response.model).toBe('mock-model');
      expect(response.finishReason).toBe('stop');
    });

    it('should return custom response', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Custom response',
      });
      const response = await provider.generate(makeRequest('Hello'));

      expect(response.content).toBe('Custom response');
    });

    it('should use response generator', async () => {
      const provider = new MockLLMProvider({
        responseGenerator: (req) => {
          const content = req.messages[0]?.content;
          return `You said: ${typeof content === 'string' ? content : ''}`;
        },
      });

      const response = await provider.generate(makeRequest('Hello World'));
      expect(response.content).toBe('You said: Hello World');
    });

    it('should include unique response ID', async () => {
      const provider = new MockLLMProvider();
      const response1 = await provider.generate(makeRequest('Test 1'));
      const response2 = await provider.generate(makeRequest('Test 2'));

      expect(response1.id).not.toBe(response2.id);
      expect(response1.id).toMatch(/^mock-/);
    });
  });

  describe('delay', () => {
    it('should delay response', async () => {
      const provider = new MockLLMProvider({ delay: 50 });

      const start = Date.now();
      await provider.generate(makeRequest('Hello'));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40); // 少しマージン
    });
  });

  describe('errors', () => {
    it('should throw error when configured', async () => {
      const provider = new MockLLMProvider({
        shouldFail: true,
        errorMessage: 'Test error',
      });

      await expect(provider.generate(makeRequest('Hello')))
        .rejects.toThrow('Test error');
    });

    it('should throw default error message', async () => {
      const provider = new MockLLMProvider({ shouldFail: true });

      await expect(provider.generate(makeRequest('Hello')))
        .rejects.toThrow('Mock provider error');
    });
  });

  describe('streaming', () => {
    it('should stream content word by word', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Hello World Test',
      });

      const chunks: string[] = [];
      for await (const chunk of provider.generateStream(makeRequest('Hi'))) {
        if (chunk.type === 'content' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks.join('')).toBe('Hello World Test');
    });

    it('should emit done chunk with usage', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Test',
      });

      let doneChunk = null;
      for await (const chunk of provider.generateStream(makeRequest('Hi'))) {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      }

      expect(doneChunk).not.toBeNull();
      expect(doneChunk?.usage).toBeDefined();
    });
  });

  describe('call tracking', () => {
    it('should track call count', async () => {
      const provider = new MockLLMProvider();

      await provider.generate(makeRequest('1'));
      await provider.generate(makeRequest('2'));
      await provider.generate(makeRequest('3'));

      expect(provider.getCallCount()).toBe(3);
    });

    it('should track call history', async () => {
      const provider = new MockLLMProvider();

      await provider.generate(makeRequest('Hello'));
      await provider.generate(makeRequest('World'));

      const history = provider.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.messages[0]?.content).toBe('Hello');
      expect(history[1]?.messages[0]?.content).toBe('World');
    });

    it('should reset tracking', async () => {
      const provider = new MockLLMProvider();

      await provider.generate(makeRequest('Test'));
      provider.reset();

      expect(provider.getCallCount()).toBe(0);
      expect(provider.getCallHistory()).toHaveLength(0);
    });
  });

  describe('config update', () => {
    it('should update config', async () => {
      const provider = new MockLLMProvider({
        defaultResponse: 'Original',
      });

      const response1 = await provider.generate(makeRequest('Test'));
      expect(response1.content).toBe('Original');

      provider.updateConfig({ defaultResponse: 'Updated' });

      const response2 = await provider.generate(makeRequest('Test'));
      expect(response2.content).toBe('Updated');
    });
  });

  describe('token counting', () => {
    it('should count tokens', async () => {
      const provider = new MockLLMProvider();
      const tokens = await provider.countTokens('Hello, world!');

      expect(tokens).toBeGreaterThan(0);
      // 約13文字 / 4 ≈ 4トークン
      expect(tokens).toBe(4);
    });
  });

  describe('model support', () => {
    it('should list supported models', () => {
      const provider = new MockLLMProvider();
      expect(provider.supportedModels).toContain('mock-model');
      expect(provider.supportedModels).toContain('mock-model-v2');
    });

    it('should have provider name', () => {
      const provider = new MockLLMProvider();
      expect(provider.name).toBe('mock');
    });
  });
});
