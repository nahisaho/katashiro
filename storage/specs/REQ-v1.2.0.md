# KATASHIRO v1.2.0 要件定義書（EARS形式）

**作成日**: 2026-01-14  
**バージョン**: 1.2.0  
**ステータス**: ドラフト  
**要件形式**: EARS (Easy Approach to Requirements Syntax)

---

## 1. 概要

### 1.1 目的

本ドキュメントは、KATASHIRO v1.2.0で実装すべき「反復合議型リサーチワークフロー」機能をEARS形式で定義する。

### 1.2 EARS パターン凡例

| パターン | 構文 | 用途 |
|----------|------|------|
| **Ubiquitous** | The [system] SHALL [action] | 常に適用される要件 |
| **Event-driven** | WHEN [event], the [system] SHALL [action] | イベント発生時の要件 |
| **State-driven** | WHILE [state], the [system] SHALL [action] | 特定状態での要件 |
| **Optional** | WHERE [feature], the [system] SHALL [action] | オプション機能の要件 |
| **Unwanted** | IF [condition], THEN the [system] SHALL [action] | 異常系の要件 |

### 1.3 背景・課題

v1.1.0リリース後のレポート品質評価において、以下の問題が確認された：

| 問題ID | 分類 | 内容 | 影響度 |
|--------|------|------|--------|
| ISSUE-007 | 品質 | 単一パスのリサーチでは情報の偏りや矛盾が残存 | 高 |
| ISSUE-008 | 信頼性 | 矛盾する情報源からの情報が未検証のまま出力される | 高 |
| ISSUE-009 | 網羅性 | 一度の調査では重要な観点が漏れる可能性 | 中 |
| ISSUE-010 | 一貫性 | 複数セクション間で論理的整合性が保証されない | 中 |

### 1.4 解決アプローチ

「反復合議型リサーチワークフロー（Iterative Consensus Research Workflow）」を導入：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Iteration 1 (Initial Research)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  並列実行               │
│  │ 調査    │  │ 調査    │  │ 調査    │                         │
│  │ 分析    │  │ 分析    │  │ 分析    │                         │
│  │ Report1 │  │ Report2 │  │ Report3 │                         │
│  └────┬────┘  └────┬────┘  └────┬────┘                         │
│       └────────────┼────────────┘                               │
│                    ▼                                            │
│           ┌───────────────┐                                     │
│           │ 矛盾検出      │                                     │
│           │ 最良選択      │                                     │
│           │ Consensus 1   │                                     │
│           └───────┬───────┘                                     │
└───────────────────┼─────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Iteration 2 (Refinement)                     │
├─────────────────────────────────────────────────────────────────┤
│  Input: Consensus 1                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  並列実行               │
│  │ 再調査  │  │ 再調査  │  │ 再調査  │  (Consensus 1参照)      │
│  │ 深掘り  │  │ 深掘り  │  │ 深掘り  │                         │
│  │ Report4 │  │ Report5 │  │ Report6 │                         │
│  └────┬────┘  └────┬────┘  └────┬────┘                         │
│       └────────────┼────────────┘                               │
│                    ▼                                            │
│           ┌───────────────┐                                     │
│           │ 矛盾検出      │                                     │
│           │ 最良選択      │                                     │
│           │ Consensus 2   │                                     │
│           └───────┬───────┘                                     │
└───────────────────┼─────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Iteration 3 (Final)                          │
├─────────────────────────────────────────────────────────────────┤
│  Input: Consensus 2                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  並列実行               │
│  │ 最終調査│  │ 最終調査│  │ 最終調査│  (Consensus 2参照)      │
│  │ 統合    │  │ 統合    │  │ 統合    │                         │
│  │ Report7 │  │ Report8 │  │ Report9 │                         │
│  └────┬────┘  └────┬────┘  └────┬────┘                         │
│       └────────────┼────────────┘                               │
│                    ▼                                            │
│           ┌───────────────┐                                     │
│           │ 矛盾検出      │                                     │
│           │ 最良選択      │                                     │
│           │ Final Report  │                                     │
│           └───────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 機能要件（EARS形式）

### 2.1 反復合議型リサーチエンジン

---

#### REQ-1.2.0-WFL-001: 並列リサーチ実行

**EARS Pattern**: Event-driven

> WHEN the user initiates an IterativeConsensusResearch with a topic,  
> the **ConsensusResearchEngine** SHALL execute N parallel research agents (default N=3).

**Acceptance Criteria**:
- AC1: Each agent SHALL independently execute: collect → analyze → generate report
- AC2: Agents SHALL NOT share intermediate state during execution
- AC3: All N agents SHALL complete before proceeding to consensus phase
- AC4: WHERE timeout is specified, agents SHALL be terminated after timeout
- AC5: Execution time of each agent SHALL be recorded for metrics

**Input Interface**:
```typescript
interface ConsensusResearchConfig {
  /** リサーチトピック */
  topic: string;
  /** 並列エージェント数（デフォルト: 3） */
  agentCount?: number;
  /** イテレーション数（デフォルト: 3） */
  iterationCount?: number;
  /** エージェントタイムアウト（ミリ秒、デフォルト: 300000） */
  agentTimeoutMs?: number;
  /** 矛盾許容閾値（0-1、デフォルト: 0.1） */
  conflictThreshold?: number;
  /** 検索プロバイダー設定 */
  searchConfig?: {
    provider?: 'duckduckgo' | 'searxng';
    maxResultsPerAgent?: number;
  };
}
```

**Traceability**: ISSUE-007, ISSUE-009 → REQ-1.2.0-WFL-001 → DES-1.2.0-WFL-001 → TSK-1.2.0-001

---

#### REQ-1.2.0-WFL-002: 矛盾検出・スコアリング

**EARS Pattern**: Event-driven

> WHEN N parallel reports are generated,  
> the **ConsensusResearchEngine** SHALL detect contradictions and score each report.

**Acceptance Criteria**:
- AC1: System SHALL use FactChecker.detectConflicts() for contradiction detection
- AC2: Each report SHALL receive a consistency score (0-1)
- AC3: Contradiction details SHALL include: conflicting statements, sources, severity
- AC4: WHERE all reports have conflicts above threshold, system SHALL flag for review
- AC5: Scoring criteria SHALL include: internal consistency, source reliability, coverage

**Output Interface**:
```typescript
interface ReportScore {
  /** レポートID */
  reportId: string;
  /** 一貫性スコア（0-1、高いほど矛盾が少ない） */
  consistencyScore: number;
  /** ソース信頼性スコア */
  sourceReliabilityScore: number;
  /** カバレッジスコア（トピック網羅度） */
  coverageScore: number;
  /** 総合スコア */
  overallScore: number;
  /** 検出された矛盾 */
  conflicts: ConflictDetail[];
  /** 未検証ステートメント数 */
  unverifiedCount: number;
}
```

**Traceability**: ISSUE-008 → REQ-1.2.0-WFL-002 → DES-1.2.0-WFL-002 → TSK-1.2.0-002

---

#### REQ-1.2.0-WFL-003: 最良レポート選択

**EARS Pattern**: Event-driven

> WHEN report scores are calculated,  
> the **ConsensusResearchEngine** SHALL select the best report as consensus.

**Acceptance Criteria**:
- AC1: Selection SHALL prioritize reports with highest consistency score
- AC2: WHERE multiple reports have equal consistency, coverage SHALL be tiebreaker
- AC3: Selected report SHALL be marked as "consensus" for the iteration
- AC4: Non-selected reports SHALL be retained for reference/audit
- AC5: Selection reasoning SHALL be logged

**Selection Algorithm**:
```
Score = (ConsistencyScore * 0.5) + (SourceReliabilityScore * 0.3) + (CoverageScore * 0.2)
Best = argmax(Score)
```

**Traceability**: ISSUE-008, ISSUE-010 → REQ-1.2.0-WFL-003 → DES-1.2.0-WFL-003 → TSK-1.2.0-003

---

#### REQ-1.2.0-WFL-004: 反復リファインメント

**EARS Pattern**: State-driven

> WHILE iteration < maxIterations,  
> the **ConsensusResearchEngine** SHALL use previous consensus as context for next iteration.

**Acceptance Criteria**:
- AC1: Each iteration SHALL receive previous consensus report as input context
- AC2: Agents SHALL focus on: gaps, unverified claims, areas needing deeper research
- AC3: Iteration context SHALL include: key findings, unresolved questions, sources used
- AC4: WHERE consistency improves < 5% over 2 consecutive iterations, early termination SHALL occur
- AC5: Iteration progress SHALL be emitted as events
- AC6: WHERE iteration=1 (initial), agents SHALL perform broad exploratory research

**Iteration Context**:
```typescript
interface IterationContext {
  /** イテレーション番号（1-based） */
  iteration: number;
  /** 前回のコンセンサスレポート（iteration=1の場合はnull） */
  previousConsensus: string | null;
  /** 前回のスコア（iteration=1の場合はnull） */
  previousScore: ReportScore | null;
  /** 未解決の疑問点 */
  unresolvedQuestions: string[];
  /** カバー済みソース（重複回避用） */
  coveredSources: string[];
  /** 深掘りが必要なエリア */
  areasToDeepen: string[];
  /** 初回イテレーションかどうか */
  isInitial: boolean;
}
```

**Note**: iteration=1（初回）の場合、`previousConsensus`と`previousScore`はnullとなり、`isInitial=true`となる。

**Traceability**: ISSUE-007, ISSUE-009 → REQ-1.2.0-WFL-004 → DES-1.2.0-WFL-004 → TSK-1.2.0-004

---

#### REQ-1.2.0-WFL-005: 最終レポート生成

**EARS Pattern**: Event-driven

> WHEN final iteration completes,  
> the **ConsensusResearchEngine** SHALL generate a comprehensive final report.

**Acceptance Criteria**:
- AC1: Final report SHALL include executive summary
- AC2: Final report SHALL include all iterations' key findings
- AC3: Final report SHALL include confidence levels for each claim
- AC4: Final report SHALL include source attribution with reliability scores
- AC5: Final report SHALL include methodology transparency section
- AC6: WHERE unresolved conflicts exist, they SHALL be explicitly noted

**Output Interface**:
```typescript
interface ConsensusResearchResult {
  /** 最終レポート（Markdown） */
  finalReport: string;
  /** 各イテレーションの結果 */
  iterations: IterationResult[];
  /** 総実行時間 */
  totalDurationMs: number;
  /** 総エージェント実行数 */
  totalAgentRuns: number;
  /** 最終スコア */
  finalScore: ReportScore;
  /** メタデータ */
  metadata: {
    topic: string;
    startedAt: string;
    completedAt: string;
    config: ConsensusResearchConfig;
  };
}

interface IterationResult {
  /** イテレーション番号 */
  iteration: number;
  /** 各エージェントのレポート */
  agentReports: AgentReport[];
  /** 各レポートのスコア */
  scores: ReportScore[];
  /** 選択されたコンセンサス */
  consensusReport: string;
  /** 選択理由 */
  selectionReason: string;
  /** イテレーション所要時間 */
  durationMs: number;
}

interface AgentReport {
  /** エージェントID */
  agentId: number;
  /** レポートID（UUID） */
  reportId: string;
  /** 生成されたレポート（Markdown） */
  content: string;
  /** 使用したソース */
  sources: SourceReference[];
  /** エージェント戦略 */
  strategy: AgentStrategy;
  /** 生成時刻 */
  generatedAt: string;
  /** 実行時間（ミリ秒） */
  durationMs: number;
}

interface SourceReference {
  /** ソースURL */
  url: string;
  /** タイトル */
  title: string;
  /** 取得日時 */
  fetchedAt: string;
  /** 信頼性スコア（0-1） */
  reliabilityScore?: number;
}

interface ConflictDetail {
  /** 矛盾ID */
  conflictId: string;
  /** 矛盾タイプ */
  type: 'contradiction' | 'inconsistency' | 'outdated';
  /** ステートメント1 */
  statement1: { text: string; source: string; reportId: string };
  /** ステートメント2 */
  statement2: { text: string; source: string; reportId: string };
  /** 深刻度（1-5） */
  severity: number;
  /** 検出信頼度（0-1） */
  confidence: number;
  /** 解決提案 */
  resolution?: string;
}
```

**Traceability**: ISSUE-007, ISSUE-008, ISSUE-009, ISSUE-010 → REQ-1.2.0-WFL-005 → DES-1.2.0-WFL-005 → TSK-1.2.0-005

---

### 2.2 エージェント実装

---

#### REQ-1.2.0-AGT-001: リサーチエージェント

**EARS Pattern**: Ubiquitous

> The **ResearchAgent** SHALL execute a complete research cycle: collect → analyze → report.

**Acceptance Criteria**:
- AC1: Agent SHALL use WebSearchClient for information collection
- AC2: Agent SHALL use WebScraper for page content extraction
- AC3: Agent SHALL use TextAnalyzer for content analysis
- AC4: Agent SHALL use EntityExtractor for entity extraction
- AC5: Agent SHALL use ReportGenerator for report generation
- AC6: Agent SHALL track all sources used

**Agent Pipeline**:
```
1. Search: WebSearchClient.search(topic) → SearchResult[]
2. Scrape: WebScraper.scrape(urls) → Content[]
3. Analyze: TextAnalyzer.analyze(contents) → Analysis[]
4. Extract: EntityExtractor.extract(contents) → Entity[]
5. Report: ReportGenerator.generate(data) → Report
```

**Traceability**: REQ-1.2.0-WFL-001 → REQ-1.2.0-AGT-001 → DES-1.2.0-AGT-001 → TSK-1.2.0-006

---

#### REQ-1.2.0-AGT-002: エージェント多様性

**EARS Pattern**: Ubiquitous

> The **ResearchAgent** instances SHALL have diverse search strategies to maximize coverage.

**Acceptance Criteria**:
- AC1: Agent 1 SHALL focus on primary/authoritative sources
- AC2: Agent 2 SHALL focus on recent news and updates
- AC3: Agent 3 SHALL focus on alternative perspectives and edge cases
- AC4: Search queries SHALL be varied across agents
- AC5: Source overlap between agents SHALL be minimized

**Diversity Strategies**:
```typescript
interface AgentStrategy {
  /** エージェントID */
  agentId: number;
  /** 検索クエリ修飾子 */
  queryModifiers: string[];
  /** 優先ソースタイプ */
  preferredSources: ('official' | 'news' | 'academic' | 'community')[];
  /** 時間範囲フィルタ */
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

// デフォルト戦略
const DEFAULT_STRATEGIES: AgentStrategy[] = [
  { agentId: 1, queryModifiers: ['公式', '発表'], preferredSources: ['official'], timeRange: 'all' },
  { agentId: 2, queryModifiers: ['最新', 'ニュース'], preferredSources: ['news'], timeRange: 'week' },
  { agentId: 3, queryModifiers: ['分析', '考察', '懸念'], preferredSources: ['academic', 'community'], timeRange: 'month' },
];
```

**Traceability**: ISSUE-009 → REQ-1.2.0-AGT-002 → DES-1.2.0-AGT-002 → TSK-1.2.0-007

---

### 2.3 エラーハンドリング

---

#### REQ-1.2.0-ERR-001: エージェント障害耐性

**EARS Pattern**: Unwanted

> IF an agent fails during execution,  
> THEN the **ConsensusResearchEngine** SHALL continue with remaining agents.

**Acceptance Criteria**:
- AC1: Failed agent SHALL be logged with error details
- AC2: WHERE 1 agent fails, consensus SHALL proceed with N-1 reports
- AC3: WHERE majority (>50%) agents fail, iteration SHALL be retried once
- AC4: WHERE retry also fails, error SHALL be propagated to caller
- AC5: Partial results SHALL be preserved for debugging

**Traceability**: REQ-1.2.0-WFL-001 → REQ-1.2.0-ERR-001 → DES-1.2.0-ERR-001 → TSK-1.2.0-008

---

#### REQ-1.2.0-ERR-002: タイムアウト処理

**EARS Pattern**: Unwanted

> IF an agent exceeds timeout,  
> THEN the **ConsensusResearchEngine** SHALL terminate the agent gracefully.

**Acceptance Criteria**:
- AC1: Agent SHALL receive cancellation signal at timeout
- AC2: Partial results (if any) SHALL be captured
- AC3: Timeout SHALL be logged with duration and last known state
- AC4: Other agents SHALL NOT be affected by timeout

**Traceability**: REQ-1.2.0-WFL-001 → REQ-1.2.0-ERR-002 → DES-1.2.0-ERR-002 → TSK-1.2.0-009

---

### 2.4 可観測性

---

#### REQ-1.2.0-OBS-001: プログレスイベント

**EARS Pattern**: State-driven

> WHILE research is in progress,  
> the **ConsensusResearchEngine** SHALL emit progress events.

**Acceptance Criteria**:
- AC1: Event SHALL be emitted at: iteration start, agent start, agent complete, consensus complete
- AC2: Event SHALL include: iteration number, agent id, status, progress percentage
- AC3: Events SHALL be consumable via EventEmitter pattern
- AC4: Events SHALL include timestamps

**Event Types**:
```typescript
type ConsensusResearchEvent =
  | { type: 'researchStarted'; topic: string; config: ConsensusResearchConfig }
  | { type: 'iterationStarted'; iteration: number; context: IterationContext }
  | { type: 'agentStarted'; iteration: number; agentId: number; strategy: AgentStrategy }
  | { type: 'agentCompleted'; iteration: number; agentId: number; durationMs: number; success: boolean }
  | { type: 'scoringCompleted'; iteration: number; scores: ReportScore[] }
  | { type: 'consensusSelected'; iteration: number; selectedAgentId: number; reason: string }
  | { type: 'iterationCompleted'; iteration: number; durationMs: number }
  | { type: 'researchCompleted'; result: ConsensusResearchResult }
  | { type: 'researchFailed'; error: Error };
```

**Traceability**: REQ-1.2.0-WFL-004 → REQ-1.2.0-OBS-001 → DES-1.2.0-OBS-001 → TSK-1.2.0-010

---

#### REQ-1.2.0-OBS-002: 透明性レポート

**EARS Pattern**: Event-driven

> WHEN research completes,  
> the **ConsensusResearchEngine** SHALL generate a transparency report.

**Acceptance Criteria**:
- AC1: Report SHALL include all agent decisions and reasoning
- AC2: Report SHALL include score calculations for each iteration
- AC3: Report SHALL include source attribution for all claims
- AC4: Report SHALL include conflict resolution decisions
- AC5: Report SHALL be machine-readable (JSON) and human-readable (Markdown)

**Traceability**: ISSUE-008 → REQ-1.2.0-OBS-002 → DES-1.2.0-OBS-002 → TSK-1.2.0-011

---

## 3. 非機能要件

### 3.1 性能要件

#### REQ-1.2.0-NFR-001: 実行時間

**EARS Pattern**: Ubiquitous

> The **ConsensusResearchEngine** SHALL complete a 3-iteration research within 10 minutes (typical case).

**Breakdown**:
- Per agent: ~60 seconds (search + scrape + analyze + report)
- Per iteration: ~90 seconds (3 agents parallel + consensus)
- 3 iterations: ~5 minutes
- Buffer for network latency: +5 minutes

**Traceability**: REQ-1.2.0-NFR-001 → DES-1.2.0-NFR-001 → TSK-1.2.0-012

---

#### REQ-1.2.0-NFR-002: 並列実行

**EARS Pattern**: Ubiquitous

> The **ConsensusResearchEngine** SHALL execute agents in parallel using Promise.allSettled().

**Rationale**: 一つのエージェントの失敗が他に影響しないようにする。

**Traceability**: REQ-1.2.0-NFR-002 → DES-1.2.0-NFR-002 → TSK-1.2.0-013

---

### 3.2 互換性要件

#### REQ-1.2.0-NFR-003: 既存API互換

**EARS Pattern**: Ubiquitous

> The **ConsensusResearchEngine** SHALL be usable standalone and SHALL NOT break existing APIs.

**Traceability**: REQ-1.2.0-NFR-003 → DES-1.2.0-NFR-003 → TSK-1.2.0-014

**Integration Point**:
```typescript
// 既存のDeepResearchOrchestratorと並行して使用可能
import { ConsensusResearchEngine } from '@nahisaho/katashiro';

const engine = new ConsensusResearchEngine();
const result = await engine.research('トピック', { iterationCount: 3 });
```

---

## 4. トレーサビリティマトリクス

| 要件ID | 課題ID | 設計ID | タスクID | 優先度 |
|--------|--------|--------|----------|--------|
| REQ-1.2.0-WFL-001 | ISSUE-007, ISSUE-009 | DES-1.2.0-WFL-001 | TSK-1.2.0-001 | High |
| REQ-1.2.0-WFL-002 | ISSUE-008 | DES-1.2.0-WFL-002 | TSK-1.2.0-002 | High |
| REQ-1.2.0-WFL-003 | ISSUE-008, ISSUE-010 | DES-1.2.0-WFL-003 | TSK-1.2.0-003 | High |
| REQ-1.2.0-WFL-004 | ISSUE-007, ISSUE-009 | DES-1.2.0-WFL-004 | TSK-1.2.0-004 | High |
| REQ-1.2.0-WFL-005 | ISSUE-007~010 | DES-1.2.0-WFL-005 | TSK-1.2.0-005 | High |
| REQ-1.2.0-AGT-001 | - | DES-1.2.0-AGT-001 | TSK-1.2.0-006 | High |
| REQ-1.2.0-AGT-002 | ISSUE-009 | DES-1.2.0-AGT-002 | TSK-1.2.0-007 | Medium |
| REQ-1.2.0-ERR-001 | - | DES-1.2.0-ERR-001 | TSK-1.2.0-008 | Medium |
| REQ-1.2.0-ERR-002 | - | DES-1.2.0-ERR-002 | TSK-1.2.0-009 | Medium |
| REQ-1.2.0-OBS-001 | - | DES-1.2.0-OBS-001 | TSK-1.2.0-010 | Low |
| REQ-1.2.0-OBS-002 | ISSUE-008 | DES-1.2.0-OBS-002 | TSK-1.2.0-011 | Low |
| REQ-1.2.0-NFR-001 | - | DES-1.2.0-NFR-001 | TSK-1.2.0-012 | Medium |
| REQ-1.2.0-NFR-002 | - | DES-1.2.0-NFR-002 | TSK-1.2.0-013 | Medium |
| REQ-1.2.0-NFR-003 | - | DES-1.2.0-NFR-003 | TSK-1.2.0-014 | Medium |

---

## 5. 用語集

| 用語 | 定義 |
|------|------|
| **Consensus** | 複数のレポートから矛盾が最も少ないものを選択した結果 |
| **Iteration** | 並列実行 → 矛盾検出 → 選択 の1サイクル |
| **Agent** | 独立してリサーチを実行するワーカー |
| **Conflict** | 複数ソース間での矛盾する情報 |
| **Coverage** | トピックに対する情報の網羅度 |
| **SourceReliability** | 情報源の信頼性スコア（0-1）。公式ソース、学術ソースほど高スコア |
| **ConsistencyScore** | レポート内の論理的一貫性スコア（0-1）。矛盾が少ないほど高スコア |

---

## 6. 改訂履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|---------|------|
| 0.1 | 2026-01-14 | 初版作成 | KATASHIRO |
| 0.2 | 2026-01-14 | 型定義追加（AgentReport, ConflictDetail等）、NFR形式統一、用語集拡充 | KATASHIRO |

---

## 7. 承認

| 役割 | 名前 | 日付 | 署名 |
|------|------|------|------|
| 作成者 | KATASHIRO Agent | 2026-01-14 | ✅ |
| レビュー | - | - | ⏳ 未完了 |
| 承認 | - | - | ⏳ 未完了 |
