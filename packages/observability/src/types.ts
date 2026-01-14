/**
 * Observability Types
 *
 * @requirement REQ-OBS-001, REQ-OBS-002
 * @design DES-KATASHIRO-003-OBS §3.1
 */

/**
 * スパンステータス
 */
export type SpanStatus = { code: 'OK' } | { code: 'ERROR'; message: string };

/**
 * 属性値型
 */
export type AttributeValue = string | number | boolean | string[] | number[];

/**
 * スパンイベント
 */
export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, AttributeValue>;
}

/**
 * スパンリンク
 */
export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: Record<string, AttributeValue>;
}

/**
 * トレースレコード
 */
export interface TraceRecord {
  /** トレースID（UUID） */
  traceId: string;
  /** スパンID（UUID） */
  spanId: string;
  /** 親スパンID */
  parentSpanId?: string;
  /** 操作名 */
  name: string;
  /** 開始時刻（ISO8601） */
  startTime: string;
  /** 終了時刻（ISO8601） */
  endTime?: string;
  /** 期間（ミリ秒） */
  durationMs?: number;
  /** ステータス */
  status: SpanStatus;
  /** 属性 */
  attributes: Record<string, AttributeValue>;
  /** イベント */
  events: SpanEvent[];
  /** リンク */
  links: SpanLink[];
}

/**
 * トレースコンテキスト
 */
export interface TraceContext {
  traceId: string;
  currentSpan: Span;
}

/**
 * スパンインターフェース
 */
export interface Span {
  readonly traceId: string;
  readonly spanId: string;

  setAttribute(key: string, value: AttributeValue): this;
  setAttributes(attributes: Record<string, AttributeValue>): this;
  setStatus(status: SpanStatus): this;
  addEvent(name: string, attributes?: Record<string, AttributeValue>): this;
  recordException(error: Error): this;
  end(): void;
  toRecord(): TraceRecord;
}

/**
 * スパン作成オプション
 */
export interface SpanOptions {
  attributes?: Record<string, AttributeValue>;
  links?: SpanLink[];
  recordInput?: boolean;
  recordOutput?: boolean;
}

/**
 * トレーサー設定
 */
export interface TracerConfig {
  serviceName: string;
  serviceVersion: string;
  environment?: string;
  /** サンプリングレート (0.0-1.0) */
  sampling?: number;
  exporters?: TraceExporter[];
}

/**
 * トレースエクスポーターインターフェース
 */
export interface TraceExporter {
  name: string;
  export(record: TraceRecord): Promise<void>;
  shutdown?(): Promise<void>;
}

/**
 * メトリクスエクスポーターインターフェース
 */
export interface MetricsExporter {
  name: string;
  export(snapshot: MetricsSnapshot): Promise<void>;
  shutdown?(): Promise<void>;
}

/**
 * ヒストグラムデータ
 */
export interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
  buckets: Record<string, number>;
}

/**
 * メトリクススナップショット
 */
export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramData>;
}

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<
    string,
    {
      status: 'pass' | 'warn' | 'fail';
      message?: string;
      latencyMs?: number;
    }
  >;
  timestamp: string;
}

/**
 * ヘルスチェック対象
 */
export interface HealthCheck {
  name: string;
  check(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string }>;
  timeout?: number;
}
