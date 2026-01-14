/**
 * TokenCounter Tests
 *
 * @design DES-KATASHIRO-003-LLM §3.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TokenCounter,
  getTokenCounter,
  resetTokenCounter,
} from '../src/TokenCounter.js';

describe('TokenCounter', () => {
  beforeEach(() => {
    resetTokenCounter();
  });

  describe('estimate', () => {
    it('should estimate token count for text', () => {
      const counter = new TokenCounter();
      const tokens = counter.estimate('Hello, world!');
      expect(tokens).toBeGreaterThan(0);
      // 約13文字 / 4 ≈ 4トークン
      expect(tokens).toBeCloseTo(4, 0);
    });

    it('should estimate more tokens for longer text', () => {
      const counter = new TokenCounter();
      const short = counter.estimate('Hi');
      const long = counter.estimate('This is a much longer piece of text that should have more tokens.');
      expect(long).toBeGreaterThan(short);
    });

    it('should use model-specific factor', () => {
      const counter = new TokenCounter();
      const gptTokens = counter.estimate('Test text', 'gpt-4o');
      const claudeTokens = counter.estimate('Test text', 'claude-3-5-sonnet');
      // Claude has slightly higher factor (4.5 vs 4.0)
      // For same text, Claude estimates fewer tokens
      expect(gptTokens).toBeGreaterThanOrEqual(claudeTokens);
    });
  });

  describe('estimateMessages', () => {
    it('should estimate tokens for message array', () => {
      const counter = new TokenCounter();
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      const tokens = counter.estimateMessages(messages);
      expect(tokens).toBeGreaterThan(0);
      // 各メッセージに4トークンのオーバーヘッド + 最後に3トークン
      expect(tokens).toBeGreaterThan(10);
    });

    it('should include overhead for each message', () => {
      const counter = new TokenCounter();
      const single = counter.estimateMessages([
        { role: 'user', content: 'Hello' },
      ]);
      const double = counter.estimateMessages([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ]);

      // ダブルはシングルより多い（オーバーヘッド含む）
      expect(double).toBeGreaterThan(single);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true if within limit', () => {
      const counter = new TokenCounter();
      expect(counter.isWithinLimit('Hello', 100)).toBe(true);
    });

    it('should return false if exceeds limit', () => {
      const counter = new TokenCounter();
      const longText = 'a'.repeat(1000);
      expect(counter.isWithinLimit(longText, 10)).toBe(false);
    });
  });

  describe('truncateToLimit', () => {
    it('should return original if within limit', () => {
      const counter = new TokenCounter();
      const text = 'Short text';
      expect(counter.truncateToLimit(text, 100)).toBe(text);
    });

    it('should truncate long text', () => {
      const counter = new TokenCounter();
      const longText = 'a'.repeat(1000);
      const truncated = counter.truncateToLimit(longText, 10);

      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should respect token limit after truncation', () => {
      const counter = new TokenCounter();
      const longText = 'a'.repeat(1000);
      const truncated = counter.truncateToLimit(longText, 50);
      const truncatedTokens = counter.estimate(truncated);

      // トランケート後は制限以下
      expect(truncatedTokens).toBeLessThanOrEqual(50);
    });
  });

  describe('singleton', () => {
    it('should return singleton instance', () => {
      const counter1 = getTokenCounter();
      const counter2 = getTokenCounter();
      expect(counter1).toBe(counter2);
    });

    it('should reset singleton', () => {
      const counter1 = getTokenCounter();
      resetTokenCounter();
      const counter2 = getTokenCounter();
      expect(counter1).not.toBe(counter2);
    });
  });
});
