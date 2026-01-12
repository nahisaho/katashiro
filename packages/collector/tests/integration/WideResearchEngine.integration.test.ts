/**
 * WideResearchEngine - Integration Tests
 *
 * Note: These tests make real API calls and may be slow.
 * Run with: npx vitest run packages/collector/tests/integration/WideResearchEngine.integration.test.ts
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '@nahisaho/katashiro-core';
import {
  WideResearchEngine,
  AcademicSearchAgent,
  EncyclopediaAgent,
} from '../../src/research/index.js';

// Skip these tests by default in CI (they make real API calls)
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('WideResearchEngine Integration', () => {
  it('should search Wikipedia successfully', async () => {
    const agent = new EncyclopediaAgent();

    const result = await agent.search({
      query: 'TypeScript programming',
      maxResults: 5,
      timeout: 10000,
    });

    expect(result.status).toBe('success');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].sourceType).toBe('encyclopedia');
    expect(result.findings[0].url).toContain('wikipedia.org');
  }, 15000);

  it('should search arXiv successfully', async () => {
    const agent = new AcademicSearchAgent();

    const result = await agent.search({
      query: 'machine learning',
      maxResults: 5,
      timeout: 15000,
    });

    expect(result.status).toBe('success');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].sourceType).toBe('academic');
    expect(result.findings[0].url).toContain('arxiv.org');
  }, 20000);

  it('should perform wide research with multiple sources', async () => {
    const engine = new WideResearchEngine();

    const result = await engine.research({
      topic: 'artificial intelligence',
      depth: 'medium',
      sources: ['encyclopedia'], // Use only Wikipedia for faster test
      maxResultsPerSource: 5,
      agentTimeout: 10000,
      totalTimeout: 30000,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.findings.length).toBeGreaterThan(0);
      expect(result.value.coverage.coverageRate).toBeGreaterThan(0);
      expect(result.value.statistics.totalResults).toBeGreaterThan(0);
    }
  }, 35000);

  it('should handle Japanese queries', async () => {
    const agent = new EncyclopediaAgent();

    const result = await agent.search({
      query: '人工知能',
      maxResults: 5,
      timeout: 10000,
    });

    expect(result.status).toBe('success');
    expect(result.findings.length).toBeGreaterThan(0);
    // Should use Japanese Wikipedia
    expect(result.findings[0].url).toContain('ja.wikipedia.org');
  }, 15000);
});

// These tests run without real API calls
describe('WideResearchEngine Unit Validation', () => {
  it('should validate query before making API calls', async () => {
    const engine = new WideResearchEngine();

    const result = await engine.research({
      topic: '',
      depth: 'shallow',
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_QUERY');
    }
  });

  it('should respect source configuration', async () => {
    const engine = new WideResearchEngine({
      web: { type: 'web', enabled: false, priority: 1 },
      news: { type: 'news', enabled: false, priority: 2 },
      academic: { type: 'academic', enabled: false, priority: 3 },
      encyclopedia: { type: 'encyclopedia', enabled: false, priority: 4 },
    });

    const result = await engine.research({
      topic: 'test',
      depth: 'deep',
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('CONFIGURATION_ERROR');
    }
  });
});
