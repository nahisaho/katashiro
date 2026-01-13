# KATASHIRO モジュール詳細設計書

**文書バージョン**: 1.1  
**作成日**: 2026-01-13  
**最終更新**: 2026-01-13 (レビュー反映)  
**対応アーキテクチャ設計**: ARCHITECTURE.md v1.1  
**対応要件定義**: REQUIREMENTS.md v1.2

---

## 1. Collector モジュール詳細設計

### 1.1 WebSearchClient

#### 1.1.1 責務
- 外部検索エンジンへのクエリ送信
- 検索結果の正規化
- プロバイダー抽象化

#### 1.1.2 クラス設計

```typescript
class WebSearchClient implements IWebSearchClient {
  // 設定
  private readonly defaultProvider: SearchProvider = 'duckduckgo';
  private readonly defaultMaxResults: number = 10;
  
  // 公開メソッド
  async search(
    queryOrString: string | SearchQuery,
    options?: WebSearchOptions
  ): Promise<SearchResult[]>;
  
  // 内部メソッド
  private async fetchFromProvider(
    provider: SearchProvider,
    query: SearchQuery
  ): Promise<SearchResult[]>;
  
  private async searchDuckDuckGo(query: SearchQuery): Promise<SearchResult[]>;
  private async searchSearXNG(query: SearchQuery): Promise<SearchResult[]>;
  private async searchGoogle(query: SearchQuery): Promise<SearchResult[]>;
  private async searchBing(query: SearchQuery): Promise<SearchResult[]>;
}
```

#### 1.1.3 状態遷移

```
[Idle] ──search()──▶ [Fetching] ──success──▶ [Idle]
                         │
                         └──error──▶ [Idle] (return [])
```

#### 1.1.4 エラーハンドリング

| エラー条件 | 対応 | 戻り値 |
|-----------|------|--------|
| 空クエリ | バリデーションエラー | `[]` |
| ネットワークエラー | 例外をキャッチ | `[]` |
| タイムアウト | 3秒でタイムアウト | `[]` |
| プロバイダーエラー | フォールバック試行 | `[]` |

---

### 1.2 WideResearchEngine

#### 1.2.1 責務
- 複数検索エージェントの並列実行
- イテレーティブな深掘り調査
- カバレッジ分析とギャップ検出

#### 1.2.2 クラス設計

```typescript
class WideResearchEngine extends EventEmitter {
  // 依存コンポーネント
  private readonly queryPlanner: QueryPlanner;
  private readonly aggregator: ResultAggregator;
  private readonly coverageAnalyzer: CoverageAnalyzer;
  private readonly agents: ISearchAgent[];
  
  // 公開メソッド
  async research(
    query: string | ResearchQuery,
    config?: ResearchConfig
  ): Promise<ResearchResult>;
  
  // 内部メソッド
  private async executeParallelSearch(
    agents: ISearchAgent[],
    queries: string[],
    maxParallel: number
  ): Promise<AgentResult[]>;
  
  private analyzeGaps(results: AgentResult[]): GapAnalysis;
  private createBatches<T>(items: T[], batchSize: number): T[][];
}
```

#### 1.2.3 イベント一覧

| イベント名 | ペイロード | タイミング |
|-----------|-----------|-----------|
| `iterationStart` | `{iteration, totalIterations}` | イテレーション開始時 |
| `iterationComplete` | `{iteration, newFindings}` | イテレーション完了時 |
| `agentStarted` | `{agentType, query}` | エージェント実行開始時 |
| `agentCompleted` | `{agentType, resultCount}` | エージェント実行完了時 |
| `researchComplete` | `{totalFindings, duration}` | 全調査完了時 |

#### 1.2.4 アルゴリズム

```
1. クエリプランナーで初期クエリを生成
2. FOR iteration = 1 TO maxIterations:
   a. 各エージェントを並列実行（maxParallelAgents制限）
   b. 結果を集約・重複排除
   c. カバレッジ分析でギャップを検出
   d. IF 新規情報率 < convergenceThreshold:
      BREAK
   e. ギャップからフォローアップクエリを生成
3. 最終結果を構造化して返却
```

---

### 1.3 DocumentParser

#### 1.3.1 責務
- 各種ドキュメント形式のパース
- テキストコンテンツ抽出
- メタデータ抽出

#### 1.3.2 パーサー階層

```
IDocumentParser (interface)
    │
    ├── PDFParser      (PDF形式)
    ├── XLSXParser     (Excel形式)
    ├── DOCXParser     (Word形式)
    └── MarkdownParser (Markdown形式)
```

#### 1.3.3 ファクトリーパターン

```typescript
class DocumentParser implements IDocumentParser {
  private parsers: Map<string, IDocumentParser> = new Map([
    ['pdf', new PDFParser()],
    ['xlsx', new XLSXParser()],
    ['docx', new DOCXParser()],
    ['md', new MarkdownParser()],
  ]);
  
  async parse(file: Buffer, format: string): Promise<Result<ParsedDocument>>;
}
```

---

## 2. Analyzer モジュール詳細設計

### 2.1 TextAnalyzer

#### 2.1.1 責務
- テキストからのキーワード抽出
- センチメント分析
- 複雑度メトリクス計算

#### 2.1.2 クラス設計

```typescript
class TextAnalyzer implements ISummarizer {
  // 公開メソッド
  async analyze(text: string): Promise<TextAnalysis>;
  extractKeywords(text: string, maxCount?: number): string[];
  calculateComplexity(text: string): ComplexityMetrics;
  analyzeSentiment(text: string): SentimentScore;
  
  // 内部メソッド
  private tokenize(text: string): string[];
  private calculateTFIDF(tokens: string[]): Map<string, number>;
  private filterStopwords(tokens: string[]): string[];
}
```

#### 2.1.3 出力型

```typescript
interface TextAnalysis {
  readonly keywords: string[];
  readonly keywordScores: Map<string, number>;
  readonly sentiment: SentimentScore;
  readonly complexity: ComplexityMetrics;
  readonly language: string;
  readonly wordCount: number;
  readonly sentenceCount: number;
}

interface ComplexityMetrics {
  readonly fleschKincaid: number;      // Flesch-Kincaid Grade Level
  readonly averageSentenceLength: number;
  readonly averageWordLength: number;
  readonly uniqueWordRatio: number;
}

interface SentimentScore {
  readonly score: number;       // -1.0 to 1.0
  readonly label: 'positive' | 'neutral' | 'negative';
  readonly confidence: number;  // 0.0 to 1.0
}
```

---

### 2.2 EntityExtractor

#### 2.2.1 責務
- 固有表現抽出（NER）
- エンティティ分類
- 正規化・重複排除

#### 2.2.2 エンティティタイプ

| タイプ | 説明 | パターン例 |
|-------|------|-----------|
| PERSON | 人名 | 山田太郎、John Smith |
| ORGANIZATION | 組織名 | 株式会社〇〇、Google Inc. |
| LOCATION | 場所 | 東京都、New York |
| DATE | 日付 | 2026年1月13日、January 13, 2026 |
| TIME | 時刻 | 15:30、午後3時30分 |
| URL | URL | https://example.com |
| EMAIL | メールアドレス | user@example.com |
| PHONE | 電話番号 | 03-1234-5678 |
| MONEY | 金額 | ¥10,000、$100.00 |
| PERCENT | パーセンテージ | 50%、50パーセント |

#### 2.2.3 出力型

```typescript
interface ExtractedEntities {
  readonly persons: string[];
  readonly organizations: string[];
  readonly locations: string[];
  readonly dates: string[];
  readonly times: string[];
  readonly urls: string[];
  readonly emails: string[];
  readonly phones: string[];
  readonly money: string[];
  readonly percentages: string[];
  readonly all: Entity[];
}

interface Entity {
  readonly text: string;
  readonly type: EntityType;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly confidence: number;
}
```

---

### 2.3 FrameworkAnalyzer

#### 2.3.1 責務
- ビジネスフレームワーク分析
- 戦略示唆の生成
- クロス分析（SWOT等）

#### 2.3.2 サポートフレームワーク

| フレームワーク | メソッド | 入力 | 出力 |
|--------------|---------|------|------|
| SWOT | `analyzeSWOT()` | 強み/弱み/機会/脅威 | クロス戦略含む分析結果 |
| 3C | `analyzeThreeC()` | 自社/顧客/競合 | KSF・戦略示唆 |
| 4P | `analyzeFourP()` | 製品/価格/流通/販促 | 整合性スコア・改善提案 |
| 5Forces | `analyzeFiveForces()` | 5つの競争要因 | 業界魅力度・戦略示唆 |
| ValueChain | `analyzeValueChain()` | 主活動/支援活動 | 競争優位分析 |
| MECE | `analyzeMECE()` | 要素リスト | 漏れ・重複チェック |

---

### 2.4 MixtureOfAgents (MoA)

#### 2.4.1 責務
- 複数LLMエージェントの並列実行
- レスポンス集約
- コンセンサス計算

#### 2.4.2 クラス設計

```typescript
class MixtureOfAgents {
  private readonly agents: LLMAgent[];
  private readonly consensusCalculator: ConsensusCalculator;
  
  async generate(
    prompt: string,
    config?: MoAConfig
  ): Promise<MoAResult>;
  
  private async executeAgents(
    prompt: string,
    agents: LLMAgent[]
  ): Promise<AgentResponse[]>;
  
  private aggregateResponses(responses: AgentResponse[]): string;
}
```

#### 2.4.3 コンセンサス計算

```typescript
class ConsensusCalculator {
  // 各レスポンスの類似度マトリクスを計算
  calculateSimilarityMatrix(responses: string[]): number[][];
  
  // コンセンサススコアを計算
  calculateConsensus(responses: string[]): number;
  
  // 外れ値を検出
  detectOutliers(responses: string[], threshold: number): number[];
}
```

---

## 3. Generator モジュール詳細設計

### 3.1 ReportGenerator

#### 3.1.1 責務
- 構造化レポート生成
- 複数フォーマット出力
- 目次自動生成

#### 3.1.2 入力型

```typescript
interface ReportParams {
  readonly title: string;
  readonly sections: ReportSection[];
  readonly format: 'markdown' | 'html' | 'text';
  readonly metadata?: ReportMetadata;
  readonly options?: ReportOptions;
}

interface ReportSection {
  readonly heading: string;
  readonly content: string;
  readonly level?: number;
  readonly subsections?: ReportSection[];
}

interface ReportMetadata {
  readonly author?: string;
  readonly date?: string;
  readonly version?: string;
  readonly tags?: string[];
}
```

#### 3.1.3 出力フォーマット

| フォーマット | 特徴 |
|------------|------|
| markdown | GitHub Flavored Markdown |
| html | セマンティックHTML5 |
| text | プレーンテキスト |

---

### 3.2 ChartGenerator

#### 3.2.1 責務
- 各種チャート生成
- SVG/Mermaid出力
- データ可視化

#### 3.2.2 チャートタイプ

| タイプ | メソッド | 用途 |
|-------|---------|------|
| bar | `generateBar()` | 棒グラフ |
| line | `generateLine()` | 折れ線グラフ |
| pie | `generatePie()` | 円グラフ |
| scatter | `generateScatter()` | 散布図 |
| radar | `generateRadar()` | レーダーチャート |
| flowchart | `generateFlowchart()` | フローチャート（Mermaid） |
| sequence | `generateSequence()` | シーケンス図（Mermaid） |

#### 3.2.3 ビルダーパターン

```typescript
class SvgBuilder {
  private elements: SVGElement[] = [];
  
  rect(x: number, y: number, width: number, height: number): this;
  circle(cx: number, cy: number, r: number): this;
  line(x1: number, y1: number, x2: number, y2: number): this;
  text(x: number, y: number, content: string): this;
  path(d: string): this;
  
  build(): string;
}

class MermaidBuilder {
  private lines: string[] = [];
  
  flowchart(direction: 'TB' | 'LR'): this;
  node(id: string, label: string, shape?: NodeShape): this;
  edge(from: string, to: string, label?: string): this;
  
  build(): string;
}
```

---

### 3.3 WorkflowEngine

#### 3.3.1 責務
- マルチステップワークフロー実行
- 依存関係解決
- パイプライン制御

#### 3.3.2 ワークフロー定義

```typescript
interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly steps: WorkflowStep[];
  readonly config?: WorkflowConfig;
}

interface WorkflowStep {
  readonly id: string;
  readonly type: StepType;
  readonly config: StepConfig;
  readonly dependsOn?: string[];
  readonly condition?: StepCondition;
}

type StepType = 
  | 'collect'    // 情報収集
  | 'analyze'    // 分析
  | 'transform'  // 変換
  | 'generate'   // 生成
  | 'validate'   // 検証
  | 'publish';   // 公開
```

#### 3.3.3 実行エンジン

```typescript
class PipelineOrchestrator {
  async execute(workflow: WorkflowDefinition): Promise<WorkflowResult>;
  
  private resolveExecutionOrder(steps: WorkflowStep[]): WorkflowStep[];
  private executeStep(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  private evaluateCondition(condition: StepCondition, context: ExecutionContext): boolean;
}
```

---

## 4. Knowledge モジュール詳細設計

### 4.1 KnowledgeGraph

#### 4.1.1 責務
- ノード・エッジ管理
- グラフ構造の整合性維持
- 効率的なトラバーサル

#### 4.1.2 データ構造

```typescript
interface GraphNode {
  readonly id: ID;
  readonly type: string;
  readonly properties: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

interface GraphEdge {
  readonly id: ID;
  readonly source: ID;
  readonly target: ID;
  readonly type: string;
  readonly properties?: Record<string, unknown>;
  readonly weight?: number;
}

class KnowledgeGraph {
  private nodes: Map<ID, GraphNode>;
  private edges: Map<ID, GraphEdge>;
  private adjacencyList: Map<ID, Set<ID>>;
  private nodeTypeIndex: Map<string, Set<ID>>;
}
```

#### 4.1.3 操作の計算量

| 操作 | 計算量 | 備考 |
|------|--------|------|
| addNode | O(1) | ハッシュマップ挿入 |
| addEdge | O(1) | 隣接リスト更新含む |
| getNode | O(1) | ハッシュマップ参照 |
| getNeighbors | O(k) | kは隣接ノード数 |
| findByType | O(m) | mは該当タイプのノード数 |
| traverse (BFS/DFS) | O(V+E) | V:ノード数、E:エッジ数 |

---

### 4.2 GraphQuery

#### 4.2.1 責務
- グラフクエリ実行
- パス探索
- パターンマッチング

#### 4.2.2 クエリ言語

```typescript
interface GraphQueryParams {
  // ノード条件
  nodeType?: string;
  nodeProperties?: Record<string, unknown>;
  
  // エッジ条件
  edgeType?: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  
  // トラバーサル条件
  maxDepth?: number;
  limit?: number;
}

class GraphQuery {
  // 基本クエリ
  findByType(type: string): GraphNode[];
  findByProperty(key: string, value: unknown): GraphNode[];
  
  // パス探索
  shortestPath(from: ID, to: ID): GraphNode[];
  allPaths(from: ID, to: ID, maxDepth: number): GraphNode[][];
  
  // パターンマッチング
  match(pattern: GraphPattern): GraphMatch[];
}
```

---

## 5. Feedback モジュール詳細設計

### 5.1 WakeSleepCycle

#### 5.1.1 責務
- 観察データの収集（Wake）
- パターンライブラリの最適化（Sleep）
- パターンマッチングによる提案

#### 5.1.2 設定パラメータ

```typescript
interface WakeSleepConfig {
  // 品質閾値
  readonly minQualityThreshold: number;  // default: 0.3
  
  // ライブラリサイズ
  readonly maxLibrarySize: number;       // default: 500
  
  // 圧縮設定
  readonly compressionIterations: number; // default: 3
  
  // 自動Sleep
  readonly autoSleep: boolean;            // default: true
  readonly wakeThreshold: number;         // default: 50
  
  // パターン有効期限
  readonly patternTTLDays: number;        // default: 90
}
```

#### 5.1.3 パターンマッチングアルゴリズム

```
1. 入力テキストをトークン化
2. 各パターンについて:
   a. Jaccard類似度を計算
   b. コンテキスト一致度を計算
   c. 構造類似度を計算
   d. 複合スコア = 
      Jaccard * 0.65 + Context * 0.15 + Structure * 0.10 + QualityBoost
3. 品質乗数を適用: score *= pattern.quality * 2.8
4. 鮮度減衰を適用: score *= exp(-daysSinceUse / 0.8)
5. スコア降順でソート
6. 閾値以上のマッチを返却
```

#### 5.1.4 Sleepフェーズアルゴリズム

```
1. パターン品質評価:
   - 頻度スコア = 使用回数 / 最大使用回数
   - 汎用性スコア = テンプレート変数数 / 平均変数数
   - 有用性スコア = 成功回数 / 使用回数
   - 鮮度スコア = exp(-daysSinceUse / TTL)
   
2. 低品質パターン削除:
   - 総合スコア < minQualityThreshold のパターンを削除
   - 各タイプで最低3パターンは保持
   
3. パターン圧縮:
   - 類似度 > 0.45 のパターンペアを検出
   - 同一ドメインなら +0.3 ボーナス
   - 高品質パターンにマージ
   
4. ライブラリサイズ制限:
   - maxLibrarySize を超えた場合、低品質順に削除
```

---

### 5.2 PatternQualityEvaluator

#### 5.2.1 責務
- パターン品質の定量評価
- 改善提案の生成

#### 5.2.2 評価基準

```typescript
interface PatternQuality {
  readonly frequencyScore: number;   // 使用頻度 [0, 1]
  readonly generalityScore: number;  // テンプレート汎用性 [0, 1]
  readonly utilityScore: number;     // 成功率 [0, 1]
  readonly freshnessScore: number;   // 鮮度 [0, 1]
  readonly score: number;            // 総合スコア [0, 1]
}

// 総合スコア計算
score = frequencyScore * 0.2 
      + generalityScore * 0.2 
      + utilityScore * 0.4 
      + freshnessScore * 0.2
```

---

## 6. Orchestrator モジュール詳細設計

### 6.1 TaskDecomposer

#### 6.1.1 責務
- 複雑タスクの分解
- 依存関係グラフ構築
- 実行計画生成

#### 6.1.2 タスク型

```typescript
interface Task {
  readonly id: ID;
  readonly type: TaskType;
  readonly description: string;
  readonly inputs: TaskInput[];
  readonly outputs: TaskOutput[];
  readonly estimatedDuration: number;
  readonly priority: number;
}

interface TaskPlan {
  readonly tasks: Task[];
  readonly dependencies: Dependency[];
  readonly criticalPath: Task[];
  readonly totalEstimatedDuration: number;
}

interface Dependency {
  readonly from: ID;
  readonly to: ID;
  readonly type: 'finish-to-start' | 'start-to-start';
}
```

---

### 6.2 DialogueCollector

#### 6.2.1 責務
- 対話セッション管理
- 動的質問生成
- 意図推論

#### 6.2.2 質問カテゴリ

| カテゴリ | 目的 | 例 |
|---------|------|---|
| purpose | 目的・ゴール確認 | 「何を達成したいですか？」|
| background | 背景・経緯確認 | 「この課題に取り組むきっかけは？」|
| constraints | 制約条件確認 | 「予算や期限はありますか？」|
| stakeholders | 関係者確認 | 「誰が関わっていますか？」|
| scope | 範囲確認 | 「どこまでカバーしますか？」|
| success | 成功基準確認 | 「成功とは何ですか？」|

#### 6.2.3 質問生成戦略

| 戦略 | 説明 |
|------|------|
| breadth_first | 各カテゴリから1問ずつ |
| depth_first | 1カテゴリを深掘り |
| adaptive | 回答に応じて動的調整（推奨）|
| minimal | 必須質問のみ |

#### 6.2.4 意図推論

```typescript
interface InferredIntent {
  readonly surfaceIntent: string;    // 表層的な意図
  readonly trueIntent: string;       // 真の意図（推論）
  readonly confidence: number;       // 信頼度 [0, 1]
  readonly reasoning: string;        // 推論根拠
  readonly recommendedApproach: string;
}
```

---

## 7. Security モジュール詳細設計

### 7.1 SecurityAnalyzer

#### 7.1.1 責務
- アクションのリスク評価
- 許可/拒否判定
- 確認要求判定

#### 7.1.2 リスクレベル

| レベル | 数値 | 例 |
|-------|------|---|
| low | 1 | ファイル読み取り |
| medium | 2 | ファイル書き込み |
| high | 3 | ファイル削除、システムコマンド実行 |
| critical | 4 | 機密データアクセス、権限変更 |

#### 7.1.3 セキュリティポリシー

```typescript
interface SecurityPolicy {
  readonly allowPatterns: ActionPattern[];
  readonly denyPatterns: ActionPattern[];
  readonly requireConfirmationLevel: RiskLevel;
  readonly auditAll: boolean;
  readonly maxRiskLevel: RiskLevel;
}

interface ActionPattern {
  readonly type: string;          // 'file_write' | 'command_exec' | ...
  readonly pathPattern?: string;  // glob pattern
  readonly commandPattern?: string;
}
```

---

### 7.2 ActionLogger

#### 7.2.1 責務
- 全アクションの監査ログ記録
- ログ検索・フィルタリング
- ログエクスポート

#### 7.2.2 ログエントリ

```typescript
interface AuditLogEntry {
  readonly id: ID;
  readonly timestamp: Timestamp;
  readonly action: ActionDescriptor;
  readonly riskLevel: RiskLevel;
  readonly result: 'allowed' | 'denied' | 'confirmed';
  readonly user?: string;
  readonly duration?: number;
  readonly error?: string;
}
```

---

## 8. Workspace モジュール詳細設計

### 8.1 Workspace インターフェース

```typescript
interface Workspace {
  /** ワークスペースタイプ */
  readonly type: WorkspaceType;
  /** 作業ディレクトリ */
  readonly workingDir: string;
  /** 読み取り専用かどうか */
  readonly readOnly: boolean;
  
  // ファイル操作
  read(path: string, encoding?: BufferEncoding): Promise<string>;
  readBuffer(path: string): Promise<Buffer>;
  write(path: string, content: string): Promise<void>;
  writeBuffer(path: string, buffer: Buffer): Promise<void>;
  
  // ディレクトリ操作
  list(path: string): Promise<FileInfo[]>;
  listEntries(path: string): Promise<DirectoryEntry[]>;
  search(pattern: string): Promise<string[]>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  
  // 存在確認・メタデータ
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  stat(path: string): Promise<FileInfo>;
  
  // コピー・移動
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
}
```

### 8.2 LocalWorkspace

```typescript
class LocalWorkspace implements Workspace {
  readonly type = 'local';
  readonly workingDir: string;
  readonly readOnly: boolean;
  
  constructor(config: LocalWorkspaceConfig);
  
  // パス解決（workingDir外へのアクセスを防止）
  private resolvePath(path: string): string;
  private validatePath(filePath: string): void;  // throws WorkspaceError
}

interface LocalWorkspaceConfig {
  readonly type: 'local';
  readonly workingDir: string;
  readonly readOnly?: boolean;
}
```

### 8.3 DockerWorkspace

```typescript
class DockerWorkspace implements Workspace {
  readonly type = 'docker';
  readonly workingDir: string;
  readonly readOnly: boolean;
  
  private docker: Dockerode;
  private container: Dockerode.Container;
  private containerId: string;
  
  constructor(config: DockerWorkspaceConfig);
  
  // コンテナ内でコマンドを実行
  private async exec(cmd: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  
  // 初期化・クリーンアップ
  async initialize(): Promise<void>;
  async cleanup(): Promise<void>;
}

interface DockerWorkspaceConfig {
  readonly type: 'docker';
  readonly containerId: string;
  readonly workingDir: string;
  readonly readOnly?: boolean;
  readonly socketPath?: string;
}
```

### 8.4 MemoryWorkspace

```typescript
class MemoryWorkspace implements Workspace {
  readonly type = 'memory';
  readonly workingDir: string;
  readonly readOnly: boolean;
  
  constructor(config?: MemoryWorkspaceConfig);
  
  // メモリ上のファイルシステム
  private files: Map<string, Buffer>;
  
  // スナップショット機能
  snapshot(): WorkspaceSnapshot;
  restore(snapshot: WorkspaceSnapshot): void;
}

interface MemoryWorkspaceConfig {
  readonly type: 'memory';
  readonly workingDir?: string;  // default: '/'
  readonly readOnly?: boolean;
}
```

> **注**: RemoteWorkspace は将来実装予定（未実装）

---

## 9. Sandbox モジュール詳細設計

### 9.1 SandboxFactory

```typescript
class SandboxFactory {
  // ランタイムを指定して作成
  static create(
    config?: Partial<SandboxConfig>,
    runtime?: SandboxRuntime  // 'docker' | 'local' | 'wasm'
  ): ISandbox;
  
  // Dockerが利用可能か確認
  static async isDockerAvailable(): Promise<boolean>;
  
  // 環境に応じて最適なランタイムを自動選択
  static async autoDetect(): Promise<SandboxRuntime>;
  
  // 自動検出して作成
  static async createAuto(config?: Partial<SandboxConfig>): Promise<ISandbox>;
}

type SandboxRuntime = 'docker' | 'local' | 'wasm';
```

### 9.2 ISandbox インターフェース

```typescript
interface ISandbox {
  // コード実行
  execute(code: string, options?: ExecuteOptions): Promise<ExecutionResult>;
  
  // ファイル実行
  executeFile(filePath: string, options?: ExecuteOptions): Promise<ExecutionResult>;
  
  // リソースクリーンアップ
  cleanup(): Promise<void>;
  
  // イベントリスナー
  on(event: SandboxEventType, listener: SandboxEventListener): this;
}

interface ExecutionResult {
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly executionTime: number;  // ms
  readonly timedOut: boolean;
  readonly memoryUsed?: number;    // bytes (Docker only)
}

interface ExecuteOptions {
  readonly language?: SupportedLanguage;
  readonly timeout?: number;       // ms
  readonly input?: string;         // stdin
  readonly env?: Record<string, string>;
}

type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'shell';
```

### 9.3 リソース制限

| 制限項目 | LocalExecutor | DockerExecutor |
|---------|--------------|----------------|
| タイムアウト | ✅ | ✅ |
| メモリ | ❌ | ✅ (--memory) |
| CPU | ❌ | ✅ (--cpus) |
| ネットワーク | ❌ | ✅ (--network) |
| ファイルシステム | ❌ | ✅ (read-only) |

---

## 10. 改訂履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|----------|--------|
| 1.0 | 2026-01-13 | 初版作成 | GitHub Copilot |
| 1.1 | 2026-01-13 | レビュー反映: Workspace/Sandbox インターフェースを実装に合わせて修正、DockerWorkspace追加 | GitHub Copilot |

---

**文書終了**
