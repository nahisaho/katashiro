# KATASHIRO v2.0 機能強化 要件定義書

> **Version**: 1.0.2  
> **Date**: 2026-01-14  
> **Status**: Reviewed  
> **Author**: AI Agent  

---

## 📋 概要

本文書は、KATASHIRO v2.0における以下の機能強化の要件を定義する：

1. **Evaluationパッケージの実装強化** - LLMJudge、RAGASメトリクス
2. **RAG End-to-Endパイプライン実装** - LLM統合、永続化VectorStore
3. **Orchestratorパッケージ拡張** - AgentState、標準ツールセット
4. **テスト安定化** - 統合テスト、E2Eテスト

### パッケージ構成（参考）

| パッケージ | 主要インターフェース | 備考 |
|-----------|---------------------|------|
| `katashiro-llm` | `LLMProvider` | テキスト生成、ストリーミング |
| `katashiro-rag` | `EmbeddingProvider`, `VectorStore` | 埋め込み生成、ベクトル検索 |
| `katashiro-evaluation` | `Evaluator`, `Dataset` | 品質評価 |
| `katashiro-orchestrator` | `ToolRegistry`, `AgentState` | ツール管理、状態管理 |

---

## 🎯 1. Evaluationパッケージ強化

### 1.1 現状分析

| 項目 | 状態 | 備考 |
|------|------|------|
| HeuristicEvaluator | ✅ 実装済 | Length, Keyword, Regex, JsonStructure |
| CompositeEvaluator | ✅ 実装済 | 複数評価器の合成 |
| SimilarityEvaluator | ✅ 実装済 | 類似度評価 |
| DatasetManager | ✅ 実装済 | データセット管理 |
| ExperimentRunner | ✅ 実装済 | 実験実行 |
| BenchmarkSuite | ✅ 実装済 | ベンチマーク |
| **LLMJudgeEvaluator** | ❌ 未実装 | LLMベース評価 |
| **RAGASメトリクス** | ❌ 未実装 | Faithfulness, Context Relevancy等 |
| **Human Feedback統合** | ❌ 未実装 | 人間評価との統合 |

### 1.2 要件定義

#### REQ-EVAL-101: LLMJudgeEvaluator

**説明**: LLMを使用して出力品質を評価する評価器

**機能要件**:
```typescript
interface LLMJudgeEvaluatorConfig {
  /** LLMプロバイダー（katashiro-llmから） */
  llmProvider: LLMProvider;
  /** 評価基準（カスタマイズ可能） */
  criteria: EvaluationCriteria[];
  /** スケール（1-5, 1-10等） */
  scale?: EvaluationScale;
  /** 複数回評価（信頼性向上） */
  numJudges?: number;
}

interface EvaluationCriteria {
  name: string;        // e.g., 'relevance', 'coherence', 'fluency'
  description: string; // 評価基準の説明
  weight?: number;     // 重み（0-1）
}

class LLMJudgeEvaluator implements Evaluator {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult>;
  async evaluateWithReasoning(input: EvaluationInput): Promise<DetailedEvaluationResult>;
}
```

**受け入れ基準**:
- [ ] カスタム評価基準をサポート
- [ ] 1-5スケールでの評価
- [ ] 評価理由の生成
- [ ] 複数回評価による信頼性向上

---

#### REQ-EVAL-102: RAGASメトリクス

**説明**: RAGシステム評価のための標準メトリクス実装

**機能要件**:
```typescript
// Faithfulness（忠実性）: 回答がコンテキストに基づいているか
class FaithfulnessEvaluator implements Evaluator {
  constructor(llmProvider: LLMProvider);
  async evaluate(input: RAGEvaluationInput): Promise<EvaluationResult>;
}

// Context Relevancy（コンテキスト関連性）
class ContextRelevancyEvaluator implements Evaluator {
  constructor(llmProvider: LLMProvider);
  async evaluate(input: RAGEvaluationInput): Promise<EvaluationResult>;
}

// Answer Relevancy（回答関連性）
class AnswerRelevancyEvaluator implements Evaluator {
  constructor(llmProvider: LLMProvider);
  async evaluate(input: RAGEvaluationInput): Promise<EvaluationResult>;
}

// Context Precision（コンテキスト精度）
class ContextPrecisionEvaluator implements Evaluator {
  constructor(llmProvider: LLMProvider);
  async evaluate(input: RAGEvaluationInput): Promise<EvaluationResult>;
}

interface RAGEvaluationInput extends EvaluationInput {
  query: string;          // ユーザークエリ
  contexts: string[];     // 検索されたコンテキスト
  answer: string;         // 生成された回答
  groundTruth?: string;   // 正解（あれば）
}
```

**型配置**: `RAGEvaluationInput`は`@nahisaho/katashiro-evaluation`パッケージの`types.ts`に配置

**受け入れ基準**:
- [ ] Faithfulness評価の実装
- [ ] Context Relevancy評価の実装
- [ ] Answer Relevancy評価の実装
- [ ] Context Precision評価の実装
- [ ] 統合RAGスコアの算出

---

#### REQ-EVAL-103: 評価結果レポート生成

**説明**: 評価結果を可視化するレポート生成機能

**機能要件**:
```typescript
interface EvaluationReportConfig {
  format: 'markdown' | 'html' | 'json';
  includeCharts?: boolean;
  includeDetails?: boolean;
}

class EvaluationReporter {
  generateReport(results: ExperimentResult[], config?: EvaluationReportConfig): string;
  generateComparison(results: ExperimentResult[]): ComparisonReport;
}
```

**受け入れ基準**:
- [ ] Markdown形式でのレポート出力
- [ ] 複数実験の比較機能
- [ ] スコア分布の可視化

---

## 🎯 2. RAG End-to-Endパイプライン

### 2.1 現状分析

| 項目 | 状態 | 備考 |
|------|------|------|
| DocumentChunker | ✅ 実装済 | fixed/sentence/paragraph |
| EmbeddingManager | ✅ 実装済 | MockProvider実装済 |
| InMemoryVectorStore | ✅ 実装済 | 基本的なベクトル検索 |
| Retriever | ✅ 実装済 | 検索機能 |
| RAGEngine | ✅ 実装済 | ファサード |
| **LLM統合** | ❌ 未実装 | 回答生成のLLM統合 |
| **Real Embedding Provider** | ✅ 実装済 | Ollama/OpenAI/Azure（katashiro-rag） |
| **永続化VectorStore** | ❌ 未実装 | ファイルベース永続化 |
| **Reranking** | ❌ 未実装 | 検索結果のリランキング |

### 2.2 要件定義

#### REQ-RAG-101: RAGパイプライン統合

**説明**: LLMを含む完全なRAGパイプラインの実装

**設計方針**: 既存の`RAGEngine`を拡張し、LLM統合機能を追加する形で実装。新規クラスではなく、`RAGEngine`の拡張またはラッパーとして`RAGPipeline`を提供。

**機能要件**:
```typescript
interface RAGPipelineConfig {
  /** Embeddingプロバイダー（katashiro-ragから） */
  embeddingProvider: EmbeddingProvider;
  /** LLMプロバイダー（katashiro-llmから）- オプショナル */
  llmProvider?: LLMProvider;
  /** VectorStore */
  vectorStore: VectorStore;
  /** チャンキング設定 */
  chunking?: ChunkingConfig;
  /** 検索設定 */
  retriever?: RetrieverConfig;
  /** プロンプトテンプレート */
  promptTemplate?: string;
}

class RAGPipeline {
  constructor(config: RAGPipelineConfig);
  
  /** ドキュメントをインデックス */
  async ingest(documents: Document[]): Promise<void>;
  
  /** クエリを実行（検索のみ） */
  async retrieve(query: string): Promise<SearchResult[]>;
  
  /** クエリを実行（検索+回答生成） */
  async query(query: string): Promise<RAGResponse>;
  
  /** ストリーミング回答生成 */
  async queryStream(query: string): AsyncGenerator<string>;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  metadata: {
    retrievalTimeMs: number;
    generationTimeMs: number;
    tokensUsed?: number;
  };
}
```

**受け入れ基準**:
- [ ] katashiro-llmのEmbeddingProvider統合
- [ ] katashiro-llmのLLMProvider統合（オプショナル）
- [ ] 検索結果のソース追跡
- [ ] ストリーミング回答生成

---

#### REQ-RAG-102: ファイルベースVectorStore

**説明**: 永続化可能なVectorStoreの実装

**機能要件**:
```typescript
interface FileVectorStoreConfig {
  /** 保存先ディレクトリ */
  directory: string;
  /** インデックスファイル名 */
  indexFile?: string;
  /** 自動保存間隔（ミリ秒） */
  autoSaveInterval?: number;
}

class FileVectorStore implements VectorStore {
  constructor(config: FileVectorStoreConfig);
  
  /** ファイルから読み込み */
  async load(): Promise<void>;
  
  /** ファイルに保存 */
  async save(): Promise<void>;
  
  /** 統計情報 */
  getStats(): VectorStoreStats;
}

interface VectorStoreStats {
  documentCount: number;
  chunkCount: number;
  dimensions: number;
  sizeBytes: number;
}
```

**受け入れ基準**:
- [ ] JSON形式での永続化
- [ ] 増分保存のサポート
- [ ] 読み込み時の整合性チェック

---

#### REQ-RAG-103: Reranker

**説明**: 検索結果のリランキング機能

**機能要件**:
```typescript
interface RerankerConfig {
  /** リランキングモデル（LLMまたはCross-Encoder） */
  type: 'llm' | 'cross-encoder';
  /** LLMプロバイダー（type=llmの場合） */
  llmProvider?: LLMProvider;
  /** トップK（リランキング後） */
  topK?: number;
}

class Reranker {
  constructor(config: RerankerConfig);
  
  /** 検索結果をリランキング */
  async rerank(query: string, results: SearchResult[]): Promise<SearchResult[]>;
}
```

**受け入れ基準**:
- [ ] LLMベースリランキング
- [ ] スコアの再計算
- [ ] 元のスコアとの比較

---

## 🎯 3. Orchestratorパッケージ拡張

### 3.1 概要

**注意**: 既存の`@nahisaho/katashiro-orchestrator`パッケージに強力な`ToolRegistry`が実装済み。
新規パッケージではなく、**既存orchestratorパッケージの拡張**として実装する。

**既存機能**:
- `ToolRegistry`: ツール登録・管理・実行（Action-Observation型安全）
- `TaskDecomposer`: タスク分解
- `MultiAgentOrchestrator`: マルチエージェント協調
- `DialogueCollector`: 対話型情報収集
- `ConsensusResearchEngine`: 合議型リサーチ
- `CascadingResearchEngine`: カスケード型リサーチ

**関連**: `@nahisaho/katashiro-mcp-server`にもMCPプロトコル用の`ToolRegistry`あり（別用途）
- MCP Server ToolRegistry: MCPプロトコル準拠のツール登録
- Orchestrator ToolRegistry: Action-Observation型安全のツール実行

**追加する機能**:
- KATASHIRO標準ツールセット（既存機能のツール化）
- AgentState管理
- ReActパターンヘルパー
- OpenAI Function Calling / MCP形式へのエクスポート

### 3.2 要件定義

#### REQ-AGENT-001: ToolRegistry → 既存実装を活用

**説明**: 既存の`ToolRegistry`をそのまま活用。追加実装不要。

**既存機能確認**:
```typescript
// 既存の ToolRegistry (packages/orchestrator/src/tool-registry.ts)
class ToolRegistry extends EventEmitter {
  register<TParams, TResult>(tool: ToolDefinition<TParams, TResult>): Result<void, ToolRegistryError>;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  createAction<TParams>(options: CreateActionOptions<TParams>): Result<Action<TParams>, ToolRegistryError>;
  execute<TParams, TResult>(action: Action<TParams>): Promise<Result<Observation<TResult>, ToolRegistryError>>;
}
```

**受け入れ基準**:
- [x] ツールの登録・取得・一覧 → ✅ 実装済
- [x] パラメータバリデーション → ✅ 実装済
- [ ] OpenAI Function Calling形式へのエクスポート → 追加実装
- [ ] MCP Tool形式へのエクスポート → 追加実装

---

#### REQ-AGENT-002: AgentState

**説明**: エージェントの状態管理

**機能要件**:
```typescript
interface AgentState {
  /** 会話ID */
  conversationId: string;
  /** 現在のステップ */
  currentStep: number;
  /** 最大ステップ */
  maxSteps: number;
  /** 実行履歴 */
  history: AgentAction[];
  /** コンテキスト */
  context: Record<string, unknown>;
  /** 中間結果 */
  intermediateResults: unknown[];
}

interface AgentAction {
  step: number;
  timestamp: string;
  type: 'tool_call' | 'thought' | 'observation' | 'final_answer';
  content: {
    tool?: string;
    params?: Record<string, unknown>;
    result?: ToolResult;
    thought?: string;
    answer?: string;
  };
}

class AgentStateManager {
  /** 新しい状態を作成 */
  create(config?: Partial<AgentState>): AgentState;
  
  /** アクションを追加 */
  addAction(state: AgentState, action: Omit<AgentAction, 'step' | 'timestamp'>): AgentState;
  
  /** 状態をシリアライズ */
  serialize(state: AgentState): string;
  
  /** 状態をデシリアライズ */
  deserialize(data: string): AgentState;
  
  /** 状態をリセット */
  reset(state: AgentState): AgentState;
}
```

**受け入れ基準**:
- [ ] 状態の作成・更新・リセット
- [ ] 履歴の追跡
- [ ] シリアライズ/デシリアライズ

---

#### REQ-AGENT-003: KATASHIRO標準ツールセット

**説明**: KATASHIROの機能をAgentツールとして提供

**機能要件**:
```typescript
// 標準ツールセットの作成
function createKatashiroTools(): Tool[] {
  return [
    // Collector
    createWebSearchTool(),
    createWebScrapeTool(),
    createRssFeedTool(),
    
    // Analyzer
    createTextAnalyzeTool(),
    createEntityExtractTool(),
    createTopicModelTool(),
    
    // Generator
    createSummarizeTool(),
    createReportTool(),
    
    // Knowledge
    createKnowledgeAddTool(),
    createKnowledgeQueryTool(),
    
    // RAG
    createRAGIngestTool(),
    createRAGQueryTool(),
  ];
}

// 使用例
const registry = new ToolRegistry();
registry.registerAll(createKatashiroTools());
```

**受け入れ基準**:
- [ ] Collector機能のツール化
- [ ] Analyzer機能のツール化
- [ ] Generator機能のツール化
- [ ] Knowledge機能のツール化
- [ ] RAG機能のツール化

---

#### REQ-AGENT-004: ReActパターンヘルパー

**説明**: ReAct（Reasoning + Acting）パターンの実行を支援

**機能要件**:
```typescript
interface ReActConfig {
  tools: ToolRegistry;
  maxIterations?: number;
  stopCondition?: (state: AgentState) => boolean;
}

class ReActHelper {
  constructor(config: ReActConfig);
  
  /** ツール呼び出しを解析 */
  parseToolCall(response: string): { tool: string; params: Record<string, unknown> } | null;
  
  /** 観察結果をフォーマット */
  formatObservation(result: ToolResult): string;
  
  /** 最終回答を抽出 */
  extractFinalAnswer(response: string): string | null;
  
  /** 状態が終了条件を満たすか判定 */
  shouldStop(state: AgentState): boolean;
}
```

**受け入れ基準**:
- [ ] ツール呼び出しの解析
- [ ] 観察結果のフォーマット
- [ ] 終了条件の判定

---

## 🎯 4. テスト安定化

### 4.1 現状分析

| 項目 | 状態 | 備考 |
|------|------|------|
| Unit Tests | ✅ 2193 passed | 安定 |
| Integration Tests | ✅ 動作 | Ollama依存 |
| E2E Tests | ❌ 未実装 | - |
| Coverage | △ 部分的 | 一部除外あり |

### 4.2 要件定義

#### REQ-TEST-001: 統合テスト安定化

**説明**: 外部サービス依存テストの安定化

**機能要件**:
- Ollamaモックの改善
- ネットワークタイムアウトのハンドリング
- CI/CD環境での安定実行

**受け入れ基準**:
- [ ] モックモードでの全テスト通過
- [ ] タイムアウト設定の適切化
- [ ] スキップ条件の明確化

---

#### REQ-TEST-002: E2Eテスト追加

**説明**: End-to-Endシナリオのテスト追加

**機能要件**:
```typescript
// E2Eテストシナリオ
describe('E2E: Research Workflow', () => {
  it('should complete research workflow', async () => {
    // 1. 検索実行
    // 2. スクレイピング
    // 3. 分析
    // 4. レポート生成
  });
});

describe('E2E: RAG Pipeline', () => {
  it('should complete RAG pipeline', async () => {
    // 1. ドキュメントインジェスト
    // 2. 検索
    // 3. 回答生成
  });
});
```

**受け入れ基準**:
- [ ] リサーチワークフローE2Eテスト
- [ ] RAGパイプラインE2Eテスト
- [ ] エージェントワークフローE2Eテスト

---

## 📊 優先度マトリクス

| 要件ID | 名称 | 優先度 | 依存関係 | 工数(h) |
|--------|------|--------|----------|---------|
| REQ-EVAL-101 | LLMJudgeEvaluator | P1 | katashiro-llm | 4 |
| REQ-EVAL-102 | RAGASメトリクス | P1 | REQ-EVAL-101 | 6 |
| REQ-EVAL-103 | 評価レポート | P2 | - | 3 |
| REQ-RAG-101 | RAGパイプライン統合 | P1 | katashiro-llm | 4 |
| REQ-RAG-102 | FileVectorStore | P2 | - | 3 |
| REQ-RAG-103 | Reranker | P2 | katashiro-llm | 3 |
| REQ-AGENT-001 | ToolRegistry拡張 | P2 | - | 2 |
| REQ-AGENT-002 | AgentState | P1 | - | 2 |
| REQ-AGENT-003 | 標準ツールセット | P1 | - | 4 |
| REQ-AGENT-004 | ReActヘルパー | P2 | REQ-AGENT-002 | 3 |
| REQ-TEST-001 | 統合テスト安定化 | P1 | - | 2 |
| REQ-TEST-002 | E2Eテスト | P2 | 全機能 | 4 |

---

## 🔄 実装順序（推奨）

### Phase 1: 基盤整備
1. REQ-TEST-001: 統合テスト安定化
2. REQ-AGENT-002: AgentState（orchestratorに追加）

### Phase 2: Evaluation強化
3. REQ-EVAL-101: LLMJudgeEvaluator
4. REQ-EVAL-102: RAGASメトリクス

### Phase 3: RAG強化
5. REQ-RAG-101: RAGパイプライン統合
6. REQ-RAG-102: FileVectorStore

### Phase 4: Agent統合
7. REQ-AGENT-003: 標準ツールセット
8. REQ-AGENT-001: ToolRegistry拡張（OpenAI/MCP形式エクスポート）

### Phase 5: 品質向上
9. REQ-EVAL-103: 評価レポート
10. REQ-RAG-103: Reranker
11. REQ-AGENT-004: ReActヘルパー
12. REQ-TEST-002: E2Eテスト

---

## 📝 レビュー項目

### 解決済み事項

1. ✅ **Agentパッケージの位置づけ**
   - → Orchestrator拡張として実装
   - → MCP ServerのToolRegistryとは別用途（確認済み）

2. ✅ **RAG LLM統合**
   - → LLMProvider統合はオプショナル（検索のみでも利用可能）
   - → 回答生成はKATASHIROの責務（RAGパイプラインとして提供）

3. ✅ **型配置**
   - → RAGEvaluationInputはevaluationパッケージに配置

### 今後検討事項

1. **評価メトリクス拡張**
   - Human Feedback統合は将来要件として保留
   - 追加メトリクス（Hallucination検出等）は別要件で定義

2. **非機能要件**
   - LLM呼び出し回数上限
   - タイムアウト設定
   - エラーリトライポリシー

---

## 📎 参考資料

- [KATASHIRO AGENTS.md](../../AGENTS.md)
- [katashiro-llm パッケージ](../llm/)
- [katashiro-evaluation パッケージ](../evaluation/)
- [katashiro-rag パッケージ](../rag/)
- [RAGAS Documentation](https://docs.ragas.io/)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)

---

## 📝 変更履歴

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01-14 | 初版作成（Draft） |
| 1.0.1 | 2026-01-14 | レビュー指摘反映: MCP重複確認、型配置明確化、概要修正 |
| 1.0.2 | 2026-01-14 | 再レビュー指摘反映: EmbeddingProvider配置修正（rag）、パッケージ構成明確化 |
