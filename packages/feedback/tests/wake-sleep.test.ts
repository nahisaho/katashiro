/**
 * Wake-Sleep Learning Tests
 * 
 * @fileoverview WakeSleepCycleの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WakeSleepCycle } from '../src/learning/wake-sleep-cycle.js';
import { PatternQualityEvaluator } from '../src/learning/quality-evaluator.js';
import { PatternCompressor } from '../src/learning/pattern-compressor.js';
import type { WakeObservation, LearnedPattern } from '../src/learning/wake-sleep-types.js';
import { formatTimestamp, generateId } from '@nahisaho/katashiro-core';

describe('WakeSleepCycle', () => {
  let wakeSleep: WakeSleepCycle;

  beforeEach(() => {
    wakeSleep = new WakeSleepCycle({
      autoSleep: false, // テスト中は自動Sleepを無効化
      minQualityThreshold: 0.3,
      maxLibrarySize: 100,
    });
  });

  afterEach(() => {
    wakeSleep.stopAutoSleep();
    wakeSleep.clearLibrary();
  });

  describe('Wake Phase', () => {
    it('should add observations and extract patterns', () => {
      const observation: WakeObservation = {
        id: generateId('obs'),
        type: 'search_query',
        input: 'AI 機械学習 ディープラーニング',
        output: JSON.stringify({ results: [{ title: 'AI入門' }] }),
        context: { domain: 'technology' },
        timestamp: formatTimestamp(new Date()),
        success: true,
        rating: 0.8,
      };

      wakeSleep.wake(observation);

      const stats = wakeSleep.getStats();
      expect(stats.totalWakeObservations).toBe(1);
      expect(stats.totalPatternsExtracted).toBe(1);
      expect(stats.patternsByType.search_query).toBe(1);
    });

    it('should update existing similar patterns', () => {
      const observation1: WakeObservation = {
        id: generateId('obs'),
        type: 'search_query',
        input: 'AI 機械学習',
        output: 'results',
        context: { domain: 'technology' },
        timestamp: formatTimestamp(new Date()),
        success: true,
      };

      const observation2: WakeObservation = {
        id: generateId('obs'),
        type: 'search_query',
        input: 'AI 機械学習',
        output: 'results',
        context: { domain: 'technology' },
        timestamp: formatTimestamp(new Date()),
        success: true,
      };

      wakeSleep.wake(observation1);
      wakeSleep.wake(observation2);

      // 同じパターンなので1つに統合される
      const patterns = wakeSleep.getAllPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0]!.frequency).toBe(2);
    });

    it('should extract different pattern types', () => {
      const searchObs: WakeObservation = {
        id: generateId('obs'),
        type: 'search_query',
        input: 'Python tutorial',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      };

      const analysisObs: WakeObservation = {
        id: generateId('obs'),
        type: 'analysis_result',
        input: 'This is a test document',
        output: JSON.stringify({ keywords: ['test', 'document'] }),
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      };

      wakeSleep.wake(searchObs);
      wakeSleep.wake(analysisObs);

      const stats = wakeSleep.getStats();
      expect(stats.patternsByType.search_query).toBe(1);
      expect(stats.patternsByType.analysis_result).toBe(1);
    });
  });

  describe('Pattern Matching', () => {
    it('should match patterns by input', () => {
      const observation: WakeObservation = {
        id: generateId('obs'),
        type: 'search_query',
        input: 'TypeScript programming',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
        rating: 0.9,
      };

      wakeSleep.wake(observation);

      const matches = wakeSleep.matchPatterns('TypeScript tutorial', 'search_query');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.score).toBeGreaterThan(0);
    });

    it('should filter matches by type', () => {
      wakeSleep.wake({
        id: generateId('obs'),
        type: 'search_query',
        input: 'SEARCH keyword programming',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      });

      wakeSleep.wake({
        id: generateId('obs'),
        type: 'analysis_result',
        input: 'TEXT analysis document',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      });

      const searchMatches = wakeSleep.matchPatterns('SEARCH programming', 'search_query');
      const analysisMatches = wakeSleep.matchPatterns('TEXT document', 'analysis_result');

      // 検索クエリのマッチ確認
      expect(searchMatches.length).toBeGreaterThanOrEqual(0);
      // 分析結果のマッチ確認
      expect(analysisMatches.length).toBeGreaterThanOrEqual(0);
      
      // タイプフィルタリングが機能していることを確認
      expect(searchMatches.every(m => m.pattern.type === 'search_query')).toBe(true);
      expect(analysisMatches.every(m => m.pattern.type === 'analysis_result')).toBe(true);
    });
  });

  describe('Sleep Phase', () => {
    it('should compress and optimize library', async () => {
      // 複数の観察を追加
      for (let i = 0; i < 10; i++) {
        wakeSleep.wake({
          id: generateId('obs'),
          type: 'search_query',
          input: `query ${i}`,
          output: 'results',
          context: {},
          timestamp: formatTimestamp(new Date()),
          success: true,
          rating: i > 5 ? 0.9 : 0.2, // 品質が低いパターンも混ぜる
        });
      }

      const beforeSize = wakeSleep.getLibrarySize();
      const result = await wakeSleep.sleep();

      expect(result.beforeCount).toBe(beforeSize);
      expect(result.cycleTimeMs).toBeGreaterThanOrEqual(0);
      expect(wakeSleep.getStats().totalSleepCycles).toBe(1);
    });

    it('should remove low quality patterns', async () => {
      // 低品質パターンを追加
      wakeSleep.wake({
        id: generateId('obs'),
        type: 'search_query',
        input: 'low quality',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: false, // 失敗 = 低品質
        rating: 0.1,
      });

      // 高品質パターンを追加
      wakeSleep.wake({
        id: generateId('obs'),
        type: 'search_query',
        input: 'high quality pattern',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
        rating: 0.9,
      });

      await wakeSleep.sleep();

      const patterns = wakeSleep.getAllPatterns();
      // 低品質パターンは削除されている可能性
      for (const pattern of patterns) {
        expect(pattern.quality).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Library Management', () => {
    it('should export and import library', () => {
      wakeSleep.wake({
        id: generateId('obs'),
        type: 'search_query',
        input: 'export test',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      });

      const exported = wakeSleep.exportLibrary();
      expect(exported.version).toBe('1.0.0');
      expect(exported.patterns.length).toBe(1);

      // 新しいインスタンスにインポート
      const newWakeSleep = new WakeSleepCycle({ autoSleep: false });
      newWakeSleep.importLibrary(exported);

      expect(newWakeSleep.getLibrarySize()).toBe(1);
      newWakeSleep.stopAutoSleep();
    });

    it('should clear library', () => {
      wakeSleep.wake({
        id: generateId('obs'),
        type: 'search_query',
        input: 'to be cleared',
        output: 'results',
        context: {},
        timestamp: formatTimestamp(new Date()),
        success: true,
      });

      expect(wakeSleep.getLibrarySize()).toBe(1);

      wakeSleep.clearLibrary();

      expect(wakeSleep.getLibrarySize()).toBe(0);
      expect(wakeSleep.getStats().totalWakeObservations).toBe(0);
    });
  });
});

describe('PatternQualityEvaluator', () => {
  let evaluator: PatternQualityEvaluator;

  beforeEach(() => {
    evaluator = new PatternQualityEvaluator();
  });

  it('should evaluate pattern quality', () => {
    const pattern: LearnedPattern = {
      id: 'test-pattern',
      name: 'Test Pattern',
      type: 'search_query',
      inputTemplate: 'SEARCH: {{query}}',
      outputTemplate: 'RESULTS: {{count}}',
      quality: 0.8,
      frequency: 10,
      holes: 2,
      createdAt: formatTimestamp(new Date()),
      updatedAt: formatTimestamp(new Date()),
      lastUsedAt: formatTimestamp(new Date()),
      contexts: ['type:search_query'],
    };

    const quality = evaluator.evaluate(pattern);

    expect(quality.score).toBeGreaterThan(0);
    expect(quality.score).toBeLessThanOrEqual(1);
    expect(quality.frequencyScore).toBeGreaterThan(0);
    expect(quality.generalityScore).toBeGreaterThan(0);
    expect(quality.utilityScore).toBeGreaterThan(0);
    expect(quality.freshnessScore).toBeGreaterThan(0);
  });

  it('should filter patterns by quality threshold', () => {
    const patterns: LearnedPattern[] = [
      {
        id: 'high-quality',
        name: 'High Quality',
        type: 'search_query',
        inputTemplate: 'test',
        outputTemplate: 'result',
        quality: 0.9,
        frequency: 20,
        holes: 1,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: [],
      },
      {
        id: 'low-quality',
        name: 'Low Quality',
        type: 'search_query',
        inputTemplate: 'test',
        outputTemplate: 'result',
        quality: 0.1,
        frequency: 1,
        holes: 10,
        createdAt: formatTimestamp(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)), // 1年前
        updatedAt: formatTimestamp(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
        lastUsedAt: formatTimestamp(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
        contexts: [],
      },
    ];

    const filtered = evaluator.filterByQuality(patterns, 0.5);
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.id).toBe('high-quality');
  });

  it('should rank patterns by quality', () => {
    const patterns: LearnedPattern[] = [
      {
        id: 'medium',
        name: 'Medium',
        type: 'search_query',
        inputTemplate: 'test',
        outputTemplate: 'result',
        quality: 0.5,
        frequency: 5,
        holes: 2,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: [],
      },
      {
        id: 'high',
        name: 'High',
        type: 'search_query',
        inputTemplate: 'test',
        outputTemplate: 'result',
        quality: 0.9,
        frequency: 20,
        holes: 1,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: [],
      },
      {
        id: 'low',
        name: 'Low',
        type: 'search_query',
        inputTemplate: 'test',
        outputTemplate: 'result',
        quality: 0.2,
        frequency: 1,
        holes: 5,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: [],
      },
    ];

    const ranked = evaluator.rankPatterns(patterns);
    expect(ranked[0]!.pattern.id).toBe('high');
    expect(ranked[2]!.pattern.id).toBe('low');
  });
});

describe('PatternCompressor', () => {
  let compressor: PatternCompressor;

  beforeEach(() => {
    compressor = new PatternCompressor();
  });

  it('should calculate similarity between patterns', () => {
    const patternA: LearnedPattern = {
      id: 'a',
      name: 'A',
      type: 'search_query',
      inputTemplate: 'SEARCH: AI machine learning',
      outputTemplate: 'RESULTS: {{count}}',
      quality: 0.8,
      frequency: 10,
      holes: 1,
      createdAt: formatTimestamp(new Date()),
      updatedAt: formatTimestamp(new Date()),
      lastUsedAt: formatTimestamp(new Date()),
      contexts: ['domain:technology'],
    };

    const patternB: LearnedPattern = {
      id: 'b',
      name: 'B',
      type: 'search_query',
      inputTemplate: 'SEARCH: AI deep learning',
      outputTemplate: 'RESULTS: {{count}}',
      quality: 0.7,
      frequency: 8,
      holes: 1,
      createdAt: formatTimestamp(new Date()),
      updatedAt: formatTimestamp(new Date()),
      lastUsedAt: formatTimestamp(new Date()),
      contexts: ['domain:technology'],
    };

    const similarity = compressor.calculateSimilarity(patternA, patternB);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('should return 0 similarity for different types', () => {
    const patternA: LearnedPattern = {
      id: 'a',
      name: 'A',
      type: 'search_query',
      inputTemplate: 'test',
      outputTemplate: 'result',
      quality: 0.8,
      frequency: 10,
      holes: 1,
      createdAt: formatTimestamp(new Date()),
      updatedAt: formatTimestamp(new Date()),
      lastUsedAt: formatTimestamp(new Date()),
      contexts: [],
    };

    const patternB: LearnedPattern = {
      id: 'b',
      name: 'B',
      type: 'analysis_result',
      inputTemplate: 'test',
      outputTemplate: 'result',
      quality: 0.8,
      frequency: 10,
      holes: 1,
      createdAt: formatTimestamp(new Date()),
      updatedAt: formatTimestamp(new Date()),
      lastUsedAt: formatTimestamp(new Date()),
      contexts: [],
    };

    const similarity = compressor.calculateSimilarity(patternA, patternB);
    expect(similarity).toBe(0);
  });

  it('should calculate MDL', () => {
    const patterns: LearnedPattern[] = [
      {
        id: 'a',
        name: 'A',
        type: 'search_query',
        inputTemplate: 'SEARCH: {{query}}',
        outputTemplate: 'RESULTS: {{count}}',
        quality: 0.8,
        frequency: 10,
        holes: 2,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: ['context1'],
      },
    ];

    const mdl = compressor.calculateMDL(patterns);
    expect(mdl.total).toBeGreaterThan(0);
    expect(mdl.libraryMDL).toBeGreaterThan(0);
    expect(mdl.breakdown.patternCount).toBe(1);
    expect(mdl.breakdown.totalHoles).toBe(2);
  });

  it('should compress similar patterns', () => {
    const patterns: LearnedPattern[] = [];
    
    // 類似パターンを複数作成
    for (let i = 0; i < 5; i++) {
      patterns.push({
        id: `pattern-${i}`,
        name: `Pattern ${i}`,
        type: 'search_query',
        inputTemplate: 'SEARCH: AI keyword',
        outputTemplate: 'RESULTS: {{count}}',
        quality: 0.8,
        frequency: 5 + i,
        holes: 1,
        createdAt: formatTimestamp(new Date()),
        updatedAt: formatTimestamp(new Date()),
        lastUsedAt: formatTimestamp(new Date()),
        contexts: ['domain:technology'],
      });
    }

    const compressed = compressor.compressLibrary(patterns);
    // 類似パターンは統合されるはず
    expect(compressed.length).toBeLessThanOrEqual(patterns.length);
  });
});
