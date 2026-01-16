/**
 * ContentManager 単体テスト
 *
 * @requirement REQ-DR-S-001 - チェックポイント保存
 * @requirement REQ-DR-S-003 - キャッシュサイズ管理
 * @requirement REQ-DR-E-005 - キャッシュヒット時の高速応答
 * @task TASK-030
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import {
  ContentCache,
  VersionControl,
  CheckpointManager,
  CheckpointError,
  ContentManager,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CHECKPOINT_CONFIG,
  DEFAULT_CONTENT_MANAGER_CONFIG,
  type ContentEntry,
  type ContentVersion,
} from '../../src/content/index.js';

// テスト用チェックポイントディレクトリ
const TEST_CHECKPOINT_DIR = '.test-checkpoints';

describe('DEFAULT_CACHE_CONFIG', () => {
  it('should have maxSizeBytes = 500MB', () => {
    expect(DEFAULT_CACHE_CONFIG.maxSizeBytes).toBe(500 * 1024 * 1024);
  });

  it('should have maxEntries = 1000', () => {
    expect(DEFAULT_CACHE_CONFIG.maxEntries).toBe(1000);
  });

  it('should have defaultTtlMs = 24 hours', () => {
    expect(DEFAULT_CACHE_CONFIG.defaultTtlMs).toBe(24 * 60 * 60 * 1000);
  });

  it('should have minRetainEntries = 100', () => {
    expect(DEFAULT_CACHE_CONFIG.minRetainEntries).toBe(100);
  });
});

describe('DEFAULT_CHECKPOINT_CONFIG', () => {
  it('should have enabled = true', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.enabled).toBe(true);
  });

  it('should have intervalMs = 1 minute', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.intervalMs).toBe(60 * 1000);
  });

  it('should have maxCheckpoints = 10', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.maxCheckpoints).toBe(10);
  });
});

describe('ContentCache', () => {
  let cache: ContentCache;

  beforeEach(() => {
    cache = new ContentCache({
      maxSizeBytes: 10000,
      maxEntries: 5,
      minRetainEntries: 1,
      defaultTtlMs: 60000,
    });
  });

  describe('get/set', () => {
    it('should set and get content entry', () => {
      const entry = createTestEntry('https://example.com', 'Hello World');
      cache.set(entry);

      const retrieved = cache.get('https://example.com');
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Hello World');
    });

    it('should return undefined for non-existent entry', () => {
      const retrieved = cache.get('https://nonexistent.com');
      expect(retrieved).toBeUndefined();
    });

    it('should update access count on get', () => {
      const entry = createTestEntry('https://example.com', 'Content');
      cache.set(entry);

      cache.get('https://example.com');
      cache.get('https://example.com');

      const retrieved = cache.get('https://example.com');
      expect(retrieved?.accessCount).toBeGreaterThan(1);
    });
  });

  describe('has', () => {
    it('should return true for existing entry', () => {
      cache.set(createTestEntry('https://example.com', 'Content'));
      expect(cache.has('https://example.com')).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cache.has('https://nonexistent.com')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing entry', () => {
      cache.set(createTestEntry('https://example.com', 'Content'));
      const deleted = cache.delete('https://example.com');

      expect(deleted).toBe(true);
      expect(cache.has('https://example.com')).toBe(false);
    });

    it('should return false for non-existent entry', () => {
      const deleted = cache.delete('https://nonexistent.com');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set(createTestEntry('https://a.com', 'A'));
      cache.set(createTestEntry('https://b.com', 'B'));

      cache.clear();

      expect(cache.has('https://a.com')).toBe(false);
      expect(cache.has('https://b.com')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should track hit and miss counts', () => {
      cache.set(createTestEntry('https://example.com', 'Content'));

      cache.get('https://example.com'); // hit
      cache.get('https://nonexistent.com'); // miss

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('LRU eviction', () => {
    it('should evict entries when maxEntries exceeded', () => {
      // 5エントリまで
      for (let i = 0; i < 6; i++) {
        cache.set(createTestEntry(`https://example${i}.com`, `Content ${i}`));
      }

      const stats = cache.getStats();
      expect(stats.entryCount).toBeLessThanOrEqual(5);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new ContentCache({
        defaultTtlMs: 50,
      });

      shortTtlCache.set(createTestEntry('https://example.com', 'Content'));

      // 待機
      await new Promise((resolve) => setTimeout(resolve, 100));

      const retrieved = shortTtlCache.get('https://example.com');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('events', () => {
    it('should emit cache:hit event', () => {
      const events: string[] = [];
      cache.addEventListener((event) => events.push(event.type));

      cache.set(createTestEntry('https://example.com', 'Content'));
      cache.get('https://example.com');

      expect(events).toContain('cache:hit');
    });

    it('should emit cache:miss event', () => {
      const events: string[] = [];
      cache.addEventListener((event) => events.push(event.type));

      cache.get('https://nonexistent.com');

      expect(events).toContain('cache:miss');
    });
  });
});

describe('VersionControl', () => {
  let vc: VersionControl;

  beforeEach(() => {
    vc = new VersionControl({ maxVersionHistory: 3, diffThreshold: 0.1 });
  });

  describe('calculateHash', () => {
    it('should calculate consistent hash', () => {
      const hash1 = vc.calculateHash('Hello World');
      const hash2 = vc.calculateHash('Hello World');
      expect(hash1).toBe(hash2);
    });

    it('should calculate different hash for different content', () => {
      const hash1 = vc.calculateHash('Hello World');
      const hash2 = vc.calculateHash('Goodbye World');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createVersion', () => {
    it('should create version with correct fields', () => {
      const version = vc.createVersion('Content', { statusCode: 200, source: 'original' });

      expect(version.versionId).toBeDefined();
      expect(version.hash).toBeDefined();
      expect(version.fetchedAt).toBeDefined();
      expect(version.size).toBe(Buffer.byteLength('Content', 'utf8'));
      expect(version.statusCode).toBe(200);
      expect(version.source).toBe('original');
    });
  });

  describe('hasChanged', () => {
    it('should return true for different content', () => {
      expect(vc.hasChanged('Old', 'New')).toBe(true);
    });

    it('should return false for same content', () => {
      expect(vc.hasChanged('Same', 'Same')).toBe(false);
    });
  });

  describe('calculateDiff', () => {
    it('should return no changes for identical content', () => {
      const diff = vc.calculateDiff('Same', 'Same');
      expect(diff.hasChanges).toBe(false);
      expect(diff.changeType).toBe('none');
    });

    it('should detect minor changes', () => {
      const original = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const modified = 'Line 1\nLine 2 modified\nLine 3\nLine 4\nLine 5';

      const diff = vc.calculateDiff(original, modified);
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect complete changes', () => {
      const diff = vc.calculateDiff('Completely old', 'Completely new');
      expect(diff.hasChanges).toBe(true);
      expect(diff.changeType).toBe('complete');
    });
  });

  describe('addVersion', () => {
    it('should add version to entry history', () => {
      const entry = createTestEntry('https://example.com', 'Old');
      const newVersion = vc.createVersion('New');

      const updated = vc.addVersion(entry, newVersion);

      expect(updated.currentVersion.versionId).toBe(newVersion.versionId);
      expect(updated.versions.length).toBe(1);
    });

    it('should limit version history', () => {
      let entry = createTestEntry('https://example.com', 'V0');

      for (let i = 1; i <= 5; i++) {
        const version = vc.createVersion(`V${i}`);
        entry = vc.addVersion(entry, version);
      }

      // maxVersionHistory = 3
      expect(entry.versions.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(async () => {
    manager = new CheckpointManager({
      directory: TEST_CHECKPOINT_DIR,
      compression: false,
      maxCheckpoints: 3,
    });
    // テストディレクトリを作成
    await mkdir(TEST_CHECKPOINT_DIR, { recursive: true });
  });

  afterEach(async () => {
    manager.stopAutoSave();
    // テストディレクトリを削除
    try {
      await rm(TEST_CHECKPOINT_DIR, { recursive: true });
    } catch {
      // 無視
    }
  });

  describe('save and load', () => {
    it('should save and load checkpoint', async () => {
      const entry = createTestEntry('https://example.com', 'Content');
      const data = manager.createCheckpointData(
        [entry],
        { processedUrls: ['https://example.com'], pendingUrls: [], failedUrls: [], progress: 1.0 }
      );

      const info = await manager.save(data);
      expect(info.id).toBe(data.id);
      expect(info.entryCount).toBe(1);

      const loaded = await manager.load(info.id);
      expect(loaded.entries.length).toBe(1);
      expect(loaded.entries[0].url).toBe('https://example.com');
    });
  });

  describe('loadLatest', () => {
    it('should load latest checkpoint', async () => {
      // 2つのチェックポイントを保存
      const data1 = manager.createCheckpointData(
        [createTestEntry('https://a.com', 'A')],
        { processedUrls: ['https://a.com'], pendingUrls: [], failedUrls: [], progress: 0.5 }
      );
      await manager.save(data1);

      // ファイルシステムのタイムスタンプ精度のため、十分な待機時間を確保
      await new Promise((resolve) => setTimeout(resolve, 100));

      const data2 = manager.createCheckpointData(
        [createTestEntry('https://b.com', 'B')],
        { processedUrls: ['https://b.com'], pendingUrls: [], failedUrls: [], progress: 1.0 }
      );
      await manager.save(data2);

      const latest = await manager.loadLatest();
      expect(latest?.entries[0].url).toBe('https://b.com');
    });

    it('should return null when no checkpoints', async () => {
      // ディレクトリをクリア
      await rm(TEST_CHECKPOINT_DIR, { recursive: true });
      await mkdir(TEST_CHECKPOINT_DIR, { recursive: true });

      const latest = await manager.loadLatest();
      expect(latest).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all checkpoints', async () => {
      const data1 = manager.createCheckpointData([], { processedUrls: [], pendingUrls: [], failedUrls: [], progress: 0 });
      const data2 = manager.createCheckpointData([], { processedUrls: [], pendingUrls: [], failedUrls: [], progress: 0 });

      await manager.save({ ...data1, id: 'cp-list-1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await manager.save({ ...data2, id: 'cp-list-2' });

      const list = await manager.list();
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('delete', () => {
    it('should delete checkpoint', async () => {
      const data = manager.createCheckpointData([], { processedUrls: [], pendingUrls: [], failedUrls: [], progress: 0 });
      const info = await manager.save(data);

      const deleted = await manager.delete(info.id);
      expect(deleted).toBe(true);

      const list = await manager.list();
      expect(list.find((cp) => cp.id === info.id)).toBeUndefined();
    });
  });

  describe('pruning', () => {
    it('should prune old checkpoints', async () => {
      // maxCheckpoints = 3
      for (let i = 0; i < 5; i++) {
        const data = manager.createCheckpointData([], { processedUrls: [], pendingUrls: [], failedUrls: [], progress: 0 });
        await manager.save({ ...data, id: `checkpoint-${i}` });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const list = await manager.list();
      expect(list.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('ContentManager', () => {
  let manager: ContentManager;

  beforeEach(async () => {
    manager = new ContentManager({
      cache: { maxSizeBytes: 10000, maxEntries: 10 },
      checkpoint: { directory: TEST_CHECKPOINT_DIR },
      maxVersionHistory: 3,
      enableDiffDetection: true,
    });
    await mkdir(TEST_CHECKPOINT_DIR, { recursive: true });
  });

  afterEach(async () => {
    manager.stopAutoCheckpoint();
    try {
      await rm(TEST_CHECKPOINT_DIR, { recursive: true });
    } catch {
      // 無視
    }
  });

  describe('set and get', () => {
    it('should set and get content', () => {
      const entry = manager.set('https://example.com', 'Hello World');
      expect(entry.url).toBe('https://example.com');
      expect(entry.content).toBe('Hello World');

      const retrieved = manager.get('https://example.com');
      expect(retrieved?.content).toBe('Hello World');
    });
  });

  describe('has and delete', () => {
    it('should check existence and delete', () => {
      manager.set('https://example.com', 'Content');
      expect(manager.has('https://example.com')).toBe(true);

      manager.delete('https://example.com');
      expect(manager.has('https://example.com')).toBe(false);
    });
  });

  describe('version detection', () => {
    it('should create new version on significant change', () => {
      manager.set('https://example.com', 'Original content here');

      const events: string[] = [];
      manager.addEventListener((event) => events.push(event.type));

      manager.set('https://example.com', 'Completely different content now');

      expect(events).toContain('version:created');
      expect(events).toContain('content:changed');
    });
  });

  describe('processing state', () => {
    it('should track processing state', () => {
      manager.addPending('https://a.com');
      manager.addPending('https://b.com');
      manager.markProcessed('https://a.com');
      manager.markFailed('https://b.com');

      const state = manager.getProcessingState();
      expect(state.processedUrls).toContain('https://a.com');
      expect(state.failedUrls).toContain('https://b.com');
      expect(state.pendingUrls.length).toBe(0);
    });

    it('should calculate progress correctly', () => {
      manager.addPending('https://a.com');
      manager.addPending('https://b.com');
      manager.markProcessed('https://a.com');

      const state = manager.getProcessingState();
      expect(state.progress).toBe(0.5);
    });
  });

  describe('checkpoint integration', () => {
    it('should save and load checkpoint', async () => {
      manager.set('https://example.com', 'Content');
      manager.markProcessed('https://example.com');

      const info = await manager.saveCheckpoint({ topic: 'test' });
      expect(info.entryCount).toBe(1);

      // 新しいマネージャーで復元
      const newManager = new ContentManager({
        checkpoint: { directory: TEST_CHECKPOINT_DIR },
      });

      await newManager.loadCheckpoint(info.id);
      expect(newManager.has('https://example.com')).toBe(true);

      const state = newManager.getProcessingState();
      expect(state.processedUrls).toContain('https://example.com');
    });
  });

  describe('cache stats', () => {
    it('should return cache statistics', () => {
      manager.set('https://a.com', 'A');
      manager.set('https://b.com', 'B');
      manager.get('https://a.com');
      manager.get('https://nonexistent.com');

      const stats = manager.getCacheStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.hitCount).toBeGreaterThanOrEqual(1);
      expect(stats.missCount).toBeGreaterThanOrEqual(1);
    });
  });
});

// ヘルパー関数
function createTestEntry(url: string, content: string): ContentEntry {
  const version: ContentVersion = {
    versionId: `v-${Date.now()}`,
    hash: 'test-hash',
    fetchedAt: new Date().toISOString(),
    size: content.length,
  };

  return {
    url,
    content,
    contentType: 'text/html',
    status: 'success',
    currentVersion: version,
    versions: [],
    lastAccessedAt: new Date().toISOString(),
    accessCount: 0,
  };
}
