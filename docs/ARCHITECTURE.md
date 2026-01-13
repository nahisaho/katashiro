# KATASHIRO アーキテクチャ設計書

**文書バージョン**: 1.1  
**作成日**: 2026-01-13  
**最終更新**: 2026-01-13 (レビュー反映)  
**対応要件定義**: REQUIREMENTS.md v1.2  
**対応バージョン**: v0.4.2

---

## 1. 設計概要

### 1.1 設計方針

| 方針 | 説明 |
|------|------|
| **モジュラーアーキテクチャ** | 各機能を独立したパッケージとして分離し、疎結合を実現 |
| **型安全性** | TypeScriptの型システムを最大限活用し、コンパイル時エラー検出 |
| **Result型パターン** | 例外を投げず、ok/errで結果を返す代数的データ型を使用 |
| **DI（依存性注入）** | インターフェースベースの設計で、テスト容易性を確保 |
| **イベント駆動** | EventEmitterパターンで非同期処理の進捗を通知 |

### 1.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| 言語 | TypeScript 5.x |
| ランタイム | Node.js 20+ |
| モジュール | ESM (ECMAScript Modules) |
| パッケージ管理 | npm workspaces |
| テスト | Vitest |
| ビルド | tsup |

---

## 2. システムアーキテクチャ

### 2.1 パッケージ構成

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         @nahisaho/katashiro                              │
│                      (統合エントリーポイント)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   Collector   │         │   Analyzer    │         │   Generator   │
│ (情報収集)    │────────▶│   (分析)      │────────▶│   (生成)      │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        │                           ▼                           │
        │                 ┌───────────────┐                     │
        │                 │   Knowledge   │                     │
        │                 │ (知識管理)    │◀────────────────────┘
        │                 └───────────────┘
        │                           │
        │                           ▼
        │                 ┌───────────────┐
        └────────────────▶│   Feedback    │
                          │ (自動学習)    │
                          └───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Orchestrator │         │   Security    │         │   Workspace   │
│(オーケストレータ)│       │(セキュリティ) │         │(ワークスペース)│
└───────────────┘         └───────────────┘         └───────────────┘
        │                                                       │
        ▼                                                       ▼
┌───────────────┐                                     ┌───────────────┐
│    Sandbox    │                                     │  MCP Server   │
│(コード実行)   │                                     │  (MCP連携)    │
└───────────────┘                                     └───────────────┘
```

### 2.2 パッケージ一覧

| パッケージ名 | 役割 | 依存関係 |
|-------------|------|----------|
| `@nahisaho/katashiro-core` | 共通型・ユーティリティ | なし |
| `@nahisaho/katashiro-collector` | 情報収集 | core |
| `@nahisaho/katashiro-analyzer` | テキスト分析 | core |
| `@nahisaho/katashiro-generator` | コンテンツ生成 | core |
| `@nahisaho/katashiro-knowledge` | 知識グラフ管理 | core |
| `@nahisaho/katashiro-feedback` | 自動学習・Wake-Sleep | core |
| `@nahisaho/katashiro-orchestrator` | タスク分解・マルチエージェント | core, collector, analyzer |
| `@nahisaho/katashiro-sandbox` | コード実行サンドボックス | core |
| `@nahisaho/katashiro-security` | セキュリティ分析・監査 | core |
| `@nahisaho/katashiro-workspace` | ファイルシステム抽象化 | core |
| `@nahisaho/katashiro-mcp-server` | MCP Server実装 | 全パッケージ |
| `@nahisaho/katashiro` | 統合パッケージ | 全パッケージ |
| `katashiro` | CLIツール | 統合パッケージ |
| `katashiro-vscode` | VS Code拡張 | 統合パッケージ |

---

## 3. コアモジュール設計

### 3.1 Core パッケージ (@nahisaho/katashiro-core)

#### 3.1.1 Result型

```typescript
// Result型: 成功または失敗を表す代数的データ型
type Result<T, E> = Ok<T> | Err<E>;

interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

// コンストラクタ関数
function ok<T>(value: T): Ok<T>;
function err<E>(error: E): Err<E>;

// 型ガード
function isOk<T, E>(result: Result<T, E>): result is Ok<T>;
function isErr<T, E>(result: Result<T, E>): result is Err<E>;
```

#### 3.1.2 共通型定義

```typescript
// 基本型
type ID = string;
type Timestamp = string; // ISO 8601形式
type URL = string;

// 検索クエリ
interface SearchQuery {
  readonly query: string;
  readonly maxResults?: number;
  readonly language?: string;
  readonly filters?: Record<string, unknown>;
}

// 検索結果
interface SearchResult {
  readonly id: ID;
  readonly title: string;
  readonly url: URL;
  readonly snippet: string;
  readonly source: string;
  readonly publishedAt?: Timestamp;
  readonly relevanceScore?: number;
}
```

#### 3.1.3 エラー階層

```typescript
// 基底エラークラス
class KatashiroError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;
  readonly timestamp: Timestamp;
  readonly recoverable: boolean;
}

// 派生エラー
class NetworkError extends KatashiroError { code = 'NETWORK_ERROR'; }
class ValidationError extends KatashiroError { code = 'VALIDATION_ERROR'; }
class TimeoutError extends KatashiroError { code = 'TIMEOUT_ERROR'; }
class NotFoundError extends KatashiroError { code = 'NOT_FOUND_ERROR'; }
class PermissionError extends KatashiroError { code = 'PERMISSION_ERROR'; }
```

---

## 4. 機能モジュール設計

### 4.1 Collector モジュール

#### 4.1.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                      IWebSearchClient                        │
│  + search(query, options): Promise<SearchResult[]>          │
└─────────────────────────────────────────────────────────────┘
                            △
                            │ implements
┌─────────────────────────────────────────────────────────────┐
│                      WebSearchClient                         │
├─────────────────────────────────────────────────────────────┤
│ - defaultProvider: SearchProvider                            │
│ - defaultMaxResults: number                                  │
├─────────────────────────────────────────────────────────────┤
│ + search(query, options): Promise<SearchResult[]>           │
│ - searchDuckDuckGo(query): Promise<SearchResult[]>          │
│ - searchSearXNG(query): Promise<SearchResult[]>             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      IWebScraper                             │
│  + scrape(url, options): Promise<Result<ScrapingResult>>    │
└─────────────────────────────────────────────────────────────┘
                            △
                            │ implements
┌─────────────────────────────────────────────────────────────┐
│                        WebScraper                            │
├─────────────────────────────────────────────────────────────┤
│ - rateLimiter: RateLimiter                                  │
├─────────────────────────────────────────────────────────────┤
│ + scrape(url, options): Promise<Result<ScrapingResult>>     │
│ - extractContent(html): string                               │
│ - extractMetadata(html): Metadata                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   WideResearchEngine                         │
│                   (extends EventEmitter)                     │
├─────────────────────────────────────────────────────────────┤
│ - agents: ISearchAgent[]                                     │
│ - queryPlanner: QueryPlanner                                 │
│ - aggregator: ResultAggregator                               │
│ - coverageAnalyzer: CoverageAnalyzer                         │
├─────────────────────────────────────────────────────────────┤
│ + research(query, config): Promise<ResearchResult>          │
│ - executeParallelSearch(): Promise<AgentResult[]>           │
│ - analyzeGaps(): GapAnalysis                                 │
│ + on('iterationComplete'): void                              │
│ + on('agentStarted'): void                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.2 検索エージェント階層

```
ISearchAgent (interface)
    │
    ├── WebSearchAgent      (一般Web検索)
    ├── NewsSearchAgent     (ニュース検索)
    ├── AcademicSearchAgent (学術論文検索)
    └── EncyclopediaAgent   (百科事典検索)
```

### 4.2 Analyzer モジュール

#### 4.2.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                      TextAnalyzer                            │
├─────────────────────────────────────────────────────────────┤
│ + analyze(text): Promise<TextAnalysis>                      │
│ + extractKeywords(text): string[]                            │
│ + calculateComplexity(text): ComplexityMetrics               │
│ + analyzeSentiment(text): SentimentScore                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     EntityExtractor                          │
├─────────────────────────────────────────────────────────────┤
│ + extract(text): ExtractedEntities                          │
│ - extractPersons(text): string[]                             │
│ - extractOrganizations(text): string[]                       │
│ - extractLocations(text): string[]                           │
│ - extractDates(text): string[]                               │
│ - extractUrls(text): string[]                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FrameworkAnalyzer                         │
├─────────────────────────────────────────────────────────────┤
│ + analyzeSWOT(data): SWOTAnalysis                           │
│ + analyzeThreeC(data): ThreeCAnalysis                       │
│ + analyzeFourP(data): FourPAnalysis                         │
│ + analyzeFiveForces(data): FiveForcesAnalysis               │
│ + analyzeValueChain(data): ValueChainAnalysis               │
│ + analyzeMECE(elements): MECEAnalysis                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MixtureOfAgents                           │
├─────────────────────────────────────────────────────────────┤
│ - agents: LLMAgent[]                                         │
│ - consensusCalculator: ConsensusCalculator                   │
├─────────────────────────────────────────────────────────────┤
│ + generate(prompt, config): Promise<MoAResult>              │
│ - aggregateResponses(responses): string                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Generator モジュール

#### 4.3.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                    ReportGenerator                           │
├─────────────────────────────────────────────────────────────┤
│ + generate(params): Promise<string>                         │
│ - formatMarkdown(sections): string                           │
│ - formatHTML(sections): string                               │
│ - generateTOC(sections): string                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   SummaryGenerator                           │
├─────────────────────────────────────────────────────────────┤
│ + generate(text, options): Promise<string>                  │
│ - extractKeyPoints(text): string[]                           │
│ - compressToLength(text, maxLength): string                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ChartGenerator                            │
├─────────────────────────────────────────────────────────────┤
│ - svgBuilder: SvgBuilder                                     │
│ - mermaidBuilder: MermaidBuilder                             │
├─────────────────────────────────────────────────────────────┤
│ + generate(data, type): Promise<ChartOutput>                │
│ + generateBar(data): string                                  │
│ + generateLine(data): string                                 │
│ + generatePie(data): string                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   WorkflowEngine                             │
├─────────────────────────────────────────────────────────────┤
│ - pipelineOrchestrator: PipelineOrchestrator                 │
│ - styleGuideEnforcer: StyleGuideEnforcer                     │
├─────────────────────────────────────────────────────────────┤
│ + execute(workflow): Promise<WorkflowResult>                │
│ - resolveSteps(steps): ExecutionOrder                        │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Knowledge モジュール

#### 4.4.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                    KnowledgeGraph                            │
├─────────────────────────────────────────────────────────────┤
│ - nodes: Map<ID, GraphNode>                                  │
│ - edges: Map<ID, GraphEdge>                                  │
│ - nodeIndex: Map<string, Set<ID>>                            │
├─────────────────────────────────────────────────────────────┤
│ + addNode(node): void                                        │
│ + addEdge(edge): void                                        │
│ + getNode(id): GraphNode | undefined                        │
│ + getNeighbors(id): GraphNode[]                              │
│ + traverse(startId, depth): GraphNode[]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      GraphQuery                              │
├─────────────────────────────────────────────────────────────┤
│ - graph: KnowledgeGraph                                      │
├─────────────────────────────────────────────────────────────┤
│ + findByType(type): GraphNode[]                             │
│ + findByProperty(key, value): GraphNode[]                   │
│ + search(query): GraphNode[]                                 │
│ + shortestPath(from, to): GraphNode[]                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   GraphPersistence                           │
├─────────────────────────────────────────────────────────────┤
│ + save(graph, path): Promise<Result<void>>                  │
│ + load(path): Promise<Result<KnowledgeGraph>>               │
│ + export(graph, format): string                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Feedback モジュール

#### 4.5.1 Wake-Sleep学習サイクル

```
┌─────────────────────────────────────────────────────────────┐
│                    WakeSleepCycle                            │
├─────────────────────────────────────────────────────────────┤
│ - library: PatternLibrary                                    │
│ - observations: WakeObservation[]                            │
│ - config: WakeSleepConfig                                    │
│ - qualityEvaluator: PatternQualityEvaluator                  │
│ - compressor: PatternCompressor                              │
├─────────────────────────────────────────────────────────────┤
│ + wake(observation): void          // Wakeフェーズ: 観察収集 │
│ + sleep(): Promise<SleepResult>    // Sleepフェーズ: 最適化  │
│ + matchPatterns(input): PatternMatch[]                      │
│ + recordFeedback(patternId, feedback): void                 │
│ + getSuggestions(): PatternSuggestion[]                     │
│ + exportLibrary(): SerializedLibrary                        │
│ + importLibrary(data): void                                  │
└─────────────────────────────────────────────────────────────┘

            ┌──────────────────┐
            │   Wake Phase     │
            │  (オンライン)    │
            └────────┬─────────┘
                     │ 観察データ蓄積
                     ▼
            ┌──────────────────┐
            │ Pattern Matching │
            │  (パターン照合)  │
            └────────┬─────────┘
                     │ wakeThreshold到達
                     ▼
            ┌──────────────────┐
            │   Sleep Phase    │
            │  (オフライン)    │
            └────────┬─────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌─────────┐
   │品質評価 │ │パターン  │ │ライブラリ│
   │         │ │圧縮      │ │最適化   │
   └─────────┘ └──────────┘ └─────────┘
```

#### 4.5.2 パターン品質評価

```typescript
interface PatternQuality {
  readonly frequencyScore: number;    // 使用頻度 (0-1)
  readonly generalityScore: number;   // テンプレート汎用性 (0-1)
  readonly utilityScore: number;      // 成功率 (0-1)
  readonly freshnessScore: number;    // 鮮度 (0-1)
  readonly score: number;             // 総合スコア (0-1)
}

// スコア計算式
// score = frequencyScore * 0.2 + generalityScore * 0.2 
//       + utilityScore * 0.4 + freshnessScore * 0.2
```

### 4.6 Orchestrator モジュール

#### 4.6.1 タスク分解

```
┌─────────────────────────────────────────────────────────────┐
│                    TaskDecomposer                            │
├─────────────────────────────────────────────────────────────┤
│ + decompose(task): TaskPlan                                 │
│ - identifySubTasks(task): SubTask[]                          │
│ - resolveDependencies(tasks): DependencyGraph                │
│ - estimateDuration(task): number                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                MultiAgentOrchestrator                        │
├─────────────────────────────────────────────────────────────┤
│ - agents: Map<string, Agent>                                 │
│ - taskQueue: PriorityQueue<Task>                             │
├─────────────────────────────────────────────────────────────┤
│ + execute(plan): Promise<ExecutionResult>                   │
│ - assignTask(task, agent): void                              │
│ - handleFailure(task, error): RecoveryAction                 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.6.2 対話型情報収集 (DialogueCollector)

```
┌─────────────────────────────────────────────────────────────┐
│                   DialogueCollector                          │
├─────────────────────────────────────────────────────────────┤
│ - sessions: Map<string, DialogueSession>                     │
│ - questionGenerator: QuestionGenerator                       │
│ - intentAnalyzer: IntentAnalyzer                             │
│ - config: DialogueConfig                                     │
├─────────────────────────────────────────────────────────────┤
│ + startSession(initialInput): DialogueSession               │
│ + getNextQuestion(sessionId): Question | null               │
│ + recordAnswer(sessionId, answer): void                     │
│ + getResult(sessionId): DialogueResult                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DialogueResult                             │
├─────────────────────────────────────────────────────────────┤
│ + inferredIntent: {                                          │
│     surfaceIntent: string    // 表層的な意図                 │
│     trueIntent: string       // 真の意図                     │
│     confidence: number       // 信頼度                       │
│     reasoning: string        // 推論根拠                     │
│     recommendedApproach: string                              │
│   }                                                          │
│ + context: DialogueContext                                   │
│ + answeredQuestions: AnsweredQuestion[]                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.7 Security モジュール

#### 4.7.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                   SecurityAnalyzer                           │
├─────────────────────────────────────────────────────────────┤
│ - policy: SecurityPolicy                                     │
├─────────────────────────────────────────────────────────────┤
│ + analyze(action): SecurityAnalysisResult                   │
│ - evaluateRiskLevel(action): RiskLevel                       │
│ - matchAllowPatterns(action): boolean                        │
│ - matchDenyPatterns(action): boolean                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                SecurityAnalysisResult                        │
├─────────────────────────────────────────────────────────────┤
│ + riskLevel: 'low' | 'medium' | 'high' | 'critical'         │
│ + allowed: boolean                                           │
│ + requiresConfirmation: boolean                              │
│ + reasons: string[]                                          │
│ + suggestions: string[]                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     ActionLogger                             │
├─────────────────────────────────────────────────────────────┤
│ - logs: AuditLogEntry[]                                      │
│ - storage?: FileStorage                                      │
├─────────────────────────────────────────────────────────────┤
│ + log(entry): void                                           │
│ + query(filter): AuditLogEntry[]                            │
│ + export(format): string                                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.8 Workspace モジュール

#### 4.8.1 クラス図

```
┌─────────────────────────────────────────────────────────────┐
│                      Workspace                               │
│  (interface)                                                 │
├─────────────────────────────────────────────────────────────┤
│ + type: WorkspaceType                                        │
│ + workingDir: string                                         │
│ + readOnly: boolean                                          │
├─────────────────────────────────────────────────────────────┤
│ + read(path): Promise<string>                               │
│ + write(path, content): Promise<void>                       │
│ + delete(path): Promise<void>                               │
│ + list(path): Promise<FileInfo[]>                           │
│ + search(pattern): Promise<string[]>                        │
│ + exists(path): Promise<boolean>                            │
│ + mkdir(path): Promise<void>                                │
│ + stat(path): Promise<FileInfo>                             │
│ + copy(src, dest): Promise<void>                            │
│ + move(src, dest): Promise<void>                            │
└─────────────────────────────────────────────────────────────┘
            △                           △                    △
            │                           │                    │
   ┌────────┴────────┐         ┌────────┴────────┐  ┌────────┴────────┐
   │  LocalWorkspace │         │DockerWorkspace  │  │ MemoryWorkspace │
   │  (ローカルFS)   │         │(Docker内FS)     │  │  (メモリ内FS)   │
   └─────────────────┘         └─────────────────┘  └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   WorkspaceFactory                           │
├─────────────────────────────────────────────────────────────┤
│ + create(config): Workspace                                 │
│ + createLocal(workingDir): LocalWorkspace                   │
│ + createDocker(containerId, workingDir): DockerWorkspace    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. データフロー設計

### 5.1 リサーチワークフロー

```
[ユーザークエリ]
       │
       ▼
┌─────────────────┐
│ DialogueCollector│ ─── 対話で意図を明確化（必要な場合）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TaskDecomposer │ ─── タスクを分解
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│WideResearchEngine│ ─── 並列検索実行
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Agent 1│ │Agent N│ ─── 各種検索エージェント
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ResultAggregator │ ─── 結果を集約・重複排除
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TextAnalyzer   │ ─── キーワード・エンティティ抽出
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ KnowledgeGraph  │ ─── ナレッジグラフに蓄積
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ReportGenerator │ ─── レポート生成
└────────┬────────┘
         │
         ▼
[最終レポート出力]
```

### 5.2 Wake-Sleep学習フロー

```
[ユーザー操作]
       │
       ▼
┌─────────────────┐
│   WakeSleepCycle│
│    (Wake Phase) │
└────────┬────────┘
         │ 観察データ
         ▼
┌─────────────────┐
│  WakeObservation│ ─── {id, type, input, output, context, success, rating}
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pattern Matching│ ─── 既存パターンとの照合
└────────┬────────┘
         │
    ┌────┴────┐
    │ Match   │ No Match
    ▼         ▼
┌───────┐ ┌───────────┐
│Use    │ │Create New │
│Pattern│ │Observation│
└───┬───┘ └─────┬─────┘
    │           │
    └─────┬─────┘
          │
          ▼ wakeThreshold達成
┌─────────────────┐
│   Sleep Phase   │
└────────┬────────┘
         │
    ┌────┼────┐
    │    │    │
    ▼    ▼    ▼
┌────┐┌────┐┌────┐
│品質││圧縮││削除│
│評価││    ││    │
└──┬─┘└──┬─┘└──┬─┘
   │     │     │
   └─────┴─────┘
         │
         ▼
┌─────────────────┐
│ 最適化済みLibrary│
└─────────────────┘
```

---

## 6. インターフェース設計

### 6.1 モジュール間インターフェース

```typescript
// Collector → Analyzer
interface IAnalyzable {
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

// Analyzer → Generator
interface IGeneratable {
  readonly analysis: TextAnalysis;
  readonly entities: ExtractedEntities;
  readonly keywords: string[];
}

// Generator → Knowledge
interface IStorable {
  readonly id: ID;
  readonly type: string;
  readonly properties: Record<string, unknown>;
}

// All → Feedback
interface IObservable {
  readonly input: string;
  readonly output: string;
  readonly success: boolean;
  readonly duration?: number;
}
```

### 6.2 イベントインターフェース

```typescript
// WideResearchEngine イベント
interface ResearchEvents {
  'iterationStart': { iteration: number; totalIterations: number };
  'iterationComplete': { iteration: number; newFindings: number };
  'agentStarted': { agentType: string; query: string };
  'agentCompleted': { agentType: string; resultCount: number };
  'researchComplete': { totalFindings: number; duration: number };
}

// WakeSleepCycle イベント
interface WakeSleepEvents {
  'observationAdded': { observation: WakeObservation };
  'sleepStarted': { observationCount: number };
  'sleepCompleted': { patternsRemoved: number; compressionRatio: number };
  'patternMatched': { patternId: string; score: number };
}
```

---

## 7. 非機能設計

### 7.1 パフォーマンス設計

| 操作 | 目標応答時間 | 設計対策 |
|------|-------------|---------|
| テキスト分析 | < 100ms | インメモリ処理、正規表現最適化 |
| エンティティ抽出 | < 100ms | パターンマッチング、並列処理 |
| Web検索 | < 3秒 | タイムアウト設定、キャッシュ（REQ-IMP-001） |
| レポート生成 | < 10ms | テンプレートエンジン最適化 |
| ナレッジグラフクエリ | < 10ms | インデックス構造、BFS/DFS最適化 |

### 7.2 エラーハンドリング設計

```typescript
// リトライ戦略
interface RetryConfig {
  maxRetries: number;        // 最大リトライ回数
  initialDelay: number;      // 初回待機時間(ms)
  maxDelay: number;          // 最大待機時間(ms)
  backoffMultiplier: number; // バックオフ係数
  retryableErrors: string[]; // リトライ対象エラーコード
}

// デフォルト設定
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMITED'],
};
```

### 7.3 セキュリティ設計

| 脅威 | 対策 |
|------|------|
| コードインジェクション | Sandboxによる隔離実行 |
| 機密情報漏洩 | SecurityAnalyzerによるリスク評価 |
| 不正ファイル操作 | 許可/拒否パターンによるフィルタリング |
| 監査証跡 | ActionLoggerによる全操作ログ記録 |

---

## 8. 拡張性設計

### 8.1 プラグインアーキテクチャ

```typescript
// 検索エージェントプラグイン
interface ISearchAgent {
  readonly name: string;
  readonly priority: number;
  search(query: SearchQuery): Promise<SearchResult[]>;
}

// 分析プラグイン
interface IAnalyzer {
  readonly name: string;
  analyze(input: string): Promise<AnalysisResult>;
}

// 生成プラグイン
interface IGenerator {
  readonly name: string;
  generate(input: GeneratorInput): Promise<string>;
}
```

### 8.2 設定拡張

```typescript
// グローバル設定
interface KatashiroConfig {
  // Collector設定
  collector: {
    defaultProvider: SearchProvider;
    timeout: number;
    rateLimitPerSecond: number;
  };
  // Analyzer設定
  analyzer: {
    minKeywordLength: number;
    maxKeywords: number;
  };
  // Feedback設定
  feedback: {
    wakeSleep: WakeSleepConfig;
  };
  // Security設定
  security: SecurityPolicy;
}
```

---

## 9. トレーサビリティ

| 設計要素 | 対応要件 |
|---------|---------|
| WebSearchClient | REQ-COLLECT-001 |
| WebScraper | REQ-COLLECT-002 |
| WideResearchEngine | REQ-COLLECT-006 |
| TextAnalyzer | REQ-ANALYZE-001 |
| EntityExtractor | REQ-ANALYZE-002 |
| FrameworkAnalyzer | REQ-ANALYZE-007 |
| MixtureOfAgents | REQ-ANALYZE-011 |
| ReportGenerator | REQ-GENERATE-001 |
| SummaryGenerator | REQ-GENERATE-002 |
| KnowledgeGraph | REQ-KNOWLEDGE-001 |
| GraphQuery | REQ-KNOWLEDGE-002 |
| WakeSleepCycle | REQ-FEEDBACK-005 |
| TaskDecomposer | REQ-ORCH-009 |
| DialogueCollector | REQ-ORCH-011 |
| SecurityAnalyzer | REQ-SECURITY-012 |
| WorkspaceFactory | REQ-WORKSPACE-011 |
| SandboxFactory | REQ-SANDBOX-007 |

---

## 10. 改訂履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|----------|--------|
| 1.0 | 2026-01-13 | 初版作成 | GitHub Copilot |
| 1.1 | 2026-01-13 | レビュー反映: Workspace インターフェースを実装に合わせて修正、DockerWorkspace追加 | GitHub Copilot |

---

**文書終了**
