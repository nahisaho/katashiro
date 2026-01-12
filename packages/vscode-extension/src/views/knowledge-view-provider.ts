/**
 * KnowledgeViewProvider - Knowledge Graph panel tree view
 *
 * @module katashiro
 * @task TSK-072
 */

import * as vscode from 'vscode';

/**
 * Knowledge item for tree view
 */
export class KnowledgeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'category' | 'node' | 'edge',
    public readonly description?: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.contextValue = itemType;

    // Set icon based on type
    switch (itemType) {
      case 'category':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'node':
        this.iconPath = new vscode.ThemeIcon('circle-filled');
        break;
      case 'edge':
        this.iconPath = new vscode.ThemeIcon('arrow-right');
        break;
    }
  }
}

/**
 * KnowledgeViewProvider
 *
 * Provides tree data for the Knowledge Graph panel
 */
export class KnowledgeViewProvider
  implements vscode.TreeDataProvider<KnowledgeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    KnowledgeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private nodes: Array<{ id: string; label: string; type: string }> = [];
  private edges: Array<{ source: string; target: string; relation: string }> =
    [];

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a node
   */
  addNode(id: string, label: string, type: string): void {
    this.nodes.push({ id, label, type });
    this.refresh();
  }

  /**
   * Add an edge
   */
  addEdge(source: string, target: string, relation: string): void {
    this.edges.push({ source, target, relation });
    this.refresh();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes = [];
    this.edges = [];
    this.refresh();
  }

  /**
   * Get statistics
   */
  getStats(): { nodes: number; edges: number } {
    return {
      nodes: this.nodes.length,
      edges: this.edges.length,
    };
  }

  /**
   * Get tree item
   */
  getTreeItem(element: KnowledgeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: KnowledgeItem): Thenable<KnowledgeItem[]> {
    if (!element) {
      // Root level - categories
      const stats = this.getStats();
      return Promise.resolve([
        new KnowledgeItem(
          'Nodes',
          vscode.TreeItemCollapsibleState.Collapsed,
          'category',
          `${stats.nodes} items`
        ),
        new KnowledgeItem(
          'Edges',
          vscode.TreeItemCollapsibleState.Collapsed,
          'category',
          `${stats.edges} items`
        ),
        new KnowledgeItem(
          'Actions',
          vscode.TreeItemCollapsibleState.Collapsed,
          'category'
        ),
      ]);
    }

    // Children based on category
    switch (element.label) {
      case 'Nodes':
        if (this.nodes.length === 0) {
          return Promise.resolve([
            new KnowledgeItem(
              'No nodes yet',
              vscode.TreeItemCollapsibleState.None,
              'node',
              'Start researching to add knowledge'
            ),
          ]);
        }
        return Promise.resolve(
          this.nodes.map(
            (node) =>
              new KnowledgeItem(
                node.label,
                vscode.TreeItemCollapsibleState.None,
                'node',
                node.type
              )
          )
        );

      case 'Edges':
        if (this.edges.length === 0) {
          return Promise.resolve([
            new KnowledgeItem(
              'No edges yet',
              vscode.TreeItemCollapsibleState.None,
              'edge',
              'Connections between nodes'
            ),
          ]);
        }
        return Promise.resolve(
          this.edges.map(
            (edge) =>
              new KnowledgeItem(
                `${edge.source} → ${edge.target}`,
                vscode.TreeItemCollapsibleState.None,
                'edge',
                edge.relation
              )
          )
        );

      case 'Actions':
        return Promise.resolve([
          new KnowledgeItem(
            'View Graph',
            vscode.TreeItemCollapsibleState.None,
            'category'
          ),
          new KnowledgeItem(
            'Export',
            vscode.TreeItemCollapsibleState.None,
            'category'
          ),
          new KnowledgeItem(
            'Clear All',
            vscode.TreeItemCollapsibleState.None,
            'category'
          ),
        ]);

      default:
        return Promise.resolve([]);
    }
  }
}
