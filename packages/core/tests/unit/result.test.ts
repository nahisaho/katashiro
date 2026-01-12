/**
 * Result型のユニットテスト
 *
 * @requirement REQ-NFR-006
 * @task TSK-001
 */

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr } from '../../src/result.js';
import type { Result } from '../../src/result.js';

describe('Result', () => {
  describe('ok', () => {
    it('should create Ok result with value', () => {
      const result = ok(42);
      expect(result._tag).toBe('Ok');
      expect(result.value).toBe(42);
    });

    it('should create Ok result with complex value', () => {
      const value = { name: 'test', items: [1, 2, 3] };
      const result = ok(value);
      expect(result.value).toEqual(value);
    });
  });

  describe('err', () => {
    it('should create Err result with error', () => {
      const result = err('Something went wrong');
      expect(result._tag).toBe('Err');
      expect(result.error).toBe('Something went wrong');
    });

    it('should create Err result with Error object', () => {
      const error = new Error('Test error');
      const result = err(error);
      expect(result.error).toBe(error);
    });
  });

  describe('isOk', () => {
    it('should return true for Ok result', () => {
      const result: Result<number, string> = ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err result', () => {
      const result: Result<number, string> = err('error');
      expect(isOk(result)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const result: Result<number, string> = ok(42);
      if (isOk(result)) {
        // TypeScriptはここでresult.valueがnumberであることを知っている
        expect(typeof result.value).toBe('number');
      }
    });
  });

  describe('isErr', () => {
    it('should return true for Err result', () => {
      const result: Result<number, string> = err('error');
      expect(isErr(result)).toBe(true);
    });

    it('should return false for Ok result', () => {
      const result: Result<number, string> = ok(42);
      expect(isErr(result)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const result: Result<number, string> = err('error message');
      if (isErr(result)) {
        // TypeScriptはここでresult.errorがstringであることを知っている
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
