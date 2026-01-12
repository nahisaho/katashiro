/**
 * ドキュメントパーサー
 *
 * @design DES-COLLECT-003 §2.3
 * @task TASK-001-2
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { err, type Result } from '@nahisaho/katashiro-core';
import { PDFParser } from './parsers/PDFParser.js';
import { DOCXParser } from './parsers/DOCXParser.js';
import { XLSXParser } from './parsers/XLSXParser.js';
import type {
  IDocumentParser,
  ParsedDocument,
  DocumentError,
  ParseOptions,
  SupportedFormat,
} from './types.js';
import { DEFAULT_PARSE_OPTIONS } from './types.js';

/**
 * ドキュメントパーサーのファサード
 *
 * PDF、Word（DOCX）、Excel（XLSX）ファイルからテキストと構造を抽出します。
 *
 * @example
 * ```typescript
 * import { DocumentParser, isOk } from '@nahisaho/katashiro-collector';
 *
 * const parser = new DocumentParser();
 *
 * // PDFを解析
 * const result = await parser.parse('./document.pdf');
 * if (isOk(result)) {
 *   console.log(result.value.content);
 *   console.log(result.value.structure.headings);
 * }
 *
 * // Excelを解析（特定シートのみ）
 * const excelResult = await parser.parse('./data.xlsx', {
 *   sheetNames: ['Sheet1', 'Summary'],
 *   extractTables: true,
 * });
 *
 * // バッファから解析
 * const buffer = await fs.readFile('./document.pdf');
 * const bufferResult = await parser.parseBuffer(buffer, 'document.pdf');
 * ```
 */
export class DocumentParser implements IDocumentParser {
  private parsers: Map<string, IDocumentParser>;

  constructor() {
    this.parsers = new Map();
    this.registerDefaultParsers();
  }

  /**
   * デフォルトパーサーを登録
   */
  private registerDefaultParsers(): void {
    const pdfParser = new PDFParser();
    const docxParser = new DOCXParser();
    const xlsxParser = new XLSXParser();

    // 拡張子でマッピング
    this.parsers.set('.pdf', pdfParser);
    this.parsers.set('.docx', docxParser);
    this.parsers.set('.xlsx', xlsxParser);
  }

  /**
   * カスタムパーサーを登録
   *
   * @param extension - ファイル拡張子（例: '.pptx'）
   * @param parser - パーサー実装
   */
  registerParser(extension: string, parser: IDocumentParser): void {
    this.parsers.set(extension.toLowerCase(), parser);
  }

  /**
   * ファイルパスからドキュメントを解析
   *
   * @param filePath - ファイルの絶対または相対パス
   * @param options - パースオプション
   * @returns 解析結果またはエラー
   */
  async parse(
    filePath: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };

    // ファイル存在確認
    try {
      await fs.access(filePath);
    } catch {
      return err({
        code: 'FILE_NOT_FOUND',
        message: `File not found: ${filePath}`,
        filePath,
      });
    }

    // ファイルサイズ確認
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      return err({
        code: 'PERMISSION_DENIED',
        message: `Cannot access file: ${filePath}`,
        filePath,
        details: error,
      });
    }

    if (stats.size > mergedOptions.maxFileSize) {
      return err({
        code: 'FILE_TOO_LARGE',
        message: `File size ${stats.size} exceeds maximum ${mergedOptions.maxFileSize}`,
        filePath,
      });
    }

    // パーサー選択
    const ext = path.extname(filePath).toLowerCase();
    const parser = this.parsers.get(ext);

    if (!parser) {
      return err({
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format: ${ext}`,
        filePath,
      });
    }

    // タイムアウト付きで実行
    return this.withTimeout(parser.parse(filePath, mergedOptions), mergedOptions.timeout, filePath);
  }

  /**
   * バッファからドキュメントを解析
   *
   * @param buffer - ファイルのバイナリデータ
   * @param filename - ファイル名（MIME タイプ判定用）
   * @param options - パースオプション
   * @returns 解析結果またはエラー
   */
  async parseBuffer(
    buffer: Buffer,
    filename: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };

    if (buffer.length > mergedOptions.maxFileSize) {
      return err({
        code: 'FILE_TOO_LARGE',
        message: `Buffer size ${buffer.length} exceeds maximum ${mergedOptions.maxFileSize}`,
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const parser = this.parsers.get(ext);

    if (!parser) {
      return err({
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format: ${ext}`,
      });
    }

    return this.withTimeout(
      parser.parseBuffer(buffer, filename, mergedOptions),
      mergedOptions.timeout,
      filename
    );
  }

  /**
   * ストリームからドキュメントを解析
   *
   * @param stream - 読み取り可能ストリーム
   * @param filename - ファイル名
   * @param options - パースオプション
   * @returns 解析結果またはエラー
   */
  async parseStream(
    stream: NodeJS.ReadableStream,
    filename: string,
    options: ParseOptions = {}
  ): Promise<Result<ParsedDocument, DocumentError>> {
    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let resolved = false;

    return new Promise((resolve) => {
      stream.on('data', (chunk: Buffer) => {
        if (resolved) return;
        totalSize += chunk.length;
        if (totalSize > mergedOptions.maxFileSize) {
          resolved = true;
          // @ts-expect-error: destroy may not exist on all ReadableStream types
          if (typeof stream.destroy === 'function') stream.destroy();
          resolve(
            err({
              code: 'FILE_TOO_LARGE',
              message: `Stream size exceeds maximum ${mergedOptions.maxFileSize}`,
            })
          );
          return;
        }
        chunks.push(Buffer.from(chunk));
      });

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

  /**
   * サポートするファイル形式を取得
   */
  getSupportedFormats(): SupportedFormat[] {
    return [
      { extension: '.pdf', mimeType: 'application/pdf', description: 'PDF Document' },
      {
        extension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        description: 'Word Document',
      },
      {
        extension: '.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Excel Spreadsheet',
      },
    ];
  }

  /**
   * ファイルがサポートされているか確認
   */
  isSupported(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.parsers.has(ext);
  }

  /**
   * タイムアウト付きで実行
   */
  private async withTimeout<T>(
    promise: Promise<Result<T, DocumentError>>,
    timeout: number,
    filePath?: string
  ): Promise<Result<T, DocumentError>> {
    const timeoutPromise = new Promise<Result<T, DocumentError>>((resolve) => {
      setTimeout(() => {
        resolve(
          err({
            code: 'TIMEOUT',
            message: `Operation timed out after ${timeout}ms`,
            filePath,
          })
        );
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}
