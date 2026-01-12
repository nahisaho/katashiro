/**
 * ResearchViewProvider - Research panel tree view
 *
 * @module katashiro
 * @task TSK-072
 */

import * as vscode from 'vscode';

/**
 * Research item for tree view
 */
export class ResearchItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly description?: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.command = command;
  }
}

/**
 * ResearchViewProvider
 *
 * Provides tree data for the Research panel
 */
export class ResearchViewProvider
  implements vscode.TreeDataProvider<ResearchItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ResearchItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private recentSearches: Array<{ query: string; timestamp: Date }> = [];

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a recent search
   */
  addSearch(query: string): void {
    this.recentSearches.unshift({ query, timestamp: new Date() });
    if (this.recentSearches.length > 10) {
      this.recentSearches.pop();
    }
    this.refresh();
  }

  /**
   * Get tree item
   */
  getTreeItem(element: ResearchItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: ResearchItem): Thenable<ResearchItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new ResearchItem(
          'New Search',
          vscode.TreeItemCollapsibleState.None,
          '',
          {
            command: 'katashiro.webSearch',
            title: 'New Search',
          }
        ),
        new ResearchItem(
          'Research Topic',
          vscode.TreeItemCollapsibleState.None,
          '',
          {
            command: 'katashiro.researchTopic',
            title: 'Research Topic',
          }
        ),
        new ResearchItem(
          'Recent Searches',
          vscode.TreeItemCollapsibleState.Expanded
        ),
      ]);
    }

    // Recent searches children
    if (element.label === 'Recent Searches') {
      if (this.recentSearches.length === 0) {
        return Promise.resolve([
          new ResearchItem(
            'No recent searches',
            vscode.TreeItemCollapsibleState.None,
            'Start a new search'
          ),
        ]);
      }

      return Promise.resolve(
        this.recentSearches.map(
          (search) =>
            new ResearchItem(
              search.query,
              vscode.TreeItemCollapsibleState.None,
              this.formatTime(search.timestamp)
            )
        )
      );
    }

    return Promise.resolve([]);
  }

  /**
   * Format timestamp
   */
  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }
}
