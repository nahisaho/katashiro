/**
 * Tracer Implementation
 *
 * @requirement REQ-OBS-001
 * @design DES-KATASHIRO-003-OBS §3.1.2
 */

import { AsyncLocalStorage } from 'async_hooks';
import type {
  Span,
  SpanOptions,
  TraceContext,
  TraceRecord,
  TracerConfig,
  TraceExporter,
} from './types.js';
import { SpanImpl, NoopSpan } from './Span.js';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: TracerConfig = {
  serviceName: 'katashiro',
  serviceVersion: '2.0.0',
  environment: 'development',
  sampling: 1.0,
};

/**
 * メイントレーサークラス
 */
export class Tracer {
  private static instance: Tracer | null = null;
  private asyncStorage = new AsyncLocalStorage<TraceContext>();
  private exporters: TraceExporter[] = [];
  private config: TracerConfig;

  private constructor(config: TracerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.exporters = config.exporters ?? [];
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(config?: TracerConfig): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer(config ?? DEFAULT_CONFIG);
    }
    return Tracer.instance;
  }

  /**
   * インスタンスリセット（テスト用）
   */
  static resetInstance(): void {
    Tracer.instance = null;
  }

  /**
   * 設定取得
   */
  getConfig(): Readonly<TracerConfig> {
    return this.config;
  }

  /**
   * スパン開始（コールバック方式）
   */
  async startActiveSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    // サンプリング判定
    if (
      this.config.sampling !== undefined &&
      Math.random() > this.config.sampling
    ) {
      return fn(new NoopSpan());
    }

    const parentContext = this.asyncStorage.getStore();
    const span = new SpanImpl(name, parentContext?.currentSpan, options);

    const newContext: TraceContext = {
      traceId: parentContext?.traceId ?? span.traceId,
      currentSpan: span,
    };

    return this.asyncStorage.run(newContext, async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: 'OK' });
        return result;
      } catch (error) {
        span.setStatus({
          code: 'ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
        await this.export(span.toRecord());
      }
    });
  }

  /**
   * 現在のスパン取得
   */
  getCurrentSpan(): Span | undefined {
    return this.asyncStorage.getStore()?.currentSpan;
  }

  /**
   * 現在のトレースID取得
   */
  getCurrentTraceId(): string | undefined {
    return this.asyncStorage.getStore()?.traceId;
  }

  /**
   * エクスポーター追加
   */
  addExporter(exporter: TraceExporter): void {
    this.exporters.push(exporter);
  }

  /**
   * エクスポーター削除
   */
  removeExporter(name: string): boolean {
    const idx = this.exporters.findIndex((e) => e.name === name);
    if (idx >= 0) {
      this.exporters.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * 全エクスポーターシャットダウン
   */
  async shutdown(): Promise<void> {
    await Promise.all(
      this.exporters.map((exp) => exp.shutdown?.().catch(console.error))
    );
  }

  /**
   * トレースエクスポート
   */
  private async export(record: TraceRecord): Promise<void> {
    await Promise.all(
      this.exporters.map((exp) => exp.export(record).catch(console.error))
    );
  }
}

/**
 * グローバルトレーサー取得
 */
export function getGlobalTracer(): Tracer {
  return Tracer.getInstance();
}

/**
 * トレースデコレータ
 *
 * @example
 * class MyService {
 *   @trace('myOperation')
 *   async doSomething() { ... }
 * }
 */
export function trace(name: string, options?: SpanOptions) {
  return function <T>(
    _target: object,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>>
  ): TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (...args: unknown[]): Promise<T> {
      const tracer = getGlobalTracer();
      return tracer.startActiveSpan(
        name,
        async (span) => {
          if (options?.recordInput) {
            span.setAttribute('input', JSON.stringify(args));
          }
          const result = await originalMethod.apply(this, args);
          if (options?.recordOutput) {
            span.setAttribute('output', JSON.stringify(result));
          }
          return result;
        },
        options
      );
    };

    return descriptor;
  };
}
