# @nahisaho/katashiro-orchestrator

> Task decomposition, planning, and multi-agent orchestration for KATASHIRO

## Features

- **Task Decomposition (REQ-009)**: Automatically decompose complex tasks into subtasks with DAG-based dependency management
- **Action-Observation Pattern (REQ-010)**: Type-safe tool system with risk assessment and approval workflow
- **Multi-Agent Orchestration (REQ-006)**: Spawn independent sub-agents with isolated contexts

## Installation

```bash
npm install @nahisaho/katashiro-orchestrator
```

## Quick Start

### Task Decomposition

```typescript
import { TaskDecomposer } from '@nahisaho/katashiro-orchestrator';

const decomposer = new TaskDecomposer({
  maxSubTasks: 50,
  allowParallel: true,
});

// Decompose a complex task
const result = await decomposer.decompose('生成AIの企業活用について調べてレポートにまとめて');

if (result.ok) {
  const plan = result.value;
  console.log('Execution Plan:', plan.name);
  console.log('Subtasks:', plan.tasks.length);
  console.log('Parallel Groups:', plan.parallelGroups.length);
  console.log('Estimated Duration:', plan.estimatedTotalDuration, 'seconds');
}
```

### Tool Registry

```typescript
import { ToolRegistry, type ToolDefinition } from '@nahisaho/katashiro-orchestrator';

const registry = new ToolRegistry({
  enableRiskAssessment: true,
  approvalRequiredLevel: 'critical',
});

// Register a tool
const searchTool: ToolDefinition<{ query: string }, { results: string[] }> = {
  name: 'web_search',
  description: 'Search the web for information',
  category: 'network',
  paramsSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  resultSchema: {
    type: 'object',
    properties: {
      results: { type: 'array', items: { type: 'string' } },
    },
  },
  defaultRiskLevel: 'low',
  defaultTimeout: 30,
  execute: async (params, context) => {
    context.logger.info('Searching for:', params.query);
    // Implementation...
    return { results: ['result1', 'result2'] };
  },
};

registry.register(searchTool);

// Create and execute an action
const actionResult = registry.createAction({
  toolName: 'web_search',
  params: { query: 'KATASHIRO' },
  requestedBy: 'agent-001',
});

if (actionResult.ok) {
  const observation = await registry.execute(actionResult.value);
  console.log('Observation:', observation);
}
```

## API Reference

### TaskDecomposer

#### Constructor

```typescript
new TaskDecomposer(config?: Partial<DecompositionConfig>)
```

| Config Option | Type | Default | Description |
|--------------|------|---------|-------------|
| maxSubTasks | number | 50 | Maximum number of subtasks |
| minTaskGranularity | number | 5 | Minimum task duration (seconds) |
| maxDependencyDepth | number | 10 | Maximum dependency depth |
| allowParallel | boolean | true | Allow parallel execution |

#### Methods

- `decompose(task: string, context?: Record<string, unknown>): Promise<Result<ExecutionPlan, DecompositionError>>`
- `registerStrategy(strategy: DecompositionStrategy): void`

### ToolRegistry

#### Constructor

```typescript
new ToolRegistry(config?: Partial<ToolRegistryConfig>)
```

| Config Option | Type | Default | Description |
|--------------|------|---------|-------------|
| allowUnregistered | boolean | false | Allow unregistered tools |
| defaultTimeout | number | 30 | Default timeout (seconds) |
| enforceSchemaValidation | boolean | true | Enforce schema validation |
| enableRiskAssessment | boolean | true | Enable risk assessment |
| approvalRequiredLevel | RiskLevel | 'critical' | Risk level requiring approval |

#### Methods

- `register<TParams, TResult>(tool: ToolDefinition<TParams, TResult>): Result<void, ToolRegistryError>`
- `createAction<TParams>(options: CreateActionOptions<TParams>): Result<Action<TParams>, ToolRegistryError>`
- `execute<TParams, TResult>(action: Action<TParams>, signal?: AbortSignal): Promise<Result<Observation<TResult>, ToolRegistryError>>`
- `assessRisk(action: Action): SecurityAssessment`

## EARS Requirements Coverage

This package implements the following EARS requirements:

| Requirement | Pattern | Implementation |
|------------|---------|----------------|
| REQ-009 | Event-Driven | TaskDecomposer.decompose() |
| REQ-009 | Ubiquitous | ExecutionPlan DAG structure |
| REQ-010 | Event-Driven | ToolRegistry.execute() |
| REQ-010 | Unwanted | Risk assessment and approval |
| REQ-006 | State-Driven | AgentContext isolation |

## License

MIT
