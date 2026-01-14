/**
 * Console Exporter Implementation
 *
 * @requirement REQ-OBS-001, REQ-OBS-002
 * @design DES-KATASHIRO-003-OBS §3.5
 */

import type {
  TraceExporter,
  TraceRecord,
  MetricsExporter,
  MetricsSnapshot,
  HistogramData,
} from '../types.js';

/**
 * コンソールトレースエクスポーター
 */
export class ConsoleTraceExporter implements TraceExporter {
  readonly name = 'console';

  async export(record: TraceRecord): Promise<void> {
    const prefix = record.status.code === 'ERROR' ? '❌' : '✅';
    const duration = record.durationMs ? `${record.durationMs}ms` : 'ongoing';

    console.log(
      `${prefix} [TRACE] ${record.name} (${duration}) traceId=${record.traceId.slice(0, 8)}`
    );

    if (record.status.code === 'ERROR') {
      console.error(`   Error: ${record.status.message}`);
    }

    if (Object.keys(record.attributes).length > 0) {
      console.log(`   Attributes:`, record.attributes);
    }

    for (const event of record.events) {
      console.log(`   Event: ${event.name} at ${event.timestamp}`);
    }
  }

  async shutdown(): Promise<void> {
    // No-op for console
  }
}

/**
 * コンソールメトリクスエクスポーター
 */
export class ConsoleMetricsExporter implements MetricsExporter {
  readonly name = 'console';

  async export(snapshot: MetricsSnapshot): Promise<void> {
    console.log(`\n📊 [METRICS] ${snapshot.timestamp}`);

    if (Object.keys(snapshot.counters).length > 0) {
      console.log('   Counters:');
      for (const [key, value] of Object.entries(snapshot.counters)) {
        console.log(`     ${key}: ${value}`);
      }
    }

    if (Object.keys(snapshot.gauges).length > 0) {
      console.log('   Gauges:');
      for (const [key, value] of Object.entries(snapshot.gauges)) {
        console.log(`     ${key}: ${value}`);
      }
    }

    if (Object.keys(snapshot.histograms).length > 0) {
      console.log('   Histograms:');
      for (const [key, data] of Object.entries(snapshot.histograms) as [string, HistogramData][]) {
        console.log(
          `     ${key}: count=${data.count} avg=${data.avg.toFixed(2)} p50=${data.p50} p99=${data.p99}`
        );
      }
    }
  }

  async shutdown(): Promise<void> {
    // No-op for console
  }
}
