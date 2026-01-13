/**
 * WorkspaceFactory - ワークスペースファクトリー
 *
 * @requirement REQ-011-05
 */

import { LocalWorkspace } from './local-workspace.js';
import { DockerWorkspace } from './docker-workspace.js';
import type { Workspace, WorkspaceConfig } from './types.js';
import { WorkspaceError } from './types.js';

/**
 * WorkspaceFactory - ワークスペースの生成ユーティリティ
 *
 * @example
 * ```typescript
 * // ローカルワークスペース
 * const local = WorkspaceFactory.create({
 *   type: 'local',
 *   workingDir: '/path/to/project',
 * });
 *
 * // Dockerワークスペース
 * const docker = WorkspaceFactory.create({
 *   type: 'docker',
 *   containerId: 'container123',
 *   workingDir: '/app',
 * });
 *
 * // 型に依存しない統一操作
 * async function readConfig(workspace: Workspace): Promise<string> {
 *   return workspace.read('config.json');
 * }
 * ```
 */
export class WorkspaceFactory {
  /**
   * ワークスペースを生成（REQ-011-05）
   */
  static create(config: WorkspaceConfig): Workspace {
    switch (config.type) {
      case 'local':
        return new LocalWorkspace(config);

      case 'docker':
        return new DockerWorkspace(config);

      case 'remote':
        throw new WorkspaceError(
          'OPERATION_FAILED',
          'RemoteWorkspace is not yet implemented'
        );

      default:
        throw new WorkspaceError(
          'OPERATION_FAILED',
          `Unknown workspace type: ${(config as WorkspaceConfig).type}`
        );
    }
  }

  /**
   * ローカルワークスペースを生成
   */
  static createLocal(workingDir: string, options?: { readOnly?: boolean }): LocalWorkspace {
    return new LocalWorkspace({
      type: 'local',
      workingDir,
      readOnly: options?.readOnly,
    });
  }

  /**
   * Dockerワークスペースを生成
   */
  static createDocker(
    containerId: string,
    workingDir: string,
    options?: { readOnly?: boolean; socketPath?: string }
  ): DockerWorkspace {
    return new DockerWorkspace({
      type: 'docker',
      containerId,
      workingDir,
      readOnly: options?.readOnly,
      socketPath: options?.socketPath,
    });
  }
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * ワークスペースを作成して初期化
 */
export async function createWorkspace(config: WorkspaceConfig): Promise<Workspace> {
  const workspace = WorkspaceFactory.create(config);
  if (workspace.initialize) {
    await workspace.initialize();
  }
  return workspace;
}

/**
 * ワークスペースでファイルを読み取る簡易関数
 */
export async function readFile(
  config: WorkspaceConfig,
  filePath: string
): Promise<string> {
  const workspace = WorkspaceFactory.create(config);
  if (workspace.initialize) {
    await workspace.initialize();
  }
  try {
    return await workspace.read(filePath);
  } finally {
    if (workspace.cleanup) {
      await workspace.cleanup();
    }
  }
}

/**
 * ワークスペースでファイルを書き込む簡易関数
 */
export async function writeFile(
  config: WorkspaceConfig,
  filePath: string,
  content: string
): Promise<void> {
  const workspace = WorkspaceFactory.create(config);
  if (workspace.initialize) {
    await workspace.initialize();
  }
  try {
    await workspace.write(filePath, content);
  } finally {
    if (workspace.cleanup) {
      await workspace.cleanup();
    }
  }
}
