/**
 * GraphSync Unit Tests
 *
 * AGENTS.md互換API - getNodeは直接値を返す
 *
 * @task TSK-044
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isOk } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/graph/knowledge-graph.js';
import { GraphSync } from '../../src/sync/graph-sync.js';

describe('GraphSync', () => {
  let localGraph: KnowledgeGraph;
  let remoteGraph: KnowledgeGraph;
  let sync: GraphSync;

  beforeEach(() => {
    localGraph = new KnowledgeGraph();
    remoteGraph = new KnowledgeGraph();
    sync = new GraphSync(localGraph, remoteGraph);

    // Set up common node in both graphs
    const commonNode: GraphNode = {
      id: 'A',
      type: 'concept',
      label: 'Common Node',
      properties: {},
      createdAt: new Date().toISOString(),
    };
    localGraph.addNode(commonNode);
    remoteGraph.addNode(commonNode);
  });

  describe('compare', () => {
    it('should identify nodes only in local graph', () => {
      localGraph.addNode({ id: 'B', type: 'concept', label: 'Local Only', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.localOnly.nodes.length).toBe(1);
        expect(result.value.localOnly.nodes[0].id).toBe('B');
      }
    });

    it('should identify nodes only in remote graph', () => {
      remoteGraph.addNode({ id: 'C', type: 'concept', label: 'Remote Only', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remoteOnly.nodes.length).toBe(1);
        expect(result.value.remoteOnly.nodes[0].id).toBe('C');
      }
    });
  });

  describe('pull', () => {
    it('should pull changes from remote', () => {
      remoteGraph.addNode({ id: 'C', type: 'concept', label: 'Remote Node', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.pull();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodesAdded).toBe(1);
        // C should be in local graph now
        const nodeResult = localGraph.getNode('C');
        expect(nodeResult).not.toBeNull();
      }
    });

    it('should update modified nodes', () => {
      // Mark node A for update in remote by removing and re-adding with updated data
      remoteGraph.removeNode('A');
      remoteGraph.addNode({
        id: 'A',
        type: 'concept',
        label: 'Updated Node',
        properties: { updated: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      });

      const result = sync.pull({ updateExisting: true });

      expect(isOk(result)).toBe(true);
    });
  });

  describe('push', () => {
    it('should push changes to remote', () => {
      localGraph.addNode({ id: 'B', type: 'concept', label: 'Local Node', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.push();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodesAdded).toBe(1);
        // B should be in remote graph now
        const nodeResult = remoteGraph.getNode('B');
        expect(nodeResult).not.toBeNull();
      }
    });
  });

  describe('sync', () => {
    it('should bidirectionally sync changes', () => {
      localGraph.addNode({ id: 'B', type: 'concept', label: 'Local Node', properties: {}, createdAt: new Date().toISOString() });
      remoteGraph.addNode({ id: 'C', type: 'concept', label: 'Remote Node', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.sync();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Both graphs should now have A, B, and C
        expect(localGraph.getNodeCount()).toBe(3);
        expect(remoteGraph.getNodeCount()).toBe(3);
      }
    });
  });

  describe('getLastSyncTime', () => {
    it('should return null before first sync', () => {
      expect(sync.getLastSyncTime()).toBeNull();
    });

    it('should return timestamp after sync', () => {
      sync.pull();
      expect(sync.getLastSyncTime()).not.toBeNull();
    });
  });

  describe('getConflicts', () => {
    it('should return empty array when no conflicts', () => {
      const result = sync.getConflicts();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('edge synchronization', () => {
    beforeEach(() => {
      // Add another node to both graphs for edge testing
      const nodeB: GraphNode = {
        id: 'B',
        type: 'concept',
        label: 'Node B',
        properties: {},
        createdAt: new Date().toISOString(),
      };
      localGraph.addNode(nodeB);
      remoteGraph.addNode(nodeB);
    });

    it('should identify edges only in local graph', () => {
      localGraph.addEdge({
        id: 'edge1',
        source: 'A',
        target: 'B',
        predicate: 'relates',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      });

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.localOnly.edges.length).toBe(1);
        expect(result.value.localOnly.edges[0].id).toBe('edge1');
      }
    });

    it('should identify edges only in remote graph', () => {
      remoteGraph.addEdge({
        id: 'edge2',
        source: 'A',
        target: 'B',
        predicate: 'connects',
        weight: 0.8,
        createdAt: new Date().toISOString(),
      });

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remoteOnly.edges.length).toBe(1);
        expect(result.value.remoteOnly.edges[0].id).toBe('edge2');
      }
    });

    it('should pull edges from remote', () => {
      remoteGraph.addEdge({
        id: 'edge1',
        source: 'A',
        target: 'B',
        predicate: 'relates',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      });

      const result = sync.pull();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.edgesAdded).toBe(1);
        expect(localGraph.getEdgeCount()).toBe(1);
      }
    });

    it('should push edges to remote', () => {
      localGraph.addEdge({
        id: 'edge1',
        source: 'A',
        target: 'B',
        predicate: 'relates',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      });

      const result = sync.push();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.edgesAdded).toBe(1);
        expect(remoteGraph.getEdgeCount()).toBe(1);
      }
    });

    it('should identify identical edges', () => {
      const edge: GraphEdge = {
        id: 'edge1',
        source: 'A',
        target: 'B',
        predicate: 'relates',
        weight: 1.0,
        createdAt: new Date().toISOString(),
      };
      localGraph.addEdge(edge);
      remoteGraph.addEdge(edge);

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.identical.edges.length).toBe(1);
      }
    });
  });

  describe('filtering', () => {
    it('should filter by node types in pull', () => {
      remoteGraph.addNode({ id: 'C', type: 'person', label: 'Person', properties: {}, createdAt: new Date().toISOString() });
      remoteGraph.addNode({ id: 'D', type: 'concept', label: 'Concept', properties: {}, createdAt: new Date().toISOString() });

      const result = sync.pull({ nodeTypes: ['concept'] });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.nodesAdded).toBe(1); // Only concept D
        expect(localGraph.getNode('D')).not.toBeNull();
        expect(localGraph.getNode('C')).toBeNull();
      }
    });

    it('should filter by predicates in pull', () => {
      const nodeB: GraphNode = {
        id: 'B',
        type: 'concept',
        label: 'Node B',
        properties: {},
        createdAt: new Date().toISOString(),
      };
      localGraph.addNode(nodeB);
      remoteGraph.addNode(nodeB);

      remoteGraph.addEdge({ id: 'e1', source: 'A', target: 'B', predicate: 'relates', weight: 1, createdAt: new Date().toISOString() });
      remoteGraph.addEdge({ id: 'e2', source: 'A', target: 'B', predicate: 'extends', weight: 1, createdAt: new Date().toISOString() });

      const result = sync.pull({ predicates: ['relates'] });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.edgesAdded).toBe(1); // Only 'relates' edge
      }
    });
  });

  describe('modified detection', () => {
    it('should identify modified nodes', () => {
      // Modify node A in remote with different updatedAt timestamp
      remoteGraph.removeNode('A');
      remoteGraph.addNode({
        id: 'A',
        type: 'concept',
        label: 'Modified Label',
        properties: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() + 10000).toISOString(),
      });

      const result = sync.compare();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.modified.nodes.length).toBe(1);
      }
    });
  });
});
