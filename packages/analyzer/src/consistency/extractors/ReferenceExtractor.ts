/**
 * ReferenceExtractor - 参照抽出エクストラクター
 * @module consistency/extractors/ReferenceExtractor
 * @see DES-KATASHIRO-004-DCC Section 5.2.4
 */

import type {
  ExtractedReference,
  ReferenceType,
} from '../types.js';

/**
 * 参照抽出設定
 */
export interface ReferenceExtractorConfig {
  /** 対象ファイルパターン */
  filePatterns?: RegExp[];
  /** 外部URLを検出するか */
  detectExternalUrls: boolean;
  /** アンカーリンクを検出するか */
  detectAnchors: boolean;
}

/**
 * 参照抽出エクストラクター
 * ファイル間参照、URL、アンカーリンク等を抽出
 */
export class ReferenceExtractor {
  private readonly config: ReferenceExtractorConfig;

  // 参照パターン
  private static readonly PATTERNS = {
    // Markdown リンク: [text](url)
    markdownLink: /\[([^\]]*)\]\(([^)]+)\)/g,
    // Markdown 参照リンク: [text][ref] or [text]
    markdownRefLink: /\[([^\]]+)\](?:\[([^\]]*)\])?/g,
    // Markdown 参照定義: [ref]: url
    markdownRefDef: /^\[([^\]]+)\]:\s*(.+)$/gm,
    // 画像: ![alt](url)
    image: /!\[([^\]]*)\]\(([^)]+)\)/g,
    // HTML リンク: <a href="url">
    htmlLink: /<a[^>]+href=["']([^"']+)["'][^>]*>/gi,
    // HTML 画像: <img src="url">
    htmlImage: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
    // URL 直接記述
    rawUrl: /(?<![[(])https?:\/\/[^\s<>")\]]+/g,
    // ファイルパス参照
    filePath: /(?:\.{1,2}\/)?(?:[\w-]+\/)*[\w-]+\.\w+/g,
    // セクションリンク（アンカー）
    anchor: /#[\w-]+/g,
  };

  constructor(config?: Partial<ReferenceExtractorConfig>) {
    this.config = {
      filePatterns: config?.filePatterns,
      detectExternalUrls: config?.detectExternalUrls ?? true,
      detectAnchors: config?.detectAnchors ?? true,
    };
  }

  /**
   * 文書から参照を抽出する
   */
  extract(content: string, filePath: string): ExtractedReference[] {
    const results: ExtractedReference[] = [];
    const lines = content.split('\n');
    const refDefinitions = this.collectRefDefinitions(content);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;
      const lineNumber = lineIndex + 1;

      // Markdownリンクを抽出
      this.extractMarkdownLinks(line, lineNumber, filePath, results);

      // 画像リンクを抽出
      this.extractImageLinks(line, lineNumber, filePath, results);

      // HTMLリンクを抽出
      this.extractHtmlLinks(line, lineNumber, filePath, results);

      // 生URLを抽出
      if (this.config.detectExternalUrls) {
        this.extractRawUrls(line, lineNumber, filePath, results);
      }

      // アンカーリンクを抽出
      if (this.config.detectAnchors) {
        this.extractAnchors(line, lineNumber, filePath, results);
      }

      // 参照リンク [text][ref] を解決
      this.extractRefLinks(line, lineNumber, filePath, refDefinitions, results);
    }

    // 重複を除去
    return this.deduplicateReferences(results);
  }

  /**
   * 参照定義を収集
   */
  private collectRefDefinitions(content: string): Map<string, string> {
    const definitions = new Map<string, string>();
    const pattern = ReferenceExtractor.PATTERNS.markdownRefDef;
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const refId = match[1]?.toLowerCase() ?? '';
      const url = match[2]?.trim() ?? '';
      if (refId && url) {
        definitions.set(refId, url);
      }
    }

    return definitions;
  }

  /**
   * Markdownリンクを抽出
   */
  private extractMarkdownLinks(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedReference[],
  ): void {
    const pattern = new RegExp(ReferenceExtractor.PATTERNS.markdownLink.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const text = match[1] ?? '';
      const target = match[2] ?? '';
      if (!target) continue;

      const referenceType = this.determineReferenceType(target);

      // 外部URLの設定確認
      if (referenceType === 'external' && !this.config.detectExternalUrls) {
        continue;
      }

      results.push({
        type: referenceType,
        target,
        targetExists: undefined, // 後で検証
        linkText: text || undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 画像リンクを抽出
   */
  private extractImageLinks(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedReference[],
  ): void {
    const pattern = new RegExp(ReferenceExtractor.PATTERNS.image.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const alt = match[1] ?? '';
      const src = match[2] ?? '';
      if (!src) continue;

      const referenceType = this.determineReferenceType(src);

      results.push({
        type: referenceType,
        target: src,
        targetExists: undefined,
        linkText: alt || undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * HTMLリンクを抽出
   */
  private extractHtmlLinks(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedReference[],
  ): void {
    const linkPattern = new RegExp(ReferenceExtractor.PATTERNS.htmlLink.source, 'gi');
    const imagePattern = new RegExp(ReferenceExtractor.PATTERNS.htmlImage.source, 'gi');

    // <a href="...">
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(line)) !== null) {
      const href = match[1] ?? '';
      if (!href) continue;

      results.push({
        type: this.determineReferenceType(href),
        target: href,
        targetExists: undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }

    // <img src="...">
    while ((match = imagePattern.exec(line)) !== null) {
      const src = match[1] ?? '';
      if (!src) continue;

      results.push({
        type: this.determineReferenceType(src),
        target: src,
        targetExists: undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 生URLを抽出
   */
  private extractRawUrls(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedReference[],
  ): void {
    const pattern = new RegExp(ReferenceExtractor.PATTERNS.rawUrl.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const url = match[0];
      if (!url) continue;

      // 既に抽出済みのURLはスキップ
      const alreadyExtracted = results.some(
        (r) => r.target === url && r.location.line === lineNumber,
      );
      if (alreadyExtracted) continue;

      results.push({
        type: 'external',
        target: url,
        targetExists: undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * アンカーリンクを抽出
   */
  private extractAnchors(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedReference[],
  ): void {
    // Markdownリンク内のアンカーは既に抽出済みなのでスキップ
    // 独立したアンカー参照のみ対象
    const anchorPattern = /(?<!\()#[\w-]+(?!\))/g;

    let match: RegExpExecArray | null;
    while ((match = anchorPattern.exec(line)) !== null) {
      const anchor = match[0];
      if (!anchor) continue;

      results.push({
        type: 'section',
        target: anchor,
        targetExists: undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 参照リンク [text][ref] を解決
   */
  private extractRefLinks(
    line: string,
    lineNumber: number,
    filePath: string,
    refDefinitions: Map<string, string>,
    results: ExtractedReference[],
  ): void {
    // 通常のMarkdownリンクはスキップ（既に抽出済み）
    // 参照リンク [text][ref] のみ対象
    const pattern = /\[([^\]]+)\]\[([^\]]+)\]/g;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const text = match[1] ?? '';
      const refId = (match[2] ?? '').toLowerCase();
      if (!refId) continue;

      const target = refDefinitions.get(refId);
      if (!target) continue;

      results.push({
        type: this.determineReferenceType(target),
        target,
        targetExists: undefined,
        linkText: text || undefined,
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 参照タイプを判定
   */
  private determineReferenceType(target: string): ReferenceType {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return 'external';
    }
    if (target.startsWith('#')) {
      return 'section';
    }
    if (target.startsWith('mailto:')) {
      return 'external';
    }
    // ファイルパスと判断
    return 'file';
  }

  /**
   * 参照の重複を除去
   */
  private deduplicateReferences(references: ExtractedReference[]): ExtractedReference[] {
    const seen = new Set<string>();
    const unique: ExtractedReference[] = [];

    for (const ref of references) {
      const key = `${ref.target}:${ref.location.line}:${ref.location.column}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }

    return unique;
  }
}
