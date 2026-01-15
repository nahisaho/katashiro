/**
 * NumericExtractor - 数値抽出エクストラクター
 * @module consistency/extractors/NumericExtractor
 * @see DES-KATASHIRO-004-DCC Section 5.2.1
 */

import type {
  ExtractedNumeric,
  NumericFormat,
} from '../types.js';

/**
 * 数値抽出設定
 */
export interface NumericExtractorConfig {
  /** 抽出対象の数値形式 */
  formats: NumericFormat[];
  /** 無視するパターン */
  ignorePatterns?: RegExp[];
}

/**
 * 数値抽出エクストラクター
 * 文書内から数値を抽出し、正規化を行う
 */
export class NumericExtractor {
  private readonly config: NumericExtractorConfig;

  // 数値抽出パターン
  private static readonly PATTERNS: Record<NumericFormat, RegExp> = {
    integer: /(?<!\d)([+-]?\d{1,3}(?:,\d{3})*|\d+)(?!\d|\.)/g,
    decimal: /(?<!\d)([+-]?\d{1,3}(?:,\d{3})*\.\d+|\d+\.\d+)(?!\d)/g,
    percentage: /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*[%％]/g,
    currency: /[¥$€£]\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)|([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:円|万円|億円|ドル|ユーロ)/g,
    scientific: /([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)/g,
  };

  constructor(config?: Partial<NumericExtractorConfig>) {
    this.config = {
      formats: config?.formats ?? ['integer', 'decimal', 'percentage', 'currency'],
      ignorePatterns: config?.ignorePatterns ?? [],
    };
  }

  /**
   * 文書から数値を抽出する
   * @param content 抽出対象のコンテンツ
   * @param filePath ファイルパス
   * @returns 抽出された数値一覧
   */
  extract(content: string, filePath: string): ExtractedNumeric[] {
    const results: ExtractedNumeric[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;
      const lineNumber = lineIndex + 1;

      // 無視パターンにマッチする行はスキップ
      if (this.shouldIgnore(line)) continue;

      // 設定された各形式でパターンマッチング
      for (const format of this.config.formats) {
        const pattern = NumericExtractor.PATTERNS[format];
        if (!pattern) continue;

        // パターンをリセット
        const localPattern = new RegExp(pattern.source, 'g');

        let match: RegExpExecArray | null;
        while ((match = localPattern.exec(line)) !== null) {
          const rawValue = match[0];
          const value = this.parseValue(rawValue, format);
          const unit = this.extractUnit(rawValue, format);
          const label = this.extractLabel(lines, lineIndex, match.index);

          results.push({
            rawValue,
            value,
            unit,
            format,
            label,
            location: {
              file: filePath,
              line: lineNumber,
              column: match.index,
            },
          });
        }
      }
    }

    return results;
  }

  /**
   * 無視すべき行かどうかを判定
   */
  private shouldIgnore(line: string): boolean {
    if (!this.config.ignorePatterns) return false;
    for (const pattern of this.config.ignorePatterns) {
      if (pattern.test(line)) return true;
    }
    return false;
  }

  /**
   * 文字列から数値をパースする
   */
  private parseValue(rawValue: string, format: NumericFormat): number {
    // カンマ、通貨記号、単位を除去
    let cleaned = rawValue
      .replace(/[,，]/g, '')
      .replace(/[¥$€£]/g, '')
      .replace(/円|万円|億円|ドル|ユーロ/g, '')
      .replace(/[%％]/g, '')
      .trim();

    // 「万」「億」の変換
    if (rawValue.includes('万円')) {
      const num = parseFloat(cleaned);
      return num * 10000;
    }
    if (rawValue.includes('億円')) {
      const num = parseFloat(cleaned);
      return num * 100000000;
    }

    // 科学記法
    if (format === 'scientific') {
      return parseFloat(cleaned);
    }

    return parseFloat(cleaned);
  }

  /**
   * 単位を抽出する
   */
  private extractUnit(rawValue: string, format: NumericFormat): string | undefined {
    switch (format) {
      case 'percentage':
        return '%';
      case 'currency':
        if (rawValue.includes('¥') || rawValue.includes('円')) return '円';
        if (rawValue.includes('万円')) return '万円';
        if (rawValue.includes('億円')) return '億円';
        if (rawValue.includes('$') || rawValue.includes('ドル')) return '$';
        if (rawValue.includes('€') || rawValue.includes('ユーロ')) return '€';
        if (rawValue.includes('£')) return '£';
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * ラベル（関連する見出しやキー）を抽出する
   */
  private extractLabel(lines: string[], currentLineIndex: number, column: number): string | undefined {
    const currentLine = lines[currentLineIndex];
    if (!currentLine) return undefined;

    // 同じ行の前に `:` や `：` がある場合、その前をラベルとして抽出
    const beforeMatch = currentLine.substring(0, column).match(/([^:：\s,、。]+)\s*[:：]\s*$/);
    if (beforeMatch?.[1] && beforeMatch[1].length > 1) {
      return beforeMatch[1].trim();
    }

    // 上の行に見出し（#）がある場合
    for (let i = currentLineIndex - 1; i >= Math.max(0, currentLineIndex - 3); i--) {
      const prevLine = lines[i];
      if (!prevLine) continue;
      const headingMatch = prevLine.match(/^#+\s+(.+)/);
      if (headingMatch?.[1]) {
        return headingMatch[1].trim();
      }
    }

    return undefined;
  }
}
