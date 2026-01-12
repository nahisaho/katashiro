/**
 * GraphVisualization Unit Tests
 *
 * @task TSK-043
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphVisualization, VisualizationConfig } from '../../src/visualization/graph-visualization.js';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/graph/knowledge-graph.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('GraphVisualization', () => {
  let visualization: GraphVisualization;
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    visualization = new GraphVisualization(graph);

    // Setup test graph
    const nodes: GraphNode[] = [
      { id: 'A', type: 'concept', label: 'Node A', properties: {}, createdAt: '2024-01-01' },
      { id: 'B', type: 'concept', label: 'Node B', properties: {}, createdAt: '2024-01-01' },
      { id: 'C', type: 'entity', label: 'Node C', properties: {}, createdAt: '2024-01-01' },
    ];
    nodes.forEach(n => graph.addNode(n));

    const edges: GraphEdge[] = [
      { id: 'e1', source: 'A', target: 'B', predicate: 'relatesTo', weight: 0.8, createdAt: '2024-01-01' },
      { id: 'e2', source: 'B', target: 'C', predicate: 'contains', weight: 1.0, createdAt: '2024-01-01' },
    ];
    edges.forEach(e => graph.addEdge(e));
  });

  describe('toMermaid', () => {
    it('should generate Mermaid graph syntax', () => {
      const result = visualization.toMermaid();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('graph');
        expect(result.value).toContain('A');
        expect(result.value).toContain('B');
        expect(result.value).toContain('-->');
      }
    });

    it('should include edge labels', () => {
      const result = visualization.toMermaid({ showEdgeLabels: true });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('relatesTo');
      }
    });

    it('should use custom direction', () => {
      const result = visualization.toMermaid({ direction: 'LR' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('LR');
      }
    });
  });

  describe('toDOT', () => {
    it('should generate DOT format', () => {
      const result = visualization.toDOT();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('digraph');
        expect(result.value).toContain('->');
      }
    });

    it('should include node shapes by type', () => {
      const config: VisualizationConfig = {
        nodeShapes: { concept: 'box', entity: 'ellipse' },
      };
      const result = visualization.toDOT(config);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('shape=box');
        expect(result.value).toContain('shape=ellipse');
      }
    });
  });

  describe('toD3Json', () => {
    it('should generate D3-compatible JSON', () => {
      const result = visualization.toD3Json();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodes.length).toBe(3);
        expect(result.value.links.length).toBe(2);
      }
    });

    it('should include node indices in links', () => {
      const result = visualization.toD3Json();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Links should reference node indices or IDs
        expect(result.value.links[0]).toHaveProperty('source');
        expect(result.value.links[0]).toHaveProperty('target');
      }
    });
  });

  describe('toCytoscape', () => {
    it('should generate Cytoscape.js format', () => {
      const result = visualization.toCytoscape();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.elements.nodes.length).toBe(3);
        expect(result.value.elements.edges.length).toBe(2);
      }
    });

    it('should include node data', () => {
      const result = visualization.toCytoscape();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const nodeA = result.value.elements.nodes.find(n => n.data.id === 'A');
        expect(nodeA?.data.label).toBe('Node A');
      }
    });
  });

  describe('getStats', () => {
    it('should return graph statistics', () => {
      const result = visualization.getStats();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodeCount).toBe(3);
        expect(result.value.edgeCount).toBe(2);
        expect(result.value.nodeTypes).toContain('concept');
        expect(result.value.nodeTypes).toContain('entity');
      }
    });

    it('should calculate density', () => {
      const result = visualization.getStats();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Density = edges / (nodes * (nodes - 1)) for directed graph
        expect(result.value.density).toBeGreaterThan(0);
        expect(result.value.density).toBeLessThanOrEqual(1);
      }
    });
  });
});
