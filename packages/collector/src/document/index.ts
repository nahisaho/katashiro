/**
 * ドキュメントモジュール
 *
 * @design DES-COLLECT-003
 * @task TASK-001
 */

export { DocumentParser } from './DocumentParser.js';
export { PDFParser, DOCXParser, XLSXParser } from './parsers/index.js';
export type {
  // メイン型
  ParsedDocument,
  DocumentError,
  DocumentErrorCode,
  ParseOptions,
  SupportedFormat,
  IDocumentParser,
  // 構造型
  DocumentStructure,
  DocumentMetadata,
  Heading,
  Paragraph,
  ParagraphStyle,
  Section,
  TableOfContents,
  TocEntry,
  // データ型
  TableData,
  TableRow,
  TableCell,
  ImageReference,
  PageInfo,
  SheetInfo,
} from './types.js';
export { DEFAULT_PARSE_OPTIONS } from './types.js';
