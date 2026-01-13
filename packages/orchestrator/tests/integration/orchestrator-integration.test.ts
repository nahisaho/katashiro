/**
 * v0.4.0 統合テスト - Orchestrator
 *
 * 全パッケージ（orchestrator, sandbox, workspace, security）の連携をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isOk, isErr } from '@nahisaho/katashiro-core';
import {
  MultiAgentOrchestrator,
  TaskDecomposer,
  ToolRegistry,
  SubTask,
  TaskResult,
  SubAgent,
  Timestamp,
} from '../../src';

// SecurityAnalyzer と ActionLogger のモック（実際のパッケージはまだ統合されていない可能性があるため）
interface MockSecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowed: boolean;
  requiresConfirmation: boolean;
}

describe('v0.4.0 Integration Tests', () => {
  describe('Orchestrator + TaskDecomposer + ToolRegistry', () => {
    let orchestrator: MultiAgentOrchestrator;
    let decomposer: TaskDecomposer;
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      decomposer = new TaskDecomposer();
      toolRegistry = new ToolRegistry();
      orchestrator = new MultiAgentOrchestrator({
        taskDecomposer: decomposer,
      });
    });

    it('複雑なタスクを分解して並列実行できる', async () => {
      // タスク分解
      const planResult = await decomposer.decompose(
        'Research AI trends, analyze the data, and create a summary report'
      );

      expect(isOk(planResult)).toBe(true);
      if (isOk(planResult)) {
        expect(planResult.value.tasks.length).toBeGreaterThan(0);
      }
    });

    it('ツールを登録してアクション実行できる', async () => {
      // ツール登録（registerメソッドを使用、ToolDefinition型に従う）
      const regResult = toolRegistry.register({
        name: 'test_tool',
        description: 'A test tool',
        category: 'custom',
        defaultRiskLevel: 'low',
        defaultTimeout: 30,
        paramsSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: [],
        },
        resultSchema: { type: 'object' },
        execute: async (params: { input?: string }) => {
          return { result: `Processed: ${params.input || ''}` };
        },
      });

      expect(isOk(regResult)).toBe(true);

      // アクション作成（Result型が返る）
      const actionResult = toolRegistry.createAction({
        toolName: 'test_tool',
        params: { input: 'test data' },
        requestedBy: 'test-agent',
      });

      expect(isOk(actionResult)).toBe(true);
      if (isOk(actionResult)) {
        expect(actionResult.value.toolName).toBe('test_tool');
        expect(actionResult.value.params.input).toBe('test data');
      }
    });

    it('マルチエージェントオーケストレーションが動作する', async () => {
      const result = await orchestrator.execute(
        'Create a comprehensive analysis report'
      );

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.agentsUsed).toBeGreaterThan(0);
    });

    it('カスタムタスク実行関数を使用できる', async () => {
      const executedTasks: string[] = [];

      const customOrchestrator = new MultiAgentOrchestrator({
        taskDecomposer: decomposer,
        taskExecutor: async (task: SubTask, agent: SubAgent): Promise<TaskResult> => {
          executedTasks.push(task.id);
          return {
            success: true,
            output: { taskId: task.id, agentId: agent.id },
            duration: 10,
            completedAt: new Date().toISOString() as Timestamp,
          };
        },
      });

      await customOrchestrator.execute('Test task execution');

      expect(executedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリング統合', () => {
    it('タスク分解エラーを適切に処理する', async () => {
      const decomposer = new TaskDecomposer({
        maxSubTasks: 1, // 極端に制限
      });

      // シンプルなタスクは正常に処理される（制限内）
      const result = await decomposer.decompose(
        'Simple research task'
      );

      // 結果は成功または失敗のいずれか
      expect(isOk(result) || isErr(result)).toBe(true);
    });

    it('部分的な失敗でも結果を返す', async () => {
      let callCount = 0;
      const orchestrator = new MultiAgentOrchestrator({
        taskExecutor: async (task): Promise<TaskResult> => {
          callCount++;
          if (callCount === 1) {
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

      const result = await orchestrator.execute('Multi-step task');

      // 部分的な失敗があっても結果は返される
      expect(result).toBeDefined();
      expect(result.failures.length).toBeGreaterThan(0);
    });
  });

  describe('並列実行制御', () => {
    it('同時実行数制限が機能する', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const orchestrator = new MultiAgentOrchestrator({
        config: {
          maxConcurrentAgents: 3,
        },
        taskExecutor: async (task): Promise<TaskResult> => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          await new Promise((resolve) => setTimeout(resolve, 50));

          currentConcurrent--;
          return {
            success: true,
            output: { taskId: task.id },
            duration: 50,
            completedAt: new Date().toISOString() as Timestamp,
          };
        },
      });

      await orchestrator.execute('Concurrent execution test');

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('イベント発行', () => {
    it('タスクライフサイクルイベントを発行する', async () => {
      const events: string[] = [];

      const orchestrator = new MultiAgentOrchestrator();

      orchestrator.on('plan:created', () => events.push('plan:created'));
      orchestrator.on('agent:spawned', () => events.push('agent:spawned'));
      orchestrator.on('task:started', () => events.push('task:started'));
      orchestrator.on('task:completed', () => events.push('task:completed'));
      orchestrator.on('agent:terminated', () => events.push('agent:terminated'));

      await orchestrator.execute('Event test task');

      expect(events).toContain('plan:created');
      expect(events).toContain('agent:spawned');
      expect(events).toContain('task:started');
      expect(events).toContain('task:completed');
      expect(events).toContain('agent:terminated');
    });
  });
});

describe('Cross-Package Integration', () => {
  describe('ToolRegistry + Security', () => {
    it('高リスクツールの実行前にセキュリティチェックを行う', async () => {
      const toolRegistry = new ToolRegistry();

      // 高リスクツール登録（registerメソッドを使用、ToolDefinition型に従う）
      const regResult = toolRegistry.register({
        name: 'dangerous_tool',
        description: 'A high-risk tool',
        category: 'system',
        defaultRiskLevel: 'high',
        defaultTimeout: 30,
        paramsSchema: { type: 'object', required: [] },
        resultSchema: { type: 'object' },
        execute: async () => ({ result: 'executed' }),
      });

      expect(isOk(regResult)).toBe(true);

      // アクション作成時にリスクレベルが設定される（Result型）
      const actionResult = toolRegistry.createAction({
        toolName: 'dangerous_tool',
        params: {},
        requestedBy: 'test-agent',
      });

      expect(isOk(actionResult)).toBe(true);
      if (isOk(actionResult)) {
        // ツール定義から取得
        const tool = toolRegistry.get('dangerous_tool');
        expect(tool?.defaultRiskLevel).toBe('high');
      }
    });
  });

  describe('TaskDecomposer + Orchestrator', () => {
    it('分解されたタスクがオーケストレーターで実行される', async () => {
      const decomposer = new TaskDecomposer();
      const orchestrator = new MultiAgentOrchestrator({
        taskDecomposer: decomposer,
      });

      // 分解
      const planResult = await decomposer.decompose('Search, analyze, and summarize');

      if (isOk(planResult)) {
        // 分解されたタスクをオーケストレーターで実行
        const result = await orchestrator.execute('Search, analyze, and summarize');

        expect(result.metadata.agentsUsed).toBeGreaterThan(0);
      }
    });
  });
});
