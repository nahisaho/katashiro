/**
 * HistoryViewProvider - History panel tree view
 *
 * @module katashiro
 * @task TSK-072
 */

import * as vscode from 'vscode';

/**
 * History entry type
 */
export type HistoryEntryType =
  | 'search'
  | 'analysis'
  | 'summary'
  | 'research'
  | 'report';

/**
 * History entry
 */
export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  title: string;
  timestamp: Date;
  details?: string;
}

/**
 * History item for tree view
 */
export class HistoryItem extends vscode.TreeItem {
  constructor(
    public readonly entry: HistoryEntry,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(entry.title, collapsibleState);
    this.description = this.formatTime(entry.timestamp);
    this.tooltip = `${entry.type}: ${entry.title}\n${entry.details || ''}`;
    this.contextValue = entry.type;

    // Set icon based on type
    switch (entry.type) {
      case 'search':
        this.iconPath = new vscode.ThemeIcon('search');
        break;
      case 'analysis':
        this.iconPath = new vscode.ThemeIcon('pulse');
        break;
      case 'summary':
        this.iconPath = new vscode.ThemeIcon('note');
        break;
      case 'research':
        this.iconPath = new vscode.ThemeIcon('book');
        break;
      case 'report':
        this.iconPath = new vscode.ThemeIcon('file-text');
        break;
    }
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

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}

/**
 * HistoryViewProvider
 *
 * Provides tree data for the History panel
 */
export class HistoryViewProvider
  implements vscode.TreeDataProvider<HistoryItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    HistoryItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private history: HistoryEntry[] = [];
  private maxEntries = 50;

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a history entry
   */
  addEntry(
    type: HistoryEntryType,
    title: string,
    details?: string
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: this.generateId(),
      type,
      title,
      timestamp: new Date(),
      details,
    };

    this.history.unshift(entry);

    // Limit history size
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries);
    }

    this.refresh();
    return entry;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.refresh();
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): HistoryEntry | undefined {
    return this.history.find((e) => e.id === id);
  }

  /**
   * Get all entries
   */
  getAll(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get tree item
   */
  getTreeItem(element: HistoryItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
    if (element) {
      // No children for history items
      return Promise.resolve([]);
    }

    // Root level - all history entries
    if (this.history.length === 0) {
      return Promise.resolve([]);
    }

    // Group by date
    const today: HistoryEntry[] = [];
    const yesterday: HistoryEntry[] = [];
    const thisWeek: HistoryEntry[] = [];
    const older: HistoryEntry[] = [];

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    for (const entry of this.history) {
      const time = entry.timestamp.getTime();
      if (time >= todayStart.getTime()) {
        today.push(entry);
      } else if (time >= yesterdayStart.getTime()) {
        yesterday.push(entry);
      } else if (time >= weekStart.getTime()) {
        thisWeek.push(entry);
      } else {
        older.push(entry);
      }
    }

    // Return all entries as flat list
    return Promise.resolve(
      this.history.map(
        (entry) =>
          new HistoryItem(entry, vscode.TreeItemCollapsibleState.None)
      )
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
