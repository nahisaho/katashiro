/**
 * ResearchViewProvider テスト
 *
 * @task TSK-072
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => import('../mocks/vscode.js'));

import {
  ResearchViewProvider,
  ResearchItem,
} from '../../src/views/research-view-provider.js';

describe('ResearchViewProvider', () => {
  let provider: ResearchViewProvider;

  beforeEach(() => {
    provider = new ResearchViewProvider();
  });

  describe('initialization', () => {
    it('should create provider', () => {
      expect(provider).toBeDefined();
    });

    it('should have onDidChangeTreeData event', () => {
      expect(provider.onDidChangeTreeData).toBeDefined();
    });
  });

  describe('getChildren', () => {
    it('should return root items', async () => {
      const children = await provider.getChildren();
      expect(children.length).toBe(3);

      const labels = children.map((c) => c.label);
      expect(labels).toContain('New Search');
      expect(labels).toContain('Research Topic');
      expect(labels).toContain('Recent Searches');
    });

    it('should return empty recent searches initially', async () => {
      const root = await provider.getChildren();
      const recentSearches = root.find((r) => r.label === 'Recent Searches');

      expect(recentSearches).toBeDefined();

      const children = await provider.getChildren(recentSearches);
      expect(children.length).toBe(1);
      expect(children[0].label).toBe('No recent searches');
    });
  });

  describe('addSearch', () => {
    it('should add search to recent searches', async () => {
      provider.addSearch('test query');

      const root = await provider.getChildren();
      const recentSearches = root.find((r) => r.label === 'Recent Searches');
      const children = await provider.getChildren(recentSearches);

      expect(children.length).toBe(1);
      expect(children[0].label).toBe('test query');
    });

    it('should limit to 10 recent searches', async () => {
      for (let i = 0; i < 15; i++) {
        provider.addSearch(`query ${i}`);
      }

      const root = await provider.getChildren();
      const recentSearches = root.find((r) => r.label === 'Recent Searches');
      const children = await provider.getChildren(recentSearches);

      expect(children.length).toBe(10);
      expect(children[0].label).toBe('query 14'); // Most recent
    });
  });

  describe('getTreeItem', () => {
    it('should return the item itself', async () => {
      const item = new ResearchItem(
        'Test',
        0 // TreeItemCollapsibleState.None
      );
      const result = provider.getTreeItem(item);
      expect(result).toBe(item);
    });
  });
});

describe('ResearchItem', () => {
  it('should create item with label', () => {
    const item = new ResearchItem('Test Label', 0);
    expect(item.label).toBe('Test Label');
  });

  it('should create item with description', () => {
    const item = new ResearchItem('Test', 0, 'Description');
    expect(item.description).toBe('Description');
  });

  it('should create item with command', () => {
    const command = { command: 'test.command', title: 'Test' };
    const item = new ResearchItem('Test', 0, '', command);
    expect(item.command).toBe(command);
  });
});
