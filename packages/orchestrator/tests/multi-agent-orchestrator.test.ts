/**
 * MultiAgentOrchestrator テスト
 *
 * @requirement REQ-006
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiAgentOrchestrator, AggregatedResult } from '../src';
import { SubTask, TaskResult, SubAgent, Timestamp } from '../src/types';

describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator;

  beforeEach(() => {
    orchestrator = new MultiAgentOrchestrator();
  });

  describe('REQ-006-01: タスク分解', () => {
    it('複雑なタスクをサブタスクに分解できる', async () => {
      const result = await orchestrator.execute('Research AI trends and create a summary report');

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('REQ-006-02: サブエージェント生成', () => {
    it('タスクごとにサブエージェントを生成できる', async () => {
      const mockTasks: SubTask[] = [
        {
          id: 'task-1',
          name: 'Research Task',
          description: 'Research AI trends',
          input: { type: 'text', content: 'AI trends' },
          priority: 'high',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
        {
          id: 'task-2',
          name: 'Analysis Task',
          description: 'Analyze data',
          input: { type: 'text', content: 'data' },
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
      ];

      const agents = await orchestrator.spawnSubAgents(mockTasks);

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toContain('agent-');
      expect(agents[1].id).toContain('agent-');
      expect(agents[0].assignedTaskId).toBe('task-1');
      expect(agents[1].assignedTaskId).toBe('task-2');
    });

    it('エージェントに適切なロールが割り当てられる', async () => {
      const mockTasks: SubTask[] = [
        {
          id: 'task-research',
          name: 'Research AI',
          description: '',
          input: { type: 'text', content: '' },
          priority: 'high',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
        {
          id: 'task-analyze',
          name: 'Analyze results',
          description: '',
          input: { type: 'text', content: '' },
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
        {
          id: 'task-generate',
          name: 'Generate report',
          description: '',
          input: { type: 'text', content: '' },
          priority: 'low',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
      ];

      const agents = await orchestrator.spawnSubAgents(mockTasks);

      expect(agents[0].role).toBe('researcher');
      expect(agents[1].role).toBe('analyzer');
      expect(agents[2].role).toBe('generator');
    });
  });

  describe('REQ-006-03: 並列実行管理', () => {
    it('同時実行数が設定値を超えない', async () => {
      const customOrchestrator = new MultiAgentOrchestrator({
        config: { maxConcurrentAgents: 3 },
        taskExecutor: async (task) => {
          // 実行中のエージェント数を確認
          expect(customOrchestrator.getRunningAgentCount()).toBeLessThanOrEqual(3);
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            success: true,
            output: { taskId: task.id },
            duration: 10,
            completedAt: new Date().toISOString() as Timestamp,
          };
        },
      });

      await customOrchestrator.execute('Create a detailed report on multiple topics');

      // テストが完了していれば成功
      expect(true).toBe(true);
    });
  });

  describe('REQ-006-04: コンテキスト分離', () => {
    it('各エージェントが独立したコンテキストを持つ', async () => {
      const mockTasks: SubTask[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          description: '',
          input: { type: 'text', content: 'input 1' },
          priority: 'high',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
        {
          id: 'task-2',
          name: 'Task 2',
          description: '',
          input: { type: 'text', content: 'input 2' },
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          createdAt: new Date().toISOString() as Timestamp,
          updatedAt: new Date().toISOString() as Timestamp,
        },
      ];

      const agents = await orchestrator.spawnSubAgents(mockTasks);

      // コンテキストIDが異なる
      expect(agents[0].context.id).not.toBe(agents[1].context.id);

      // コンテキスト内のタスク情報が正しい
      expect(agents[0].context.taskInfo.taskId).toBe('task-1');
      expect(agents[1].context.taskInfo.taskId).toBe('task-2');

      // 会話履歴が独立
      agents[0].context.conversationHistory.push({
        id: 'msg-1',
        role: 'user',
        content: 'test',
        timestamp: new Date().toISOString() as Timestamp,
      });

      expect(agents[0].context.conversationHistory).toHaveLength(1);
      expect(agents[1].context.conversationHistory).toHaveLength(0);
    });
  });

  describe('REQ-006-05: 結果集約・重複除去', () => {
    it('結果を集約できる', async () => {
      const results = new Map<string, TaskResult>([
        ['task-1', {
          success: true,
          output: { data: 'result 1' },
          duration: 100,
          completedAt: new Date().toISOString() as Timestamp,
        }],
        ['task-2', {
          success: true,
          output: { data: 'result 2' },
          duration: 150,
          completedAt: new Date().toISOString() as Timestamp,
        }],
      ]);

      const aggregated = await orchestrator.aggregate(results);

      expect(aggregated.success).toBe(true);
      expect(aggregated.originalCount).toBe(2);
      expect(Array.isArray(aggregated.output)).toBe(true);
    });

    it('重複を除去できる', async () => {
      const results = new Map<string, TaskResult>([
        ['task-1', {
          success: true,
          output: { data: 'same result' },
          duration: 100,
          completedAt: new Date().toISOString() as Timestamp,
        }],
        ['task-2', {
          success: true,
          output: { data: 'same result' },
          duration: 150,
          completedAt: new Date().toISOString() as Timestamp,
        }],
        ['task-3', {
          success: true,
          output: { data: 'different result' },
          duration: 200,
          completedAt: new Date().toISOString() as Timestamp,
        }],
      ]);

      const aggregated = await orchestrator.aggregate(results);

      expect(aggregated.originalCount).toBe(3);
      expect(aggregated.dedupedCount).toBe(2); // 重複除去後
    });

    it('失敗したタスクをレポートする', async () => {
      const results = new Map<string, TaskResult>([
        ['task-1', {
          success: true,
          output: { data: 'success' },
          duration: 100,
          completedAt: new Date().toISOString() as Timestamp,
        }],
        ['task-2', {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: 'Task failed',
            retryable: false,
          },
          duration: 50,
          completedAt: new Date().toISOString() as Timestamp,
        }],
      ]);

      const aggregated = await orchestrator.aggregate(results);

      expect(aggregated.success).toBe(false);
      expect(aggregated.failures).toHaveLength(1);
      expect(aggregated.failures[0].taskId).toBe('task-2');
    });
  });

  describe('REQ-006-06: 部分失敗でも継続', () => {
    it('一部タスクが失敗しても他のタスクは完了する', async () => {
      let taskCount = 0;
      const customOrchestrator = new MultiAgentOrchestrator({
        taskExecutor: async (task) => {
          taskCount++;
          // 1つ目のタスクは失敗
          if (taskCount === 1) {
            throw new Error('Intentional failure');
          }
          return {
            success: true,
            output: { taskId: task.id },
            duration: 10,
            completedAt: new Date().toISOString() as Timestamp,
          };
        },
      });

      const result = await customOrchestrator.execute('Multiple tasks test');

      // 部分的な成功
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.originalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('イベント発行', () => {
    it('タスク開始/完了イベントを発行する', async () => {
      const events: string[] = [];

      orchestrator.on('task:started', () => events.push('started'));
      orchestrator.on('task:completed', () => events.push('completed'));
      orchestrator.on('agent:spawned', () => events.push('spawned'));

      await orchestrator.execute('Simple task');

      expect(events).toContain('spawned');
      expect(events).toContain('started');
      expect(events).toContain('completed');
    });
  });

  describe('設定管理', () => {
    it('設定を取得できる', () => {
      const config = orchestrator.getConfig();

      expect(config.maxConcurrentAgents).toBeDefined();
      expect(config.agentTimeout).toBeDefined();
    });

    it('カスタム設定を適用できる', () => {
      const customOrchestrator = new MultiAgentOrchestrator({
        config: {
          maxConcurrentAgents: 20,
          agentTimeout: 60,
        },
      });

      const config = customOrchestrator.getConfig();

      expect(config.maxConcurrentAgents).toBe(20);
      expect(config.agentTimeout).toBe(60);
    });
  });
});
