/**
 * @nahisaho/katashiro-workspace
 *
 * Workspace management module for KATASHIRO.
 * Provides unified interface for file operations across local, remote, and Docker environments.
 *
 * @module @nahisaho/katashiro-workspace
 * @requirement REQ-011
 */

// Types
export type {
  WorkspaceType,
  FileInfo,
  DirectoryEntry,
  WorkspaceConfigBase,
  LocalWorkspaceConfig,
  RemoteWorkspaceConfig,
  DockerWorkspaceConfig,
  WorkspaceConfig,
  Workspace,
  WorkspaceErrorCode,
} from './types.js';

export {
  WorkspaceError,
  DEFAULT_REMOTE_TIMEOUT,
  DEFAULT_DOCKER_SOCKET,
} from './types.js';

// Workspace implementations
export { LocalWorkspace } from './local-workspace.js';
export { DockerWorkspace } from './docker-workspace.js';

// Factory and utilities
export {
  WorkspaceFactory,
  createWorkspace,
  readFile,
  writeFile,
} from './workspace-factory.js';
