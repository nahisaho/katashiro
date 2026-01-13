/**
 * CitationGenerator - 引用・参考文献生成
 *
 * @requirement REQ-GEN-003
 * @requirement REQ-CITE-001-ENH (v0.2.0)
 * @requirement REQ-FIX-012 (v0.2.10)
 * @requirement REQ-EXT-CIT-001 (v0.5.0) - インライン引用リンク生成
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
 * インライン引用スタイル
 * @since 0.5.0
 */
export type InlineCitationStyle = 'markdown' | 'footnote' | 'endnote' | 'parenthetical';

/**
 * 生成オプション
 * @since 0.2.10
 */
export interface CitationOptions {
  readonly format?: CitationStyle;
  readonly includeAccessDate?: boolean;
  /** インライン引用スタイル @since 0.5.0 */
  readonly inlineStyle?: InlineCitationStyle;
}

/**
 * インライン引用リンク
 * @since 0.5.0
 * @requirement REQ-EXT-CIT-001
 */
export interface InlineCitationLink {
  /** 表示テキスト */
  readonly text: string;
  /** リンクURL */
  readonly url: string;
  /** Markdownフォーマット済み文字列 */
  readonly markdown: string;
  /** HTMLフォーマット済み文字列 */
  readonly html: string;
  /** ソースID */
  readonly sourceId: string;
  /** 引用番号（endnote/footnote用） */
  readonly number?: number;
}

/**
 * URL検証結果
 * @since 0.6.0
 * @requirement REQ-EXT-CIT-003
 */
export interface UrlVerificationResult {
  /** 検証対象のURL */
  readonly url: string;
  /** アクセス可能か */
  readonly accessible: boolean;
  /** ページタイトル（取得できた場合） */
  readonly title: string | null;
  /** HTTPステータスコード */
  readonly statusCode?: number;
  /** エラーメッセージ（失敗時） */
  readonly error?: string;
  /** レスポンス時間（ミリ秒） */
  readonly responseTimeMs: number;
  /** 検証日時 */
  readonly checkedAt: Date;
  /** リダイレクト後のURL（異なる場合） */
  readonly finalUrl?: string;
}

/**
 * 検証済み引用ソース
 * @since 0.6.0
 * @requirement REQ-EXT-CIT-003
 */
export interface VerifiedCitationSource {
  /** 元のソース */
  readonly source: Source | SourceInput;
  /** URL検証結果 */
  readonly verification: UrlVerificationResult | null;
  /** 検証ステータス */
  readonly status: 'verified' | 'unverified' | 'no_url';
  /** ラベル（未検証の場合） */
  readonly label: string | null;
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
   * インライン引用リンクを生成
   * 
   * @requirement REQ-EXT-CIT-001
   * @since 0.5.0
   * 
   * @example
   * ```typescript
   * const link = generator.generateInlineLink(source);
   * // { text: 'Article Title', url: 'https://example.com', markdown: '[Article Title](https://example.com)', ... }
   * 
   * const footnote = generator.generateInlineLink(source, { style: 'footnote', number: 1 });
   * // { markdown: '[^1]', ... }
   * ```
   */
  generateInlineLink(
    source: Source,
    options?: { style?: InlineCitationStyle; number?: number }
  ): InlineCitationLink {
    const style = options?.style ?? 'markdown';
    const number = options?.number;

    // URLからメタデータを推測
    const inferred = this.inferMetadataFromUrl(source.url);
    const title = source.metadata?.title || inferred.title || this.extractTitleFromUrl(source.url);
    const author = source.metadata?.author || inferred.organization || '';
    const url = source.url;

    // スタイルに応じたテキストとMarkdownを生成
    let text: string;
    let markdown: string;
    let html: string;

    switch (style) {
      case 'markdown':
        // [source title](URL) 形式
        text = title;
        markdown = `[${title}](${url})`;
        html = `<a href="${this.escapeHtml(url)}">${this.escapeHtml(title)}</a>`;
        break;

      case 'footnote':
        // [^1] 形式（Markdown脚注）
        const fnNum = number ?? 1;
        text = `[^${fnNum}]`;
        markdown = `[^${fnNum}]`;
        html = `<sup id="fnref:${fnNum}"><a href="#fn:${fnNum}">${fnNum}</a></sup>`;
        break;

      case 'endnote':
        // [[1]](URL) 形式（番号付きリンク）
        const enNum = number ?? 1;
        text = `[${enNum}]`;
        markdown = `[[${enNum}]](${url})`;
        html = `<a href="${this.escapeHtml(url)}">[${enNum}]</a>`;
        break;

      case 'parenthetical':
        // [(Author, Year)](URL) 形式
        const date = source.metadata?.publishedAt;
        const year = date ? new Date(date).getFullYear().toString() : 'n.d.';
        const lastName = this.getLastName(author);
        text = lastName ? `(${lastName}, ${year})` : `(${year})`;
        markdown = `[${text}](${url})`;
        html = `<a href="${this.escapeHtml(url)}">${this.escapeHtml(text)}</a>`;
        break;

      default:
        text = title;
        markdown = `[${title}](${url})`;
        html = `<a href="${this.escapeHtml(url)}">${this.escapeHtml(title)}</a>`;
    }

    return {
      text,
      url,
      markdown,
      html,
      sourceId: source.id,
      number,
    };
  }

  /**
   * 複数ソースのインライン引用リンクを一括生成
   * 
   * @requirement REQ-EXT-CIT-001
   * @since 0.5.0
   */
  generateInlineLinks(
    sources: Source[],
    options?: { style?: InlineCitationStyle }
  ): InlineCitationLink[] {
    return sources.map((source, index) => 
      this.generateInlineLink(source, {
        style: options?.style,
        number: index + 1,
      })
    );
  }

  /**
   * HTML特殊文字をエスケープ
   * @private
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
   * 引用元URLのアクセシビリティを検証
   * @since 0.6.0
   * @requirement REQ-EXT-CIT-003
   * @description URLにアクセスしてタイトルを取得、3秒以内に完了
   */
  async verifyUrl(url: string): Promise<UrlVerificationResult> {
    const startTime = Date.now();
    const timeoutMs = 3000; // 3秒タイムアウト

    if (!url || url.trim() === '') {
      return {
        url,
        accessible: false,
        title: null,
        error: 'URL is empty',
        responseTimeMs: 0,
        checkedAt: new Date(),
      };
    }

    // URL形式を検証
    try {
      new URL(url);
    } catch {
      return {
        url,
        accessible: false,
        title: null,
        error: 'Invalid URL format',
        responseTimeMs: Date.now() - startTime,
        checkedAt: new Date(),
      };
    }

    try {
      // AbortController でタイムアウト制御
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'KATASHIRO-CitationVerifier/0.6.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          url,
          accessible: false,
          title: null,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTimeMs,
          checkedAt: new Date(),
        };
      }

      // HTMLからタイトルを抽出
      let title: string | null = null;
      const contentType = response.headers.get('content-type') ?? '';
      
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        const html = await response.text();
        title = this.extractTitleFromHtml(html);
      }

      // タイトルが取得できなかった場合はURLから推測
      if (!title) {
        title = this.extractTitleFromUrl(url);
      }

      return {
        url,
        accessible: true,
        title,
        statusCode: response.status,
        responseTimeMs,
        checkedAt: new Date(),
        finalUrl: response.url !== url ? response.url : undefined,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Timeout: Request exceeded ${timeoutMs}ms`;
        } else {
          errorMessage = error.message;
        }
      }

      return {
        url,
        accessible: false,
        title: null,
        error: errorMessage,
        responseTimeMs,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * 複数のURLを一括検証
   * @since 0.6.0
   * @requirement REQ-EXT-CIT-003
   */
  async verifyUrls(urls: string[]): Promise<UrlVerificationResult[]> {
    return Promise.all(urls.map(url => this.verifyUrl(url)));
  }

  /**
   * ソースの引用URLを検証し、結果を付加
   * @since 0.6.0
   * @requirement REQ-EXT-CIT-003
   */
  async verifySourceUrl(source: Source | SourceInput): Promise<VerifiedCitationSource> {
    const url = this.isSource(source) ? source.url : (source as SourceInput).url;
    
    if (!url) {
      return {
        source,
        verification: null,
        status: 'no_url',
        label: null,
      };
    }

    const verification = await this.verifyUrl(url);
    
    return {
      source,
      verification,
      status: verification.accessible ? 'verified' : 'unverified',
      label: verification.accessible ? null : '[未検証]',
    };
  }

  /**
   * HTMLからタイトルを抽出
   * @since 0.6.0
   */
  private extractTitleFromHtml(html: string): string | null {
    // <title>タグからタイトルを抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      // HTMLエンティティをデコード
      const title = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      if (title.length > 0) {
        return title;
      }
    }

    // og:title からフォールバック
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch?.[1]) {
      return ogTitleMatch[1].trim();
    }

    // Twitter Card タイトル
    const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
    if (twitterTitleMatch?.[1]) {
      return twitterTitleMatch[1].trim();
    }

    return null;
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

  // ====================
  // 引用エラー処理 (REQ-EXT-CIT-004)
  // ====================

  /**
   * 引用エラーの種類
   * @since 1.0.0
   * @requirement REQ-EXT-CIT-004
   */
  readonly CITATION_ERROR_LABELS = {
    UNVERIFIED: '[未検証]',
    URL_INACCESSIBLE: '[URL不可]',
    METADATA_MISSING: '[情報不足]',
    EXPIRED: '[期限切れ]',
  } as const;

  /**
   * 引用エラー処理結果
   * @since 1.0.0
   * @requirement REQ-EXT-CIT-004
   */
  generateWithErrorHandling(
    input: Source | SourceInput | (Source | SourceInput)[],
    styleOrOptions: CitationStyle | CitationOptions = 'apa',
    errorOptions?: CitationErrorOptions
  ): CitationWithErrors {
    const opts = errorOptions ?? {};
    const labelUnverified = opts.labelUnverified ?? true;
    const includeReason = opts.includeReason ?? false;

    // 配列の場合
    if (Array.isArray(input)) {
      const results = input.map(item => this.processWithErrorHandling(item, labelUnverified, includeReason));
      const validSources = results
        .filter(r => r.status === 'valid' || r.status === 'warning')
        .map(r => this.normalizeSource(r.source));
      
      const style = typeof styleOrOptions === 'string' 
        ? styleOrOptions 
        : (styleOrOptions.format ?? 'apa');
      
      const formatted = validSources.length > 0
        ? this.generateBibliography(validSources, style)
        : '';

      return {
        formatted,
        results,
        totalCount: input.length,
        validCount: results.filter(r => r.status === 'valid').length,
        warningCount: results.filter(r => r.status === 'warning').length,
        errorCount: results.filter(r => r.status === 'error').length,
      };
    }

    // 単一の場合
    const result = this.processWithErrorHandling(input, labelUnverified, includeReason);
    const style = typeof styleOrOptions === 'string' 
      ? styleOrOptions 
      : (styleOrOptions.format ?? 'apa');
    
    const source = this.normalizeSource(input);
    const formatted = result.status !== 'error'
      ? this.formatCitation(source, style)
      : '';

    return {
      formatted: result.labeledFormatted ?? formatted,
      results: [result],
      totalCount: 1,
      validCount: result.status === 'valid' ? 1 : 0,
      warningCount: result.status === 'warning' ? 1 : 0,
      errorCount: result.status === 'error' ? 1 : 0,
    };
  }

  /**
   * 引用エラーを検出してラベル付け
   * @since 1.0.0
   * @requirement REQ-EXT-CIT-004
   */
  private processWithErrorHandling(
    input: Source | SourceInput,
    labelUnverified: boolean,
    includeReason: boolean
  ): CitationErrorResult {
    const errors: CitationErrorDetail[] = [];
    const warnings: CitationErrorDetail[] = [];

    // URL検証
    const url = this.isSource(input) ? input.url : (input as SourceInput).url;
    if (url) {
      try {
        new URL(url);
      } catch {
        errors.push({
          type: 'invalid_url',
          message: `Invalid URL format: ${url}`,
          field: 'url',
        });
      }
    } else {
      warnings.push({
        type: 'missing_url',
        message: 'No URL provided',
        field: 'url',
      });
    }

    // タイトル検証
    const title = this.isSource(input) ? input.metadata?.title : (input as SourceInput).title;
    if (!title || title.trim() === '') {
      errors.push({
        type: 'missing_title',
        message: 'Title is required',
        field: 'title',
      });
    }

    // 著者検証
    const author = this.isSource(input) ? input.metadata?.author : (input as SourceInput).author;
    if (!author) {
      warnings.push({
        type: 'missing_author',
        message: 'Author information is missing',
        field: 'author',
      });
    }

    // 日付検証
    const date = this.isSource(input) 
      ? input.metadata?.publishedAt 
      : ((input as SourceInput).publishedAt || (input as SourceInput).date);
    if (!date) {
      warnings.push({
        type: 'missing_date',
        message: 'Publication date is missing',
        field: 'date',
      });
    } else {
      const parsed = Date.parse(date);
      if (isNaN(parsed)) {
        warnings.push({
          type: 'invalid_date',
          message: `Invalid date format: ${date}`,
          field: 'date',
        });
      } else if (parsed > Date.now()) {
        warnings.push({
          type: 'future_date',
          message: 'Publication date is in the future',
          field: 'date',
        });
      }
    }

    // ステータスを決定
    let status: 'valid' | 'warning' | 'error';
    let label: string | null = null;

    if (errors.length > 0) {
      status = 'error';
      if (labelUnverified) {
        label = this.CITATION_ERROR_LABELS.UNVERIFIED;
      }
    } else if (warnings.length > 0) {
      status = 'warning';
      if (labelUnverified && warnings.some(w => w.type === 'missing_url' || w.type === 'missing_author')) {
        label = this.CITATION_ERROR_LABELS.METADATA_MISSING;
      }
    } else {
      status = 'valid';
    }

    // ラベル付きフォーマットを生成
    let labeledFormatted: string | undefined;
    if (label && status !== 'error') {
      const source = this.normalizeSource(input);
      const style: CitationStyle = 'apa';
      const baseFormatted = this.formatCitation(source, style);
      const reason = includeReason && warnings.length > 0
        ? ` (理由: ${warnings.map(w => w.message).join(', ')})`
        : '';
      labeledFormatted = `${label} ${baseFormatted}${reason}`;
    }

    return {
      source: input,
      status,
      errors,
      warnings,
      label,
      labeledFormatted,
    };
  }

  /**
   * URL検証付きの引用生成（非同期）
   * @since 1.0.0
   * @requirement REQ-EXT-CIT-004
   * @description URLにアクセスできない場合は「[未検証]」ラベルを付与
   */
  async generateWithUrlVerification(
    input: Source | SourceInput | (Source | SourceInput)[],
    styleOrOptions: CitationStyle | CitationOptions = 'apa',
    options?: {
      timeout?: number;
      retryCount?: number;
      labelInaccessible?: boolean;
    }
  ): Promise<CitationWithVerificationResult> {
    const timeout = options?.timeout ?? 3000;
    const retryCount = options?.retryCount ?? 1;
    const labelInaccessible = options?.labelInaccessible ?? true;

    const style = typeof styleOrOptions === 'string' 
      ? styleOrOptions 
      : (styleOrOptions.format ?? 'apa');

    const sources = Array.isArray(input) ? input : [input];
    const results: VerificationResultDetail[] = [];

    for (const source of sources) {
      const url = this.isSource(source) ? source.url : (source as SourceInput).url;
      
      if (!url) {
        // URLがない場合
        const normalized = this.normalizeSource(source);
        const formatted = this.formatCitation(normalized, style);
        results.push({
          source,
          formatted,
          labeledFormatted: null,
          urlVerification: null,
          status: 'no_url',
        });
        continue;
      }

      // URL検証を実行（リトライ付き）
      let verification: UrlVerificationResult | null = null;
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        verification = await this.verifyUrlWithTimeout(url, timeout);
        if (verification.accessible) break;
      }

      const normalized = this.normalizeSource(source);
      const formatted = this.formatCitation(normalized, style);
      
      if (verification?.accessible) {
        results.push({
          source,
          formatted,
          labeledFormatted: null,
          urlVerification: verification,
          status: 'verified',
        });
      } else {
        const label = labelInaccessible ? this.CITATION_ERROR_LABELS.URL_INACCESSIBLE : null;
        const labeledFormatted = label ? `${label} ${formatted}` : formatted;
        results.push({
          source,
          formatted,
          labeledFormatted,
          urlVerification: verification,
          status: 'unverified',
        });
      }
    }

    // 結合したフォーマット済み文字列を生成
    const formattedEntries = results.map(r => r.labeledFormatted ?? r.formatted);
    const combinedFormatted = formattedEntries.join('\n\n');

    return {
      formatted: combinedFormatted,
      results,
      totalCount: results.length,
      verifiedCount: results.filter(r => r.status === 'verified').length,
      unverifiedCount: results.filter(r => r.status === 'unverified').length,
      noUrlCount: results.filter(r => r.status === 'no_url').length,
    };
  }

  /**
   * タイムアウト付きURL検証
   */
  private async verifyUrlWithTimeout(url: string, timeout: number): Promise<UrlVerificationResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD', // HEAD リクエストで高速化
        headers: {
          'User-Agent': 'KATASHIRO-CitationVerifier/1.0.0',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      return {
        url,
        accessible: response.ok,
        title: null, // HEADリクエストではタイトル取得不可
        statusCode: response.status,
        responseTimeMs,
        checkedAt: new Date(),
        finalUrl: response.url !== url ? response.url : undefined,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Timeout: Request exceeded ${timeout}ms`;
        } else {
          errorMessage = error.message;
        }
      }

      return {
        url,
        accessible: false,
        title: null,
        error: errorMessage,
        responseTimeMs,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * 引用リストに未検証ラベルを一括付与
   * @since 1.0.0
   * @requirement REQ-EXT-CIT-004
   */
  labelUnverifiedCitations(
    citations: string[],
    unverifiedIndices: number[]
  ): string[] {
    const unverifiedSet = new Set(unverifiedIndices);
    return citations.map((citation, index) => {
      if (unverifiedSet.has(index)) {
        return `${this.CITATION_ERROR_LABELS.UNVERIFIED} ${citation}`;
      }
      return citation;
    });
  }
}

/**
 * 引用エラー処理オプション
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface CitationErrorOptions {
  /** 未検証ラベルを付与するか */
  labelUnverified?: boolean;
  /** エラー理由を含めるか */
  includeReason?: boolean;
}

/**
 * 引用エラー詳細
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface CitationErrorDetail {
  /** エラータイプ */
  type: 'invalid_url' | 'missing_url' | 'missing_title' | 'missing_author' | 'missing_date' | 'invalid_date' | 'future_date' | 'url_inaccessible';
  /** エラーメッセージ */
  message: string;
  /** 関連フィールド */
  field: 'url' | 'title' | 'author' | 'date';
}

/**
 * 引用エラー処理結果（単一）
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface CitationErrorResult {
  /** 元のソース */
  source: Source | SourceInput;
  /** ステータス */
  status: 'valid' | 'warning' | 'error';
  /** エラー一覧 */
  errors: CitationErrorDetail[];
  /** 警告一覧 */
  warnings: CitationErrorDetail[];
  /** 付与されたラベル */
  label: string | null;
  /** ラベル付きフォーマット */
  labeledFormatted?: string;
}

/**
 * 引用エラー処理結果（一括）
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface CitationWithErrors {
  /** フォーマット済み引用 */
  formatted: string;
  /** 各ソースの結果 */
  results: CitationErrorResult[];
  /** 総数 */
  totalCount: number;
  /** 有効数 */
  validCount: number;
  /** 警告数 */
  warningCount: number;
  /** エラー数 */
  errorCount: number;
}

/**
 * URL検証結果詳細
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface VerificationResultDetail {
  /** 元のソース */
  source: Source | SourceInput;
  /** フォーマット済み引用 */
  formatted: string;
  /** ラベル付きフォーマット（未検証の場合） */
  labeledFormatted: string | null;
  /** URL検証結果 */
  urlVerification: UrlVerificationResult | null;
  /** ステータス */
  status: 'verified' | 'unverified' | 'no_url';
}

/**
 * URL検証付き引用結果
 * @since 1.0.0
 * @requirement REQ-EXT-CIT-004
 */
export interface CitationWithVerificationResult {
  /** フォーマット済み引用（全体） */
  formatted: string;
  /** 各ソースの結果 */
  results: VerificationResultDetail[];
  /** 総数 */
  totalCount: number;
  /** 検証済み数 */
  verifiedCount: number;
  /** 未検証数 */
  unverifiedCount: number;
  /** URLなし数 */
  noUrlCount: number;
}
