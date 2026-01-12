/**
 * KnowledgeViewProvider テスト
 *
 * @task TSK-072
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => import('../mocks/vscode.js'));

import {
  KnowledgeViewProvider,
  KnowledgeItem,
} from '../../src/views/knowledge-view-provider.js';

describe('KnowledgeViewProvider', () => {
  let provider: KnowledgeViewProvider;

  beforeEach(() => {
    provider = new KnowledgeViewProvider();
  });

  describe('initialization', () => {
    it('should create provider', () => {
      expect(provider).toBeDefined();
    });

    it('should have empty stats initially', () => {
      const stats = provider.getStats();
      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
    });
  });

  describe('getChildren', () => {
    it('should return root categories', async () => {
      const children = await provider.getChildren();
      expect(children.length).toBe(3);

      const labels = children.map((c) => c.label);
      expect(labels).toContain('Nodes');
      expect(labels).toContain('Edges');
      expect(labels).toContain('Actions');
    });

    it('should return empty nodes message initially', async () => {
      const root = await provider.getChildren();
      const nodes = root.find((r) => r.label === 'Nodes');
      const children = await provider.getChildren(nodes);

      expect(children.length).toBe(1);
      expect(children[0].label).toBe('No nodes yet');
    });
  });

  describe('addNode', () => {
    it('should add node', async () => {
      provider.addNode('node-1', 'Test Node', 'entity');

      const stats = provider.getStats();
      expect(stats.nodes).toBe(1);

      const root = await provider.getChildren();
      const nodes = root.find((r) => r.label === 'Nodes');
      const children = await provider.getChildren(nodes);

      expect(children.length).toBe(1);
      expect(children[0].label).toBe('Test Node');
    });
  });

  describe('addEdge', () => {
    it('should add edge', async () => {
      provider.addEdge('node-1', 'node-2', 'relates_to');

      const stats = provider.getStats();
      expect(stats.edges).toBe(1);

      const root = await provider.getChildren();
      const edges = root.find((r) => r.label === 'Edges');
      const children = await provider.getChildren(edges);

      expect(children.length).toBe(1);
      expect(children[0].label).toBe('node-1 → node-2');
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      provider.addNode('node-1', 'Node 1', 'entity');
      provider.addEdge('node-1', 'node-2', 'relates_to');

      provider.clear();

      const stats = provider.getStats();
      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
    });
  });
});

describe('KnowledgeItem', () => {
  it('should create item with type', () => {
    const item = new KnowledgeItem('Test', 0, 'node');
    expect(item.label).toBe('Test');
    expect(item.itemType).toBe('node');
    expect(item.contextValue).toBe('node');
  });

  it('should set icon based on type', () => {
    const nodeItem = new KnowledgeItem('Node', 0, 'node');
    const edgeItem = new KnowledgeItem('Edge', 0, 'edge');
    const categoryItem = new KnowledgeItem('Category', 0, 'category');

    expect(nodeItem.iconPath).toBeDefined();
    expect(edgeItem.iconPath).toBeDefined();
    expect(categoryItem.iconPath).toBeDefined();
  });
});
