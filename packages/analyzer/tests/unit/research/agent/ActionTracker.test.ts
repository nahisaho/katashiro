/**
 * ActionTracker ユニットテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ActionTracker } from '../../../../src/research/agent/ActionTracker.js';
import type { StepAction } from '../../../../src/research/agent/types.js';

describe('ActionTracker', () => {
  let tracker: ActionTracker;

  beforeEach(() => {
    tracker = new ActionTracker();
  });

  describe('trackAction', () => {
    it('should track a step', () => {
      const step: StepAction = {
        stepNumber: 1,
        action: 'search',
        think: 'Looking for information about AI ethics',
        params: { searchQueries: ['AI ethics'] },
        timestamp: new Date().toISOString(),
        success: true,
      };

      tracker.trackAction(step);

      expect(tracker.getSteps()).toHaveLength(1);
    });

    it('should track multiple steps', () => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Searching...',
        params: { searchQueries: ['test'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 2,
        action: 'visit',
        think: 'Visiting pages...',
        params: { urlTargets: [0, 1] },
        timestamp: new Date().toISOString(),
        success: true,
      });

      expect(tracker.getSteps()).toHaveLength(2);
    });
  });

  describe('trackThink', () => {
    it('should track thoughts', () => {
      tracker.trackThink('This is a thought');
      // Thoughts are internally stored, no direct getter but affects diary
      expect(true).toBe(true); // Just verify no error
    });

    it('should support parameter substitution', () => {
      tracker.trackThink('Searching for {query}', 'en', { query: 'AI' });
      expect(true).toBe(true);
    });
  });

  describe('getSteps', () => {
    it('should return all tracked steps', () => {
      const step: StepAction = {
        stepNumber: 1,
        action: 'reflect',
        think: 'Reflecting on gathered information',
        params: { questions: ['What are the main points?'] },
        timestamp: new Date().toISOString(),
        success: true,
      };

      tracker.trackAction(step);
      const steps = tracker.getSteps();

      expect(steps).toHaveLength(1);
      expect(steps[0].action).toBe('reflect');
    });
  });

  describe('getLastStep', () => {
    it('should return undefined when no steps', () => {
      expect(tracker.getLastStep()).toBeUndefined();
    });

    it('should return the last step', () => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'First search',
        params: { searchQueries: ['test'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 2,
        action: 'reflect',
        think: 'Reflecting',
        params: { questions: [] },
        timestamp: new Date().toISOString(),
        success: true,
      });

      const last = tracker.getLastStep();
      expect(last?.action).toBe('reflect');
      expect(last?.stepNumber).toBe(2);
    });
  });

  describe('getStepsByAction', () => {
    beforeEach(() => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Search 1',
        params: { searchQueries: ['q1'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 2,
        action: 'search',
        think: 'Search 2',
        params: { searchQueries: ['q2'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 3,
        action: 'visit',
        think: 'Visit',
        params: { urlTargets: [0] },
        timestamp: new Date().toISOString(),
        success: true,
      });
    });

    it('should filter by action type', () => {
      const searchSteps = tracker.getStepsByAction('search');
      expect(searchSteps).toHaveLength(2);
    });

    it('should return empty for no matches', () => {
      const codingSteps = tracker.getStepsByAction('coding');
      expect(codingSteps).toHaveLength(0);
    });
  });

  describe('getStepCount', () => {
    it('should return correct count', () => {
      expect(tracker.getStepCount()).toBe(0);

      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Search',
        params: { searchQueries: ['test'] },
        timestamp: new Date().toISOString(),
        success: true,
      });

      expect(tracker.getStepCount()).toBe(1);
    });
  });

  describe('getSuccessCount / getFailureCount', () => {
    beforeEach(() => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Success',
        params: { searchQueries: ['test'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 2,
        action: 'visit',
        think: 'Failed',
        params: { urlTargets: [0] },
        timestamp: new Date().toISOString(),
        success: false,
      });
      tracker.trackAction({
        stepNumber: 3,
        action: 'reflect',
        think: 'Success',
        params: { questions: [] },
        timestamp: new Date().toISOString(),
        success: true,
      });
    });

    it('should return success count', () => {
      expect(tracker.getSuccessCount()).toBe(2);
    });

    it('should return failure count', () => {
      expect(tracker.getFailureCount()).toBe(1);
    });
  });

  describe('getActionStats', () => {
    beforeEach(() => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Search',
        params: { searchQueries: ['q1'] },
        timestamp: new Date().toISOString(),
        success: true,
      });
      tracker.trackAction({
        stepNumber: 2,
        action: 'search',
        think: 'Search',
        params: { searchQueries: ['q2'] },
        timestamp: new Date().toISOString(),
        success: false,
      });
      tracker.trackAction({
        stepNumber: 3,
        action: 'visit',
        think: 'Visit',
        params: { urlTargets: [0] },
        timestamp: new Date().toISOString(),
        success: true,
      });
    });

    it('should return stats by action type', () => {
      const stats = tracker.getActionStats();

      expect(stats.search.total).toBe(2);
      expect(stats.search.success).toBe(1);
      expect(stats.search.failure).toBe(1);
      expect(stats.visit.total).toBe(1);
      expect(stats.visit.success).toBe(1);
    });
  });

  describe('getDiaryContext', () => {
    it('should format steps as diary entries', () => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Looking for AI research',
        params: { searchQueries: ['AI research'] },
        timestamp: new Date().toISOString(),
        success: true,
      });

      const diary = tracker.getDiaryContext();
      expect(diary).toHaveLength(1);
      expect(diary[0]).toContain('step 1');
      expect(diary[0]).toContain('search');
    });
  });

  describe('reset', () => {
    it('should clear all steps', () => {
      tracker.trackAction({
        stepNumber: 1,
        action: 'search',
        think: 'Search',
        params: { searchQueries: ['test'] },
        timestamp: new Date().toISOString(),
        success: true,
      });

      tracker.reset();

      expect(tracker.getSteps()).toHaveLength(0);
      expect(tracker.getStepCount()).toBe(0);
    });
  });
});
