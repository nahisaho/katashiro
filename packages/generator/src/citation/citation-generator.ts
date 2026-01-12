/**
 * CitationGenerator - 引用・参考文献生成
 *
 * @requirement REQ-GEN-003
 * @requirement REQ-CITE-001-ENH (v0.2.0)
 * @requirement REQ-FIX-012 (v0.2.10)
 * @design DES-KATASHIRO-001 §2.3 Generator Container
 * @design DES-KATASHIRO-002 §3.1 CitationGenerator
 * @task TSK-033
 */

import type { Source } from '@nahisaho/katashiro-core';

/**
 * 引用スタイル
 */
export type CitationStyle = 'apa' | 'mla' | 'ieee' | 'chicago' | 'harvard';

/**
 * 生成オプション
 * @since 0.2.10
 */
export interface CitationOptions {
  readonly format?: CitationStyle;
  readonly includeAccessDate?: boolean;
}

/**
 * 生成された引用情報
 */
export interface GeneratedCitation {
  readonly id: string;
  readonly source: Source;
  readonly style: CitationStyle;
  readonly formatted: string;
  readonly accessedAt: string;
}

/**
 * 引用ソース入力（簡易API用）
 * @since 0.2.10 - year フィールド追加
 */
export interface SourceInput {
  readonly title: string;
  readonly url?: string;
  readonly author?: string;
  readonly date?: string;
  readonly publishedAt?: string;
  readonly year?: number | string;
}

/**
 * 引用バリデーション結果
 * @since 0.2.0
 */
export interface CitationValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly suggestions: string[];
}

/**
 * 引用生成実装
 */
export class CitationGenerator {
  /**
   * 引用を生成（単一または複数）
   * AGENTS.md互換API - 配列の場合は参考文献リストを文字列で返す
   * @since 0.2.10 - 配列対応追加
   * 
   * @param input - 単一のSource/SourceInputまたは配列
   * @param styleOrOptions - スタイルまたはオプション
   * @returns 単一の場合はGeneratedCitation、配列の場合はフォーマット済み文字列
   */
  generate(
    input: Source | SourceInput | (Source | SourceInput)[],
    styleOrOptions: CitationStyle | CitationOptions = 'apa'
  ): GeneratedCitation | string {
    const style = typeof styleOrOptions === 'string' 
      ? styleOrOptions 
      : (styleOrOptions.format ?? 'apa');
    const includeAccessDate = typeof styleOrOptions === 'object' 
      ? styleOrOptions.includeAccessDate 
      : false;

    // 配列の場合は参考文献リストを生成
    if (Array.isArray(input)) {
      if (input.length === 0) {
        return '';
      }
      
      // ソースを正規化してソート
      const sources = input.map(i => this.normalizeSource(i));
      const sorted = [...sources].sort((a, b) => {
        const authorA = a.metadata?.author ?? a.metadata?.title ?? '';
        const authorB = b.metadata?.author ?? b.metadata?.title ?? '';
        return authorA.localeCompare(authorB, 'ja');
      });

      // 各引用をフォーマット
      const citations = sorted.map(s => {
        const formatted = this.formatCitation(s, style);
        if (includeAccessDate && s.url) {
          return `${formatted} Retrieved ${new Date(s.fetchedAt).toLocaleDateString('ja-JP')} from ${s.url}`;
        }
        return formatted;
      });
      
      return citations.join('\n\n');
    }

    // 単一の場合は従来通り
    const source: Source = this.normalizeSource(input);
    return this.generateCitation(source, style);
  }

  /**
   * 引用を検証
   * @since 0.2.0
   * @requirement REQ-CITE-001-ENH
   */
  validate(input: Source | SourceInput): CitationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // 必須フィールドチェック
    if (this.isSource(input)) {
      // Source型の検証
      const src = input as Source;
      if (!src.id) {
        errors.push('Source ID is required');
      }
      if (!src.url && !src.metadata?.title) {
        errors.push('Either URL or title is required');
      }
      if (!src.fetchedAt) {
        warnings.push('fetchedAt is missing, will use current date');
      }
    } else {
      // SourceInput型の検証
      const inp = input as SourceInput;
      if (!inp.title || inp.title.trim() === '') {
        errors.push('Title is required');
      }
      if (!inp.url && !inp.author) {
        warnings.push('Neither URL nor author provided - citation may be incomplete');
      }
    }

    // 共通チェック
    const title = this.isSource(input) ? input.metadata?.title : (input as SourceInput).title;
    const url = this.isSource(input) ? input.url : (input as SourceInput).url;
    const author = this.isSource(input) ? input.metadata?.author : (input as SourceInput).author;
    const date = this.isSource(input) 
      ? input.metadata?.publishedAt 
      : ((input as SourceInput).publishedAt || (input as SourceInput).date);

    // URL検証
    if (url) {
      try {
        new URL(url);
      } catch {
        errors.push(`Invalid URL format: ${url}`);
      }
    }

    // 日付検証
    if (date) {
      const parsed = Date.parse(date);
      if (isNaN(parsed)) {
        warnings.push(`Date format may be invalid: ${date}`);
      } else if (parsed > Date.now()) {
        warnings.push('Published date is in the future');
      }
    } else {
      suggestions.push('Adding a publication date improves citation accuracy');
    }

    // 著者検証
    if (!author) {
      suggestions.push('Adding author information is recommended for academic citations');
    }

    // タイトル品質チェック
    if (title) {
      if (title.length < 3) {
        warnings.push('Title seems too short');
      }
      if (title.length > 500) {
        warnings.push('Title seems too long, consider truncating');
      }
      if (/^https?:\/\//.test(title)) {
        warnings.push('Title appears to be a URL, not a proper title');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Source型かどうかを判定
   */
  private isSource(input: Source | SourceInput): input is Source {
    return 'id' in input && 'fetchedAt' in input && 'metadata' in input;
  }

  /**
   * SourceInputをSourceに正規化
   */
  private normalizeSource(input: Source | SourceInput): Source {
    // すでにSourceの場合はそのまま返す
    if (this.isSource(input)) {
      return input;
    }
    
    // SourceInputからSourceを構築
    const simpleInput = input as SourceInput;
    
    // yearフィールドからpublishedAtを生成
    let publishedAt = simpleInput.publishedAt || simpleInput.date;
    if (!publishedAt && simpleInput.year) {
      publishedAt = `${simpleInput.year}-01-01`;
    }
    
    return {
      id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: simpleInput.url || '',
      fetchedAt: new Date().toISOString(),
      metadata: {
        title: simpleInput.title,
        author: simpleInput.author,
        publishedAt,
      },
    };
  }

  /**
   * 引用を生成
   */
  generateCitation(source: Source, style: CitationStyle): GeneratedCitation {
    const formatted = this.formatCitation(source, style);
    
    return {
      id: `cite-${source.id}`,
      source,
      style,
      formatted,
      accessedAt: source.fetchedAt,
    };
  }

  /**
   * 参考文献リストを生成
   */
  generateBibliography(sources: Source[], style: CitationStyle): string {
    if (sources.length === 0) {
      return '';
    }

    // Sort by author/title
    const sorted = [...sources].sort((a, b) => {
      const authorA = a.metadata?.author ?? a.metadata?.title ?? '';
      const authorB = b.metadata?.author ?? b.metadata?.title ?? '';
      return authorA.localeCompare(authorB, 'ja');
    });

    const citations = sorted.map(s => this.formatCitation(s, style));
    return citations.join('\n\n');
  }

  /**
   * インライン引用をフォーマット
   */
  formatInlineCitation(
    source: Source,
    style: CitationStyle,
    number?: number
  ): string {
    const author = source.metadata?.author ?? '';
    const date = source.metadata?.publishedAt;
    const year = date ? new Date(date).getFullYear().toString() : 'n.d.';

    switch (style) {
      case 'apa':
        return `(${this.getLastName(author)}, ${year})`;
      case 'mla':
        return `(${this.getLastName(author)})`;
      case 'ieee':
        return `[${number ?? 1}]`;
      case 'chicago':
        return `(${this.getLastName(author)} ${year})`;
      case 'harvard':
        return `(${this.getLastName(author)}, ${year})`;
      default:
        return `(${this.getLastName(author)}, ${year})`;
    }
  }

  /**
   * 引用をフォーマット
   */
  private formatCitation(source: Source, style: CitationStyle): string {
    const url = source.url;
    // URLからメタデータを推測
    const inferred = this.inferMetadataFromUrl(url);
    const title = source.metadata?.title || inferred.title || this.extractTitleFromUrl(url);
    const author = source.metadata?.author || inferred.organization || '';
    const date = source.metadata?.publishedAt;
    const year = date ? new Date(date).getFullYear().toString() : 'n.d.';
    const accessDate = new Date(source.fetchedAt).toLocaleDateString('ja-JP');

    switch (style) {
      case 'apa':
        return this.formatAPA(author, year, title, url, accessDate);
      case 'mla':
        return this.formatMLA(author, title, url, accessDate);
      case 'ieee':
        return this.formatIEEE(author, title, url, accessDate);
      case 'chicago':
        return this.formatChicago(author, year, title, url, accessDate);
      case 'harvard':
        return this.formatHarvard(author, year, title, url, accessDate);
      default:
        return this.formatAPA(author, year, title, url, accessDate);
    }
  }

  /**
   * APAスタイル（第7版準拠）
   * @since 0.2.11 - 著者不明時はタイトル先頭形式に変更
   */
  private formatAPA(
    author: string,
    year: string,
    title: string,
    url: string,
    accessDate: string
  ): string {
    // APA 7th edition: 著者不明の場合はタイトルを先頭に
    if (!author) {
      return `${title}. (${year}). Retrieved ${accessDate}, from ${url}`;
    }
    return `${author}. (${year}). *${title}*. Retrieved ${accessDate}, from ${url}`;
  }

  /**
   * MLAスタイル（第9版準拠）
   * @since 0.2.11 - 著者不明時の処理改善
   */
  private formatMLA(
    author: string,
    title: string,
    url: string,
    accessDate: string
  ): string {
    // MLA 9th edition: 著者不明の場合はタイトルから開始
    if (!author) {
      return `"${title}." *Web*. ${accessDate}. <${url}>.`;
    }
    return `${author}. "${title}." *Web*. ${accessDate}. <${url}>.`;
  }

  /**
   * IEEEスタイル
   * @since 0.2.11 - 著者不明時の処理改善
   */
  private formatIEEE(
    author: string,
    title: string,
    url: string,
    accessDate: string
  ): string {
    // IEEE: 著者不明の場合は省略
    if (!author) {
      return `"${title}," [Online]. Available: ${url}. [Accessed: ${accessDate}].`;
    }
    return `${author}, "${title}," [Online]. Available: ${url}. [Accessed: ${accessDate}].`;
  }

  /**
   * Chicagoスタイル
   * @since 0.2.11 - 著者不明時の処理改善
   */
  private formatChicago(
    author: string,
    year: string,
    title: string,
    url: string,
    accessDate: string
  ): string {
    // Chicago: 著者不明の場合はタイトルから開始
    if (!author) {
      return `"${title}." ${year}. Accessed ${accessDate}. ${url}.`;
    }
    return `${author}. "${title}." ${year}. Accessed ${accessDate}. ${url}.`;
  }

  /**
   * Harvardスタイル
   * @since 0.2.11 - 著者不明時の処理改善
   */
  private formatHarvard(
    author: string,
    year: string,
    title: string,
    url: string,
    accessDate: string
  ): string {
    // Harvard: 著者不明の場合はタイトルから開始
    if (!author) {
      return `*${title}* (${year}). Available at: ${url} (Accessed: ${accessDate}).`;
    }
    return `${author} (${year}) *${title}*. Available at: ${url} (Accessed: ${accessDate}).`;
  }

  /**
   * 姓を抽出
   */
  private getLastName(author: string): string {
    if (!author) return 'Unknown';
    
    // Japanese name: typically first character(s) are family name
    const parts = author.split(/[\s　]+/);
    return parts[0] ?? author;
  }

  /**
   * URLからメタデータを推測
   * @since 0.2.11
   */
  private inferMetadataFromUrl(url: string): { title?: string; organization?: string } {
    if (!url) return {};
    
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      
      // 既知のドメインから組織名を推測
      const domainMap: Record<string, { org: string; name?: string }> = {
        'mext.go.jp': { org: '文部科学省', name: 'Ministry of Education, Culture, Sports, Science and Technology' },
        'unesco.org': { org: 'UNESCO', name: 'United Nations Educational, Scientific and Cultural Organization' },
        'microsoft.com': { org: 'Microsoft Corporation' },
        'google.com': { org: 'Google LLC' },
        'apple.com': { org: 'Apple Inc.' },
        'github.com': { org: 'GitHub' },
        'wikipedia.org': { org: 'Wikipedia' },
        'nii.ac.jp': { org: '国立情報学研究所', name: 'National Institute of Informatics' },
        'jst.go.jp': { org: '科学技術振興機構', name: 'Japan Science and Technology Agency' },
      };
      
      for (const [domain, info] of Object.entries(domainMap)) {
        if (hostname.includes(domain)) {
          return { organization: info.org };
        }
      }
      
      // 一般的なパターンから組織を推測
      if (hostname.endsWith('.go.jp')) {
        return { organization: '日本政府機関' };
      }
      if (hostname.endsWith('.ac.jp') || hostname.endsWith('.edu')) {
        return { organization: '学術機関' };
      }
      if (hostname.endsWith('.or.jp') || hostname.endsWith('.org')) {
        return { organization: '非営利組織' };
      }
      
      return {};
    } catch {
      return {};
    }
  }

  /**
   * URLからタイトルを抽出
   * @since 0.2.11
   */
  private extractTitleFromUrl(url: string): string {
    if (!url) return 'Untitled';
    
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      
      // パスの最後の部分を取得
      const segments = path.split('/').filter(s => s.length > 0);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment) {
          // ファイル拡張子を除去し、ハイフン/アンダースコアをスペースに
          const title = lastSegment
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2');
          
          if (title.length > 3) {
            return title.charAt(0).toUpperCase() + title.slice(1);
          }
        }
      }
      
      // フォールバック: ホスト名を使用
      return `Content from ${parsed.hostname}`;
    } catch {
      return 'Untitled';
    }
  }
}
