/**
 * Real-Time Data Fetcher
 * 
 * コモディティ価格や統計データをリアルタイムで取得するクラス。
 * 
 * @requirement REQ-EXT-RTD-001 コモディティ価格データ取得
 * @requirement REQ-EXT-RTD-002 統計データ取得
 * @since 0.5.0
 * 
 * @example
 * ```typescript
 * const fetcher = new RealTimeDataFetcher();
 * 
 * // コモディティ価格を取得
 * const copperPrice = await fetcher.fetchCommodityPrice('copper');
 * 
 * // 統計データを取得
 * const stats = await fetcher.fetchStatistics({
 *   type: 'mineral_production',
 *   keyword: 'lithium',
 *   source: 'jogmec',
 * });
 * ```
 */

import type {
  RealTimeDataSource,
  RealTimeDataType,
  RealTimeDataQuery,
  RealTimeDataResult,
  CommodityPrice,
  StatisticsData,
  TimeSeriesData,
  RealTimeDataFetcherOptions,
} from './types.js';

/**
 * コモディティキーワードとデータソースのマッピング
 */
const COMMODITY_SOURCE_MAP: Record<string, { source: RealTimeDataSource; symbol?: string; unit: string }> = {
  // 金属
  copper: { source: 'lme', symbol: 'CU', unit: 'USD/ton' },
  aluminium: { source: 'lme', symbol: 'AL', unit: 'USD/ton' },
  aluminum: { source: 'lme', symbol: 'AL', unit: 'USD/ton' },
  zinc: { source: 'lme', symbol: 'ZN', unit: 'USD/ton' },
  nickel: { source: 'lme', symbol: 'NI', unit: 'USD/ton' },
  lead: { source: 'lme', symbol: 'PB', unit: 'USD/ton' },
  tin: { source: 'lme', symbol: 'SN', unit: 'USD/ton' },
  gold: { source: 'comex', symbol: 'AU', unit: 'USD/oz' },
  silver: { source: 'comex', symbol: 'AG', unit: 'USD/oz' },
  platinum: { source: 'comex', symbol: 'PT', unit: 'USD/oz' },
  palladium: { source: 'comex', symbol: 'PD', unit: 'USD/oz' },
  // エネルギー
  oil: { source: 'wti', unit: 'USD/barrel' },
  'crude oil': { source: 'wti', unit: 'USD/barrel' },
  wti: { source: 'wti', unit: 'USD/barrel' },
  brent: { source: 'brent', unit: 'USD/barrel' },
  // 鉱物資源
  lithium: { source: 'usgs', unit: 'USD/ton' },
  cobalt: { source: 'usgs', unit: 'USD/ton' },
  rare_earth: { source: 'usgs', unit: 'USD/kg' },
  graphite: { source: 'usgs', unit: 'USD/ton' },
};

/**
 * 統計データソースのマッピング
 */
const STATISTICS_SOURCE_MAP: Record<RealTimeDataType, RealTimeDataSource[]> = {
  commodity_price: ['lme', 'comex', 'usgs'],
  energy_price: ['iea', 'wti', 'brent'],
  mineral_production: ['jogmec', 'usgs', 'worldbank'],
  trade_statistics: ['jetro', 'worldbank', 'oecd'],
  economic_indicator: ['imf', 'worldbank', 'oecd'],
  market_data: ['lme', 'comex'],
};

/**
 * データソースのベースURL
 */
const SOURCE_BASE_URLS: Record<RealTimeDataSource, string> = {
  lme: 'https://www.lme.com/en-GB/Metals',
  usgs: 'https://www.usgs.gov/centers/national-minerals-information-center',
  comex: 'https://www.cmegroup.com/markets/metals',
  wti: 'https://www.eia.gov/petroleum/data.php',
  brent: 'https://www.eia.gov/petroleum/data.php',
  jogmec: 'https://mric.jogmec.go.jp',
  iea: 'https://www.iea.org/data-and-statistics',
  jetro: 'https://www.jetro.go.jp/world/statistics',
  worldbank: 'https://data.worldbank.org',
  imf: 'https://www.imf.org/en/Data',
  oecd: 'https://data.oecd.org',
  custom: '',
};

/**
 * デフォルトオプション
 */
const DEFAULT_OPTIONS: Required<RealTimeDataFetcherOptions> = {
  timeout: 30000,
  defaultCurrency: 'USD',
  cacheTtl: 3600,
  apiKeys: {},
  userAgent: 'KATASHIRO-RealTimeDataFetcher/0.5.0',
};

/**
 * Real-Time Data Fetcher
 */
export class RealTimeDataFetcher {
  private readonly options: Required<RealTimeDataFetcherOptions>;
  private readonly cache: Map<string, { data: RealTimeDataResult; expiry: number }>;

  constructor(options?: RealTimeDataFetcherOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.cache = new Map();
  }

  /**
   * コモディティ価格を取得
   * 
   * @param keyword コモディティ名（例: "copper", "gold", "oil"）
   * @param options 追加オプション
   * @returns コモディティ価格データ
   */
  async fetchCommodityPrice(
    keyword: string,
    options?: { currency?: string; includeTimeSeries?: boolean }
  ): Promise<CommodityPrice | null> {
    const normalizedKeyword = keyword.toLowerCase().trim();
    const commodityInfo = COMMODITY_SOURCE_MAP[normalizedKeyword];
    
    const source = commodityInfo?.source ?? 'usgs';
    const unit = commodityInfo?.unit ?? 'USD/ton';
    const symbol = commodityInfo?.symbol;

    // キャッシュチェック
    const cacheKey = `commodity:${normalizedKeyword}:${options?.currency ?? this.options.defaultCurrency}`;
    const cached = this.getCached(cacheKey);
    if (cached?.commodityPrices?.[0]) {
      return cached.commodityPrices[0];
    }

    try {
      // 実際のAPI呼び出しはソースによって異なる
      // ここではモックデータを返す（実装では実際のAPIを呼び出す）
      const price = await this.fetchFromSource(source, normalizedKeyword, options);
      
      const result: CommodityPrice = {
        name: this.formatCommodityName(normalizedKeyword),
        symbol,
        price: price.value,
        currency: options?.currency ?? this.options.defaultCurrency,
        unit: unit.split('/')[1] || 'unit',
        change: price.change,
        changePercent: price.changePercent,
        timestamp: new Date().toISOString(),
        timeSeries: options?.includeTimeSeries ? price.timeSeries : undefined,
        source,
        sourceUrl: SOURCE_BASE_URLS[source],
      };

      // キャッシュに保存
      this.setCache(cacheKey, {
        success: true,
        query: { type: 'commodity_price', keyword: normalizedKeyword },
        commodityPrices: [result],
        fetchedAt: new Date().toISOString(),
        sources: [source],
      });

      return result;
    } catch (error) {
      console.error(`Failed to fetch commodity price for ${keyword}:`, error);
      return null;
    }
  }

  /**
   * 複数のコモディティ価格を一括取得
   * 
   * @param keywords コモディティ名の配列
   * @returns コモディティ価格データの配列
   */
  async fetchCommodityPrices(keywords: string[]): Promise<CommodityPrice[]> {
    const results = await Promise.all(
      keywords.map(k => this.fetchCommodityPrice(k))
    );
    return results.filter((r): r is CommodityPrice => r !== null);
  }

  /**
   * 統計データを取得
   * 
   * @param query データクエリ
   * @returns 統計データ配列
   */
  async fetchStatistics(
    query: Omit<RealTimeDataQuery, 'type'> & { type?: RealTimeDataType }
  ): Promise<StatisticsData[]> {
    const type = query.type ?? 'mineral_production';
    const sources = query.source 
      ? [query.source] 
      : STATISTICS_SOURCE_MAP[type] ?? ['worldbank'];

    const cacheKey = `statistics:${type}:${query.keyword}:${query.source ?? 'auto'}`;
    const cached = this.getCached(cacheKey);
    if (cached?.statistics) {
      return cached.statistics;
    }

    const results: StatisticsData[] = [];

    for (const source of sources.slice(0, 2)) { // 最大2ソースから取得
      try {
        const stats = await this.fetchStatisticsFromSource(source, query.keyword, type);
        results.push(...stats);
      } catch (error) {
        console.error(`Failed to fetch statistics from ${source}:`, error);
      }
    }

    // キャッシュに保存
    if (results.length > 0) {
      this.setCache(cacheKey, {
        success: true,
        query: { type, keyword: query.keyword, source: query.source },
        statistics: results,
        fetchedAt: new Date().toISOString(),
        sources: results.map(r => r.source),
      });
    }

    return results;
  }

  /**
   * 汎用データ取得
   * 
   * @param query データクエリ
   * @returns データ取得結果
   */
  async fetch(query: RealTimeDataQuery): Promise<RealTimeDataResult> {
    try {
      if (query.type === 'commodity_price') {
        const price = await this.fetchCommodityPrice(query.keyword, {
          currency: query.currency,
        });
        return {
          success: price !== null,
          query,
          commodityPrices: price ? [price] : undefined,
          fetchedAt: new Date().toISOString(),
          sources: price ? [price.source] : [],
        };
      }

      const statistics = await this.fetchStatistics(query);
      return {
        success: statistics.length > 0,
        query,
        statistics,
        fetchedAt: new Date().toISOString(),
        sources: [...new Set(statistics.map(s => s.source))],
      };
    } catch (error) {
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        fetchedAt: new Date().toISOString(),
        sources: [],
      };
    }
  }

  /**
   * サポートされているコモディティの一覧を取得
   */
  getSupportedCommodities(): string[] {
    return Object.keys(COMMODITY_SOURCE_MAP);
  }

  /**
   * サポートされているデータソースの一覧を取得
   */
  getSupportedSources(): RealTimeDataSource[] {
    return Object.keys(SOURCE_BASE_URLS) as RealTimeDataSource[];
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  // =================
  // Private Methods
  // =================

  private getCached(key: string): RealTimeDataResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: RealTimeDataResult): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.options.cacheTtl * 1000,
    });
  }

  private formatCommodityName(keyword: string): string {
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  /**
   * ソースからデータを取得（実際のAPI実装）
   * 
   * 注意: これはモック実装です。実際のプロダクション環境では、
   * 各ソースのAPIを呼び出す必要があります。
   */
  private async fetchFromSource(
    _source: RealTimeDataSource,
    keyword: string,
    _options?: { currency?: string; includeTimeSeries?: boolean }
  ): Promise<{ value: number; change?: number; changePercent?: number; timeSeries?: TimeSeriesData }> {
    // モックデータ生成（実際のAPIが利用可能になったら置き換え）
    const mockPrices: Record<string, number> = {
      copper: 8500,
      aluminium: 2200,
      aluminum: 2200,
      zinc: 2800,
      nickel: 16000,
      lead: 2100,
      tin: 25000,
      gold: 2000,
      silver: 25,
      platinum: 1000,
      palladium: 1200,
      oil: 75,
      'crude oil': 75,
      wti: 75,
      brent: 80,
      lithium: 15000,
      cobalt: 30000,
      rare_earth: 200,
      graphite: 1500,
    };

    const basePrice = mockPrices[keyword] ?? 1000;
    // ランダムな変動を追加（-2%〜+2%）
    const variation = (Math.random() - 0.5) * 0.04;
    const currentPrice = basePrice * (1 + variation);
    const change = basePrice * variation;
    const changePercent = variation * 100;

    return {
      value: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  /**
   * 統計データソースからデータを取得（実際のAPI実装）
   */
  private async fetchStatisticsFromSource(
    source: RealTimeDataSource,
    keyword: string,
    type: RealTimeDataType
  ): Promise<StatisticsData[]> {
    // モックデータ生成
    const mockData: StatisticsData = {
      name: `${this.formatCommodityName(keyword)} ${this.getTypeLabel(type)}`,
      category: type,
      value: Math.round(Math.random() * 100000),
      unit: this.getUnitForType(type),
      period: new Date().getFullYear().toString(),
      source,
      sourceUrl: SOURCE_BASE_URLS[source],
      metadata: {
        lastUpdated: new Date().toISOString(),
        methodology: 'Estimated',
      },
    };

    return [mockData];
  }

  private getTypeLabel(type: RealTimeDataType): string {
    const labels: Record<RealTimeDataType, string> = {
      commodity_price: 'Price',
      energy_price: 'Price',
      mineral_production: 'Production',
      trade_statistics: 'Trade Volume',
      economic_indicator: 'Index',
      market_data: 'Market Data',
    };
    return labels[type] ?? 'Data';
  }

  private getUnitForType(type: RealTimeDataType): string {
    const units: Record<RealTimeDataType, string> = {
      commodity_price: 'USD',
      energy_price: 'USD/barrel',
      mineral_production: 'metric tons',
      trade_statistics: 'USD million',
      economic_indicator: 'index',
      market_data: 'USD',
    };
    return units[type] ?? 'unit';
  }
}
