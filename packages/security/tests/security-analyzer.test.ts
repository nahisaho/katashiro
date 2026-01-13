/**
 * SecurityAnalyzer テスト
 *
 * @requirement REQ-012
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SecurityAnalyzer,
  Action,
  SecurityAnalysis,
  RiskLevel,
  SecurityError,
} from '../src';

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
  });

  describe('REQ-012-01: リスクレベル評価', () => {
    it('ファイル読み取りはlowリスク', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('low');
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('ネットワークリクエストはmediumリスク', () => {
      const action: Action = {
        type: 'network_request',
        name: 'fetch data',
        target: 'https://api.example.com/data',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('medium');
      expect(result.allowed).toBe(true);
    });

    it('コマンド実行はhighリスク', () => {
      const action: Action = {
        type: 'command_execute',
        name: 'run command',
        params: { command: 'ls -la' },
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('REQ-012-02: 確認が必要なアクション', () => {
    it('highリスクのアクションは確認が必要', () => {
      const action: Action = {
        type: 'command_execute',
        name: 'run command',
        params: { command: 'rm -rf /tmp/test' },
      };

      const result = analyzer.analyze(action);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.reasons).toContain('Risk level high requires confirmation');
    });

    it('lowリスクのアクションは確認不要', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
      };

      const result = analyzer.analyze(action);

      expect(result.requiresConfirmation).toBe(false);
    });
  });

  describe('REQ-012-03: 拒否パターンブロック', () => {
    it('.env ファイルはブロックされる', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read env',
        target: '/project/.env',
      };

      const result = analyzer.analyze(action);

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.blockReason).toContain('Environment files with secrets');
    });

    it('node_modules内のファイルはブロックされる', () => {
      const action: Action = {
        type: 'file_write',
        name: 'modify dependency',
        target: '/project/node_modules/lodash/index.js',
      };

      const result = analyzer.analyze(action);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('Dependencies should not be modified');
    });

    it('.git 内部ファイルはブロックされる', () => {
      const action: Action = {
        type: 'file_write',
        name: 'modify git',
        target: '/project/.git/config',
      };

      const result = analyzer.analyze(action);

      expect(result.allowed).toBe(false);
    });

    it('システム設定ファイルはブロックされる', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read system',
        target: '/etc/passwd',
      };

      const result = analyzer.analyze(action);

      expect(result.allowed).toBe(false);
    });
  });

  describe('REQ-012-04: 許可パターン', () => {
    it('Markdownファイルはlowリスク', () => {
      const action: Action = {
        type: 'file_write',
        name: 'write markdown',
        target: '/project/README.md',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('low');
      expect(result.allowed).toBe(true);
      expect(result.reasons).toContain('Matched allow pattern: **/*.md');
    });

    it('JSONファイルはlowリスク', () => {
      const action: Action = {
        type: 'file_write',
        name: 'write json',
        target: '/project/config.json',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('low');
      expect(result.allowed).toBe(true);
    });
  });

  describe('REQ-012-06: ファイル削除は高リスク', () => {
    it('ファイル削除はhighリスク', () => {
      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
      expect(result.matchedRules).toContain('file_delete_high_risk');
    });

    it('ディレクトリ削除もhighリスク', () => {
      const action: Action = {
        type: 'directory_delete',
        name: 'delete directory',
        target: '/tmp/test-dir',
      };

      const result = analyzer.analyze(action);

      expect(result.riskLevel).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('validateAction', () => {
    it('許可されるアクションは例外を投げない', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
      };

      expect(() => analyzer.validateAction(action)).not.toThrow();
    });

    it('ブロックされるアクションはACTION_BLOCKED例外', () => {
      const action: Action = {
        type: 'file_read',
        name: 'read env',
        target: '/project/.env',
      };

      expect(() => analyzer.validateAction(action)).toThrow(SecurityError);
      
      try {
        analyzer.validateAction(action);
      } catch (e) {
        expect((e as SecurityError).code).toBe('ACTION_BLOCKED');
      }
    });

    it('確認が必要なアクションはCONFIRMATION_REQUIRED例外', () => {
      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      expect(() => analyzer.validateAction(action)).toThrow(SecurityError);
      
      try {
        analyzer.validateAction(action);
      } catch (e) {
        expect((e as SecurityError).code).toBe('CONFIRMATION_REQUIRED');
      }
    });
  });

  describe('validateActionWithConfirmation', () => {
    it('確認済みのhighリスクアクションは許可', () => {
      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      expect(() => analyzer.validateActionWithConfirmation(action, true)).not.toThrow();
    });

    it('未確認のhighリスクアクションはCONFIRMATION_DENIED例外', () => {
      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      expect(() => analyzer.validateActionWithConfirmation(action, false)).toThrow(SecurityError);
      
      try {
        analyzer.validateActionWithConfirmation(action, false);
      } catch (e) {
        expect((e as SecurityError).code).toBe('CONFIRMATION_DENIED');
      }
    });
  });

  describe('カスタムポリシー', () => {
    it('カスタム拒否パターンを追加できる', () => {
      const customAnalyzer = new SecurityAnalyzer({
        policy: {
          denyPatterns: [
            { pattern: '**/secret/**', description: 'Custom secret directory' },
          ],
        },
      });

      const action: Action = {
        type: 'file_read',
        name: 'read secret',
        target: '/project/secret/data.txt',
      };

      const result = customAnalyzer.analyze(action);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('Custom secret directory');
    });

    it('カスタムリスクルールを追加できる', () => {
      const customAnalyzer = new SecurityAnalyzer({
        additionalRules: [
          {
            name: 'custom_browser_rule',
            description: 'Browser navigation is high risk',
            match: { actionTypes: ['browser_navigate'] },
            riskLevel: 'high',
          },
        ],
      });

      const action: Action = {
        type: 'browser_navigate',
        name: 'navigate',
        target: 'https://example.com',
      };

      const result = customAnalyzer.analyze(action);

      expect(result.riskLevel).toBe('high');
      expect(result.matchedRules).toContain('custom_browser_rule');
    });

    it('ビルトインルールを無効化できる', () => {
      const customAnalyzer = new SecurityAnalyzer({
        useBuiltinRules: false,
      });

      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      const result = customAnalyzer.analyze(action);

      // ビルトインルールがないのでlowリスク
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('ポリシー管理', () => {
    it('ポリシーを取得できる', () => {
      const policy = analyzer.getPolicy();

      expect(policy.allowPatterns).toBeDefined();
      expect(policy.denyPatterns).toBeDefined();
      expect(policy.requireConfirmation).toContain('high');
    });

    it('リスクルールを取得できる', () => {
      const rules = analyzer.getRiskRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.find((r) => r.name === 'file_delete_high_risk')).toBeDefined();
    });

    it('ポリシーを更新できる', () => {
      analyzer.updatePolicy({
        maxRiskLevel: 'high',
      });

      const policy = analyzer.getPolicy();
      expect(policy.maxRiskLevel).toBe('high');
    });
  });
});
