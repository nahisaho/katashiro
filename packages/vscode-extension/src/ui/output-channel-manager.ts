/**
 * OutputChannelManager - VS Code output channel management
 *
 * @module katashiro
 * @task TSK-073
 */

import * as vscode from 'vscode';

/**
 * Log level
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * OutputChannelManager
 *
 * Manages VS Code output channel for KATASHIRO
 */
export class OutputChannelManager {
  private channel: vscode.OutputChannel;
  private debugMode: boolean;

  constructor(name = 'KATASHIRO') {
    this.channel = vscode.window.createOutputChannel(name);
    this.debugMode =
      vscode.workspace.getConfiguration('katashiro').get('debug', false);
  }

  /**
   * Log a message
   */
  log(message: string, level: LogLevel = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = this.getLevelPrefix(level);
    this.channel.appendLine(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Log info message
   */
  info(message: string): void {
    this.log(message, 'info');
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    this.log(message, 'warn');
  }

  /**
   * Log error message
   */
  error(message: string): void {
    this.log(message, 'error');
  }

  /**
   * Log debug message (only if debug mode is enabled)
   */
  debug(message: string): void {
    if (this.debugMode) {
      this.log(message, 'debug');
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.channel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.channel.clear();
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.channel.dispose();
  }

  /**
   * Get level prefix
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case 'info':
        return 'INFO';
      case 'warn':
        return 'WARN';
      case 'error':
        return 'ERROR';
      case 'debug':
        return 'DEBUG';
    }
  }
}
