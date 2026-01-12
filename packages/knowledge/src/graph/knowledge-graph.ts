/**
 * KnowledgeGraph - In-memory knowledge graph
 *
 * Provides graph data structure for entities and relationships
 *
 * @module @nahisaho/katashiro-knowledge
 * @task TSK-040
 */

// Result types removed - AGENTS.md互換の直接戻り値APIに変更

/**
 * Graph node representing an entity
 */
export interface GraphNode {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly properties: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

/**
 * Simplified node input for addNode()
 * AGENTS.md互換API - idはオプショナル
 */
export interface GraphNodeInput {
  readonly id?: string;
  readonly type: string;
  readonly label?: string;
  readonly properties?: Record<string, unknown>;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Graph edge representing a relationship
 */
export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly predicate: string;
  readonly weight: number;
  readonly properties?: Record<string, unknown>;
  readonly createdAt: string;
}

/**
 * Simplified edge input for addEdge()
 * AGENTS.md互換API
 */
export interface GraphEdgeInput {
  readonly id?: string;
  readonly source: string;
  readonly target: string;
  readonly predicate?: string;
  readonly type?: string; // alias for predicate
  readonly weight?: number;
  readonly properties?: Record<string, unknown>;
  readonly createdAt?: string;
}

/**
 * エッジ追加オプション
 */
export interface AddEdgeOptions {
  /** 存在しないノードを自動作成するか */
  readonly autoCreateNodes?: boolean;
}

/**
 * ノード追加オプション
 * @since 0.2.10
 */
export interface AddNodeOptions {
  /** 重複IDの場合、既存ノードを更新するか */
  readonly upsert?: boolean;
  /** 重複IDの場合、スキップして既存ノードを返すか */
  readonly skipDuplicate?: boolean;
  /** 重複IDの場合、自動でリネームするか */
  readonly autoRename?: boolean;
}

/**
 * 重複ノードエラー
 * @since 0.2.10
 */
export class DuplicateNodeError extends Error {
  readonly code = 'KATASHIRO-E013';
  readonly nodeId: string;
  readonly existingNode: GraphNode;
  readonly suggestion: string;

  constructor(nodeId: string, existingNode: GraphNode) {
    super(`Node with ID ${nodeId} already exists`);
    this.name = 'DuplicateNodeError';
    this.nodeId = nodeId;
    this.existingNode = existingNode;
    this.suggestion = "Use { upsert: true } to update or { skipDuplicate: true } to skip";
  }
}

/**
 * KnowledgeGraph
 *
 * In-memory graph for storing entities and relationships
 */
export class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  /**
   * Check if a node with the specified ID exists
   * @since 0.2.10
   *
   * @param id - Node ID to check
   * @returns true if node exists, false otherwise
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Check if an edge with the specified ID exists
   * @since 0.2.10
   *
   * @param id - Edge ID to check
   * @returns true if edge exists, false otherwise
   */
  hasEdge(id: string): boolean {
    return this.edges.has(id);
  }

  /**
   * Add a node to the graph
   * Accepts both full GraphNode and simplified GraphNodeInput
   * AGENTS.md互換: idが省略された場合は自動生成
   *
   * @param node - Node to add
   * @param options - Optional settings (upsert, skipDuplicate, autoRename)
   * @returns The added node (AGENTS.md互換)
   */
  addNode(node: GraphNode | GraphNodeInput, options?: AddNodeOptions): GraphNode {
    // IDがない場合は自動生成
    let nodeId = node.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // 重複チェック
    if (this.nodes.has(nodeId)) {
      const existingNode = this.nodes.get(nodeId)!;
      
      // upsert: 既存ノードを更新
      if (options?.upsert) {
        const updatedNode: GraphNode = {
          id: nodeId,
          type: node.type || existingNode.type,
          label: node.label || existingNode.label,
          properties: { ...existingNode.properties, ...node.properties },
          createdAt: existingNode.createdAt,
          updatedAt: new Date().toISOString(),
        };
        this.nodes.set(nodeId, updatedNode);
        return updatedNode;
      }
      
      // skipDuplicate: 既存ノードをそのまま返す
      if (options?.skipDuplicate) {
        return existingNode;
      }
      
      // autoRename: 新しいIDを生成
      if (options?.autoRename) {
        nodeId = `${nodeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      } else {
        // デフォルト: エラーをスロー
        throw new DuplicateNodeError(nodeId, existingNode);
      }
    }

    // Normalize input to full GraphNode
    const fullNode: GraphNode = {
      id: nodeId,
      type: node.type,
      label: node.label || (node.properties?.name as string) || (node.properties?.label as string) || nodeId,
      properties: node.properties || {},
      createdAt: node.createdAt || new Date().toISOString(),
      updatedAt: node.updatedAt,
    };

    this.nodes.set(fullNode.id, fullNode);
    this.adjacencyList.set(fullNode.id, new Set());
    this.reverseAdjacencyList.set(fullNode.id, new Set());

    return fullNode;
  }

  /**
   * Add an edge to the graph
   * Accepts both full GraphEdge and simplified GraphEdgeInput
   * AGENTS.md互換: エッジオブジェクトを返す
   *
   * @param edge - Edge to add
   * @param options - Optional settings (autoCreateNodes)
   * @returns The added edge (AGENTS.md互換)
   */
  addEdge(edge: GraphEdge | GraphEdgeInput, options?: AddEdgeOptions): GraphEdge {
    const autoCreate = options?.autoCreateNodes ?? false;

    // Source node check
    if (!this.nodes.has(edge.source)) {
      if (autoCreate) {
        this.addNode({ id: edge.source, type: 'stub', properties: { autoCreated: true } });
      } else {
        const availableIds = Array.from(this.nodes.keys()).slice(0, 10);
        throw new Error(
          `Source node ${edge.source} does not exist. Available node IDs: [${availableIds.join(', ')}${this.nodes.size > 10 ? ', ...' : ''}]`
        );
      }
    }

    // Target node check
    if (!this.nodes.has(edge.target)) {
      if (autoCreate) {
        this.addNode({ id: edge.target, type: 'stub', properties: { autoCreated: true } });
      } else {
        const availableIds = Array.from(this.nodes.keys()).slice(0, 10);
        throw new Error(
          `Target node ${edge.target} does not exist. Available node IDs: [${availableIds.join(', ')}${this.nodes.size > 10 ? ', ...' : ''}]`
        );
      }
    }

    // Normalize input to full GraphEdge
    const edgeId = edge.id || `edge-${edge.source}-${edge.target}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    if (this.edges.has(edgeId)) {
      throw new Error(`Edge with ID ${edgeId} already exists`);
    }

    const fullEdge: GraphEdge = {
      id: edgeId,
      source: edge.source,
      target: edge.target,
      predicate: edge.predicate || (edge as GraphEdgeInput).type || 'related',
      weight: edge.weight ?? 1,
      properties: edge.properties,
      createdAt: edge.createdAt || new Date().toISOString(),
    };

    this.edges.set(fullEdge.id, fullEdge);
    this.adjacencyList.get(fullEdge.source)?.add(fullEdge.target);
    this.reverseAdjacencyList.get(fullEdge.target)?.add(fullEdge.source);

    return fullEdge;
  }

  /**
   * Get a node by ID
   * AGENTS.md互換: 直接ノードを返す
   *
   * @param id - Node ID
   * @returns The node or null if not found
   */
  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) ?? null;
  }

  /**
   * Get an edge by ID
   * AGENTS.md互換: 直接エッジを返す
   *
   * @param id - Edge ID
   * @returns The edge or null if not found
   */
  getEdge(id: string): GraphEdge | null {
    return this.edges.get(id) ?? null;
  }

  /**
   * Get all neighbors of a node (outgoing edges)
   *
   * @param nodeId - Node ID
   * @returns Array of neighboring nodes
   */
  getNeighbors(nodeId: string): GraphNode[] {
    const neighborIds = this.adjacencyList.get(nodeId);
    if (!neighborIds) {
      return [];
    }

    const neighbors: GraphNode[] = [];
    for (const id of neighborIds) {
      const node = this.nodes.get(id);
      if (node) {
        neighbors.push(node);
      }
    }

    return neighbors;
  }

  /**
   * Get incoming neighbors of a node
   *
   * @param nodeId - Node ID
   * @returns Array of nodes with edges pointing to this node
   */
  getIncomingNeighbors(nodeId: string): GraphNode[] {
    const neighborIds = this.reverseAdjacencyList.get(nodeId);
    if (!neighborIds) {
      return [];
    }

    const neighbors: GraphNode[] = [];
    for (const id of neighborIds) {
      const node = this.nodes.get(id);
      if (node) {
        neighbors.push(node);
      }
    }

    return neighbors;
  }

  /**
   * Get all edges from a node
   *
   * @param nodeId - Node ID
   * @returns Array of edges from this node
   */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    const edges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Remove a node and all its edges
   *
   * @param id - Node ID
   * @returns true if removed, false if not found
   */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove all edges involving this node
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === id || edge.target === id) {
        edgesToRemove.push(edgeId);
      }
    }

    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
    }

    // Update adjacency lists
    for (const neighbors of this.adjacencyList.values()) {
      neighbors.delete(id);
    }
    for (const neighbors of this.reverseAdjacencyList.values()) {
      neighbors.delete(id);
    }

    // Remove the node itself
    this.nodes.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacencyList.delete(id);

    return true;
  }

  /**
   * Remove an edge
   *
   * @param id - Edge ID
   * @returns true if removed, false if not found
   */
  removeEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) {
      return false;
    }

    this.adjacencyList.get(edge.source)?.delete(edge.target);
    this.reverseAdjacencyList.get(edge.target)?.delete(edge.source);
    this.edges.delete(id);

    return true;
  }

  /**
   * Find a path between two nodes using BFS
   *
   * @param startId - Start node ID
   * @param endId - End node ID
   * @returns Array of node IDs representing the path, or null if no path
   */
  findPath(startId: string, endId: string): string[] | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }

    if (startId === endId) {
      return [startId];
    }

    // BFS
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [
      { id: startId, path: [startId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === endId) {
        return current.path;
      }

      if (visited.has(current.id)) {
        continue;
      }
      visited.add(current.id);

      const neighbors = this.adjacencyList.get(current.id);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push({
              id: neighborId,
              path: [...current.path, neighborId],
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all nodes
   *
   * @returns Array of all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all nodes (alias for AGENTS.md compatibility)
   * @returns Array of all nodes
   */
  getNodes(): GraphNode[] {
    return this.getAllNodes();
  }

  /**
   * Get all edges
   *
   * @returns Array of all edges
   */
  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get all edges (alias for AGENTS.md compatibility)
   * @returns Array of all edges
   */
  getEdges(): GraphEdge[] {
    return this.getAllEdges();
  }

  /**
   * Get node count
   *
   * @returns Number of nodes
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count
   *
   * @returns Number of edges
   */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  /**
   * Search nodes by label (partial match)
   *
   * @param query - Search query
   * @returns Matching nodes
   */
  searchByLabel(query: string): GraphNode[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.nodes.values()).filter((node) =>
      node.label.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get nodes by type
   *
   * @param type - Node type
   * @returns Nodes of the specified type
   */
  getNodesByType(type: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }

  /**
   * Get edges by predicate
   *
   * @param predicate - Edge predicate
   * @returns Edges with the specified predicate
   */
  getEdgesByPredicate(predicate: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(
      (edge) => edge.predicate === predicate
    );
  }

  /**
   * 知識グラフを検索（AGENTS.md互換API）
   * @param queryOrFilter 検索クエリ文字列またはフィルターオブジェクト
   * @returns マッチしたノード
   */
  query(queryOrFilter: string | { type?: string; label?: string; [key: string]: unknown }): GraphNode[] {
    // オブジェクトの場合はフィルタリング
    if (typeof queryOrFilter === 'object' && queryOrFilter !== null) {
      return Array.from(this.nodes.values()).filter((node) => {
        // typeフィルター
        if (queryOrFilter.type && node.type !== queryOrFilter.type) {
          return false;
        }
        // labelフィルター
        if (queryOrFilter.label && !node.label.includes(queryOrFilter.label)) {
          return false;
        }
        // その他のプロパティフィルター
        for (const [key, value] of Object.entries(queryOrFilter)) {
          if (key === 'type' || key === 'label') continue;
          if (node.properties[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // 文字列の場合はテキスト検索
    const lowerQuery = queryOrFilter.toLowerCase();
    return Array.from(this.nodes.values()).filter((node) => {
      // ラベルで検索
      if (node.label.toLowerCase().includes(lowerQuery)) {
        return true;      }
      // タイプで検索
      if (node.type.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // プロパティで検索
      for (const value of Object.values(node.properties)) {
        if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }
      return false;
    });
  }
}