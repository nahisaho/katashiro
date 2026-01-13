/**
 * Competitor Analyzer
 * 
 * 複数企業の競合比較分析を行い、Markdown形式の比較表を生成します。
 * 
 * @requirement REQ-EXT-CMP-001 競合比較表生成
 * @requirement REQ-EXT-CMP-002 競合情報自動収集
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
 * 競合情報収集結果（REQ-EXT-CMP-002）
 */
export interface CompetitorIntelligence {
  /** 企業名 */
  readonly name: string;
  /** 収集日時 */
  readonly collectedAt: string;
  /** プレスリリース */
  readonly pressReleases: PressReleaseInfo[];
  /** ニュース記事 */
  readonly newsArticles: NewsArticleInfo[];
  /** 財務データ（取得可能な場合） */
  readonly financialData?: FinancialDataInfo;
  /** 収集エラー */
  readonly errors: string[];
}

/**
 * プレスリリース情報（REQ-EXT-CMP-002）
 */
export interface PressReleaseInfo {
  /** タイトル */
  readonly title: string;
  /** 日付 */
  readonly date: string;
  /** URL */
  readonly url?: string;
  /** 概要 */
  readonly summary?: string;
  /** カテゴリ */
  readonly category?: string;
}

/**
 * ニュース記事情報（REQ-EXT-CMP-002）
 */
export interface NewsArticleInfo {
  /** タイトル */
  readonly title: string;
  /** ソース（メディア名） */
  readonly source: string;
  /** 日付 */
  readonly date: string;
  /** URL */
  readonly url?: string;
  /** 概要 */
  readonly summary?: string;
  /** センチメント（ポジティブ/ネガティブ/ニュートラル） */
  readonly sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * 財務データ情報（REQ-EXT-CMP-002）
 */
export interface FinancialDataInfo {
  /** 売上高 */
  readonly revenue?: string;
  /** 利益 */
  readonly profit?: string;
  /** 従業員数 */
  readonly employees?: number;
  /** 時価総額 */
  readonly marketCap?: string;
  /** 株価 */
  readonly stockPrice?: string;
  /** データソース */
  readonly source?: string;
  /** 更新日 */
  readonly updatedAt?: string;
}

/**
 * 競合情報収集オプション（REQ-EXT-CMP-002）
 */
export interface CompetitorIntelligenceOptions {
  /** 検索クエリ（企業名以外の追加キーワード） */
  readonly additionalKeywords?: string[];
  /** プレスリリース取得数上限 */
  readonly maxPressReleases?: number;
  /** ニュース記事取得数上限 */
  readonly maxNewsArticles?: number;
  /** 検索対象期間（日数） */
  readonly daysBack?: number;
  /** 財務データを取得するか */
  readonly includeFinancials?: boolean;
  /** 言語 */
  readonly language?: 'ja' | 'en';
}

/**
 * 情報収集用のコレクターインターフェース
 */
export interface ICompetitorCollector {
  /** Web検索を実行 */
  search(query: string, maxResults?: number): Promise<Array<{ title: string; url: string; snippet?: string }>>;
  /** ページをスクレイピング */
  scrape?(url: string): Promise<{ title?: string; content: string; date?: string } | null>;
}

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
  private collector?: ICompetitorCollector;

  /**
   * コンストラクタ
   * @param collector 情報収集用のコレクター（オプション）
   */
  constructor(collector?: ICompetitorCollector) {
    this.collector = collector;
  }

  /**
   * 競合企業の情報を収集（REQ-EXT-CMP-002）
   * @param companyName 企業名
   * @param options 収集オプション
   * @returns 収集された情報
   */
  async collectCompetitorIntelligence(
    companyName: string,
    options: CompetitorIntelligenceOptions = {}
  ): Promise<CompetitorIntelligence> {
    const {
      additionalKeywords = [],
      maxPressReleases = 5,
      maxNewsArticles = 10,
      daysBack = 30,
      includeFinancials = true,
      language = 'ja',
    } = options;

    const errors: string[] = [];
    const pressReleases: PressReleaseInfo[] = [];
    const newsArticles: NewsArticleInfo[] = [];
    let financialData: FinancialDataInfo | undefined;

    if (!this.collector) {
      errors.push('コレクターが設定されていません。情報収集にはICompetitorCollectorの実装が必要です。');
      return {
        name: companyName,
        collectedAt: new Date().toISOString(),
        pressReleases,
        newsArticles,
        financialData,
        errors,
      };
    }

    try {
      // プレスリリース検索
      const prQuery = language === 'ja'
        ? `${companyName} プレスリリース ${additionalKeywords.join(' ')}`
        : `${companyName} press release ${additionalKeywords.join(' ')}`;
      
      const prResults = await this.collector.search(prQuery, maxPressReleases * 2);
      for (const result of prResults.slice(0, maxPressReleases)) {
        pressReleases.push({
          title: result.title,
          date: this.extractDateFromText(result.snippet ?? result.title) ?? new Date().toISOString().split('T')[0],
          url: result.url,
          summary: result.snippet,
          category: 'general',
        });
      }
    } catch (error) {
      errors.push(`プレスリリース検索エラー: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // ニュース記事検索
      const newsQuery = language === 'ja'
        ? `${companyName} ニュース ${additionalKeywords.join(' ')}`
        : `${companyName} news ${additionalKeywords.join(' ')}`;
      
      const newsResults = await this.collector.search(newsQuery, maxNewsArticles * 2);
      for (const result of newsResults.slice(0, maxNewsArticles)) {
        newsArticles.push({
          title: result.title,
          source: this.extractSource(result.url),
          date: this.extractDateFromText(result.snippet ?? result.title) ?? new Date().toISOString().split('T')[0],
          url: result.url,
          summary: result.snippet,
          sentiment: this.analyzeSentiment(result.title + ' ' + (result.snippet ?? '')),
        });
      }
    } catch (error) {
      errors.push(`ニュース検索エラー: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (includeFinancials) {
      try {
        // 財務データ検索
        const finQuery = language === 'ja'
          ? `${companyName} 売上 従業員数 決算`
          : `${companyName} revenue employees financial`;
        
        const finResults = await this.collector.search(finQuery, 5);
        if (finResults.length > 0) {
          financialData = this.extractFinancialData(finResults, companyName);
        }
      } catch (error) {
        errors.push(`財務データ検索エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      name: companyName,
      collectedAt: new Date().toISOString(),
      pressReleases,
      newsArticles,
      financialData,
      errors,
    };
  }

  /**
   * 複数の競合企業の情報を一括収集（REQ-EXT-CMP-002）
   * @param companyNames 企業名の配列
   * @param options 収集オプション
   * @returns 収集された情報の配列
   */
  async collectMultipleCompetitors(
    companyNames: string[],
    options: CompetitorIntelligenceOptions = {}
  ): Promise<CompetitorIntelligence[]> {
    const results: CompetitorIntelligence[] = [];
    for (const name of companyNames) {
      const intel = await this.collectCompetitorIntelligence(name, options);
      results.push(intel);
    }
    return results;
  }

  /**
   * 収集した情報をMarkdownレポートに変換（REQ-EXT-CMP-002）
   */
  formatIntelligenceReport(intelligence: CompetitorIntelligence): string {
    let report = `# ${intelligence.name} 競合情報レポート\n\n`;
    report += `**収集日時**: ${intelligence.collectedAt}\n\n`;

    // プレスリリース
    report += `## プレスリリース (${intelligence.pressReleases.length}件)\n\n`;
    if (intelligence.pressReleases.length === 0) {
      report += '*プレスリリースは見つかりませんでした*\n\n';
    } else {
      for (const pr of intelligence.pressReleases) {
        report += `### ${pr.title}\n`;
        report += `- **日付**: ${pr.date}\n`;
        if (pr.url) report += `- **URL**: ${pr.url}\n`;
        if (pr.summary) report += `- **概要**: ${pr.summary}\n`;
        report += '\n';
      }
    }

    // ニュース記事
    report += `## ニュース記事 (${intelligence.newsArticles.length}件)\n\n`;
    if (intelligence.newsArticles.length === 0) {
      report += '*ニュース記事は見つかりませんでした*\n\n';
    } else {
      for (const news of intelligence.newsArticles) {
        const sentimentIcon = news.sentiment === 'positive' ? '📈' : news.sentiment === 'negative' ? '📉' : '➖';
        report += `### ${sentimentIcon} ${news.title}\n`;
        report += `- **ソース**: ${news.source}\n`;
        report += `- **日付**: ${news.date}\n`;
        if (news.url) report += `- **URL**: ${news.url}\n`;
        if (news.summary) report += `- **概要**: ${news.summary}\n`;
        report += '\n';
      }
    }

    // 財務データ
    if (intelligence.financialData) {
      report += `## 財務データ\n\n`;
      const fin = intelligence.financialData;
      if (fin.revenue) report += `- **売上高**: ${fin.revenue}\n`;
      if (fin.profit) report += `- **利益**: ${fin.profit}\n`;
      if (fin.employees) report += `- **従業員数**: ${fin.employees.toLocaleString()}人\n`;
      if (fin.marketCap) report += `- **時価総額**: ${fin.marketCap}\n`;
      if (fin.stockPrice) report += `- **株価**: ${fin.stockPrice}\n`;
      if (fin.source) report += `- **データソース**: ${fin.source}\n`;
      report += '\n';
    }

    // エラー
    if (intelligence.errors.length > 0) {
      report += `## 収集エラー\n\n`;
      for (const error of intelligence.errors) {
        report += `- ⚠️ ${error}\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * テキストから日付を抽出
   */
  private extractDateFromText(text: string): string | undefined {
    // YYYY-MM-DD形式
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // YYYY/MM/DD形式
    const slashMatch = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (slashMatch) {
      const [, y, m, d] = slashMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 日本語形式（2024年1月15日）
    const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jpMatch) {
      const [, y, m, d] = jpMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return undefined;
  }

  /**
   * URLからソース名を抽出
   */
  private extractSource(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      // www.を除去して、ドメイン名を取得
      return hostname.replace(/^www\./, '').split('.')[0] ?? hostname;
    } catch {
      return 'Unknown';
    }
  }

  /**
   * 簡易センチメント分析
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['成長', '増益', '好調', '過去最高', '上昇', '成功', '革新', '拡大', 'growth', 'profit', 'success', 'record', 'innovation'];
    const negativeWords = ['減益', '不振', '下落', '赤字', '撤退', '縮小', 'loss', 'decline', 'failure', 'layoff', 'restructure'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word.toLowerCase())) score += 1;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word.toLowerCase())) score -= 1;
    }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * 検索結果から財務データを抽出
   */
  private extractFinancialData(
    results: Array<{ title: string; url: string; snippet?: string }>,
    companyName: string
  ): FinancialDataInfo | undefined {
    const allText = results.map(r => r.title + ' ' + (r.snippet ?? '')).join(' ');

    // 売上高の抽出（兆円、億円、百万円、ドル等）
    const revenueMatch = allText.match(/売上[高額]?\s*[:：]?\s*([\d,.]+)\s*(兆|億|百万)?\s*円?/);
    const revenueMatchEn = allText.match(/revenue\s*[:：]?\s*\$?([\d,.]+)\s*(trillion|billion|million)?/i);
    
    // 従業員数の抽出
    const employeesMatch = allText.match(/従業員[数]?\s*[:：]?\s*([\d,]+)\s*人?/);
    const employeesMatchEn = allText.match(/employees\s*[:：]?\s*([\d,]+)/i);

    let revenue: string | undefined;
    let employees: number | undefined;

    if (revenueMatch) {
      revenue = `${revenueMatch[1]}${revenueMatch[2] ?? ''}円`;
    } else if (revenueMatchEn) {
      revenue = `$${revenueMatchEn[1]}${revenueMatchEn[2] ? ' ' + revenueMatchEn[2] : ''}`;
    }

    if (employeesMatch) {
      employees = parseInt(employeesMatch[1].replace(/,/g, ''), 10);
    } else if (employeesMatchEn) {
      employees = parseInt(employeesMatchEn[1].replace(/,/g, ''), 10);
    }

    if (!revenue && !employees) return undefined;

    return {
      revenue,
      employees,
      source: 'Web検索結果',
      updatedAt: new Date().toISOString().split('T')[0],
    };
  }

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
