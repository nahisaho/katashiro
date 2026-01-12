/**
 * OutputChannelManager テスト
 *
 * @task TSK-073
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => import('../mocks/vscode.js'));

import { OutputChannelManager } from '../../src/ui/output-channel-manager.js';

describe('OutputChannelManager', () => {
  let manager: OutputChannelManager;

  beforeEach(() => {
    manager = new OutputChannelManager('Test');
  });

  describe('initialization', () => {
    it('should create manager', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('log', () => {
    it('should log info message', () => {
      expect(() => manager.log('Test message')).not.toThrow();
    });

    it('should log with different levels', () => {
      expect(() => manager.log('Info', 'info')).not.toThrow();
      expect(() => manager.log('Warn', 'warn')).not.toThrow();
      expect(() => manager.log('Error', 'error')).not.toThrow();
      expect(() => manager.log('Debug', 'debug')).not.toThrow();
    });
  });

  describe('convenience methods', () => {
    it('should have info method', () => {
      expect(() => manager.info('Info message')).not.toThrow();
    });

    it('should have warn method', () => {
      expect(() => manager.warn('Warning message')).not.toThrow();
    });

    it('should have error method', () => {
      expect(() => manager.error('Error message')).not.toThrow();
    });

    it('should have debug method', () => {
      expect(() => manager.debug('Debug message')).not.toThrow();
    });
  });

  describe('show', () => {
    it('should show channel', () => {
      expect(() => manager.show()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear channel', () => {
      expect(() => manager.clear()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should dispose channel', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
