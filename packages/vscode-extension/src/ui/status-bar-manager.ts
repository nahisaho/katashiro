/**
 * StatusBarManager - VS Code status bar management
 *
 * @module katashiro
 * @task TSK-073
 */

import * as vscode from 'vscode';

/**
 * Status bar state
 */
export type StatusBarState = 'idle' | 'working' | 'success' | 'error';

/**
 * StatusBarManager
 *
 * Manages VS Code status bar item for KATASHIRO
 */
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: StatusBarState = 'idle';
  private spinnerInterval: NodeJS.Timeout | null = null;
  private spinnerFrames = ['$(sync~spin)', '$(loading~spin)'];
  private spinnerIndex = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'katashiro.webSearch';
    this.setIdle();
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose the status bar item
   */
  dispose(): void {
    this.stopSpinner();
    this.statusBarItem.dispose();
  }

  /**
   * Get current state
   */
  getState(): StatusBarState {
    return this.currentState;
  }

  /**
   * Set idle state
   */
  setIdle(message = 'KATASHIRO'): void {
    this.stopSpinner();
    this.currentState = 'idle';
    this.statusBarItem.text = `$(search) ${message}`;
    this.statusBarItem.tooltip = 'Click to search';
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Set working state
   */
  setWorking(message = 'Working...'): void {
    this.currentState = 'working';
    this.statusBarItem.tooltip = message;
    this.startSpinner(message);
  }

  /**
   * Set success state
   */
  setSuccess(message = 'Done', autoResetMs = 3000): void {
    this.stopSpinner();
    this.currentState = 'success';
    this.statusBarItem.text = `$(check) ${message}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.prominentBackground'
    );

    if (autoResetMs > 0) {
      setTimeout(() => {
        if (this.currentState === 'success') {
          this.setIdle();
        }
      }, autoResetMs);
    }
  }

  /**
   * Set error state
   */
  setError(message = 'Error', autoResetMs = 5000): void {
    this.stopSpinner();
    this.currentState = 'error';
    this.statusBarItem.text = `$(error) ${message}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.errorBackground'
    );

    if (autoResetMs > 0) {
      setTimeout(() => {
        if (this.currentState === 'error') {
          this.setIdle();
        }
      }, autoResetMs);
    }
  }

  /**
   * Start spinner animation
   */
  private startSpinner(message: string): void {
    this.stopSpinner();
    this.updateSpinner(message);
    this.spinnerInterval = setInterval(() => {
      this.updateSpinner(message);
    }, 500);
  }

  /**
   * Update spinner frame
   */
  private updateSpinner(message: string): void {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.statusBarItem.text = `${frame} ${message}`;
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
  }

  /**
   * Stop spinner animation
   */
  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
    this.spinnerIndex = 0;
  }
}
