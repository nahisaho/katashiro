/**
 * ユーティリティ関数のユニットテスト
 *
 * @requirement REQ-NFR-006
 * @task TSK-001
 */

import { describe, it, expect } from 'vitest';
import { generateId, formatTimestamp, validateUrl } from '../../src/utils.js';
import { isOk, isErr } from '../../src/result.js';

describe('utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with prefix', () => {
      const id = generateId('TSK');
      expect(id).toMatch(/^TSK-/);
    });

    it('should generate ID without prefix', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('formatTimestamp', () => {
    it('should format current time as ISO 8601', () => {
      const timestamp = formatTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format specific date', () => {
      const date = new Date('2026-01-10T12:00:00Z');
      const timestamp = formatTimestamp(date);
      expect(timestamp).toBe('2026-01-10T12:00:00.000Z');
    });
  });

  describe('validateUrl', () => {
    it('should accept valid http URL', () => {
      const result = validateUrl('http://example.com');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('http://example.com');
      }
    });

    it('should accept valid https URL', () => {
      const result = validateUrl('https://example.com/path?query=1');
      expect(isOk(result)).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validateUrl('not-a-url');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('Invalid URL format');
      }
    });

    it('should reject non-http protocols', () => {
      const result = validateUrl('ftp://example.com');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('URL must use http or https protocol');
      }
    });

    it('should reject file protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(isErr(result)).toBe(true);
    });
  });
});
