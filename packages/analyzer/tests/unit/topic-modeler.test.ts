/**
 * TopicModeler Unit Tests
 *
 * @task TSK-024
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TopicModeler,
  Topic,
  TopicDistribution,
} from '../../src/topic/topic-modeler.js';

describe('TopicModeler', () => {
  let modeler: TopicModeler;

  beforeEach(() => {
    modeler = new TopicModeler();
  });

  describe('extractTopics', () => {
    it('should extract topics from document', () => {
      const text = `
        機械学習は人工知能の一分野です。
        ディープラーニングはニューラルネットワークを使用します。
        自然言語処理はテキストを分析します。
      `;
      
      const topics = modeler.extractTopics(text);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics[0]?.keywords.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const topics = modeler.extractTopics('');
      expect(topics).toEqual([]);
    });

    it('should assign confidence scores', () => {
      const text = 'プログラミング言語について学びましょう。TypeScriptは型安全です。';
      const topics = modeler.extractTopics(text);
      
      for (const topic of topics) {
        expect(topic.confidence).toBeGreaterThan(0);
        expect(topic.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('calculateTfIdf', () => {
    it('should calculate TF-IDF scores', () => {
      const documents = [
        '犬は動物です。犬が好きです。',
        '猫も動物です。猫は可愛い。',
        '鳥は空を飛びます。',
      ];
      
      const tfidf = modeler.calculateTfIdf(documents);
      expect(Object.keys(tfidf).length).toBeGreaterThan(0);
    });

    it('should handle empty documents', () => {
      const tfidf = modeler.calculateTfIdf([]);
      expect(tfidf).toEqual({});
    });

    it('should give higher scores to distinctive terms', () => {
      const documents = [
        'AI AI AI machine learning',
        'web development frontend backend',
        'database SQL query',
      ];
      
      const tfidf = modeler.calculateTfIdf(documents);
      // AI appears multiple times in first doc but only in that doc
      expect(tfidf['ai']).toBeDefined();
    });
  });

  describe('clusterDocuments', () => {
    it('should cluster similar documents', () => {
      const documents = [
        'JavaScriptとTypeScriptの比較',
        'React vs Vue フレームワーク比較',
        '料理のレシピ 和食の作り方',
        'お菓子の作り方 スイーツレシピ',
      ];
      
      const clusters = modeler.clusterDocuments(documents, 2);
      expect(clusters.length).toBe(2);
    });

    it('should handle single document', () => {
      const clusters = modeler.clusterDocuments(['single doc'], 2);
      expect(clusters.length).toBe(1);
    });

    it('should handle empty documents', () => {
      const clusters = modeler.clusterDocuments([], 2);
      expect(clusters).toEqual([]);
    });
  });

  describe('findSimilarDocuments', () => {
    it('should find similar documents', () => {
      const corpus = [
        'TypeScriptは型安全なプログラミング言語です',
        'JavaScriptはウェブ開発で使われます',
        '料理のレシピを紹介します',
        'Pythonは機械学習に人気です',
      ];
      const query = 'プログラミング言語について';
      
      const similar = modeler.findSimilarDocuments(query, corpus, 2);
      expect(similar.length).toBe(2);
      expect(similar[0]?.similarity).toBeGreaterThanOrEqual(similar[1]?.similarity ?? 0);
    });

    it('should return empty for empty corpus', () => {
      const similar = modeler.findSimilarDocuments('query', [], 5);
      expect(similar).toEqual([]);
    });
  });

  describe('getTopicDistribution', () => {
    it('should return topic distribution for document', () => {
      const text = '人工知能と機械学習について説明します。';
      const distribution = modeler.getTopicDistribution(text);
      
      expect(distribution.topics.length).toBeGreaterThan(0);
      const totalWeight = distribution.topics.reduce((sum, t) => sum + t.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });
  });
});
