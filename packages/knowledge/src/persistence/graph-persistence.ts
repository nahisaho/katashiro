/**
 * GraphPersistence - Graph serialization and deserialization
 *
 * Handles saving and loading knowledge graphs
 *
 * @module @nahisaho/katashiro-knowledge
 * @task TSK-041
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, type GraphNode, type GraphEdge } from '../graph/knowledge-graph.js';

/**
 * Serialized graph format
 */
export interface SerializedGraph {
  readonly version: string;
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly metadata: GraphMetadata;
}

/**
 * Graph metadata
 */
export interface GraphMetadata {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly name?: string;
  readonly description?: string;
}

/**
 * Current serialization format version
 */
const FORMAT_VERSION = '1.0';

/**
 * GraphPersistence
 *
 * Provides serialization and deserialization for KnowledgeGraph
 */
export class GraphPersistence {
  /**
   * シンプルにJSONに変換（AGENTS.md互換）
   * @param graph - 変換するグラフ
   * @returns JSON文字列
   */
  serialize(graph: KnowledgeGraph): string {
    const nodes = graph.getAllNodes();
    const edges = graph.getAllEdges();

    const serialized: SerializedGraph = {
      version: FORMAT_VERSION,
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        createdAt: new Date().toISOString(),
      },
    };

    return JSON.stringify(serialized, null, 2);
  }

  /**
   * JSONからグラフを復元（AGENTS.md互換）
   * @param json - JSON文字列
   * @returns 復元されたグラフ
   */
  deserialize(json: string): KnowledgeGraph {
    const data = JSON.parse(json) as SerializedGraph;
    const graph = new KnowledgeGraph();

    // Add nodes first
    for (const node of data.nodes) {
      graph.addNode(node);
    }

    // Add edges
    for (const edge of data.edges) {
      graph.addEdge(edge);
    }

    return graph;
  }

  /**
   * Serialize a graph to a portable format (Result API)
   *
   * @param graph - Graph to serialize
   * @returns Serialized graph data
   */
  serializeToObject(graph: KnowledgeGraph): Result<SerializedGraph, Error> {
    try {
      const nodes = graph.getAllNodes();
      const edges = graph.getAllEdges();

      const serialized: SerializedGraph = {
        version: FORMAT_VERSION,
        nodes,
        edges,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          createdAt: new Date().toISOString(),
        },
      };

      return ok(serialized);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Deserialize data into a graph (Result API)
   *
   * @param data - Serialized graph data
   * @param graph - Target graph (will be modified)
   * @returns Result indicating success or failure
   */
  deserializeFromObject(data: SerializedGraph, graph: KnowledgeGraph): Result<void, Error> {
    try {
      // Clear existing data
      graph.clear();

      // Add nodes first
      for (const node of data.nodes) {
        graph.addNode(node);
      }

      // Add edges
      for (const edge of data.edges) {
        graph.addEdge(edge);
      }

      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Convert graph to JSON string (Result API)
   *
   * @param graph - Graph to convert
   * @param pretty - Whether to format with indentation
   * @returns JSON string
   */
  toJSON(graph: KnowledgeGraph, pretty = false): Result<string, Error> {
    try {
      const json = this.serialize(graph);
      return ok(pretty ? json : JSON.stringify(JSON.parse(json)));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Load graph from JSON string (Result API)
   *
   * @param json - JSON string
   * @param graph - Target graph
   * @returns Result indicating success or failure
   */
  fromJSON(json: string, graph: KnowledgeGraph): Result<void, Error> {
    try {
      const data = JSON.parse(json) as SerializedGraph;
      return this.deserializeFromObject(data, graph);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(`Invalid JSON: ${error}`));
    }
  }

  /**
   * Validate serialized graph data
   *
   * @param data - Data to validate
   * @returns True if valid, false otherwise
   */
  validate(data: SerializedGraph): Result<boolean, Error> {
    try {
      // Check required fields
      if (!data.version || !data.nodes || !data.edges || !data.metadata) {
        return ok(false);
      }

      // Check version
      if (data.version !== FORMAT_VERSION) {
        // Future: handle version migration
      }

      // Build node ID set
      const nodeIds = new Set(data.nodes.map((n) => n.id));

      // Validate edges reference existing nodes
      for (const edge of data.edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          return ok(false);
        }
      }

      // Validate metadata
      if (data.metadata.nodeCount !== data.nodes.length) {
        return ok(false);
      }
      if (data.metadata.edgeCount !== data.edges.length) {
        return ok(false);
      }

      return ok(true);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create a diff between two serialized graphs
   *
   * @param before - Previous state
   * @param after - Current state
   * @returns Diff describing changes
   */
  diff(
    before: SerializedGraph,
    after: SerializedGraph
  ): Result<GraphDiff, Error> {
    try {
      const beforeNodeIds = new Set(before.nodes.map((n) => n.id));
      const afterNodeIds = new Set(after.nodes.map((n) => n.id));

      const beforeEdgeIds = new Set(before.edges.map((e) => e.id));
      const afterEdgeIds = new Set(after.edges.map((e) => e.id));

      const addedNodes = after.nodes.filter((n) => !beforeNodeIds.has(n.id));
      const removedNodes = before.nodes.filter((n) => !afterNodeIds.has(n.id));

      const addedEdges = after.edges.filter((e) => !beforeEdgeIds.has(e.id));
      const removedEdges = before.edges.filter((e) => !afterEdgeIds.has(e.id));

      return ok({
        addedNodes,
        removedNodes,
        addedEdges,
        removedEdges,
        hasChanges:
          addedNodes.length > 0 ||
          removedNodes.length > 0 ||
          addedEdges.length > 0 ||
          removedEdges.length > 0,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Merge two graphs
   *
   * @param base - Base graph
   * @param other - Graph to merge in
   * @returns Merged graph data
   */
  merge(
    base: SerializedGraph,
    other: SerializedGraph
  ): Result<SerializedGraph, Error> {
    try {
      const baseNodeIds = new Set(base.nodes.map((n) => n.id));
      const baseEdgeIds = new Set(base.edges.map((e) => e.id));

      // Add nodes from other that don't exist in base
      const mergedNodes = [
        ...base.nodes,
        ...other.nodes.filter((n) => !baseNodeIds.has(n.id)),
      ];

      // Add edges from other that don't exist in base
      const mergedEdges = [
        ...base.edges,
        ...other.edges.filter((e) => !baseEdgeIds.has(e.id)),
      ];

      return ok({
        version: FORMAT_VERSION,
        nodes: mergedNodes,
        edges: mergedEdges,
        metadata: {
          nodeCount: mergedNodes.length,
          edgeCount: mergedEdges.length,
          createdAt: base.metadata.createdAt,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * グラフをファイルに保存（簡易API）
   * AGENTS.md互換API
   *
   * @param graph - 保存するグラフ
   * @param filePath - ファイルパス
   * @returns Result indicating success or failure
   */
  async save(graph: KnowledgeGraph, filePath: string): Promise<Result<void, Error>> {
    const jsonResult = this.toJSON(graph, true);
    if (!isOk(jsonResult)) {
      return err(jsonResult.error);
    }

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, jsonResult.value, 'utf-8');
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * ファイルからグラフを読み込み（簡易API）
   * AGENTS.md互換API - KnowledgeGraphインスタンスを直接返す
   *
   * @param filePath - ファイルパス
   * @returns 読み込んだグラフ
   * @throws Error ファイルが存在しないまたは無効なJSONの場合
   */
  async load(filePath: string): Promise<KnowledgeGraph> {
    const fs = await import('fs/promises');
    const json = await fs.readFile(filePath, 'utf-8');
    return this.deserialize(json);
  }

  /**
   * ファイルからグラフを読み込み（Result API）
   *
   * @param filePath - ファイルパス
   * @returns Result with loaded graph or error
   */
  async loadSafe(filePath: string): Promise<Result<KnowledgeGraph, Error>> {
    try {
      const graph = await this.load(filePath);
      return ok(graph);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Graph diff result
 */
export interface GraphDiff {
  readonly addedNodes: GraphNode[];
  readonly removedNodes: GraphNode[];
  readonly addedEdges: GraphEdge[];
  readonly removedEdges: GraphEdge[];
  readonly hasChanges: boolean;
}
