/**
 * HistoryViewProvider テスト
 *
 * @task TSK-072
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => import('../mocks/vscode.js'));

import {
  HistoryViewProvider,
  HistoryItem,
} from '../../src/views/history-view-provider.js';

describe('HistoryViewProvider', () => {
  let provider: HistoryViewProvider;

  beforeEach(() => {
    provider = new HistoryViewProvider();
  });

  describe('initialization', () => {
    it('should create provider', () => {
      expect(provider).toBeDefined();
    });

    it('should have empty history initially', () => {
      const all = provider.getAll();
      expect(all.length).toBe(0);
    });
  });

  describe('addEntry', () => {
    it('should add entry', () => {
      const entry = provider.addEntry('search', 'Test Search', 'Details');

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('search');
      expect(entry.title).toBe('Test Search');
      expect(entry.details).toBe('Details');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should add multiple entries in order', () => {
      provider.addEntry('search', 'First');
      provider.addEntry('analysis', 'Second');
      provider.addEntry('summary', 'Third');

      const all = provider.getAll();
      expect(all.length).toBe(3);
      expect(all[0].title).toBe('Third'); // Most recent first
      expect(all[2].title).toBe('First');
    });

    it('should limit to 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        provider.addEntry('search', `Entry ${i}`);
      }

      const all = provider.getAll();
      expect(all.length).toBe(50);
    });
  });

  describe('getEntry', () => {
    it('should get entry by ID', () => {
      const added = provider.addEntry('search', 'Test');
      const found = provider.getEntry(added.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(added.id);
    });

    it('should return undefined for unknown ID', () => {
      const found = provider.getEntry('unknown-id');
      expect(found).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      provider.addEntry('search', 'Test 1');
      provider.addEntry('analysis', 'Test 2');

      provider.clear();

      const all = provider.getAll();
      expect(all.length).toBe(0);
    });
  });

  describe('getChildren', () => {
    it('should return empty array when no history', async () => {
      const children = await provider.getChildren();
      expect(children.length).toBe(0);
    });

    it('should return history items', async () => {
      provider.addEntry('search', 'Search 1');
      provider.addEntry('analysis', 'Analysis 1');

      const children = await provider.getChildren();
      expect(children.length).toBe(2);
    });

    it('should return no children for items', async () => {
      provider.addEntry('search', 'Test');
      const children = await provider.getChildren();
      const itemChildren = await provider.getChildren(children[0]);

      expect(itemChildren.length).toBe(0);
    });
  });
});

describe('HistoryItem', () => {
  it('should create item from entry', () => {
    const entry = {
      id: 'test-id',
      type: 'search' as const,
      title: 'Test Search',
      timestamp: new Date(),
      details: 'Test details',
    };

    const item = new HistoryItem(entry, 0);

    expect(item.entry).toBe(entry);
    expect(item.label).toBe('Test Search');
    expect(item.contextValue).toBe('search');
  });

  it('should set icon based on type', () => {
    const types = ['search', 'analysis', 'summary', 'research', 'report'] as const;

    for (const type of types) {
      const entry = {
        id: `${type}-id`,
        type,
        title: `Test ${type}`,
        timestamp: new Date(),
      };

      const item = new HistoryItem(entry, 0);
      expect(item.iconPath).toBeDefined();
    }
  });
});
