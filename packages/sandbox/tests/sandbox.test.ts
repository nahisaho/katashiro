/**
 * Sandbox Factory Tests
 *
 * @fileoverview REQ-007: SandboxFactoryのテスト
 */

import { describe, it, expect } from 'vitest';
import { SandboxFactory, executeCode, executeBash, executePython, executeJavaScript } from '../src/sandbox';
import { LocalExecutor } from '../src/local-executor';

describe('SandboxFactory', () => {
  describe('create', () => {
    it('should create LocalExecutor for local runtime', () => {
      const sandbox = SandboxFactory.create({}, 'local');

      expect(sandbox).toBeInstanceOf(LocalExecutor);
    });

    it('should throw for unsupported wasm runtime', () => {
      expect(() => SandboxFactory.create({}, 'wasm')).toThrow('WASM runtime is not yet implemented');
    });
  });

  describe('isDockerAvailable', () => {
    it('should return boolean', async () => {
      const available = await SandboxFactory.isDockerAvailable();

      expect(typeof available).toBe('boolean');
    });
  });

  describe('autoDetect', () => {
    it('should return a valid runtime', async () => {
      const runtime = await SandboxFactory.autoDetect();

      expect(['docker', 'local']).toContain(runtime);
    });
  });
});

describe('Convenience Functions', () => {
  describe('executeCode', () => {
    it('should execute bash code', async () => {
      const result = await executeCode('echo "test"', 'bash', { runtime: 'local' });

      if (result.isErr()) {
        console.error('Error:', result.error);
      }
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('test');
      }
    });
  });

  describe('executeBash', () => {
    it('should execute bash script', async () => {
      const result = await executeBash('echo "hello bash"');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('hello bash');
      }
    });
  });

  describe('executeJavaScript', () => {
    it('should execute JavaScript code', async () => {
      const result = await executeJavaScript('console.log(JSON.stringify({ a: 1 }))');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('{"a":1}');
      }
    });
  });

  describe('executePython', () => {
    it('should execute Python code', async () => {
      const result = await executePython('print(2 ** 10)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout.trim()).toBe('1024');
      }
    });

    it('should handle Python errors', async () => {
      const result = await executePython('raise ValueError("test error")');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('failed');
        expect(result.value.stderr).toContain('ValueError');
      }
    });
  });
});
