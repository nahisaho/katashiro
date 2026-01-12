/**
 * VS Code Mock - テスト用モック
 *
 * VS Code APIのモックを提供
 */

export const window = {
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  withProgress: vi.fn(async (_options, task) => {
    return task({ report: vi.fn() }, { isCancellationRequested: false });
  }),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  })),
  createStatusBarItem: vi.fn(() => ({
    text: '',
    tooltip: '',
    command: undefined,
    backgroundColor: undefined,
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  })),
  activeTextEditor: undefined,
  registerTreeDataProvider: vi.fn(() => ({ dispose: vi.fn() })),
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
  })),
  openTextDocument: vi.fn(async (options) => ({
    getText: vi.fn(() => options.content || ''),
    uri: { fsPath: '/test/file.md' },
  })),
};

export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
};

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  label: string;
  collapsibleState: TreeItemCollapsibleState;
  description?: string;
  tooltip?: string;
  command?: Command;
  iconPath?: ThemeIcon;
  contextValue?: string;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
  ) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export interface Command {
  command: string;
  title: string;
  arguments?: unknown[];
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => {} };
  };

  fire(data: T): void {
    this.listeners.forEach((l) => l(data));
  }
}

export enum ProgressLocation {
  Notification = 15,
  Window = 10,
  SourceControl = 1,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

// Re-export vi for test files
import { vi } from 'vitest';
