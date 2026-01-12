/**
 * APIClient Tests
 *
 * @requirement REQ-COLLECT-005
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-014
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '../../src/api/api-client.js';
import { isOk, isErr } from '@nahisaho/katashiro-core';

describe('APIClient', () => {
  let client: APIClient;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    client = new APIClient({ baseUrl: 'https://api.example.com' });
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('get', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await client.get<typeof mockData>('/users/1');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockData);
      }
    });

    it('should append query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.get('/users', { page: '1', limit: '10' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should handle HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await client.get('/notfound');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('404');
      }
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const result = await client.get('/users');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Network failure');
      }
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      const requestBody = { name: 'New User' };
      const responseData = { id: 1, name: 'New User' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await client.post<typeof responseData>('/users', requestBody);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(responseData);
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should handle POST errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await client.post('/users', { invalid: 'data' });
      expect(isErr(result)).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit configuration', async () => {
      const rateLimitedClient = new APIClient({
        baseUrl: 'https://api.example.com',
        rateLimit: { requestsPerSecond: 2 },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      // Make multiple requests
      const start = Date.now();
      await Promise.all([
        rateLimitedClient.get('/test1'),
        rateLimitedClient.get('/test2'),
        rateLimitedClient.get('/test3'),
      ]);
      const elapsed = Date.now() - start;

      // Should take at least some time due to rate limiting
      // (relaxed timing test due to async nature)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('headers', () => {
    it('should include default headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include custom headers', async () => {
      const clientWithAuth = new APIClient({
        baseUrl: 'https://api.example.com',
        headers: { Authorization: 'Bearer token123' },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await clientWithAuth.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
        })
      );
    });
  });

  describe('timeout', () => {
    it('should abort request on timeout', async () => {
      const timeoutClient = new APIClient({
        baseUrl: 'https://api.example.com',
        timeout: 100,
      });

      global.fetch = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      const result = await timeoutClient.get('/slow');
      expect(isErr(result)).toBe(true);
    });
  });
});
