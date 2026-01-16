/**
 * Parallel processing module - 並列処理機構
 *
 * @requirement REQ-DR-S-002 並列処理の動的制御
 * @requirement REQ-DR-W-004 ドメイン別レート制限
 */

// Types
export type {
  SemaphoreConfig,
  DomainConfig,
  DomainRateLimiterConfig,
  TaskPriority,
  QueueTask,
  ConcurrencyQueueConfig,
  ResourceUsage,
  ResourceMonitorConfig,
  AdaptiveConcurrencyConfig,
  ParallelExecutorConfig,
  ContentStreamConfig,
  ParallelEvent,
  ParallelEventListener,
  TaskResult,
  BatchResult,
} from './types.js';

// Schemas and defaults
export {
  SemaphoreConfigSchema,
  DEFAULT_SEMAPHORE_CONFIG,
  DomainConfigSchema,
  DomainRateLimiterConfigSchema,
  DEFAULT_DOMAIN_RATE_LIMITER_CONFIG,
  ConcurrencyQueueConfigSchema,
  DEFAULT_CONCURRENCY_QUEUE_CONFIG,
  ResourceMonitorConfigSchema,
  DEFAULT_RESOURCE_MONITOR_CONFIG,
  AdaptiveConcurrencyConfigSchema,
  DEFAULT_ADAPTIVE_CONCURRENCY_CONFIG,
  ParallelExecutorConfigSchema,
  DEFAULT_PARALLEL_EXECUTOR_CONFIG,
  ContentStreamConfigSchema,
  DEFAULT_CONTENT_STREAM_CONFIG,
} from './types.js';

// Classes and factory functions
export { Semaphore, createSemaphore, SemaphoreAcquisitionError } from './semaphore.js';
export type { SemaphoreState } from './semaphore.js';
export { DomainRateLimiter, createDomainRateLimiter } from './domain-rate-limiter.js';
export { ConcurrencyQueue, createConcurrencyQueue } from './concurrency-queue.js';
export { ResourceMonitor, createResourceMonitor } from './resource-monitor.js';
export { AdaptiveConcurrencyController, createAdaptiveConcurrencyController } from './adaptive-concurrency-controller.js';
export { ContentStreamHandler, createContentStreamHandler } from './content-stream-handler.js';
export type { StreamResult, StreamSource } from './content-stream-handler.js';
export { ParallelExecutor, createParallelExecutor } from './parallel-executor.js';
export type { TaskInput } from './parallel-executor.js';
