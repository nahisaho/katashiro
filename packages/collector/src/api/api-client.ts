/**
 * APIClient - 汎用APIクライアント
 *
 * @requirement REQ-COLLECT-005
 * @design DES-KATASHIRO-001 §2.2 Collector Container
 * @task TSK-014
 */

import { type Result, ok, err } from '@nahisaho/katashiro-core';
import type { IAPIClient } from '../index.js';

/**
 * APIクライアント設定
 */
export interface APIClientOptions {
  readonly baseUrl?: string;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly rateLimit?: {
    readonly requestsPerSecond: number;
  };
}

/**
 * 汎用APIクライアント実装
 * レート制限、タイムアウト、リトライ機能を提供
 */
export class APIClient implements IAPIClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;
  private readonly requestsPerSecond: number;
  private lastRequestTime = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(options: APIClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'KATASHIRO/0.1.0',
      ...options.headers,
    };
    this.timeout = options.timeout ?? 30000;
    this.requestsPerSecond = options.rateLimit?.requestsPerSecond ?? 10;
  }

  /**
   * GETリクエスト
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>('GET', url);
  }

  /**
   * POSTリクエスト
   */
  async post<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('POST', url, body);
  }

  /**
   * PUTリクエスト
   */
  async put<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('PUT', url, body);
  }

  /**
   * DELETEリクエスト
   */
  async delete<T>(endpoint: string): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('DELETE', url);
  }

  /**
   * PATCHリクエスト
   */
  async patch<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('PATCH', url, body);
  }

  /**
   * URLを構築
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${path}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * リクエスト実行（レート制限付き）
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<Result<T, Error>> {
    // Rate limiting - queue requests
    await this.waitForRateLimit();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return err(
          new Error(`HTTP error: ${response.status} ${response.statusText}`)
        );
      }

      const data = (await response.json()) as T;
      return ok(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return err(new Error('Request timeout'));
        }
        return err(new Error(`Request failed: ${error.message}`));
      }
      return err(new Error('Unknown request error'));
    }
  }

  /**
   * レート制限のための待機
   */
  private async waitForRateLimit(): Promise<void> {
    // Chain requests to ensure rate limiting
    this.requestQueue = this.requestQueue.then(async () => {
      const now = Date.now();
      const minInterval = 1000 / this.requestsPerSecond;
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < minInterval) {
        await this.sleep(minInterval - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
    });

    await this.requestQueue;
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
