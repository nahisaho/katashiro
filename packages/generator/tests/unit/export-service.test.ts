/**
 * ExportService Unit Tests
 *
 * @task TSK-035
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExportService,
  ExportFormat,
  ExportOptions,
} from '../../src/export/export-service.js';
import { isOk, type Content } from '@nahisaho/katashiro-core';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    service = new ExportService();
  });

  const mockContent: Content = {
    id: 'cnt-001',
    type: 'article',
    title: 'テストドキュメント',
    body: 'これはテスト用のコンテンツです。複数の段落があります。\n\nこれは2番目の段落です。',
    sources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('exportToMarkdown', () => {
    it('should export content to Markdown', async () => {
      const result = await service.export(mockContent, 'markdown');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.format).toBe('markdown');
        expect(result.value.content).toContain('# テストドキュメント');
        expect(result.value.mimeType).toBe('text/markdown');
      }
    });
  });

  describe('exportToHtml', () => {
    it('should export content to HTML', async () => {
      const result = await service.export(mockContent, 'html');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.format).toBe('html');
        expect(result.value.content).toContain('<html');
        expect(result.value.content).toContain('<h1>');
        expect(result.value.mimeType).toBe('text/html');
      }
    });
  });

  describe('exportToJson', () => {
    it('should export content to JSON', async () => {
      const result = await service.export(mockContent, 'json');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.format).toBe('json');
        const parsed = JSON.parse(result.value.content);
        expect(parsed.title).toBe('テストドキュメント');
        expect(result.value.mimeType).toBe('application/json');
      }
    });
  });

  describe('exportToText', () => {
    it('should export content to plain text', async () => {
      const result = await service.export(mockContent, 'text');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.format).toBe('text');
        expect(result.value.content).toContain('テストドキュメント');
        expect(result.value.mimeType).toBe('text/plain');
      }
    });
  });

  describe('export with options', () => {
    it('should respect includeMetadata option', async () => {
      const options: ExportOptions = { includeMetadata: true };
      const result = await service.export(mockContent, 'markdown', options);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toContain('作成日');
      }
    });

    it('should exclude metadata when not requested', async () => {
      const options: ExportOptions = { includeMetadata: false };
      const result = await service.export(mockContent, 'markdown', options);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).not.toContain('作成日:');
      }
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats).toContain('markdown');
      expect(formats).toContain('html');
      expect(formats).toContain('json');
      expect(formats).toContain('text');
    });
  });

  describe('getFilename', () => {
    it('should generate appropriate filename', () => {
      const filename = service.getFilename(mockContent, 'markdown');
      
      expect(filename).toContain('テストドキュメント');
      expect(filename.endsWith('.md')).toBe(true);
    });

    it('should generate HTML filename', () => {
      const filename = service.getFilename(mockContent, 'html');
      
      expect(filename.endsWith('.html')).toBe(true);
    });
  });
});
