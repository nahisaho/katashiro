/**
 * TermExtractor - 用語抽出エクストラクター
 * @module consistency/extractors/TermExtractor
 * @see DES-KATASHIRO-004-DCC Section 5.2.3
 */

import type {
  ExtractedTerm,
} from '../types.js';

/**
 * 用語抽出設定
 */
export interface TermExtractorConfig {
  /** 用語辞書 */
  dictionary?: Map<string, string[]>;
  /** 大文字小文字を区別するか */
  caseSensitive: boolean;
  /** 最小用語長 */
  minLength: number;
  /** カスタム用語パターン */
  customPatterns?: RegExp[];
}

/**
 * 用語抽出エクストラクター
 * 技術用語、固有名詞、略語等を抽出
 */
export class TermExtractor {
  private readonly config: TermExtractorConfig;

  // 用語パターン
  private static readonly PATTERNS = {
    // 英語略語（2文字以上の大文字）
    acronym: /\b[A-Z]{2,}\b/g,
    // キャメルケース（技術用語）
    camelCase: /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,
    // スネークケース
    snakeCase: /\b[a-z]+(?:_[a-z]+)+\b/g,
    // ケバブケース
    kebabCase: /\b[a-z]+(?:-[a-z]+)+\b/g,
    // 日本語の固有名詞候補（カタカナ語）
    katakana: /[ァ-ヶー]{3,}/g,
    // 括弧で囲まれた用語
    parenthesized: /[（(]([^）)]+)[）)]/g,
    // 引用符で囲まれた用語
    quoted: /[「『"']([^」』"']+)[」』"']/g,
    // コードブロック内のコード（バッククォート）
    codeSpan: /`([^`]+)`/g,
  };

  constructor(config?: Partial<TermExtractorConfig>) {
    this.config = {
      dictionary: config?.dictionary,
      caseSensitive: config?.caseSensitive ?? false,
      minLength: config?.minLength ?? 2,
      customPatterns: config?.customPatterns,
    };
  }

  /**
   * 文書から用語を抽出する
   */
  extract(content: string, filePath: string): ExtractedTerm[] {
    const results: ExtractedTerm[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;
      const lineNumber = lineIndex + 1;

      // 各パターンで用語を抽出
      this.extractAcronyms(line, lineNumber, filePath, results);
      this.extractCamelCase(line, lineNumber, filePath, results);
      this.extractKatakana(line, lineNumber, filePath, results);
      this.extractQuoted(line, lineNumber, filePath, results);
      this.extractCodeSpans(line, lineNumber, filePath, results);

      // カスタムパターン
      if (this.config.customPatterns) {
        for (const pattern of this.config.customPatterns) {
          this.extractByPattern(line, lineNumber, filePath, pattern, results);
        }
      }
    }

    return results;
  }

  /**
   * 略語を抽出
   */
  private extractAcronyms(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedTerm[],
  ): void {
    const pattern = new RegExp(TermExtractor.PATTERNS.acronym.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const term = match[0];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'acronym',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * キャメルケースを抽出
   */
  private extractCamelCase(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedTerm[],
  ): void {
    const pattern = new RegExp(TermExtractor.PATTERNS.camelCase.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const term = match[0];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'technical',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * カタカナ語を抽出
   */
  private extractKatakana(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedTerm[],
  ): void {
    const pattern = new RegExp(TermExtractor.PATTERNS.katakana.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const term = match[0];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'loanword',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 引用された用語を抽出
   */
  private extractQuoted(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedTerm[],
  ): void {
    const pattern = new RegExp(TermExtractor.PATTERNS.quoted.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const term = match[1];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'quoted',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * コードスパンを抽出
   */
  private extractCodeSpans(
    line: string,
    lineNumber: number,
    filePath: string,
    results: ExtractedTerm[],
  ): void {
    const pattern = new RegExp(TermExtractor.PATTERNS.codeSpan.source, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const term = match[1];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'code',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * カスタムパターンで抽出
   */
  private extractByPattern(
    line: string,
    lineNumber: number,
    filePath: string,
    pattern: RegExp,
    results: ExtractedTerm[],
  ): void {
    const localPattern = new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g');

    let match: RegExpExecArray | null;
    while ((match = localPattern.exec(line)) !== null) {
      const term = match[0];
      if (!term || term.length < this.config.minLength) continue;

      results.push({
        rawValue: term,
        normalizedValue: this.normalize(term),
        category: 'custom',
        context: this.extractContext(line, match.index),
        location: {
          file: filePath,
          line: lineNumber,
          column: match.index,
        },
      });
    }
  }

  /**
   * 用語を正規化
   */
  private normalize(term: string): string {
    if (this.config.caseSensitive) {
      return term.trim();
    }
    return term.toLowerCase().trim();
  }

  /**
   * コンテキストを抽出
   */
  private extractContext(line: string, position: number): string {
    const contextLength = 50;
    const start = Math.max(0, position - contextLength);
    const end = Math.min(line.length, position + contextLength);
    let context = line.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < line.length) context = context + '...';

    return context;
  }
}
