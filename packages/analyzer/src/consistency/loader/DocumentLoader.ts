/**
 * DocumentLoader - 文書読み込み
 * @module consistency/loader/DocumentLoader
 * @see DES-KATASHIRO-004-DCC Section 5.5
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { Document } from '../types.js';

/**
 * 文書読み込み設定
 */
export interface DocumentLoaderConfig {
  /** エンコーディング */
  encoding: BufferEncoding;
  /** 無視するパターン */
  ignorePatterns?: string[];
  /** 最大ファイルサイズ（バイト） */
  maxFileSize?: number;
}

/**
 * 文書読み込みクラス
 */
export class DocumentLoader {
  private readonly config: DocumentLoaderConfig;

  constructor(config?: Partial<DocumentLoaderConfig>) {
    this.config = {
      encoding: config?.encoding ?? 'utf-8',
      ignorePatterns: config?.ignorePatterns ?? ['node_modules/**', '.git/**'],
      maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
    };
  }

  /**
   * 複数のファイルパスから文書を読み込む
   */
  async loadFiles(filePaths: string[]): Promise<Document[]> {
    const documents: Document[] = [];

    for (const filePath of filePaths) {
      try {
        const doc = await this.loadFile(filePath);
        if (doc) {
          documents.push(doc);
        }
      } catch (error) {
        console.warn(`Failed to load file: ${filePath}`, error);
      }
    }

    return documents;
  }

  /**
   * ディレクトリから文書を読み込む
   */
  async loadDirectory(dirPath: string, pattern: string = '**/*.md'): Promise<Document[]> {
    const absolutePath = path.resolve(dirPath);
    const files = await glob(pattern, {
      cwd: absolutePath,
      ignore: this.config.ignorePatterns,
      absolute: true,
    });

    return this.loadFiles(files);
  }

  /**
   * 単一ファイルを読み込む
   */
  async loadFile(filePath: string): Promise<Document | undefined> {
    try {
      const absolutePath = path.resolve(filePath);
      const stat = await fs.stat(absolutePath);

      // ファイルサイズチェック
      if (this.config.maxFileSize && stat.size > this.config.maxFileSize) {
        console.warn(`File too large: ${filePath} (${stat.size} bytes)`);
        return undefined;
      }

      const content = await fs.readFile(absolutePath, this.config.encoding);
      const format = this.detectFormat(absolutePath);

      return {
        path: absolutePath,
        content,
        format,
      };
    } catch (error) {
      console.warn(`Error reading file: ${filePath}`, error);
      return undefined;
    }
  }

  /**
   * 文字列から文書を作成
   */
  fromString(content: string, virtualPath: string = 'virtual.md'): Document {
    return {
      path: virtualPath,
      content,
      format: this.detectFormat(virtualPath),
    };
  }

  /**
   * 文字列から文書を作成（エイリアス）
   */
  loadFromContent(content: string, virtualPath: string = 'virtual.md'): Document {
    return this.fromString(content, virtualPath);
  }

  /**
   * 複数の文字列から文書を作成
   */
  fromStrings(contents: Array<{ content: string; path?: string }>): Document[] {
    return contents.map((item, index) => ({
      path: item.path ?? `virtual-${index}.md`,
      content: item.content,
      format: this.detectFormat(item.path ?? 'virtual.md'),
    }));
  }

  /**
   * ファイル形式を検出
   */
  private detectFormat(filePath: string): Document['format'] {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.json':
        return 'json';
      case '.txt':
      default:
        return 'text';
    }
  }
}
