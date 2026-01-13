/**
 * KATASHIRO Sandbox Package
 *
 * @fileoverview REQ-007: コード実行サンドボックス
 * @module @nahisaho/katashiro-sandbox
 * @since 0.4.0
 */

// 型定義
export type {
  SandboxRuntime,
  SupportedLanguage,
  ExecutionStatus,
  SandboxConfig,
  DockerConfig,
  ExecutionRequest,
  FileOutput,
  ExecutionResult,
  ExecutionError,
  SecurityPolicy,
  SandboxEventType,
  SandboxEvent,
  SandboxEventListener,
  ContainerInfo,
  ResourceStats,
} from './types';

// 定数
export {
  DEFAULT_SANDBOX_CONFIG,
  DEFAULT_DOCKER_CONFIG,
  DEFAULT_DOCKER_IMAGES,
  DEFAULT_SECURITY_POLICY,
} from './types';

// Docker Executor
export { DockerExecutor, SandboxError } from './docker-executor';

// Local Executor
export { LocalExecutor } from './local-executor';

// Sandbox Factory & Interface
export {
  SandboxFactory,
  type ISandbox,
  executeCode,
  executeBash,
  executePython,
  executeJavaScript,
  executeTypeScript,
} from './sandbox';
