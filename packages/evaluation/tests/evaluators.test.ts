/**
 * Evaluators Tests
 *
 * @design DES-KATASHIRO-003-EVAL §3.1-3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LengthEvaluator,
  KeywordEvaluator,
  RegexEvaluator,
  JsonStructureEvaluator,
  SimilarityEvaluator,
  CompositeEvaluator,
  EvaluatorRegistry,
  getEvaluatorRegistry,
  resetEvaluatorRegistry,
} from '../src/evaluators/index.js';
import type { EvaluationInput } from '../src/types.js';

describe('LengthEvaluator', () => {
  const makeInput = (output: string): EvaluationInput => ({
    input: 'test',
    output,
  });

  it('should evaluate length within range as 1.0', async () => {
    const evaluator = new LengthEvaluator({ minLength: 10, maxLength: 100 });
    const result = await evaluator.evaluate(makeInput('This is a test output'));
    expect(result.normalizedScore).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it('should evaluate short output with lower score', async () => {
    const evaluator = new LengthEvaluator({ minLength: 50, maxLength: 200 });
    const result = await evaluator.evaluate(makeInput('Short'));
    expect(result.normalizedScore).toBeLessThan(1.0);
    expect(result.passed).toBe(false);
  });

  it('should evaluate long output with lower score', async () => {
    const evaluator = new LengthEvaluator({ minLength: 5, maxLength: 10 });
    const result = await evaluator.evaluate(makeInput('This is way too long for the limit'));
    expect(result.normalizedScore).toBeLessThan(1.0);
    expect(result.passed).toBe(false);
  });

  it('should use optimal length if specified', async () => {
    const evaluator = new LengthEvaluator({ optimalLength: 20, tolerance: 0.5 });
    const result = await evaluator.evaluate(makeInput('Short text'));
    expect(result.metadata?.optimalLength).toBe(20);
  });
});

describe('KeywordEvaluator', () => {
  const makeInput = (output: string): EvaluationInput => ({
    input: 'test',
    output,
  });

  it('should find all required keywords', async () => {
    const evaluator = new KeywordEvaluator({
      requiredKeywords: ['hello', 'world'],
    });
    const result = await evaluator.evaluate(
      makeInput('Hello world, this is a test')
    );
    expect(result.normalizedScore).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it('should return partial score for partial match', async () => {
    const evaluator = new KeywordEvaluator({
      requiredKeywords: ['hello', 'world', 'test'],
    });
    const result = await evaluator.evaluate(makeInput('Hello there'));
    expect(result.normalizedScore).toBeCloseTo(1 / 3);
    expect(result.metadata?.foundKeywords).toContain('hello');
    expect(result.metadata?.missingKeywords).toContain('world');
  });

  it('should respect case sensitivity', async () => {
    const evaluator = new KeywordEvaluator({
      requiredKeywords: ['Hello'],
      caseSensitive: true,
    });
    const result1 = await evaluator.evaluate(makeInput('Hello'));
    const result2 = await evaluator.evaluate(makeInput('hello'));
    expect(result1.normalizedScore).toBe(1.0);
    expect(result2.normalizedScore).toBe(0);
  });
});

describe('RegexEvaluator', () => {
  const makeInput = (output: string): EvaluationInput => ({
    input: 'test',
    output,
  });

  it('should match valid patterns', async () => {
    const evaluator = new RegexEvaluator({
      patterns: [/\d{3}-\d{4}/, /email/i],
    });
    const result = await evaluator.evaluate(
      makeInput('Contact: 123-4567, email: test@example.com')
    );
    expect(result.normalizedScore).toBe(1.0);
  });

  it('should return partial score for partial match', async () => {
    const evaluator = new RegexEvaluator({
      patterns: [/\d+/, /[A-Z]+/, /@/],
    });
    const result = await evaluator.evaluate(makeInput('123 abc'));
    expect(result.normalizedScore).toBeCloseTo(1 / 3);
  });
});

describe('JsonStructureEvaluator', () => {
  const makeInput = (output: string): EvaluationInput => ({
    input: 'test',
    output,
  });

  it('should validate correct JSON structure', async () => {
    const evaluator = new JsonStructureEvaluator({
      requiredFields: ['name', 'age'],
      types: { name: 'string', age: 'number' },
    });
    const result = await evaluator.evaluate(
      makeInput(JSON.stringify({ name: 'John', age: 30 }))
    );
    expect(result.normalizedScore).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it('should fail on missing fields', async () => {
    const evaluator = new JsonStructureEvaluator({
      requiredFields: ['name', 'age', 'email'],
    });
    const result = await evaluator.evaluate(
      makeInput(JSON.stringify({ name: 'John' }))
    );
    expect(result.normalizedScore).toBeLessThan(1.0);
    expect(result.metadata?.missingFields).toContain('age');
    expect(result.metadata?.missingFields).toContain('email');
  });

  it('should fail on type mismatch', async () => {
    const evaluator = new JsonStructureEvaluator({
      requiredFields: ['name'],
      types: { name: 'number' },
    });
    const result = await evaluator.evaluate(
      makeInput(JSON.stringify({ name: 'John' }))
    );
    expect(result.normalizedScore).toBeLessThan(1.0);
  });

  it('should fail on invalid JSON', async () => {
    const evaluator = new JsonStructureEvaluator({
      requiredFields: ['name'],
    });
    const result = await evaluator.evaluate(makeInput('not valid json'));
    expect(result.normalizedScore).toBe(0);
    expect(result.passed).toBe(false);
  });
});

describe('SimilarityEvaluator', () => {
  const makeInput = (output: string, expected?: string): EvaluationInput => ({
    input: 'test',
    output,
    expected,
  });

  it('should return 1.0 for identical strings', async () => {
    const evaluator = new SimilarityEvaluator();
    const result = await evaluator.evaluate(
      makeInput('Hello world', 'Hello world')
    );
    expect(result.normalizedScore).toBe(1.0);
  });

  it('should return high score for similar strings', async () => {
    const evaluator = new SimilarityEvaluator({ threshold: 0.8 });
    const result = await evaluator.evaluate(
      makeInput('Hello world', 'Hello World!')
    );
    expect(result.normalizedScore).toBeGreaterThan(0.3);
  });

  it('should return lower score for different strings', async () => {
    const evaluator = new SimilarityEvaluator();
    const result = await evaluator.evaluate(
      makeInput('Hello', 'Goodbye completely different')
    );
    expect(result.normalizedScore).toBeLessThan(0.5);
  });

  it('should return 0 if no expected value', async () => {
    const evaluator = new SimilarityEvaluator();
    const result = await evaluator.evaluate(makeInput('Hello'));
    expect(result.normalizedScore).toBe(0);
  });
});

describe('CompositeEvaluator', () => {
  const makeInput = (output: string): EvaluationInput => ({
    input: 'test',
    output,
  });

  it('should aggregate scores with weighted average', async () => {
    const length = new LengthEvaluator({ minLength: 1, maxLength: 100 });
    const keyword = new KeywordEvaluator({ requiredKeywords: ['test'] });
    
    const composite = new CompositeEvaluator({
      evaluators: [
        { evaluator: length, weight: 1 },
        { evaluator: keyword, weight: 1 },
      ],
      aggregation: 'weighted',
    });

    const result = await composite.evaluate(makeInput('test output'));
    expect(result.normalizedScore).toBeGreaterThan(0.5);
    expect(result.metadata?.componentScores).toHaveLength(2);
  });

  it('should use minimum aggregation', async () => {
    const length = new LengthEvaluator({ minLength: 1, maxLength: 100 });
    const keyword = new KeywordEvaluator({ requiredKeywords: ['missing'] });
    
    const composite = new CompositeEvaluator({
      evaluators: [
        { evaluator: length, weight: 1 },
        { evaluator: keyword, weight: 1 },
      ],
      aggregation: 'min',
    });

    const result = await composite.evaluate(makeInput('test output'));
    expect(result.normalizedScore).toBe(0);
  });

  it('should use maximum aggregation', async () => {
    const length = new LengthEvaluator({ minLength: 1, maxLength: 100 });
    const keyword = new KeywordEvaluator({ requiredKeywords: ['missing'] });
    
    const composite = new CompositeEvaluator({
      evaluators: [
        { evaluator: length, weight: 1 },
        { evaluator: keyword, weight: 1 },
      ],
      aggregation: 'max',
    });

    const result = await composite.evaluate(makeInput('test output'));
    expect(result.normalizedScore).toBe(1.0);
  });
});

describe('EvaluatorRegistry', () => {
  beforeEach(() => {
    resetEvaluatorRegistry();
  });

  it('should register and retrieve evaluators', () => {
    const registry = getEvaluatorRegistry();
    const evaluator = new LengthEvaluator({ minLength: 1, maxLength: 100 });
    
    registry.register('length', evaluator);
    const retrieved = registry.get('length');
    
    expect(retrieved).toBe(evaluator);
  });

  it('should list all registered evaluators', () => {
    const registry = getEvaluatorRegistry();
    registry.register('length', new LengthEvaluator({ minLength: 1, maxLength: 100 }));
    registry.register('keyword', new KeywordEvaluator({ requiredKeywords: ['test'] }));
    
    const names = registry.list();
    expect(names).toContain('length');
    expect(names).toContain('keyword');
  });

  it('should unregister evaluators', () => {
    const registry = getEvaluatorRegistry();
    registry.register('length', new LengthEvaluator({ minLength: 1, maxLength: 100 }));
    
    expect(registry.unregister('length')).toBe(true);
    expect(registry.get('length')).toBeUndefined();
  });

  it('should be singleton', () => {
    const registry1 = getEvaluatorRegistry();
    const registry2 = getEvaluatorRegistry();
    expect(registry1).toBe(registry2);
  });
});
