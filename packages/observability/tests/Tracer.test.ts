/**
 * Tracer Tests
 *
 * @design DES-KATASHIRO-003-OBS §8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tracer, getGlobalTracer } from '../src/Tracer.js';
import type { TraceExporter, TraceRecord } from '../src/types.js';

describe('Tracer', () => {
  beforeEach(() => {
    Tracer.resetInstance();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返す', () => {
      const tracer1 = Tracer.getInstance();
      const tracer2 = Tracer.getInstance();
      expect(tracer1).toBe(tracer2);
    });

    it('カスタム設定でインスタンス作成', () => {
      const tracer = Tracer.getInstance({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
      });
      const config = tracer.getConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.serviceVersion).toBe('1.0.0');
      expect(config.environment).toBe('test');
    });
  });

  describe('getGlobalTracer', () => {
    it('グローバルトレーサーを返す', () => {
      const tracer = getGlobalTracer();
      expect(tracer).toBeInstanceOf(Tracer);
    });
  });

  describe('startActiveSpan', () => {
    it('スパンを作成して関数を実行', async () => {
      const tracer = Tracer.getInstance();
      let capturedSpan: unknown = null;

      const result = await tracer.startActiveSpan('test-operation', async (span) => {
        capturedSpan = span;
        return 'success';
      });

      expect(result).toBe('success');
      expect(capturedSpan).toBeDefined();
    });

    it('エラー時にスパンにエラーを記録', async () => {
      const tracer = Tracer.getInstance();

      await expect(
        tracer.startActiveSpan('failing-operation', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('エクスポーターにトレースを送信', async () => {
      const mockExporter: TraceExporter = {
        name: 'mock',
        export: vi.fn().mockResolvedValue(undefined),
      };

      const tracer = Tracer.getInstance({ serviceName: 'test', serviceVersion: '1.0.0' });
      tracer.addExporter(mockExporter);

      await tracer.startActiveSpan('test-operation', async () => {
        return 'done';
      });

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      const record = (mockExporter.export as ReturnType<typeof vi.fn>).mock.calls[0][0] as TraceRecord;
      expect(record.name).toBe('test-operation');
      expect(record.status.code).toBe('OK');
    });

    it('ネストしたスパンで親子関係を維持', async () => {
      const records: TraceRecord[] = [];
      const mockExporter: TraceExporter = {
        name: 'mock',
        export: vi.fn().mockImplementation(async (record: TraceRecord) => {
          records.push(record);
        }),
      };

      const tracer = Tracer.getInstance({ serviceName: 'test', serviceVersion: '1.0.0' });
      tracer.addExporter(mockExporter);

      await tracer.startActiveSpan('parent', async () => {
        await tracer.startActiveSpan('child', async () => {
          return 'child-result';
        });
        return 'parent-result';
      });

      expect(records).toHaveLength(2);
      const childRecord = records.find((r) => r.name === 'child');
      const parentRecord = records.find((r) => r.name === 'parent');

      expect(childRecord?.parentSpanId).toBe(parentRecord?.spanId);
      expect(childRecord?.traceId).toBe(parentRecord?.traceId);
    });

    it('サンプリングレート0でNoopSpanを使用', async () => {
      const mockExporter: TraceExporter = {
        name: 'mock',
        export: vi.fn().mockResolvedValue(undefined),
      };

      Tracer.resetInstance();
      const tracer = Tracer.getInstance({
        serviceName: 'test',
        serviceVersion: '1.0.0',
        sampling: 0,
      });
      tracer.addExporter(mockExporter);

      await tracer.startActiveSpan('sampled-out', async (span) => {
        expect(span.traceId).toBe('');
        return 'done';
      });

      // NoopSpanはエクスポートされない（実装によるが空のrecordがエクスポートされる）
    });
  });

  describe('getCurrentSpan', () => {
    it('アクティブスパン外ではundefined', () => {
      const tracer = Tracer.getInstance();
      expect(tracer.getCurrentSpan()).toBeUndefined();
    });

    it('アクティブスパン内で現在のスパンを返す', async () => {
      const tracer = Tracer.getInstance();

      await tracer.startActiveSpan('outer', async (outerSpan) => {
        const current = tracer.getCurrentSpan();
        expect(current).toBe(outerSpan);
      });
    });
  });

  describe('removeExporter', () => {
    it('エクスポーターを削除', () => {
      const tracer = Tracer.getInstance();
      const exporter: TraceExporter = {
        name: 'test-exporter',
        export: vi.fn().mockResolvedValue(undefined),
      };

      tracer.addExporter(exporter);
      const removed = tracer.removeExporter('test-exporter');
      expect(removed).toBe(true);

      const notFound = tracer.removeExporter('non-existent');
      expect(notFound).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('全エクスポーターをシャットダウン', async () => {
      const tracer = Tracer.getInstance();
      const exporter: TraceExporter = {
        name: 'test-exporter',
        export: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      tracer.addExporter(exporter);
      await tracer.shutdown();

      expect(exporter.shutdown).toHaveBeenCalledTimes(1);
    });
  });
});
