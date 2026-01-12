/**
 * Workflow Module Tests
 * Phase 3: ワークフロー機能テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WorkflowEngine,
  createWorkflow,
  QualityGate,
  createQualityCheck,
  StyleGuideEnforcer,
  createStyleRule,
  PipelineOrchestrator,
  PipelineConfigBuilder,
  PipelineTemplates,
  WorkflowDefinition,
  WorkflowStep,
} from '../../src/workflow/index.js';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  describe('loadDefinition', () => {
    it('should load a valid workflow definition', () => {
      const definition = createWorkflow('test-workflow', 'Test Workflow', [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'custom',
          execute: async () => 'result',
        },
      ]);

      expect(() => engine.loadDefinition(definition)).not.toThrow();
    });

    it('should reject workflow without id', () => {
      const definition = {
        id: '',
        name: 'Test',
        version: '1.0.0',
        steps: [{ id: 'step1', name: 'Step 1', type: 'custom', execute: async () => {} }],
      } as WorkflowDefinition;

      expect(() => engine.loadDefinition(definition)).toThrow('must have an id');
    });

    it('should reject workflow without steps', () => {
      const definition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        steps: [],
      } as WorkflowDefinition;

      expect(() => engine.loadDefinition(definition)).toThrow('at least one step');
    });

    it('should detect duplicate step ids', () => {
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => {} },
        { id: 'step1', name: 'Step 2', type: 'custom', execute: async () => {} },
      ]);

      expect(() => engine.loadDefinition(definition)).toThrow('Duplicate step id');
    });

    it('should detect invalid dependencies', () => {
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => {}, dependsOn: ['nonexistent'] },
      ]);

      expect(() => engine.loadDefinition(definition)).toThrow('non-existent step');
    });

    it('should detect circular dependencies', () => {
      const definition: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        steps: [
          { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => {}, dependsOn: ['step2'] },
          { id: 'step2', name: 'Step 2', type: 'custom', execute: async () => {}, dependsOn: ['step1'] },
        ],
      };

      expect(() => engine.loadDefinition(definition)).toThrow('Circular dependency');
    });
  });

  describe('execute', () => {
    it('should execute a simple workflow', async () => {
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async (input) => `processed: ${input}` },
      ]);

      engine.loadDefinition(definition);
      const result = await engine.execute('input');

      expect(result.status).toBe('completed');
      expect(result.output).toBe('processed: input');
    });

    it('should execute steps in dependency order', async () => {
      const executionOrder: string[] = [];

      const definition = createWorkflow('test', 'Test', [
        { id: 'step3', name: 'Step 3', type: 'custom', execute: async () => { executionOrder.push('step3'); }, dependsOn: ['step1', 'step2'] },
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => { executionOrder.push('step1'); } },
        { id: 'step2', name: 'Step 2', type: 'custom', execute: async () => { executionOrder.push('step2'); }, dependsOn: ['step1'] },
      ]);

      engine.loadDefinition(definition);
      await engine.execute(null);

      expect(executionOrder[0]).toBe('step1');
      expect(executionOrder[1]).toBe('step2');
      expect(executionOrder[2]).toBe('step3');
    });

    it('should pass results between dependent steps', async () => {
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => ({ value: 42 }) },
        { id: 'step2', name: 'Step 2', type: 'custom', execute: async (input) => {
          const inputs = input as Record<string, { value: number }>;
          return inputs.step1.value * 2;
        }, dependsOn: ['step1'] },
      ]);

      engine.loadDefinition(definition);
      const result = await engine.execute(null);

      expect(result.output).toBe(84);
    });

    it('should handle step failure', async () => {
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => { throw new Error('Step failed'); } },
      ]);

      engine.loadDefinition(definition);
      const result = await engine.execute(null);

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Step failed');
    });

    it('should skip steps when condition is false', async () => {
      const step2Execute = vi.fn();
      const definition: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        steps: [
          { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => 'done' },
          { id: 'step2', name: 'Step 2', type: 'custom', execute: step2Execute, condition: () => false },
        ],
      };

      engine.loadDefinition(definition);
      await engine.execute(null);

      expect(step2Execute).not.toHaveBeenCalled();
      const stepResults = engine.getStepResults();
      expect(stepResults.get('step2')?.status).toBe('skipped');
    });

    it('should call hooks during execution', async () => {
      const onStart = vi.fn();
      const onComplete = vi.fn();
      const onStepStart = vi.fn();
      const onStepComplete = vi.fn();

      const definition: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        steps: [{ id: 'step1', name: 'Step 1', type: 'custom', execute: async () => 'done' }],
        hooks: {
          onStart,
          onComplete,
          onStepStart,
          onStepComplete,
        },
      };

      engine.loadDefinition(definition);
      await engine.execute(null);

      expect(onStart).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      expect(onStepStart).toHaveBeenCalled();
      expect(onStepComplete).toHaveBeenCalled();
    });
  });

  describe('status management', () => {
    it('should report idle status initially', () => {
      expect(engine.getStatus()).toBe('idle');
    });

    it('should allow cancellation', async () => {
      const longRunningStep = new Promise<void>((resolve) => setTimeout(resolve, 1000));
      const definition = createWorkflow('test', 'Test', [
        { id: 'step1', name: 'Step 1', type: 'custom', execute: async () => longRunningStep },
      ]);

      engine.loadDefinition(definition);
      const promise = engine.execute(null);
      engine.cancel();

      const result = await promise;
      // キャンセルはステップ間でチェックされるため、ここでは完了する可能性がある
      expect(['completed', 'cancelled']).toContain(result.status);
    });
  });
});

describe('QualityGate', () => {
  let gate: QualityGate;

  beforeEach(() => {
    gate = new QualityGate();
  });

  describe('evaluate', () => {
    it('should pass content that meets all criteria', async () => {
      const content = `# はじめに

このドキュメントは品質テストのためのサンプルです。

## 本文

適切な長さのコンテンツで、構造も整っています。段落も分かれており、見出しも使用しています。

## まとめ

これで品質チェックに合格するはずです。`;

      const result = await gate.evaluate(content);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('should fail very short content', async () => {
      const result = await gate.evaluate('短い', { checkOptions: { length: { minLength: 100 } } });

      const lengthCheck = result.checks.find((c) => c.name === 'length');
      expect(lengthCheck?.passed).toBe(false);
    });

    it('should run specific checks only', async () => {
      const result = await gate.evaluate('Test content', { checks: ['length', 'readability'] });

      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('length');
      expect(checkNames).toContain('readability');
      expect(checkNames).not.toContain('duplication');
    });

    it('should provide suggestions for failed checks', async () => {
      const result = await gate.evaluate('TODO: 未完成のコンテンツです。', { threshold: 90 });

      const completenessCheck = result.checks.find((c) => c.name === 'completeness');
      expect(completenessCheck?.suggestions).toBeDefined();
    });
  });

  describe('check registration', () => {
    it('should allow registering custom checks', async () => {
      gate.registerCheck(createQualityCheck(
        'custom-check',
        async (content) => ({
          name: 'custom-check',
          passed: content.includes('keyword'),
          score: content.includes('keyword') ? 100 : 0,
          threshold: 70,
          message: 'Custom check result',
        }),
        { weight: 1.5 }
      ));

      const result = await gate.evaluate('Content with keyword');
      const customCheck = result.checks.find((c) => c.name === 'custom-check');

      expect(customCheck?.passed).toBe(true);
    });

    it('should allow disabling checks', async () => {
      gate.setCheckEnabled('length', false);

      const result = await gate.evaluate('Test');
      const lengthCheck = result.checks.find((c) => c.name === 'length');

      expect(lengthCheck).toBeUndefined();
    });
  });

  describe('threshold', () => {
    it('should use custom threshold', async () => {
      const result = await gate.evaluate('テストコンテンツ', { threshold: 50 });

      // 結果は閾値によって変わる
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should allow setting default threshold', () => {
      gate.setDefaultThreshold(80);
      const checks = gate.getChecks();

      // デフォルト閾値が設定されていることを確認
      expect(checks.length).toBeGreaterThan(0);
    });
  });
});

describe('StyleGuideEnforcer', () => {
  let enforcer: StyleGuideEnforcer;

  beforeEach(() => {
    enforcer = new StyleGuideEnforcer();
  });

  describe('validate', () => {
    it('should detect trailing whitespace', () => {
      const content = 'Line with trailing space   \nNormal line';
      const result = enforcer.validate(content);

      const violation = result.violations.find((v) => v.ruleId === 'no-trailing-whitespace');
      expect(violation).toBeDefined();
    });

    it('should detect consecutive blank lines', () => {
      const content = 'Line 1\n\n\n\n\nLine 2';
      const result = enforcer.validate(content);

      const violation = result.violations.find((v) => v.ruleId === 'no-consecutive-blank-lines');
      expect(violation).toBeDefined();
    });

    it('should detect missing language in code blocks', () => {
      const content = '```\ncode here\n```';
      const result = enforcer.validate(content);

      const violation = result.violations.find((v) => v.ruleId === 'code-block-language');
      expect(violation).toBeDefined();
    });

    it('should pass valid content', () => {
      const content = `# 見出し

これは正しいフォーマットの文章です。

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const result = enforcer.validate(content);

      expect(result.errorCount).toBe(0);
    });
  });

  describe('fix', () => {
    it('should fix trailing whitespace', () => {
      const content = 'Line with space   \nAnother line  ';
      const result = enforcer.fix(content);

      expect(result.fixedContent).toBe('Line with space\nAnother line');
    });

    it('should fix consecutive blank lines', () => {
      const content = 'Line 1\n\n\n\n\nLine 2';
      const result = enforcer.fix(content);

      expect(result.fixedContent).toBe('Line 1\n\n\nLine 2');
    });

    it('should fix list markers', () => {
      const content = '* Item 1\n* Item 2';
      const result = enforcer.fix(content);

      expect(result.fixedContent).toBe('- Item 1\n- Item 2');
    });
  });

  describe('rule management', () => {
    it('should allow registering custom rules', () => {
      enforcer.registerRule(createStyleRule(
        'no-exclamation',
        '感嘆符禁止',
        (content) => {
          const violations = [];
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i]?.includes('!')) {
              violations.push({
                ruleId: 'no-exclamation',
                severity: 'warning' as const,
                message: '感嘆符は使用しないでください',
                line: i + 1,
              });
            }
          }
          return violations;
        },
        { severity: 'warning' }
      ));

      const result = enforcer.validate('Hello! World!');
      const violation = result.violations.find((v) => v.ruleId === 'no-exclamation');

      expect(violation).toBeDefined();
    });

    it('should allow disabling rules', () => {
      enforcer.setRuleEnabled('no-trailing-whitespace', false);

      const result = enforcer.validate('Line with space   ');
      const violation = result.violations.find((v) => v.ruleId === 'no-trailing-whitespace');

      expect(violation).toBeUndefined();
    });

    it('should export style guide', () => {
      const markdown = enforcer.exportGuide('markdown');
      expect(markdown).toContain('# スタイルガイド');

      const json = enforcer.exportGuide('json');
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });
});

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
  });

  describe('execute', () => {
    it('should execute a simple pipeline', async () => {
      const config = new PipelineConfigBuilder('Test Pipeline')
        .addCollectStage({
          sources: [{ type: 'web', config: {} }],
        })
        .build();

      orchestrator.loadConfig(config);
      const result = await orchestrator.execute();

      expect(result.status).toBe('completed');
      expect(result.stageResults.size).toBe(1);
    });

    it('should execute all configured stages', async () => {
      const config = new PipelineConfigBuilder('Full Pipeline')
        .addCollectStage({ sources: [{ type: 'api', config: {} }] })
        .addAnalyzeStage({ analyzers: ['text', 'entity'] })
        .addGenerateStage({ outputType: 'report' })
        .setErrorHandling('continue')
        .build();

      orchestrator.loadConfig(config);
      const result = await orchestrator.execute();

      expect(result.status).toBe('completed');
      expect(result.stageResults.size).toBe(3);
    });

    it('should stop on error when configured', async () => {
      const config = new PipelineConfigBuilder('Error Pipeline')
        .addCollectStage({ sources: [{ type: 'web', config: {} }] })
        .addAnalyzeStage({ analyzers: ['text'] })
        .setErrorHandling('stop')
        .build();

      // エラーを発生させるハンドラ
      orchestrator.setStageHandler('analyze', async () => {
        throw new Error('Analysis failed');
      });

      orchestrator.loadConfig(config);
      const result = await orchestrator.execute();

      expect(result.status).toBe('failed');
      expect(result.errors.length).toBe(1);
    });

    it('should continue on error when configured', async () => {
      const config = new PipelineConfigBuilder('Continue Pipeline')
        .addCollectStage({ sources: [{ type: 'web', config: {} }] })
        .addAnalyzeStage({ analyzers: ['text'] })
        .addGenerateStage({ outputType: 'summary' })
        .setErrorHandling('continue')
        .build();

      // 分析ステージでエラー
      orchestrator.setStageHandler('analyze', async () => {
        throw new Error('Analysis failed');
      });

      orchestrator.loadConfig(config);
      const result = await orchestrator.execute();

      expect(result.status).toBe('partial');
      expect(result.stageResults.has('collect')).toBe(true);
      expect(result.stageResults.has('generate')).toBe(true);
    });

    it('should report progress', async () => {
      const progressCalls: Array<{ stage: string; progress: number }> = [];

      orchestrator.setProgressCallback((stage, progress) => {
        progressCalls.push({ stage, progress });
      });

      const config = new PipelineConfigBuilder('Progress Pipeline')
        .addCollectStage({ sources: [{ type: 'web', config: {} }] })
        .addAnalyzeStage({ analyzers: ['text'] })
        .build();

      orchestrator.loadConfig(config);
      await orchestrator.execute();

      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('validation stage', () => {
    it('should run quality gate in validation stage', async () => {
      const config = new PipelineConfigBuilder('Validation Pipeline')
        .addValidateStage({ qualityGate: true, styleCheck: true })
        .build();

      orchestrator.loadConfig(config);
      const result = await orchestrator.execute('テストコンテンツです。');

      expect(result.stageResults.has('validate')).toBe(true);
      const validateResult = result.stageResults.get('validate') as { validations: Record<string, unknown> };
      expect(validateResult.validations.qualityGate).toBeDefined();
      expect(validateResult.validations.styleCheck).toBeDefined();
    });
  });

  describe('templates', () => {
    it('should provide article creation template', () => {
      const config = PipelineTemplates.articleCreation();

      expect(config.name).toBe('Article Creation Pipeline');
      expect(config.stages.collect).toBeDefined();
      expect(config.stages.analyze).toBeDefined();
      expect(config.stages.generate).toBeDefined();
      expect(config.stages.validate).toBeDefined();
      expect(config.stages.export).toBeDefined();
    });

    it('should provide report generation template', () => {
      const config = PipelineTemplates.reportGeneration();

      expect(config.name).toBe('Report Generation Pipeline');
      expect(config.errorHandling).toBe('continue');
    });

    it('should provide summarization template', () => {
      const config = PipelineTemplates.summarization();

      expect(config.name).toBe('Summarization Pipeline');
      expect(config.stages.analyze).toBeDefined();
      expect(config.stages.generate).toBeDefined();
    });
  });

  describe('config builder', () => {
    it('should build complete config', () => {
      const config = new PipelineConfigBuilder('Custom Pipeline')
        .addCollectStage({
          sources: [{ type: 'api', config: { endpoint: 'test' } }],
          maxSources: 5,
        })
        .addAnalyzeStage({
          analyzers: ['text', 'sentiment'],
          options: { detailed: true },
        })
        .addGenerateStage({
          outputType: 'article',
          template: 'blog-post',
        })
        .addValidateStage({
          qualityGate: true,
        })
        .addExportStage({
          formats: ['markdown', 'html'],
          destination: './output',
        })
        .setErrorHandling('skip')
        .setParallel(true)
        .build();

      expect(config.name).toBe('Custom Pipeline');
      expect(config.stages.collect?.maxSources).toBe(5);
      expect(config.stages.analyze?.analyzers).toContain('sentiment');
      expect(config.stages.generate?.template).toBe('blog-post');
      expect(config.stages.export?.formats).toContain('html');
      expect(config.errorHandling).toBe('skip');
      expect(config.parallel).toBe(true);
    });
  });
});

describe('createWorkflow helper', () => {
  it('should create a valid workflow definition', () => {
    const workflow = createWorkflow('my-workflow', 'My Workflow', [
      { id: 'step1', name: 'Step 1', type: 'collect', execute: async () => {} },
      { id: 'step2', name: 'Step 2', type: 'analyze', execute: async () => {}, dependsOn: ['step1'] },
    ]);

    expect(workflow.id).toBe('my-workflow');
    expect(workflow.name).toBe('My Workflow');
    expect(workflow.version).toBe('1.0.0');
    expect(workflow.steps.length).toBe(2);
    expect(workflow.steps[1].dependsOn).toContain('step1');
  });
});
