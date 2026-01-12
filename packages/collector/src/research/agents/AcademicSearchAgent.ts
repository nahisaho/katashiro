/**
 * AcademicSearchAgent - 学術論文検索エージェント
 *
 * arXiv、CrossRef、Semantic Scholarなどの学術APIを使用。
 * 現在はarXiv APIを実装。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type { ISearchAgent, AgentSearchQuery, AgentSearchResult } from './types.js';
import type { Finding, SourceType } from '../types.js';

/**
 * 学術論文検索エージェント
 *
 * @example
 * ```typescript
 * const agent = new AcademicSearchAgent();
 * const result = await agent.search({
 *   query: 'machine learning',
 *   maxResults: 10,
 *   timeout: 30000,
 * });
 * ```
 */
export class AcademicSearchAgent implements ISearchAgent {
  readonly type: SourceType = 'academic';
  readonly name = 'Academic Search (arXiv)';

  private readonly arxivApiUrl = 'http://export.arxiv.org/api/query';

  async search(query: AgentSearchQuery): Promise<AgentSearchResult> {
    const startTime = Date.now();

    try {
      const findings = await this.searchArxiv(query);

      return {
        findings,
        status: findings.length > 0 ? 'success' : 'partial',
        processingTime: Date.now() - startTime,
        metadata: {
          source: 'arxiv',
          totalFound: findings.length,
        },
      };
    } catch (error) {
      return {
        findings: [],
        status: 'failed',
        error: (error as Error).message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // arXiv APIは無料で利用可能
    return true;
  }

  /**
   * arXiv APIで検索
   */
  private async searchArxiv(query: AgentSearchQuery): Promise<Finding[]> {
    const searchQuery = encodeURIComponent(query.query);
    const url = `${this.arxivApiUrl}?search_query=all:${searchQuery}&start=0&max_results=${query.maxResults}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), query.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/atom+xml',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseArxivResponse(xmlText, query.query);
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('arXiv API request timed out');
      }
      throw error;
    }
  }

  /**
   * arXiv XMLレスポンスをパース
   */
  private parseArxivResponse(xml: string, originalQuery: string): Finding[] {
    const findings: Finding[] = [];

    // シンプルなXMLパース（正規表現ベース）
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let entryMatch: RegExpExecArray | null;
    let index = 0;

    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const entry = entryMatch[1] ?? '';

      const rawId = this.extractXmlTag(entry, 'id');
      const rawTitle = this.extractXmlTag(entry, 'title');
      const rawSummary = this.extractXmlTag(entry, 'summary');
      const published = this.extractXmlTag(entry, 'published');
      const authors = this.extractAuthors(entry);

      // 必須フィールドがない場合はスキップ
      if (!rawId || !rawTitle || !rawSummary) {
        continue;
      }

      const arxivIdValue = rawId;
      const titleValue = rawTitle.replace(/\s+/g, ' ').trim();
      const summaryValue = rawSummary.replace(/\s+/g, ' ').trim();

      // arXiv IDからURLを生成
      const arxivId = arxivIdValue.replace('http://arxiv.org/abs/', '');
      const url = `https://arxiv.org/abs/${arxivId}`;
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      findings.push({
        id: `academic-${Date.now()}-${index}`,
        title: titleValue,
        summary: summaryValue.length > 500 ? summaryValue.substring(0, 500) + '...' : summaryValue,
        url,
        sourceType: 'academic',
        sourceName: 'arXiv',
        relevanceScore: this.calculateRelevance(titleValue, summaryValue, originalQuery),
        credibilityScore: 0.85, // 学術論文は一般的に高信頼度
        publishedAt: published ? new Date(published) : undefined,
        author: authors,
        metadata: {
          arxivId,
          pdfUrl,
          category: this.extractCategory(entry),
        },
      });

      index++;
    }

    return findings;
  }

  /**
   * XMLタグの内容を抽出
   */
  private extractXmlTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = regex.exec(xml);
    return match ? match[1] : undefined;
  }

  /**
   * 著者を抽出
   */
  private extractAuthors(entry: string): string {
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    const authors: string[] = [];
    let authorMatch: RegExpExecArray | null;

    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      if (authorMatch[1]) {
        authors.push(authorMatch[1].trim());
      }
    }

    return authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : '');
  }

  /**
   * カテゴリを抽出
   */
  private extractCategory(entry: string): string | undefined {
    const categoryRegex = /<arxiv:primary_category[^>]*term="([^"]+)"/;
    const match = categoryRegex.exec(entry);
    return match ? match[1] : undefined;
  }

  /**
   * 関連性スコアを計算
   */
  private calculateRelevance(title: string, summary: string, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const summaryLower = summary.toLowerCase();

    const titleMatch = titleLower.includes(queryLower) ? 0.35 : 0;
    const summaryMatch = summaryLower.includes(queryLower) ? 0.25 : 0;

    // 単語レベルのマッチング
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);
    const wordMatchRate =
      queryWords.filter((w) => titleLower.includes(w) || summaryLower.includes(w)).length /
      Math.max(queryWords.length, 1);

    const baseScore = 0.3;

    return Math.min(titleMatch + summaryMatch + wordMatchRate * 0.3 + baseScore, 1);
  }
}
