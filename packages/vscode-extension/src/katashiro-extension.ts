/**
 * KatashiroExtension - Main extension controller
 *
 * Manages commands, views, and integration with KATASHIRO packages
 *
 * @module katashiro
 * @task TSK-070
 */

import * as vscode from 'vscode';
import { CommandManager } from './commands/command-manager.js';
import { ResearchViewProvider } from './views/research-view-provider.js';
import { KnowledgeViewProvider } from './views/knowledge-view-provider.js';
import { HistoryViewProvider } from './views/history-view-provider.js';
import { StatusBarManager } from './ui/status-bar-manager.js';
import { OutputChannelManager } from './ui/output-channel-manager.js';

/**
 * Extension configuration
 */
export interface KatashiroConfig {
  searchEngine: 'duckduckgo' | 'google' | 'bing';
  maxSearchResults: number;
  outputFormat: 'markdown' | 'html' | 'json';
  autoSaveKnowledge: boolean;
  mcpServerPort: number;
}

/**
 * KatashiroExtension
 *
 * Main controller for the KATASHIRO VS Code extension
 */
export class KatashiroExtension {
  private commandManager: CommandManager;
  private researchViewProvider: ResearchViewProvider;
  private knowledgeViewProvider: KnowledgeViewProvider;
  private historyViewProvider: HistoryViewProvider;
  private statusBarManager: StatusBarManager;
  private outputChannelManager: OutputChannelManager;

  constructor(private readonly context: vscode.ExtensionContext) {
    // Initialize managers
    this.outputChannelManager = new OutputChannelManager();
    this.statusBarManager = new StatusBarManager();
    this.commandManager = new CommandManager(
      context,
      this.outputChannelManager
    );

    // Initialize view providers
    this.researchViewProvider = new ResearchViewProvider();
    this.knowledgeViewProvider = new KnowledgeViewProvider();
    this.historyViewProvider = new HistoryViewProvider();
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    // Register commands
    this.commandManager.registerAll();

    // Register view providers
    this.registerViewProviders();

    // Initialize status bar
    this.statusBarManager.show();

    // Log activation
    this.outputChannelManager.log('KATASHIRO extension activated');
  }

  /**
   * Deactivate the extension
   */
  async deactivate(): Promise<void> {
    this.statusBarManager.dispose();
    this.outputChannelManager.dispose();
    this.outputChannelManager.log('KATASHIRO extension deactivated');
  }

  /**
   * Get current configuration
   */
  getConfig(): KatashiroConfig {
    const config = vscode.workspace.getConfiguration('katashiro');
    return {
      searchEngine: config.get('searchEngine', 'duckduckgo'),
      maxSearchResults: config.get('maxSearchResults', 10),
      outputFormat: config.get('outputFormat', 'markdown'),
      autoSaveKnowledge: config.get('autoSaveKnowledge', true),
      mcpServerPort: config.get('mcpServerPort', 3000),
    };
  }

  /**
   * Register view providers
   */
  private registerViewProviders(): void {
    // Research view
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
        'katashiro.research',
        this.researchViewProvider
      )
    );

    // Knowledge view
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
        'katashiro.knowledge',
        this.knowledgeViewProvider
      )
    );

    // History view
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
        'katashiro.history',
        this.historyViewProvider
      )
    );
  }
}
