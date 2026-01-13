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
});
