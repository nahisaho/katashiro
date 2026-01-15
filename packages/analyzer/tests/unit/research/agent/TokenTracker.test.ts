/**
 * TokenTracker ユニットテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TokenTracker } from '../../../../src/research/agent/TokenTracker.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker({ budget: 100000 });
  });

  describe('trackUsage', () => {
    it('should track prompt and completion tokens', () => {
      tracker.trackUsage(500, 200);

      const usage = tracker.getUsage();
      expect(usage.promptTokens).toBe(500);
      expect(usage.completionTokens).toBe(200);
      expect(usage.totalTokens).toBe(700);
    });

    it('should track usage with tool name', () => {
      tracker.trackUsage('search', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      expect(tracker.getTotalUsage()).toBe(1500);
      expect(tracker.getBreakdown().search).toBe(1500);
    });

    it('should accumulate tokens', () => {
      tracker.trackUsage(500, 200);
      tracker.trackUsage(300, 100);

      const usage = tracker.getUsage();
      expect(usage.totalTokens).toBe(1100);
    });

    it('should accumulate tokens for same tool', () => {
      tracker.trackUsage('search', {
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      });
      tracker.trackUsage('search', {
        promptTokens: 300,
        completionTokens: 100,
        totalTokens: 400,
      });

      expect(tracker.getBreakdown().search).toBe(1100);
    });
  });

  describe('getTotalUsage', () => {
    it('should return total token usage', () => {
      tracker.trackUsage(1000, 500);
      expect(tracker.getTotalUsage()).toBe(1500);
    });

    it('should return 0 when no usage', () => {
      expect(tracker.getTotalUsage()).toBe(0);
    });
  });

  describe('getRemainingBudget', () => {
    it('should return remaining budget', () => {
      tracker.trackUsage(20000, 10000);
      expect(tracker.getRemainingBudget()).toBe(70000);
    });

    it('should return 0 when budget is exceeded', () => {
      tracker.trackUsage(80000, 30000);
      expect(tracker.getRemainingBudget()).toBe(0);
    });
  });

  describe('isExceeded', () => {
    it('should return false when within budget', () => {
      tracker.trackUsage(50000, 20000);
      expect(tracker.isExceeded()).toBe(false);
    });

    it('should return true when budget is exceeded', () => {
      tracker.trackUsage(80000, 30000);
      expect(tracker.isExceeded()).toBe(true);
    });

    it('should return true when budget is exactly reached', () => {
      tracker.trackUsage(60000, 40000);
      expect(tracker.isExceeded()).toBe(true);
    });
  });

  describe('getUsageRatio', () => {
    it('should return usage ratio', () => {
      tracker.trackUsage(25000, 25000);
      expect(tracker.getUsageRatio()).toBe(0.5);
    });

    it('should return 0 when no usage', () => {
      expect(tracker.getUsageRatio()).toBe(0);
    });
  });

  describe('getRemainingRatio', () => {
    it('should return remaining ratio', () => {
      tracker.trackUsage(25000, 25000);
      expect(tracker.getRemainingRatio()).toBe(0.5);
    });

    it('should return 1 when no usage', () => {
      expect(tracker.getRemainingRatio()).toBe(1);
    });
  });

  describe('getBreakdown', () => {
    it('should return breakdown by tool', () => {
      tracker.trackUsage('search', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });
      tracker.trackUsage('visit', {
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      });

      const breakdown = tracker.getBreakdown();
      expect(breakdown.search).toBe(1500);
      expect(breakdown.visit).toBe(3000);
    });
  });

  describe('getHistory', () => {
    it('should return usage history', () => {
      tracker.trackUsage(500, 200);
      tracker.trackUsage('search', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      const history = tracker.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].tool).toBe('llm');
      expect(history[1].tool).toBe('search');
    });
  });

  describe('setBudget', () => {
    it('should update budget', () => {
      tracker.setBudget(200000);
      tracker.trackUsage(50000, 50000);
      expect(tracker.getRemainingBudget()).toBe(100000);
    });
  });

  describe('reset', () => {
    it('should reset all tracking data', () => {
      tracker.trackUsage(5000, 3000);
      tracker.trackUsage('search', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      tracker.reset();

      expect(tracker.getTotalUsage()).toBe(0);
      expect(tracker.getUsage().totalTokens).toBe(0);
      expect(Object.keys(tracker.getBreakdown()).length).toBe(0);
      expect(tracker.getHistory()).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    it('should return summary object', () => {
      tracker.trackUsage(20000, 10000);

      const summary = tracker.getSummary();
      expect(summary.budget).toBe(100000);
      expect(summary.used).toBe(30000);
      expect(summary.remaining).toBe(70000);
      expect(summary.usageRatio).toBe(0.3);
      expect(summary.isExceeded).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should accept number as budget', () => {
      const trackerNum = new TokenTracker(50000);
      trackerNum.trackUsage(25000, 0);
      expect(trackerNum.getRemainingBudget()).toBe(25000);
    });

    it('should accept options object', () => {
      const trackerOpts = new TokenTracker({ budget: 50000 });
      trackerOpts.trackUsage(25000, 0);
      expect(trackerOpts.getRemainingBudget()).toBe(25000);
    });
  });
});
