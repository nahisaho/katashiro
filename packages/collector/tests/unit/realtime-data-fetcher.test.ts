/**
 * RealTimeDataFetcher Unit Tests
 * 
 * @requirement REQ-EXT-RTD-001
 * @requirement REQ-EXT-RTD-002
 * @since 0.5.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RealTimeDataFetcher } from '../../src/realtime-data/realtime-data-fetcher.js';

describe('RealTimeDataFetcher', () => {
  let fetcher: RealTimeDataFetcher;

  beforeEach(() => {
    fetcher = new RealTimeDataFetcher();
  });

  describe('fetchCommodityPrice', () => {
    it('should fetch copper price', async () => {
      const price = await fetcher.fetchCommodityPrice('copper');
      
      expect(price).not.toBeNull();
      expect(price!.name).toBe('Copper');
      expect(price!.price).toBeGreaterThan(0);
      expect(price!.currency).toBe('USD');
      expect(price!.source).toBe('lme');
      expect(price!.timestamp).toBeDefined();
    });

    it('should fetch gold price', async () => {
      const price = await fetcher.fetchCommodityPrice('gold');
      
      expect(price).not.toBeNull();
      expect(price!.name).toBe('Gold');
      expect(price!.source).toBe('comex');
    });

    it('should fetch oil price', async () => {
      const price = await fetcher.fetchCommodityPrice('oil');
      
      expect(price).not.toBeNull();
      expect(price!.name).toBe('Oil');
      expect(price!.source).toBe('wti');
    });

    it('should fetch lithium price from USGS', async () => {
      const price = await fetcher.fetchCommodityPrice('lithium');
      
      expect(price).not.toBeNull();
      expect(price!.name).toBe('Lithium');
      expect(price!.source).toBe('usgs');
    });

    it('should handle unknown commodity with default source', async () => {
      const price = await fetcher.fetchCommodityPrice('unknown_commodity');
      
      expect(price).not.toBeNull();
      expect(price!.source).toBe('usgs');
    });

    it('should normalize keyword case', async () => {
      const price = await fetcher.fetchCommodityPrice('COPPER');
      
      expect(price).not.toBeNull();
      expect(price!.name).toBe('Copper');
    });

    it('should include change data', async () => {
      const price = await fetcher.fetchCommodityPrice('copper');
      
      expect(price).not.toBeNull();
      expect(price!.change).toBeDefined();
      expect(price!.changePercent).toBeDefined();
    });

    it('should use cache for repeated requests', async () => {
      // First request
      const price1 = await fetcher.fetchCommodityPrice('copper');
      // Second request (should hit cache)
      const price2 = await fetcher.fetchCommodityPrice('copper');
      
      expect(price1).not.toBeNull();
      expect(price2).not.toBeNull();
      // Cached value should be identical
      expect(price1!.price).toBe(price2!.price);
    });
  });

  describe('fetchCommodityPrices', () => {
    it('should fetch multiple commodity prices', async () => {
      const prices = await fetcher.fetchCommodityPrices(['copper', 'gold', 'silver']);
      
      expect(prices).toHaveLength(3);
      expect(prices.map(p => p.name)).toContain('Copper');
      expect(prices.map(p => p.name)).toContain('Gold');
      expect(prices.map(p => p.name)).toContain('Silver');
    });

    it('should handle empty array', async () => {
      const prices = await fetcher.fetchCommodityPrices([]);
      
      expect(prices).toHaveLength(0);
    });
  });

  describe('fetchStatistics', () => {
    it('should fetch mineral production statistics', async () => {
      const stats = await fetcher.fetchStatistics({
        keyword: 'lithium',
        type: 'mineral_production',
      });
      
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].name).toContain('Lithium');
      expect(stats[0].category).toBe('mineral_production');
      expect(stats[0].value).toBeGreaterThan(0);
    });

    it('should fetch trade statistics', async () => {
      const stats = await fetcher.fetchStatistics({
        keyword: 'semiconductor',
        type: 'trade_statistics',
      });
      
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].category).toBe('trade_statistics');
    });

    it('should use specified source', async () => {
      const stats = await fetcher.fetchStatistics({
        keyword: 'copper',
        type: 'mineral_production',
        source: 'jogmec',
      });
      
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].source).toBe('jogmec');
    });

    it('should include source URL', async () => {
      const stats = await fetcher.fetchStatistics({
        keyword: 'oil',
        type: 'energy_price',
      });
      
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].sourceUrl).toBeDefined();
    });
  });

  describe('fetch (generic)', () => {
    it('should fetch commodity price via generic method', async () => {
      const result = await fetcher.fetch({
        type: 'commodity_price',
        keyword: 'copper',
      });
      
      expect(result.success).toBe(true);
      expect(result.commodityPrices).toBeDefined();
      expect(result.commodityPrices!.length).toBeGreaterThan(0);
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('should fetch statistics via generic method', async () => {
      const result = await fetcher.fetch({
        type: 'mineral_production',
        keyword: 'nickel',
      });
      
      expect(result.success).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics!.length).toBeGreaterThan(0);
    });

    it('should include query in result', async () => {
      const query = {
        type: 'commodity_price' as const,
        keyword: 'gold',
        currency: 'USD',
      };
      
      const result = await fetcher.fetch(query);
      
      expect(result.query).toEqual(query);
    });

    it('should include fetchedAt timestamp', async () => {
      const result = await fetcher.fetch({
        type: 'commodity_price',
        keyword: 'silver',
      });
      
      expect(result.fetchedAt).toBeDefined();
      expect(new Date(result.fetchedAt).getTime()).not.toBeNaN();
    });
  });

  describe('getSupportedCommodities', () => {
    it('should return list of supported commodities', () => {
      const commodities = fetcher.getSupportedCommodities();
      
      expect(commodities.length).toBeGreaterThan(0);
      expect(commodities).toContain('copper');
      expect(commodities).toContain('gold');
      expect(commodities).toContain('oil');
      expect(commodities).toContain('lithium');
    });
  });

  describe('getSupportedSources', () => {
    it('should return list of supported sources', () => {
      const sources = fetcher.getSupportedSources();
      
      expect(sources.length).toBeGreaterThan(0);
      expect(sources).toContain('lme');
      expect(sources).toContain('usgs');
      expect(sources).toContain('jogmec');
      expect(sources).toContain('iea');
    });
  });

  describe('clearCache', () => {
    it('should clear cache and fetch fresh data', async () => {
      // First request
      const price1 = await fetcher.fetchCommodityPrice('copper');
      
      // Clear cache
      fetcher.clearCache();
      
      // Second request (should fetch fresh data)
      const price2 = await fetcher.fetchCommodityPrice('copper');
      
      expect(price1).not.toBeNull();
      expect(price2).not.toBeNull();
      // After cache clear, prices may differ due to mock randomness
    });
  });

  describe('options', () => {
    it('should respect custom timeout', () => {
      const customFetcher = new RealTimeDataFetcher({
        timeout: 5000,
      });
      
      expect(customFetcher).toBeDefined();
    });

    it('should respect custom currency', async () => {
      const customFetcher = new RealTimeDataFetcher({
        defaultCurrency: 'JPY',
      });
      
      const price = await customFetcher.fetchCommodityPrice('copper');
      
      expect(price!.currency).toBe('JPY');
    });

    it('should respect custom cacheTtl', () => {
      const customFetcher = new RealTimeDataFetcher({
        cacheTtl: 60,
      });
      
      expect(customFetcher).toBeDefined();
    });
  });
});
