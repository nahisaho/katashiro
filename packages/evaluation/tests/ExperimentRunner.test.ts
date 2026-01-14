/**
 * ExperimentRunner Tests
 *
 * @design DES-KATASHIRO-003-EVAL §3.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExperimentRunner,
  getExperimentRunner,
  resetExperimentRunner,
} from '../src/ExperimentRunner.js';
import {
  getDatasetManager,
  resetDatasetManager,
} from '../src/DatasetManager.js';
import {
  getEvaluatorRegistry,
  resetEvaluatorRegistry,
  LengthEvaluator,
  KeywordEvaluator,
} from '../src/evaluators/index.js';

describe('ExperimentRunner', () => {
  beforeEach(() => {
    resetExperimentRunner();
    resetDatasetManager();
    resetEvaluatorRegistry();

    // Set up test dataset
    const datasetMgr = getDatasetManager();
    const ds = datasetMgr.create('test-dataset');
    datasetMgr.addItems(ds.id, [
      { input: 'What is AI?', expected: 'AI is artificial intelligence.' },
      { input: 'What is ML?', expected: 'ML is machine learning.' },
      { input: 'What is DL?', expected: 'DL is deep learning.' },
    ]);

    // Register evaluators
    const registry = getEvaluatorRegistry();
    registry.register(
      'length',
      new LengthEvaluator({ minLength: 5, maxLength: 100 })
    );
    registry.register(
      'keyword',
      new KeywordEvaluator({ requiredKeywords: ['is'] })
    );
  });

  it('should run experiment successfully', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const runner = new ExperimentRunner();
    const result = await runner.run(
      {
        name: 'Test Experiment',
        datasetId,
        evaluators: ['length', 'keyword'],
      },
      async (input) => `The answer to "${input}" is something.`
    );

    expect(result.id).toBeTruthy();
    expect(result.name).toBe('Test Experiment');
    expect(result.summary.totalItems).toBe(3);
    expect(result.summary.successCount).toBe(3);
    expect(result.details).toHaveLength(3);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle generator errors', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const runner = new ExperimentRunner();
    const result = await runner.run(
      {
        name: 'Error Test',
        datasetId,
        evaluators: ['length'],
      },
      async () => {
        throw new Error('Generator failed');
      }
    );

    expect(result.summary.errorCount).toBe(3);
    expect(result.details.every((d) => !d.success)).toBe(true);
  });

  it('should calculate summary statistics', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const runner = new ExperimentRunner();
    const result = await runner.run(
      {
        name: 'Stats Test',
        datasetId,
        evaluators: ['length'],
      },
      async () => 'A reasonable length response.'
    );

    expect(result.summary.averageScores).toHaveProperty('length');
    expect(result.summary.stdDevs).toHaveProperty('length');
    expect(result.summary.overallScore).toBeGreaterThan(0);
  });

  it('should report progress', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const progress: Array<{ current: number; total: number }> = [];
    const runner = new ExperimentRunner({
      onProgress: (current, total) => {
        progress.push({ current, total });
      },
    });

    await runner.run(
      {
        name: 'Progress Test',
        datasetId,
        evaluators: ['length'],
      },
      async () => 'Response'
    );

    expect(progress).toHaveLength(3);
    expect(progress[0].current).toBe(1);
    expect(progress[2].current).toBe(3);
    expect(progress[2].total).toBe(3);
  });

  it('should throw on empty dataset', async () => {
    const datasetMgr = getDatasetManager();
    const emptyDs = datasetMgr.create('empty');

    const runner = new ExperimentRunner();
    await expect(
      runner.run(
        {
          name: 'Empty Test',
          datasetId: emptyDs.id,
          evaluators: ['length'],
        },
        async () => 'Response'
      )
    ).rejects.toThrow('is empty or not found');
  });

  it('should throw on no evaluators', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const runner = new ExperimentRunner();
    await expect(
      runner.run(
        {
          name: 'No Evaluator Test',
          datasetId,
          evaluators: ['non-existent'],
        },
        async () => 'Response'
      )
    ).rejects.toThrow('No evaluators found');
  });

  it('should store and retrieve results', async () => {
    const datasetMgr = getDatasetManager();
    const datasets = datasetMgr.list();
    const datasetId = datasets[0].id;

    const runner = new ExperimentRunner();
    const result = await runner.run(
      {
        name: 'Store Test',
        datasetId,
        evaluators: ['length'],
      },
      async () => 'Response'
    );

    const retrieved = runner.getResult(result.id);
    expect(retrieved).toEqual(result);

    const allResults = runner.listResults();
    expect(allResults).toHaveLength(1);
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const runner1 = getExperimentRunner();
      const runner2 = getExperimentRunner();
      expect(runner1).toBe(runner2);
    });

    it('should reset singleton', async () => {
      const runner1 = getExperimentRunner();
      const datasetMgr = getDatasetManager();
      const datasets = datasetMgr.list();
      const datasetId = datasets[0].id;

      await runner1.run(
        {
          name: 'Test',
          datasetId,
          evaluators: ['length'],
        },
        async () => 'Response'
      );

      expect(runner1.listResults()).toHaveLength(1);

      resetExperimentRunner();

      const runner2 = getExperimentRunner();
      expect(runner2).not.toBe(runner1);
      expect(runner2.listResults()).toHaveLength(0);
    });
  });
});
