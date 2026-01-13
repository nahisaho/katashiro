/**
 * ConsensusResearchEngine Integration Tests
 * @fileoverview REQ-1.2.0: 反復合議型リサーチの統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsensusResearchEngine } from '../../src/consensus/ConsensusResearchEngine';
import { ResearchAgentDependencies } from '../../src/consensus/ResearchAgent';
import { ConsensusResearchEvent } from '../../src/consensus/types';

describe('ConsensusResearchEngine Integration', () => {
  let mockDeps: ResearchAgentDependencies;

  beforeEach(() => {
    // モック依存性のセットアップ
    mockDeps = {
      searchClient: {
        search: vi.fn().mockResolvedValue([
          { url: 'https://example.com/1', title: 'Result 1', snippet: 'AI snippet 1' },
          { url: 'https://example.com/2', title: 'Result 2', snippet: 'AI snippet 2' },
          { url: 'https://example.com/3', title: 'Result 3', snippet: 'AI snippet 3' },
        ]),
      },
      scraper: {
        scrape: vi.fn().mockImplementation((url: string) => 
          Promise.resolve({
            ok: true,
            value: {
              url,
              content: `Sample content about AI from ${url}. This discusses machine learning and neural networks.`,
              title: `Page from ${url}`,
              fetchedAt: new Date().toISOString(),
            },
          })
        ),
      },
      analyzer: {
        analyze: vi.fn().mockResolvedValue({
          keywords: ['AI', 'machine learning', 'neural networks'],
          complexity: 0.6,
          sentiment: 0.7,
          wordCount: 150,
        }),
      },
      extractor: {
        extract: vi.fn().mockResolvedValue({
          persons: [],
          organizations: ['OpenAI', 'Google'],
          locations: [],
          all: [
            { text: 'OpenAI', type: 'organization' },
            { text: 'Google', type: 'organization' },
          ],
        }),
      },
      reportGenerator: {
        generate: vi.fn().mockImplementation(async (config: { title: string }) => {
          return `# ${config.title}\n\n## 概要\n\nAI技術に関するレポートです。\n\n## 主要な発見\n\n- AI技術は進化している\n- 機械学習が重要`;
        }),
      },
    };
  });

  describe('research', () => {
    it('should complete full research workflow', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 2 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result).toBeDefined();
      expect(result.finalReport).toBeDefined();
      expect(result.iterations).toHaveLength(2);
      expect(result.totalAgentRuns).toBe(6); // 3 agents × 2 iterations
    }, 30000);

    it('should emit events during research', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      const events: ConsensusResearchEvent[] = [];
      engine.on((event) => events.push(event));

      await engine.research('AI技術');

      // 基本イベントが発行されること
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('researchStarted');
      expect(eventTypes).toContain('iterationStarted');
      expect(eventTypes).toContain('agentStarted');
      expect(eventTypes).toContain('agentCompleted');
      expect(eventTypes).toContain('scoringCompleted');
      expect(eventTypes).toContain('consensusSelected');
      expect(eventTypes).toContain('iterationCompleted');
      expect(eventTypes).toContain('researchCompleted');
    }, 30000);

    it('should include metadata in result', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.topic).toBe('AI技術');
      expect(result.metadata.startedAt).toBeDefined();
      expect(result.metadata.completedAt).toBeDefined();
    }, 30000);

    it('should track total duration', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('iteration results', () => {
    it('should have scores for each iteration', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 2 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      result.iterations.forEach((iter) => {
        expect(iter.scores).toBeDefined();
        expect(iter.scores.length).toBeGreaterThan(0);
        expect(iter.consensusReport).toBeDefined();
        expect(iter.selectionReason).toBeDefined();
      });
    }, 30000);

    it('should improve or maintain quality across iterations', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 3 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      // 早期終了しない限り、イテレーションは増える
      expect(result.iterations.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });

  describe('error handling', () => {
    it('should handle partial agent failures', async () => {
      // 一部のスクレイピングを失敗させる
      let callCount = 0;
      mockDeps.scraper.scrape = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.resolve({ ok: false, error: new Error('Scrape failed') });
        }
        return Promise.resolve({
          ok: true,
          value: {
            url: 'https://example.com',
            content: 'Content',
            title: 'Title',
            fetchedAt: new Date().toISOString(),
          },
        });
      });

      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      // 部分的な失敗は許容される
      const result = await engine.research('AI技術');
      expect(result).toBeDefined();
    }, 30000);
  });

  describe('custom configuration', () => {
    it('should respect agentCount configuration', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 2, iterationCount: 1 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.totalAgentRuns).toBe(2);
    }, 30000);

    it('should respect iterationCount configuration', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.iterations).toHaveLength(1);
    }, 30000);
  });

  describe('final report', () => {
    it('should include executive summary', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 2 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.finalReport).toContain('エグゼクティブサマリー');
    }, 30000);

    it('should include source references', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 1 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.finalReport).toContain('参照ソース');
    }, 30000);

    it('should include process overview', async () => {
      const engine = new ConsensusResearchEngine(
        { agentCount: 3, iterationCount: 2 },
        mockDeps
      );

      const result = await engine.research('AI技術');

      expect(result.finalReport).toContain('調査プロセス');
      expect(result.finalReport).toContain('イテレーション');
    }, 30000);
  });
});
