/**
 * RelationAnalyzer Unit Tests
 *
 * @task TSK-023
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelationAnalyzer,
  Relation,
  RelationType,
  EntityPair,
} from '../../src/relation/relation-analyzer.js';
import type { Entity } from '../../src/entity/entity-extractor.js';

describe('RelationAnalyzer', () => {
  let analyzer: RelationAnalyzer;

  beforeEach(() => {
    analyzer = new RelationAnalyzer();
  });

  describe('extractRelations', () => {
    it('should extract ownership relations', () => {
      const text = '田中太郎さんは株式会社ABC商事の社長です。';
      const entities: Entity[] = [
        { type: 'person', text: '田中太郎さん', start: 0, end: 6 },
        { type: 'organization', text: '株式会社ABC商事', start: 7, end: 17 },
      ];
      
      const relations = analyzer.extractRelations(text, entities);
      expect(relations.length).toBeGreaterThan(0);
    });

    it('should extract location relations', () => {
      const text = '株式会社XYZは東京都渋谷区に本社があります。';
      const entities: Entity[] = [
        { type: 'organization', text: '株式会社XYZ', start: 0, end: 7 },
        { type: 'location', text: '東京都渋谷区', start: 8, end: 14 },
      ];
      
      const relations = analyzer.extractRelations(text, entities);
      const locRelations = relations.filter(r => r.type === 'located_in');
      expect(locRelations.length).toBeGreaterThan(0);
    });

    it('should extract temporal relations', () => {
      const text = '会議は2024年1月15日に開催されました。';
      const entities: Entity[] = [
        { type: 'date', text: '2024年1月15日', start: 3, end: 14 },
      ];
      
      const relations = analyzer.extractRelations(text, entities);
      const timeRelations = relations.filter(r => r.type === 'temporal');
      expect(timeRelations.length).toBeGreaterThan(0);
    });

    it('should handle empty entities', () => {
      const relations = analyzer.extractRelations('Some text', []);
      expect(relations).toEqual([]);
    });

    it('should handle single entity', () => {
      const entities: Entity[] = [
        { type: 'person', text: '田中さん', start: 0, end: 4 },
      ];
      const relations = analyzer.extractRelations('田中さんがいます。', entities);
      expect(relations).toEqual([]);
    });
  });

  describe('findCooccurrences', () => {
    it('should find entities in same sentence', () => {
      const text = '田中さんと山田さんが会議室で話しました。';
      const entities: Entity[] = [
        { type: 'person', text: '田中さん', start: 0, end: 4 },
        { type: 'person', text: '山田さん', start: 5, end: 9 },
      ];
      
      const pairs = analyzer.findCooccurrences(text, entities);
      expect(pairs.length).toBe(1);
      expect(pairs[0]?.distance).toBeDefined();
    });

    it('should calculate distance between entities', () => {
      const text = 'A is far from B';
      const entities: Entity[] = [
        { type: 'person', text: 'A', start: 0, end: 1 },
        { type: 'person', text: 'B', start: 14, end: 15 },
      ];
      
      const pairs = analyzer.findCooccurrences(text, entities);
      expect(pairs[0]?.distance).toBe(13);
    });
  });

  describe('inferRelationType', () => {
    it('should infer works_for relation', () => {
      const pair: EntityPair = {
        source: { type: 'person', text: '田中さん', start: 0, end: 4 },
        target: { type: 'organization', text: '株式会社ABC', start: 5, end: 12 },
        distance: 1,
        context: '田中さんは株式会社ABCで働いています',
      };
      
      const relType = analyzer.inferRelationType(pair);
      expect(relType).toBe('works_for');
    });

    it('should infer located_in relation', () => {
      const pair: EntityPair = {
        source: { type: 'organization', text: '会社', start: 0, end: 2 },
        target: { type: 'location', text: '東京', start: 3, end: 5 },
        distance: 1,
        context: '会社は東京にあります',
      };
      
      const relType = analyzer.inferRelationType(pair);
      expect(relType).toBe('located_in');
    });

    it('should return related for unknown patterns', () => {
      const pair: EntityPair = {
        source: { type: 'person', text: 'A', start: 0, end: 1 },
        target: { type: 'person', text: 'B', start: 2, end: 3 },
        distance: 1,
        context: 'A B',
      };
      
      const relType = analyzer.inferRelationType(pair);
      expect(relType).toBe('related');
    });
  });

  describe('buildRelationGraph', () => {
    it('should build graph from relations', () => {
      const relations: Relation[] = [
        {
          type: 'works_for',
          source: { type: 'person', text: 'A', start: 0, end: 1 },
          target: { type: 'organization', text: 'B', start: 2, end: 3 },
          confidence: 0.8,
        },
        {
          type: 'located_in',
          source: { type: 'organization', text: 'B', start: 2, end: 3 },
          target: { type: 'location', text: 'C', start: 4, end: 5 },
          confidence: 0.9,
        },
      ];
      
      const graph = analyzer.buildRelationGraph(relations);
      expect(graph.nodes.length).toBe(3);
      expect(graph.edges.length).toBe(2);
    });

    it('should handle empty relations', () => {
      const graph = analyzer.buildRelationGraph([]);
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
  });
});
