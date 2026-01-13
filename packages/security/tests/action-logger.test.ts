/**
 * ActionLogger テスト
 *
 * @requirement REQ-012-05
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActionLogger,
  InMemoryLogStorage,
  Action,
  SecurityAnalysis,
  Observation,
} from '../src';

describe('ActionLogger', () => {
  let logger: ActionLogger;

  beforeEach(() => {
    logger = new ActionLogger();
  });

  describe('REQ-012-05: アクションログ記録', () => {
    it('アクションをログに記録できる', async () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
        context: { userId: 'user-1' },
      };

      const analysis: SecurityAnalysis = {
        riskLevel: 'low',
        reasons: ['File read is safe'],
        requiresConfirmation: false,
        allowed: true,
        matchedRules: ['file_read_low_risk'],
      };

      const logId = await logger.logAction(action, analysis);

      expect(logId).toBeTruthy();
      expect(logId).toMatch(/^log-/);
    });

    it('タイムスタンプが記録される', async () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
      };

      const analysis: SecurityAnalysis = {
        riskLevel: 'low',
        reasons: [],
        requiresConfirmation: false,
        allowed: true,
        matchedRules: [],
      };

      await logger.logAction(action, analysis);

      const logs = await logger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('実行結果を記録できる', async () => {
      const action: Action = {
        type: 'file_read',
        name: 'read file',
        target: '/tmp/test.txt',
      };

      const analysis: SecurityAnalysis = {
        riskLevel: 'low',
        reasons: [],
        requiresConfirmation: false,
        allowed: true,
        matchedRules: [],
      };

      const observation: Observation = {
        success: true,
        data: 'file content',
        duration: 50,
      };

      await logger.logAction(action, analysis, observation);

      const logs = await logger.getRecentLogs(1);
      expect(logs[0].observation).toBeDefined();
      expect(logs[0].observation?.success).toBe(true);
      expect(logs[0].observation?.duration).toBe(50);
    });

    it('ユーザー確認を記録できる', async () => {
      const action: Action = {
        type: 'file_delete',
        name: 'delete file',
        target: '/tmp/test.txt',
      };

      const analysis: SecurityAnalysis = {
        riskLevel: 'high',
        reasons: ['File deletion is high risk'],
        requiresConfirmation: true,
        allowed: true,
        matchedRules: ['file_delete_high_risk'],
      };

      const observation: Observation = {
        success: true,
        duration: 10,
      };

      const userConfirmation = {
        confirmed: true,
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'user-1',
        comment: 'Approved',
      };

      await logger.logAction(action, analysis, observation, userConfirmation);

      const logs = await logger.getRecentLogs(1);
      expect(logs[0].userConfirmation).toBeDefined();
      expect(logs[0].userConfirmation?.confirmed).toBe(true);
      expect(logs[0].userConfirmation?.confirmedBy).toBe('user-1');
    });
  });

  describe('ログ検索', () => {
    beforeEach(async () => {
      // テストデータを準備
      const actions: { action: Action; analysis: SecurityAnalysis; observation?: Observation }[] = [
        {
          action: {
            type: 'file_read',
            name: 'read file 1',
            target: '/tmp/test1.txt',
            context: { userId: 'user-1' },
          },
          analysis: {
            riskLevel: 'low',
            reasons: [],
            requiresConfirmation: false,
            allowed: true,
            matchedRules: [],
          },
          observation: { success: true, duration: 10 },
        },
        {
          action: {
            type: 'file_delete',
            name: 'delete file',
            target: '/tmp/test2.txt',
            context: { userId: 'user-2' },
          },
          analysis: {
            riskLevel: 'high',
            reasons: ['File deletion'],
            requiresConfirmation: true,
            allowed: true,
            matchedRules: ['file_delete_high_risk'],
          },
          observation: { success: false, error: 'Permission denied', duration: 5 },
        },
        {
          action: {
            type: 'network_request',
            name: 'fetch data',
            target: 'https://api.example.com',
            context: { userId: 'user-1' },
          },
          analysis: {
            riskLevel: 'medium',
            reasons: [],
            requiresConfirmation: false,
            allowed: true,
            matchedRules: [],
          },
          observation: { success: true, duration: 100 },
        },
      ];

      for (const { action, analysis, observation } of actions) {
        await logger.logAction(action, analysis, observation);
      }
    });

    it('アクションタイプでフィルターできる', async () => {
      const logs = await logger.queryLogs({ actionTypes: ['file_delete'] });

      expect(logs.length).toBe(1);
      expect(logs[0].action.type).toBe('file_delete');
    });

    it('リスクレベルでフィルターできる', async () => {
      const logs = await logger.queryLogs({ minRiskLevel: 'high' });

      expect(logs.length).toBe(1);
      expect(logs[0].analysis.riskLevel).toBe('high');
    });

    it('成功/失敗でフィルターできる', async () => {
      const successLogs = await logger.queryLogs({ success: true });
      expect(successLogs.length).toBe(2);

      const failureLogs = await logger.queryLogs({ success: false });
      expect(failureLogs.length).toBe(1);
    });

    it('ユーザーIDでフィルターできる', async () => {
      const logs = await logger.queryLogs({ userId: 'user-1' });

      expect(logs.length).toBe(2);
      expect(logs.every((l) => l.action.context?.userId === 'user-1')).toBe(true);
    });

    it('キーワードで検索できる', async () => {
      const logs = await logger.queryLogs({ keyword: 'Permission denied' });

      expect(logs.length).toBe(1);
      expect(logs[0].observation?.error).toContain('Permission denied');
    });

    it('件数制限ができる', async () => {
      const logs = await logger.queryLogs({ limit: 2 });

      expect(logs.length).toBe(2);
    });
  });

  describe('便利メソッド', () => {
    it('getRecentLogs - 最近のログを取得', async () => {
      await logger.logAction(
        { type: 'file_read', name: 'read' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      const logs = await logger.getRecentLogs(5);
      expect(logs.length).toBe(1);
    });

    it('getHighRiskLogs - 高リスクログを取得', async () => {
      await logger.logAction(
        { type: 'file_delete', name: 'delete' },
        { riskLevel: 'high', reasons: [], requiresConfirmation: true, allowed: true, matchedRules: [] }
      );

      const logs = await logger.getHighRiskLogs(5);
      expect(logs.length).toBe(1);
      expect(logs[0].analysis.riskLevel).toBe('high');
    });

    it('getUserLogs - ユーザーのログを取得', async () => {
      await logger.logAction(
        { type: 'file_read', name: 'read', context: { userId: 'test-user' } },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      const logs = await logger.getUserLogs('test-user');
      expect(logs.length).toBe(1);
    });

    it('getLogCount - ログ件数を取得', async () => {
      await logger.logAction(
        { type: 'file_read', name: 'read' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      const count = await logger.getLogCount();
      expect(count).toBe(1);
    });

    it('clearLogs - ログをクリア', async () => {
      await logger.logAction(
        { type: 'file_read', name: 'read' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      await logger.clearLogs();

      const count = await logger.getLogCount();
      expect(count).toBe(0);
    });
  });

  describe('サマリー生成', () => {
    beforeEach(async () => {
      // テストデータ
      await logger.logAction(
        { type: 'file_read', name: 'read 1' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] },
        { success: true, duration: 10 }
      );
      await logger.logAction(
        { type: 'file_read', name: 'read 2' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] },
        { success: true, duration: 20 }
      );
      await logger.logAction(
        { type: 'file_delete', name: 'delete' },
        { riskLevel: 'high', reasons: [], requiresConfirmation: true, allowed: true, matchedRules: [] },
        { success: false, error: 'Failed', duration: 5 }
      );
      await logger.logAction(
        { type: 'file_write', name: 'blocked write' },
        { riskLevel: 'critical', reasons: [], requiresConfirmation: false, allowed: false, blockReason: 'Blocked', matchedRules: [] }
      );
    });

    it('サマリーを生成できる', async () => {
      const summary = await logger.generateSummary();

      expect(summary.totalActions).toBe(4);
      expect(summary.byRiskLevel.low).toBe(2);
      expect(summary.byRiskLevel.high).toBe(1);
      expect(summary.byRiskLevel.critical).toBe(1);
      expect(summary.byActionType.file_read).toBe(2);
      expect(summary.byActionType.file_delete).toBe(1);
      expect(summary.successRate).toBeCloseTo(2 / 3);
      expect(summary.blockedCount).toBe(1);
    });
  });

  describe('InMemoryLogStorage', () => {
    it('最大件数を超えたら古いログが削除される', async () => {
      const storage = new InMemoryLogStorage(3);
      const customLogger = new ActionLogger({ storage });

      for (let i = 0; i < 5; i++) {
        await customLogger.logAction(
          { type: 'file_read', name: `read ${i}` },
          { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
        );
      }

      const logs = await customLogger.getRecentLogs(10);
      expect(logs.length).toBe(3);
    });

    it('カスタムID生成関数を使用できる', async () => {
      let counter = 0;
      const customLogger = new ActionLogger({
        generateId: () => `custom-${++counter}`,
      });

      const logId = await customLogger.logAction(
        { type: 'file_read', name: 'read' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      expect(logId).toBe('custom-1');
    });

    it('最小リスクレベル未満はログされない', async () => {
      const customLogger = new ActionLogger({
        minLogLevel: 'medium',
      });

      await customLogger.logAction(
        { type: 'file_read', name: 'read' },
        { riskLevel: 'low', reasons: [], requiresConfirmation: false, allowed: true, matchedRules: [] }
      );

      const count = await customLogger.getLogCount();
      expect(count).toBe(0);
    });
  });
});
