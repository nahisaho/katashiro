/**
 * Competitor Analyzer
 * 
 * 複数企業の競合比較分析を行い、Markdown形式の比較表を生成します。
 * 
 * @requirement REQ-EXT-CMP-001 競合比較表生成
 * @requirement REQ-EXT-CMP-002 競合情報自動収集
 * @requirement REQ-EXT-CMP-003 差別化ポイント抽出
 * @requirement REQ-EXT-CMP-004 継続モニタリング
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
 * 差別化ポイント
 * @requirement REQ-EXT-CMP-003
 * @since 1.0.0
 */
export interface DifferentiationPoint {
  /** ポイントID */
  readonly id: string;
  /** カテゴリ */
  readonly category: DifferentiationCategory;
  /** 自社の特徴 */
  readonly ownFeature: string;
  /** 競合との違い */
  readonly competitorDifference: string;
  /** 影響度 (1-5) */
  readonly impact: number;
  /** 持続可能性 (1-5) */
  readonly sustainability: number;
  /** 推奨アクション */
  readonly recommendedAction?: string;
}

/**
 * 差別化カテゴリ
 */
export type DifferentiationCategory =
  | 'product'        // 製品・サービス
  | 'technology'     // 技術
  | 'price'          // 価格
  | 'brand'          // ブランド
  | 'channel'        // 販売チャネル
  | 'customer'       // 顧客層
  | 'operations'     // オペレーション
  | 'talent'         // 人材
  | 'other';         // その他

/**
 * 差別化分析結果
 * @requirement REQ-EXT-CMP-003
 * @since 1.0.0
 */
export interface DifferentiationAnalysisResult {
  /** 対象企業 */
  readonly targetCompany: string;
  /** 比較対象の競合企業 */
  readonly competitors: string[];
  /** 差別化ポイント */
  readonly differentiators: DifferentiationPoint[];
  /** 強みのハイライト */
  readonly strengthHighlights: string[];
  /** 弱みのハイライト */
  readonly weaknessHighlights: string[];
  /** 総合的な競争優位性スコア (0-100) */
  readonly competitiveAdvantageScore: number;
  /** レポート生成日時 */
  readonly analyzedAt: string;
}

/**
 * モニタリング設定
 * @requirement REQ-EXT-CMP-004
 * @since 1.0.0
 */
export interface MonitoringConfig {
  /** モニタリング対象の競合企業 */
  readonly competitors: string[];
  /** モニタリング間隔（分） */
  readonly intervalMinutes: number;
  /** アラート設定 */
  readonly alerts?: MonitoringAlertConfig;
  /** 収集オプション */
  readonly collectionOptions?: CompetitorIntelligenceOptions;
  /** 有効かどうか */
  readonly enabled: boolean;
}

/**
 * モニタリングアラート設定
 */
export interface MonitoringAlertConfig {
  /** プレスリリース検出時にアラート */
  readonly onPressRelease?: boolean;
  /** ネガティブニュース検出時にアラート */
  readonly onNegativeNews?: boolean;
  /** 特定キーワード検出時にアラート */
  readonly keywords?: string[];
}

/**
 * モニタリングセッション
 * @requirement REQ-EXT-CMP-004
 * @since 1.0.0
 */
export interface MonitoringSession {
  /** セッションID */
  readonly id: string;
  /** 設定 */
  readonly config: MonitoringConfig;
  /** 開始日時 */
  readonly startedAt: Date;
  /** 最終更新日時 */
  readonly lastUpdatedAt?: Date;
  /** 収集履歴 */
  readonly history: MonitoringUpdate[];
  /** ステータス */
  readonly status: 'active' | 'paused' | 'stopped';
}

/**
 * モニタリング更新
 */
export interface MonitoringUpdate {
  /** 更新日時 */
  readonly timestamp: Date;
  /** 更新された企業 */
  readonly company: string;
  /** 検出されたプレスリリース */
  readonly newPressReleases: PressReleaseInfo[];
  /** 検出されたニュース */
  readonly newNews: NewsArticleInfo[];
  /** アラートがトリガーされたか */
  readonly alertTriggered: boolean;
  /** アラート理由 */
  readonly alertReason?: string;
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
      daysBack: _daysBack = 30,
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
          date: this.extractDateFromText(result.snippet ?? result.title) ?? new Date().toISOString().split('T')[0] ?? '2024-01-01',
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
          date: this.extractDateFromText(result.snippet ?? result.title) ?? new Date().toISOString().split('T')[0] ?? '2024-01-01',
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
      return `${y}-${(m ?? '01').padStart(2, '0')}-${(d ?? '01').padStart(2, '0')}`;
    }

    // 日本語形式（2024年1月15日）
    const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jpMatch) {
      const [, y, m, d] = jpMatch;
      return `${y}-${(m ?? '01').padStart(2, '0')}-${(d ?? '01').padStart(2, '0')}`;
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
    _companyName: string
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

    if (employeesMatch && employeesMatch[1]) {
      employees = parseInt(employeesMatch[1].replace(/,/g, ''), 10);
    } else if (employeesMatchEn && employeesMatchEn[1]) {
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

  /**
   * 差別化ポイントを抽出
   * @requirement REQ-EXT-CMP-003
   * @description 対象企業と競合との主要な差別化要素を特定しハイライト
   * @since 1.0.0
   */
  extractDifferentiators(
    target: CompetitorData,
    competitors: CompetitorData[],
    options?: {
      dimensions?: (string | ComparisonDimension)[];
      minImpact?: number;
    }
  ): DifferentiationAnalysisResult {
    const differentiators: DifferentiationPoint[] = [];
    const strengthHighlights: string[] = [];
    const weaknessHighlights: string[] = [];
    let advantagePoints = 0;
    let disadvantagePoints = 0;

    // 使用するディメンションを正規化
    const dims = (options?.dimensions ?? Object.keys(target).filter(k => k !== 'name'))
      .map(d => this.normalizeDimensions([d])[0])
      .filter((d): d is NonNullable<typeof d> => d !== undefined);

    let pointId = 1;

    for (const dim of dims) {
      const targetValue = target[dim.key];
      
      // 数値比較可能な場合
      if (typeof targetValue === 'number') {
        const competitorValues = competitors.map(c => ({
          name: c.name,
          value: c[dim.key] as number,
        })).filter(c => typeof c.value === 'number');

        if (competitorValues.length === 0) continue;

        const avgCompetitor = competitorValues.reduce((sum, c) => sum + c.value, 0) / competitorValues.length;
        const diff = ((targetValue - avgCompetitor) / avgCompetitor * 100);
        
        // 差異が10%以上の場合は差別化ポイント
        if (Math.abs(diff) >= 10) {
          const isAdvantage = dim.higherIsBetter !== false ? diff > 0 : diff < 0;
          const impact = Math.min(5, Math.ceil(Math.abs(diff) / 20));
          
          differentiators.push({
            id: `diff-${pointId++}`,
            category: this.inferCategory(dim.key),
            ownFeature: `${dim.label}: ${this.formatValue(targetValue, dim)}`,
            competitorDifference: `競合平均より${Math.abs(diff).toFixed(1)}%${diff > 0 ? '高い' : '低い'}`,
            impact,
            sustainability: this.estimateSustainability(dim.key, impact),
            recommendedAction: this.generateRecommendation(dim.key, isAdvantage, diff),
          });

          if (isAdvantage) {
            advantagePoints += impact;
            strengthHighlights.push(`${dim.label}で競合をリード（${Math.abs(diff).toFixed(1)}%差）`);
          } else {
            disadvantagePoints += impact;
            weaknessHighlights.push(`${dim.label}で競合に後れ（${Math.abs(diff).toFixed(1)}%差）`);
          }
        }
      } else if (typeof targetValue === 'string' && targetValue) {
        // 文字列の比較（存在有無）
        const competitorsWithFeature = competitors.filter(c => c[dim.key] && c[dim.key] !== '');
        const hasUniqueFeature = competitorsWithFeature.length === 0;

        if (hasUniqueFeature) {
          differentiators.push({
            id: `diff-${pointId++}`,
            category: this.inferCategory(dim.key),
            ownFeature: `${dim.label}: ${targetValue}`,
            competitorDifference: '競合には見られない独自の特徴',
            impact: 4,
            sustainability: 3,
            recommendedAction: 'この独自性を強調してマーケティングに活用',
          });
          advantagePoints += 4;
          strengthHighlights.push(`${dim.label}に独自の強み`);
        }
      }
    }

    // 競争優位性スコアを計算
    const totalPoints = advantagePoints + disadvantagePoints;
    const competitiveAdvantageScore = totalPoints > 0
      ? Math.round((advantagePoints / totalPoints) * 100)
      : 50;

    // 影響度でソート
    differentiators.sort((a, b) => b.impact - a.impact);

    return {
      targetCompany: target.name,
      competitors: competitors.map(c => c.name),
      differentiators,
      strengthHighlights: strengthHighlights.slice(0, 5),
      weaknessHighlights: weaknessHighlights.slice(0, 5),
      competitiveAdvantageScore,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * 差別化分析をMarkdownレポートに変換
   * @requirement REQ-EXT-CMP-003
   * @since 1.0.0
   */
  formatDifferentiationReport(result: DifferentiationAnalysisResult): string {
    let report = `# ${result.targetCompany} 差別化分析レポート\n\n`;
    report += `**分析日時**: ${result.analyzedAt}\n`;
    report += `**比較対象**: ${result.competitors.join(', ')}\n`;
    report += `**競争優位性スコア**: ${result.competitiveAdvantageScore}/100\n\n`;

    // 強みのハイライト
    if (result.strengthHighlights.length > 0) {
      report += `## 💪 強みのハイライト\n\n`;
      for (const strength of result.strengthHighlights) {
        report += `- ${strength}\n`;
      }
      report += '\n';
    }

    // 弱みのハイライト
    if (result.weaknessHighlights.length > 0) {
      report += `## ⚠️ 改善が必要な領域\n\n`;
      for (const weakness of result.weaknessHighlights) {
        report += `- ${weakness}\n`;
      }
      report += '\n';
    }

    // 差別化ポイント詳細
    if (result.differentiators.length > 0) {
      report += `## 📊 差別化ポイント詳細\n\n`;
      
      for (const diff of result.differentiators) {
        const impactStars = '★'.repeat(diff.impact) + '☆'.repeat(5 - diff.impact);
        report += `### ${diff.category.toUpperCase()}: ${diff.ownFeature}\n`;
        report += `- **競合との違い**: ${diff.competitorDifference}\n`;
        report += `- **影響度**: ${impactStars}\n`;
        report += `- **持続可能性**: ${'●'.repeat(diff.sustainability)}${'○'.repeat(5 - diff.sustainability)}\n`;
        if (diff.recommendedAction) {
          report += `- **推奨アクション**: ${diff.recommendedAction}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  /**
   * カテゴリを推測
   */
  private inferCategory(key: string): DifferentiationCategory {
    const lowerKey = key.toLowerCase();
    if (/product|製品|service|サービス/.test(lowerKey)) return 'product';
    if (/tech|技術|patent|特許/.test(lowerKey)) return 'technology';
    if (/price|価格|cost|コスト/.test(lowerKey)) return 'price';
    if (/brand|ブランド|認知/.test(lowerKey)) return 'brand';
    if (/channel|販売|流通|店舗/.test(lowerKey)) return 'channel';
    if (/customer|顧客|ユーザー/.test(lowerKey)) return 'customer';
    if (/operation|オペ|効率/.test(lowerKey)) return 'operations';
    if (/talent|人材|employee|従業員/.test(lowerKey)) return 'talent';
    return 'other';
  }

  /**
   * 持続可能性を推定
   */
  private estimateSustainability(key: string, impact: number): number {
    // 技術やブランド関連は持続性が高い
    const category = this.inferCategory(key);
    if (category === 'technology' || category === 'brand') return Math.min(5, impact + 1);
    if (category === 'price') return Math.max(1, impact - 1); // 価格は持続性が低い
    return Math.min(5, Math.max(1, Math.round(impact * 0.8)));
  }

  /**
   * 推奨アクションを生成
   */
  private generateRecommendation(key: string, isAdvantage: boolean, diffPercent: number): string {
    const category = this.inferCategory(key);
    
    if (isAdvantage) {
      switch (category) {
        case 'technology': return 'この技術的優位性を特許やノウハウで保護することを検討';
        case 'brand': return 'ブランド価値を活かしたマーケティング強化を検討';
        case 'price': return '価格競争力を維持しつつ、付加価値向上も検討';
        default: return 'この強みを積極的にアピールし、市場でのポジションを強化';
      }
    } else {
      switch (category) {
        case 'technology': return '技術投資またはパートナーシップによる強化を検討';
        case 'brand': return 'ブランディング戦略の見直しを検討';
        case 'price': return 'コスト構造の見直しまたは差別化による価値訴求を検討';
        default: return `この領域の${Math.abs(diffPercent).toFixed(0)}%ギャップを埋める施策を検討`;
      }
    }
  }

  // ===================
  // モニタリング機能 (REQ-EXT-CMP-004)
  // ===================
  
  private monitoringSessions: Map<string, MonitoringSession> = new Map();
  private monitoringIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * 継続モニタリングを開始
   * @requirement REQ-EXT-CMP-004
   * @description 競合企業のアナウンスメントを追跡し、分析を定期的に更新
   * @since 1.0.0
   */
  startMonitoring(config: MonitoringConfig): MonitoringSession {
    const sessionId = `mon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const session: MonitoringSession = {
      id: sessionId,
      config,
      startedAt: new Date(),
      history: [],
      status: 'active',
    };

    this.monitoringSessions.set(sessionId, session);

    if (config.enabled) {
      // 定期実行を設定
      const intervalId = setInterval(
        () => this.runMonitoringUpdate(sessionId),
        config.intervalMinutes * 60 * 1000
      );
      this.monitoringIntervals.set(sessionId, intervalId);

      // 初回実行
      this.runMonitoringUpdate(sessionId).catch(console.error);
    }

    return session;
  }

  /**
   * モニタリングを停止
   * @requirement REQ-EXT-CMP-004
   * @since 1.0.0
   */
  stopMonitoring(sessionId: string): boolean {
    const session = this.monitoringSessions.get(sessionId);
    if (!session) return false;

    // インターバルをクリア
    const intervalId = this.monitoringIntervals.get(sessionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(sessionId);
    }

    // セッションステータスを更新
    const updatedSession: MonitoringSession = {
      ...session,
      status: 'stopped',
    };
    this.monitoringSessions.set(sessionId, updatedSession);

    return true;
  }

  /**
   * モニタリングを一時停止
   * @requirement REQ-EXT-CMP-004
   * @since 1.0.0
   */
  pauseMonitoring(sessionId: string): boolean {
    const session = this.monitoringSessions.get(sessionId);
    if (!session || session.status !== 'active') return false;

    // インターバルをクリア
    const intervalId = this.monitoringIntervals.get(sessionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(sessionId);
    }

    // セッションステータスを更新
    const updatedSession: MonitoringSession = {
      ...session,
      status: 'paused',
    };
    this.monitoringSessions.set(sessionId, updatedSession);

    return true;
  }

  /**
   * モニタリングを再開
   * @requirement REQ-EXT-CMP-004
   * @since 1.0.0
   */
  resumeMonitoring(sessionId: string): boolean {
    const session = this.monitoringSessions.get(sessionId);
    if (!session || session.status !== 'paused') return false;

    // インターバルを再設定
    const intervalId = setInterval(
      () => this.runMonitoringUpdate(sessionId),
      session.config.intervalMinutes * 60 * 1000
    );
    this.monitoringIntervals.set(sessionId, intervalId);

    // セッションステータスを更新
    const updatedSession: MonitoringSession = {
      ...session,
      status: 'active',
    };
    this.monitoringSessions.set(sessionId, updatedSession);

    // 即時実行
    this.runMonitoringUpdate(sessionId).catch(console.error);

    return true;
  }

  /**
   * モニタリングセッションを取得
   * @requirement REQ-EXT-CMP-004
   * @since 1.0.0
   */
  getMonitoringSession(sessionId: string): MonitoringSession | undefined {
    return this.monitoringSessions.get(sessionId);
  }

  /**
   * 全モニタリングセッションを取得
   * @requirement REQ-EXT-CMP-004
   * @since 1.0.0
   */
  getAllMonitoringSessions(): MonitoringSession[] {
    return Array.from(this.monitoringSessions.values());
  }

  /**
   * モニタリング更新を実行（内部）
   */
  private async runMonitoringUpdate(sessionId: string): Promise<void> {
    const session = this.monitoringSessions.get(sessionId);
    if (!session || session.status !== 'active') return;

    const previousHistory = session.history;
    const newHistory: MonitoringUpdate[] = [...previousHistory];

    for (const company of session.config.competitors) {
      try {
        const intel = await this.collectCompetitorIntelligence(
          company,
          session.config.collectionOptions
        );

        // 前回との差分を検出
        const previousUpdate = previousHistory
          .filter(h => h.company === company)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        const newPressReleases = this.findNewPressReleases(
          intel.pressReleases,
          previousUpdate?.newPressReleases ?? []
        );
        const newNews = this.findNewNewsArticles(
          intel.newsArticles,
          previousUpdate?.newNews ?? []
        );

        // アラートチェック
        let alertTriggered = false;
        let alertReason: string | undefined;

        if (session.config.alerts) {
          if (session.config.alerts.onPressRelease && newPressReleases.length > 0) {
            alertTriggered = true;
            alertReason = `新規プレスリリース: ${newPressReleases[0]?.title ?? 'Unknown'}`;
          }

          if (session.config.alerts.onNegativeNews) {
            const negativeNews = newNews.filter(n => n.sentiment === 'negative');
            if (negativeNews.length > 0) {
              alertTriggered = true;
              alertReason = `ネガティブニュース検出: ${negativeNews[0]?.title ?? 'Unknown'}`;
            }
          }

          if (session.config.alerts.keywords && session.config.alerts.keywords.length > 0) {
            const allText = [
              ...newPressReleases.map(pr => pr.title),
              ...newNews.map(n => n.title),
            ].join(' ').toLowerCase();

            for (const keyword of session.config.alerts.keywords) {
              if (allText.includes(keyword.toLowerCase())) {
                alertTriggered = true;
                alertReason = `キーワード「${keyword}」を検出`;
                break;
              }
            }
          }
        }

        // 更新を追加
        if (newPressReleases.length > 0 || newNews.length > 0) {
          newHistory.push({
            timestamp: new Date(),
            company,
            newPressReleases,
            newNews,
            alertTriggered,
            alertReason,
          });
        }
      } catch (error) {
        console.error(`Monitoring update failed for ${company}:`, error);
      }
    }

    // セッションを更新
    const updatedSession: MonitoringSession = {
      ...session,
      lastUpdatedAt: new Date(),
      history: newHistory.slice(-100), // 最新100件を保持
    };
    this.monitoringSessions.set(sessionId, updatedSession);
  }

  /**
   * 新しいプレスリリースを検出
   */
  private findNewPressReleases(
    current: PressReleaseInfo[],
    previous: PressReleaseInfo[]
  ): PressReleaseInfo[] {
    const previousTitles = new Set(previous.map(p => p.title));
    return current.filter(c => !previousTitles.has(c.title));
  }

  /**
   * 新しいニュース記事を検出
   */
  private findNewNewsArticles(
    current: NewsArticleInfo[],
    previous: NewsArticleInfo[]
  ): NewsArticleInfo[] {
    const previousTitles = new Set(previous.map(p => p.title));
    return current.filter(c => !previousTitles.has(c.title));
  }
}
