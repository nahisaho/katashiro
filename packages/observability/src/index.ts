/**
 * @nahisaho/katashiro-observability
 * トレーシング・メトリクス・ロギング
 *
 * @requirement REQ-OBS-001, REQ-OBS-002, REQ-OBS-003, REQ-OBS-004, REQ-OBS-005
 * @design DES-KATASHIRO-003-OBS
 */

// Types
export type {
  // Tracing
  Span,
  SpanOptions,
  SpanStatus,
  SpanEvent,
  SpanLink,
  TraceRecord,
  TraceContext,
  TracerConfig,
  TraceExporter,
  AttributeValue,
  // Metrics
  MetricsSnapshot,
  HistogramData,
  MetricsExporter,
  // Health
  HealthCheck,
  HealthCheckResult,
} from './types.js';

// Span
export { SpanImpl, NoopSpan } from './Span.js';

// Tracer
export { Tracer, getGlobalTracer, trace } from './Tracer.js';

// Metrics
export {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
} from './MetricsCollector.js';

// Health
export {
  HealthChecker,
  getHealthChecker,
  resetHealthChecker,
} from './HealthChecker.js';
export type { HealthCheckerConfig } from './HealthChecker.js';

// Exporters
export {
  ConsoleTraceExporter,
  ConsoleMetricsExporter,
  FileTraceExporter,
  FileMetricsExporter,
} from './exporters/index.js';
export type { FileExporterConfig } from './exporters/index.js';
