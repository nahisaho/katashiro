/**
 * CLI Helpers Unit Tests
 *
 * @requirement REQ-CLI-001
 */

import { describe, it, expect } from 'vitest';
import {
  createContent,
  isValidFormat,
  isValidProvider,
  parseNumberOption,
  formatSearchResult,
  formatError,
  truncateText
} from '../../src/cli-helpers.js';

describe('CLI Helpers', () => {
  describe('createContent', () => {
    it('should create content with title and body', () => {
      const content = createContent('Test Title', 'Test Body');

      expect(content.title).toBe('Test Title');
      expect(content.body).toBe('Test Body');
      expect(content.type).toBe('article');
      expect(content.id).toMatch(/^CLI-/);
      expect(content.sources).toEqual([]);
      expect(content.createdAt).toBeDefined();
      expect(content.updatedAt).toBeDefined();
    });

    it('should create content with URL source', () => {
      const content = createContent('Test', 'Body', 'https://example.com');

      expect(content.sources).toHaveLength(1);
      expect(content.sources[0].url).toBe('https://example.com');
      expect(content.sources[0].id).toMatch(/^SRC-/);
      expect(content.sources[0].metadata.title).toBe('Test');
    });

    it('should handle empty URL', () => {
      const content = createContent('Title', 'Body', '');
      expect(content.sources).toEqual([]);
    });

    it('should generate unique IDs', () => {
      const content1 = createContent('Title1', 'Body1');
      const content2 = createContent('Title2', 'Body2');
      expect(content1.id).not.toBe(content2.id);
    });
  });

  describe('isValidFormat', () => {
    it('should return true for json format', () => {
      expect(isValidFormat('json')).toBe(true);
    });

    it('should return true for text format', () => {
      expect(isValidFormat('text')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidFormat('xml')).toBe(false);
      expect(isValidFormat('')).toBe(false);
      expect(isValidFormat('JSON')).toBe(false);
    });
  });

  describe('isValidProvider', () => {
    it('should return true for duckduckgo', () => {
      expect(isValidProvider('duckduckgo')).toBe(true);
    });

    it('should return true for searxng', () => {
      expect(isValidProvider('searxng')).toBe(true);
    });

    it('should return false for invalid provider', () => {
      expect(isValidProvider('google')).toBe(false);
      expect(isValidProvider('')).toBe(false);
      expect(isValidProvider('DUCKDUCKGO')).toBe(false);
    });
  });

  describe('parseNumberOption', () => {
    it('should parse valid number string', () => {
      expect(parseNumberOption('10', 5)).toBe(10);
      expect(parseNumberOption('100', 10)).toBe(100);
    });

    it('should return default for invalid input', () => {
      expect(parseNumberOption('abc', 5)).toBe(5);
      expect(parseNumberOption('', 10)).toBe(10);
      expect(parseNumberOption('NaN', 20)).toBe(20);
    });

    it('should return default for zero or negative', () => {
      expect(parseNumberOption('0', 5)).toBe(5);
      expect(parseNumberOption('-5', 10)).toBe(10);
    });
  });

  describe('formatSearchResult', () => {
    it('should format result with all fields', () => {
      const result = {
        title: 'Test Title',
        url: 'https://example.com',
        snippet: 'This is a snippet'
      };
      const formatted = formatSearchResult(result);

      expect(formatted).toContain('📄 Test Title');
      expect(formatted).toContain('https://example.com');
      expect(formatted).toContain('This is a snippet');
    });

    it('should format result without snippet', () => {
      const result = {
        title: 'Test',
        url: 'https://example.com'
      };
      const formatted = formatSearchResult(result);

      expect(formatted).toContain('📄 Test');
      expect(formatted).toContain('https://example.com');
      expect(formatted).not.toContain('...');
    });

    it('should truncate long snippets', () => {
      const longSnippet = 'A'.repeat(150);
      const result = {
        title: 'Test',
        url: 'https://example.com',
        snippet: longSnippet
      };
      const formatted = formatSearchResult(result);

      expect(formatted).toContain('A'.repeat(100));
      expect(formatted).toContain('...');
    });
  });

  describe('formatError', () => {
    it('should format Error object', () => {
      const error = new Error('Test error message');
      expect(formatError(error)).toBe('Test error message');
    });

    it('should format string error', () => {
      expect(formatError('String error')).toBe('String error');
    });

    it('should format number error', () => {
      expect(formatError(404)).toBe('404');
    });

    it('should format null/undefined', () => {
      expect(formatError(null)).toBe('null');
      expect(formatError(undefined)).toBe('undefined');
    });

    it('should format object error', () => {
      const obj = { code: 'ERR_001' };
      expect(formatError(obj)).toBe('[object Object]');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const result = truncateText('Short text', 100);
      expect(result.text).toBe('Short text');
      expect(result.omitted).toBe(0);
    });

    it('should truncate long text', () => {
      const longText = 'A'.repeat(150);
      const result = truncateText(longText, 100);

      expect(result.text).toBe('A'.repeat(100));
      expect(result.omitted).toBe(50);
    });

    it('should handle exact length', () => {
      const text = 'A'.repeat(100);
      const result = truncateText(text, 100);

      expect(result.text).toBe(text);
      expect(result.omitted).toBe(0);
    });

    it('should handle empty text', () => {
      const result = truncateText('', 100);
      expect(result.text).toBe('');
      expect(result.omitted).toBe(0);
    });
  });
});
