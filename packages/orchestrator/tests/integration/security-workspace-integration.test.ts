/**
 * v0.4.0 統合テスト - Security + Workspace + Sandbox
 *
 * セキュリティ分析、ワークスペース管理、サンドボックス実行の連携テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Note: 実際の統合テストでは各パッケージからインポート
// ここではモック型定義を使用

interface Action {
  type: string;
  name: string;
  target?: string;
  params?: Record<string, unknown>;
}

interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowed: boolean;
  requiresConfirmation: boolean;
  reasons: string[];
}

interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

// モックSecurityAnalyzer
class MockSecurityAnalyzer {
  analyze(action: Action): SecurityAnalysis {
    // ファイル削除は高リスク
    if (action.type === 'file_delete') {
      return {
        riskLevel: 'high',
        allowed: true,
        requiresConfirmation: true,
        reasons: ['File deletion is high risk'],
      };
    }
    // .envファイルはブロック
    if (action.target?.includes('.env')) {
      return {
        riskLevel: 'critical',
        allowed: false,
        requiresConfirmation: false,
        reasons: ['Environment files are blocked'],
      };
    }
    return {
      riskLevel: 'low',
      allowed: true,
      requiresConfirmation: false,
      reasons: [],
    };
  }
}

// モックLocalWorkspace
class MockLocalWorkspace {
  constructor(private rootPath: string) {}

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.rootPath, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    await fs.unlink(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.rootPath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

// モックLocalExecutor
class MockLocalExecutor {
  async execute(code: string, language: string): Promise<ExecutionResult> {
    // シミュレーション
    return {
      exitCode: 0,
      stdout: `Executed ${language} code successfully`,
      stderr: '',
      duration: 100,
    };
  }
}

describe('Security + Workspace Integration', () => {
  let tempDir: string;
  let workspace: MockLocalWorkspace;
  let security: MockSecurityAnalyzer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'katashiro-test-'));
    workspace = new MockLocalWorkspace(tempDir);
    security = new MockSecurityAnalyzer();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup error is ok
    }
  });

  it('許可されたファイル操作は実行できる', async () => {
    const action: Action = {
      type: 'file_write',
      name: 'write file',
      target: 'test.txt',
    };

    const analysis = security.analyze(action);
    expect(analysis.allowed).toBe(true);

    if (analysis.allowed) {
      await workspace.writeFile('test.txt', 'Hello, World!');
      const content = await workspace.readFile('test.txt');
      expect(content).toBe('Hello, World!');
    }
  });

  it('.envファイルへのアクセスはブロックされる', async () => {
    const action: Action = {
      type: 'file_read',
      name: 'read env',
      target: '.env',
    };

    const analysis = security.analyze(action);
    expect(analysis.allowed).toBe(false);
    expect(analysis.riskLevel).toBe('critical');
  });

  it('高リスク操作は確認が必要', async () => {
    // まずファイルを作成
    await workspace.writeFile('to-delete.txt', 'temporary');

    const action: Action = {
      type: 'file_delete',
      name: 'delete file',
      target: 'to-delete.txt',
    };

    const analysis = security.analyze(action);
    expect(analysis.riskLevel).toBe('high');
    expect(analysis.requiresConfirmation).toBe(true);

    // 確認後に実行
    if (analysis.allowed) {
      await workspace.deleteFile('to-delete.txt');
      const exists = await workspace.exists('to-delete.txt');
      expect(exists).toBe(false);
    }
  });
});

describe('Sandbox + Security Integration', () => {
  let executor: MockLocalExecutor;
  let security: MockSecurityAnalyzer;

  beforeEach(() => {
    executor = new MockLocalExecutor();
    security = new MockSecurityAnalyzer();
  });

  it('コード実行はセキュリティチェック後に行う', async () => {
    const action: Action = {
      type: 'code_execute',
      name: 'execute python',
      params: { code: 'print("Hello")', language: 'python' },
    };

    const analysis = security.analyze(action);

    if (analysis.allowed) {
      const result = await executor.execute('print("Hello")', 'python');
      expect(result.exitCode).toBe(0);
    }
  });
});

describe('Full Pipeline Integration', () => {
  let tempDir: string;
  let workspace: MockLocalWorkspace;
  let security: MockSecurityAnalyzer;
  let executor: MockLocalExecutor;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'katashiro-pipeline-'));
    workspace = new MockLocalWorkspace(tempDir);
    security = new MockSecurityAnalyzer();
    executor = new MockLocalExecutor();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup error is ok
    }
  });

  it('ファイル作成 → コード実行 → 結果保存のパイプライン', async () => {
    // 1. ファイル作成アクション
    const writeAction: Action = {
      type: 'file_write',
      name: 'create script',
      target: 'script.py',
    };

    const writeAnalysis = security.analyze(writeAction);
    expect(writeAnalysis.allowed).toBe(true);

    await workspace.writeFile('script.py', 'print("Hello from Python")');

    // 2. コード実行アクション
    const execAction: Action = {
      type: 'code_execute',
      name: 'run script',
      params: { code: 'print("Hello from Python")', language: 'python' },
    };

    const execAnalysis = security.analyze(execAction);
    expect(execAnalysis.allowed).toBe(true);

    const result = await executor.execute('print("Hello from Python")', 'python');
    expect(result.exitCode).toBe(0);

    // 3. 結果保存アクション
    const saveAction: Action = {
      type: 'file_write',
      name: 'save result',
      target: 'result.txt',
    };

    const saveAnalysis = security.analyze(saveAction);
    expect(saveAnalysis.allowed).toBe(true);

    await workspace.writeFile('result.txt', result.stdout);
    const savedResult = await workspace.readFile('result.txt');
    expect(savedResult).toContain('successfully');
  });

  it('セキュリティ違反があればパイプラインを中断', async () => {
    const actions: Action[] = [
      { type: 'file_write', name: 'write normal', target: 'normal.txt' },
      { type: 'file_read', name: 'read env', target: '.env' }, // ブロック
      { type: 'file_write', name: 'write result', target: 'result.txt' },
    ];

    const results: { action: Action; allowed: boolean }[] = [];

    for (const action of actions) {
      const analysis = security.analyze(action);
      results.push({ action, allowed: analysis.allowed });

      if (!analysis.allowed) {
        break; // セキュリティ違反で中断
      }
    }

    // 2番目のアクションでブロック
    expect(results.length).toBe(2);
    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(false);
  });
});

describe('Audit Logging Integration', () => {
  interface AuditEntry {
    action: Action;
    analysis: SecurityAnalysis;
    timestamp: string;
  }

  let auditLog: AuditEntry[];
  let security: MockSecurityAnalyzer;

  beforeEach(() => {
    auditLog = [];
    security = new MockSecurityAnalyzer();
  });

  function logAction(action: Action, analysis: SecurityAnalysis): void {
    auditLog.push({
      action,
      analysis,
      timestamp: new Date().toISOString(),
    });
  }

  it('すべてのアクションが監査ログに記録される', async () => {
    const actions: Action[] = [
      { type: 'file_read', name: 'read config', target: 'config.json' },
      { type: 'file_write', name: 'write data', target: 'data.json' },
      { type: 'file_delete', name: 'delete temp', target: 'temp.txt' },
    ];

    for (const action of actions) {
      const analysis = security.analyze(action);
      logAction(action, analysis);
    }

    expect(auditLog.length).toBe(3);
    expect(auditLog[0].action.type).toBe('file_read');
    expect(auditLog[1].action.type).toBe('file_write');
    expect(auditLog[2].action.type).toBe('file_delete');
  });

  it('高リスクアクションをフィルタリングできる', async () => {
    const actions: Action[] = [
      { type: 'file_read', name: 'read', target: 'file.txt' },
      { type: 'file_delete', name: 'delete', target: 'file.txt' },
      { type: 'file_write', name: 'write', target: 'file.txt' },
    ];

    for (const action of actions) {
      const analysis = security.analyze(action);
      logAction(action, analysis);
    }

    const highRiskLogs = auditLog.filter(
      (entry) => entry.analysis.riskLevel === 'high' || entry.analysis.riskLevel === 'critical'
    );

    expect(highRiskLogs.length).toBe(1);
    expect(highRiskLogs[0].action.type).toBe('file_delete');
  });
});
