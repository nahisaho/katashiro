/**
 * LocalWorkspace テスト
 *
 * @requirement REQ-011-02
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalWorkspace } from '../src/local-workspace.js';
import { WorkspaceError } from '../src/types.js';

describe('LocalWorkspace', () => {
  let tempDir: string;
  let workspace: LocalWorkspace;

  beforeEach(async () => {
    // テスト用一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'katashiro-workspace-test-'));
    workspace = new LocalWorkspace({
      type: 'local',
      workingDir: tempDir,
    });
  });

  afterEach(async () => {
    // 一時ディレクトリを削除
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should initialize with correct type', () => {
      expect(workspace.type).toBe('local');
      expect(workspace.workingDir).toBe(tempDir);
      expect(workspace.readOnly).toBe(false);
    });

    it('should support read-only mode', () => {
      const roWorkspace = new LocalWorkspace({
        type: 'local',
        workingDir: tempDir,
        readOnly: true,
      });
      expect(roWorkspace.readOnly).toBe(true);
    });
  });

  describe('read/write', () => {
    it('should write and read a file', async () => {
      const content = 'Hello, World!';
      await workspace.write('test.txt', content);

      const result = await workspace.read('test.txt');
      expect(result).toBe(content);
    });

    it('should write and read UTF-8 content', async () => {
      const content = 'こんにちは世界 🌍';
      await workspace.write('unicode.txt', content);

      const result = await workspace.read('unicode.txt');
      expect(result).toBe(content);
    });

    it('should create nested directories automatically', async () => {
      await workspace.write('deep/nested/file.txt', 'nested content');

      const result = await workspace.read('deep/nested/file.txt');
      expect(result).toBe('nested content');
    });

    it('should throw NOT_FOUND for non-existent file', async () => {
      await expect(workspace.read('nonexistent.txt')).rejects.toThrow(WorkspaceError);
      try {
        await workspace.read('nonexistent.txt');
      } catch (e) {
        expect((e as WorkspaceError).code).toBe('NOT_FOUND');
      }
    });

    it('should throw READ_ONLY when writing in read-only mode', async () => {
      const roWorkspace = new LocalWorkspace({
        type: 'local',
        workingDir: tempDir,
        readOnly: true,
      });

      await expect(roWorkspace.write('test.txt', 'content')).rejects.toThrow(WorkspaceError);
      try {
        await roWorkspace.write('test.txt', 'content');
      } catch (e) {
        expect((e as WorkspaceError).code).toBe('READ_ONLY');
      }
    });
  });

  describe('readBuffer/writeBuffer', () => {
    it('should write and read binary data', async () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      await workspace.writeBuffer('binary.bin', buffer);

      const result = await workspace.readBuffer('binary.bin');
      expect(result).toEqual(buffer);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await workspace.write('file1.txt', 'content1');
      await workspace.write('file2.txt', 'content2');
      await workspace.mkdir('subdir');
      await workspace.write('subdir/file3.txt', 'content3');
    });

    it('should list directory contents', async () => {
      const files = await workspace.list('.');

      expect(files).toHaveLength(3);
      const names = files.map(f => f.name);
      expect(names).toContain('file1.txt');
      expect(names).toContain('file2.txt');
      expect(names).toContain('subdir');
    });

    it('should include file info', async () => {
      const files = await workspace.list('.');
      const file1 = files.find(f => f.name === 'file1.txt');

      expect(file1).toBeDefined();
      expect(file1!.isDirectory).toBe(false);
      expect(file1!.size).toBe(8); // 'content1'.length
    });

    it('should identify directories', async () => {
      const files = await workspace.list('.');
      const subdir = files.find(f => f.name === 'subdir');

      expect(subdir).toBeDefined();
      expect(subdir!.isDirectory).toBe(true);
    });
  });

  describe('listEntries', () => {
    beforeEach(async () => {
      await workspace.write('file.txt', 'content');
      await workspace.mkdir('dir');
    });

    it('should return simple directory entries', async () => {
      const entries = await workspace.listEntries('.');

      expect(entries).toHaveLength(2);
      expect(entries.find(e => e.name === 'file.txt')?.isDirectory).toBe(false);
      expect(entries.find(e => e.name === 'dir')?.isDirectory).toBe(true);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await workspace.write('src/index.ts', 'export {};');
      await workspace.write('src/utils.ts', 'export {};');
      await workspace.write('tests/index.test.ts', 'test();');
      await workspace.write('README.md', '# README');
    });

    it('should find files matching glob pattern', async () => {
      const files = await workspace.search('**/*.ts');

      expect(files).toHaveLength(3);
      expect(files).toContain('src/index.ts');
      expect(files).toContain('src/utils.ts');
      expect(files).toContain('tests/index.test.ts');
    });

    it('should find files with specific extension', async () => {
      const files = await workspace.search('**/*.md');

      expect(files).toHaveLength(1);
      expect(files).toContain('README.md');
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await workspace.write('exists.txt', 'content');
    });

    it('should return true for existing file', async () => {
      const result = await workspace.exists('exists.txt');
      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const result = await workspace.exists('notexists.txt');
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      await workspace.write('todelete.txt', 'content');
      expect(await workspace.exists('todelete.txt')).toBe(true);

      await workspace.delete('todelete.txt');
      expect(await workspace.exists('todelete.txt')).toBe(false);
    });

    it('should delete a directory recursively', async () => {
      await workspace.write('dir/subdir/file.txt', 'content');
      expect(await workspace.exists('dir/subdir/file.txt')).toBe(true);

      await workspace.delete('dir');
      expect(await workspace.exists('dir')).toBe(false);
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      await workspace.mkdir('newdir');
      expect(await workspace.exists('newdir')).toBe(true);
    });

    it('should create nested directories', async () => {
      await workspace.mkdir('a/b/c');
      expect(await workspace.exists('a/b/c')).toBe(true);
    });
  });

  describe('stat', () => {
    beforeEach(async () => {
      await workspace.write('statfile.txt', 'test content');
    });

    it('should return file info', async () => {
      const info = await workspace.stat('statfile.txt');

      expect(info.name).toBe('statfile.txt');
      expect(info.size).toBe(12);
      expect(info.isDirectory).toBe(false);
      expect(info.modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('copy', () => {
    it('should copy a file', async () => {
      await workspace.write('original.txt', 'content');
      await workspace.copy('original.txt', 'copied.txt');

      const content = await workspace.read('copied.txt');
      expect(content).toBe('content');
    });

    it('should copy a directory', async () => {
      await workspace.write('dir/file.txt', 'content');
      await workspace.copy('dir', 'copied-dir');

      const content = await workspace.read('copied-dir/file.txt');
      expect(content).toBe('content');
    });
  });

  describe('move', () => {
    it('should move a file', async () => {
      await workspace.write('tomove.txt', 'content');
      await workspace.move('tomove.txt', 'moved.txt');

      expect(await workspace.exists('tomove.txt')).toBe(false);
      expect(await workspace.read('moved.txt')).toBe('content');
    });
  });

  describe('path security', () => {
    it('should prevent path traversal', async () => {
      await expect(workspace.read('../../../etc/passwd')).rejects.toThrow(WorkspaceError);
      try {
        await workspace.read('../../../etc/passwd');
      } catch (e) {
        expect((e as WorkspaceError).code).toBe('PERMISSION_DENIED');
      }
    });
  });
});
