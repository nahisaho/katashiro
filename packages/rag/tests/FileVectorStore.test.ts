/**
 * FileVectorStore Tests
 *
 * @requirement REQ-RAG-102
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { FileVectorStore } from '../src/vectordb/FileVectorStore.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Chunk, Vector } from '../src/types.js';

describe('FileVectorStore', () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // テスト用一時ディレクトリを作成
    testDir = path.join(os.tmpdir(), `katashiro-test-${Date.now()}`);
    testFilePath = path.join(testDir, 'vectors.json');
  });

  afterAll(async () => {
    // テストディレクトリをクリーンアップ
    try {
      if (testDir && fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  // テストヘルパー
  function createChunk(id: string, content: string): Chunk {
    return {
      id,
      documentId: `doc-${id}`,
      content,
      metadata: { source: 'test' },
    };
  }

  function createVector(values: number[]): Vector {
    return values;
  }

  // 正規化されたベクトルを生成
  function normalizeVector(v: number[]): Vector {
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map((x) => x / norm);
  }

  describe('initialization', () => {
    it('should create store with file path', () => {
      const store = new FileVectorStore({ filePath: testFilePath });

      expect(store.name).toBe('file');
      expect(store.size).toBe(0);
    });

    it('should initialize from empty state', async () => {
      const store = new FileVectorStore({ filePath: testFilePath });
      await store.init();

      expect(store.size).toBe(0);
    });

    it('should use default configuration values', () => {
      const store = new FileVectorStore({ filePath: testFilePath });

      expect(store.getFilePath()).toBe(testFilePath);
    });
  });

  describe('add', () => {
    it('should add chunk and vector', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      const chunk = createChunk('chunk1', 'Hello world');
      const vector = createVector([0.1, 0.2, 0.3]);

      await store.add(chunk, vector);

      expect(store.size).toBe(1);
      expect(await store.has('chunk1')).toBe(true);
    });

    it('should mark store as dirty after add', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      expect(store.dirty).toBe(false);

      await store.add(createChunk('chunk1', 'Hello'), [0.1, 0.2]);

      expect(store.dirty).toBe(true);
    });
  });

  describe('addBatch', () => {
    it('should add multiple items at once', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      await store.addBatch([
        { chunk: createChunk('c1', 'Content 1'), vector: [0.1, 0.2] },
        { chunk: createChunk('c2', 'Content 2'), vector: [0.3, 0.4] },
        { chunk: createChunk('c3', 'Content 3'), vector: [0.5, 0.6] },
      ]);

      expect(store.size).toBe(3);
    });
  });

  describe('search', () => {
    it('should search for similar vectors', async () => {
      const store = new FileVectorStore({
        filePath: testFilePath,
        autoSave: false,
        similarityThreshold: 0.5,
      });
      await store.init();

      // 正規化されたベクトルを使用
      const v1 = normalizeVector([1, 0, 0]);
      const v2 = normalizeVector([0, 1, 0]);
      const v3 = normalizeVector([0.9, 0.1, 0]);

      await store.addBatch([
        { chunk: createChunk('c1', 'Content 1'), vector: v1 },
        { chunk: createChunk('c2', 'Content 2'), vector: v2 },
        { chunk: createChunk('c3', 'Content 3'), vector: v3 },
      ]);

      const queryVector = normalizeVector([1, 0, 0]);
      const results = await store.search(queryVector, 2);

      expect(results.length).toBe(2);
      expect(results[0]!.chunk.id).toBe('c1'); // 完全一致
      expect(results[0]!.score).toBeCloseTo(1.0, 5);
    });

    it('should return empty for no matches', async () => {
      const store = new FileVectorStore({
        filePath: testFilePath,
        autoSave: false,
        similarityThreshold: 0.9,
      });
      await store.init();

      const v1 = normalizeVector([1, 0, 0]);
      await store.add(createChunk('c1', 'Content 1'), v1);

      const queryVector = normalizeVector([0, 1, 0]); // 直交ベクトル
      const results = await store.search(queryVector, 10);

      expect(results.length).toBe(0);
    });

    it('should respect topK limit', async () => {
      const store = new FileVectorStore({
        filePath: testFilePath,
        autoSave: false,
        similarityThreshold: 0.0,
      });
      await store.init();

      for (let i = 0; i < 10; i++) {
        await store.add(
          createChunk(`c${i}`, `Content ${i}`),
          normalizeVector([i, i + 1, i + 2]),
        );
      }

      const results = await store.search(normalizeVector([5, 6, 7]), 3);

      expect(results.length).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete existing chunk', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      await store.add(createChunk('c1', 'Content 1'), [0.1, 0.2]);

      const result = await store.delete('c1');

      expect(result).toBe(true);
      expect(store.size).toBe(0);
    });

    it('should return false for non-existent chunk', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      const result = await store.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      await store.addBatch([
        { chunk: createChunk('c1', 'Content 1'), vector: [0.1, 0.2] },
        { chunk: createChunk('c2', 'Content 2'), vector: [0.3, 0.4] },
      ]);

      expect(store.size).toBe(2);

      await store.clear();

      expect(store.size).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should save and load data', async () => {
      // 最初のストアでデータを保存
      const store1 = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store1.init();

      await store1.add(createChunk('c1', 'Persistent content'), [0.1, 0.2, 0.3]);
      await store1.save();
      await store1.close();

      // ファイルが存在することを確認
      expect(fs.existsSync(testFilePath)).toBe(true);

      // 新しいストアでデータを読み込み
      const store2 = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store2.init();

      expect(store2.size).toBe(1);
      expect(await store2.has('c1')).toBe(true);

      await store2.close();
    });

    it('should preserve data structure on save', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      const chunk = createChunk('c1', 'Test content');
      chunk.metadata = { key: 'value', number: 42 };
      await store.add(chunk, [0.1, 0.2, 0.3]);
      await store.save();

      // ファイルを直接読み込んで確認
      const data = JSON.parse(await fs.promises.readFile(testFilePath, 'utf-8'));

      expect(data.version).toBe('1.0.0');
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].chunk.metadata).toEqual({ key: 'value', number: 42 });

      await store.close();
    });

    it('should create directory if not exists', async () => {
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'vectors.json');
      const store = new FileVectorStore({ filePath: deepPath, autoSave: false });
      await store.init();

      await store.add(createChunk('c1', 'Content'), [0.1]);
      await store.save();

      expect(fs.existsSync(deepPath)).toBe(true);

      await store.close();
    });

    it('should handle corrupted file gracefully', async () => {
      // 壊れたファイルを作成
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(testFilePath, 'not valid json', 'utf-8');

      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      // 空の状態で開始
      expect(store.size).toBe(0);

      await store.close();
    });

    it('should mark as not dirty after save', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      await store.add(createChunk('c1', 'Content'), [0.1]);
      expect(store.dirty).toBe(true);

      await store.save();
      expect(store.dirty).toBe(false);

      await store.close();
    });
  });

  describe('close', () => {
    it('should save pending changes on close', async () => {
      const store = new FileVectorStore({ filePath: testFilePath, autoSave: false });
      await store.init();

      await store.add(createChunk('c1', 'Content'), [0.1]);
      expect(store.dirty).toBe(true);

      await store.close();

      // ファイルが保存されていることを確認
      expect(fs.existsSync(testFilePath)).toBe(true);
    });
  });

  describe('vector operations', () => {
    it('should throw on dimension mismatch', async () => {
      const store = new FileVectorStore({
        filePath: testFilePath,
        autoSave: false,
        similarityThreshold: 0,
      });
      await store.init();

      await store.add(createChunk('c1', 'Content'), [0.1, 0.2, 0.3]);

      await expect(store.search([0.1, 0.2], 10)).rejects.toThrow('Vector dimension mismatch');

      await store.close();
    });
  });
});
