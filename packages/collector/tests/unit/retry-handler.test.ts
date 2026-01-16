/**
 * RetryHandler 単体テスト
 *
 * @requirement REQ-DR-U-001 - リトライ機構
 * @requirement REQ-DR-W-001 - 無限リトライの禁止
 * @design DES-KATASHIRO-005-DR-RETRY
 * @task TASK-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RetryHandler,
  RetryPolicySchema,
  DEFAULT_RETRY_POLICY,
  ExponentialBackoff,
  RetryError,
  isRetryError,
  type RetryEvent,
} from '../../src/retry/index.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('RetryPolicy', () => {
  describe('RetryPolicySchema', () => {
    it('should validate default policy', () => {
      const result = RetryPolicySchema.safeParse(DEFAULT_RETRY_POLICY);
      expect(result.success).toBe(true);
    });

    it('should enforce maxRetries <= 10', () => {
      const result = RetryPolicySchema.safeParse({ maxRetries: 15 });
      expect(result.success).toBe(false);
    });

    it('should enforce maxRetries >= 0', () => {
      const result = RetryPolicySchema.safeParse({ maxRetries: -1 });
      expect(result.success).toBe(false);
    });

    it('should apply defaults for partial input', () => {
      const result = RetryPolicySchema.parse({});
      expect(result.maxRetries).toBe(3);
      expect(result.initialDelayMs).toBe(2000);
      expect(result.multiplier).toBe(2);
    });
  });

  describe('DEFAULT_RETRY_POLICY', () => {
    it('should have maxRetries = 3', () => {
      expect(DEFAULT_RETRY_POLICY.maxRetries).toBe(3);
    });

    it('should have initialDelayMs = 2000', () => {
      expect(DEFAULT_RETRY_POLICY.initialDelayMs).toBe(2000);
    });

    it('should include 429 in retryableStatusCodes', () => {
      expect(DEFAULT_RETRY_POLICY.retryableStatusCodes).toContain(429);
    });

    it('should include 503 in retryableStatusCodes', () => {
      expect(DEFAULT_RETRY_POLICY.retryableStatusCodes).toContain(503);
    });

    it('should exclude 404 from retryableStatusCodes', () => {
      expect(DEFAULT_RETRY_POLICY.retryableStatusCodes).not.toContain(404);
    });

    it('should include 404 in nonRetryableStatusCodes', () => {
      expect(DEFAULT_RETRY_POLICY.nonRetryableStatusCodes).toContain(404);
    });
  });
});

describe('ExponentialBackoff', () => {
  const backoff = new ExponentialBackoff({
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    multiplier: 2,
    jitter: 0, // ジッターなしでテスト
  });

  describe('calculate', () => {
    it('should calculate 2000ms for attempt 1', () => {
      const result = backoff.calculate(1);
      expect(result.baseDelayMs).toBe(2000);
      expect(result.delayMs).toBe(2000);
    });

    it('should calculate 4000ms for attempt 2', () => {
      const result = backoff.calculate(2);
      expect(result.baseDelayMs).toBe(4000);
    });

    it('should calculate 8000ms for attempt 3', () => {
      const result = backoff.calculate(3);
      expect(result.baseDelayMs).toBe(8000);
    });

    it('should cap at maxDelayMs', () => {
      const result = backoff.calculate(10);
      expect(result.baseDelayMs).toBe(30000);
    });

    it('should throw for attempt < 1', () => {
      expect(() => backoff.calculate(0)).toThrow();
    });
  });

  describe('with jitter', () => {
    const backoffWithJitter = new ExponentialBackoff({
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      multiplier: 2,
      jitter: 0.1,
    });

    it('should add jitter within ±10%', () => {
      const results = Array.from({ length: 100 }, () => backoffWithJitter.calculate(1));
      const minDelay = Math.min(...results.map((r) => r.delayMs));
      const maxDelay = Math.max(...results.map((r) => r.delayMs));

      // 2000 ± 10% = 1800-2200
      expect(minDelay).toBeGreaterThanOrEqual(1800);
      expect(maxDelay).toBeLessThanOrEqual(2200);
    });
  });

  describe('calculateWithRetryAfter', () => {
    it('should use retryAfter when larger than backoff', () => {
      const result = backoff.calculateWithRetryAfter(1, 5000, 60000);
      expect(result.delayMs).toBe(5000);
    });

    it('should use backoff when larger than retryAfter', () => {
      const result = backoff.calculateWithRetryAfter(3, 1000, 60000);
      expect(result.delayMs).toBe(8000);
    });

    it('should cap retryAfter at maxRetryAfterMs', () => {
      const result = backoff.calculateWithRetryAfter(1, 120000, 60000);
      expect(result.delayMs).toBe(60000);
    });
  });

  describe('calculateTotalMaxDelay', () => {
    it('should calculate total for 3 retries', () => {
      // 2000 + 4000 + 8000 = 14000
      expect(backoff.calculateTotalMaxDelay(3)).toBe(14000);
    });
  });
});

describe('RetryError', () => {
  it('should create with required properties', () => {
    const error = new RetryError({
      message: 'Test error',
      attempts: 3,
      lastError: new Error('Original error'),
      context: { operation: 'test' },
    });

    expect(error.name).toBe('RetryError');
    expect(error.attempts).toBe(3);
    expect(error.lastError.message).toBe('Original error');
    expect(error.context.operation).toBe('test');
  });

  it('should serialize to JSON', () => {
    const error = new RetryError({
      message: 'Test error',
      attempts: 2,
      lastError: new Error('Original'),
      context: { operation: 'fetchData', url: 'https://example.com' },
      errorType: 'TIMEOUT',
      statusCode: 504,
    });

    const json = error.toJSON();
    expect(json.name).toBe('RetryError');
    expect(json.attempts).toBe(2);
    expect(json.errorType).toBe('TIMEOUT');
    expect(json.statusCode).toBe(504);
  });

  it('should be identified by isRetryError', () => {
    const error = new RetryError({
      message: 'Test',
      attempts: 1,
      lastError: new Error('Test'),
      context: { operation: 'test' },
    });

    expect(isRetryError(error)).toBe(true);
    expect(isRetryError(new Error('Normal error'))).toBe(false);
  });
});

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('execute - success cases', () => {
    it('should return Ok on first attempt success', async () => {
      const handler = new RetryHandler();
      const fn = vi.fn().mockResolvedValue('success');

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should succeed after retries', async () => {
      const handler = new RetryHandler({ policy: { initialDelayMs: 100 } });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('execute - failure cases', () => {
    it('should return Err after maxRetries exceeded', async () => {
      const handler = new RetryHandler({ policy: { maxRetries: 3, initialDelayMs: 100 } });
      const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(RetryError);
        expect(result.error.attempts).toBe(4); // 1 initial + 3 retries
      }
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should not retry non-retryable errors (404)', async () => {
      const handler = new RetryHandler();
      const error = Object.assign(new Error('Not Found'), { statusCode: 404 });
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry 403 errors', async () => {
      const handler = new RetryHandler();
      const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute - retryable errors', () => {
    it('should retry on 429 (Rate Limit)', async () => {
      const handler = new RetryHandler({ policy: { maxRetries: 2, initialDelayMs: 100 } });
      const error = Object.assign(new Error('Too Many Requests'), { statusCode: 429 });
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
    });

    it('should retry on 503 (Service Unavailable)', async () => {
      const handler = new RetryHandler({ policy: { maxRetries: 2, initialDelayMs: 100 } });
      const error = Object.assign(new Error('Service Unavailable'), { statusCode: 503 });
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors', async () => {
      const handler = new RetryHandler({ policy: { maxRetries: 2, initialDelayMs: 100 } });
      const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should retry on timeout errors', async () => {
      const handler = new RetryHandler({ policy: { maxRetries: 2, initialDelayMs: 100 } });
      const fn = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('event listeners', () => {
    it('should emit events during execution', async () => {
      const events: RetryEvent[] = [];
      const handler = new RetryHandler({
        policy: { maxRetries: 1, initialDelayMs: 100 },
        onRetry: (event) => events.push(event),
      });

      const fn = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValue('ok');

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      const types = events.map((e) => e.type);
      expect(types).toContain('attempt');
      expect(types).toContain('retry');
      expect(types).toContain('success');
    });

    it('should emit failure event on final failure', async () => {
      const events: RetryEvent[] = [];
      const handler = new RetryHandler({
        policy: { maxRetries: 1, initialDelayMs: 100 },
        onRetry: (event) => events.push(event),
      });

      const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      const resultPromise = handler.execute(fn, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      const types = events.map((e) => e.type);
      expect(types).toContain('failure');
    });
  });

  describe('wrap', () => {
    it('should wrap a function with retry logic', async () => {
      const handler = new RetryHandler({ policy: { initialDelayMs: 100 } });
      const originalFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('wrapped result');

      const wrappedFn = handler.wrap(originalFn, 'wrappedOp');

      const resultPromise = wrappedFn();
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('wrapped result');
      }
    });

    it('should pass arguments to wrapped function', async () => {
      const handler = new RetryHandler();
      const originalFn = vi.fn().mockImplementation((a: number, b: string) => Promise.resolve(`${a}-${b}`));

      const wrappedFn = handler.wrap(originalFn, 'argTest');

      const resultPromise = wrappedFn(42, 'hello');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(originalFn).toHaveBeenCalledWith(42, 'hello');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('42-hello');
      }
    });
  });

  describe('shouldRetry', () => {
    it('should return true for network errors', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(new Error('ECONNRESET'))).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(new Error('Request timed out'))).toBe(true);
    });

    it('should return false for 404 errors', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(new Error('Not found'), { statusCode: 404 })).toBe(false);
    });

    it('should return true for 429 errors', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(new Error('Rate limited'), { statusCode: 429 })).toBe(true);
    });
  });
});
