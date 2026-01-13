/**
 * CompetitorAnalyzer Unit Tests
 * 
 * @requirement REQ-EXT-CMP-001
 * @since 0.5.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompetitorAnalyzer } from '../../src/comparator/competitor-analyzer.js';
import type { CompetitorData, CompetitorSwot } from '../../src/comparator/competitor-analyzer.js';

describe('CompetitorAnalyzer', () => {
  let analyzer: CompetitorAnalyzer;

  const competitors: CompetitorData[] = [
    {
      name: 'Company A',
      revenue: 10000000000,
      employees: 5000,
      founded: 2010,
      marketShare: 35,
      description: 'Market leader',
    },
    {
      name: 'Company B',
      revenue: 8000000000,
      employees: 3000,
      founded: 2015,
      marketShare: 28,
      description: 'Fast growing',
    },
    {
      name: 'Company C',
      revenue: 5000000000,
      employees: 2000,
      founded: 2018,
      marketShare: 15,
      description: 'Innovative startup',
    },
  ];

  beforeEach(() => {
    analyzer = new CompetitorAnalyzer();
  });

  describe('generateComparisonTable', () => {
    it('should generate markdown table by default', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue', 'employees', 'marketShare'],
      });

      expect(result.format).toBe('markdown');
      expect(result.table).toContain('| 企業 |');
      expect(result.table).toContain('Company A');
      expect(result.table).toContain('Company B');
      expect(result.table).toContain('Company C');
      expect(result.competitorCount).toBe(3);
      expect(result.dimensionCount).toBe(3);
    });

    it('should include title and description', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
        title: '競合分析',
        description: '主要3社の比較',
      });

      expect(result.table).toContain('## 競合分析');
      expect(result.table).toContain('主要3社の比較');
    });

    it('should use custom dimension labels', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: [
          { key: 'revenue', label: '売上高' },
          { key: 'employees', label: '従業員数' },
        ],
      });

      expect(result.table).toContain('売上高');
      expect(result.table).toContain('従業員数');
    });

    it('should format numbers with units', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: [
          { key: 'employees', label: '従業員数', unit: '人' },
        ],
      });

      expect(result.table).toContain('人');
    });

    it('should highlight best values when enabled', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
        highlight: { best: true },
      });

      expect(result.table).toContain('✓');
    });

    it('should include sources', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
        sources: ['https://example.com/report', 'Internal data'],
      });

      expect(result.table).toContain('**出典:**');
      expect(result.table).toContain('https://example.com/report');
    });

    it('should generate HTML table', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
        format: 'html',
      });

      expect(result.format).toBe('html');
      expect(result.table).toContain('<table');
      expect(result.table).toContain('<thead>');
      expect(result.table).toContain('<tbody>');
      expect(result.table).toContain('Company A');
    });

    it('should generate CSV table', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue', 'employees'],
        format: 'csv',
      });

      expect(result.format).toBe('csv');
      expect(result.table).toContain('"企業"');
      expect(result.table).toContain('"Company A"');
      expect(result.table).toContain(',');
    });

    it('should generate JSON table', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
        format: 'json',
      });

      expect(result.format).toBe('json');
      const data = JSON.parse(result.table);
      expect(data.competitors).toHaveLength(3);
      expect(data.dimensions).toHaveLength(1);
      expect(data.statistics).toBeDefined();
    });

    it('should generate summary with leaders', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue', 'employees', 'marketShare'],
      });

      expect(result.summary).toBeDefined();
      expect(result.summary!.leaders).toBeDefined();
      expect(result.summary!.overallLeader).toBe('Company A');
    });

    it('should generate key differences', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
      });

      expect(result.summary!.keyDifferences.length).toBeGreaterThan(0);
    });

    it('should include generatedAt timestamp', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['revenue'],
      });

      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
    });

    it('should handle missing values gracefully', () => {
      const partialData: CompetitorData[] = [
        { name: 'X', revenue: 100 },
        { name: 'Y' }, // no revenue
      ];

      const result = analyzer.generateComparisonTable({
        competitors: partialData,
        dimensions: ['revenue'],
      });

      expect(result.table).toContain('X');
      expect(result.table).toContain('Y');
      expect(result.table).toContain('-'); // missing value indicator
    });
  });

  describe('generateSwotMatrix', () => {
    const swots: CompetitorSwot[] = [
      {
        name: 'Company A',
        strengths: ['Strong brand', 'Large market share'],
        weaknesses: ['High costs'],
        opportunities: ['New markets'],
        threats: ['New competitors'],
      },
      {
        name: 'Company B',
        strengths: ['Innovative'],
        weaknesses: ['Small scale'],
        opportunities: ['Technology trends'],
        threats: ['Regulation'],
      },
    ];

    it('should generate SWOT matrix markdown', () => {
      const result = analyzer.generateSwotMatrix(swots);

      expect(result).toContain('## 競合SWOT分析');
      expect(result).toContain('### Company A');
      expect(result).toContain('### Company B');
      expect(result).toContain('強み (S)');
      expect(result).toContain('弱み (W)');
      expect(result).toContain('機会 (O)');
      expect(result).toContain('脅威 (T)');
    });

    it('should include all SWOT items', () => {
      const result = analyzer.generateSwotMatrix(swots);

      expect(result).toContain('Strong brand');
      expect(result).toContain('High costs');
      expect(result).toContain('New markets');
      expect(result).toContain('New competitors');
    });

    it('should handle empty swots array', () => {
      const result = analyzer.generateSwotMatrix([]);
      expect(result).toBe('');
    });
  });

  describe('generatePositioningData', () => {
    it('should generate positioning data for 2 axes', () => {
      const data = analyzer.generatePositioningData(
        competitors,
        'revenue',
        'marketShare'
      );

      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('x');
      expect(data[0]).toHaveProperty('y');
    });

    it('should filter out competitors without numeric values', () => {
      const mixedData: CompetitorData[] = [
        { name: 'A', revenue: 100, marketShare: 20 },
        { name: 'B', revenue: 'N/A', marketShare: 15 }, // non-numeric
        { name: 'C', revenue: 80, marketShare: 25 },
      ];

      const data = analyzer.generatePositioningData(
        mixedData,
        'revenue',
        'marketShare'
      );

      expect(data).toHaveLength(2);
      expect(data.map(d => d.name)).not.toContain('B');
    });
  });

  describe('edge cases', () => {
    it('should handle single competitor', () => {
      const result = analyzer.generateComparisonTable({
        competitors: [competitors[0]],
        dimensions: ['revenue'],
      });

      expect(result.competitorCount).toBe(1);
      expect(result.table).toContain('Company A');
    });

    it('should handle empty dimensions', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: [],
      });

      expect(result.dimensionCount).toBe(0);
      expect(result.table).toContain('企業');
    });

    it('should escape HTML in HTML format', () => {
      const xssData: CompetitorData[] = [
        { name: '<script>alert("XSS")</script>', revenue: 100 },
      ];

      const result = analyzer.generateComparisonTable({
        competitors: xssData,
        dimensions: ['revenue'],
        format: 'html',
      });

      expect(result.table).not.toContain('<script>');
      expect(result.table).toContain('&lt;script&gt;');
    });

    it('should format camelCase dimension keys as labels', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: ['marketShare'],
      });

      expect(result.table).toContain('Market Share');
    });

    it('should handle custom formatters', () => {
      const result = analyzer.generateComparisonTable({
        competitors,
        dimensions: [
          {
            key: 'revenue',
            label: 'Revenue',
            formatter: (v) => `$${(v as number / 1000000000).toFixed(1)}B`,
          },
        ],
      });

      expect(result.table).toContain('$10.0B');
    });
  });

  // REQ-EXT-CMP-002: 競合情報収集テスト
  describe('collectCompetitorIntelligence (REQ-EXT-CMP-002)', () => {
    it('should return error when no collector is set', async () => {
      const result = await analyzer.collectCompetitorIntelligence('TestCompany');

      expect(result.name).toBe('TestCompany');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('コレクターが設定されていません');
      expect(result.pressReleases).toHaveLength(0);
      expect(result.newsArticles).toHaveLength(0);
    });

    it('should collect press releases with collector', async () => {
      const mockCollector = {
        search: async (query: string, maxResults?: number) => {
          if (query.includes('プレスリリース')) {
            return [
              { title: 'TestCompany 新製品発表', url: 'https://example.com/pr1', snippet: '2024年1月15日 - 新製品を発表' },
              { title: 'TestCompany 業績発表', url: 'https://example.com/pr2', snippet: '2024年2月1日 - 好調な業績' },
            ];
          }
          return [];
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const result = await analyzerWithCollector.collectCompetitorIntelligence('TestCompany');

      expect(result.pressReleases.length).toBeGreaterThan(0);
      expect(result.pressReleases[0].title).toBe('TestCompany 新製品発表');
      expect(result.pressReleases[0].date).toBe('2024-01-15');
    });

    it('should collect news articles with collector', async () => {
      const mockCollector = {
        search: async (query: string) => {
          if (query.includes('ニュース')) {
            return [
              { title: 'TestCompany 成長続く', url: 'https://news.example.com/article1', snippet: '2024年3月10日 - 順調な成長' },
            ];
          }
          return [];
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const result = await analyzerWithCollector.collectCompetitorIntelligence('TestCompany');

      expect(result.newsArticles.length).toBeGreaterThan(0);
      expect(result.newsArticles[0].title).toContain('TestCompany');
    });

    it('should analyze sentiment in news articles', async () => {
      const mockCollector = {
        search: async (query: string) => {
          if (query.includes('ニュース')) {
            return [
              { title: 'Company 過去最高益を達成', url: 'https://news.com/1', snippet: '好調な成長で増益' },
              { title: 'Company 減益で株価下落', url: 'https://news.com/2', snippet: '業績不振で赤字' },
              { title: 'Company 新サービス開始', url: 'https://news.com/3', snippet: '発表があった' },
            ];
          }
          return [];
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const result = await analyzerWithCollector.collectCompetitorIntelligence('Company');

      expect(result.newsArticles[0].sentiment).toBe('positive');
      expect(result.newsArticles[1].sentiment).toBe('negative');
      expect(result.newsArticles[2].sentiment).toBe('neutral');
    });

    it('should extract financial data from search results', async () => {
      const mockCollector = {
        search: async (query: string) => {
          if (query.includes('売上')) {
            return [
              { title: 'TestCompany 決算情報', url: 'https://example.com', snippet: '売上高: 1,000億円 従業員数: 5,000人' },
            ];
          }
          return [];
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const result = await analyzerWithCollector.collectCompetitorIntelligence('TestCompany', { includeFinancials: true });

      expect(result.financialData).toBeDefined();
      expect(result.financialData?.revenue).toContain('1,000');
      expect(result.financialData?.employees).toBe(5000);
    });

    it('should handle search errors gracefully', async () => {
      const mockCollector = {
        search: async () => {
          throw new Error('Network error');
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const result = await analyzerWithCollector.collectCompetitorIntelligence('TestCompany');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Network error');
    });
  });

  describe('collectMultipleCompetitors (REQ-EXT-CMP-002)', () => {
    it('should collect information for multiple companies', async () => {
      const mockCollector = {
        search: async (query: string) => {
          return [{ title: `${query} 記事`, url: 'https://example.com', snippet: '概要' }];
        },
      };

      const analyzerWithCollector = new CompetitorAnalyzer(mockCollector);
      const results = await analyzerWithCollector.collectMultipleCompetitors(['CompanyA', 'CompanyB']);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('CompanyA');
      expect(results[1].name).toBe('CompanyB');
    });
  });

  describe('formatIntelligenceReport (REQ-EXT-CMP-002)', () => {
    it('should format intelligence data as Markdown report', () => {
      const mockIntel = {
        name: 'TestCompany',
        collectedAt: '2024-01-15T10:00:00Z',
        pressReleases: [
          { title: 'New Product Launch', date: '2024-01-10', url: 'https://example.com/pr', summary: 'Exciting new product' },
        ],
        newsArticles: [
          { title: 'Growth Continues', source: 'TechNews', date: '2024-01-12', sentiment: 'positive' as const },
        ],
        financialData: {
          revenue: '$1B',
          employees: 1000,
        },
        errors: [],
      };

      const report = analyzer.formatIntelligenceReport(mockIntel);

      expect(report).toContain('# TestCompany 競合情報レポート');
      expect(report).toContain('## プレスリリース (1件)');
      expect(report).toContain('### New Product Launch');
      expect(report).toContain('## ニュース記事 (1件)');
      expect(report).toContain('📈 Growth Continues');  // positive sentiment icon
      expect(report).toContain('## 財務データ');
      expect(report).toContain('$1B');
    });

    it('should show error section when errors exist', () => {
      const mockIntel = {
        name: 'TestCompany',
        collectedAt: '2024-01-15T10:00:00Z',
        pressReleases: [],
        newsArticles: [],
        errors: ['Search failed', 'API timeout'],
      };

      const report = analyzer.formatIntelligenceReport(mockIntel);

      expect(report).toContain('## 収集エラー');
      expect(report).toContain('⚠️ Search failed');
      expect(report).toContain('⚠️ API timeout');
    });

    it('should handle empty results gracefully', () => {
      const mockIntel = {
        name: 'UnknownCompany',
        collectedAt: '2024-01-15T10:00:00Z',
        pressReleases: [],
        newsArticles: [],
        errors: [],
      };

      const report = analyzer.formatIntelligenceReport(mockIntel);

      expect(report).toContain('# UnknownCompany');
      expect(report).toContain('プレスリリースは見つかりませんでした');
      expect(report).toContain('ニュース記事は見つかりませんでした');
    });
  });
});
