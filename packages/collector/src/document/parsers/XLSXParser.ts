/**
 * XLSXパーサー
 *
 * @design DES-COLLECT-003 §2.3
 * @task TASK-001-5
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
  TableData,
  TableRow,
  TableCell,
  SheetInfo,
} from '../types.js';
import { DEFAULT_PARSE_OPTIONS } from '../types.js';

// xlsx types
interface WorkBook {
  SheetNames: string[];
  Sheets: Record<string, WorkSheet>;
  Props?: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    CreatedDate?: Date;
    ModifiedDate?: Date;
  };
}

interface WorkSheet {
  '!ref'?: string;
  '!merges'?: Array<{
    s: { r: number; c: number };
    e: { r: number; c: number };
  }>;
  [key: string]: unknown;
}

interface CellObject {
  v?: string | number | boolean | Date;
  t?: 's' | 'n' | 'b' | 'd' | 'e';
  f?: string;
  w?: string;
}

interface XLSXModule {
  read: (data: Buffer, options?: { type: string }) => WorkBook;
  utils: {
    decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (cell: { r: number; c: number }) => string;
    sheet_to_json: <T>(sheet: WorkSheet, options?: { header?: number | 'A' }) => T[];
  };
}

/**
 * XLSXパーサー実装
 *
 * @example
 * ```typescript
 * const parser = new XLSXParser();
 * const result = await parser.parse('./data.xlsx');
 * ```
 */
export class XLSXParser implements IDocumentParser {
  private xlsx: XLSXModule | null = null;

  private async loadXLSX(): Promise<XLSXModule> {
    if (!this.xlsx) {
      try {
        // @ts-expect-error: xlsx is optional dependency
        this.xlsx = (await import('xlsx')) as unknown as XLSXModule;
      } catch {
        throw new Error('xlsx is not installed. Run: npm install xlsx');
      }
    }
    return this.xlsx;
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
      const xlsx = await this.loadXLSX();
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      // シートのフィルタリング
      let sheetNames = workbook.SheetNames;
      if (options.sheetNames && options.sheetNames.length > 0) {
        sheetNames = sheetNames.filter((name) => options.sheetNames!.includes(name));
      }

      const content = this.extractContent(workbook, sheetNames, xlsx);
      const structure = this.extractStructure(workbook, sheetNames);
      const metadata = this.extractMetadata(workbook, filename, buffer.length, sheetNames);
      const sheets = this.extractSheetInfo(workbook, sheetNames, xlsx);

      const result: ParsedDocument = {
        content,
        structure,
        metadata,
        sheets,
      };

      // テーブル抽出
      if (mergedOptions.extractTables) {
        result.tables = this.extractTables(workbook, sheetNames, xlsx);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';

      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return err({
          code: 'PASSWORD_PROTECTED',
          message: 'XLSX is password protected',
          details: error,
        });
      }

      if (
        errorMessage.includes('Invalid') ||
        errorMessage.includes('corrupt') ||
        errorMessage.includes('not a valid')
      ) {
        return err({
          code: 'CORRUPTED_FILE',
          message: 'XLSX file is corrupted or invalid',
          details: error,
        });
      }

      return err({
        code: 'PARSE_ERROR',
        message: `Failed to parse XLSX: ${errorMessage}`,
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
    return [
      {
        extension: '.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Excel Spreadsheet',
      },
    ];
  }

  isSupported(filename: string): boolean {
    return filename.toLowerCase().endsWith('.xlsx');
  }

  /**
   * コンテンツを抽出（テキスト形式）
   */
  private extractContent(workbook: WorkBook, sheetNames: string[], xlsx: XLSXModule): string {
    const parts: string[] = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      parts.push(`=== ${sheetName} ===`);

      const rows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      for (const row of rows) {
        if (Array.isArray(row)) {
          const line = row.map((cell) => String(cell ?? '')).join('\t');
          if (line.trim()) {
            parts.push(line);
          }
        }
      }

      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * 構造を抽出
   */
  private extractStructure(_workbook: WorkBook, sheetNames: string[]): DocumentStructure {
    const headings: Heading[] = sheetNames.map((name, index) => ({
      level: 1,
      text: name,
      position: index,
    }));

    const paragraphs: Paragraph[] = [];
    const sections: Section[] = sheetNames.map((name) => ({
      title: name,
      content: `Sheet: ${name}`,
      start: 0,
      end: 0,
    }));

    return {
      headings,
      paragraphs,
      sections,
    };
  }

  /**
   * メタデータを抽出
   */
  private extractMetadata(
    workbook: WorkBook,
    filename: string,
    fileSize: number,
    sheetNames: string[]
  ): DocumentMetadata {
    const props = workbook.Props || {};

    return {
      filename,
      fileSize,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      title: props.Title,
      author: props.Author,
      subject: props.Subject,
      keywords: props.Keywords ? props.Keywords.split(/[,;]/).map((k) => k.trim()) : undefined,
      createdAt: props.CreatedDate,
      modifiedAt: props.ModifiedDate,
      pageCount: sheetNames.length,
    };
  }

  /**
   * シート情報を抽出
   */
  private extractSheetInfo(
    workbook: WorkBook,
    sheetNames: string[],
    xlsx: XLSXModule
  ): SheetInfo[] {
    return sheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name];
      let rowCount = 0;
      let columnCount = 0;

      if (sheet && sheet['!ref']) {
        const range = xlsx.utils.decode_range(sheet['!ref']);
        rowCount = range.e.r - range.s.r + 1;
        columnCount = range.e.c - range.s.c + 1;
      }

      return {
        name,
        index,
        rowCount,
        columnCount,
        isHidden: false,
      };
    });
  }

  /**
   * テーブルデータを抽出
   */
  private extractTables(workbook: WorkBook, sheetNames: string[], xlsx: XLSXModule): TableData[] {
    const tables: TableData[] = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !sheet['!ref']) continue;

      const range = xlsx.utils.decode_range(sheet['!ref']);
      const rows: TableRow[] = [];
      const headers: string[] = [];

      // ヘッダー行を取得
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r: range.s.r, c });
        const cell = sheet[cellAddress] as CellObject | undefined;
        headers.push(cell?.w || cell?.v?.toString() || '');
      }

      // データ行を取得
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const cells: TableCell[] = [];

        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = xlsx.utils.encode_cell({ r, c });
          const cell = sheet[cellAddress] as CellObject | undefined;

          if (cell) {
            cells.push(this.convertCell(cell));
          } else {
            cells.push({ value: null, type: 'empty' });
          }
        }

        // 空行でなければ追加
        if (cells.some((c) => c.value !== null && c.value !== '')) {
          rows.push({ cells });
        }
      }

      tables.push({
        id: `sheet-${sheetName}`,
        name: sheetName,
        headers,
        rows,
        position: 0,
        sheetName,
      });
    }

    return tables;
  }

  /**
   * セルを変換
   */
  private convertCell(cell: CellObject): TableCell {
    const type = this.getCellType(cell.t);
    const value = cell.v ?? null;

    return {
      value: value instanceof Date ? value.toISOString() : value,
      type,
      formula: cell.f,
    };
  }

  /**
   * セルタイプを変換
   */
  private getCellType(t?: string): TableCell['type'] {
    switch (t) {
      case 's':
        return 'string';
      case 'n':
        return 'number';
      case 'b':
        return 'boolean';
      case 'd':
        return 'date';
      case 'e':
        return 'string'; // error as string
      default:
        return 'string';
    }
  }
}
