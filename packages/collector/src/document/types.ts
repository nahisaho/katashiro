/**
 * ドキュメントパーサー型定義
 *
 * @design DES-COLLECT-003 §2.1
 * @task TASK-001-1
 */

import type { Result } from '@nahisaho/katashiro-core';

/**
 * ドキュメント解析の統一出力形式
 */
export interface ParsedDocument {
  /** 抽出されたテキストコンテンツ（プレーンテキスト） */
  content: string;

  /** ドキュメント構造情報 */
  structure: DocumentStructure;

  /** ドキュメントメタデータ */
  metadata: DocumentMetadata;

  /** 抽出されたテーブルデータ（存在する場合） */
  tables?: TableData[];

  /** 画像参照情報（存在する場合） */
  images?: ImageReference[];

  /** ページ情報（PDF/DOCXの場合） */
  pages?: PageInfo[];

  /** シート情報（XLSXの場合） */
  sheets?: SheetInfo[];
}

/**
 * ドキュメント構造
 */
export interface DocumentStructure {
  /** 見出し階層 */
  headings: Heading[];

  /** 段落情報 */
  paragraphs: Paragraph[];

  /** 目次（存在する場合） */
  toc?: TableOfContents;

  /** セクション分割 */
  sections: Section[];
}

export interface Heading {
  /** 見出しレベル (1-6) */
  level: number;

  /** 見出しテキスト */
  text: string;

  /** ドキュメント内の位置（文字オフセット） */
  position: number;

  /** ページ番号（PDF/DOCXの場合） */
  page?: number;
}

export interface Paragraph {
  /** 段落テキスト */
  text: string;

  /** 開始位置 */
  start: number;

  /** 終了位置 */
  end: number;

  /** スタイル情報 */
  style?: ParagraphStyle;
}

export interface ParagraphStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface Section {
  /** セクションタイトル */
  title: string;

  /** セクション内容 */
  content: string;

  /** 開始位置 */
  start: number;

  /** 終了位置 */
  end: number;

  /** 子セクション */
  children?: Section[];
}

export interface TableOfContents {
  entries: TocEntry[];
}

export interface TocEntry {
  level: number;
  text: string;
  page?: number;
}

/**
 * メタデータ
 */
export interface DocumentMetadata {
  /** ファイル名 */
  filename: string;

  /** ファイルサイズ（バイト） */
  fileSize: number;

  /** MIME タイプ */
  mimeType: string;

  /** 作成日時 */
  createdAt?: Date;

  /** 更新日時 */
  modifiedAt?: Date;

  /** 作成者 */
  author?: string;

  /** タイトル */
  title?: string;

  /** サブジェクト */
  subject?: string;

  /** キーワード */
  keywords?: string[];

  /** ページ数/シート数 */
  pageCount?: number;

  /** 文字数 */
  characterCount?: number;

  /** 単語数（推定） */
  wordCount?: number;
}

/**
 * テーブルデータ
 */
export interface TableData {
  /** テーブルID */
  id: string;

  /** テーブル名/キャプション */
  name?: string;

  /** ヘッダー行 */
  headers?: string[];

  /** データ行 */
  rows: TableRow[];

  /** ドキュメント内の位置 */
  position: number;

  /** ページ番号 */
  page?: number;

  /** シート名（XLSXの場合） */
  sheetName?: string;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'empty';
  formula?: string;
  colspan?: number;
  rowspan?: number;
}

/**
 * 画像参照
 */
export interface ImageReference {
  /** 画像ID */
  id: string;

  /** ファイル名 */
  filename?: string;

  /** MIME タイプ */
  mimeType: string;

  /** 幅（ピクセル） */
  width?: number;

  /** 高さ（ピクセル） */
  height?: number;

  /** 代替テキスト */
  altText?: string;

  /** ドキュメント内の位置 */
  position: number;

  /** Base64エンコードされたデータ（オプション） */
  data?: string;
}

/**
 * ページ情報
 */
export interface PageInfo {
  pageNumber: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * シート情報（Excel）
 */
export interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  isHidden: boolean;
}

/**
 * ドキュメントエラー
 */
export interface DocumentError {
  code: DocumentErrorCode;
  message: string;
  details?: unknown;
  filePath?: string;
}

export type DocumentErrorCode =
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED_FORMAT'
  | 'PARSE_ERROR'
  | 'CORRUPTED_FILE'
  | 'PASSWORD_PROTECTED'
  | 'FILE_TOO_LARGE'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * パース設定
 */
export interface ParseOptions {
  /** 画像データを抽出するか */
  extractImages?: boolean;

  /** テーブルデータを抽出するか */
  extractTables?: boolean;

  /** 最大ファイルサイズ（バイト） */
  maxFileSize?: number;

  /** タイムアウト（ミリ秒） */
  timeout?: number;

  /** パスワード（暗号化ファイル用） */
  password?: string;

  /** 特定のページ/シートのみ抽出 */
  pageRange?: { start: number; end: number };

  /** シート名指定（XLSX用） */
  sheetNames?: string[];
}

export const DEFAULT_PARSE_OPTIONS: Required<
  Omit<ParseOptions, 'password' | 'pageRange' | 'sheetNames'>
> = {
  extractImages: false,
  extractTables: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeout: 60000, // 60秒
};

/**
 * サポートフォーマット
 */
export interface SupportedFormat {
  extension: string;
  mimeType: string;
  description: string;
}

/**
 * ドキュメントパーサーインターフェース
 */
export interface IDocumentParser {
  /**
   * ファイルパスからドキュメントを解析
   */
  parse(
    filePath: string,
    options?: ParseOptions
  ): Promise<Result<ParsedDocument, DocumentError>>;

  /**
   * バッファからドキュメントを解析
   */
  parseBuffer(
    buffer: Buffer,
    filename: string,
    options?: ParseOptions
  ): Promise<Result<ParsedDocument, DocumentError>>;

  /**
   * ストリームからドキュメントを解析
   */
  parseStream(
    stream: NodeJS.ReadableStream,
    filename: string,
    options?: ParseOptions
  ): Promise<Result<ParsedDocument, DocumentError>>;

  /**
   * サポートするファイル形式を取得
   */
  getSupportedFormats(): SupportedFormat[];

  /**
   * ファイルがサポートされているか確認
   */
  isSupported(filename: string): boolean;
}
