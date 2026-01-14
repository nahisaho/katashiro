/**
 * Ollama LLM Connection Integration Test
 *
 * Tests real connection to Ollama server at 192.168.224.1:11434
 *
 * @requirement REQ-LLM-002
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaLLMProvider } from '../../src/providers/OllamaLLMProvider.js';
import { LLMFactory } from '../../src/providers/LLMFactory.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST ?? 'http://192.168.224.1:11434';
const LLM_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';

// Integration test timeout (30 seconds)
const INTEGRATION_TIMEOUT = 30000;

// Skip if in CI, mock mode, or explicitly skipped
const shouldSkip = () =>
  process.env.CI === 'true' ||
  process.env.MOCK_MODE === 'true' ||
  process.env.SKIP_INTEGRATION_TESTS === 'true';

// Skip if Ollama is not available
const checkOllamaAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

describe.skipIf(shouldSkip())('Ollama LLM Connection Tests', () => {
  let ollamaAvailable = false;

  beforeAll(async () => {
    ollamaAvailable = await checkOllamaAvailable();
    if (!ollamaAvailable) {
      console.log('⚠️ Ollama server is not available. Skipping integration tests.');
    }
  });

  describe('OllamaLLMProvider', () => {
    it('should create provider with default config', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
      });

      expect(provider.name).toBe('ollama');
    });

    it('should list available models', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
      });

      const models = await provider.listModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should complete generate request', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
        timeout: 60000,
      });

      const response = await provider.generate({
        messages: [{ role: 'user', content: 'Say "Hello KATASHIRO" and nothing else.' }],
      });

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.model).toBe(LLM_MODEL);
      console.log('Response:', response.content);
    }, INTEGRATION_TIMEOUT);

    it('should complete streaming generate request', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
        timeout: 60000,
      });

      let fullContent = '';
      let chunkCount = 0;

      const stream = provider.generateStream({
        messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          fullContent += chunk.content;
          chunkCount++;
        }
      }

      expect(fullContent.length).toBeGreaterThan(0);
      expect(chunkCount).toBeGreaterThan(1);
      console.log('Stream chunks:', chunkCount);
      console.log('Full content:', fullContent);
    }, INTEGRATION_TIMEOUT);

    it('should handle JSON mode', async () => {
      if (!ollamaAvailable) return;

      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
        timeout: 60000,
        format: 'json',
      });

      const response = await provider.generate({
        messages: [
          {
            role: 'user',
            content: 'Return a JSON object with "name" set to "KATASHIRO" and "version" set to "2.0". Only output JSON, no markdown.',
          },
        ],
      });

      expect(response.content).toBeDefined();
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonString = response.content;
      const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe('KATASHIRO');
      console.log('JSON response:', parsed);
    }, INTEGRATION_TIMEOUT);
  });

  describe('LLMFactory', () => {
    it('should create Ollama provider via factory', async () => {
      if (!ollamaAvailable) return;

      const provider = LLMFactory.create('ollama', {
        baseUrl: OLLAMA_BASE_URL,
        model: LLM_MODEL,
        timeout: 60000,
      });

      expect(provider.name).toBe('ollama');
    });
  });
});
