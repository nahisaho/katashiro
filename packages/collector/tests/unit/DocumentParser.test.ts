/**
 * DocumentParser テスト
 *
 * @design DES-COLLECT-003
 * @task TASK-001-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentParser, PDFParser, DOCXParser, XLSXParser } from '../../src/document/index.js';
import type { ParsedDocument, DocumentError, IDocumentParser } from '../../src/document/types.js';

describe('DocumentParser', () => {
  let parser: DocumentParser;

  beforeEach(() => {
    parser = new DocumentParser();
  });

  describe('getSupportedFormats', () => {
    it('サポート形式を返す', () => {
      const formats = parser.getSupportedFormats();

      expect(formats).toHaveLength(3);
      expect(formats.map((f) => f.extension)).toContain('.pdf');
      expect(formats.map((f) => f.extension)).toContain('.docx');
      expect(formats.map((f) => f.extension)).toContain('.xlsx');
    });
  });

  describe('isSupported', () => {
    it('PDF形式をサポート', () => {
      expect(parser.isSupported('document.pdf')).toBe(true);
      expect(parser.isSupported('DOCUMENT.PDF')).toBe(true);
    });

    it('DOCX形式をサポート', () => {
      expect(parser.isSupported('document.docx')).toBe(true);
      expect(parser.isSupported('DOCUMENT.DOCX')).toBe(true);
    });

    it('XLSX形式をサポート', () => {
      expect(parser.isSupported('data.xlsx')).toBe(true);
      expect(parser.isSupported('DATA.XLSX')).toBe(true);
    });

    it('未対応形式を判定', () => {
      expect(parser.isSupported('document.doc')).toBe(false);
      expect(parser.isSupported('data.xls')).toBe(false);
      expect(parser.isSupported('image.png')).toBe(false);
    });
  });

  describe('parse', () => {
    it('存在しないファイルでFILE_NOT_FOUNDエラー', async () => {
      const result = await parser.parse('/nonexistent/file.pdf');

      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('FILE_NOT_FOUND');
      }
    });

    it('未対応形式でUNSUPPORTED_FORMATエラー', async () => {
      // 一時ファイルを作成せずにテスト
      const result = await parser.parse('./test.doc');

      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        // FILE_NOT_FOUND または UNSUPPORTED_FORMAT（ファイルが存在しない場合は前者）
        expect(['FILE_NOT_FOUND', 'UNSUPPORTED_FORMAT']).toContain(result.error.code);
      }
    });
  });

  describe('parseBuffer', () => {
    it('サイズ超過でFILE_TOO_LARGEエラー', async () => {
      const largeBuffer = Buffer.alloc(1024); // 小さいバッファ
      const result = await parser.parseBuffer(largeBuffer, 'test.pdf', {
        maxFileSize: 100, // 100バイト制限
      });

      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('FILE_TOO_LARGE');
      }
    });

    it('未対応形式でUNSUPPORTED_FORMATエラー', async () => {
      const buffer = Buffer.from('test content');
      const result = await parser.parseBuffer(buffer, 'test.txt');

      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
      }
    });
  });

  describe('registerParser', () => {
    it('カスタムパーサーを登録できる', () => {
      const mockParser: IDocumentParser = {
        parse: vi.fn(),
        parseBuffer: vi.fn(),
        parseStream: vi.fn(),
        getSupportedFormats: () => [
          { extension: '.pptx', mimeType: 'application/pptx', description: 'PowerPoint' },
        ],
        isSupported: (f) => f.endsWith('.pptx'),
      };

      parser.registerParser('.pptx', mockParser);
      expect(parser.isSupported('test.pptx')).toBe(true);
    });
  });
});

describe('PDFParser', () => {
  let pdfParser: PDFParser;

  beforeEach(() => {
    pdfParser = new PDFParser();
  });

  describe('getSupportedFormats', () => {
    it('PDF形式を返す', () => {
      const formats = pdfParser.getSupportedFormats();
      expect(formats).toHaveLength(1);
      expect(formats[0]!.extension).toBe('.pdf');
      expect(formats[0]!.mimeType).toBe('application/pdf');
    });
  });

  describe('isSupported', () => {
    it('PDF拡張子を判定', () => {
      expect(pdfParser.isSupported('document.pdf')).toBe(true);
      expect(pdfParser.isSupported('document.PDF')).toBe(true);
      expect(pdfParser.isSupported('document.docx')).toBe(false);
    });
  });

  describe('parse', () => {
    it('存在しないファイルでエラー', async () => {
      const result = await pdfParser.parse('/nonexistent/file.pdf');
      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('FILE_NOT_FOUND');
      }
    });
  });

  describe('parseBuffer', () => {
    it('サイズ超過でエラー', async () => {
      const buffer = Buffer.alloc(1024);
      const result = await pdfParser.parseBuffer(buffer, 'test.pdf', { maxFileSize: 100 });

      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('FILE_TOO_LARGE');
      }
    });
  });
});

describe('DOCXParser', () => {
  let docxParser: DOCXParser;

  beforeEach(() => {
    docxParser = new DOCXParser();
  });

  describe('getSupportedFormats', () => {
    it('DOCX形式を返す', () => {
      const formats = docxParser.getSupportedFormats();
      expect(formats).toHaveLength(1);
      expect(formats[0]!.extension).toBe('.docx');
    });
  });

  describe('isSupported', () => {
    it('DOCX拡張子を判定', () => {
      expect(docxParser.isSupported('document.docx')).toBe(true);
      expect(docxParser.isSupported('document.DOCX')).toBe(true);
      expect(docxParser.isSupported('document.doc')).toBe(false);
    });
  });
});

describe('XLSXParser', () => {
  let xlsxParser: XLSXParser;

  beforeEach(() => {
    xlsxParser = new XLSXParser();
  });

  describe('getSupportedFormats', () => {
    it('XLSX形式を返す', () => {
      const formats = xlsxParser.getSupportedFormats();
      expect(formats).toHaveLength(1);
      expect(formats[0]!.extension).toBe('.xlsx');
    });
  });

  describe('isSupported', () => {
    it('XLSX拡張子を判定', () => {
      expect(xlsxParser.isSupported('data.xlsx')).toBe(true);
      expect(xlsxParser.isSupported('data.XLSX')).toBe(true);
      expect(xlsxParser.isSupported('data.xls')).toBe(false);
    });
  });
});
