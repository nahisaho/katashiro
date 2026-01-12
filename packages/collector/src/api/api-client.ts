/**
 * APIClient - 汎用APIクライアント
 *
 * @requirement REQ-COLLECT-005
 * @requirement REQ-FIX-011 (v0.2.10)
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
  readonly retries?: number;
}

/**
 * APIクライアントエラー
 * @since 0.2.10
 */
export class ApiClientError extends Error {
  readonly code = 'KATASHIRO-E011';
  readonly statusCode: number;
  readonly statusText: string;
  readonly url: string;
  readonly body?: string;

  constructor(statusCode: number, statusText: string, url: string, body?: string) {
    super(`HTTP error ${statusCode}: ${statusText} (${url})`);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.url = url;
    this.body = body?.slice(0, 1000);
  }
}

/**
 * ネットワークエラー
 * @since 0.2.10
 */
export class NetworkError extends Error {
  readonly code: string;
  readonly url: string;
  readonly cause: string;

  constructor(code: string, url: string, cause: string) {
    super(`Network error ${code}: ${cause} (${url})`);
    this.name = 'NetworkError';
    this.code = code;
    this.url = url;
    this.cause = cause;
  }
}

/**
 * JSONパースエラー
 * @since 0.2.10
 */
export class JsonParseError extends Error {
  readonly url: string;
  readonly contentType: string;
  readonly body: string;

  constructor(url: string, contentType: string, body: string) {
    super(`Failed to parse JSON response from ${url}`);
    this.name = 'JsonParseError';
    this.url = url;
    this.contentType = contentType;
    this.body = body.slice(0, 500);
  }
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
  private readonly retries: number;
  private lastRequestTime = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(options: APIClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'KATASHIRO/0.2.10',
      ...options.headers,
    };
    this.timeout = options.timeout ?? 30000;
    this.requestsPerSecond = options.rateLimit?.requestsPerSecond ?? 10;
    this.retries = options.retries ?? 0;
  }

  /**
   * GETリクエスト（AGENTS.md互換API - 直接オブジェクトを返す）
   * @throws {ApiClientError} HTTPエラー時
   * @throws {NetworkError} ネットワークエラー時
   * @throws {JsonParseError} JSONパースエラー時
   * @since 0.2.10
   */
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.requestDirect<T>('GET', url);
  }

  /**
   * GETリクエスト（Result型を返す安全版）
   */
  async getSafe<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>('GET', url);
  }

  /**
   * POSTリクエスト（AGENTS.md互換API）
   * @since 0.2.10
   */
  async post<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.requestDirect<T>('POST', url, body);
  }

  /**
   * POSTリクエスト（Result型を返す安全版）
   */
  async postSafe<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('POST', url, body);
  }

  /**
   * PUTリクエスト（AGENTS.md互換API）
   * @since 0.2.10
   */
  async put<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.requestDirect<T>('PUT', url, body);
  }

  /**
   * PUTリクエスト（Result型を返す安全版）
   */
  async putSafe<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('PUT', url, body);
  }

  /**
   * DELETEリクエスト（AGENTS.md互換API）
   * @since 0.2.10
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.requestDirect<T>('DELETE', url);
  }

  /**
   * DELETEリクエスト（Result型を返す安全版）
   */
  async deleteSafe<T>(endpoint: string): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('DELETE', url);
  }

  /**
   * PATCHリクエスト（AGENTS.md互換API）
   * @since 0.2.10
   */
  async patch<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.requestDirect<T>('PATCH', url, body);
  }

  /**
   * PATCHリクエスト（Result型を返す安全版）
   */
  async patchSafe<T>(endpoint: string, body: unknown): Promise<Result<T, Error>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('PATCH', url, body);
  }

  /**
   * URLを構築
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    // 絶対URLの場合はそのまま使用
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      let url = endpoint;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
      }
      return url;
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${path}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * リクエスト実行（直接オブジェクトを返す - AGENTS.md互換）
   * @since 0.2.10
   */
  private async requestDirect<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    await this.waitForRateLimit();

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        let response: Response;
        try {
          response = await fetch(url, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new NetworkError('TIMEOUT', url, 'Request timed out');
          }
          if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
            throw new NetworkError('DNS_FAILURE', url, errorMessage);
          }
          if (errorMessage.includes('ECONNREFUSED')) {
            throw new NetworkError('CONNECTION_REFUSED', url, errorMessage);
          }
          throw new NetworkError('NETWORK_ERROR', url, errorMessage);
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          let responseBody: string | undefined;
          try {
            responseBody = await response.text();
          } catch {
            // レスポンスボディの取得に失敗
          }
          throw new ApiClientError(response.status, response.statusText, url, responseBody);
        }

        // Content-Typeに応じてレスポンスをパース
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          try {
            return (await response.json()) as T;
          } catch {
            const text = await response.text();
            throw new JsonParseError(url, contentType, text);
          }
        } else if (contentType.includes('text/')) {
          const text = await response.text();
          return { text, contentType } as T;
        } else {
          // その他の形式はJSONとして試行
          try {
            return (await response.json()) as T;
          } catch {
            const text = await response.text();
            return { text, contentType } as T;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // リトライ可能なエラーかチェック
        if (attempt < this.retries && this.isRetryableError(lastError)) {
          await this.sleep(Math.pow(2, attempt) * 1000); // 指数バックオフ
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new Error('Unknown error');
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof NetworkError) {
      return error.code === 'TIMEOUT' || error.code === 'CONNECTION_REFUSED';
    }
    if (error instanceof ApiClientError) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    return false;
  }

  /**
   * リクエスト実行（Result型を返す - 後方互換）
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<Result<T, Error>> {
    try {
      const data = await this.requestDirect<T>(method, url, body);
      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * レート制限のための待機
   */
  private async waitForRateLimit(): Promise<void> {
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
