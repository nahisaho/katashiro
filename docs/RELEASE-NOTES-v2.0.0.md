# KATASHIRO v2.0.0 Release Notes

Release Date: 2026-01-14

## Overview

KATASHIRO v2.0.0は、AI/LLMアプリケーション開発のための3つの主要なフレームワークを導入するメジャーリリースです：

1. **RAG Framework** - Retrieval-Augmented Generation
2. **Evaluation Framework** - 出力品質評価
3. **Agent Framework** - 自律エージェント開発

## New Packages

### @nahisaho/katashiro-rag

RAG（Retrieval-Augmented Generation）パイプラインを構築するためのパッケージです。

#### Features

- **Embedding Providers**: テキストをベクトル化
  - `MockEmbeddingProvider`: テスト用
  - `OllamaEmbeddingProvider`: ローカルLLM連携

- **Vector Store**: ベクトル検索
  - `InMemoryVectorStore`: インメモリ（コサイン類似度）

- **Document Processing**: 文書処理
  - `DocumentChunker`: 文書分割（fixed/semantic戦略）

- **Retriever**: 検索パイプライン
  - `BasicRetriever`: 基本的な検索

- **Reranker**: リランキング
  - `LLMReranker`: LLMベースのリランキング

#### Quick Start

```typescript
import {
  DocumentChunker,
  InMemoryVectorStore,
  MockEmbeddingProvider,
  BasicRetriever,
} from '@nahisaho/katashiro-rag';

// 1. プロバイダー設定
const embeddingProvider = new MockEmbeddingProvider({ dimensions: 1536 });
const vectorStore = new InMemoryVectorStore({ similarityThreshold: 0.7 });
const chunker = new DocumentChunker({ strategy: 'fixed', chunkSize: 500 });

// 2. ドキュメント処理
const document = { id: 'doc-1', content: 'Long document text...', metadata: {} };
const chunks = chunker.chunk(document);

// 3. ベクトル化・保存
for (const chunk of chunks) {
  const embedding = await embeddingProvider.embed(chunk.content);
  await vectorStore.add(chunk, embedding);
}

// 4. 検索
const queryEmbedding = await embeddingProvider.embed('What is TypeScript?');
const results = await vectorStore.search(queryEmbedding, 5);
console.log(results);
```

### @nahisaho/katashiro-evaluation

LLM出力の品質を評価するためのパッケージです。

#### Features

- **Rule-based Evaluators**: ルールベース評価
  - `LengthEvaluator`: 文字数評価
  - `KeywordEvaluator`: キーワード評価
  - `RegexEvaluator`: 正規表現評価
  - `FormatEvaluator`: フォーマット評価

- **LLM Evaluator**: LLMによる評価
  - relevance, coherence, factuality, helpfulness

- **Composite Evaluator**: 複合評価
  - 複数評価器の組み合わせ

- **Evaluation Reporter**: レポート生成
  - text, json, markdown, html, csv形式

#### Quick Start

```typescript
import {
  LengthEvaluator,
  KeywordEvaluator,
  CompositeEvaluator,
  EvaluationReporter,
} from '@nahisaho/katashiro-evaluation';

// 1. 評価器設定
const lengthEval = new LengthEvaluator({ minLength: 100, maxLength: 500 });
const keywordEval = new KeywordEvaluator({ keywords: ['TypeScript', 'JavaScript'] });

// 2. 複合評価器
const composite = new CompositeEvaluator({
  evaluators: [
    { evaluator: lengthEval, weight: 0.3 },
    { evaluator: keywordEval, weight: 0.7 },
  ],
  strategy: 'weighted',
});

// 3. 評価実行
const result = await composite.evaluate({
  input: 'What is TypeScript?',
  output: 'TypeScript is a typed superset of JavaScript...',
});

console.log(`Score: ${result.score}, Passed: ${result.passed}`);

// 4. レポート生成
const reporter = new EvaluationReporter();
const report = reporter.generate([result], { format: 'markdown' });
console.log(report);
```

### @nahisaho/katashiro-orchestrator (Enhanced)

エージェント開発のための機能が追加されました。

#### New Features

- **Agent State Manager**: 状態管理
  - イミュータブルな状態更新
  - アクション履歴

- **Tool Registry**: ツール登録
  - JSONスキーマベースのパラメータ

- **Agent Executor**: 実行ループ
  - ステップ制限、タイムアウト

- **ReAct Helper**: ReActパターン
  - パース、フォーマット

#### Quick Start

```typescript
import {
  AgentStateManager,
  ToolRegistry,
  ReActHelper,
} from '@nahisaho/katashiro-orchestrator';

// 1. 状態管理
const stateManager = new AgentStateManager();
let state = stateManager.create({ goal: 'Research TypeScript' });

// 2. ツール登録
const registry = new ToolRegistry();
registry.register({
  name: 'search',
  description: 'Web search',
  parameters: [{ name: 'query', type: 'string', required: true }],
  handler: async (params) => ({ results: ['...'] }),
});

// 3. アクション追加
state = stateManager.addAction(state, {
  step: 1,
  timestamp: new Date().toISOString(),
  type: 'thought',
  content: { thought: 'I need to search for TypeScript information' },
});

// 4. ReActパース
const reActOutput = `
Thought: I need to search for TypeScript
Action: search
Action Input: {"query": "TypeScript features"}
`;

const helper = new ReActHelper();
const parsed = helper.parse(reActOutput);
console.log(parsed.actions);
```

## Test Coverage

- **Total Tests**: 2,475+
- **E2E Tests**: 20
- **Unit Tests**: 2,455+

## Breaking Changes

None - this is an additive release with new packages.

## Migration from v1.x

No migration required. Simply install the new packages:

```bash
pnpm add @nahisaho/katashiro-rag @nahisaho/katashiro-evaluation
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- pnpm >= 8.0.0

## Contributors

- KATASHIRO Team

## License

MIT License
