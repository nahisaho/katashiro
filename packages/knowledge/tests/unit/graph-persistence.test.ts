/**
 * GraphPersistence Unit Tests
 *
 * AGENTS.md互換API - serialize/deserializeは直接値を返す
 *
 * @task TSK-043
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isOk } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/graph/knowledge-graph.js';
import { GraphPersistence } from '../../src/persistence/graph-persistence.js';

describe('GraphPersistence', () => {
  let graph: KnowledgeGraph;
  let persistence: GraphPersistence;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    persistence = new GraphPersistence();

    // Set up test data
    const nodes: GraphNode[] = [
      { id: 'node1', type: 'concept', label: 'TypeScript', properties: { version: '5.0' }, createdAt: new Date().toISOString() },
      { id: 'node2', type: 'concept', label: 'JavaScript', properties: {}, createdAt: new Date().toISOString() },
    ];
    nodes.forEach(n => graph.addNode(n));

    graph.addEdge({
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      predicate: 'extends',
      weight: 1.0,
      createdAt: new Date().toISOString(),
    });
  });

  describe('serialize', () => {
    it('should serialize graph to JSON', () => {
      const result = persistence.serialize(graph);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.nodes).toBeDefined();
      expect(parsed.nodes.length).toBe(2);
    });

    it('should include metadata in serialization', () => {
      const result = persistence.serialize(graph);
      const parsed = JSON.parse(result);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.nodeCount).toBe(2);
      expect(parsed.metadata.edgeCount).toBe(1);
    });
  });

  describe('deserialize', () => {
    it('should deserialize JSON to graph', () => {
      const serialized = persistence.serialize(graph);
      const restored = persistence.deserialize(serialized);

      expect(restored.getNodeCount()).toBe(2);
      expect(restored.getEdgeCount()).toBe(1);
    });

    it('should restore node properties', () => {
      const serialized = persistence.serialize(graph);
      const restored = persistence.deserialize(serialized);

      const node = restored.getNode('node1');
      expect(node).not.toBeNull();
      expect(node?.properties.version).toBe('5.0');
    });
  });

  describe('toJSON', () => {
    it('should convert graph to JSON string', () => {
      const result = persistence.toJSON(graph);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const parsed = JSON.parse(result.value);
        expect(parsed.nodes.length).toBe(2);
        expect(parsed.edges.length).toBe(1);
      }
    });

    it('should include metadata', () => {
      const result = persistence.toJSON(graph);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const parsed = JSON.parse(result.value);
        expect(parsed.metadata.nodeCount).toBe(2);
        expect(parsed.metadata.edgeCount).toBe(1);
      }
    });
  });

  describe('fromJSON', () => {
    it('should load graph from JSON string', () => {
      const json = persistence.serialize(graph);
      const newGraph = new KnowledgeGraph();
      const result = persistence.fromJSON(json, newGraph);

      expect(isOk(result)).toBe(true);
      expect(newGraph.getNodeCount()).toBe(2);
      expect(newGraph.getEdgeCount()).toBe(1);
    });

    it('should restore edges correctly', () => {
      const json = persistence.serialize(graph);
      const newGraph = new KnowledgeGraph();
      const result = persistence.fromJSON(json, newGraph);

      expect(isOk(result)).toBe(true);
      const edges = newGraph.getAllEdges();
      expect(edges.length).toBe(1);
      expect(edges[0].predicate).toBe('extends');
    });
  });

  describe('validate', () => {
    it('should validate correct serialized graph', () => {
      const json = persistence.serialize(graph);
      const data = JSON.parse(json);

      const result = persistence.validate(data);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('should detect invalid edge references', () => {
      const invalidData = {
        version: '1.0',
        nodes: [
          { id: 'node1', type: 'concept', label: 'Test', properties: {}, createdAt: new Date().toISOString() },
        ],
        edges: [
          { id: 'edge1', source: 'node1', target: 'nonexistent', predicate: 'relates', weight: 1, createdAt: new Date().toISOString() },
        ],
        metadata: { nodeCount: 1, edgeCount: 1, version: '1.0', createdAt: new Date().toISOString() },
      };

      const result = persistence.validate(invalidData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        version: '1.0',
        nodes: [],
        // edges missing
        metadata: { nodeCount: 0, edgeCount: 0, createdAt: new Date().toISOString() },
      };

      const result = persistence.validate(invalidData as any);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    it('should detect metadata nodeCount mismatch', () => {
      const invalidData = {
        version: '1.0',
        nodes: [{ id: 'n1', type: 'concept', label: 'Test', properties: {}, createdAt: new Date().toISOString() }],
        edges: [],
        metadata: { nodeCount: 5, edgeCount: 0, createdAt: new Date().toISOString() }, // Wrong count
      };

      const result = persistence.validate(invalidData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('serializeToObject', () => {
    it('should serialize graph to object', () => {
      const result = persistence.serializeToObject(graph);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodes.length).toBe(2);
        expect(result.value.edges.length).toBe(1);
        expect(result.value.version).toBe('1.0');
      }
    });
  });

  describe('deserializeFromObject', () => {
    it('should deserialize object to graph', () => {
      const serializeResult = persistence.serializeToObject(graph);
      expect(isOk(serializeResult)).toBe(true);

      if (isOk(serializeResult)) {
        const newGraph = new KnowledgeGraph();
        const result = persistence.deserializeFromObject(serializeResult.value, newGraph);

        expect(isOk(result)).toBe(true);
        expect(newGraph.getNodeCount()).toBe(2);
        expect(newGraph.getEdgeCount()).toBe(1);
      }
    });

    it('should clear existing graph before deserializing', () => {
      const newGraph = new KnowledgeGraph();
      newGraph.addNode({ id: 'existing', type: 'concept', label: 'Existing', properties: {}, createdAt: new Date().toISOString() });

      const serializeResult = persistence.serializeToObject(graph);
      expect(isOk(serializeResult)).toBe(true);

      if (isOk(serializeResult)) {
        persistence.deserializeFromObject(serializeResult.value, newGraph);
        expect(newGraph.getNode('existing')).toBeNull();
        expect(newGraph.getNodeCount()).toBe(2);
      }
    });
  });

  describe('diff', () => {
    it('should detect added nodes', () => {
      const before = JSON.parse(persistence.serialize(graph));
      
      graph.addNode({ id: 'node3', type: 'concept', label: 'New', properties: {}, createdAt: new Date().toISOString() });
      const after = JSON.parse(persistence.serialize(graph));

      const result = persistence.diff(before, after);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.addedNodes.length).toBe(1);
        expect(result.value.addedNodes[0].id).toBe('node3');
        expect(result.value.hasChanges).toBe(true);
      }
    });

    it('should detect removed nodes', () => {
      const before = JSON.parse(persistence.serialize(graph));
      
      const newGraph = new KnowledgeGraph();
      newGraph.addNode({ id: 'node1', type: 'concept', label: 'TypeScript', properties: {}, createdAt: new Date().toISOString() });
      const after = JSON.parse(persistence.serialize(newGraph));

      const result = persistence.diff(before, after);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.removedNodes.length).toBe(1);
        expect(result.value.removedNodes[0].id).toBe('node2');
        expect(result.value.hasChanges).toBe(true);
      }
    });

    it('should detect added edges', () => {
      const before = JSON.parse(persistence.serialize(graph));
      
      graph.addEdge({ id: 'edge2', source: 'node2', target: 'node1', predicate: 'relates', weight: 0.5, createdAt: new Date().toISOString() });
      const after = JSON.parse(persistence.serialize(graph));

      const result = persistence.diff(before, after);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.addedEdges.length).toBe(1);
        expect(result.value.addedEdges[0].id).toBe('edge2');
      }
    });

    it('should report no changes for identical graphs', () => {
      const data = JSON.parse(persistence.serialize(graph));

      const result = persistence.diff(data, data);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.hasChanges).toBe(false);
      }
    });
  });

  describe('merge', () => {
    it('should merge two graphs', () => {
      const base = JSON.parse(persistence.serialize(graph));

      const otherGraph = new KnowledgeGraph();
      otherGraph.addNode({ id: 'node3', type: 'concept', label: 'Merged', properties: {}, createdAt: new Date().toISOString() });
      otherGraph.addNode({ id: 'node1', type: 'concept', label: 'Duplicate', properties: {}, createdAt: new Date().toISOString() }); // Should be ignored
      const other = JSON.parse(persistence.serialize(otherGraph));

      const result = persistence.merge(base, other);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodes.length).toBe(3); // 2 from base + 1 new
        expect(result.value.metadata.nodeCount).toBe(3);
      }
    });

    it('should merge edges from other graph', () => {
      const base = JSON.parse(persistence.serialize(graph));

      const otherGraph = new KnowledgeGraph();
      otherGraph.addNode({ id: 'node1', type: 'concept', label: 'A', properties: {}, createdAt: new Date().toISOString() });
      otherGraph.addNode({ id: 'node2', type: 'concept', label: 'B', properties: {}, createdAt: new Date().toISOString() });
      otherGraph.addEdge({ id: 'edge2', source: 'node1', target: 'node2', predicate: 'new', weight: 1, createdAt: new Date().toISOString() });
      const other = JSON.parse(persistence.serialize(otherGraph));

      const result = persistence.merge(base, other);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.edges.length).toBe(2); // 1 from base + 1 new
      }
    });

    it('should update metadata timestamp', () => {
      const base = JSON.parse(persistence.serialize(graph));
      const other = JSON.parse(persistence.serialize(new KnowledgeGraph()));

      const result = persistence.merge(base, other);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.metadata.updatedAt).toBeDefined();
      }
    });
  });
});
