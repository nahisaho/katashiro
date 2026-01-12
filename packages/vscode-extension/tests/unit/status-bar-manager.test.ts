/**
 * StatusBarManager テスト
 *
 * @task TSK-073
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => import('../mocks/vscode.js'));

import { StatusBarManager } from '../../src/ui/status-bar-manager.js';

describe('StatusBarManager', () => {
  let manager: StatusBarManager;

  beforeEach(() => {
    manager = new StatusBarManager();
  });

  describe('initialization', () => {
    it('should create manager', () => {
      expect(manager).toBeDefined();
    });

    it('should start in idle state', () => {
      expect(manager.getState()).toBe('idle');
    });
  });

  describe('show/hide', () => {
    it('should show status bar', () => {
      expect(() => manager.show()).not.toThrow();
    });

    it('should hide status bar', () => {
      expect(() => manager.hide()).not.toThrow();
    });
  });

  describe('setIdle', () => {
    it('should set idle state', () => {
      manager.setWorking();
      manager.setIdle();
      expect(manager.getState()).toBe('idle');
    });

    it('should set idle with custom message', () => {
      manager.setIdle('Custom message');
      expect(manager.getState()).toBe('idle');
    });
  });

  describe('setWorking', () => {
    it('should set working state', () => {
      manager.setWorking();
      expect(manager.getState()).toBe('working');
    });

    it('should set working with message', () => {
      manager.setWorking('Processing...');
      expect(manager.getState()).toBe('working');
    });
  });

  describe('setSuccess', () => {
    it('should set success state', () => {
      manager.setSuccess('Complete', 0);
      expect(manager.getState()).toBe('success');
    });

    it('should auto-reset to idle', async () => {
      manager.setSuccess('Done', 100);
      expect(manager.getState()).toBe('success');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(manager.getState()).toBe('idle');
    });
  });

  describe('setError', () => {
    it('should set error state', () => {
      manager.setError('Failed', 0);
      expect(manager.getState()).toBe('error');
    });

    it('should auto-reset to idle', async () => {
      manager.setError('Error', 100);
      expect(manager.getState()).toBe('error');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(manager.getState()).toBe('idle');
    });
  });

  describe('dispose', () => {
    it('should dispose manager', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
