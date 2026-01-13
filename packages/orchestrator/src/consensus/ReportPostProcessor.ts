/**
 * KATASHIRO v1.3.0 - ReportPostProcessor
 * レポート後処理（ASCII図変換）を担当
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.3.0
 */

import type {
  PostProcessorOptions,
  PostProcessResult,
  ConversionRecord,
  AsciiDiagram,
} from './types';
import { DEFAULT_POST_PROCESSOR_OPTIONS } from './types';
import { AsciiDiagramConverter } from './AsciiDiagramConverter';

/**
 * レポート後処理クラス
 * @requirement REQ-1.3.0-VIS-002
 */
export class ReportPostProcessor {
  private readonly options: PostProcessorOptions;
  private readonly converter: AsciiDiagramConverter;

  /**
   * コンストラクタ
   * @param options 後処理オプション
   */
  constructor(options?: Partial<PostProcessorOptions>) {
    this.options = { ...DEFAULT_POST_PROCESSOR_OPTIONS, ...options };
    this.converter = new AsciiDiagramConverter();
  }

  /**
   * レポートを後処理
   * @param report 入力レポート
   * @returns 後処理結果
   */
  process(report: string): PostProcessResult {
    const startTime = Date.now();
    const conversions: ConversionRecord[] = [];
    const warnings: string[] = [];

    // 後処理が無効な場合はそのまま返す
    if (!this.options.enabled) {
      return {
        processedReport: report,
        conversions: [],
        warnings: [],
        processingTimeMs: Date.now() - startTime,
      };
    }

    // ASCII図を検出
    const diagrams = this.converter.detect(report);

    if (diagrams.length === 0) {
      return {
        processedReport: report,
        conversions: [],
        warnings: [],
        processingTimeMs: Date.now() - startTime,
      };
    }

    // 変換処理（後ろから置換して位置ずれを防ぐ）
    let processedReport = report;
    const sortedDiagrams = [...diagrams].sort((a, b) => b.startIndex - a.startIndex);

    for (const diagram of sortedDiagrams) {
      const record = this.convertDiagram(diagram);
      conversions.unshift(record); // 順番を元に戻す

      if (record.success) {
        // 変換成功: 置換
        const before = processedReport.slice(0, diagram.startIndex);
        const after = processedReport.slice(diagram.endIndex);

        if (this.options.preserveOriginal) {
          // 元の図も保持
          processedReport =
            before +
            `<!-- Original ASCII diagram preserved -->\n` +
            `\`\`\`\n${diagram.original}\n\`\`\`\n\n` +
            record.converted +
            after;
        } else {
          processedReport = before + record.converted + after;
        }
      } else {
        // 変換失敗
        warnings.push(
          `Line ${diagram.lineNumber}: Failed to convert ${diagram.type} diagram - ${record.errorMessage}`
        );

        if (this.options.strictMode) {
          throw new Error(
            `Failed to convert ${diagram.type} diagram at line ${diagram.lineNumber}: ${record.errorMessage}`
          );
        }
      }
    }

    return {
      processedReport,
      conversions,
      warnings,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * ASCII図を検出
   * @param text 入力テキスト
   * @returns 検出されたASCII図配列
   */
  detectAsciiDiagrams(text: string): AsciiDiagram[] {
    return this.converter.detect(text);
  }

  /**
   * ASCII図をMermaidに変換
   * @param diagram ASCII図
   * @returns Mermaid形式の文字列
   */
  convertToMermaid(diagram: AsciiDiagram): string {
    return this.converter.convertToMermaid(diagram);
  }

  /**
   * ASCII図をMarkdownに変換
   * @param diagram ASCII図
   * @returns Markdown形式の文字列
   */
  convertToMarkdownTable(diagram: AsciiDiagram): string {
    return this.converter.convertToMarkdown(diagram);
  }

  /**
   * 単一のASCII図を変換
   * @param diagram ASCII図
   * @returns 変換記録
   */
  private convertDiagram(diagram: AsciiDiagram): ConversionRecord {
    try {
      let converted: string;

      if (this.options.preferMermaid) {
        // Mermaid優先
        converted = this.converter.convertToMermaid(diagram);
      } else {
        // Markdown優先
        converted = this.converter.convertToMarkdown(diagram);
      }

      // 変換結果が元と同じ場合は失敗とみなす
      if (converted === diagram.original) {
        return {
          original: diagram.original,
          converted: diagram.original,
          type: diagram.type,
          success: false,
          errorMessage: 'Conversion produced no changes',
        };
      }

      return {
        original: diagram.original,
        converted,
        type: diagram.type,
        success: true,
      };
    } catch (error) {
      return {
        original: diagram.original,
        converted: diagram.original,
        type: diagram.type,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
