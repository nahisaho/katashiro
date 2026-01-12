/**
 * PDFパーサー
 *
 * @design DES-COLLECT-003 §2.3
 * @task TASK-001-3
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type {
  IDocumentParser,
  ParsedDocument,
  DocumentError,
  ParseOptions,
  SupportedFormat,
  DocumentStructure,
  DocumentMetadata,
  Heading,
  Paragraph,
  Section,
  PageInfo,
  TableData,
} from '../types.js';
import { DEFAULT_PARSE_OPTIONS } from '../types.js';

// pdf-parse types (dynamic import)
interface PDFData {
  numpages: number;
  numrender: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata: unknown;
  text: string;
  version: string;
}

/**
 * PDFパーサー実装
 *
 * @example
 * ```typescript
 * const parser = new PDFParser();
 * const result = await parser.parse('./document.pdf');
 * ```
 */
export class PDFParser implements IDocumentParser {
  private pdfParseModule: ((buffer: Buffer) => Promise<PDFData>) | null = null;

  private async loadPdfParse(): Promise<(buffer: Buffer) => Promise<PDFData>> {
    if (!this.pdfParseModule) {
      try {
        // @ts-expect-error: pdf-parse is optional dependency
        const module = await import('pdf-parse');
        this.pdfParseModule = module.default || module;
      } catch {
        throw new Error('pdf-parse is not installed. Run: npm install pdf-parse');
      }
    }
    return this.pdfParseModule!;
  }

  async parse(
    filePath: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const buffer = await fs.readFile(filePath);
      const filename = path.basename(filePath);
      return this.parseBuffer(buffer, filename, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return err({
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${filePath}`,
          filePath,
        });
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return err({
          code: 'PERMISSION_DENIED',
          message: `Permission denied: ${filePath}`,
          filePath,
        });
      }
      return err({
        code: 'PARSE_ERROR',
        message: `Failed to read file: ${(error as Error).message}`,
        filePath,
        details: error,
      });
    }
  }

  async parseBuffer(
    buffer: Buffer,
    filename: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };

    // サイズチェック
    if (buffer.length > mergedOptions.maxFileSize) {
      return err({
        code: 'FILE_TOO_LARGE',
        message: `File size ${buffer.length} exceeds maximum ${mergedOptions.maxFileSize}`,
      });
    }

    try {
      const pdfParse = await this.loadPdfParse();
      const data = await pdfParse(buffer);

      const content = data.text;
      const structure = this.extractStructure(content);
      const metadata = this.extractMetadata(data, filename, buffer.length);
      const pages = this.extractPages(content, data.numpages);

      const result: ParsedDocument = {
        content,
        structure,
        metadata,
        pages,
      };

      // テーブル抽出（オプション）
      if (mergedOptions.extractTables) {
        result.tables = this.extractTables(content);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';

      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return err({
          code: 'PASSWORD_PROTECTED',
          message: 'PDF is password protected',
          details: error,
        });
      }

      if (errorMessage.includes('Invalid') || errorMessage.includes('corrupt')) {
        return err({
          code: 'CORRUPTED_FILE',
          message: 'PDF file is corrupted or invalid',
          details: error,
        });
      }

      return err({
        code: 'PARSE_ERROR',
        message: `Failed to parse PDF: ${errorMessage}`,
        details: error,
      });
    }
  }

  async parseStream(
    stream: NodeJS.ReadableStream,
    filename: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (error) => {
        resolve(
          err({
            code: 'PARSE_ERROR',
            message: `Stream read error: ${error.message}`,
          })
        );
      });
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const result = await this.parseBuffer(buffer, filename, options);
        resolve(result);
      });
    });
  }

  getSupportedFormats(): SupportedFormat[] {
    return [{ extension: '.pdf', mimeType: 'application/pdf', description: 'PDF Document' }];
  }

  isSupported(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
  }

  /**
   * テキストから構造を抽出
   */
  private extractStructure(content: string): DocumentStructure {
    const headings = this.extractHeadings(content);
    const paragraphs = this.extractParagraphs(content);
    const sections = this.buildSections(content, headings);

    return {
      headings,
      paragraphs,
      sections,
    };
  }

  /**
   * 見出しを抽出（ヒューリスティック）
   */
  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    let position = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // 見出しパターンの検出
      // 1. 番号付き見出し (1. Title, 1.1 Subtitle, etc.)
      const numberedMatch = trimmed.match(/^(\d+\.)+\s*(.+)$/);
      if (numberedMatch) {
        const level = Math.min((numberedMatch[1]!.match(/\d+\./g) || []).length, 6);
        headings.push({
          level,
          text: numberedMatch[2]!.trim(),
          position,
        });
      }
      // 2. 大文字のみの短い行（見出しの可能性）
      else if (
        trimmed.length > 0 &&
        trimmed.length < 100 &&
        trimmed === trimmed.toUpperCase() &&
        /[A-Z]/.test(trimmed)
      ) {
        headings.push({
          level: 1,
          text: trimmed,
          position,
        });
      }

      position += line.length + 1;
    }

    return headings;
  }

  /**
   * 段落を抽出
   */
  private extractParagraphs(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const blocks = content.split(/\n\s*\n/);
    let position = 0;

    for (const block of blocks) {
      const trimmed = block.trim();
      if (trimmed.length > 0) {
        paragraphs.push({
          text: trimmed,
          start: position,
          end: position + trimmed.length,
        });
      }
      position += block.length + 2; // +2 for \n\n
    }

    return paragraphs;
  }

  /**
   * セクションを構築
   */
  private buildSections(content: string, headings: Heading[]): Section[] {
    if (headings.length === 0) {
      return [
        {
          title: 'Main Content',
          content,
          start: 0,
          end: content.length,
        },
      ];
    }

    const sections: Section[] = [];

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i]!;
      const nextHeading = headings[i + 1];
      const endPosition = nextHeading ? nextHeading.position : content.length;

      sections.push({
        title: heading.text,
        content: content.slice(heading.position, endPosition).trim(),
        start: heading.position,
        end: endPosition,
      });
    }

    return sections;
  }

  /**
   * メタデータを抽出
   */
  private extractMetadata(
    data: PDFData,
    filename: string,
    fileSize: number
  ): DocumentMetadata {
    const info = data.info || {};

    return {
      filename,
      fileSize,
      mimeType: 'application/pdf',
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      keywords: info.Keywords ? info.Keywords.split(/[,;]/).map((k) => k.trim()) : undefined,
      createdAt: info.CreationDate ? this.parsePdfDate(info.CreationDate) : undefined,
      modifiedAt: info.ModDate ? this.parsePdfDate(info.ModDate) : undefined,
      pageCount: data.numpages,
      characterCount: data.text.length,
      wordCount: data.text.split(/\s+/).filter((w) => w.length > 0).length,
    };
  }

  /**
   * PDFの日付形式をパース
   */
  private parsePdfDate(dateStr: string): Date | undefined {
    try {
      // PDF日付形式: D:YYYYMMDDHHmmSS+HH'mm' or similar
      const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
      if (match) {
        const [, year, month, day, hour = '0', min = '0', sec = '0'] = match;
        return new Date(
          parseInt(year!),
          parseInt(month!) - 1,
          parseInt(day!),
          parseInt(hour),
          parseInt(min),
          parseInt(sec)
        );
      }
      return new Date(dateStr);
    } catch {
      return undefined;
    }
  }

  /**
   * ページ情報を抽出
   */
  private extractPages(content: string, numPages: number): PageInfo[] {
    // pdf-parseは全テキストを連結するので、ページ境界は推定
    const avgPageLength = Math.ceil(content.length / numPages);
    const pages: PageInfo[] = [];

    for (let i = 0; i < numPages; i++) {
      const start = i * avgPageLength;
      const end = Math.min((i + 1) * avgPageLength, content.length);

      pages.push({
        pageNumber: i + 1,
        content: content.slice(start, end),
        startOffset: start,
        endOffset: end,
      });
    }

    return pages;
  }

  /**
   * テーブルを抽出（簡易実装）
   */
  private extractTables(content: string): TableData[] {
    const tables: TableData[] = [];
    const lines = content.split('\n');
    let tableId = 0;

    // タブ区切りまたはパイプ区切りの行を検出
    let currentTable: string[][] | null = null;
    let tableStart = 0;
    let position = 0;

    for (const line of lines) {
      const cells = line.split(/\t|\|/).map((c) => c.trim());

      if (cells.length > 1 && cells.some((c) => c.length > 0)) {
        if (!currentTable) {
          currentTable = [];
          tableStart = position;
        }
        currentTable.push(cells);
      } else if (currentTable && currentTable.length > 1) {
        // テーブル終了
        tables.push(this.buildTableData(currentTable, tableId++, tableStart));
        currentTable = null;
      }

      position += line.length + 1;
    }

    // 最後のテーブル
    if (currentTable && currentTable.length > 1) {
      tables.push(this.buildTableData(currentTable, tableId, tableStart));
    }

    return tables;
  }

  private buildTableData(data: string[][], id: number, position: number): TableData {
    const [headerRow, ...dataRows] = data;

    return {
      id: `table-${id}`,
      headers: headerRow,
      rows: dataRows.map((row) => ({
        cells: row.map((value) => ({
          value,
          type: 'string' as const,
        })),
      })),
      position,
    };
  }
}
