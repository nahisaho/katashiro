/**
 * Span Implementation
 *
 * @requirement REQ-OBS-001
 * @design DES-KATASHIRO-003-OBS §3.1.3
 */

import type {
  Span,
  SpanOptions,
  SpanStatus,
  SpanEvent,
  SpanLink,
  TraceRecord,
  AttributeValue,
} from './types.js';

/**
 * スパン実装
 */
export class SpanImpl implements Span {
  readonly traceId: string;
  readonly spanId: string;
  private parentSpanId?: string;
  private name: string;
  private startTime: Date;
  private endTime?: Date;
  private status: SpanStatus = { code: 'OK' };
  private attributes: Record<string, AttributeValue> = {};
  private events: SpanEvent[] = [];
  private links: SpanLink[] = [];

  constructor(name: string, parent?: Span, options?: SpanOptions) {
    this.traceId = parent?.traceId ?? crypto.randomUUID();
    this.spanId = crypto.randomUUID();
    this.parentSpanId = parent?.spanId;
    this.name = name;
    this.startTime = new Date();

    if (options?.attributes) {
      this.attributes = { ...options.attributes };
    }
    if (options?.links) {
      this.links = [...options.links];
    }
  }

  setAttribute(key: string, value: AttributeValue): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Record<string, AttributeValue>): this {
    Object.assign(this.attributes, attributes);
    return this;
  }

  setStatus(status: SpanStatus): this {
    this.status = status;
    return this;
  }

  addEvent(name: string, attributes?: Record<string, AttributeValue>): this {
    this.events.push({
      name,
      timestamp: new Date().toISOString(),
      attributes,
    });
    return this;
  }

  recordException(error: Error): this {
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack ?? '',
    });
    return this;
  }

  end(): void {
    if (!this.endTime) {
      this.endTime = new Date();
    }
  }

  toRecord(): TraceRecord {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime?.toISOString(),
      durationMs: this.endTime
        ? this.endTime.getTime() - this.startTime.getTime()
        : undefined,
      status: this.status,
      attributes: this.attributes,
      events: this.events,
      links: this.links,
    };
  }
}

/**
 * NoOp Span（サンプリングスキップ用）
 */
export class NoopSpan implements Span {
  readonly traceId = '';
  readonly spanId = '';

  setAttribute(): this {
    return this;
  }
  setAttributes(): this {
    return this;
  }
  setStatus(): this {
    return this;
  }
  addEvent(): this {
    return this;
  }
  recordException(): this {
    return this;
  }
  end(): void {}
  toRecord(): TraceRecord {
    return {
      traceId: '',
      spanId: '',
      name: 'noop',
      startTime: new Date().toISOString(),
      status: { code: 'OK' },
      attributes: {},
      events: [],
      links: [],
    };
  }
}
