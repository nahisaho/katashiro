/**
 * GraphVisualization - Graph export to various formats
 *
 * Generates visual representations of knowledge graphs
 *
 * @module @nahisaho/katashiro-knowledge
 * @task TSK-043
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import { KnowledgeGraph } from '../graph/knowledge-graph.js';

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  /** Graph direction (Mermaid) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Show edge labels */
  showEdgeLabels?: boolean;
  /** Node shapes by type */
  nodeShapes?: Record<string, string>;
  /** Node colors by type */
  nodeColors?: Record<string, string>;
  /** Edge colors by predicate */
  edgeColors?: Record<string, string>;
}

/**
 * D3.js compatible data format
 */
export interface D3GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  links: Array<{
    source: string;
    target: string;
    predicate: string;
    weight: number;
  }>;
}

/**
 * Cytoscape.js compatible data format
 */
export interface CytoscapeData {
  elements: {
    nodes: Array<{
      data: {
        id: string;
        label: string;
        type: string;
        [key: string]: unknown;
      };
    }>;
    edges: Array<{
      data: {
        id: string;
        source: string;
        target: string;
        label: string;
        weight: number;
      };
    }>;
  };
}

/**
 * Graph statistics
 */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: string[];
  predicates: string[];
  density: number;
  avgDegree: number;
}

/**
 * GraphVisualization
 *
 * Exports knowledge graphs to various visualization formats
 */
export class GraphVisualization {
  constructor(private graph: KnowledgeGraph) {}

  /**
   * Generate Mermaid diagram syntax
   *
   * @param config - Visualization configuration
   * @returns Mermaid syntax string
   */
  toMermaid(config: VisualizationConfig = {}): Result<string, Error> {
    try {
      const direction = config.direction ?? 'TB';
      const lines: string[] = [];

      lines.push(`graph ${direction}`);

      // Add nodes
      const nodes = this.graph.getAllNodes();
      for (const node of nodes) {
        const shape = this.getMermaidShape(node.type, config);
        lines.push(`    ${this.sanitizeId(node.id)}${shape.open}"${this.escapeLabel(node.label)}"${shape.close}`);
      }

      // Add edges
      const edges = this.graph.getAllEdges();
      for (const edge of edges) {
        const sourceId = this.sanitizeId(edge.source);
        const targetId = this.sanitizeId(edge.target);

        if (config.showEdgeLabels) {
          lines.push(`    ${sourceId} -->|${edge.predicate}| ${targetId}`);
        } else {
          lines.push(`    ${sourceId} --> ${targetId}`);
        }
      }

      return ok(lines.join('\n'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate DOT format (Graphviz)
   *
   * @param config - Visualization configuration
   * @returns DOT syntax string
   */
  toDOT(config: VisualizationConfig = {}): Result<string, Error> {
    try {
      const lines: string[] = [];

      lines.push('digraph G {');
      lines.push('    rankdir=TB;');
      lines.push('    node [fontname="Helvetica"];');
      lines.push('    edge [fontname="Helvetica"];');

      // Add nodes
      const nodes = this.graph.getAllNodes();
      for (const node of nodes) {
        const shape = config.nodeShapes?.[node.type] ?? 'ellipse';
        const color = config.nodeColors?.[node.type] ?? 'lightblue';
        lines.push(
          `    "${node.id}" [label="${this.escapeLabel(node.label)}" shape=${shape} fillcolor="${color}" style=filled];`
        );
      }

      // Add edges
      const edges = this.graph.getAllEdges();
      for (const edge of edges) {
        const color = config.edgeColors?.[edge.predicate] ?? 'black';
        if (config.showEdgeLabels) {
          lines.push(
            `    "${edge.source}" -> "${edge.target}" [label="${edge.predicate}" color="${color}"];`
          );
        } else {
          lines.push(`    "${edge.source}" -> "${edge.target}" [color="${color}"];`);
        }
      }

      lines.push('}');

      return ok(lines.join('\n'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate D3.js compatible JSON
   *
   * @returns D3 graph data
   */
  toD3Json(): Result<D3GraphData, Error> {
    try {
      const nodes = this.graph.getAllNodes().map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        properties: node.properties,
      }));

      const links = this.graph.getAllEdges().map((edge) => ({
        source: edge.source,
        target: edge.target,
        predicate: edge.predicate,
        weight: edge.weight,
      }));

      return ok({ nodes, links });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate Cytoscape.js compatible JSON
   *
   * @returns Cytoscape data
   */
  toCytoscape(): Result<CytoscapeData, Error> {
    try {
      const nodes = this.graph.getAllNodes().map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          ...node.properties,
        },
      }));

      const edges = this.graph.getAllEdges().map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.predicate,
          weight: edge.weight,
        },
      }));

      return ok({
        elements: { nodes, edges },
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get graph statistics
   *
   * @returns Graph statistics
   */
  getStats(): Result<GraphStats, Error> {
    try {
      const nodes = this.graph.getAllNodes();
      const edges = this.graph.getAllEdges();

      const nodeTypes = [...new Set(nodes.map((n) => n.type))];
      const predicates = [...new Set(edges.map((e) => e.predicate))];

      // Calculate density
      const n = nodes.length;
      const e = edges.length;
      const maxEdges = n * (n - 1); // Directed graph
      const density = maxEdges > 0 ? e / maxEdges : 0;

      // Calculate average degree
      const avgDegree = n > 0 ? (2 * e) / n : 0;

      return ok({
        nodeCount: n,
        edgeCount: e,
        nodeTypes,
        predicates,
        density,
        avgDegree,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate subgraph around a node
   *
   * @param nodeId - Center node ID
   * @param depth - Depth of neighbors to include
   * @returns Subgraph data
   */
  getSubgraph(nodeId: string, depth = 1): Result<D3GraphData, Error> {
    try {
      const visited = new Set<string>();
      const queue: Array<{ id: string; currentDepth: number }> = [
        { id: nodeId, currentDepth: 0 },
      ];

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (visited.has(current.id) || current.currentDepth > depth) {
          continue;
        }

        visited.add(current.id);

        if (current.currentDepth < depth) {
          const neighbors = this.graph.getNeighbors(current.id);
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor.id)) {
              queue.push({ id: neighbor.id, currentDepth: current.currentDepth + 1 });
            }
          }
        }
      }

      const nodes = this.graph
        .getAllNodes()
        .filter((n) => visited.has(n.id))
        .map((node) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          properties: node.properties,
        }));

      const links = this.graph
        .getAllEdges()
        .filter((e) => visited.has(e.source) && visited.has(e.target))
        .map((edge) => ({
          source: edge.source,
          target: edge.target,
          predicate: edge.predicate,
          weight: edge.weight,
        }));

      return ok({ nodes, links });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get Mermaid shape markers for node type
   */
  private getMermaidShape(
    type: string,
    _config: VisualizationConfig
  ): { open: string; close: string } {
    const shapes: Record<string, { open: string; close: string }> = {
      concept: { open: '([', close: '])' },
      entity: { open: '{{', close: '}}' },
      default: { open: '[', close: ']' },
    };

    return shapes[type] ?? shapes['default']!;
  }

  /**
   * Sanitize ID for Mermaid
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Escape label for diagram syntax
   */
  private escapeLabel(label: string): string {
    return label.replace(/"/g, "'").replace(/\n/g, ' ');
  }
}
