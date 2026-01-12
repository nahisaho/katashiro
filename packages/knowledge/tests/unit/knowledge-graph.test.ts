/**
 * KnowledgeGraph Unit Tests
 *
 * AGENTS.md互換API - 直接値を返すように更新
 *
 * @task TSK-040
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
} from '../../src/graph/knowledge-graph.js';

describe('KnowledgeGraph', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const node: GraphNode = {
        id: 'node-001',
        type: 'concept',
        label: 'TypeScript',
        properties: { category: 'programming-language' },
        createdAt: new Date().toISOString(),
      };

      const result = graph.addNode(node);

      expect(result).toBeDefined();
      expect(result.id).toBe('node-001');
      expect(graph.getNodeCount()).toBe(1);
    });

    it('should reject duplicate node IDs', () => {
      const node: GraphNode = {
        id: 'node-001',
        type: 'concept',
        label: 'TypeScript',
        properties: {},
        createdAt: new Date().toISOString(),
      };

      graph.addNode(node);
      
      expect(() => graph.addNode(node)).toThrow('already exists');
    });
  });

  describe('addEdge', () => {
    it('should add an edge between nodes', () => {
      const node1: GraphNode = {
        id: 'node-001',
        type: 'concept',
        label: 'TypeScript',
        properties: {},
        createdAt: new Date().toISOString(),
      };
      const node2: GraphNode = {
        id: 'node-002',
        type: 'concept',
        label: 'JavaScript',
        properties: {},
        createdAt: new Date().toISOString(),
      };

      graph.addNode(node1);
      graph.addNode(node2);

      const edge: GraphEdge = {
        id: 'edge-001',
        source: 'node-001',
        target: 'node-002',
        predicate: 'extends',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      };

      const result = graph.addEdge(edge);

      expect(result).toBeDefined();
      expect(result.id).toBe('edge-001');
      expect(graph.getEdgeCount()).toBe(1);
    });

    it('should reject edge with non-existent source node', () => {
      const node: GraphNode = {
        id: 'node-001',
        type: 'concept',
        label: 'TypeScript',
        properties: {},
        createdAt: new Date().toISOString(),
      };
      graph.addNode(node);

      const edge: GraphEdge = {
        id: 'edge-001',
        source: 'non-existent',
        target: 'node-001',
        predicate: 'relates',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      };

      expect(() => graph.addEdge(edge)).toThrow('does not exist');
    });
  });

  describe('getNode', () => {
    it('should retrieve node by ID', () => {
      const node: GraphNode = {
        id: 'node-001',
        type: 'concept',
        label: 'TypeScript',
        properties: { version: '5.0' },
        createdAt: new Date().toISOString(),
      };
      graph.addNode(node);

      const result = graph.getNode('node-001');

      expect(result).not.toBeNull();
      expect(result?.label).toBe('TypeScript');
    });

    it('should return null for non-existent node', () => {
      const result = graph.getNode('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getNeighbors', () => {
    it('should get all neighbors of a node', () => {
      // Setup triangle graph
      const nodes: GraphNode[] = [
        { id: 'A', type: 'concept', label: 'A', properties: {}, createdAt: new Date().toISOString() },
        { id: 'B', type: 'concept', label: 'B', properties: {}, createdAt: new Date().toISOString() },
        { id: 'C', type: 'concept', label: 'C', properties: {}, createdAt: new Date().toISOString() },
      ];
      nodes.forEach(n => graph.addNode(n));

      graph.addEdge({ id: 'e1', source: 'A', target: 'B', predicate: 'connects', weight: 1, createdAt: new Date().toISOString() });
      graph.addEdge({ id: 'e2', source: 'A', target: 'C', predicate: 'connects', weight: 1, createdAt: new Date().toISOString() });

      const result = graph.getNeighbors('A');

      expect(result.length).toBe(2);
      expect(result.map(n => n.id)).toContain('B');
      expect(result.map(n => n.id)).toContain('C');
    });
  });

  describe('removeNode', () => {
    it('should remove node and its edges', () => {
      const nodes: GraphNode[] = [
        { id: 'A', type: 'concept', label: 'A', properties: {}, createdAt: new Date().toISOString() },
        { id: 'B', type: 'concept', label: 'B', properties: {}, createdAt: new Date().toISOString() },
      ];
      nodes.forEach(n => graph.addNode(n));
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', predicate: 'connects', weight: 1, createdAt: new Date().toISOString() });

      const result = graph.removeNode('A');

      expect(result).toBe(true);
      expect(graph.getNodeCount()).toBe(1);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });

  describe('findPath', () => {
    it('should find path between two nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'A', type: 'concept', label: 'A', properties: {}, createdAt: new Date().toISOString() },
        { id: 'B', type: 'concept', label: 'B', properties: {}, createdAt: new Date().toISOString() },
        { id: 'C', type: 'concept', label: 'C', properties: {}, createdAt: new Date().toISOString() },
      ];
      nodes.forEach(n => graph.addNode(n));

      graph.addEdge({ id: 'e1', source: 'A', target: 'B', predicate: 'connects', weight: 1, createdAt: new Date().toISOString() });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', predicate: 'connects', weight: 1, createdAt: new Date().toISOString() });

      const result = graph.findPath('A', 'C');

      expect(result).not.toBeNull();
      expect(result?.length).toBe(3);
    });

    it('should return null when no path exists', () => {
      const nodes: GraphNode[] = [
        { id: 'A', type: 'concept', label: 'A', properties: {}, createdAt: new Date().toISOString() },
        { id: 'B', type: 'concept', label: 'B', properties: {}, createdAt: new Date().toISOString() },
      ];
      nodes.forEach(n => graph.addNode(n));
      // No edge between A and B

      const result = graph.findPath('A', 'B');

      expect(result).toBeNull();
    });
  });

  describe('addNode (AGENTS.md API)', () => {
    it('should auto-generate ID when not provided', () => {
      const result = graph.addNode({
        type: 'concept',
        label: 'Auto ID Node',
      });

      expect(result.id).toBeDefined();
      expect(result.id).not.toBe('');
      expect(result.type).toBe('concept');
    });

    it('should use ID as label if label not provided', () => {
      const result = graph.addNode({
        id: 'test-node',
        type: 'category',
      });

      // label defaults to nodeId when not provided
      expect(result.label).toBe('test-node');
    });

    it('should set default properties', () => {
      const result = graph.addNode({
        id: 'props-test',
        type: 'test',
      });

      expect(result.properties).toEqual({});
      expect(result.createdAt).toBeDefined();
    });
  });

  describe('addEdge (AGENTS.md API)', () => {
    beforeEach(() => {
      graph.addNode({ id: 'n1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'n2', type: 'test', label: 'Node 2' });
    });

    it('should auto-generate edge ID when not provided', () => {
      const result = graph.addEdge({
        source: 'n1',
        target: 'n2',
        predicate: 'links',
      });

      expect(result.id).toBeDefined();
      expect(result.id).not.toBe('');
    });

    it('should use type as predicate if predicate not provided', () => {
      const result = graph.addEdge({
        source: 'n1',
        target: 'n2',
        type: 'relates_to',
      });

      expect(result.predicate).toBe('relates_to');
    });

    it('should default predicate to "related" if neither type nor predicate provided', () => {
      const result = graph.addEdge({
        source: 'n1',
        target: 'n2',
      });

      expect(result.predicate).toBe('related');
    });

    it('should default weight to 1.0', () => {
      const result = graph.addEdge({
        source: 'n1',
        target: 'n2',
        predicate: 'test',
      });

      expect(result.weight).toBe(1.0);
    });
  });

  describe('getEdge', () => {
    it('should retrieve edge by ID', () => {
      graph.addNode({ id: 'n1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'n2', type: 'test', label: 'Node 2' });
      graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', predicate: 'links', weight: 0.5, createdAt: new Date().toISOString() });

      const result = graph.getEdge('e1');

      expect(result).not.toBeNull();
      expect(result?.weight).toBe(0.5);
    });

    it('should return null for non-existent edge', () => {
      const result = graph.getEdge('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('removeEdge', () => {
    it('should remove edge by ID', () => {
      graph.addNode({ id: 'n1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'n2', type: 'test', label: 'Node 2' });
      graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });

      expect(graph.getEdgeCount()).toBe(1);
      const result = graph.removeEdge('e1');

      expect(result).toBe(true);
      expect(graph.getEdgeCount()).toBe(0);
    });

    it('should return false for non-existent edge', () => {
      const result = graph.removeEdge('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('removeNode', () => {
    it('should return false for non-existent node', () => {
      const result = graph.removeNode('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getIncomingNeighbors', () => {
    it('should get nodes pointing to this node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'C', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });

      const result = graph.getIncomingNeighbors('C');

      expect(result.length).toBe(2);
      expect(result.map(n => n.id)).toContain('A');
      expect(result.map(n => n.id)).toContain('B');
    });

    it('should return empty array for node with no incoming edges', () => {
      graph.addNode({ id: 'lonely', type: 'test', label: 'Lonely' });

      const result = graph.getIncomingNeighbors('lonely');
      expect(result).toEqual([]);
    });
  });

  describe('getOutgoingEdges', () => {
    it('should get edges from a node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });
      graph.addEdge({ id: 'e2', source: 'A', target: 'C', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });

      const result = graph.getOutgoingEdges('A');

      expect(result.length).toBe(2);
    });

    it('should return empty array for non-existent node', () => {
      const result = graph.getOutgoingEdges('non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('getAllNodes and getAllEdges', () => {
    it('should return all nodes', () => {
      graph.addNode({ id: 'n1', type: 'a', label: '1' });
      graph.addNode({ id: 'n2', type: 'b', label: '2' });

      const nodes = graph.getAllNodes();
      expect(nodes.length).toBe(2);
    });

    it('should return all edges', () => {
      graph.addNode({ id: 'n1', type: 'test', label: '1' });
      graph.addNode({ id: 'n2', type: 'test', label: '2' });
      graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });

      const edges = graph.getAllEdges();
      expect(edges.length).toBe(1);
    });
  });

  describe('query as searchNodes', () => {
    it('should search nodes by label', () => {
      graph.addNode({ id: 'n1', type: 'lang', label: 'TypeScript' });
      graph.addNode({ id: 'n2', type: 'lang', label: 'JavaScript' });
      graph.addNode({ id: 'n3', type: 'lang', label: 'Python' });

      // query() is used for text search
      const result = graph.query('script');

      expect(result.length).toBe(2);
      expect(result.map(n => n.label)).toContain('TypeScript');
      expect(result.map(n => n.label)).toContain('JavaScript');
    });

    it('should be case-insensitive', () => {
      graph.addNode({ id: 'n1', type: 'test', label: 'Hello World' });

      expect(graph.query('HELLO').length).toBe(1);
      expect(graph.query('hello').length).toBe(1);
    });
  });

  describe('getNodesByType', () => {
    it('should filter nodes by type', () => {
      graph.addNode({ id: 'n1', type: 'person', label: 'Alice' });
      graph.addNode({ id: 'n2', type: 'person', label: 'Bob' });
      graph.addNode({ id: 'n3', type: 'organization', label: 'Acme' });

      const people = graph.getNodesByType('person');

      expect(people.length).toBe(2);
      expect(people.every(n => n.type === 'person')).toBe(true);
    });
  });

  describe('getEdgesByPredicate', () => {
    it('should filter edges by predicate', () => {
      graph.addNode({ id: 'n1', type: 'test', label: '1' });
      graph.addNode({ id: 'n2', type: 'test', label: '2' });
      graph.addNode({ id: 'n3', type: 'test', label: '3' });
      graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', predicate: 'knows', weight: 1, createdAt: new Date().toISOString() });
      graph.addEdge({ id: 'e2', source: 'n2', target: 'n3', predicate: 'works_with', weight: 1, createdAt: new Date().toISOString() });

      const knowsEdges = graph.getEdgesByPredicate('knows');

      expect(knowsEdges.length).toBe(1);
      expect(knowsEdges[0].predicate).toBe('knows');
    });
  });

  describe('query (AGENTS.md API)', () => {
    beforeEach(() => {
      graph.addNode({ id: 'p1', type: 'person', label: 'Alice Smith', properties: { role: 'developer' } });
      graph.addNode({ id: 'p2', type: 'person', label: 'Bob Jones', properties: { role: 'manager' } });
      graph.addNode({ id: 'o1', type: 'organization', label: 'Acme Corp', properties: { industry: 'tech' } });
    });

    it('should query by string (text search)', () => {
      const result = graph.query('alice');
      expect(result.length).toBe(1);
      expect(result[0].label).toBe('Alice Smith');
    });

    it('should search in type field', () => {
      const result = graph.query('person');
      expect(result.length).toBe(2);
    });

    it('should search in properties', () => {
      const result = graph.query('developer');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('p1');
    });

    it('should query by type filter', () => {
      const result = graph.query({ type: 'organization' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('o1');
    });

    it('should query by label filter', () => {
      const result = graph.query({ label: 'Bob' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('p2');
    });

    it('should query by property filter', () => {
      const result = graph.query({ role: 'manager' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('p2');
    });

    it('should combine multiple filters', () => {
      const result = graph.query({ type: 'person', role: 'developer' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('p1');
    });
  });

  describe('findPath edge cases', () => {
    it('should return path with same start and end', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });

      const result = graph.findPath('A', 'A');

      expect(result).toEqual(['A']);
    });

    it('should return null for non-existent start node', () => {
      graph.addNode({ id: 'B', type: 'test', label: 'B' });

      const result = graph.findPath('non-existent', 'B');

      expect(result).toBeNull();
    });

    it('should return null for non-existent end node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });

      const result = graph.findPath('A', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all nodes and edges', () => {
      graph.addNode({ id: 'n1', type: 'test', label: '1' });
      graph.addNode({ id: 'n2', type: 'test', label: '2' });
      graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', predicate: 'links', weight: 1, createdAt: new Date().toISOString() });

      expect(graph.getNodeCount()).toBe(2);
      expect(graph.getEdgeCount()).toBe(1);

      graph.clear();

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });
});
