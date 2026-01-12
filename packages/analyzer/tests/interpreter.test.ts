/**
 * CodeInterpreter テスト
 * @module @nahisaho/katashiro-analyzer
 * @see DES-ANALYZE-009
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CodeInterpreter,
  CodeValidator,
  SandboxManager,
  SessionManager,
  BLOCKED_PYTHON_MODULES,
  ALLOWED_PYTHON_MODULES,
  DEFAULT_EXECUTION_CONFIG,
  INTERPRETER_ERROR_CODES,
} from '../src/interpreter';

describe('CodeInterpreter', () => {
  // ===========================================
  // CodeValidator テスト
  // ===========================================
  describe('CodeValidator', () => {
    let validator: CodeValidator;

    beforeEach(() => {
      validator = new CodeValidator();
    });

    describe('validate()', () => {
      it('有効なPythonコードを検証できること', () => {
        const code = `
print("Hello, World!")
x = 1 + 2
print(x)
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('有効なJavaScriptコードを検証できること', () => {
        const code = `
const x = 1 + 2;
console.log(x);
`;
        const result = validator.validate(code, 'javascript');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('有効なTypeScriptコードを検証できること', () => {
        const code = `
const x: number = 1 + 2;
console.log(x);
`;
        const result = validator.validate(code, 'typescript');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('有効なShellコードを検証できること', () => {
        const code = `
echo "Hello, World!"
ls -la
`;
        const result = validator.validate(code, 'shell');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('ブロックされたPythonモジュールを検出すること', () => {
        const code = `
import os
os.system("rm -rf /")
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('os'))).toBe(true);
      });

      it('ブロックされたsubprocessモジュールを検出すること', () => {
        const code = `
import subprocess
subprocess.run(["ls"])
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('subprocess'))).toBe(true);
      });

      it('from import形式のブロックされたモジュールを検出すること', () => {
        const code = `
from socket import socket
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('socket'))).toBe(true);
      });

      it('危険なPython関数を検出すること', () => {
        const code = `
exec("print('hello')")
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('exec'))).toBe(true);
      });

      it('evalを使用したPythonコードを検出すること', () => {
        const code = `
result = eval("1 + 2")
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('eval'))).toBe(true);
      });

      it('危険なJavaScriptグローバルを警告すること', () => {
        const code = `
const data = globalThis.process;
`;
        const result = validator.validate(code, 'javascript');

        // 警告は出るが、validはtrueのまま
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it('evalを使用したJavaScriptコードを検出すること', () => {
        const code = `
const result = eval("1 + 2");
`;
        const result = validator.validate(code, 'javascript');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('eval'))).toBe(true);
      });

      it('new Functionを検出すること', () => {
        const code = `
const fn = new Function("return 1");
`;
        const result = validator.validate(code, 'javascript');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Function'))).toBe(true);
      });

      it('危険なShellコマンドを検出すること', () => {
        const code = `
rm -rf /
`;
        const result = validator.validate(code, 'shell');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('rm'))).toBe(true);
      });

      it('sudoを検出すること', () => {
        const code = `
sudo apt install something
`;
        const result = validator.validate(code, 'shell');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('sudo'))).toBe(true);
      });

      it('chmodを検出すること', () => {
        const code = `
chmod 777 /etc/passwd
`;
        const result = validator.validate(code, 'shell');

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('chmod'))).toBe(true);
      });

      it('空のコードを検証できること', () => {
        const result = validator.validate('', 'python');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('コメントのみのコードを検証できること', () => {
        const code = `
# This is a comment
# Another comment
`;
        const result = validator.validate(code, 'python');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('extractImports()', () => {
      it('Pythonのimport文を抽出できること', () => {
        const code = `
import json
import math
from collections import defaultdict
`;
        const imports = validator.extractImports(code, 'python');

        expect(imports).toContain('json');
        expect(imports).toContain('math');
        expect(imports).toContain('collections');
      });

      it('JavaScriptのimport文を抽出できること', () => {
        const code = `
import fs from 'fs';
import { join } from 'path';
const http = require('http');
`;
        const imports = validator.extractImports(code, 'javascript');

        expect(imports).toContain('fs');
        expect(imports).toContain('path');
        expect(imports).toContain('http');
      });

      it('インポートがない場合は空配列を返すこと', () => {
        const code = `
print("Hello")
`;
        const imports = validator.extractImports(code, 'python');

        expect(imports).toHaveLength(0);
      });
    });

    describe('calculateComplexity()', () => {
      it('シンプルなコードの複雑度が低いこと', () => {
        const code = `
x = 1
y = 2
print(x + y)
`;
        const complexity = validator.calculateComplexity(code);

        expect(complexity).toBeLessThan(5);
      });

      it('条件分岐があるコードは複雑度が高くなること', () => {
        const code = `
if x > 0:
    if y > 0:
        print("both positive")
    else:
        print("x positive, y not")
elif x < 0:
    print("x negative")
else:
    print("x is zero")
`;
        const complexity = validator.calculateComplexity(code);

        expect(complexity).toBeGreaterThan(3);
      });

      it('ループがあるコードは複雑度が高くなること', () => {
        const code = `
for i in range(10):
    for j in range(10):
        while condition:
            print(i, j)
`;
        const complexity = validator.calculateComplexity(code);

        expect(complexity).toBeGreaterThan(3);
      });
    });
  });

  // ===========================================
  // SandboxManager テスト
  // ===========================================
  describe('SandboxManager', () => {
    let sandboxManager: SandboxManager;

    beforeEach(() => {
      sandboxManager = new SandboxManager();
    });

    afterEach(async () => {
      await sandboxManager.destroyAll();
    });

    describe('create()', () => {
      it('サンドボックスを作成できること', async () => {
        const sandbox = await sandboxManager.create({
          workDir: '',
          timeout: 30000,
          memoryLimit: 256,
          allowNetwork: false,
          allowedHosts: [],
          env: {},
        });

        expect(sandbox).toBeDefined();
        expect(sandbox.id).toBeDefined();
        expect(sandbox.workDir).toBeDefined();
      });

      it('複数のサンドボックスを作成できること', async () => {
        const sandbox1 = await sandboxManager.create({
          workDir: '',
          timeout: 30000,
          memoryLimit: 256,
          allowNetwork: false,
          allowedHosts: [],
          env: {},
        });
        const sandbox2 = await sandboxManager.create({
          workDir: '',
          timeout: 30000,
          memoryLimit: 256,
          allowNetwork: false,
          allowedHosts: [],
          env: {},
        });

        expect(sandbox1.id).not.toBe(sandbox2.id);
        expect(sandbox1.workDir).not.toBe(sandbox2.workDir);
      });
    });

    describe('destroy()', () => {
      it('サンドボックスを破棄できること', async () => {
        const sandbox = await sandboxManager.create({
          workDir: '',
          timeout: 30000,
          memoryLimit: 256,
          allowNetwork: false,
          allowedHosts: [],
          env: {},
        });
        await sandboxManager.destroy(sandbox.id);

        // 破棄後は取得できない
        const retrieved = sandboxManager.get(sandbox.id);
        expect(retrieved).toBeUndefined();
      });
    });

    describe('writeFile()', () => {
      it('サンドボックス内にファイルを書き込めること', async () => {
        const sandbox = await sandboxManager.create({
          workDir: '',
          timeout: 30000,
          memoryLimit: 256,
          allowNetwork: false,
          allowedHosts: [],
          env: {},
        });
        const filePath = await sandboxManager.writeFile(
          sandbox.id,
          'test.py',
          'print("hello")'
        );

        expect(filePath).toBeDefined();
        expect(filePath.endsWith('test.py')).toBe(true);
      });

      it('存在しないサンドボックスへの書き込みは例外を投げること', async () => {
        await expect(
          sandboxManager.writeFile('non-existent', 'test.py', 'print("hello")')
        ).rejects.toThrow();
      });
    });

    describe('getCodeFileName()', () => {
      it('Pythonのファイル名を取得できること', () => {
        const fileName = sandboxManager.getCodeFileName('python');
        expect(fileName).toBe('script.py');
      });

      it('JavaScriptのファイル名を取得できること', () => {
        const fileName = sandboxManager.getCodeFileName('javascript');
        expect(fileName).toBe('script.js');
      });

      it('TypeScriptのファイル名を取得できること', () => {
        const fileName = sandboxManager.getCodeFileName('typescript');
        expect(fileName).toBe('script.ts');
      });

      it('Shellのファイル名を取得できること', () => {
        const fileName = sandboxManager.getCodeFileName('shell');
        expect(fileName).toBe('script.sh');
      });
    });

    describe('getExecutionCommand()', () => {
      it('Pythonの実行コマンドを取得できること', () => {
        const [command, args] = sandboxManager.getExecutionCommand('python', 'script.py');
        expect(command).toBe('python3');
        expect(args).toContain('script.py');
      });

      it('JavaScriptの実行コマンドを取得できること', () => {
        const [command, args] = sandboxManager.getExecutionCommand('javascript', 'script.js');
        expect(command).toBe('node');
        expect(args).toContain('script.js');
      });

      it('TypeScriptの実行コマンドを取得できること', () => {
        const [command, args] = sandboxManager.getExecutionCommand('typescript', 'script.ts');
        expect(command).toBe('npx');
        expect(args).toContain('ts-node');
      });

      it('Shellの実行コマンドを取得できること', () => {
        const [command, args] = sandboxManager.getExecutionCommand('shell', 'script.sh');
        expect(command).toBe('bash');
        expect(args).toContain('script.sh');
      });
    });
  });

  // ===========================================
  // SessionManager テスト
  // ===========================================
  describe('SessionManager', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    afterEach(async () => {
      await sessionManager.terminateAll();
    });

    describe('create()', () => {
      it('セッションを作成できること', async () => {
        const session = await sessionManager.create('python');

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.language).toBe('python');
        expect(session.state).toBe('active');
      });

      it('複数のセッションを作成できること', async () => {
        const session1 = await sessionManager.create('python');
        const session2 = await sessionManager.create('javascript');

        expect(session1.id).not.toBe(session2.id);
        expect(session1.language).toBe('python');
        expect(session2.language).toBe('javascript');
      });
    });

    describe('get()', () => {
      it('セッションを取得できること', async () => {
        const created = await sessionManager.create('python');
        const retrieved = sessionManager.get(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
      });

      it('存在しないセッションはundefinedを返すこと', () => {
        const session = sessionManager.get('non-existent');
        expect(session).toBeUndefined();
      });
    });

    describe('terminate()', () => {
      it('セッションを終了できること', async () => {
        const session = await sessionManager.create('python');
        await sessionManager.terminate(session.id);

        const retrieved = sessionManager.get(session.id);
        expect(retrieved).toBeUndefined();
      });

      it('存在しないセッションの終了は安全に処理されること', async () => {
        // 例外が発生しないことを確認
        await expect(sessionManager.terminate('non-existent')).resolves.not.toThrow();
      });
    });

    describe('addHistory()', () => {
      it('実行履歴を追加できること', async () => {
        const session = await sessionManager.create('python');
        sessionManager.addHistory(session.id, {
          input: 'print("hello")',
          output: 'hello',
          executedAt: new Date(),
          success: true,
        });
        sessionManager.addHistory(session.id, {
          input: 'x = 1',
          output: '',
          executedAt: new Date(),
          success: true,
        });

        const retrieved = sessionManager.get(session.id);
        expect(retrieved!.history).toHaveLength(2);
        expect(retrieved!.history[0].input).toBe('print("hello")');
        expect(retrieved!.history[1].input).toBe('x = 1');
      });
    });

    describe('setGlobal() / getGlobal()', () => {
      it('グローバル変数を設定・取得できること', async () => {
        const session = await sessionManager.create('python');
        sessionManager.setGlobal(session.id, 'x', 42);
        sessionManager.setGlobal(session.id, 'name', 'test');

        expect(sessionManager.getGlobal(session.id, 'x')).toBe(42);
        expect(sessionManager.getGlobal(session.id, 'name')).toBe('test');
      });

      it('存在しない変数はundefinedを返すこと', async () => {
        const session = await sessionManager.create('python');
        const value = sessionManager.getGlobal(session.id, 'nonexistent');

        expect(value).toBeUndefined();
      });
    });

    describe('list()', () => {
      it('全セッションをリストできること', async () => {
        await sessionManager.create('python');
        await sessionManager.create('javascript');
        await sessionManager.create('typescript');

        const sessions = sessionManager.list();
        expect(sessions).toHaveLength(3);
      });
    });

    describe('listActive()', () => {
      it('アクティブなセッションのみをリストできること', async () => {
        const session1 = await sessionManager.create('python');
        await sessionManager.create('javascript');
        await sessionManager.terminate(session1.id);

        const activeSessions = sessionManager.listActive();
        expect(activeSessions).toHaveLength(1);
        expect(activeSessions[0].language).toBe('javascript');
      });
    });
  });

  // ===========================================
  // CodeInterpreter (統合) テスト
  // ===========================================
  describe('CodeInterpreter (Integration)', () => {
    let interpreter: CodeInterpreter;

    beforeEach(() => {
      interpreter = new CodeInterpreter();
    });

    afterEach(async () => {
      await interpreter.cleanup();
    });

    describe('validate()', () => {
      it('コードを検証できること', () => {
        const result = interpreter.validate('print("hello")', 'python');

        expect(result.valid).toBe(true);
      });

      it('危険なコードを検出できること', () => {
        // 複数行にまたがるimportを使用
        const result = interpreter.validate(`
import os
os.system("rm -rf /")
`, 'python');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('analyze()', () => {
      it('コードを分析できること', async () => {
        const result = await interpreter.analyze(`
if x > 0:
    print("positive")
else:
    print("not positive")
`, 'python');

        expect(result.complexity).toBeGreaterThan(0);
        expect(result.imports).toBeDefined();
        expect(result.valid).toBeDefined();
      });
    });

    describe('execute()', () => {
      it('危険なコードの実行を拒否すること', async () => {
        const result = await interpreter.execute({
          code: `
import subprocess
subprocess.run(["ls"])
`,
          language: 'python',
        });

        expect(result._tag).toBe('Ok');
        if (result._tag === 'Ok') {
          expect(result.value.success).toBe(false);
          expect(result.value.error).toBeDefined();
        }
      });
    });

    describe('REPL Session', () => {
      it('セッションを開始・終了できること', async () => {
        const result = await interpreter.startSession('python');

        expect(result._tag).toBe('Ok');
        if (result._tag === 'Ok') {
          const session = result.value;
          expect(session).toBeDefined();
          expect(session.language).toBe('python');
          expect(session.state).toBe('active');

          await interpreter.endSession(session.id);
        }
      });
    });

    describe('getSupportedLanguages()', () => {
      it('サポート言語リストを取得できること', () => {
        const languages = interpreter.getSupportedLanguages();

        expect(languages).toContain('python');
        expect(languages).toContain('javascript');
        expect(languages).toContain('typescript');
        expect(languages).toContain('shell');
      });
    });
  });

  // ===========================================
  // 定数・型エクスポート テスト
  // ===========================================
  describe('Constants and Types', () => {
    it('BLOCKED_PYTHON_MODULESが定義されていること', () => {
      expect(BLOCKED_PYTHON_MODULES).toBeDefined();
      expect(Array.isArray(BLOCKED_PYTHON_MODULES)).toBe(true);
      expect(BLOCKED_PYTHON_MODULES).toContain('os');
      expect(BLOCKED_PYTHON_MODULES).toContain('subprocess');
      expect(BLOCKED_PYTHON_MODULES).toContain('socket');
    });

    it('ALLOWED_PYTHON_MODULESが定義されていること', () => {
      expect(ALLOWED_PYTHON_MODULES).toBeDefined();
      expect(Array.isArray(ALLOWED_PYTHON_MODULES)).toBe(true);
      expect(ALLOWED_PYTHON_MODULES).toContain('math');
      expect(ALLOWED_PYTHON_MODULES).toContain('json');
      expect(ALLOWED_PYTHON_MODULES).toContain('datetime');
    });

    it('DEFAULT_EXECUTION_CONFIGが定義されていること', () => {
      expect(DEFAULT_EXECUTION_CONFIG).toBeDefined();
      expect(DEFAULT_EXECUTION_CONFIG.timeout).toBeGreaterThan(0);
      expect(DEFAULT_EXECUTION_CONFIG.memoryLimit).toBeGreaterThan(0);
    });

    it('INTERPRETER_ERROR_CODESが定義されていること', () => {
      expect(INTERPRETER_ERROR_CODES).toBeDefined();
      expect(INTERPRETER_ERROR_CODES.VALIDATION_FAILED).toBeDefined();
      expect(INTERPRETER_ERROR_CODES.RUNTIME_ERROR).toBeDefined();
      expect(INTERPRETER_ERROR_CODES.EXECUTION_TIMEOUT).toBeDefined();
    });
  });
});
