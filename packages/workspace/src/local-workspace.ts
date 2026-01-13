/**
 * LocalWorkspace - ローカルファイルシステムワークスペース
 *
 * @requirement REQ-011-02
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { glob } from 'fast-glob';
import type {
  Workspace,
  LocalWorkspaceConfig,
  FileInfo,
  DirectoryEntry,
} from './types.js';
import { WorkspaceError } from './types.js';

/**
 * LocalWorkspace - ローカルファイルシステム操作
 *
 * @example
 * ```typescript
 * const workspace = new LocalWorkspace({
 *   type: 'local',
 *   workingDir: '/path/to/project',
 * });
 *
 * const content = await workspace.read('README.md');
 * await workspace.write('output.txt', 'Hello World');
 * const files = await workspace.search('**\/*.ts');
 * ```
 */
export class LocalWorkspace implements Workspace {
  readonly type = 'local' as const;
  readonly workingDir: string;
  readonly readOnly: boolean;

  constructor(config: LocalWorkspaceConfig) {
    this.workingDir = path.resolve(config.workingDir);
    this.readOnly = config.readOnly ?? false;
  }

  /**
   * 絶対パスを解決
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workingDir, filePath);
  }

  /**
   * ワークスペース内のパスか検証
   */
  private validatePath(filePath: string): void {
    const resolved = this.resolvePath(filePath);
    const normalized = path.normalize(resolved);
    
    // パストラバーサル防止
    if (!normalized.startsWith(this.workingDir)) {
      throw new WorkspaceError(
        'PERMISSION_DENIED',
        `Path traversal detected: ${filePath}`,
        filePath
      );
    }
  }

  /**
   * 書き込み可能か検証
   */
  private validateWritable(): void {
    if (this.readOnly) {
      throw new WorkspaceError(
        'READ_ONLY',
        'Workspace is read-only'
      );
    }
  }

  async read(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      return await fs.readFile(resolved, { encoding });
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async readBuffer(filePath: string): Promise<Buffer> {
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      return await fs.readFile(resolved);
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async write(filePath: string, content: string): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      // ディレクトリを作成
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, 'utf-8');
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async writeBuffer(filePath: string, buffer: Buffer): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, buffer);
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async list(dirPath: string): Promise<FileInfo[]> {
    const resolved = this.resolvePath(dirPath);
    this.validatePath(dirPath);

    try {
      const entries = await fs.readdir(resolved, { withFileTypes: true });
      const fileInfos: FileInfo[] = [];

      for (const entry of entries) {
        const entryPath = path.join(resolved, entry.name);
        const stats = await fs.stat(entryPath);

        fileInfos.push({
          name: entry.name,
          path: entryPath,
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime,
          createdAt: stats.birthtime,
        });
      }

      return fileInfos;
    } catch (error) {
      throw this.handleFsError(error, dirPath);
    }
  }

  async listEntries(dirPath: string): Promise<DirectoryEntry[]> {
    const resolved = this.resolvePath(dirPath);
    this.validatePath(dirPath);

    try {
      const entries = await fs.readdir(resolved, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      }));
    } catch (error) {
      throw this.handleFsError(error, dirPath);
    }
  }

  async search(pattern: string): Promise<string[]> {
    try {
      const files = await glob(pattern, {
        cwd: this.workingDir,
        absolute: false,
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });
      return files;
    } catch (error) {
      throw new WorkspaceError(
        'OPERATION_FAILED',
        `Search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      await fs.access(resolved);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      const stats = await fs.stat(resolved);
      if (stats.isDirectory()) {
        await fs.rm(resolved, { recursive: true });
      } else {
        await fs.unlink(resolved);
      }
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async mkdir(dirPath: string, recursive = true): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(dirPath);
    this.validatePath(dirPath);

    try {
      await fs.mkdir(resolved, { recursive });
    } catch (error) {
      throw this.handleFsError(error, dirPath);
    }
  }

  async stat(filePath: string): Promise<FileInfo> {
    const resolved = this.resolvePath(filePath);
    this.validatePath(filePath);

    try {
      const stats = await fs.stat(resolved);
      return {
        name: path.basename(resolved),
        path: resolved,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      throw this.handleFsError(error, filePath);
    }
  }

  async copy(src: string, dest: string): Promise<void> {
    this.validateWritable();
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);
    this.validatePath(src);
    this.validatePath(dest);

    try {
      await fs.mkdir(path.dirname(destResolved), { recursive: true });
      await fs.cp(srcResolved, destResolved, { recursive: true });
    } catch (error) {
      throw this.handleFsError(error, src);
    }
  }

  async move(src: string, dest: string): Promise<void> {
    this.validateWritable();
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);
    this.validatePath(src);
    this.validatePath(dest);

    try {
      await fs.mkdir(path.dirname(destResolved), { recursive: true });
      await fs.rename(srcResolved, destResolved);
    } catch (error) {
      throw this.handleFsError(error, src);
    }
  }

  /**
   * FSエラーをWorkspaceErrorに変換
   */
  private handleFsError(error: unknown, filePath: string): WorkspaceError {
    if (error instanceof WorkspaceError) {
      return error;
    }

    const fsError = error as NodeJS.ErrnoException;
    switch (fsError.code) {
      case 'ENOENT':
        return new WorkspaceError('NOT_FOUND', `Not found: ${filePath}`, filePath, fsError);
      case 'EACCES':
      case 'EPERM':
        return new WorkspaceError('PERMISSION_DENIED', `Permission denied: ${filePath}`, filePath, fsError);
      case 'EEXIST':
        return new WorkspaceError('ALREADY_EXISTS', `Already exists: ${filePath}`, filePath, fsError);
      case 'EISDIR':
        return new WorkspaceError('IS_DIRECTORY', `Is a directory: ${filePath}`, filePath, fsError);
      case 'ENOTDIR':
        return new WorkspaceError('NOT_DIRECTORY', `Not a directory: ${filePath}`, filePath, fsError);
      default:
        return new WorkspaceError(
          'OPERATION_FAILED',
          `Operation failed: ${fsError.message}`,
          filePath,
          fsError
        );
    }
  }
}
