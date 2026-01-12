/**
 * CredibilityScorer - ソース信頼度スコアリング
 *
 * @since 0.2.0
 * @requirement REQ-COLLECT-007-ENH-002
 * @design DES-KATASHIRO-002 §4.6.3 信頼度スコアリングアルゴリズム
 */

import type { TrackedSource } from './source-tracker.js';

/**
 * 信頼度計算要素
 */
export interface CredibilityFactors {
  /** ドメイン評価 (0-90) */
  domainReputation: number;
  /** HTTPS使用ボーナス (0 or 5) */
  httpsBonus: number;
  /** 著者ボーナス (0 or 10) */
  authorBonus: number;
  /** 被引用ボーナス (0-20) */
  citationBonus: number;
  /** 古さペナルティ (0 to -30) */
  recencyPenalty: number;
}

/**
 * 信頼度スコア結果
 */
export interface CredibilityScore {
  /** 総合スコア (0-100) */
  total: number;
  /** 各要素の内訳 */
  factors: CredibilityFactors;
  /** スコアの説明 */
  explanation: string;
}

/**
 * ドメイン評価カテゴリ
 */
interface DomainCategory {
  patterns: (string | RegExp)[];
  score: number;
  label: string;
}

/**
 * 信頼度スコアリングクラス
 */
export class CredibilityScorer {
  /** カスタムドメイン評価 */
  private customDomainScores: Map<string, number> = new Map();
  /** 登録済み専門家 */
  private knownAuthors: Map<string, string[]> = new Map();

  /** ドメインカテゴリ定義 */
  private static readonly DOMAIN_CATEGORIES: DomainCategory[] = [
    {
      label: 'Academic/Research',
      score: 90,
      patterns: [
        /\.edu$/,
        /\.ac\.[a-z]{2}$/,
        /arxiv\.org$/,
        /nature\.com$/,
        /science\.org$/,
        /springer\.com$/,
        /wiley\.com$/,
        /acm\.org$/,
        /ieee\.org$/,
        /pubmed\.gov$/,
        /scholar\.google/,
      ],
    },
    {
      label: 'Government/Official',
      score: 85,
      patterns: [
        /\.gov$/,
        /\.gov\.[a-z]{2}$/,
        /\.go\.jp$/,
        /\.gc\.ca$/,
        /who\.int$/,
        /un\.org$/,
      ],
    },
    {
      label: 'Major News/Wire',
      score: 75,
      patterns: [
        /reuters\.com$/,
        /apnews\.com$/,
        /bbc\.com$/,
        /bbc\.co\.uk$/,
        /nytimes\.com$/,
        /wsj\.com$/,
        /theguardian\.com$/,
        /nikkei\.com$/,
        /nhk\.or\.jp$/,
        /asahi\.com$/,
        /mainichi\.jp$/,
        /yomiuri\.co\.jp$/,
      ],
    },
    {
      label: 'Tech Platforms',
      score: 50,
      patterns: [
        /medium\.com$/,
        /qiita\.com$/,
        /zenn\.dev$/,
        /note\.com$/,
        /dev\.to$/,
        /hashnode\.dev$/,
        /stackoverflow\.com$/,
        /github\.com$/,
      ],
    },
    {
      label: 'Default',
      score: 40,
      patterns: [],
    },
  ];

  /**
   * ソースの信頼度をスコアリング
   */
  async score(source: TrackedSource): Promise<CredibilityScore> {
    const factors = await this.calculateFactors(source);
    const total = this.calculateTotal(factors);
    const explanation = this.generateExplanation(factors, total);

    return {
      total,
      factors,
      explanation,
    };
  }

  /**
   * 各要素を計算
   */
  private async calculateFactors(source: TrackedSource): Promise<CredibilityFactors> {
    const domain = source.metadata.domain;
    const url = source.url;
    const author = source.metadata.author;
    const publishedAt = source.metadata.publishedAt;
    const citationCount = source.usedIn.length;

    // ドメイン評価
    const domainReputation = this.getDomainScore(domain);

    // HTTPSボーナス
    const httpsBonus = url.startsWith('https://') ? 5 : 0;

    // 著者ボーナス
    const authorBonus = this.getAuthorBonus(author);

    // 被引用ボーナス
    const citationBonus = Math.min(citationCount * 1, 20);

    // 古さペナルティ
    const recencyPenalty = this.calculateRecencyPenalty(publishedAt);

    return {
      domainReputation,
      httpsBonus,
      authorBonus,
      citationBonus,
      recencyPenalty,
    };
  }

  /**
   * ドメインスコアを取得
   */
  private getDomainScore(domain: string): number {
    // カスタム設定をチェック
    const customScore = this.customDomainScores.get(domain);
    if (customScore !== undefined) {
      return customScore;
    }

    // カテゴリマッチング
    for (const category of CredibilityScorer.DOMAIN_CATEGORIES) {
      for (const pattern of category.patterns) {
        if (typeof pattern === 'string') {
          if (domain === pattern || domain.endsWith(pattern)) {
            return category.score;
          }
        } else if (pattern.test(domain)) {
          return category.score;
        }
      }
    }

    // デフォルトスコア
    return 40;
  }

  /**
   * 著者ボーナスを取得
   */
  private getAuthorBonus(author?: string): number {
    if (!author) return 0;
    
    // 登録済み専門家かチェック
    if (this.knownAuthors.has(author)) {
      return 10;
    }

    // 著者名があるだけでも小さなボーナス
    return 3;
  }

  /**
   * 古さペナルティを計算
   */
  private calculateRecencyPenalty(publishedAt?: Date): number {
    if (!publishedAt) return 0; // 日付不明は0

    const now = new Date();
    const yearDiff = now.getFullYear() - publishedAt.getFullYear();
    
    // 2年以内は0
    if (yearDiff <= 2) return 0;
    
    // 2年を超えると年ごとに-5、最大-30
    return Math.max((yearDiff - 2) * -5, -30);
  }

  /**
   * 総合スコアを計算
   */
  private calculateTotal(factors: CredibilityFactors): number {
    const total = 
      factors.domainReputation +
      factors.httpsBonus +
      factors.authorBonus +
      factors.citationBonus +
      factors.recencyPenalty;
    
    // 0-100にクランプ
    return Math.max(0, Math.min(100, total));
  }

  /**
   * スコアの説明を生成
   */
  private generateExplanation(factors: CredibilityFactors, total: number): string {
    const parts: string[] = [];
    
    parts.push(`Domain: ${factors.domainReputation}`);
    
    if (factors.httpsBonus > 0) {
      parts.push(`HTTPS: +${factors.httpsBonus}`);
    }
    if (factors.authorBonus > 0) {
      parts.push(`Author: +${factors.authorBonus}`);
    }
    if (factors.citationBonus > 0) {
      parts.push(`Citations: +${factors.citationBonus}`);
    }
    if (factors.recencyPenalty < 0) {
      parts.push(`Age: ${factors.recencyPenalty}`);
    }

    return `Total: ${total}/100 (${parts.join(', ')})`;
  }

  /**
   * カスタムドメイン評価を設定
   */
  setDomainReputation(domain: string, score: number): void {
    this.customDomainScores.set(domain, Math.max(0, Math.min(100, score)));
  }

  /**
   * ドメイン評価を削除
   */
  removeDomainReputation(domain: string): void {
    this.customDomainScores.delete(domain);
  }

  /**
   * 専門家を登録
   */
  addKnownAuthor(authorName: string, expertise: string[]): void {
    this.knownAuthors.set(authorName, expertise);
  }

  /**
   * 専門家を削除
   */
  removeKnownAuthor(authorName: string): void {
    this.knownAuthors.delete(authorName);
  }

  /**
   * 登録済み専門家リストを取得
   */
  getKnownAuthors(): Map<string, string[]> {
    return new Map(this.knownAuthors);
  }
}
