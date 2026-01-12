/**
 * GraphQuery - Query engine for KnowledgeGraph
 *
 * Provides query capabilities for searching and filtering graph data
 *
 * @module @nahisaho/katashiro-knowledge
 * @task TSK-042
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import { KnowledgeGraph, type GraphNode, type GraphEdge } from '../graph/knowledge-graph.js';

/**
 * Query filter definition
 */
export interface QueryFilter {
  readonly property: string;
  readonly operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  readonly value: unknown;
}

/**
 * Structured query definition
 */
export interface GraphQueryDef {
  readonly type?: string;
  readonly filters?: QueryFilter[];
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly orderDirection?: 'asc' | 'desc';
}

/**
 * Query result
 */
export interface QueryResult {
  readonly nodes: GraphNode[];
  readonly totalCount: number;
  readonly executionTime: number;
}

/**
 * GraphQuery
 *
 * Query engine for KnowledgeGraph
 */
export class GraphQuery {
  constructor(private graph: KnowledgeGraph) {}

  /**
   * Find all nodes of a given type
   * AGENTS.md互換: 直接配列を返す
   *
   * @param type - Node type to find
   * @returns Array of matching nodes
   */
  findByType(type: string): GraphNode[] {
    try {
      return this.graph.getNodesByType(type);
    } catch {
      return [];
    }
  }

  /**
   * Find nodes with a specific property value
   *
   * @param property - Property name
   * @param value - Property value
   * @returns Array of matching nodes
   */
  findByProperty(property: string, value: unknown): GraphNode[] {
    try {
      const allNodes = this.graph.getAllNodes();
      return allNodes.filter((node) => node.properties[property] === value);
    } catch {
      return [];
    }
  }

  /**
   * Find edges with a given predicate
   *
   * @param predicate - Edge predicate
   * @returns Array of matching edges
   */
  findByPredicate(predicate: string): GraphEdge[] {
    try {
      return this.graph.getEdgesByPredicate(predicate);
    } catch {
      return [];
    }
  }

  /**
   * Find nodes related to a given node
   *
   * @param nodeId - Source node ID
   * @param predicate - Optional predicate filter
   * @returns Array of related nodes
   */
  findRelated(nodeId: string, predicate?: string): GraphNode[] {
    try {
      let neighbors = this.graph.getNeighbors(nodeId);

      // Filter by predicate if specified
      if (predicate) {
        const edges = this.graph.getAllEdges();
        const validTargets = new Set(
          edges
            .filter((e) => e.source === nodeId && e.predicate === predicate)
            .map((e) => e.target)
        );
        neighbors = neighbors.filter((n: GraphNode) => validTargets.has(n.id));
      }

      return neighbors;
    } catch {
      return [];
    }
  }

  /**
   * Search nodes by label
   * AGENTS.md互換: 直接配列を返す
   *
   * @param query - Search query (case insensitive substring match)
   * @returns Array of matching nodes
   */
  search(query: string): GraphNode[] {
    try {
      return this.graph.searchByLabel(query);
    } catch {
      return [];
    }
  }

  /**
   * Execute a structured query
   *
   * @param queryDef - Query definition
   * @returns Query result
   */
  execute(queryDef: GraphQueryDef): Result<QueryResult, Error> {
    const startTime = performance.now();

    try {
      let nodes: GraphNode[];

      // Start with type filter or all nodes
      if (queryDef.type) {
        nodes = this.graph.getNodesByType(queryDef.type);
      } else {
        nodes = this.graph.getAllNodes();
      }

      // Apply filters
      if (queryDef.filters) {
        for (const filter of queryDef.filters) {
          nodes = nodes.filter((node) =>
            this.applyFilter(node, filter)
          );
        }
      }

      const totalCount = nodes.length;

      // Apply sorting
      if (queryDef.orderBy) {
        const direction = queryDef.orderDirection === 'desc' ? -1 : 1;
        nodes.sort((a, b) => {
          const aVal = a.properties[queryDef.orderBy!];
          const bVal = b.properties[queryDef.orderBy!];

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal) * direction;
          }
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * direction;
          }
          return 0;
        });
      }

      // Apply pagination
      if (queryDef.offset !== undefined) {
        nodes = nodes.slice(queryDef.offset);
      }
      if (queryDef.limit !== undefined) {
        nodes = nodes.slice(0, queryDef.limit);
      }

      const executionTime = performance.now() - startTime;

      return ok({
        nodes,
        totalCount,
        executionTime,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Aggregate nodes by a property
   *
   * @param operation - Aggregation operation
   * @param groupBy - Property to group by
   * @returns Aggregation result
   */
  aggregate(
    operation: 'count' | 'sum' | 'avg',
    groupBy: string
  ): Result<Record<string, number>, Error> {
    try {
      const nodes = this.graph.getAllNodes();
      const groups: Record<string, number[]> = {};

      for (const node of nodes) {
        let key: string;
        if (groupBy === 'type') {
          key = node.type;
        } else {
          key = String(node.properties[groupBy] ?? 'unknown');
        }

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key]!.push(1);
      }

      const result: Record<string, number> = {};
      for (const [key, values] of Object.entries(groups)) {
        switch (operation) {
          case 'count':
            result[key] = values.length;
            break;
          case 'sum':
            result[key] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result[key] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
        }
      }

      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Apply a filter to a node
   */
  private applyFilter(node: GraphNode, filter: QueryFilter): boolean {
    const value = node.properties[filter.property];

    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return typeof value === 'number' && value > (filter.value as number);
      case 'lt':
        return typeof value === 'number' && value < (filter.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (filter.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (filter.value as number);
      case 'contains':
        return (
          typeof value === 'string' &&
          value.toLowerCase().includes(String(filter.value).toLowerCase())
        );
      default:
        return false;
    }
  }
}
