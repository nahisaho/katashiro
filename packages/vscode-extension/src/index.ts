/**
 * @nahisaho/katashiro-vscode-extension
 * VS Code拡張機能
 *
 * @requirement REQ-VSCODE-001 ~ REQ-VSCODE-004
 * @design DES-KATASHIRO-001 §2.3 VS Code Extension
 */

// Extension entry points
export { activate, deactivate } from './extension.js';

// Extension controller
export { KatashiroExtension, type KatashiroConfig } from './katashiro-extension.js';

// Commands
export { CommandManager } from './commands/index.js';

// Views
export {
  ResearchViewProvider,
  ResearchItem,
  KnowledgeViewProvider,
  KnowledgeItem,
  HistoryViewProvider,
  HistoryItem,
  type HistoryEntry,
  type HistoryEntryType,
} from './views/index.js';

// UI
export {
  OutputChannelManager,
  StatusBarManager,
  type LogLevel,
  type StatusBarState,
} from './ui/index.js';
