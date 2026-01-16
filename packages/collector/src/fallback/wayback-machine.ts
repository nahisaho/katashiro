/**
 * WaybackMachineClient - Wayback Machine API クライアント
 *
 * @requirement REQ-DR-U-003 - フォールバック機構
 * @design DES-KATASHIRO-005-DR-FALLBACK §3.2
 * @task TASK-017
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import type { WaybackSnapshot } from './types.js';

/**
 * Wayback Machine API エラー
 */
export class WaybackError extends Error {
  public readonly name = 'WaybackError';
  public readonly url: string;
  public readonly cause?: Error;

  constructor(message: string, url: string, cause?: Error) {
    super(message);
    this.url = url;
    this.cause = cause;
  }
}

/**
 * Wayback Machine Availability API レスポンス
 */
interface WaybackApiResponse {
  archived_snapshots: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string;
      status: string;
    };
  };
}

/**
 * Wayback Machine クライアント
 *
 * @example
 * ```typescript
 * const client = new WaybackMachineClient();
 *
 * // 最新のスナップショットを取得
 * const snapshot = await client.getLatestSnapshot('https://example.com');
 * if (isOk(snapshot)) {
 *   console.log('Archive URL:', snapshot.value.url);
 *   console.log('Archived at:', snapshot.value.timestamp);
 * }
 *
 * // アーカイブURLを生成
 * const archiveUrl = client.buildArchiveUrl('https://example.com');
 * ```
 */
export class WaybackMachineClient {
  private readonly baseUrl = 'https://archive.org';
  private readonly availabilityApiUrl = 'https://archive.org/wayback/available';
  private readonly timeoutMs: number;
  private readonly maxAgeDays: number;

  constructor(options?: { timeoutMs?: number; maxAgeDays?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 10000;
    this.maxAgeDays = options?.maxAgeDays ?? 365;
  }

  /**
   * 指定URLの最新スナップショットを取得
   */
  public async getLatestSnapshot(url: string): Promise<Result<WaybackSnapshot, WaybackError>> {
    try {
      const apiUrl = `${this.availabilityApiUrl}?url=${encodeURIComponent(url)}`;

      const response = await this.fetchWithTimeout(apiUrl);

      if (!response.ok) {
        return err(new WaybackError(`API request failed: ${response.status}`, url));
      }

      const data = (await response.json()) as WaybackApiResponse;
      const closest = data.archived_snapshots?.closest;

      if (!closest || !closest.available) {
        return err(new WaybackError('No archived snapshot available', url));
      }

      const timestamp = this.parseTimestamp(closest.timestamp);

      // 古すぎるスナップショットをフィルタ
      const ageDays = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > this.maxAgeDays) {
        return err(
          new WaybackError(`Snapshot too old: ${Math.floor(ageDays)} days (max: ${this.maxAgeDays})`, url)
        );
      }

      return ok({
        url: closest.url,
        timestamp,
        statusCode: parseInt(closest.status, 10),
        originalUrl: url,
      });
    } catch (error) {
      return err(new WaybackError('Failed to fetch snapshot', url, error instanceof Error ? error : undefined));
    }
  }

  /**
   * 特定日時のスナップショットを取得
   */
  public async getSnapshotAt(url: string, date: Date): Promise<Result<WaybackSnapshot, WaybackError>> {
    try {
      const timestamp = this.formatTimestamp(date);
      const apiUrl = `${this.availabilityApiUrl}?url=${encodeURIComponent(url)}&timestamp=${timestamp}`;

      const response = await this.fetchWithTimeout(apiUrl);

      if (!response.ok) {
        return err(new WaybackError(`API request failed: ${response.status}`, url));
      }

      const data = (await response.json()) as WaybackApiResponse;
      const closest = data.archived_snapshots?.closest;

      if (!closest || !closest.available) {
        return err(new WaybackError(`No snapshot available near ${date.toISOString()}`, url));
      }

      return ok({
        url: closest.url,
        timestamp: this.parseTimestamp(closest.timestamp),
        statusCode: parseInt(closest.status, 10),
        originalUrl: url,
      });
    } catch (error) {
      return err(new WaybackError('Failed to fetch snapshot', url, error instanceof Error ? error : undefined));
    }
  }

  /**
   * アーカイブURLを構築
   */
  public buildArchiveUrl(url: string, timestamp?: Date): string {
    const ts = timestamp ? this.formatTimestamp(timestamp) : '';
    return `${this.baseUrl}/web/${ts}/${url}`;
  }

  /**
   * URLがWayback Machineにアーカイブされているか確認
   */
  public async isArchived(url: string): Promise<boolean> {
    const result = await this.getLatestSnapshot(url);
    return isOk(result);
  }

  /**
   * タイムスタンプをパース（YYYYMMDDHHMMSS形式）
   */
  private parseTimestamp(timestamp: string): Date {
    const year = parseInt(timestamp.slice(0, 4), 10);
    const month = parseInt(timestamp.slice(4, 6), 10) - 1;
    const day = parseInt(timestamp.slice(6, 8), 10);
    const hour = parseInt(timestamp.slice(8, 10), 10) || 0;
    const minute = parseInt(timestamp.slice(10, 12), 10) || 0;
    const second = parseInt(timestamp.slice(12, 14), 10) || 0;

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  /**
   * DateをWayback形式のタイムスタンプにフォーマット
   */
  private formatTimestamp(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * タイムアウト付きfetch
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'KATASHIRO/2.2.0 (+https://github.com/nahisaho/katashiro)',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
