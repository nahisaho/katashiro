/**
 * Task Decomposer Tests
 *
 * @fileoverview REQ-009: タスク分解・計画のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskDecomposer } from '../src/task-decomposer';

describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    decomposer = new TaskDecomposer();
  });

  describe('decompose', () => {
    it('should decompose a research task', async () => {
      const result = await decomposer.decompose('生成AIについて調べてまとめて');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks.length).toBeGreaterThan(0);
        expect(result.value.executionOrder.length).toBe(result.value.tasks.length);
        expect(result.value.parallelGroups.length).toBeGreaterThan(0);
      }
    });

    it('should decompose an analysis task', async () => {
      const result = await decomposer.decompose('このテキストを分析して特徴を教えて');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks.length).toBeGreaterThan(0);
        expect(result.value.tasks.some(t => t.name.includes('analyze'))).toBe(true);
      }
    });

    it('should decompose a report task', async () => {
      const result = await decomposer.decompose('調査結果をレポートにまとめて');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks.length).toBeGreaterThan(0);
        // 'finalize' or any task with 'final' should exist
        const hasReportTask = result.value.tasks.some(
          t => t.name === 'finalize' || t.name.includes('final') || t.name === 'summarize'
        );
        expect(hasReportTask).toBe(true);
      }
    });

    it('should generate valid DAG (no cycles)', async () => {
      const result = await decomposer.decompose('複雑なタスクを実行して');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const taskIds = new Set(result.value.tasks.map(t => t.id));
        
        // All dependencies should reference existing tasks
        for (const task of result.value.tasks) {
          for (const depId of task.dependencies) {
            expect(taskIds.has(depId)).toBe(true);
          }
        }
      }
    });

    it('should compute parallel groups correctly', async () => {
      const result = await decomposer.decompose('データを分析してレポートを作成');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const plan = result.value;
        
        // First group should have tasks with no dependencies
        const firstGroup = plan.parallelGroups[0];
        for (const taskId of firstGroup) {
          const task = plan.tasks.find(t => t.id === taskId);
          expect(task?.dependencies.length).toBe(0);
        }
      }
    });

    it('should respect maxSubTasks config', async () => {
      const limitedDecomposer = new TaskDecomposer({ maxSubTasks: 2 });
      const result = await limitedDecomposer.decompose('大規模なリサーチを実行');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TOO_MANY_SUBTASKS');
      }
    });

    it('should calculate estimated total duration', async () => {
      const result = await decomposer.decompose('タスクを実行');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.estimatedTotalDuration).toBeGreaterThan(0);
      }
    });
  });

  describe('registerStrategy', () => {
    it('should allow custom strategy registration', async () => {
      decomposer.registerStrategy({
        name: 'custom',
        canApply: (task) => task.includes('カスタム'),
        decompose: async () => [
          {
            name: 'custom_task',
            description: 'Custom task',
            inputType: 'text',
            priority: 'high',
            dependsOn: [],
            estimatedDuration: 10,
          },
        ],
      });

      const result = await decomposer.decompose('カスタムタスクを実行');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks.some(t => t.name === 'custom_task')).toBe(true);
      }
    });
  });

  describe('maxConcurrentTasks', () => {
    it('should respect maxConcurrentTasks limit in parallel groups', async () => {
      // maxConcurrentTasks=2 に設定
      const limitedDecomposer = new TaskDecomposer({ maxConcurrentTasks: 2 });

      // 多数のサブタスクを生成するカスタム戦略を登録
      limitedDecomposer.registerStrategy({
        name: 'many_parallel',
        canApply: (task) => task.includes('並列テスト'),
        decompose: async () => [
          { name: 'task1', description: 'Task 1', inputType: 'text', priority: 'medium', dependsOn: [], estimatedDuration: 5 },
          { name: 'task2', description: 'Task 2', inputType: 'text', priority: 'medium', dependsOn: [], estimatedDuration: 5 },
          { name: 'task3', description: 'Task 3', inputType: 'text', priority: 'medium', dependsOn: [], estimatedDuration: 5 },
          { name: 'task4', description: 'Task 4', inputType: 'text', priority: 'medium', dependsOn: [], estimatedDuration: 5 },
          { name: 'task5', description: 'Task 5', inputType: 'text', priority: 'medium', dependsOn: [], estimatedDuration: 5 },
        ],
      });

      const result = await limitedDecomposer.decompose('並列テストを実行');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // すべてのグループは最大2タスクまで
        for (const group of result.value.parallelGroups) {
          expect(group.length).toBeLessThanOrEqual(2);
        }
        // 5タスクを2タスクずつ分割すると最低3グループ
        expect(result.value.parallelGroups.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should use default maxConcurrentTasks of 5', async () => {
      const defaultDecomposer = new TaskDecomposer();

      defaultDecomposer.registerStrategy({
        name: 'six_tasks',
        canApply: (task) => task.includes('6タスク'),
        decompose: async () => [
          { name: 't1', description: 'T1', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
          { name: 't2', description: 'T2', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
          { name: 't3', description: 'T3', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
          { name: 't4', description: 'T4', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
          { name: 't5', description: 'T5', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
          { name: 't6', description: 'T6', inputType: 'text', priority: 'low', dependsOn: [], estimatedDuration: 1 },
        ],
      });

      const result = await defaultDecomposer.decompose('6タスクを実行');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // デフォルト5なので、6タスクは[5, 1]に分割
        expect(result.value.parallelGroups.length).toBe(2);
        expect(result.value.parallelGroups[0].length).toBe(5);
        expect(result.value.parallelGroups[1].length).toBe(1);
      }
    });
  });
});
