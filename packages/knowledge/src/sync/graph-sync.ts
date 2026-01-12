/**
 * GraphSync - Synchronization between knowledge graphs
 *
 * Handles merging and syncing graph data between local and remote
 *
 * @module @nahisaho/katashiro-knowledge
 * @task TSK-044
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, type GraphNode, type GraphEdge } from '../graph/knowledge-graph.js';

/**
 * Sync options
 */
export interface SyncOptions {
  /** Whether to update existing nodes/edges */
  updateExisting?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: 'local' | 'remote' | 'newer';
  /** Only sync specific node types */
  nodeTypes?: string[];
  /** Only sync specific predicates */
  predicates?: string[];
}

/**
 * Sync result
 */
export interface SyncResult {
  nodesAdded: number;
  nodesUpdated: number;
  nodesRemoved: number;
  edgesAdded: number;
  edgesUpdated: number;
  edgesRemoved: number;
  conflicts: Conflict[];
  timestamp: string;
}

/**
 * Comparison result
 */
export interface ComparisonResult {
  localOnly: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  remoteOnly: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  modified: {
    nodes: Array<{ local: GraphNode; remote: GraphNode }>;
    edges: Array<{ local: GraphEdge; remote: GraphEdge }>;
  };
  identical: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

/**
 * Conflict representation
 */
export interface Conflict {
  type: 'node' | 'edge';
  id: string;
  local: GraphNode | GraphEdge;
  remote: GraphNode | GraphEdge;
  field: string;
}

/**
 * GraphSync
 *
 * Synchronizes knowledge graphs between local and remote sources
 */
export class GraphSync {
  private lastSyncTime: string | null = null;

  constructor(
    private localGraph: KnowledgeGraph,
    private remoteGraph: KnowledgeGraph
  ) {}

  /**
   * Compare local and remote graphs
   *
   * @returns Comparison result
   */
  compare(): Result<ComparisonResult, Error> {
    try {
      const localNodes = this.localGraph.getAllNodes();
      const remoteNodes = this.remoteGraph.getAllNodes();

      const localNodeMap = new Map(localNodes.map((n) => [n.id, n]));
      const remoteNodeMap = new Map(remoteNodes.map((n) => [n.id, n]));

      const localOnly: GraphNode[] = [];
      const remoteOnly: GraphNode[] = [];
      const modified: Array<{ local: GraphNode; remote: GraphNode }> = [];
      const identical: GraphNode[] = [];

      // Check local nodes
      for (const node of localNodes) {
        const remoteNode = remoteNodeMap.get(node.id);
        if (!remoteNode) {
          localOnly.push(node);
        } else if (this.isNodeModified(node, remoteNode)) {
          modified.push({ local: node, remote: remoteNode });
        } else {
          identical.push(node);
        }
      }

      // Check remote-only nodes
      for (const node of remoteNodes) {
        if (!localNodeMap.has(node.id)) {
          remoteOnly.push(node);
        }
      }

      // Compare edges
      const localEdges = this.localGraph.getAllEdges();
      const remoteEdges = this.remoteGraph.getAllEdges();

      const localEdgeMap = new Map(localEdges.map((e) => [e.id, e]));
      const remoteEdgeMap = new Map(remoteEdges.map((e) => [e.id, e]));

      const localOnlyEdges: GraphEdge[] = [];
      const remoteOnlyEdges: GraphEdge[] = [];
      const modifiedEdges: Array<{ local: GraphEdge; remote: GraphEdge }> = [];
      const identicalEdges: GraphEdge[] = [];

      for (const edge of localEdges) {
        const remoteEdge = remoteEdgeMap.get(edge.id);
        if (!remoteEdge) {
          localOnlyEdges.push(edge);
        } else if (this.isEdgeModified(edge, remoteEdge)) {
          modifiedEdges.push({ local: edge, remote: remoteEdge });
        } else {
          identicalEdges.push(edge);
        }
      }

      for (const edge of remoteEdges) {
        if (!localEdgeMap.has(edge.id)) {
          remoteOnlyEdges.push(edge);
        }
      }

      return ok({
        localOnly: { nodes: localOnly, edges: localOnlyEdges },
        remoteOnly: { nodes: remoteOnly, edges: remoteOnlyEdges },
        modified: { nodes: modified, edges: modifiedEdges },
        identical: { nodes: identical, edges: identicalEdges },
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Pull changes from remote to local
   *
   * @param options - Sync options
   * @returns Sync result
   */
  pull(options: SyncOptions = {}): Result<SyncResult, Error> {
    try {
      const compareResult = this.compare();
      if (!isOk(compareResult)) {
        return err(compareResult.error);
      }

      const comparison = compareResult.value;
      let nodesAdded = 0;
      let nodesUpdated = 0;
      let edgesAdded = 0;
      let edgesUpdated = 0;
      const conflicts: Conflict[] = [];

      // Add remote-only nodes to local
      for (const node of comparison.remoteOnly.nodes) {
        if (options.nodeTypes && !options.nodeTypes.includes(node.type)) {
          continue;
        }
        const result = this.localGraph.addNode(node);
        if (result) {
          nodesAdded++;
        }
      }

      // Update modified nodes if requested
      if (options.updateExisting) {
        for (const { local, remote } of comparison.modified.nodes) {
          // Remove old and add new
          this.localGraph.removeNode(local.id);
          const result = this.localGraph.addNode(remote);
          if (result) {
            nodesUpdated++;
          }
        }
      }

      // Add remote-only edges to local
      for (const edge of comparison.remoteOnly.edges) {
        if (options.predicates && !options.predicates.includes(edge.predicate)) {
          continue;
        }
        // Only add if both nodes exist
        const sourceExists = this.localGraph.getNode(edge.source);
        const targetExists = this.localGraph.getNode(edge.target);
        if (sourceExists && targetExists) {
          const result = this.localGraph.addEdge(edge);
          if (result) {
            edgesAdded++;
          }
        }
      }

      const timestamp = new Date().toISOString();
      this.lastSyncTime = timestamp;

      return ok({
        nodesAdded,
        nodesUpdated,
        nodesRemoved: 0,
        edgesAdded,
        edgesUpdated,
        edgesRemoved: 0,
        conflicts,
        timestamp,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Push changes from local to remote
   *
   * @param options - Sync options
   * @returns Sync result
   */
  push(options: SyncOptions = {}): Result<SyncResult, Error> {
    try {
      const compareResult = this.compare();
      if (!isOk(compareResult)) {
        return err(compareResult.error);
      }

      const comparison = compareResult.value;
      let nodesAdded = 0;
      let nodesUpdated = 0;
      let edgesAdded = 0;
      let edgesUpdated = 0;
      const conflicts: Conflict[] = [];

      // Add local-only nodes to remote
      for (const node of comparison.localOnly.nodes) {
        if (options.nodeTypes && !options.nodeTypes.includes(node.type)) {
          continue;
        }
        const result = this.remoteGraph.addNode(node);
        if (result) {
          nodesAdded++;
        }
      }

      // Update modified nodes if requested
      if (options.updateExisting) {
        for (const { local, remote } of comparison.modified.nodes) {
          this.remoteGraph.removeNode(remote.id);
          const result = this.remoteGraph.addNode(local);
          if (result) {
            nodesUpdated++;
          }
        }
      }

      // Add local-only edges to remote
      for (const edge of comparison.localOnly.edges) {
        if (options.predicates && !options.predicates.includes(edge.predicate)) {
          continue;
        }
        const sourceExists = this.remoteGraph.getNode(edge.source);
        const targetExists = this.remoteGraph.getNode(edge.target);
        if (sourceExists && targetExists) {
          const result = this.remoteGraph.addEdge(edge);
          if (result) {
            edgesAdded++;
          }
        }
      }

      const timestamp = new Date().toISOString();
      this.lastSyncTime = timestamp;

      return ok({
        nodesAdded,
        nodesUpdated,
        nodesRemoved: 0,
        edgesAdded,
        edgesUpdated,
        edgesRemoved: 0,
        conflicts,
        timestamp,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Bidirectional sync
   *
   * @param options - Sync options
   * @returns Sync result
   */
  sync(options: SyncOptions = {}): Result<SyncResult, Error> {
    try {
      // First pull, then push
      const pullResult = this.pull(options);
      if (!isOk(pullResult)) {
        return pullResult;
      }

      const pushResult = this.push(options);
      if (!isOk(pushResult)) {
        return pushResult;
      }

      const timestamp = new Date().toISOString();
      this.lastSyncTime = timestamp;

      return ok({
        nodesAdded: pullResult.value.nodesAdded + pushResult.value.nodesAdded,
        nodesUpdated:
          pullResult.value.nodesUpdated + pushResult.value.nodesUpdated,
        nodesRemoved: 0,
        edgesAdded: pullResult.value.edgesAdded + pushResult.value.edgesAdded,
        edgesUpdated:
          pullResult.value.edgesUpdated + pushResult.value.edgesUpdated,
        edgesRemoved: 0,
        conflicts: [
          ...pullResult.value.conflicts,
          ...pushResult.value.conflicts,
        ],
        timestamp,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get conflicts between graphs
   *
   * @returns Array of conflicts
   */
  getConflicts(): Result<Conflict[], Error> {
    try {
      const compareResult = this.compare();
      if (!isOk(compareResult)) {
        return err(compareResult.error);
      }

      const conflicts: Conflict[] = [];
      const comparison = compareResult.value;

      for (const { local, remote } of comparison.modified.nodes) {
        if (local.label !== remote.label) {
          conflicts.push({
            type: 'node',
            id: local.id,
            local,
            remote,
            field: 'label',
          });
        }
      }

      for (const { local, remote } of comparison.modified.edges) {
        if (local.weight !== remote.weight) {
          conflicts.push({
            type: 'edge',
            id: local.id,
            local,
            remote,
            field: 'weight',
          });
        }
      }

      return ok(conflicts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get last sync timestamp
   *
   * @returns Last sync timestamp or null
   */
  getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  /**
   * Check if a node has been modified
   */
  private isNodeModified(local: GraphNode, remote: GraphNode): boolean {
    return (
      local.label !== remote.label ||
      local.type !== remote.type ||
      JSON.stringify(local.properties) !== JSON.stringify(remote.properties)
    );
  }

  /**
   * Check if an edge has been modified
   */
  private isEdgeModified(local: GraphEdge, remote: GraphEdge): boolean {
    return (
      local.source !== remote.source ||
      local.target !== remote.target ||
      local.predicate !== remote.predicate ||
      local.weight !== remote.weight
    );
  }
}
