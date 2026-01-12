/**
 * KATASHIRO VS Code Extension
 *
 * Main extension entry point
 *
 * @module katashiro
 * @task TSK-070
 */

import * as vscode from 'vscode';
import { KatashiroExtension } from './katashiro-extension.js';

let extension: KatashiroExtension | undefined;

/**
 * Activate the extension
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log('KATASHIRO extension activating...');

  try {
    extension = new KatashiroExtension(context);
    await extension.activate();

    console.log('KATASHIRO extension activated successfully');
  } catch (error) {
    console.error('Failed to activate KATASHIRO extension:', error);
    vscode.window.showErrorMessage(
      `KATASHIRO: Failed to activate - ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deactivate the extension
 */
export async function deactivate(): Promise<void> {
  console.log('KATASHIRO extension deactivating...');

  if (extension) {
    await extension.deactivate();
    extension = undefined;
  }

  console.log('KATASHIRO extension deactivated');
}
