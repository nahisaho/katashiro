/**
 * Competitor Analyzer
 * 
 * 複数企業の競合比較分析を行い、Markdown形式の比較表を生成します。
 * 
 * @requirement REQ-EXT-CMP-001 競合比較表生成
 * @since 0.5.0
 * 
 * @example
 * ```typescript
 * const analyzer = new CompetitorAnalyzer();
 * 
 * const table = analyzer.generateComparisonTable({
 *   competitors: [
 *     { name: 'Company A', revenue: '10B', employees: 5000, founded: 2010 },
 *     { name: 'Company B', revenue: '8B', employees: 3000, founded: 2015 },
 *   ],
 *   dimensions: ['revenue', 'employees', 'founded'],
 *   format: 'markdown',
 * });
 * ```
 */

/**
 * 企業データ
 */
export interface CompetitorData {
  /** 企業名 */
  readonly name: string;
  /** 説明 */
  readonly description?: string;
  /** ウェブサイト */
  readonly website?: string;
  /** 追加属性（動的に比較可能） */
  readonly [key: string]: unknown;
}

/**
 * 比較ディメンション設定
 */
export interface ComparisonDimension {
  /** ディメンション名（属性キー） */
  readonly key: string;
  /** 表示ラベル */
  readonly label: string;
  /** 値のフォーマッタ */
  readonly formatter?: (value: unknown) => string;
  /** ソート順（ascending/descending/none） */
  readonly sortOrder?: 'asc' | 'desc' | 'none';
  /** 単位 */
  readonly unit?: string;
  /** 数値比較で高い方が良いか */
  readonly higherIsBetter?: boolean;
}

/**
 * 比較表生成オプション
 */
export interface ComparisonTableOptions {
  /** 比較対象の企業データ配列 */
  readonly competitors: CompetitorData[];
  /** 比較するディメンション（キーまたは詳細設定） */
  readonly dimensions: (string | ComparisonDimension)[];
  /** 出力フォーマット */
  readonly format?: 'markdown' | 'html' | 'csv' | 'json';
  /** タイトル */
  readonly title?: string;
  /** 説明文 */
  readonly description?: string;
  /** ハイライト設定 */
  readonly highlight?: {
    /** 最高値をハイライト */
    readonly best?: boolean;
    /** 最低値をハイライト */
    readonly worst?: boolean;
    /** ハイライト記号（デフォルト: ✓/✗） */
    readonly symbols?: { best?: string; worst?: string };
  };
  /** ソースURL配列 */
  readonly sources?: string[];
}

/**
 * 比較表生成結果
 */
export interface ComparisonTableResult {
  /** フォーマット済みの比較表 */
  readonly table: string;
  /** フォーマット */
  readonly format: 'markdown' | 'html' | 'csv' | 'json';
  /** 企業数 */
  readonly competitorCount: number;
  /** ディメンション数 */
  readonly dimensionCount: number;
  /** 分析サマリー */
  readonly summary?: ComparisonSummary;
  /** 生成日時 */
  readonly generatedAt: string;
}

/**
 * 比較サマリー
 */
export interface ComparisonSummary {
  /** 各ディメンションのトップ企業 */
  readonly leaders: Record<string, string>;
  /** 総合評価（該当する場合） */
  readonly overallLeader?: string;
  /** 主な差異ポイント */
  readonly keyDifferences: string[];
}

/**
 * SWOT形式の競合分析
 */
export interface CompetitorSwot {
  /** 企業名 */
  readonly name: string;
  /** 強み */
  readonly strengths: string[];
  /** 弱み */
  readonly weaknesses: string[];
  /** 機会 */
  readonly opportunities: string[];
  /** 脅威 */
  readonly threats: string[];
}

/**
 * Competitor Analyzer
 */
export class CompetitorAnalyzer {
  /**
   * 比較表を生成
   */
  generateComparisonTable(options: ComparisonTableOptions): ComparisonTableResult {
    const {
      competitors,
      dimensions,
      format = 'markdown',
      title,
      description,
      highlight,
      sources,
    } = options;

    // ディメンション設定を正規化
    const normalizedDimensions = this.normalizeDimensions(dimensions);
    
    // 各ディメンションの最大/最小値を計算
    const dimStats = this.calculateDimensionStats(competitors, normalizedDimensions);
    
    // フォーマット別に表を生成
    let table: string;
    switch (format) {
      case 'markdown':
        table = this.generateMarkdownTable(competitors, normalizedDimensions, dimStats, {
          title,
          description,
          highlight,
          sources,
        });
        break;
      case 'html':
        table = this.generateHtmlTable(competitors, normalizedDimensions, dimStats, {
          title,
          highlight,
        });
        break;
      case 'csv':
        table = this.generateCsvTable(competitors, normalizedDimensions);
        break;
      case 'json':
        table = this.generateJsonTable(competitors, normalizedDimensions, dimStats);
        break;
      default:
        table = this.generateMarkdownTable(competitors, normalizedDimensions, dimStats, {
          title,
          description,
          highlight,
          sources,
        });
    }

    // サマリーを生成
    const summary = this.generateSummary(competitors, normalizedDimensions, dimStats);

    return {
      table,
      format,
      competitorCount: competitors.length,
      dimensionCount: normalizedDimensions.length,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 競合SWOTマトリクスを生成
   */
  generateSwotMatrix(swots: CompetitorSwot[]): string {
    if (swots.length === 0) return '';

    let markdown = '## 競合SWOT分析\n\n';

    for (const swot of swots) {
      markdown += `### ${swot.name}\n\n`;
      markdown += '| 強み (S) | 弱み (W) |\n';
      markdown += '|----------|----------|\n';
      
      const maxLen = Math.max(swot.strengths.length, swot.weaknesses.length);
      for (let i = 0; i < maxLen; i++) {
        const s = swot.strengths[i] ? `• ${swot.strengths[i]}` : '';
        const w = swot.weaknesses[i] ? `• ${swot.weaknesses[i]}` : '';
        markdown += `| ${s} | ${w} |\n`;
      }
      
      markdown += '\n| 機会 (O) | 脅威 (T) |\n';
      markdown += '|----------|----------|\n';
      
      const maxLen2 = Math.max(swot.opportunities.length, swot.threats.length);
      for (let i = 0; i < maxLen2; i++) {
        const o = swot.opportunities[i] ? `• ${swot.opportunities[i]}` : '';
        const t = swot.threats[i] ? `• ${swot.threats[i]}` : '';
        markdown += `| ${o} | ${t} |\n`;
      }
      
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * ポジショニングマップデータを生成（2軸比較用）
   */
  generatePositioningData(
    competitors: CompetitorData[],
    xAxis: string,
    yAxis: string
  ): { name: string; x: number; y: number }[] {
    return competitors
      .filter(c => typeof c[xAxis] === 'number' && typeof c[yAxis] === 'number')
      .map(c => ({
        name: c.name,
        x: c[xAxis] as number,
        y: c[yAxis] as number,
      }));
  }

  // =================
  // Private Methods
  // =================

  private normalizeDimensions(
    dimensions: (string | ComparisonDimension)[]
  ): ComparisonDimension[] {
    return dimensions.map(dim => {
      if (typeof dim === 'string') {
        return {
          key: dim,
          label: this.formatLabel(dim),
          sortOrder: 'none' as const,
        };
      }
      return dim;
    });
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private calculateDimensionStats(
    competitors: CompetitorData[],
    dimensions: ComparisonDimension[]
  ): Map<string, { min: number; max: number; minCompany: string; maxCompany: string }> {
    const stats = new Map<string, { min: number; max: number; minCompany: string; maxCompany: string }>();

    for (const dim of dimensions) {
      const values: { value: number; company: string }[] = [];
      
      for (const comp of competitors) {
        const val = comp[dim.key];
        if (typeof val === 'number') {
          values.push({ value: val, company: comp.name });
        }
      }

      if (values.length > 0) {
        values.sort((a, b) => a.value - b.value);
        const first = values[0];
        const last = values[values.length - 1];
        if (first && last) {
          stats.set(dim.key, {
            min: first.value,
            max: last.value,
            minCompany: first.company,
            maxCompany: last.company,
          });
        }
      }
    }

    return stats;
  }

  private formatValue(value: unknown, dim: ComparisonDimension): string {
    if (dim.formatter) {
      return dim.formatter(value);
    }
    if (value === undefined || value === null) {
      return '-';
    }
    if (typeof value === 'number') {
      const formatted = value.toLocaleString();
      return dim.unit ? `${formatted} ${dim.unit}` : formatted;
    }
    return String(value);
  }

  private generateMarkdownTable(
    competitors: CompetitorData[],
    dimensions: ComparisonDimension[],
    _stats: Map<string, { min: number; max: number; minCompany: string; maxCompany: string }>,
    options: {
      title?: string;
      description?: string;
      highlight?: ComparisonTableOptions['highlight'];
      sources?: string[];
    }
  ): string {
    let md = '';

    // タイトル
    if (options.title) {
      md += `## ${options.title}\n\n`;
    }

    // 説明
    if (options.description) {
      md += `${options.description}\n\n`;
    }

    // ヘッダー行
    const headers = ['企業', ...dimensions.map(d => d.label)];
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // データ行
    for (const comp of competitors) {
      const cells = [
        comp.name,
        ...dimensions.map(dim => {
          const value = this.formatValue(comp[dim.key], dim);
          // ハイライト処理（オプション）
          if (options.highlight?.best && typeof comp[dim.key] === 'number') {
            const stat = _stats.get(dim.key);
            if (stat && comp[dim.key] === stat.max) {
              const symbol = options.highlight.symbols?.best ?? '✓';
              return `**${value}** ${symbol}`;
            }
          }
          return value;
        }),
      ];
      md += `| ${cells.join(' | ')} |\n`;
    }

    // ソース
    if (options.sources && options.sources.length > 0) {
      md += '\n**出典:**\n';
      options.sources.forEach((src, i) => {
        md += `${i + 1}. ${src}\n`;
      });
    }

    return md;
  }

  private generateHtmlTable(
    competitors: CompetitorData[],
    dimensions: ComparisonDimension[],
    _stats: Map<string, { min: number; max: number; minCompany: string; maxCompany: string }>,
    options: {
      title?: string;
      highlight?: ComparisonTableOptions['highlight'];
    }
  ): string {
    let html = '<table class="competitor-comparison">\n';

    if (options.title) {
      html += `  <caption>${this.escapeHtml(options.title)}</caption>\n`;
    }

    // ヘッダー
    html += '  <thead>\n    <tr>\n';
    html += '      <th>企業</th>\n';
    for (const dim of dimensions) {
      html += `      <th>${this.escapeHtml(dim.label)}</th>\n`;
    }
    html += '    </tr>\n  </thead>\n';

    // ボディ
    html += '  <tbody>\n';
    for (const comp of competitors) {
      html += '    <tr>\n';
      html += `      <td>${this.escapeHtml(comp.name)}</td>\n`;
      for (const dim of dimensions) {
        const value = this.formatValue(comp[dim.key], dim);
        let className = '';
        if (options.highlight?.best && typeof comp[dim.key] === 'number') {
          const stat = _stats.get(dim.key);
          if (stat && comp[dim.key] === stat.max) {
            className = ' class="best"';
          }
        }
        html += `      <td${className}>${this.escapeHtml(value)}</td>\n`;
      }
      html += '    </tr>\n';
    }
    html += '  </tbody>\n</table>';

    return html;
  }

  private generateCsvTable(
    competitors: CompetitorData[],
    dimensions: ComparisonDimension[]
  ): string {
    const lines: string[] = [];

    // ヘッダー
    const headers = ['企業', ...dimensions.map(d => d.label)];
    lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    // データ
    for (const comp of competitors) {
      const cells = [
        comp.name,
        ...dimensions.map(dim => this.formatValue(comp[dim.key], dim)),
      ];
      lines.push(cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    }

    return lines.join('\n');
  }

  private generateJsonTable(
    competitors: CompetitorData[],
    dimensions: ComparisonDimension[],
    stats: Map<string, { min: number; max: number; minCompany: string; maxCompany: string }>
  ): string {
    const data = {
      competitors: competitors.map(comp => {
        const obj: Record<string, unknown> = { name: comp.name };
        for (const dim of dimensions) {
          obj[dim.key] = comp[dim.key];
        }
        return obj;
      }),
      dimensions: dimensions.map(d => ({
        key: d.key,
        label: d.label,
        unit: d.unit,
      })),
      statistics: Object.fromEntries(stats),
    };

    return JSON.stringify(data, null, 2);
  }

  private generateSummary(
    _competitors: CompetitorData[],
    dimensions: ComparisonDimension[],
    stats: Map<string, { min: number; max: number; minCompany: string; maxCompany: string }>
  ): ComparisonSummary {
    const leaders: Record<string, string> = {};
    const keyDifferences: string[] = [];
    const leaderCounts: Record<string, number> = {};

    for (const dim of dimensions) {
      const stat = stats.get(dim.key);
      if (stat) {
        const leader = dim.higherIsBetter === false ? stat.minCompany : stat.maxCompany;
        leaders[dim.label] = leader;
        leaderCounts[leader] = (leaderCounts[leader] || 0) + 1;

        // 差異計算
        if (stat.max !== stat.min && stat.min !== 0) {
          const diff = ((stat.max - stat.min) / stat.min * 100).toFixed(1);
          keyDifferences.push(`${dim.label}: ${stat.maxCompany}は${stat.minCompany}より${diff}%高い`);
        }
      }
    }

    // 総合リーダーを決定
    const sortedLeaders = Object.entries(leaderCounts).sort((a, b) => b[1] - a[1]);
    const firstLeader = sortedLeaders[0];
    const overallLeader = firstLeader ? firstLeader[0] : undefined;

    return {
      leaders,
      overallLeader,
      keyDifferences: keyDifferences.slice(0, 5), // 最大5件
    };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
