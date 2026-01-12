/**
 * TimeSeriesCollector - 時系列データの収集
 *
 * @requirement REQ-ANALYZE-004
 * @design DES-ANALYZE-004
 * @task TASK-004
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import { WebSearchClient } from '@nahisaho/katashiro-collector';
import type {
  CollectionQuery,
  TimeSeriesData,
  TrendSource,
  TimeGranularity,
  SampleDocument,
  TrendAnalysisError,
} from './types.js';

/**
 * 時系列データを収集するクラス
 *
 * @example
 * ```typescript
 * const collector = new TimeSeriesCollector();
 *
 * const result = await collector.collect({
 *   topic: 'AI',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-12-31'),
 *   granularity: 'weekly',
 *   sources: ['news', 'web'],
 * });
 * ```
 */
export class TimeSeriesCollector {
  private searchClient: WebSearchClient;

  constructor() {
    this.searchClient = new WebSearchClient();
  }

  /**
   * 時系列データを収集
   */
  async collect(query: CollectionQuery): Promise<Result<TimeSeriesData[], TrendAnalysisError>> {
    try {
      const buckets = this.createTimeBuckets(query.startDate, query.endDate, query.granularity);

      // 各ソースからデータを収集
      const sourceResults = await Promise.allSettled(
        query.sources.map((source) => this.collectFromSource(query.topic, source, query.startDate, query.endDate))
      );

      // 結果を時間バケットに振り分け
      const allDocs: SampleDocument[] = [];
      for (const result of sourceResults) {
        if (result.status === 'fulfilled') {
          allDocs.push(...result.value);
        }
      }

      if (allDocs.length === 0) {
        // データがない場合は空のシリーズを返す
        return ok(
          buckets.map((bucket) => ({
            timestamp: bucket.start,
            volume: 0,
            normalizedScore: 0,
            sourceBreakdown: {},
            sampleDocs: [],
          }))
        );
      }

      // バケットごとに集計
      const timeSeries = buckets.map((bucket) => {
        const docsInBucket = allDocs.filter(
          (doc) => doc.publishedAt >= bucket.start && doc.publishedAt < bucket.end
        );

        const sourceBreakdown: Partial<Record<TrendSource, number>> = {};
        for (const doc of docsInBucket) {
          sourceBreakdown[doc.source] = (sourceBreakdown[doc.source] || 0) + 1;
        }

        return {
          timestamp: bucket.start,
          volume: docsInBucket.length,
          normalizedScore: 0, // 後で正規化
          sourceBreakdown,
          sampleDocs: docsInBucket.slice(0, 5), // 最大5件のサンプル
        };
      });

      // 正規化
      const maxVolume = Math.max(...timeSeries.map((ts) => ts.volume), 1);
      for (const ts of timeSeries) {
        ts.normalizedScore = (ts.volume / maxVolume) * 100;
      }

      return ok(timeSeries);
    } catch (error) {
      return err({
        code: 'COLLECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during collection',
        details: error,
      });
    }
  }

  /**
   * 単一ソースからデータを収集
   */
  private async collectFromSource(
    topic: string,
    source: TrendSource,
    startDate: Date,
    endDate: Date
  ): Promise<SampleDocument[]> {
    const docs: SampleDocument[] = [];

    switch (source) {
      case 'news':
      case 'web': {
        const searchResult = await this.searchClient.search({
          query: topic,
          maxResults: 50,
        });

        if (searchResult && Array.isArray(searchResult)) {
          for (const result of searchResult) {
            // 日付情報がない場合は現在日付を使用
            const publishedAt = new Date();

            if (publishedAt >= startDate && publishedAt <= endDate) {
              docs.push({
                title: result.title,
                url: result.url,
                publishedAt,
                source,
                relevanceScore: 0.8,
              });
            }
          }
        }
        break;
      }

      case 'rss': {
        // RSSフィードからの収集（フィードURLがある場合）
        // 基本的にはトピック検索では使用しない
        break;
      }

      case 'academic': {
        // 学術検索（arXiv等）- WideResearchEngineのAcademicSearchAgentを利用可能
        // 基本実装では省略
        break;
      }

      case 'social': {
        // ソーシャルメディア - API制限があるため基本実装では省略
        break;
      }
    }

    return docs;
  }

  /**
   * 時間バケットを作成
   */
  private createTimeBuckets(
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity
  ): Array<{ start: Date; end: Date }> {
    const buckets: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const bucketStart = new Date(current);
      let bucketEnd: Date;

      switch (granularity) {
        case 'hourly':
          bucketEnd = new Date(current);
          bucketEnd.setHours(bucketEnd.getHours() + 1);
          break;
        case 'daily':
          bucketEnd = new Date(current);
          bucketEnd.setDate(bucketEnd.getDate() + 1);
          break;
        case 'weekly':
          bucketEnd = new Date(current);
          bucketEnd.setDate(bucketEnd.getDate() + 7);
          break;
        case 'monthly':
          bucketEnd = new Date(current);
          bucketEnd.setMonth(bucketEnd.getMonth() + 1);
          break;
        case 'yearly':
          bucketEnd = new Date(current);
          bucketEnd.setFullYear(bucketEnd.getFullYear() + 1);
          break;
      }

      if (bucketEnd > endDate) {
        bucketEnd = new Date(endDate);
      }

      buckets.push({ start: bucketStart, end: bucketEnd });
      current = bucketEnd;
    }

    return buckets;
  }
}
