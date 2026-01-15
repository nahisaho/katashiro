/**
 * DateExtractor - 日付抽出エクストラクター
 * @module consistency/extractors/DateExtractor
 * @see DES-KATASHIRO-004-DCC Section 5.2.1
 */

import type {
  ExtractedDate,
  DateFormat,
} from '../types.js';

/**
 * 日付抽出設定
 */
export interface DateExtractorConfig {
  /** 抽出対象の日付形式 */
  formats: DateFormat[];
  /** 無視するパターン */
  ignorePatterns?: RegExp[];
  /** 言語設定 */
  language: 'ja' | 'en' | 'auto';
}

/**
 * 日付抽出エクストラクター
 * 文書内から日付を抽出し、正規化を行う
 */
export class DateExtractor {
  private readonly config: DateExtractorConfig;

  // 日付抽出パターン
  private static readonly PATTERNS: Record<DateFormat, RegExp[]> = {
    iso8601: [
      /(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/g,
    ],
    japanese: [
      /(\d{4})[年](\d{1,2})[月](\d{1,2})[日]/g,
      /令和(\d{1,2})[年](\d{1,2})[月](\d{1,2})[日]/g,
      /平成(\d{1,2})[年](\d{1,2})[月](\d{1,2})[日]/g,
      /(\d{4})[年](\d{1,2})[月]/g,
    ],
    us: [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      /(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/g,
    ],
    eu: [
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,
    ],
    relative: [
      /(?:今日|本日|きょう)/g,
      /(?:明日|あす|あした)/g,
      /(?:昨日|きのう)/g,
      /(?:先週|今週|来週)/g,
      /(?:先月|今月|来月)/g,
      /(?:去年|今年|来年|昨年)/g,
    ],
  };

  constructor(config?: Partial<DateExtractorConfig>) {
    this.config = {
      formats: config?.formats ?? ['iso8601', 'japanese', 'relative'],
      ignorePatterns: config?.ignorePatterns ?? [],
      language: config?.language ?? 'ja',
    };
  }

  /**
   * 文書から日付を抽出する
   * @param content 抽出対象のコンテンツ
   * @param filePath ファイルパス
   * @returns 抽出された日付一覧
   */
  extract(content: string, filePath: string): ExtractedDate[] {
    const results: ExtractedDate[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;
      const lineNumber = lineIndex + 1;

      // 無視パターンにマッチする行はスキップ
      if (this.shouldIgnore(line)) continue;

      // 設定された各形式でパターンマッチング
      for (const format of this.config.formats) {
        const patterns = DateExtractor.PATTERNS[format];
        if (!patterns) continue;

        for (const pattern of patterns) {
          pattern.lastIndex = 0;

          let match: RegExpExecArray | null;
          while ((match = pattern.exec(line)) !== null) {
            const rawValue = match[0];
            const column = match.index;
            const label = this.extractLabel(lines, lineIndex, column);
            const parsedDate = this.parseDate(rawValue, format, match);

            const extracted: ExtractedDate = {
              rawValue,
              format,
              parsedDate,
              label,
              location: {
                file: filePath,
                line: lineNumber,
                column,
              },
            };

            results.push(extracted);
          }
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
   * 日付をパースする
   */
  private parseDate(rawValue: string, format: DateFormat, match: RegExpExecArray): Date | undefined {
    try {
      switch (format) {
        case 'iso8601': {
          const year = match[1] ?? '';
          const month = match[2] ?? '';
          const day = match[3] ?? '';
          if (year && month && day) {
            return new Date(`${year}-${month}-${day}`);
          }
          break;
        }
        case 'japanese': {
          // 令和・平成の処理
          if (rawValue.includes('令和')) {
            const reiwaYear = parseInt(match[1] ?? '0', 10);
            const year = 2018 + reiwaYear;
            const month = (match[2] ?? '01').padStart(2, '0');
            const day = (match[3] ?? '01').padStart(2, '0');
            return new Date(`${year}-${month}-${day}`);
          } else if (rawValue.includes('平成')) {
            const heiseiYear = parseInt(match[1] ?? '0', 10);
            const year = 1988 + heiseiYear;
            const month = (match[2] ?? '01').padStart(2, '0');
            const day = (match[3] ?? '01').padStart(2, '0');
            return new Date(`${year}-${month}-${day}`);
          } else {
            // 西暦表記
            const year = match[1] ?? '';
            const month = (match[2] ?? '01').padStart(2, '0');
            const day = (match[3] ?? '01').padStart(2, '0');
            if (year) {
              return new Date(`${year}-${month}-${day}`);
            }
          }
          break;
        }
        case 'us': {
          const month = (match[1] ?? '01').padStart(2, '0');
          const day = (match[2] ?? '01').padStart(2, '0');
          let year = match[3] ?? '';
          if (year.length === 2) {
            year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
          }
          if (year) {
            return new Date(`${year}-${month}-${day}`);
          }
          break;
        }
        case 'eu': {
          const day = (match[1] ?? '01').padStart(2, '0');
          const month = (match[2] ?? '01').padStart(2, '0');
          const year = match[3] ?? '';
          if (year) {
            return new Date(`${year}-${month}-${day}`);
          }
          break;
        }
        case 'relative':
          // 相対日付は現在日時からの計算が必要だが、ここではundefinedを返す
          return undefined;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  /**
   * ラベル（関連する見出しやキー）を抽出する
   */
  private extractLabel(lines: string[], currentLineIndex: number, column: number): string | undefined {
    const currentLine = lines[currentLineIndex];
    if (!currentLine) return undefined;

    // 同じ行の前に `:` や `：` がある場合、その前をラベルとして抽出
    const beforeMatch = currentLine.substring(0, column).match(/([^:：\s,、。]+)\s*[:：]?\s*$/);
    if (beforeMatch?.[1] && beforeMatch[1].length > 1) {
      return beforeMatch[1].trim();
    }

    // 同じ行の後ろを確認
    const afterPart = currentLine.substring(column);
    const afterMatch = afterPart.match(/^\S+\s*[:：]?\s*([^:：\s,、。]+)/);
    if (afterMatch?.[1] && afterMatch[1].length > 1) {
      return afterMatch[1].trim();
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
