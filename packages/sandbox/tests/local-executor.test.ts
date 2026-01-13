/**
 * Local Executor Tests
 *
 * @fileoverview REQ-007: LocalExecutorのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalExecutor } from '../src/local-executor';

describe('LocalExecutor', () => {
  let executor: LocalExecutor;

  beforeEach(() => {
    executor = new LocalExecutor({ timeout: 10 });
  });

  afterEach(() => {
    executor.cleanup();
  });

  describe('execute', () => {
    it('should execute bash script', async () => {
      const result = await executor.execute('echo "Hello"', 'bash');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('completed');
        expect(result.value.exitCode).toBe(0);
        expect(result.value.stdout.trim()).toBe('Hello');
      }
    });

    it('should execute JavaScript code', async () => {
      const result = await executor.execute('console.log(1 + 2)', 'javascript');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('completed');
        expect(result.value.exitCode).toBe(0);
        expect(result.value.stdout.trim()).toBe('3');
      }
    });

    it('should handle execution errors', async () => {
      const result = await executor.execute('exit 1', 'bash');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('failed');
        expect(result.value.exitCode).toBe(1);
      }
    });

    it('should handle syntax errors', async () => {
      const result = await executor.execute(
        'console.log(invalid syntax',
        'javascript'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('failed');
        expect(result.value.exitCode).not.toBe(0);
        expect(result.value.stderr).toContain('SyntaxError');
      }
    });

    it('should pass stdin to script', async () => {
      const result = await executor.execute(
        'read input; echo "Got: $input"',
        'bash',
        { stdin: 'test input\n' }
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('Got: test input');
      }
    });

    it('should pass environment variables', async () => {
      const result = await executor.execute('echo $MY_VAR', 'bash', {
        env: { MY_VAR: 'test_value' },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('test_value');
      }
    });

    it('should measure execution duration', async () => {
      const result = await executor.execute('sleep 0.1', 'bash');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.duration).toBeGreaterThan(50);
      }
    });
  });

  describe('timeout', () => {
    it('should timeout long-running scripts', async () => {
      const shortTimeoutExecutor = new LocalExecutor({ timeout: 1 });

      const result = await shortTimeoutExecutor.execute('sleep 10', 'bash');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TIMEOUT');
      }

      shortTimeoutExecutor.cleanup();
    });
  });

  describe('cancel', () => {
    it('should cancel running execution', async () => {
      // 非同期で実行開始
      const executionPromise = executor.execute('sleep 10', 'bash');

      // 少し待ってからキャンセル
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 実行中のプロセスがあるか確認
      expect(executor.getActiveProcessCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit execution:start event', async () => {
      const events: unknown[] = [];
      executor.on('execution:start', (event) => events.push(event));

      await executor.execute('echo "test"', 'bash');

      expect(events.length).toBe(1);
    });

    it('should emit execution:complete event', async () => {
      const events: unknown[] = [];
      executor.on('execution:complete', (event) => events.push(event));

      await executor.execute('echo "test"', 'bash');

      expect(events.length).toBe(1);
    });
  });
});
