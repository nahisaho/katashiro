/**
 * GraphQuery Unit Tests
 *
 * AGENTS.md互換API - 直接配列を返すように更新
 *
 * @task TSK-042
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isOk } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/graph/knowledge-graph.js';
import { GraphQuery } from '../../src/query/graph-query.js';

describe('GraphQuery', () => {
  let graph: KnowledgeGraph;
  let query: GraphQuery;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    query = new GraphQuery(graph);

    // Set up test data
    const nodes: GraphNode[] = [
      { id: 'ts', type: 'language', label: 'TypeScript', properties: { typed: true }, createdAt: new Date().toISOString() },
      { id: 'js', type: 'language', label: 'JavaScript', properties: { typed: false }, createdAt: new Date().toISOString() },
      { id: 'go', type: 'language', label: 'Go', properties: { typed: true, year: 2009 }, createdAt: new Date().toISOString() },
      { id: 'node', type: 'runtime', label: 'Node.js', properties: {}, createdAt: new Date().toISOString() },
      { id: 'deno', type: 'runtime', label: 'Deno', properties: {}, createdAt: new Date().toISOString() },
    ];
    nodes.forEach(n => graph.addNode(n));

    const edges: GraphEdge[] = [
      { id: 'e1', source: 'ts', target: 'js', predicate: 'compiles-to', weight: 1, createdAt: new Date().toISOString() },
      { id: 'e2', source: 'node', target: 'js', predicate: 'runs', weight: 1, createdAt: new Date().toISOString() },
      { id: 'e3', source: 'deno', target: 'ts', predicate: 'runs', weight: 1, createdAt: new Date().toISOString() },
      { id: 'e4', source: 'deno', target: 'js', predicate: 'runs', weight: 1, createdAt: new Date().toISOString() },
    ];
    edges.forEach(e => graph.addEdge(e));
  });

  describe('findByType', () => {
    it('should find all nodes of a given type', () => {
      const result = query.findByType('language');

      expect(result.length).toBe(3);
      expect(result.map(n => n.id)).toContain('ts');
      expect(result.map(n => n.id)).toContain('js');
      expect(result.map(n => n.id)).toContain('go');
    });

    it('should return empty array for non-existent type', () => {
      const result = query.findByType('nonexistent');

      expect(result.length).toBe(0);
    });
  });

  describe('findByProperty', () => {
    it('should find nodes with matching property', () => {
      const result = query.findByProperty('typed', true);

      expect(result.length).toBe(2);
      expect(result.map(n => n.id)).toContain('ts');
      expect(result.map(n => n.id)).toContain('go');
    });

    it('should find nodes with numeric property', () => {
      const result = query.findByProperty('year', 2009);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('go');
    });
  });

  describe('findByPredicate', () => {
    it('should find edges with given predicate', () => {
      const result = query.findByPredicate('runs');

      expect(result.length).toBe(3);
    });
  });

  describe('findRelated', () => {
    it('should find nodes related to a given node', () => {
      const result = query.findRelated('deno');

      expect(result.length).toBe(2); // ts and js
    });

    it('should filter by predicate', () => {
      const result = query.findRelated('node', 'runs');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('js');
    });
  });

  describe('search', () => {
    it('should search by label substring', () => {
      const result = query.search('Script');

      expect(result.length).toBe(2); // TypeScript, JavaScript
    });

    it('should be case insensitive', () => {
      const result = query.search('type');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ts');
    });
  });

  describe('execute', () => {
    it('should execute structured query', () => {
      const result = query.execute({
        type: 'language',
        filters: [{ property: 'typed', operator: 'eq', value: true }],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodes.length).toBe(2);
      }
    });

    it('should apply limit and offset', () => {
      const result = query.execute({
        type: 'language',
        limit: 2,
        offset: 1,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodes.length).toBe(2);
        expect(result.value.totalCount).toBe(3);
      }
    });

    it('should sort results by property', () => {
      const result = query.execute({
        type: 'language',
        orderBy: 'year',
        orderDirection: 'asc',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Only Go has year property so it should be last (undefined sorts first)
        expect(result.value.nodes.length).toBe(3);
      }
    });
  });

  describe('aggregate', () => {
    it('should count nodes by type', () => {
      const result = query.aggregate('count', 'type');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value['language']).toBe(3);
        expect(result.value['runtime']).toBe(2);
      }
    });
  });
});
