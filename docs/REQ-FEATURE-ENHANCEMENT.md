# KATASHIRO 機能強化 要件定義書

> **Version**: 1.0.0  
> **Date**: 2025-01-12  
> **Reference**: [langchain-ai/open_deep_research](https://github.com/langchain-ai/open_deep_research)

---

## 📊 設計方針

### 重要: KATASHIROの役割

**KATASHIROはGitHub Copilot等のAIコーディングエージェント上で利用されます。**

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Copilot                           │
│                   (LLMエージェント層)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  - Think/Plan（戦略的思考）      ← Copilotが担当         ││
│  │  - Task Decomposition（タスク分解）                      ││
│  │  - Iteration Control（反復制御）                         ││
│  │  - Report Generation（レポート生成）                     ││
│  └─────────────────────────────────────────────────────────┘│
│                          ↓ ツール呼び出し                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    KATASHIRO                             ││
│  │                 (ツールキット層)                          ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │Collector │ │ Analyzer │ │Generator │ │Knowledge │   ││
│  │  │ - search │ │ - analyze│ │ - summary│ │ - graph  │   ││
│  │  │ - scrape │ │ - extract│ │ - report │ │ - query  │   ││
│  │  │ - feed   │ │ - topic  │ │ - cite   │ │ - persist│   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 実装しない機能（GitHub Copilotが担当）

| 機能 | 理由 |
|------|------|
| LLMエージェント層 | Copilotが担当 |
| Think Tool（戦略的思考） | Copilotが担当 |
| Supervisor/Researcher Architecture | Copilotが担当 |
| Task Decomposition（タスク分解） | Copilotが担当 |
| Iteration Control（反復制御） | Copilotが担当 |
| LLM統合インターフェース | Copilotが担当 |

### KATASHIROが提供する機能

| 機能カテゴリ | 提供機能 |
|-------------|---------|
| **情報収集** | Web検索、スクレイピング、RSSフィード |
| **テキスト分析** | キーワード抽出、エンティティ抽出、構造分析 |
| **コンテンツ生成** | 要約、レポートテンプレート、引用生成 |
| **知識管理** | KnowledgeGraph（ノード追加、検索、永続化） |

---

## 🔍 機能比較分析

### open_deep_research vs KATASHIRO

| 機能領域 | open_deep_research | GitHub Copilot | KATASHIRO |
|---------|-------------------|----------------|-----------|
| **戦略的思考** | think_tool | ✅ 内蔵 | 不要 |
| **タスク分解** | supervisor | ✅ 内蔵 | 不要 |
| **反復制御** | max_iterations | ✅ 内蔵 | 不要 |
| **LLM呼び出し** | init_chat_model | ✅ 内蔵 | 不要 |
| **Web検索** | Tavily等 | ❌ | ✅ 提供 |
| **スクレイピング** | 検索API内包 | ❌ | ✅ 提供 |
| **テキスト分析** | LLM依存 | △ 可能 | ✅ 提供（ルールベース・高速） |
| **エンティティ抽出** | LLM依存 | △ 可能 | ✅ 提供（ルールベース・高速） |
| **レポートテンプレート** | LLM生成 | △ 可能 | ✅ 提供 |
| **知識管理** | ❌ | ❌ | ✅ 提供 |
| **品質ゲート** | ❌ | ❌ | ✅ 提供 |

### KATASHIRO v0.2.3 既存機能の評価

| パッケージ | 機能 | 状態 | 備考 |
|-----------|------|------|------|
| **collector** | WebSearchClient | ✅ 良好 | DuckDuckGo, SearXNG対応 |
| **collector** | WebScraper | ✅ 良好 | - |
| **collector** | FeedReader | ✅ 良好 | RSS対応 |
| **analyzer** | TextAnalyzer | ✅ 良好 | ルールベース・高速 |
| **analyzer** | EntityExtractor | ✅ 良好 | 人名・組織・日付等 |
| **analyzer** | TopicModeler | ✅ 良好 | - |
| **analyzer** | QualityScorer | ✅ 良好 | - |
| **generator** | SummaryGenerator | ✅ 良好 | - |
| **generator** | ReportGenerator | ✅ 良好 | - |
| **generator** | CitationGenerator | ✅ 良好 | - |
| **knowledge** | KnowledgeGraph | ✅ 良好 | - |
| **mcp-server** | MCP Server | ⚠️ 要確認 | ツール公開状況確認 |
| **cli** | CLI | ✅ 良好 | search, scrape, analyze, extract, summarize |

---

## 🎯 要件定義

### Priority Legend
- **P1**: 推奨（品質向上・利便性向上）
- **P2**: 検討（将来拡張）

---

### P1 Requirements（品質向上・利便性向上）

#### REQ-ENH-001: MCP Server ツール公開確認・強化

**説明**: GitHub Copilot等のエージェントからMCP経由でKATASHIRO機能を呼び出せることを確認・強化

**確認項目**:
- [ ] mcp-serverパッケージの現状機能確認
- [ ] 公開されているツール一覧の確認
- [ ] 不足しているツールの特定

**目標ツール一覧**:
```typescript
// MCP Server経由で公開すべきツール
const mcpTools = [
  // Collector
  { name: 'katashiro_web_search', description: 'Web検索を実行' },
  { name: 'katashiro_web_scrape', description: 'URLからコンテンツを取得' },
  { name: 'katashiro_rss_feed', description: 'RSSフィードを取得' },
  
  // Analyzer
  { name: 'katashiro_text_analyze', description: 'テキスト分析（キーワード、複雑度）' },
  { name: 'katashiro_entity_extract', description: 'エンティティ抽出' },
  { name: 'katashiro_topic_model', description: 'トピック分類' },
  { name: 'katashiro_quality_score', description: '品質スコア算出' },
  
  // Generator
  { name: 'katashiro_summarize', description: 'テキスト要約' },
  { name: 'katashiro_generate_report', description: 'レポート生成' },
  { name: 'katashiro_generate_citation', description: '引用生成' },
  
  // Knowledge
  { name: 'katashiro_knowledge_add', description: 'ナレッジグラフにノード追加' },
  { name: 'katashiro_knowledge_query', description: 'ナレッジグラフを検索' },
  { name: 'katashiro_knowledge_save', description: 'ナレッジグラフを保存' },
  { name: 'katashiro_knowledge_load', description: 'ナレッジグラフを読み込み' },
];
```

---

#### REQ-ENH-002: AGENTS.md 更新

**説明**: GitHub Copilot等のエージェントがKATASHIROを効果的に活用できるようにAGENTS.mdを更新

**追加項目**:
- [ ] Deep Research実行パターンの追加
- [ ] 並列検索の推奨パターン
- [ ] トークン効率を考慮した利用ガイド

**例：Deep Research パターン**:
```typescript
// GitHub Copilotが実行するDeep Researchパターン
async function deepResearch(topic: string) {
  // 1. 並列検索（Copilotが呼び出し）
  const searches = await Promise.all([
    searchClient.search(`${topic} 概要`),
    searchClient.search(`${topic} 最新動向`),
    searchClient.search(`${topic} 課題`),
  ]);
  
  // 2. 上位結果をスクレイピング
  const urls = searches.flat().slice(0, 10).map(r => r.url);
  const contents = await Promise.all(urls.map(url => scraper.scrape(url)));
  
  // 3. 各コンテンツを分析（ルールベース・高速）
  const analyses = await Promise.all(contents.map(c => analyzer.analyze(c)));
  const entities = await Promise.all(contents.map(c => extractor.extract(c)));
  
  // 4. Copilotがレポートを生成（LLM使用）
  // → KATASHIROのReportGeneratorはテンプレート提供のみ
}
```

---

#### REQ-ENH-003: 検索プロバイダー拡張（低優先）

**説明**: Tavilyなど追加の検索プロバイダーをサポート

```typescript
type SearchProvider = 
  | 'duckduckgo'  // 現在対応
  | 'searxng'     // 現在対応
  | 'tavily'      // 追加検討（APIキー必要）
  | 'brave';      // 追加検討（APIキー必要）
```

**優先度**: Low（DuckDuckGo/SearXNGで十分機能している）

---

### P2 Requirements（将来拡張）

#### REQ-ENH-010: Knowledge Graph ヘルパー関数

**説明**: リサーチ結果をKnowledge Graphに保存するヘルパー関数

```typescript
// GitHub Copilotが呼び出すヘルパー関数
async function saveResearchToKnowledge(
  topic: string,
  findings: string[],
  sources: string[],
  knowledgeGraph: KnowledgeGraph
): Promise<void>;
```

---

#### REQ-ENH-011: バッチ処理ヘルパー

**説明**: 複数URLの並列スクレイピングなど、バッチ処理を効率化

```typescript
// 並列スクレイピング
async function batchScrape(
  urls: string[],
  options?: { concurrency?: number }
): Promise<ScrapedContent[]>;

// 並列検索
async function batchSearch(
  queries: string[],
  options?: { provider?: SearchProvider }
): Promise<SearchResult[][]>;
```

---

## 📋 結論

### 現状評価

KATASHIRO v0.2.3は**GitHub Copilotと組み合わせて使用するツールキット**として、既に十分な機能を持っています。

| 評価項目 | 状態 |
|---------|------|
| 情報収集機能 | ✅ 十分 |
| テキスト分析機能 | ✅ 十分 |
| コンテンツ生成機能 | ✅ 十分 |
| 知識管理機能 | ✅ 十分 |
| CLI | ✅ 十分 |
| MCP Server | ⚠️ 要確認 |

### 推奨アクション

1. **REQ-ENH-001**: MCP Serverの現状確認（必要に応じて強化）
2. **REQ-ENH-002**: AGENTS.mdにDeep Researchパターンを追加

上記2点の対応で、KATASHIROはGitHub Copilot上での**Deep Research**に十分対応できます。

---

## 🔗 参考資料

- [open_deep_research GitHub](https://github.com/langchain-ai/open_deep_research)
- [KATASHIRO GitHub](https://github.com/nahisaho/katashiro)
- [AGENTS.md](../AGENTS.md)

---

## 📝 変更履歴

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-01-12 | 初版作成（設計方針明確化） |
