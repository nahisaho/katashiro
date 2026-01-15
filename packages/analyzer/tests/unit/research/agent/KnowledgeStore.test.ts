/**
 * KnowledgeStore ユニットテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeStore } from '../../../../src/research/agent/KnowledgeStore.js';

describe('KnowledgeStore', () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    store = new KnowledgeStore();
  });

  describe('add', () => {
    it('should add a knowledge item and return id', () => {
      const id = store.add({
        question: 'What is TypeScript?',
        answer: 'TypeScript is a typed superset of JavaScript.',
        type: 'url',
        confidence: 0.9,
      });

      expect(id).toBe('knowledge-1');
      expect(store.size()).toBe(1);
    });

    it('should generate incremental ids', () => {
      const id1 = store.add({
        question: 'Q1',
        answer: 'A1',
        type: 'url',
        confidence: 0.9,
      });
      const id2 = store.add({
        question: 'Q2',
        answer: 'A2',
        type: 'side-info',
        confidence: 0.8,
      });

      expect(id1).toBe('knowledge-1');
      expect(id2).toBe('knowledge-2');
    });
  });

  describe('get', () => {
    it('should get item by id', () => {
      const id = store.add({
        question: 'Test',
        answer: 'Answer',
        type: 'qa',
        confidence: 0.9,
      });

      const item = store.get(id);
      expect(item?.question).toBe('Test');
      expect(item?.answer).toBe('Answer');
    });

    it('should return undefined for non-existent id', () => {
      expect(store.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all items', () => {
      store.add({ question: 'Q1', answer: 'A1', type: 'url', confidence: 0.9 });
      store.add({ question: 'Q2', answer: 'A2', type: 'url', confidence: 0.8 });

      const all = store.getAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no items', () => {
      expect(store.getAll()).toHaveLength(0);
    });
  });

  describe('getByType', () => {
    beforeEach(() => {
      store.add({ question: 'Q1', answer: 'A1', type: 'url', confidence: 0.9 });
      store.add({ question: 'Q2', answer: 'A2', type: 'side-info', confidence: 0.8 });
      store.add({ question: 'Q3', answer: 'A3', type: 'url', confidence: 0.7 });
    });

    it('should filter by type', () => {
      const urlItems = store.getByType('url');
      expect(urlItems).toHaveLength(2);
      urlItems.forEach((item) => expect(item.type).toBe('url'));
    });

    it('should return empty for no matches', () => {
      const qaItems = store.getByType('qa');
      expect(qaItems).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      store.add({
        question: 'What is TypeScript?',
        answer: 'TypeScript is a programming language.',
        type: 'url',
        confidence: 0.9,
      });
      store.add({
        question: 'What is JavaScript?',
        answer: 'JavaScript is also a programming language.',
        type: 'url',
        confidence: 0.8,
      });
      store.add({
        question: 'What is Python?',
        answer: 'Python is used for data science.',
        type: 'side-info',
        confidence: 0.7,
      });
    });

    it('should search by question keyword', () => {
      const results = store.search('TypeScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].question).toContain('TypeScript');
    });

    it('should search by answer keyword', () => {
      const results = store.search('data science');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = store.search('nonexistent_xyz');
      expect(results).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const results = store.search('typescript');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getByConfidence', () => {
    beforeEach(() => {
      store.add({
        question: 'High',
        answer: 'Answer',
        type: 'url',
        confidence: 0.95,
      });
      store.add({
        question: 'Medium',
        answer: 'Answer',
        type: 'url',
        confidence: 0.7,
      });
      store.add({
        question: 'Low',
        answer: 'Answer',
        type: 'url',
        confidence: 0.5,
      });
    });

    it('should filter by minimum confidence', () => {
      const highConfidence = store.getByConfidence(0.8);
      expect(highConfidence).toHaveLength(1);
      expect(highConfidence[0].question).toBe('High');
    });

    it('should return sorted by confidence desc', () => {
      const all = store.getByConfidence(0);
      expect(all[0].question).toBe('High');
      expect(all[1].question).toBe('Medium');
      expect(all[2].question).toBe('Low');
    });
  });

  describe('toMessages', () => {
    it('should convert to message format', () => {
      store.add({
        question: 'What is AI?',
        answer: 'AI is artificial intelligence.',
        type: 'qa',
        confidence: 0.9,
      });

      const messages = store.toMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toContain('AI');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toContain('artificial intelligence');
    });
  });

  describe('update', () => {
    it('should update existing item', () => {
      const id = store.add({
        question: 'Test',
        answer: 'Original',
        type: 'url',
        confidence: 0.8,
      });

      const updated = store.update(id, { answer: 'Updated' });
      expect(updated).toBe(true);
      expect(store.get(id)?.answer).toBe('Updated');
    });

    it('should return false for non-existent id', () => {
      const updated = store.update('non-existent', { answer: 'Test' });
      expect(updated).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete item', () => {
      const id = store.add({
        question: 'Test',
        answer: 'Answer',
        type: 'url',
        confidence: 0.9,
      });

      expect(store.delete(id)).toBe(true);
      expect(store.get(id)).toBeUndefined();
      expect(store.size()).toBe(0);
    });

    it('should return false for non-existent id', () => {
      expect(store.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      store.add({ question: 'Q1', answer: 'A1', type: 'url', confidence: 0.9 });
      store.add({ question: 'Q2', answer: 'A2', type: 'url', confidence: 0.8 });

      store.clear();

      expect(store.size()).toBe(0);
      expect(store.getAll()).toHaveLength(0);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(store.size()).toBe(0);

      store.add({ question: 'Q', answer: 'A', type: 'url', confidence: 0.9 });
      expect(store.size()).toBe(1);
    });
  });

  describe('hasSimilarQuestion', () => {
    beforeEach(() => {
      store.add({
        question: 'What is the capital of France',
        answer: 'Paris',
        type: 'qa',
        confidence: 0.9,
      });
    });

    it('should find exact match questions', () => {
      const hasSimilar = store.hasSimilarQuestion('What is the capital of France');
      expect(hasSimilar).toBe(true);
    });

    it('should not find unrelated questions', () => {
      const hasSimilar = store.hasSimilarQuestion('What is machine learning used for');
      expect(hasSimilar).toBe(false);
    });

    it('should use Jaccard similarity', () => {
      // Jaccard similarity is based on word sets
      // 'What is the capital of France' has 6 words
      // Query needs significant overlap (>= 0.8 by default)
      const hasSimilar = store.hasSimilarQuestion('What is the capital of France today', 0.7);
      expect(hasSimilar).toBe(true);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should serialize and deserialize', () => {
      store.add({ question: 'Q1', answer: 'A1', type: 'url', confidence: 0.9 });
      store.add({ question: 'Q2', answer: 'A2', type: 'side-info', confidence: 0.8 });

      const json = store.toJSON();
      expect(json).toHaveLength(2);

      const newStore = new KnowledgeStore();
      newStore.fromJSON(json);

      expect(newStore.size()).toBe(2);
      expect(newStore.get('knowledge-1')?.question).toBe('Q1');
    });
  });
});
