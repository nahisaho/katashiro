/**
 * KATASHIRO Sandbox - Docker Executor Implementation
 *
 * @fileoverview REQ-007: Dockerベースのコード実行サンドボックス
 * @module @nahisaho/katashiro-sandbox
 * @since 0.4.0
 */

import { EventEmitter } from 'events';
import Docker from 'dockerode';
import { ok, err, type Result, generateId } from '@nahisaho/katashiro-core';
import type {
  SandboxConfig,
  DockerConfig,
  ExecutionRequest,
  ExecutionResult,
  ExecutionError,
  FileOutput,
  SupportedLanguage,
  SecurityPolicy,
  SandboxEvent,
  SandboxEventType,
  SandboxEventListener,
  ContainerInfo,
  ResourceStats,
} from './types';
import {
  DEFAULT_SANDBOX_CONFIG,
  DEFAULT_DOCKER_CONFIG,
  DEFAULT_SECURITY_POLICY,
} from './types';

// =============================================================================
// エラークラス
// =============================================================================

/**
 * サンドボックスエラー
 */
export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

// =============================================================================
// Docker Executor
// =============================================================================

/**
 * Docker Executor
 *
 * EARS Requirements:
 * - Ubiquitous: The Sandbox shall execute code in an isolated Docker/VM environment
 * - Ubiquitous: The Sandbox shall support bash, Python, and JavaScript/TypeScript execution
 * - Event-Driven: When execution time exceeds timeout, the Sandbox shall terminate
 * - State-Driven: While code is executing, the Sandbox shall enforce CPU and memory limits
 * - Unwanted: If code attempts to access host system, the Sandbox shall block the access
 */
export class DockerExecutor extends EventEmitter {
  private readonly docker: Docker;
  private readonly config: SandboxConfig;
  private readonly dockerConfig: DockerConfig;
  private readonly securityPolicy: SecurityPolicy;
  private readonly activeContainers = new Map<string, Docker.Container>();

  constructor(
    config: Partial<SandboxConfig> = {},
    dockerConfig: Partial<DockerConfig> = {},
    securityPolicy: Partial<SecurityPolicy> = {}
  ) {
    super();
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.dockerConfig = { ...DEFAULT_DOCKER_CONFIG, ...dockerConfig };
    this.securityPolicy = { ...DEFAULT_SECURITY_POLICY, ...securityPolicy };

    // Docker クライアント初期化
    this.docker = new Docker({
      socketPath: this.dockerConfig.socketPath,
      host: this.dockerConfig.host,
    });
  }

  /**
   * 型安全なイベントリスナー登録
   */
  on(event: SandboxEventType, listener: SandboxEventListener): this {
    return super.on(event, listener);
  }

  /**
   * イベント発火
   */
  private emitEvent(
    type: SandboxEventType,
    data: Partial<SandboxEvent>
  ): void {
    const event: SandboxEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    };
    this.emit(type, event);
  }

  /**
   * コードを実行
   *
   * @param code 実行するコード
   * @param language プログラミング言語
   * @param options 追加オプション
   */
  async execute(
    code: string,
    language: SupportedLanguage,
    options: Partial<Pick<ExecutionRequest, 'stdin' | 'env' | 'timeout'>> = {}
  ): Promise<Result<ExecutionResult, SandboxError>> {
    const requestId = generateId();
    const timeout = options.timeout ?? this.config.timeout;
    const startTime = Date.now();

    // リクエスト作成
    const request: ExecutionRequest = {
      id: requestId,
      code,
      language,
      stdin: options.stdin,
      env: options.env,
      timeout,
      createdAt: new Date().toISOString(),
    };

    this.emitEvent('execution:start', { requestId });

    let container: Docker.Container | undefined;

    try {
      // コンテナ作成
      container = await this.createContainer(request);
      this.activeContainers.set(requestId, container);

      this.emitEvent('container:create', {
        requestId,
        containerId: container.id,
      });

      // コンテナ起動
      await container.start();
      this.emitEvent('container:start', {
        requestId,
        containerId: container.id,
      });

      // タイムアウト設定
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new SandboxError('Execution timeout', 'TIMEOUT', { timeout }));
        }, timeout * 1000);
      });

      // 実行結果待機（タイムアウト付き）
      const resultPromise = this.waitForCompletion(container, request);
      const result = await Promise.race([resultPromise, timeoutPromise]);

      const duration = Date.now() - startTime;

      // 出力ファイル取得
      const files = await this.extractOutputFiles(container);

      const executionResult: ExecutionResult = {
        requestId,
        status: result.exitCode === 0 ? 'completed' : 'failed',
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        files,
        completedAt: new Date().toISOString(),
      };

      this.emitEvent('execution:complete', { requestId, data: executionResult });

      return ok(executionResult);
    } catch (error) {
      const duration = Date.now() - startTime;
      const execError = this.parseError(error);

      const executionResult: ExecutionResult = {
        requestId,
        status: execError.code === 'TIMEOUT' ? 'timeout' : 'failed',
        exitCode: -1,
        stdout: '',
        stderr: execError.message,
        duration,
        files: [],
        error: execError,
        completedAt: new Date().toISOString(),
      };

      if (execError.code === 'TIMEOUT') {
        this.emitEvent('execution:timeout', { requestId, data: executionResult });
      } else {
        this.emitEvent('execution:error', { requestId, data: executionResult });
      }

      return err(
        new SandboxError(execError.message, execError.code, { requestId })
      );
    } finally {
      // クリーンアップ
      if (container) {
        await this.cleanupContainer(container, requestId);
      }
      this.activeContainers.delete(requestId);
    }
  }

  /**
   * コンテナを作成
   */
  private async createContainer(
    request: ExecutionRequest
  ): Promise<Docker.Container> {
    const image = this.dockerConfig.images[request.language];
    const containerName = `${this.dockerConfig.containerPrefix}${request.id}`;

    // コード実行用のコマンドを生成
    const { cmd, entrypoint } = this.buildCommand(request);

    // セキュリティオプション
    const securityOpts: string[] = ['no-new-privileges'];

    // Ulimit設定
    const ulimits = [
      { Name: 'nproc', Soft: this.securityPolicy.maxProcesses, Hard: this.securityPolicy.maxProcesses },
      { Name: 'nofile', Soft: this.securityPolicy.maxOpenFiles, Hard: this.securityPolicy.maxOpenFiles },
    ];

    // コンテナ作成
    const container = await this.docker.createContainer({
      Image: image,
      name: containerName,
      Cmd: cmd,
      Entrypoint: entrypoint,
      Env: this.buildEnv(request.env),
      WorkingDir: this.config.workingDir,
      NetworkDisabled: !this.config.networkEnabled,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!request.stdin,
      OpenStdin: !!request.stdin,
      Tty: false,
      HostConfig: {
        AutoRemove: false, // 結果取得後に手動削除
        Memory: this.config.memoryLimit,
        MemorySwap: this.config.memoryLimit, // スワップ無効化
        CpuPeriod: 100000,
        CpuQuota: Math.floor(this.config.cpuLimit * 100000),
        ReadonlyRootfs: false, // /workspaceへの書き込みを許可するため
        SecurityOpt: securityOpts,
        Ulimits: ulimits,
        Tmpfs: {
          '/tmp': `size=${this.config.tmpfsSize}`,
        },
        // CapDropでケーパビリティを削除
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
      },
    });

    // コードをコンテナにコピー
    await this.copyCodeToContainer(container, request);

    return container;
  }

  /**
   * 実行コマンドを構築
   */
  private buildCommand(
    request: ExecutionRequest
  ): { cmd: string[]; entrypoint?: string[] } {
    const codeFile = this.getCodeFileName(request.language);

    switch (request.language) {
      case 'bash':
        return {
          cmd: ['/bin/sh', `${this.config.workingDir}/${codeFile}`],
        };
      case 'python':
        return {
          cmd: ['python3', `${this.config.workingDir}/${codeFile}`],
        };
      case 'javascript':
        return {
          cmd: ['node', `${this.config.workingDir}/${codeFile}`],
        };
      case 'typescript':
        // TypeScriptはts-nodeまたはtsxで実行
        return {
          cmd: ['npx', 'tsx', `${this.config.workingDir}/${codeFile}`],
        };
      default:
        throw new SandboxError(
          `Unsupported language: ${request.language}`,
          'UNSUPPORTED_LANGUAGE'
        );
    }
  }

  /**
   * 言語に対応するファイル名を取得
   */
  private getCodeFileName(language: SupportedLanguage): string {
    const extensions: Record<SupportedLanguage, string> = {
      bash: 'script.sh',
      python: 'script.py',
      javascript: 'script.js',
      typescript: 'script.ts',
    };
    return extensions[language];
  }

  /**
   * 環境変数を構築
   */
  private buildEnv(env?: Record<string, string>): string[] {
    const baseEnv = ['PATH=/usr/local/bin:/usr/bin:/bin'];
    if (!env) return baseEnv;

    return [
      ...baseEnv,
      ...Object.entries(env).map(([key, value]) => `${key}=${value}`),
    ];
  }

  /**
   * コードをコンテナにコピー
   */
  private async copyCodeToContainer(
    container: Docker.Container,
    request: ExecutionRequest
  ): Promise<void> {
    const codeFile = this.getCodeFileName(request.language);

    // tarアーカイブを作成
    const tar = await this.createTarArchive(codeFile, request.code);

    // コンテナにコピー
    await container.putArchive(tar, { path: this.config.workingDir });
  }

  /**
   * tarアーカイブを作成（簡易版）
   */
  private async createTarArchive(
    filename: string,
    content: string
  ): Promise<Buffer> {
    // tarヘッダを構築（512バイトブロック）
    const contentBuffer = Buffer.from(content, 'utf-8');
    const header = Buffer.alloc(512);

    // ファイル名（最大100文字）
    header.write(filename, 0, 100, 'utf-8');
    // ファイルモード（8進数文字列）
    header.write('0000755', 100, 7, 'utf-8');
    header.write('\0', 107);
    // UID
    header.write('0000000', 108, 7, 'utf-8');
    header.write('\0', 115);
    // GID
    header.write('0000000', 116, 7, 'utf-8');
    header.write('\0', 123);
    // サイズ（8進数文字列）
    const sizeStr = contentBuffer.length.toString(8).padStart(11, '0');
    header.write(sizeStr, 124, 11, 'utf-8');
    header.write('\0', 135);
    // 変更時刻
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0');
    header.write(mtime, 136, 11, 'utf-8');
    header.write('\0', 147);
    // チェックサム用スペース
    header.fill(' ', 148, 156);
    // タイプフラグ（0 = 通常ファイル）
    header.write('0', 156, 1, 'utf-8');
    // リンク名（空）
    // UStar indicator
    header.write('ustar', 257, 5, 'utf-8');
    header.write('00', 263, 2, 'utf-8');

    // チェックサム計算
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i] ?? 0;
    }
    const checksumStr = checksum.toString(8).padStart(6, '0');
    header.write(checksumStr, 148, 6, 'utf-8');
    header.write('\0 ', 154, 2);

    // コンテンツをパディング
    const padding = 512 - (contentBuffer.length % 512);
    const paddedContent =
      padding === 512
        ? contentBuffer
        : Buffer.concat([contentBuffer, Buffer.alloc(padding)]);

    // 終端ブロック（2つの空ブロック）
    const endBlock = Buffer.alloc(1024);

    return Buffer.concat([header, paddedContent, endBlock]);
  }

  /**
   * コンテナの完了を待機
   */
  private async waitForCompletion(
    container: Docker.Container,
    request: ExecutionRequest
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    // stdin送信（あれば）
    if (request.stdin) {
      const stream = await container.attach({
        stream: true,
        stdin: true,
        hijack: true,
      });
      stream.write(request.stdin);
      stream.end();
    }

    // 完了待機
    const waitResult = await container.wait();

    // ログ取得
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
    });

    // ログをパース（Docker multiplexed stream format）
    const { stdout, stderr } = this.parseLogs(logs);

    return {
      exitCode: waitResult.StatusCode,
      stdout,
      stderr,
    };
  }

  /**
   * Dockerログをパース
   */
  private parseLogs(logs: Buffer | NodeJS.ReadableStream): {
    stdout: string;
    stderr: string;
  } {
    if (Buffer.isBuffer(logs)) {
      // Docker multiplexed stream format
      let stdout = '';
      let stderr = '';
      let offset = 0;

      while (offset < logs.length) {
        if (offset + 8 > logs.length) break;

        const streamType = logs[offset];
        const size = logs.readUInt32BE(offset + 4);
        offset += 8;

        if (offset + size > logs.length) break;

        const chunk = logs.slice(offset, offset + size).toString('utf-8');
        offset += size;

        if (streamType === 1) {
          stdout += chunk;
        } else if (streamType === 2) {
          stderr += chunk;
        }
      }

      return { stdout, stderr };
    }

    // ストリームの場合（未実装）
    return { stdout: '', stderr: '' };
  }

  /**
   * 出力ファイルを抽出
   */
  private async extractOutputFiles(
    _container: Docker.Container
  ): Promise<FileOutput[]> {
    // 現時点では出力ファイルの抽出は未実装
    // 将来的にはworkspace内の新規・更新ファイルを検出して返す
    return [];
  }

  /**
   * コンテナをクリーンアップ
   */
  private async cleanupContainer(
    container: Docker.Container,
    requestId: string
  ): Promise<void> {
    try {
      // 実行中なら停止
      const info = await container.inspect();
      if (info.State.Running) {
        await container.stop({ t: 1 });
      }

      // コンテナ削除
      await container.remove({ force: true });

      this.emitEvent('container:stop', {
        requestId,
        containerId: container.id,
      });
    } catch {
      // クリーンアップエラーは無視
    }
  }

  /**
   * エラーをパース
   */
  private parseError(error: unknown): ExecutionError {
    if (error instanceof SandboxError) {
      return {
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    };
  }

  /**
   * アクティブなコンテナ数を取得
   */
  getActiveContainerCount(): number {
    return this.activeContainers.size;
  }

  /**
   * 指定した実行をキャンセル
   */
  async cancel(requestId: string): Promise<boolean> {
    const container = this.activeContainers.get(requestId);
    if (!container) return false;

    try {
      await container.stop({ t: 1 });
      await container.remove({ force: true });
      this.activeContainers.delete(requestId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 全アクティブコンテナをクリーンアップ
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.activeContainers.entries()).map(
      async ([requestId, container]) => {
        await this.cleanupContainer(container, requestId);
        this.activeContainers.delete(requestId);
      }
    );

    await Promise.all(promises);
  }

  /**
   * コンテナ情報を取得
   */
  async getContainerInfo(requestId: string): Promise<ContainerInfo | null> {
    const container = this.activeContainers.get(requestId);
    if (!container) return null;

    try {
      const info = await container.inspect();
      return {
        id: info.Id,
        name: info.Name,
        image: info.Config.Image,
        status: info.State.Status as ContainerInfo['status'],
        createdAt: info.Created,
        startedAt: info.State.StartedAt,
        finishedAt: info.State.FinishedAt || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * リソース使用量を取得
   */
  async getResourceStats(requestId: string): Promise<ResourceStats | null> {
    const container = this.activeContainers.get(requestId);
    if (!container) return null;

    try {
      const stats = await container.stats({ stream: false });
      const statsData = stats as unknown as {
        memory_stats: { usage: number; limit: number };
        cpu_stats: {
          cpu_usage: { total_usage: number };
          system_cpu_usage: number;
        };
        precpu_stats: {
          cpu_usage: { total_usage: number };
          system_cpu_usage: number;
        };
        networks?: Record<string, { tx_bytes: number; rx_bytes: number }>;
        blkio_stats: {
          io_service_bytes_recursive?: Array<{ op: string; value: number }>;
        };
      };

      // CPU使用率計算
      const cpuDelta =
        statsData.cpu_stats.cpu_usage.total_usage -
        statsData.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        statsData.cpu_stats.system_cpu_usage -
        statsData.precpu_stats.system_cpu_usage;
      const cpuPercent =
        systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;

      // ネットワーク統計
      let networkTx = 0;
      let networkRx = 0;
      if (statsData.networks) {
        for (const net of Object.values(statsData.networks)) {
          networkTx += net.tx_bytes;
          networkRx += net.rx_bytes;
        }
      }

      // ディスクIO統計
      let diskRead = 0;
      let diskWrite = 0;
      const ioStats = statsData.blkio_stats.io_service_bytes_recursive;
      if (ioStats) {
        for (const io of ioStats) {
          if (io.op === 'read') diskRead += io.value;
          if (io.op === 'write') diskWrite += io.value;
        }
      }

      return {
        memoryUsage: statsData.memory_stats.usage,
        memoryLimit: statsData.memory_stats.limit,
        cpuPercent,
        networkTx,
        networkRx,
        diskRead,
        diskWrite,
      };
    } catch {
      return null;
    }
  }
}
