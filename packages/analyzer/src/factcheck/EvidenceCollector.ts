/**
 * EvidenceCollector - エビデンスの収集
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type {
  Evidence,
  ExtractedClaim,
  VerificationSourceType,
  ExistingFactCheck,
  EvidenceRelation,
} from './types.js';
import { TrustedSourceRegistry } from './TrustedSourceRegistry.js';

/**
 * Web検索クライアントのインターフェース
 */
export interface SearchClient {
  search(query: string, options?: { maxResults?: number }): Promise<SearchResultItem[]>;
}

/**
 * Webスクレイパーのインターフェース
 */
export interface Scraper {
  scrape(url: string): Promise<ScrapedPage>;
}

/**
 * 検索結果アイテム
 */
export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * スクレイピング結果
 */
export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  publishedDate?: Date;
}

/**
 * エビデンスコレクターの設定
 */
export interface EvidenceCollectorConfig {
  maxResultsPerSource: number;
  timeoutMs: number;
}

/**
 * エビデンスを収集するクラス
 */
export class EvidenceCollector {
  private registry: TrustedSourceRegistry;
  private searchClient?: SearchClient;
  private scraper?: Scraper;
  private config: EvidenceCollectorConfig;

  constructor(
    registry: TrustedSourceRegistry,
    searchClient?: SearchClient,
    scraper?: Scraper,
    config?: Partial<EvidenceCollectorConfig>
  ) {
    this.registry = registry;
    this.searchClient = searchClient;
    this.scraper = scraper;
    this.config = {
      maxResultsPerSource: config?.maxResultsPerSource ?? 5,
      timeoutMs: config?.timeoutMs ?? 30000,
    };
  }

  /**
   * 主張に関連するエビデンスを収集
   */
  async collect(
    claim: ExtractedClaim,
    sourceTypes: VerificationSourceType[] = ['trusted_news', 'factcheck_org', 'academic']
  ): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    if (!this.searchClient) {
      // 検索クライアントがない場合はダミーのエビデンスを返す
      return this.generateDummyEvidence(claim, sourceTypes);
    }

    // 各ソースタイプで検索
    for (const sourceType of sourceTypes) {
      const query = this.buildSearchQuery(claim, sourceType);
      
      try {
        const results = await this.searchClient.search(query, {
          maxResults: this.config.maxResultsPerSource,
        });

        for (const result of results) {
          const domain = this.extractDomain(result.url);
          
          // 信頼できるソースかチェック
          if (this.registry.isTrusted(domain) || sourceType === 'factcheck_org') {
            const content = this.scraper
              ? await this.scraper.scrape(result.url)
              : { url: result.url, title: result.title, content: result.snippet || '' };

            const relation = this.determineRelation(claim.normalized, content.content);
            const credibility = this.registry.getCredibility(domain);

            evidence.push({
              id: `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              sourceName: result.title,
              sourceUrl: result.url,
              sourceType: this.registry.getSourceType(domain) || sourceType,
              excerpt: this.extractRelevantExcerpt(content.content, claim.normalized),
              relation,
              credibilityScore: credibility,
              publishedDate: content.publishedDate,
              retrievedAt: new Date(),
            });
          }
        }
      } catch {
        // 検索エラーは無視して続行
        continue;
      }
    }

    return evidence;
  }

  /**
   * クイックチェック用のエビデンス収集（少数）
   */
  async collectQuick(
    claim: ExtractedClaim,
    maxSources: number = 3
  ): Promise<Evidence[]> {
    if (!this.searchClient) {
      return this.generateDummyEvidence(claim, ['factcheck_org']).slice(0, maxSources);
    }

    const query = `fact check "${claim.normalized}"`;
    const results = await this.searchClient.search(query, { maxResults: maxSources });

    return results.map((result, index) => ({
      id: `ev-quick-${Date.now()}-${index}`,
      sourceName: result.title,
      sourceUrl: result.url,
      sourceType: 'factcheck_org' as VerificationSourceType,
      excerpt: result.snippet || '',
      relation: 'neutral' as EvidenceRelation,
      credibilityScore: this.registry.getCredibility(this.extractDomain(result.url)),
      retrievedAt: new Date(),
    }));
  }

  /**
   * 既存のファクトチェック結果を検索
   */
  async findExistingFactChecks(claim: ExtractedClaim): Promise<ExistingFactCheck[]> {
    const existingChecks: ExistingFactCheck[] = [];

    if (!this.searchClient) {
      return existingChecks;
    }

    const factCheckOrgs = this.registry.getSourcesByType('factcheck_org');
    
    for (const org of factCheckOrgs.slice(0, 3)) {
      const query = `site:${org.domain} "${claim.normalized.slice(0, 50)}"`;
      
      try {
        const results = await this.searchClient.search(query, { maxResults: 1 });
        
        if (results.length > 0) {
          const result = results[0]!;
          const verdictMatch = result.title.toLowerCase().match(
            /(true|false|mostly true|mostly false|half true|mixture|misleading)/
          );

          existingChecks.push({
            organization: org.name,
            verdict: verdictMatch ? verdictMatch[1]! : 'unknown',
            url: result.url,
            date: new Date(),
          });
        }
      } catch {
        continue;
      }
    }

    return existingChecks;
  }

  /**
   * 検索クエリを構築
   */
  private buildSearchQuery(claim: ExtractedClaim, sourceType: VerificationSourceType): string {
    const entities = claim.entities.slice(0, 3).join(' ');
    const claimPart = claim.normalized.slice(0, 100);

    switch (sourceType) {
      case 'factcheck_org':
        return `fact check ${entities} ${claimPart}`;
      case 'academic':
        return `research study ${entities}`;
      case 'statistics':
        return `statistics data ${entities}`;
      case 'government':
        return `official ${entities}`;
      default:
        return `${entities} ${claimPart}`;
    }
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  /**
   * コンテンツと主張の関係を判定
   */
  private determineRelation(claim: string, content: string): EvidenceRelation {
    const lowerContent = content.toLowerCase();
    const lowerClaim = claim.toLowerCase();

    // キーワードベースの簡易判定
    const keywords = lowerClaim.split(/\s+/).filter(w => w.length > 4);
    const matchCount = keywords.filter(k => lowerContent.includes(k)).length;
    const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;

    // 否定表現のチェック
    const negationPatterns = [
      /not\s+true/i, /false/i, /incorrect/i, /wrong/i,
      /debunk/i, /myth/i, /hoax/i, /misleading/i,
    ];
    const hasNegation = negationPatterns.some(p => p.test(content));

    // 肯定表現のチェック
    const affirmationPatterns = [
      /confirmed/i, /verified/i, /accurate/i, /correct/i,
      /true/i, /fact/i,
    ];
    const hasAffirmation = affirmationPatterns.some(p => p.test(content));

    if (hasNegation && matchRatio > 0.3) {
      return 'contradicts';
    } else if (hasAffirmation && matchRatio > 0.3) {
      return 'supports';
    } else if (matchRatio > 0.5) {
      return 'partially_supports';
    } else if (matchRatio > 0.2) {
      return 'context';
    } else {
      return 'neutral';
    }
  }

  /**
   * 関連する抜粋を抽出
   */
  private extractRelevantExcerpt(content: string, claim: string): string {
    const keywords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // キーワードを含む文を探す
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasKeyword = keywords.some(k => lowerSentence.includes(k));
      if (hasKeyword && sentence.length > 50 && sentence.length < 500) {
        return sentence.trim();
      }
    }

    // 見つからない場合は最初の部分を返す
    return content.slice(0, 300).trim() + '...';
  }

  /**
   * ダミーのエビデンスを生成（テスト用）
   */
  private generateDummyEvidence(
    claim: ExtractedClaim,
    sourceTypes: VerificationSourceType[]
  ): Evidence[] {
    return sourceTypes.map((sourceType, index) => ({
      id: `ev-dummy-${Date.now()}-${index}`,
      sourceName: `Source ${index + 1}`,
      sourceUrl: `https://example.com/source${index + 1}`,
      sourceType,
      excerpt: `Evidence related to: ${claim.normalized.slice(0, 50)}...`,
      relation: 'neutral' as EvidenceRelation,
      credibilityScore: 0.5,
      retrievedAt: new Date(),
    }));
  }
}
