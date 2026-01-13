/**
 * WorkspaceFactory テスト
 *
 * @requirement REQ-011-05
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { WorkspaceFactory, createWorkspace, readFile, writeFile } from '../src/workspace-factory.js';
import { LocalWorkspace } from '../src/local-workspace.js';
import { WorkspaceError } from '../src/types.js';

describe('WorkspaceFactory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'katashiro-workspace-factory-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create LocalWorkspace', () => {
      const workspace = WorkspaceFactory.create({
        type: 'local',
        workingDir: tempDir,
      });

      expect(workspace).toBeInstanceOf(LocalWorkspace);
      expect(workspace.type).toBe('local');
    });

    it('should throw for remote workspace (not implemented)', () => {
      expect(() =>
        WorkspaceFactory.create({
          type: 'remote',
          workingDir: '/app',
          apiUrl: 'http://localhost:3000',
        })
      ).toThrow(WorkspaceError);
    });
  });

  describe('createLocal', () => {
    it('should create LocalWorkspace with options', () => {
      const workspace = WorkspaceFactory.createLocal(tempDir, { readOnly: true });

      expect(workspace.type).toBe('local');
      expect(workspace.readOnly).toBe(true);
    });
  });

  describe('createWorkspace', () => {
    it('should create and initialize workspace', async () => {
      const workspace = await createWorkspace({
        type: 'local',
        workingDir: tempDir,
      });

      expect(workspace.type).toBe('local');
    });
  });

  describe('readFile', () => {
    it('should read file using config', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'hello');

      const content = await readFile(
        { type: 'local', workingDir: tempDir },
        'test.txt'
      );

      expect(content).toBe('hello');
    });
  });

  describe('writeFile', () => {
    it('should write file using config', async () => {
      await writeFile(
        { type: 'local', workingDir: tempDir },
        'output.txt',
        'written content'
      );

      const content = await fs.readFile(path.join(tempDir, 'output.txt'), 'utf-8');
      expect(content).toBe('written content');
    });
  });

  describe('unified interface (REQ-011-05)', () => {
    it('should allow tools to work identically regardless of workspace type', async () => {
      // 統一インターフェースでツールを定義
      async function readConfigTool(workspace: ReturnType<typeof WorkspaceFactory.create>): Promise<string> {
        return workspace.read('config.json');
      }

      async function writeResultTool(
        workspace: ReturnType<typeof WorkspaceFactory.create>,
        result: string
      ): Promise<void> {
        await workspace.write('result.json', result);
      }

      // LocalWorkspaceでテスト
      const localWorkspace = WorkspaceFactory.createLocal(tempDir);
      await localWorkspace.write('config.json', '{"key": "value"}');

      const config = await readConfigTool(localWorkspace);
      expect(config).toBe('{"key": "value"}');

      await writeResultTool(localWorkspace, '{"status": "ok"}');
      const result = await localWorkspace.read('result.json');
      expect(result).toBe('{"status": "ok"}');
    });
  });
});
