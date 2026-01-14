/**
 * Test Utilities Tests
 *
 * @requirement REQ-TEST-001
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTestEnvironment,
  shouldSkipExternalServices,
  shouldSkipOllama,
  shouldSkipNetwork,
  getOllamaHost,
  getOllamaModel,
  getEmbeddingModel,
  getTestTimeout,
  delay,
  withRetry,
  withTimeout,
} from '../../src/testing';

describe('Test Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getTestEnvironment', () => {
    it('should detect non-CI environment', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.MOCK_MODE;

      const env = getTestEnvironment();

      expect(env.isCI).toBe(false);
      expect(env.isMockMode).toBe(false);
      expect(env.isOllamaAvailable).toBe(true);
    });

    it('should detect CI environment', () => {
      process.env.CI = 'true';

      const env = getTestEnvironment();

      expect(env.isCI).toBe(true);
      expect(env.isMockMode).toBe(true); // CI implies mock mode
      expect(env.isOllamaAvailable).toBe(false);
    });

    it('should detect GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';

      const env = getTestEnvironment();

      expect(env.isCI).toBe(true);
    });

    it('should detect mock mode', () => {
      process.env.MOCK_MODE = 'true';

      const env = getTestEnvironment();

      expect(env.isMockMode).toBe(true);
      expect(env.isOllamaAvailable).toBe(false);
    });

    it('should have correct timeout values', () => {
      const env = getTestEnvironment();

      expect(env.timeouts.unit).toBe(5000);
      expect(env.timeouts.integration).toBe(30000);
      expect(env.timeouts.e2e).toBe(60000);
    });
  });

  describe('shouldSkipExternalServices', () => {
    it('should return true in CI', () => {
      process.env.CI = 'true';
      expect(shouldSkipExternalServices()).toBe(true);
    });

    it('should return true in mock mode', () => {
      process.env.MOCK_MODE = 'true';
      expect(shouldSkipExternalServices()).toBe(true);
    });

    it('should return false otherwise', () => {
      delete process.env.CI;
      delete process.env.MOCK_MODE;
      expect(shouldSkipExternalServices()).toBe(false);
    });
  });

  describe('shouldSkipOllama', () => {
    it('should return true in CI', () => {
      process.env.CI = 'true';
      expect(shouldSkipOllama()).toBe(true);
    });
  });

  describe('shouldSkipNetwork', () => {
    it('should return true in CI', () => {
      process.env.CI = 'true';
      expect(shouldSkipNetwork()).toBe(true);
    });

    it('should return true when SKIP_NETWORK is set', () => {
      process.env.SKIP_NETWORK = 'true';
      expect(shouldSkipNetwork()).toBe(true);
    });
  });

  describe('getOllamaHost', () => {
    it('should return default host', () => {
      delete process.env.OLLAMA_HOST;
      expect(getOllamaHost()).toBe('http://192.168.224.1:11434');
    });

    it('should return custom host from env', () => {
      process.env.OLLAMA_HOST = 'http://localhost:11434';
      expect(getOllamaHost()).toBe('http://localhost:11434');
    });
  });

  describe('getOllamaModel', () => {
    it('should return default model', () => {
      delete process.env.OLLAMA_MODEL;
      expect(getOllamaModel()).toBe('qwen2.5:7b');
    });

    it('should return custom model from env', () => {
      process.env.OLLAMA_MODEL = 'llama3:8b';
      expect(getOllamaModel()).toBe('llama3:8b');
    });
  });

  describe('getEmbeddingModel', () => {
    it('should return default model', () => {
      delete process.env.EMBEDDING_MODEL;
      expect(getEmbeddingModel()).toBe('bge-m3');
    });

    it('should return custom model from env', () => {
      process.env.EMBEDDING_MODEL = 'nomic-embed-text';
      expect(getEmbeddingModel()).toBe('nomic-embed-text');
    });
  });

  describe('getTestTimeout', () => {
    it('should return correct timeout for each type', () => {
      expect(getTestTimeout('unit')).toBe(5000);
      expect(getTestTimeout('integration')).toBe(30000);
      expect(getTestTimeout('e2e')).toBe(60000);
    });

    it('should default to unit timeout', () => {
      expect(getTestTimeout()).toBe(5000);
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;

      // タイミングの誤差を考慮
      expect(elapsed).toBeGreaterThanOrEqual(30);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, delay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(withRetry(fn, { maxRetries: 2, delay: 10 }))
        .rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      await withRetry(fn, { maxRetries: 2, delay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if function completes in time', async () => {
      const fn = async () => {
        await delay(10);
        return 'done';
      };

      const result = await withTimeout(fn, 1000);
      expect(result).toBe('done');
    });

    it('should reject on timeout', async () => {
      const fn = async () => {
        await delay(1000);
        return 'done';
      };

      await expect(withTimeout(fn, 50))
        .rejects.toThrow('Operation timed out');
    });

    it('should use custom error message', async () => {
      const fn = async () => {
        await delay(1000);
        return 'done';
      };

      await expect(withTimeout(fn, 50, 'Custom timeout'))
        .rejects.toThrow('Custom timeout');
    });
  });
});
