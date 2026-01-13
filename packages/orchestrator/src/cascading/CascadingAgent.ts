/**
 * KATASHIRO v1.4.0 - Cascading Agent
 *
 * カスケード型リサーチのエージェント
 * 各エージェントは特定の役割（official/news/analysis/academic/community）を持ち、
 * 前ステップの結果を参照しながら調査を実行する
 */

import type {
  AgentRole,
  CascadingAgentReport,
  CascadingAgentStrategy,
  CascadingSource,
  Finding,
  FindingCategory,
  StepContext,
  StepFocus,
} from './types.js';
import { generateFindingId, getAgentRoleLabel, getStepFocusLabel } from './types.js';

/**
 * 依存性注入用インターフェース: 検索クライアント
 */
export interface ISearchClient {
  search(query: string, options?: { maxResults?: number }): Promise<Array<{ url: string; title: string; snippet?: string }>>;
}

/**
 * 依存性注入用インターフェース: Webスクレイパー
 */
export interface IScraper {
  scrape(url: string): Promise<{ ok: true; value: { content: string; title: string } } | { ok: false; error: Error }>;
}

/**
 * 依存性注入用インターフェース: テキスト分析
 */
export interface ITextAnalyzer {
  analyze(text: string): Promise<{ keywords: string[]; sentiment?: string }>;
}

/**
 * 依存性注入用インターフェース: エンティティ抽出
 */
export interface IEntityExtractor {
  extract(text: string): Promise<{ persons: string[]; organizations: string[]; all: Array<{ text: string; type: string }> }>;
}

/**
 * CascadingAgentの依存性
 */
export interface CascadingAgentDependencies {
  searchClient: ISearchClient;
  scraper: IScraper;
  textAnalyzer?: ITextAnalyzer;
  entityExtractor?: IEntityExtractor;
}

/**
 * CascadingAgentの設定
 */
export interface CascadingAgentConfig {
  /** エージェントID */
  id: string;
  /** エージェントの役割 */
  role: AgentRole;
  /** エージェント戦略 */
  strategy: CascadingAgentStrategy;
  /** タイムアウト (ms) */
  timeoutMs: number;
  /** 最大リトライ回数 */
  maxRetries: number;
  /** 最大検索結果数 */
  maxResults: number;
}

/**
 * カスケードエージェント
 */
export class CascadingAgent {
  private readonly config: CascadingAgentConfig;
  private readonly deps: CascadingAgentDependencies;

  constructor(config: CascadingAgentConfig, deps: CascadingAgentDependencies) {
    this.config = config;
    this.deps = deps;
  }

  /**
   * エージェントIDを取得
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * エージェントの役割を取得
   */
  get role(): AgentRole {
    return this.config.role;
  }

  /**
   * リサーチを実行
   */
  async research(context: StepContext): Promise<CascadingAgentReport> {
    const startTime = Date.now();

    try {
      // 1. 検索クエリを構築
      const query = this.buildQuery(context);

      // 2. 検索実行
      const searchResults = await this.executeSearch(query);

      // 3. コンテンツ取得
      const contents = await this.scrapeContents(searchResults);

      // 4. 発見事項を抽出
      const findings = await this.extractFindings(contents, context);

      // 5. ギャップを分析
      const gaps = this.analyzeGaps(context, findings);

      // 6. レポートを生成
      const report = this.generateReport(context, findings, contents, gaps);

      return {
        ...report,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // エラー時はエラーレポートを返す
      return {
        agentId: this.config.id,
        role: this.config.role,
        stepNumber: context.stepNumber,
        content: '',
        findings: [],
        sources: [],
        gaps: [],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 検索クエリを構築
   */
  private buildQuery(context: StepContext): string {
    const parts: string[] = [context.topic];

    // ステップの検索修飾子を追加
    if (context.queryModifiers.length > 0 && context.queryModifiers[0]) {
      parts.push(context.queryModifiers[0]);
    }

    // エージェント固有の修飾子を追加
    if (this.config.strategy.queryModifiers.length > 0 && this.config.strategy.queryModifiers[0]) {
      parts.push(this.config.strategy.queryModifiers[0]);
    }

    // 前ステップの結果に基づいて追加のコンテキストを付与
    if (context.stepNumber > 1 && context.previousStepResult) {
      // ギャップがあれば、それに関連する検索を行う
      if (context.identifiedGaps.length > 0 && context.stepFocus === 'gap' && context.identifiedGaps[0]) {
        parts.push(context.identifiedGaps[0]);
      }

      // 重要エンティティがあれば追加
      if (context.keyEntities.length > 0 && context.stepFocus === 'detail' && context.keyEntities[0]) {
        parts.push(context.keyEntities[0]);
      }

      // 未解決の疑問があれば追加
      if (context.unresolvedQuestions.length > 0 && context.stepFocus === 'verify' && context.unresolvedQuestions[0]) {
        parts.push(context.unresolvedQuestions[0]);
      }
    }

    return parts.join(' ');
  }

  /**
   * 検索を実行
   */
  private async executeSearch(query: string): Promise<Array<{ url: string; title: string; snippet?: string }>> {
    try {
      const results = await this.deps.searchClient.search(query, {
        maxResults: this.config.maxResults,
      });
      return results;
    } catch {
      return [];
    }
  }

  /**
   * コンテンツをスクレイピング
   */
  private async scrapeContents(
    searchResults: Array<{ url: string; title: string; snippet?: string }>
  ): Promise<Array<{ url: string; title: string; content: string; credibility: number }>> {
    const contents: Array<{ url: string; title: string; content: string; credibility: number }> = [];

    // 上位5件のみスクレイピング
    const targets = searchResults.slice(0, 5);

    for (const result of targets) {
      try {
        const scraped = await this.deps.scraper.scrape(result.url);
        if (scraped.ok) {
          contents.push({
            url: result.url,
            title: scraped.value.title || result.title,
            content: scraped.value.content,
            credibility: this.estimateCredibility(result.url),
          });
        }
      } catch {
        // スクレイピング失敗は無視して続行
      }
    }

    return contents;
  }

  /**
   * URLから信頼度を推定
   */
  private estimateCredibility(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      // 公式・政府系
      if (domain.endsWith('.go.jp') || domain.endsWith('.gov')) {
        return 0.95;
      }
      // 教育機関
      if (domain.endsWith('.ac.jp') || domain.endsWith('.edu')) {
        return 0.9;
      }
      // 大手メディア
      const majorMedia = ['nikkei.com', 'asahi.com', 'yomiuri.co.jp', 'reuters.com', 'bbc.com'];
      if (majorMedia.some(m => domain.includes(m))) {
        return 0.85;
      }
      // Wikipedia
      if (domain.includes('wikipedia.org')) {
        return 0.75;
      }
      // その他
      return 0.6;
    } catch {
      return 0.5;
    }
  }

  /**
   * 発見事項を抽出
   */
  private async extractFindings(
    contents: Array<{ url: string; title: string; content: string; credibility: number }>,
    context: StepContext
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const content of contents) {
      // コンテンツから発見事項を抽出
      const extractedFindings = this.extractFindingsFromContent(content, context);
      findings.push(...extractedFindings);
    }

    return findings;
  }

  /**
   * コンテンツから発見事項を抽出
   */
  private extractFindingsFromContent(
    content: { url: string; title: string; content: string; credibility: number },
    context: StepContext
  ): Finding[] {
    const findings: Finding[] = [];

    // コンテンツを段落に分割
    const paragraphs = content.content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 50 && p.length < 1000);

    // トピックに関連する段落を抽出（最大3つ）
    const topicLower = context.topic.toLowerCase();
    const relevantParagraphs = paragraphs
      .filter(p => p.toLowerCase().includes(topicLower) || this.isRelevant(p, context))
      .slice(0, 3);

    for (const paragraph of relevantParagraphs) {
      const category = this.categorizeContent(paragraph);
      const source: CascadingSource = {
        url: content.url,
        title: content.title,
        fetchedAt: new Date().toISOString(),
        credibility: content.credibility,
        domain: this.extractDomain(content.url),
      };

      findings.push({
        id: generateFindingId(context.stepNumber, this.config.id),
        content: paragraph,
        source,
        confidence: content.credibility * 0.8 + 0.2 * (category === 'fact' ? 1 : 0.7),
        stepNumber: context.stepNumber,
        agentId: this.config.id,
        category,
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }

  /**
   * コンテンツがトピックに関連しているか判定
   */
  private isRelevant(text: string, context: StepContext): boolean {
    const textLower = text.toLowerCase();

    // キーエンティティとの一致
    if (context.keyEntities.some(e => textLower.includes(e.toLowerCase()))) {
      return true;
    }

    // ステップフォーカスに関連するキーワード
    const focusKeywords: Record<StepFocus, string[]> = {
      overview: ['概要', '基本', '特徴', '背景'],
      detail: ['仕組み', '方法', '技術', 'プロセス'],
      gap: ['課題', '問題', '懸念', '批判'],
      verify: ['実績', '事例', '証拠', '評価'],
      integrate: ['結論', 'まとめ', '展望', '将来'],
    };

    return focusKeywords[context.stepFocus].some(k => textLower.includes(k));
  }

  /**
   * コンテンツをカテゴリ分類
   */
  private categorizeContent(text: string): FindingCategory {
    // 事実を示すパターン
    if (/\d+年|\d+%|発表した|報告された|調査によると/.test(text)) {
      return 'fact';
    }

    // 質問パターン
    if (/\?|疑問|不明/.test(text)) {
      return 'question';
    }

    // 分析パターン
    if (/分析|考察|推測|可能性/.test(text)) {
      return 'analysis';
    }

    // 意見パターン
    if (/思う|考える|べき|だろう/.test(text)) {
      return 'opinion';
    }

    return 'fact';
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * ギャップを分析
   */
  private analyzeGaps(context: StepContext, findings: Finding[]): string[] {
    const gaps: string[] = [];

    // 前ステップで特定されたギャップのうち、まだ解決されていないものを確認
    if (context.identifiedGaps.length > 0) {
      for (const gap of context.identifiedGaps) {
        const gapLower = gap.toLowerCase();
        const addressed = findings.some(f => f.content.toLowerCase().includes(gapLower));
        if (!addressed) {
          // まだ解決されていないギャップ
        }
      }
    }

    // 新たなギャップを発見
    // 例: 質問カテゴリの発見事項からギャップを抽出
    const questions = findings.filter(f => f.category === 'question');
    for (const q of questions) {
      if (q.content.length < 200) {
        gaps.push(q.content);
      }
    }

    // エージェントの役割に応じたギャップ検出
    if (this.config.role === 'official' && findings.length === 0) {
      gaps.push(`${context.topic}に関する公式情報が不足`);
    }
    if (this.config.role === 'academic' && findings.length === 0) {
      gaps.push(`${context.topic}に関する学術的な裏付けが不足`);
    }

    return gaps.slice(0, 3); // 最大3つのギャップ
  }

  /**
   * レポートを生成
   */
  private generateReport(
    context: StepContext,
    findings: Finding[],
    contents: Array<{ url: string; title: string; content: string; credibility: number }>,
    gaps: string[]
  ): Omit<CascadingAgentReport, 'durationMs' | 'timestamp'> {
    const roleLabel = getAgentRoleLabel(this.config.role);
    const focusLabel = getStepFocusLabel(context.stepFocus);

    // ソースを作成
    const sources: CascadingSource[] = contents.map(c => ({
      url: c.url,
      title: c.title,
      fetchedAt: new Date().toISOString(),
      credibility: c.credibility,
      domain: this.extractDomain(c.url),
    }));

    // レポート本文を生成
    let reportContent = `## ${roleLabel}エージェントレポート (Step ${context.stepNumber}: ${focusLabel})\n\n`;

    if (findings.length > 0) {
      reportContent += `### 主な発見事項\n\n`;
      for (const finding of findings.slice(0, 5)) {
        reportContent += `- ${finding.content.slice(0, 200)}...\n`;
        reportContent += `  - ソース: ${finding.source.title}\n`;
        reportContent += `  - 信頼度: ${(finding.confidence * 100).toFixed(0)}%\n\n`;
      }
    } else {
      reportContent += `このステップでは${roleLabel}に関する新しい発見事項はありませんでした。\n\n`;
    }

    if (gaps.length > 0) {
      reportContent += `### 特定されたギャップ\n\n`;
      for (const gap of gaps) {
        reportContent += `- ${gap}\n`;
      }
    }

    return {
      agentId: this.config.id,
      role: this.config.role,
      stepNumber: context.stepNumber,
      content: reportContent,
      findings,
      sources,
      gaps,
    };
  }
}

/**
 * エージェントファクトリー
 */
export function createCascadingAgents(
  strategies: CascadingAgentStrategy[],
  deps: CascadingAgentDependencies,
  options: { timeoutMs: number; maxRetries: number; maxResults: number }
): CascadingAgent[] {
  return strategies.map((strategy, index) => {
    const config: CascadingAgentConfig = {
      id: `agent-${strategy.role}-${index + 1}`,
      role: strategy.role,
      strategy,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      maxResults: options.maxResults,
    };
    return new CascadingAgent(config, deps);
  });
}
