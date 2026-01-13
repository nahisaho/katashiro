/**
 * DockerWorkspace - Dockerコンテナ内ファイルシステムワークスペース
 *
 * @requirement REQ-011-04
 */

import Dockerode from 'dockerode';
import * as path from 'node:path';
import type {
  Workspace,
  DockerWorkspaceConfig,
  FileInfo,
  DirectoryEntry,
} from './types.js';
import { WorkspaceError, DEFAULT_DOCKER_SOCKET } from './types.js';

/**
 * DockerWorkspace - Dockerコンテナ内でのファイル操作
 *
 * @example
 * ```typescript
 * const workspace = new DockerWorkspace({
 *   type: 'docker',
 *   containerId: 'container123',
 *   workingDir: '/app',
 * });
 *
 * await workspace.initialize();
 * const content = await workspace.read('config.json');
 * await workspace.write('output.txt', 'Hello Docker');
 * await workspace.cleanup();
 * ```
 */
export class DockerWorkspace implements Workspace {
  readonly type = 'docker' as const;
  readonly workingDir: string;
  readonly readOnly: boolean;

  private docker: Dockerode;
  private container: Dockerode.Container;
  private containerId: string;

  constructor(config: DockerWorkspaceConfig) {
    this.containerId = config.containerId;
    this.workingDir = config.workingDir;
    this.readOnly = config.readOnly ?? false;

    this.docker = new Dockerode({
      socketPath: config.socketPath || DEFAULT_DOCKER_SOCKET,
    });
    this.container = this.docker.getContainer(this.containerId);
  }

  /**
   * パスを解決
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.posix.join(this.workingDir, filePath);
  }

  /**
   * 書き込み可能か検証
   */
  private validateWritable(): void {
    if (this.readOnly) {
      throw new WorkspaceError('READ_ONLY', 'Workspace is read-only');
    }
  }

  /**
   * コンテナ内でコマンドを実行
   */
  private async exec(cmd: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const exec = await this.container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
      });

      return new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: false }, (err, stream) => {
          if (err) {
            reject(new WorkspaceError('OPERATION_FAILED', `Exec failed: ${err.message}`));
            return;
          }

          if (!stream) {
            reject(new WorkspaceError('OPERATION_FAILED', 'No stream returned'));
            return;
          }

          let stdout = '';
          let stderr = '';

          // Docker multiplexed stream handling
          stream.on('data', (chunk: Buffer) => {
            // Docker stream format: 8-byte header + data
            // First byte: 1=stdout, 2=stderr
            if (chunk.length > 8) {
              const streamType = chunk[0];
              const data = chunk.slice(8).toString('utf-8');
              if (streamType === 1) {
                stdout += data;
              } else if (streamType === 2) {
                stderr += data;
              }
            } else {
              stdout += chunk.toString('utf-8');
            }
          });

          stream.on('end', async () => {
            try {
              const inspectResult = await exec.inspect();
              resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: inspectResult.ExitCode ?? 0,
              });
            } catch {
              resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 });
            }
          });

          stream.on('error', (error: Error) => {
            reject(new WorkspaceError('OPERATION_FAILED', `Stream error: ${error.message}`));
          });
        });
      });
    } catch (error) {
      throw new WorkspaceError(
        'CONNECTION_FAILED',
        `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async initialize(): Promise<void> {
    try {
      const info = await this.container.inspect();
      if (!info.State.Running) {
        throw new WorkspaceError(
          'CONNECTION_FAILED',
          `Container ${this.containerId} is not running`
        );
      }
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw new WorkspaceError(
        'CONNECTION_FAILED',
        `Failed to connect to container: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cleanup(): Promise<void> {
    // DockerWorkspaceはステートレスなので特にクリーンアップは不要
  }

  async read(filePath: string, _encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const resolved = this.resolvePath(filePath);

    const result = await this.exec(['cat', resolved]);
    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }

    return result.stdout;
  }

  async readBuffer(filePath: string): Promise<Buffer> {
    const resolved = this.resolvePath(filePath);

    const result = await this.exec(['cat', resolved]);
    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }

    return Buffer.from(result.stdout, 'utf-8');
  }

  async write(filePath: string, content: string): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);

    // ディレクトリを作成
    const dir = path.posix.dirname(resolved);
    await this.exec(['mkdir', '-p', dir]);

    // base64エンコードして書き込み（特殊文字対策）
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    const result = await this.exec(['sh', '-c', `echo '${encoded}' | base64 -d > '${resolved}'`]);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }
  }

  async writeBuffer(filePath: string, buffer: Buffer): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);

    const dir = path.posix.dirname(resolved);
    await this.exec(['mkdir', '-p', dir]);

    const encoded = buffer.toString('base64');
    const result = await this.exec(['sh', '-c', `echo '${encoded}' | base64 -d > '${resolved}'`]);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }
  }

  async list(dirPath: string): Promise<FileInfo[]> {
    const resolved = this.resolvePath(dirPath);

    const result = await this.exec([
      'sh',
      '-c',
      `ls -la --time-style=+%s '${resolved}' | tail -n +2`,
    ]);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, dirPath);
    }

    return this.parseLsOutput(result.stdout, resolved);
  }

  async listEntries(dirPath: string): Promise<DirectoryEntry[]> {
    const resolved = this.resolvePath(dirPath);

    const result = await this.exec(['sh', '-c', `ls -la '${resolved}' | tail -n +2`]);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, dirPath);
    }

    return this.parseLsEntries(result.stdout);
  }

  async search(pattern: string): Promise<string[]> {
    const result = await this.exec([
      'sh',
      '-c',
      `cd '${this.workingDir}' && find . -type f -name '${pattern}' 2>/dev/null | head -10000`,
    ]);

    if (result.exitCode !== 0 && result.stderr) {
      throw new WorkspaceError('OPERATION_FAILED', `Search failed: ${result.stderr}`);
    }

    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\.\//, ''));
  }

  async exists(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);

    const result = await this.exec(['test', '-e', resolved]);
    return result.exitCode === 0;
  }

  async delete(filePath: string): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(filePath);

    const result = await this.exec(['rm', '-rf', resolved]);
    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }
  }

  async mkdir(dirPath: string, recursive = true): Promise<void> {
    this.validateWritable();
    const resolved = this.resolvePath(dirPath);

    const cmd = recursive ? ['mkdir', '-p', resolved] : ['mkdir', resolved];
    const result = await this.exec(cmd);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, dirPath);
    }
  }

  async stat(filePath: string): Promise<FileInfo> {
    const resolved = this.resolvePath(filePath);

    const result = await this.exec([
      'stat',
      '-c',
      '%n|%s|%F|%Y|%W',
      resolved,
    ]);

    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, filePath);
    }

    const [name, size, type, mtime, ctime] = result.stdout.split('|');
    return {
      name: path.posix.basename(name),
      path: resolved,
      size: parseInt(size, 10),
      isDirectory: type === 'directory',
      modifiedAt: new Date(parseInt(mtime, 10) * 1000),
      createdAt: new Date(parseInt(ctime, 10) * 1000),
    };
  }

  async copy(src: string, dest: string): Promise<void> {
    this.validateWritable();
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);

    const dir = path.posix.dirname(destResolved);
    await this.exec(['mkdir', '-p', dir]);

    const result = await this.exec(['cp', '-r', srcResolved, destResolved]);
    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, src);
    }
  }

  async move(src: string, dest: string): Promise<void> {
    this.validateWritable();
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);

    const dir = path.posix.dirname(destResolved);
    await this.exec(['mkdir', '-p', dir]);

    const result = await this.exec(['mv', srcResolved, destResolved]);
    if (result.exitCode !== 0) {
      throw this.parseError(result.stderr, src);
    }
  }

  /**
   * lsの出力をパース
   */
  private parseLsOutput(output: string, basePath: string): FileInfo[] {
    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        if (parts.length < 7) return null;

        const permissions = parts[0];
        const size = parseInt(parts[4], 10);
        const timestamp = parseInt(parts[5], 10);
        const name = parts.slice(6).join(' ');

        return {
          name,
          path: path.posix.join(basePath, name),
          size: isNaN(size) ? 0 : size,
          isDirectory: permissions.startsWith('d'),
          modifiedAt: new Date(timestamp * 1000),
          createdAt: new Date(timestamp * 1000),
        };
      })
      .filter((info): info is FileInfo => info !== null);
  }

  /**
   * lsエントリをパース
   */
  private parseLsEntries(output: string): DirectoryEntry[] {
    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        if (parts.length < 7) return null;

        const permissions = parts[0];
        const name = parts.slice(8).join(' ');

        return {
          name,
          isDirectory: permissions.startsWith('d'),
        };
      })
      .filter((entry): entry is DirectoryEntry => entry !== null);
  }

  /**
   * エラーメッセージをパース
   */
  private parseError(stderr: string, filePath: string): WorkspaceError {
    const msg = stderr.toLowerCase();

    if (msg.includes('no such file') || msg.includes('not found')) {
      return new WorkspaceError('NOT_FOUND', `Not found: ${filePath}`, filePath);
    }
    if (msg.includes('permission denied')) {
      return new WorkspaceError('PERMISSION_DENIED', `Permission denied: ${filePath}`, filePath);
    }
    if (msg.includes('is a directory')) {
      return new WorkspaceError('IS_DIRECTORY', `Is a directory: ${filePath}`, filePath);
    }
    if (msg.includes('not a directory')) {
      return new WorkspaceError('NOT_DIRECTORY', `Not a directory: ${filePath}`, filePath);
    }

    return new WorkspaceError('OPERATION_FAILED', stderr || `Operation failed: ${filePath}`, filePath);
  }
}
