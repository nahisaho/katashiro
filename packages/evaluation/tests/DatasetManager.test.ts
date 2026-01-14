/**
 * DatasetManager Tests
 *
 * @design DES-KATASHIRO-003-EVAL §3.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DatasetManager,
  getDatasetManager,
  resetDatasetManager,
} from '../src/DatasetManager.js';

describe('DatasetManager', () => {
  beforeEach(() => {
    resetDatasetManager();
  });

  describe('create and get', () => {
    it('should create a new dataset', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test Dataset', {
        description: 'Test description',
        tags: ['test', 'sample'],
      });

      expect(ds.id).toBeTruthy();
      expect(ds.name).toBe('Test Dataset');
      expect(ds.description).toBe('Test description');
      expect(ds.tags).toContain('test');
      expect(ds.size).toBe(0);
    });

    it('should get dataset by id', () => {
      const mgr = new DatasetManager();
      const created = mgr.create('Test');
      const retrieved = mgr.get(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent dataset', () => {
      const mgr = new DatasetManager();
      expect(mgr.get('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all datasets', () => {
      const mgr = new DatasetManager();
      mgr.create('Dataset 1');
      mgr.create('Dataset 2');
      mgr.create('Dataset 3');

      const list = mgr.list();
      expect(list).toHaveLength(3);
    });

    it('should filter by tags', () => {
      const mgr = new DatasetManager();
      mgr.create('Dataset 1', { tags: ['test'] });
      mgr.create('Dataset 2', { tags: ['prod'] });
      mgr.create('Dataset 3', { tags: ['test', 'sample'] });

      const filtered = mgr.list({ tags: ['test'] });
      expect(filtered).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete a dataset', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test');
      
      expect(mgr.delete(ds.id)).toBe(true);
      expect(mgr.get(ds.id)).toBeUndefined();
    });

    it('should return false for non-existent dataset', () => {
      const mgr = new DatasetManager();
      expect(mgr.delete('non-existent')).toBe(false);
    });
  });

  describe('items', () => {
    it('should add items to dataset', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test');

      const item = mgr.addItem(ds.id, {
        input: 'What is AI?',
        expected: 'AI is artificial intelligence.',
        metadata: { category: 'science' },
      });

      expect(item?.id).toBeTruthy();
      expect(item?.input).toBe('What is AI?');
      expect(mgr.get(ds.id)?.size).toBe(1);
    });

    it('should add multiple items', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test');

      const items = mgr.addItems(ds.id, [
        { input: 'Q1', expected: 'A1' },
        { input: 'Q2', expected: 'A2' },
        { input: 'Q3', expected: 'A3' },
      ]);

      expect(items).toHaveLength(3);
      expect(mgr.get(ds.id)?.size).toBe(3);
    });

    it('should get items from dataset', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test');

      mgr.addItem(ds.id, { input: 'Q1', expected: 'A1' });
      mgr.addItem(ds.id, { input: 'Q2', expected: 'A2' });

      const items = mgr.getItems(ds.id);
      expect(items).toHaveLength(2);
      expect(items[0].input).toBe('Q1');
    });

    it('should remove item from dataset', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test');

      const item = mgr.addItem(ds.id, { input: 'Q1', expected: 'A1' });
      mgr.addItem(ds.id, { input: 'Q2', expected: 'A2' });

      expect(mgr.removeItem(ds.id, item!.id)).toBe(true);
      expect(mgr.getItems(ds.id)).toHaveLength(1);
      expect(mgr.get(ds.id)?.size).toBe(1);
    });
  });

  describe('export and import', () => {
    it('should export dataset to JSON', () => {
      const mgr = new DatasetManager();
      const ds = mgr.create('Test', { description: 'Export test' });
      mgr.addItem(ds.id, { input: 'Q1', expected: 'A1' });

      const json = mgr.export(ds.id);
      expect(json).toBeTruthy();

      const parsed = JSON.parse(json!);
      expect(parsed.dataset.name).toBe('Test');
      expect(parsed.items).toHaveLength(1);
    });

    it('should import dataset from JSON', () => {
      const mgr = new DatasetManager();
      const original = mgr.create('Original');
      mgr.addItem(original.id, { input: 'Q1', expected: 'A1' });
      mgr.addItem(original.id, { input: 'Q2', expected: 'A2' });

      const json = mgr.export(original.id)!;
      
      // 新しいマネージャーにインポート
      const mgr2 = new DatasetManager();
      const imported = mgr2.import(json);

      expect(imported).toBeTruthy();
      expect(imported!.name).toBe('Original');
      expect(imported!.id).not.toBe(original.id); // 新しいIDが生成される
      expect(mgr2.getItems(imported!.id)).toHaveLength(2);
    });

    it('should return undefined for invalid JSON', () => {
      const mgr = new DatasetManager();
      expect(mgr.import('invalid json')).toBeUndefined();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const mgr1 = getDatasetManager();
      const mgr2 = getDatasetManager();
      expect(mgr1).toBe(mgr2);
    });

    it('should reset singleton', () => {
      const mgr1 = getDatasetManager();
      mgr1.create('Test');

      resetDatasetManager();

      const mgr2 = getDatasetManager();
      expect(mgr2).not.toBe(mgr1);
      expect(mgr2.list()).toHaveLength(0);
    });
  });
});
