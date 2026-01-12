/**
 * TrustedSourceRegistry - 信頼できるソースの管理
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type {
  TrustedSourceConfig,
  VerificationSourceType,
} from './types.js';

/**
 * 信頼できるソースのレジストリ
 */
export class TrustedSourceRegistry {
  private sources: Map<string, TrustedSourceConfig> = new Map();

  constructor(initialSources: TrustedSourceConfig[] = []) {
    // デフォルトのソースを登録
    for (const source of DEFAULT_TRUSTED_SOURCES) {
      this.register(source);
    }

    // 追加のソースを登録
    for (const source of initialSources) {
      this.register(source);
    }
  }

  /**
   * ソースを登録
   */
  register(source: TrustedSourceConfig): void {
    this.sources.set(source.domain, source);
  }

  /**
   * ドメインから信頼性スコアを取得
   */
  getCredibility(domain: string): number {
    const normalizedDomain = this.normalizeDomain(domain);
    const source = this.sources.get(normalizedDomain);
    
    if (source) {
      return source.baseCredibility;
    }

    // 未登録のソースはデフォルトの信頼度
    return 0.5;
  }

  /**
   * ドメインからソース情報を取得
   */
  getSource(domain: string): TrustedSourceConfig | undefined {
    const normalizedDomain = this.normalizeDomain(domain);
    return this.sources.get(normalizedDomain);
  }

  /**
   * ソースの種類を取得
   */
  getSourceType(domain: string): VerificationSourceType | undefined {
    const source = this.getSource(domain);
    return source?.sourceType;
  }

  /**
   * 特定の種類のソースを取得
   */
  getSourcesByType(type: VerificationSourceType): TrustedSourceConfig[] {
    return Array.from(this.sources.values()).filter(s => s.sourceType === type);
  }

  /**
   * 全ソースを取得
   */
  getAllSources(): TrustedSourceConfig[] {
    return Array.from(this.sources.values());
  }

  /**
   * ドメインが信頼できるかチェック
   */
  isTrusted(domain: string): boolean {
    const normalizedDomain = this.normalizeDomain(domain);
    return this.sources.has(normalizedDomain);
  }

  /**
   * ドメインを正規化
   */
  private normalizeDomain(domain: string): string {
    // URLからドメインを抽出
    let normalized = domain.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.split('/')[0]!;
    return normalized;
  }
}

/**
 * デフォルトの信頼できるソース
 */
const DEFAULT_TRUSTED_SOURCES: TrustedSourceConfig[] = [
  // ファクトチェック組織
  {
    name: 'Snopes',
    domain: 'snopes.com',
    sourceType: 'factcheck_org',
    baseCredibility: 0.9,
    specialties: ['urban legends', 'viral claims', 'hoaxes'],
  },
  {
    name: 'PolitiFact',
    domain: 'politifact.com',
    sourceType: 'factcheck_org',
    baseCredibility: 0.9,
    specialties: ['politics', 'policy'],
  },
  {
    name: 'FactCheck.org',
    domain: 'factcheck.org',
    sourceType: 'factcheck_org',
    baseCredibility: 0.9,
    specialties: ['politics', 'science'],
  },
  {
    name: 'Full Fact',
    domain: 'fullfact.org',
    sourceType: 'factcheck_org',
    baseCredibility: 0.9,
    specialties: ['UK politics', 'health'],
    language: 'en',
  },

  // 主要ニュースメディア
  {
    name: 'Reuters',
    domain: 'reuters.com',
    sourceType: 'trusted_news',
    baseCredibility: 0.85,
    specialties: ['international news', 'business'],
  },
  {
    name: 'Associated Press',
    domain: 'apnews.com',
    sourceType: 'trusted_news',
    baseCredibility: 0.85,
    specialties: ['breaking news', 'US news'],
  },
  {
    name: 'BBC',
    domain: 'bbc.com',
    sourceType: 'trusted_news',
    baseCredibility: 0.85,
    specialties: ['international news', 'UK news'],
  },
  {
    name: 'NPR',
    domain: 'npr.org',
    sourceType: 'trusted_news',
    baseCredibility: 0.85,
    specialties: ['US news', 'culture'],
  },

  // 政府機関
  {
    name: 'World Health Organization',
    domain: 'who.int',
    sourceType: 'government',
    baseCredibility: 0.9,
    specialties: ['health', 'disease', 'medical'],
  },
  {
    name: 'CDC',
    domain: 'cdc.gov',
    sourceType: 'government',
    baseCredibility: 0.9,
    specialties: ['health', 'disease', 'medical'],
    language: 'en',
  },
  {
    name: 'NASA',
    domain: 'nasa.gov',
    sourceType: 'government',
    baseCredibility: 0.9,
    specialties: ['space', 'climate', 'science'],
  },

  // 学術・統計
  {
    name: 'Nature',
    domain: 'nature.com',
    sourceType: 'academic',
    baseCredibility: 0.95,
    specialties: ['science', 'research'],
  },
  {
    name: 'Science',
    domain: 'science.org',
    sourceType: 'academic',
    baseCredibility: 0.95,
    specialties: ['science', 'research'],
  },
  {
    name: 'PubMed Central',
    domain: 'ncbi.nlm.nih.gov',
    sourceType: 'academic',
    baseCredibility: 0.9,
    specialties: ['medical', 'biology'],
  },
  {
    name: 'World Bank',
    domain: 'worldbank.org',
    sourceType: 'statistics',
    baseCredibility: 0.9,
    specialties: ['economics', 'development'],
  },
  {
    name: 'UN Data',
    domain: 'data.un.org',
    sourceType: 'statistics',
    baseCredibility: 0.9,
    specialties: ['demographics', 'global statistics'],
  },
];
