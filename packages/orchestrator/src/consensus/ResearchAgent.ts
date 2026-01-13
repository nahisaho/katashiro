/**
 * KATASHIRO v1.2.0 - ResearchAgent
 * リサーチパイプラインを実行するエージェント
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.2.0
 */

import {
  AgentReport,
  AgentStrategy,
  IterationContext,
  SourceReference,
  DEFAULT_AGENT_STRATEGIES,
} from './types';

// 既存KATASHIROモジュールの型（実装時にインポート）
interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
}

interface ScrapedContent {
  url: string;
  title?: string;
  content: string;
}

interface TextAnalysis {
  keywords: string[];
  complexity: number;
  sentiment?: { score: number; label: string };
}

interface ExtractedEntities {
  persons: string[];
  organizations: string[];
  locations: string[];
  all: Array<{ text: string; type: string }>;
}

/**
 * 依存性注入用インターフェース
 */
export interface ResearchAgentDependencies {
  searchClient: {
    search: (query: string, options?: { maxResults?: number }) => Promise<SearchResult[]>;
  };
  scraper: {
    scrape: (url: string) => Promise<{ ok: true; value: ScrapedContent } | { ok: false; error: Error }>;
  };
  analyzer: {
    analyze: (text: string) => Promise<TextAnalysis>;
  };
  extractor: {
    extract: (text: string) => Promise<ExtractedEntities>;
  };
  reportGenerator: {
    generate: (config: {
      title: string;
      sections: Array<{ heading: string; content: string }>;
      format: string;
    }) => Promise<string>;
  };
}

/**
 * リサーチエージェント
 * @requirement REQ-1.2.0-AGT-001, REQ-1.2.0-AGT-002
 */
export class ResearchAgent {
  private readonly _agentId: number;
  private readonly _strategy: AgentStrategy;
  private readonly deps: ResearchAgentDependencies;

  /**
   * コンストラクタ
   * @param agentId エージェントID
   * @param strategy エージェント戦略
   * @param deps 依存性
   */
  constructor(
    agentId: number,
    deps: ResearchAgentDependencies,
    strategy?: AgentStrategy
  ) {
    this._agentId = agentId;
    const defaultStrategy = DEFAULT_AGENT_STRATEGIES[agentId - 1] ?? DEFAULT_AGENT_STRATEGIES[0];
    this._strategy = strategy ?? defaultStrategy!;
    this.deps = deps;
  }

  /**
   * エージェントIDを取得
   */
  get agentId(): number {
    return this._agentId;
  }

  /**
   * 戦略を取得
   */
  get strategy(): AgentStrategy {
    return this._strategy;
  }

  /**
   * リサーチパイプラインを実行
   * @requirement REQ-1.2.0-AGT-001
   * @param context イテレーションコンテキスト
   * @returns エージェントレポート
   */
  async execute(context: IterationContext): Promise<AgentReport> {
    const startTime = Date.now();
    const reportId = `report-${this._agentId}-${context.iteration}-${Date.now()}`;

    // 1. 検索クエリ構築（戦略に基づく）
    const query = this.buildSearchQuery(context.topic, context);

    // 2. 検索実行
    const searchResults = await this.search(query);

    // 3. スクレイピング（カバー済みソースを除外）
    const urlsToScrape = searchResults
      .map((r) => r.url)
      .filter((url) => !context.coveredSources.includes(url))
      .slice(0, this._strategy.maxResultsPerAgent || 5);

    const scrapedContents = await this.scrape(urlsToScrape);

    // 4. 分析
    const analysis = await this.analyze(scrapedContents);

    // 5. エンティティ抽出
    const entities = await this.extractEntities(scrapedContents);

    // 6. レポート生成
    const reportContent = await this.generateReport(
      context.topic,
      analysis,
      scrapedContents,
      entities,
      context
    );

    // 7. ソース参照情報を構築
    const sources: SourceReference[] = scrapedContents.map((c) => ({
      url: c.url,
      title: c.title || c.url,
      fetchedAt: new Date().toISOString(),
      reliabilityScore: this.estimateSourceReliability(c.url),
    }));

    return {
      agentId: this._agentId,
      reportId,
      content: reportContent,
      sources,
      strategy: this._strategy,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * エージェント戦略に基づいて検索クエリを構築
   * @requirement REQ-1.2.0-AGT-002
   */
  private buildSearchQuery(topic: string, context: IterationContext): string {
    const modifiers = this._strategy.queryModifiers;

    // 初回イテレーションは広範な検索
    if (context.isInitial) {
      return `${topic} ${modifiers.join(' ')}`;
    }

    // 2回目以降は深掘りエリアにフォーカス
    const focusArea =
      context.areasToDeepen[this._agentId % context.areasToDeepen.length] || '';
    return `${topic} ${focusArea} ${modifiers.join(' ')}`;
  }

  /**
   * 検索を実行
   */
  private async search(query: string): Promise<SearchResult[]> {
    try {
      return await this.deps.searchClient.search(query, {
        maxResults: this._strategy.maxResultsPerAgent,
      });
    } catch (error) {
      console.error(`Search failed for agent ${this._agentId}:`, error);
      return [];
    }
  }

  /**
   * URLリストをスクレイピング
   */
  private async scrape(urls: string[]): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];

    for (const url of urls) {
      try {
        const result = await this.deps.scraper.scrape(url);
        if (result.ok) {
          results.push(result.value);
        }
      } catch (error) {
        console.error(`Scrape failed for ${url}:`, error);
      }
    }

    return results;
  }

  /**
   * コンテンツを分析
   */
  private async analyze(contents: ScrapedContent[]): Promise<TextAnalysis[]> {
    const analyses: TextAnalysis[] = [];

    for (const content of contents) {
      try {
        const analysis = await this.deps.analyzer.analyze(content.content);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Analysis failed:`, error);
      }
    }

    return analyses;
  }

  /**
   * エンティティを抽出
   */
  private async extractEntities(contents: ScrapedContent[]): Promise<ExtractedEntities> {
    const combinedText = contents.map((c) => c.content).join('\n\n');
    try {
      return await this.deps.extractor.extract(combinedText);
    } catch (error) {
      console.error(`Entity extraction failed:`, error);
      return { persons: [], organizations: [], locations: [], all: [] };
    }
  }

  /**
   * レポートを生成
   */
  private async generateReport(
    topic: string,
    analyses: TextAnalysis[],
    contents: ScrapedContent[],
    entities: ExtractedEntities,
    context: IterationContext
  ): Promise<string> {
    // キーワードを集約
    const allKeywords = Array.from(new Set(analyses.flatMap((a) => a.keywords)));

    // エンティティサマリー
    const entitySummary = [
      entities.persons.length > 0 ? `人物: ${entities.persons.slice(0, 5).join(', ')}` : '',
      entities.organizations.length > 0 ? `組織: ${entities.organizations.slice(0, 5).join(', ')}` : '',
      entities.locations.length > 0 ? `場所: ${entities.locations.slice(0, 5).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // 前回のコンセンサスがある場合は参照
    const previousContext = context.previousConsensus
      ? `\n\n## 前回の調査結果を踏まえて\n\n${context.unresolvedQuestions.map((q) => `- ${q}`).join('\n')}`
      : '';

    // コンテンツサマリー
    const contentSummary = contents
      .slice(0, 5)
      .map((c) => {
        const preview = c.content.slice(0, 500).replace(/\n+/g, ' ');
        return `### ${c.title || c.url}\n\n${preview}...`;
      })
      .join('\n\n');

    try {
      return await this.deps.reportGenerator.generate({
        title: `${topic} - Agent ${this._agentId} Report (Iteration ${context.iteration})`,
        sections: [
          {
            heading: '概要',
            content: `トピック「${topic}」に関する調査結果です。${contents.length}件のソースを分析しました。`,
          },
          {
            heading: '主要なキーワード',
            content: allKeywords.slice(0, 20).join(', ') || 'キーワードが抽出できませんでした',
          },
          {
            heading: '関連エンティティ',
            content: entitySummary || 'エンティティが抽出できませんでした',
          },
          {
            heading: '調査内容',
            content: contentSummary || '調査内容がありません',
          },
          ...(previousContext
            ? [{ heading: '深掘り事項', content: previousContext }]
            : []),
          {
            heading: '参照ソース',
            content:
              contents.map((c) => `- [${c.title || c.url}](${c.url})`).join('\n') ||
              '参照ソースがありません',
          },
        ],
        format: 'markdown',
      });
    } catch (error) {
      // フォールバック: 簡易レポート
      console.error(`Report generation failed:`, error);
      return `# ${topic} - Agent ${this._agentId} Report

## 概要
${contents.length}件のソースを分析しました。

## キーワード
${allKeywords.slice(0, 10).join(', ')}

## エンティティ
${entitySummary}

## ソース
${contents.map((c) => `- ${c.url}`).join('\n')}
`;
    }
  }

  /**
   * ソースURLから信頼性スコアを推定
   * @requirement REQ-1.2.0-WFL-002
   */
  private estimateSourceReliability(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      // 公式・政府系（高信頼）
      if (/\.gov(\.[a-z]{2})?$|\.go\.jp$/.test(domain)) return 0.95;

      // 学術系（高信頼）
      if (/\.edu(\.[a-z]{2})?$|\.ac\.jp$/.test(domain)) return 0.9;

      // 大手ニュースメディア（中〜高信頼）
      const trustedNews = [
        'reuters.com',
        'bloomberg.com',
        'nikkei.com',
        'nhk.or.jp',
        'bbc.com',
      ];
      if (trustedNews.some((d) => domain.includes(d))) return 0.85;

      // 公式企業サイト（中信頼）
      if (/\.co\.jp$|\.com$/.test(domain) && !domain.includes('blog')) return 0.7;

      // ブログ・個人サイト（低〜中信頼）
      if (/blog|note\.com|qiita\.com|zenn\.dev/.test(domain)) return 0.5;

      // その他（デフォルト）
      return 0.6;
    } catch {
      return 0.5;
    }
  }
}

/**
 * デフォルト依存性を作成するファクトリ
 * 実際のKATASHIROモジュールを使用
 */
export function createDefaultDependencies(): ResearchAgentDependencies {
  // 遅延インポートで依存性を解決
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebSearchClient, WebScraper } = require('@nahisaho/katashiro-collector');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextAnalyzer, EntityExtractor } = require('@nahisaho/katashiro-analyzer');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ReportGenerator } = require('@nahisaho/katashiro-generator');

  const searchClient = new WebSearchClient();
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  const extractor = new EntityExtractor();
  const reportGenerator = new ReportGenerator();

  return {
    searchClient: {
      search: (query, options) => searchClient.search(query, options),
    },
    scraper: {
      scrape: async (url) => {
        try {
          const result = await scraper.scrape(url);
          return { ok: true, value: result };
        } catch (error) {
          return { ok: false, error: error as Error };
        }
      },
    },
    analyzer: {
      analyze: (text) => analyzer.analyze(text),
    },
    extractor: {
      extract: (text) => extractor.extract(text),
    },
    reportGenerator: {
      generate: (config) => reportGenerator.generate(config),
    },
  };
}
