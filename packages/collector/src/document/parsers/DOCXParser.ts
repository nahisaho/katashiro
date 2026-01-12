/**
 * DOCXパーサー
 *
 * @design DES-COLLECT-003 §2.3
 * @task TASK-001-4
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
  ImageReference,
} from '../types.js';
import { DEFAULT_PARSE_OPTIONS } from '../types.js';

// mammoth types
interface MammothResult {
  value: string;
  messages: Array<{ type: string; message: string }>;
}

interface MammothOptions {
  styleMap?: string[];
  includeDefaultStyleMap?: boolean;
}

interface MammothModule {
  extractRawText: (options: { buffer: Buffer }) => Promise<MammothResult>;
  convertToHtml: (options: { buffer: Buffer }, styleMap?: MammothOptions) => Promise<MammothResult>;
}

/**
 * DOCXパーサー実装
 *
 * @example
 * ```typescript
 * const parser = new DOCXParser();
 * const result = await parser.parse('./document.docx');
 * ```
 */
export class DOCXParser implements IDocumentParser {
  private mammoth: MammothModule | null = null;

  private async loadMammoth(): Promise<MammothModule> {
    if (!this.mammoth) {
      try {
        // @ts-expect-error: mammoth is optional dependency
        this.mammoth = (await import('mammoth')) as unknown as MammothModule;
      } catch {
        throw new Error('mammoth is not installed. Run: npm install mammoth');
      }
    }
    return this.mammoth;
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
      const mammoth = await this.loadMammoth();

      // テキスト抽出
      const textResult = await mammoth.extractRawText({ buffer });
      const content = textResult.value;

      // HTML変換（構造抽出用）
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const html = htmlResult.value;

      const structure = this.extractStructure(content, html);
      const metadata = this.extractMetadata(filename, buffer.length, content);

      const result: ParsedDocument = {
        content,
        structure,
        metadata,
      };

      // テーブル抽出
      if (mergedOptions.extractTables) {
        result.tables = this.extractTables(html);
      }

      // 画像抽出
      if (mergedOptions.extractImages) {
        result.images = this.extractImages(html);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';

      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return err({
          code: 'PASSWORD_PROTECTED',
          message: 'DOCX is password protected',
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
          message: 'DOCX file is corrupted or invalid',
          details: error,
        });
      }

      return err({
        code: 'PARSE_ERROR',
        message: `Failed to parse DOCX: ${errorMessage}`,
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
        extension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        description: 'Word Document',
      },
    ];
  }

  isSupported(filename: string): boolean {
    return filename.toLowerCase().endsWith('.docx');
  }

  /**
   * 構造を抽出
   */
  private extractStructure(content: string, html: string): DocumentStructure {
    const headings = this.extractHeadings(html);
    const paragraphs = this.extractParagraphs(content);
    const sections = this.buildSections(content, headings);

    return {
      headings,
      paragraphs,
      sections,
    };
  }

  /**
   * HTMLから見出しを抽出
   */
  private extractHeadings(html: string): Heading[] {
    const headings: Heading[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    let position = 0;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]!, 10);
      const text = this.stripHtml(match[2]!);

      headings.push({
        level,
        text,
        position,
      });
      position++;
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
      position += block.length + 2;
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
    const lines = content.split('\n');

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i]!;
      const nextHeading = headings[i + 1];

      // 見出しテキストを含む行を探す
      let startLine = 0;
      let endLine = lines.length;

      for (let j = 0; j < lines.length; j++) {
        if (lines[j]!.includes(heading.text)) {
          startLine = j;
          break;
        }
      }

      if (nextHeading) {
        for (let j = startLine + 1; j < lines.length; j++) {
          if (lines[j]!.includes(nextHeading.text)) {
            endLine = j;
            break;
          }
        }
      }

      const sectionContent = lines.slice(startLine, endLine).join('\n');
      const start = lines.slice(0, startLine).join('\n').length;
      const end = start + sectionContent.length;

      sections.push({
        title: heading.text,
        content: sectionContent,
        start,
        end,
      });
    }

    return sections;
  }

  /**
   * HTMLからテーブルを抽出
   */
  private extractTables(html: string): TableData[] {
    const tables: TableData[] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let tableId = 0;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1]!;
      const rows: string[][] = [];

      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1]!;
        const cells: string[] = [];

        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(this.stripHtml(cellMatch[1]!));
        }

        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        const [headerRow, ...dataRows] = rows;

        tables.push({
          id: `table-${tableId++}`,
          headers: headerRow,
          rows: dataRows.map((row) => ({
            cells: row.map((value) => ({
              value,
              type: 'string' as const,
            })),
          })),
          position: tableMatch.index,
        });
      }
    }

    return tables;
  }

  /**
   * HTMLから画像参照を抽出
   */
  private extractImages(html: string): ImageReference[] {
    const images: ImageReference[] = [];
    const imgRegex = /<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
    let match;
    let imageId = 0;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]!;
      const alt = match[2];

      // Base64画像の場合
      const base64Match = src.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        images.push({
          id: `image-${imageId++}`,
          mimeType: base64Match[1]!,
          altText: alt,
          position: match.index,
          data: base64Match[2],
        });
      } else {
        images.push({
          id: `image-${imageId++}`,
          filename: src,
          mimeType: this.guessMimeType(src),
          altText: alt,
          position: match.index,
        });
      }
    }

    return images;
  }

  /**
   * HTMLタグを除去
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim();
  }

  /**
   * メタデータを抽出
   */
  private extractMetadata(
    filename: string,
    fileSize: number,
    content: string
  ): DocumentMetadata {
    return {
      filename,
      fileSize,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      characterCount: content.length,
      wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
    };
  }

  /**
   * ファイル名からMIMEタイプを推測
   */
  private guessMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
