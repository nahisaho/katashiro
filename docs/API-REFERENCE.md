# KATASHIRO - AI Coding Agent Guide

> **AI Coding Agent向け**: このファイルを読み込んだAIエージェントは、ユーザーの課題を解決するためにKATASHIROライブラリの機能を自動的に活用できます。

## 🎯 このガイドの目的

ユーザーが自然言語で入力した課題に対して、KATASHIROの機能を適切に組み合わせて解決策を提供します。

---

## 🚨🚨🚨 最重要: Deep Research利用時の必須ルール 🚨🚨🚨

> **⚠️ AIエージェントへの指示**: ユーザーが「〜について調べて」「調査して」「レポートを作成して」と依頼した場合、
> **絶対にTypeScriptスクリプトを作成しないでください**。代わりに以下のCLIコマンドを直接実行してください。

### ✅ 正しい対応（CLI実行）

```bash
# 調査依頼への正しい対応
npx katashiro deep-research "調査トピック" --iterations 5 > reports/output.md
```

### ❌ 間違った対応（スクリプト作成）

```typescript
// ❌ これはやらないでください
import { deepResearch } from '@nahisaho/katashiro';
const report = await deepResearch(...);  // スクリプト作成は非推奨
```

### 判定フロー

```
ユーザー依頼: 「〜について調べて」「調査して」「レポート作成」
    ↓
質問1: Deep Research（調査）に関連するか？
    ├─ Yes → CLI実行: npx katashiro deep-research "トピック"
    └─ No  → 他の機能を検討
```

### CLI実行例

| 依頼例 | 実行コマンド |
|-------|------------|
| 「AIについて調べて」 | `npx katashiro deep-research "AI" --iterations 5` |
| 「競合分析して」 | `npx katashiro deep-research "競合分析" --framework swot` |
| 「市場調査して」 | `npx katashiro deep-research "市場調査" --framework 3c` |
| 「レポート作成」 | `npx katashiro deep-research "トピック" > reports/report.md` |

---


### 課題タイプの判定

ユーザーの入力から以下のタイプを判定してください：

| 課題タイプ | キーワード例 | 使用する機能 |
|-----------|-------------|-------------|
| **調査・リサーチ** | 調べて、検索、情報収集、〜について | `npx katashiro deep-research` (CLI推奨) |
| **Deep Research** | 詳しく調べて、徹底的に、包括的に、網羅的に | `npx katashiro deep-research --iterations 5` |
| **Deep Research Agent** | エージェントで調査、自律的に調べて、反復調査 | `npx katashiro deep-research --framework auto` |
| **高信頼調査** | 信頼性高く、リトライあり、エラー耐性 | UrlProcessor + RetryHandler + FallbackHandler |
| **並列調査** | 並列で調べて、高速に、同時に | ParallelExecutor + DomainRateLimiter |
| **戦略策定** | 戦略、SWOT、3C、5Forces、競合分析 | `npx katashiro deep-research --framework swot` |
| **分析・解析** | 分析して、解析、キーワード、傾向 | Analyzer |
| **要約・まとめ** | 要約、まとめて、短くして | Generator (SummaryGenerator) |
| **レポート作成** | レポート、報告書、文書化 | Generator (ReportGenerator) |
| **データ抽出** | 抽出、取り出して、リストアップ | Analyzer (EntityExtractor) |
| **知識管理** | 保存、記録、覚えておいて | Knowledge |
| **比較・評価** | 比較、評価、どちらが | Collector → Analyzer → Generator |
| **LLM対話** | AIに聞いて、LLMで生成、チャット | LLMClient |
| **コード実行** | コードを実行、スクリプト実行、安全に実行 | DockerExecutor, LocalExecutor |
| **セキュリティ分析** | セキュリティチェック、リスク分析、監査 | SecurityAnalyzer, ActionLogger |
| **ファイル操作** | ファイル読み書き、ワークスペース操作 | LocalWorkspace, DockerWorkspace |
| **モニタリング** | トレース、メトリクス、ヘルスチェック | Tracer, MetricsCollector, HealthChecker |

---

## ⚠️ 重要: TypeScriptコード生成・実行ワークフロー

DeepResearchやその他の機能でTypeScriptコードを生成・実行する際は、**必ず以下のワークフローに従ってください**。

### 必須ワークフロー

```
1. コード生成
   ↓
2. TypeScript型チェック（tsc --noEmit）
   ↓
3. エラーがあれば修正
   ↓
4. 実行
```

### 実行前チェックリスト

生成したTypeScriptコードを実行する前に、以下を確認してください：

#### 1. Result型APIのチェック
```typescript
// ❌ 間違い - WebScraper.scrape()はResult型を返す
const page = await scraper.scrape(url);
console.log(page.content);  // エラー！

// ✅ 正しい
const page = await scraper.scrape(url);
if (isOk(page)) {
  console.log(page.value.content);
}
```

#### 2. 直接値APIのチェック
```typescript
// ❌ 間違い - TextAnalyzer.analyze()は直接オブジェクトを返す
const analysis = await analyzer.analyze(text);
if (isOk(analysis)) {  // エラー！isOk()は不要
  console.log(analysis.value.keywords);
}

// ✅ 正しい
const analysis = await analyzer.analyze(text);
console.log(analysis.keywords);
```

#### 3. 型チェックコマンド
```bash
# 生成したファイルの型チェック
npx tsc --noEmit your-script.ts

# エラーがあれば修正してから実行
npx tsx your-script.ts
```

### AIエージェントへの指示

**DeepResearch実行時のワークフロー**:

1. **コード生成**: KATASHIROのAPIを使用してTypeScriptコードを生成
2. **型チェック**: `npx tsc --noEmit` でコンパイルエラーをチェック
3. **エラー修正**: 型エラーがあれば、このドキュメントの「戻り値の型について」セクションを参照して修正
4. **実行**: エラーがなくなってから `npx tsx` で実行
5. **結果確認**: 実行結果を確認し、必要に応じて修正

**重要**: 型チェックをスキップしてはいけません。Result型と直接値の混同は最も一般的なエラーです。

---

## 🔄 課題解決ワークフロー

### ステップ1: 課題の分析

```typescript
// ユーザー入力から課題タイプを判定
function analyzeProblem(userInput: string): ProblemType {
  const keywords = {
    research: ['調べ', '検索', '情報', 'について', '知りたい'],
    analyze: ['分析', '解析', 'キーワード', '傾向', '特徴'],
    summarize: ['要約', 'まとめ', '短く', '簡潔'],
    report: ['レポート', '報告', '文書', 'ドキュメント'],
    extract: ['抽出', '取り出', 'リスト', '一覧'],
    knowledge: ['保存', '記録', '覚え', '登録'],
    compare: ['比較', '評価', 'どちら', '違い'],
  };
  // キーワードマッチングで判定
}
```

### ステップ2: 必要な機能の選択

課題タイプに応じて以下のクラスを使用：

```typescript
import {
  // 情報収集（URLや検索クエリがある場合）
  WebScraper,        // URL指定のページ取得
  WebSearchClient,   // キーワード検索
  FeedReader,        // RSSフィード
  ApiClient,         // API呼び出し
  
  // DeepResearch 強化機能（v2.2.0）
  DeepResearchOrchestrator, // Deep Research統括オーケストレーター
  UrlProcessor,      // URL処理（リトライ+フォールバック+キャッシュ統合）
  IterationController, // イテレーション制御・収束判定
  
  // リトライ機構（v2.2.0）
  RetryHandler,      // 指数バックオフリトライ
  ExponentialBackoff, // バックオフ計算
  RetryError,        // リトライエラー型
  
  // フォールバック機構（v2.2.0）
  FallbackHandler,   // フォールバック戦略実行
  WaybackMachineClient, // Internet Archive連携
  
  // ロギング（v2.2.0）
  StructuredLogger,  // 構造化ログ出力（JSON/Text）
  SensitiveDataMasker, // 機密情報マスキング
  ConsoleTransport,  // コンソール出力
  MemoryTransport,   // メモリ蓄積（テスト用）
  
  // robots.txt準拠（v2.2.0）
  RobotsParser,      // robots.txtパース・判定
  
  // 並列処理（v2.2.0）
  ParallelExecutor,  // 並列実行オーケストレーター
  Semaphore,         // セマフォ（同時実行数制御）
  DomainRateLimiter, // ドメイン別レート制限
  AdaptiveConcurrencyController, // 動的並列度調整
  ConcurrencyQueue,  // 並列キュー管理
  ResourceMonitor,   // CPU/メモリ監視
  ContentStreamHandler, // 大規模コンテンツストリーム処理
  
  // キャッシュ管理（v2.2.0）
  ContentManager,    // キャッシュ+バージョン管理統合
  ContentCache,      // LRUキャッシュ
  CheckpointManager, // チェックポイント保存・復元
  VersionControl,    // コンテンツバージョン管理
  
  // テキスト分析（テキストデータがある場合）
  TextAnalyzer,      // キーワード・複雑度分析
  EntityExtractor,   // 人名・組織名抽出
  TopicModeler,      // トピック分類
  StructureAnalyzer, // 文書構造解析
  QualityScorer,     // 品質スコアリング
  
  // コンサルティングフレームワーク（戦略策定の場合）
  FrameworkAnalyzer, // SWOT, 3C, 4P, 5Forces, ValueChain, MECE等
  
  // コンテンツ生成（出力が必要な場合）
  ReportGenerator,   // レポート生成
  SummaryGenerator,  // 要約生成
  CitationGenerator, // 引用生成
  TemplateEngine,    // テンプレート処理
  
  // 知識管理（情報を蓄積・検索する場合）
  KnowledgeGraph,    // グラフ管理
  GraphQuery,        // 検索
  GraphPersistence,  // 永続化
  
  // LLM統合（v2.0.0）
  LLMClient,         // LLMクライアント（OpenAI/Anthropic/Ollama対応）
  PromptManager,     // プロンプト管理
  TokenCounter,      // トークンカウント
  
  // 可観測性（v2.0.0）
  Tracer,            // 分散トレーシング
  MetricsCollector,  // メトリクス収集
  HealthChecker,     // ヘルスチェック
  
  // サンドボックス実行（v2.0.0）
  DockerExecutor,    // Docker内でコード実行
  LocalExecutor,     // ローカルサンドボックス実行
  SandboxFactory,    // サンドボックスファクトリー
  executeCode,       // コード実行ヘルパー
  
  // セキュリティ（v2.0.0）
  SecurityAnalyzer,  // セキュリティリスク分析
  ActionLogger,      // アクション監査ログ
  
  // ワークスペース管理（v2.0.0）
  LocalWorkspace,    // ローカルファイルシステム操作
  DockerWorkspace,   // Docker内ワークスペース
  WorkspaceFactory,  // ワークスペースファクトリー
  
  // Deep Research Agent（v2.1.0）
  DeepResearchAgent, // jina-ai風反復型リサーチエージェント
  TokenTracker,      // トークン予算管理
  KnowledgeStore,    // 中間知識ストア
  ActionTracker,     // アクション履歴追跡
  ActionRouter,      // アクション決定ロジック
  QueryRewriter,     // クエリ拡張・書き換え
  AnswerEvaluator,   // 回答品質評価
  
  // ユーティリティ
  ok, err, isOk, isErr,
} from '@nahisaho/katashiro';
```

### ⚠️ 重要: 戻り値の型について

KATASHIROのAPIには**2種類の戻り値パターン**があります。コード生成時は必ず区別してください。

#### 1. 直接値を返すAPI（`isOk()` 不要）

以下のAPIは**直接値を返す**ため、`isOk()` を使用しません：

| API | 戻り値の型 | 使用例 |
|-----|-----------|-------|
| `WebSearchClient.search()` | `Promise<SearchResult[]>` | `const results = await client.search(query);` |
| `TextAnalyzer.analyze()` | `Promise<{ keywords, complexity, sentiment, ... }>` | `const analysis = await analyzer.analyze(text);` |
| `EntityExtractor.extract()` | `Promise<ExtractedEntities>` | `const entities = await extractor.extract(text);` |
| `SummaryGenerator.generate()` | `Promise<string>` | `const summary = await summarizer.generate(text);` |
| `ReportGenerator.generate()` | `Promise<string>` | `const report = await reportGen.generate(config);` |

```typescript
// ✅ 正しい使い方
const results = await searchClient.search('AI');
console.log(`${results.length}件の結果`);

const analysis = await analyzer.analyze(text);
console.log(`キーワード: ${analysis.keywords.join(', ')}`);

const entities = await extractor.extract(text);
console.log(`${entities.all.length}個のエンティティ`);

const summary = await summarizer.generate(text);
console.log(`${summary.length}文字の要約`);
```

#### 2. `Result<T, E>` を返すAPI（`isOk()` 必須）

以下のAPIは**Result型を返す**ため、`isOk()` でチェックが必要です：

| API | 戻り値の型 | 使用例 |
|-----|-----------|-------|
| `WebScraper.scrape()` | `Promise<Result<ScrapingResult, Error>>` | `if (isOk(page)) { page.value.content }` |
| `WebScraper.scrapeMultiple()` | `Promise<Result<ScrapingResult, Error>[]>` | 各要素を`isOk()`でチェック |
| `SummaryGenerator.summarize()` | `Promise<Result<string, Error>>` | `if (isOk(result)) { result.value }` |
| `SummaryGenerator.generateSummary()` | `Promise<Result<string, Error>>` | `if (isOk(result)) { result.value }` |
| `TextAnalyzer.summarize()` | `Promise<Result<Summary, Error>>` | `if (isOk(summary)) { summary.value }` |
| `FactChecker.checkWithSources()` | `Promise<Result<FactCheckResultDetail, Error>>` | `if (isOk(result)) { ... }` |
| `FactChecker.detectConflicts()` | `Promise<Result<ConflictDetectionResult, Error>>` | `if (isOk(result)) { ... }` |
| `DocumentParser.parse()` | `Promise<Result<ParsedDocument, Error>>` | `if (isOk(doc)) { doc.value }` |
| `PDFParser.parse()` | `Promise<Result<ParsedDocument, Error>>` | `if (isOk(doc)) { ... }` |
| `DOCXParser.parse()` | `Promise<Result<ParsedDocument, Error>>` | `if (isOk(doc)) { ... }` |
| `XLSXParser.parse()` | `Promise<Result<ParsedDocument, Error>>` | `if (isOk(doc)) { ... }` |
| `ApiClient.getSafe()` | `Promise<Result<T, Error>>` | `if (isOk(response)) { ... }` |
| `ApiClient.postSafe()` | `Promise<Result<T, Error>>` | `if (isOk(response)) { ... }` |
| `CodeInterpreter.execute()` | `Promise<Result<ExecutionResult, Error>>` | `if (isOk(result)) { ... }` |
| `TrendAnalyzer.analyze()` | `Promise<Result<TrendAnalysisResult, Error>>` | `if (isOk(result)) { ... }` |
| `DiagramGenerator.generate*()` | `Promise<Result<DiagramOutput, Error>>` | `if (isOk(diagram)) { ... }` |

```typescript
// ✅ 正しい使い方（Result型のみ isOk() を使用）
const page = await scraper.scrape(url);
if (isOk(page)) {
  console.log(page.value.content);  // .value でアンラップ
} else {
  console.error(page.error);        // .error でエラー取得
}

// SummaryGenerator.summarize() もResult型
const summaryResult = await summarizer.summarize(text);
if (isOk(summaryResult)) {
  console.log(summaryResult.value);  // string
}

// ❌ 間違い（直接値を返すAPIに isOk() を使用）
const results = await searchClient.search('AI');
// if (isOk(results)) { ... }  // エラー！results は配列

// ❌ 間違い（generate() と summarize() を混同）
const summary = await summarizer.generate(text);  // これは直接string
// if (isOk(summary)) { ... }  // エラー！summaryはstring
```

> **注意**: `SummaryGenerator` には2つのメソッドがあります：
> - `generate()` → 直接 `string` を返す（`isOk()` 不要）
> - `summarize()` → `Result<string, Error>` を返す（`isOk()` 必須）

---

## 📝 課題タイプ別の実装パターン

### パターンA: 調査・リサーチ課題

**ユーザー例**: 「〇〇について調べてまとめて」

```typescript
async function solveResearchProblem(topic: string) {
  // 1. 情報収集（文字列でも検索可能）
  const searchClient = new WebSearchClient();
  const results = await searchClient.search(topic);  // 文字列を直接渡せる
  // オプション付き: await searchClient.search({ query: topic, maxResults: 10, provider: 'duckduckgo' });
  
  // 2. ページ取得
  const scraper = new WebScraper();
  const contents: string[] = [];
  for (const result of results.slice(0, 5)) {
    const page = await scraper.scrape(result.url);
    if (isOk(page)) contents.push(page.value.content);
  }
  
  // 3. 分析
  const analyzer = new TextAnalyzer();
  const analyses = await Promise.all(contents.map(c => analyzer.analyze(c)));
  
  // 4. エンティティ抽出
  const extractor = new EntityExtractor();
  const allEntities: Entity[] = [];
  for (const content of contents) {
    const extracted = await extractor.extract(content);
    // extract() は ExtractedEntities オブジェクトを返す
    // extracted.persons, extracted.organizations, extracted.urls など
    allEntities.push(...extracted.all);  // all プロパティで全エンティティ配列にアクセス
  }
  
  // 5. 要約生成
  const summarizer = new SummaryGenerator();
  const summary = await summarizer.generate(contents.join('\n\n'), { maxLength: 500 });
  
  // 6. レポート生成
  const reportGen = new ReportGenerator();
  const report = await reportGen.generate({
    title: `${topic} 調査レポート`,
    sections: [
      { heading: '概要', content: summary },
      { heading: 'キーワード', content: analyses.flatMap(a => a.keywords).join(', ') },
      { heading: '関連エンティティ', content: [...new Set(allEntities.map(e => e.text))].join(', ') },
      { heading: '参考URL', content: results.map(r => `- ${r.url}`).join('\n') },
    ],
    format: 'markdown',
  });
  
  return report;
}
```

### パターンB: 分析課題

**ユーザー例**: 「このテキストを分析して特徴を教えて」

```typescript
async function solveAnalysisProblem(text: string) {
  // 1. テキスト分析
  const analyzer = new TextAnalyzer();
  const analysis = await analyzer.analyze(text);
  
  // 2. 構造分析
  const structAnalyzer = new StructureAnalyzer();
  const structure = await structAnalyzer.analyze(text);
  
  // 3. エンティティ抽出
  const extractor = new EntityExtractor();
  const extracted = await extractor.extract(text);
  // extracted は ExtractedEntities 型:
  // { persons, organizations, locations, dates, urls, emails, all, ... }
  
  // 4. 品質スコアリング
  const scorer = new QualityScorer();
  const quality = await scorer.score(text);
  
  return {
    keywords: analysis.keywords,
    complexity: analysis.complexity,
    sentiment: analysis.sentiment,
    structure: structure,
    entities: {
      persons: extracted.persons,
      organizations: extracted.organizations,
      locations: extracted.locations,
      total: extracted.all.length,
    },
    qualityScore: quality,
  };
}
```

### パターンC: 要約課題

**ユーザー例**: 「この長文を300文字でまとめて」

```typescript
async function solveSummaryProblem(text: string, maxLength: number = 300) {
  const summarizer = new SummaryGenerator();
  const summary = await summarizer.generate(text, { 
    maxLength,
    style: 'paragraph' // または 'bullets', 'headline'
  });
  return summary;
}
```

### パターンD: レポート作成課題

**ユーザー例**: 「分析結果をレポートにまとめて」

```typescript
async function solveReportProblem(data: any, title: string) {
  const reportGen = new ReportGenerator();
  const report = await reportGen.generate({
    title,
    sections: [
      { heading: '概要', content: data.summary },
      { heading: '詳細分析', content: data.details },
      { heading: '結論', content: data.conclusion },
    ],
    format: 'markdown',
    metadata: { author: 'KATASHIRO', date: new Date().toISOString() },
  });
  return report;
}
```

### パターンE: データ抽出課題

**ユーザー例**: 「この文章から人名と組織名を抽出して」

```typescript
async function solveExtractionProblem(text: string) {
  const extractor = new EntityExtractor();
  const extracted = await extractor.extract(text);
  
  // extract() は構造化されたオブジェクトを返す
  return {
    persons: extracted.persons,         // string[]
    organizations: extracted.organizations,  // string[]
    locations: extracted.locations,     // string[]
    urls: extracted.urls,               // string[]
    all: extracted.all,                 // Entity[]（全エンティティ）
  };
}
```

### パターンF: 知識管理課題

**ユーザー例**: 「この情報を保存しておいて」「〇〇に関連する情報を探して」

```typescript
async function solveKnowledgeProblem(action: 'save' | 'search', data: any) {
  const kg = new KnowledgeGraph();
  const persistence = new GraphPersistence();
  
  // 既存のグラフを読み込み
  try {
    const loaded = await persistence.load('./knowledge-graph.json');
    Object.assign(kg, loaded);
  } catch { /* 新規作成 */ }
  
  if (action === 'save') {
    // エンティティを抽出してノード追加
    const extractor = new EntityExtractor();
    const extracted = await extractor.extract(data.text);
    
    for (const entity of extracted.all) {
      kg.addNode({
        id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: entity.type,
        properties: { name: entity.text, source: data.source },
      });
    }
    
    await persistence.save(kg, './knowledge-graph.json');
    return { saved: extracted.all.length };
  } else {
    // 検索
    const query = new GraphQuery(kg);
    const results = query.search(data.query);
    return results;
  }
}
```

### パターンG: 比較・評価課題

**ユーザー例**: 「AとBを比較して」

```typescript
async function solveComparisonProblem(itemA: string, itemB: string) {
  const searchClient = new WebSearchClient();
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  
  // 両方の情報を収集
  const [resultsA, resultsB] = await Promise.all([
    searchClient.search(itemA, { maxResults: 5 }),
    searchClient.search(itemB, { maxResults: 5 }),
  ]);
  
  // 分析
  const analysisA = await analyzeResults(resultsA, scraper, analyzer);
  const analysisB = await analyzeResults(resultsB, scraper, analyzer);
  
  // 比較レポート生成
  const reportGen = new ReportGenerator();
  return reportGen.generate({
    title: `${itemA} vs ${itemB} 比較レポート`,
    sections: [
      { heading: itemA, content: formatAnalysis(analysisA) },
      { heading: itemB, content: formatAnalysis(analysisB) },
      { heading: '比較まとめ', content: generateComparison(analysisA, analysisB) },
    ],
    format: 'markdown',
  });
}
```

### パターンH: 戦略策定課題

**ユーザー例**: 「〇〇のSWOT分析をして」「競争戦略を立てて」「マーケティング戦略を考えて」

```typescript
import { FrameworkAnalyzer } from '@nahisaho/katashiro';

async function solveStrategyProblem(topic: string, frameworkType: string) {
  const analyzer = new FrameworkAnalyzer();
  const searchClient = new WebSearchClient();
  const scraper = new WebScraper();
  const reportGen = new ReportGenerator();

  // 1. 情報収集（戦略策定の材料を集める）
  const searchQueries = [
    `${topic} 強み 特徴`,
    `${topic} 課題 弱み`,
    `${topic} 市場 機会`,
    `${topic} 競合 脅威`,
  ];
  const results = await Promise.all(
    searchQueries.map(q => searchClient.search(q, { maxResults: 5 }))
  );

  // 2. フレームワーク分析を実行
  switch (frameworkType) {
    case 'swot': {
      const swot = analyzer.analyzeSWOT({
        strengths: ['技術力', 'ブランド力', '顧客基盤'],
        weaknesses: ['販売網', 'コスト構造'],
        opportunities: ['市場成長', 'DX需要', '規制緩和'],
        threats: ['競合参入', '技術陳腐化', '景気変動'],
      });
      // クロスSWOT戦略が自動生成される
      return reportGen.generate({
        title: `${topic} SWOT分析レポート`,
        sections: [
          { heading: '強み (Strengths)', content: swot.strengths.map(s => `- ${s.item}`).join('\n') },
          { heading: '弱み (Weaknesses)', content: swot.weaknesses.map(w => `- ${w.item}`).join('\n') },
          { heading: '機会 (Opportunities)', content: swot.opportunities.map(o => `- ${o.item}`).join('\n') },
          { heading: '脅威 (Threats)', content: swot.threats.map(t => `- ${t.item}`).join('\n') },
          { heading: '戦略オプション', content: swot.crossStrategies.map(s => `### ${s.name}\n${s.description}`).join('\n\n') },
        ],
        format: 'markdown',
      });
    }

    case '3c': {
      const threeC = analyzer.analyzeThreeC({
        company: [
          { name: '技術力', detail: '独自技術保有', importance: 5 },
          { name: 'ブランド', detail: '認知度高い', importance: 4 },
        ],
        customer: [
          { name: 'ニーズ', detail: '利便性重視', importance: 5 },
          { name: '購買行動', detail: 'オンライン中心', importance: 4 },
        ],
        competitor: [
          { name: '主要競合', detail: '3社寡占', importance: 5 },
          { name: '差別化要因', detail: '価格・品質', importance: 4 },
        ],
      });
      return reportGen.generate({
        title: `${topic} 3C分析レポート`,
        sections: [
          { heading: '自社 (Company)', content: threeC.company.summary },
          { heading: '顧客 (Customer)', content: threeC.customer.summary },
          { heading: '競合 (Competitor)', content: threeC.competitor.summary },
          { heading: 'KSF (重要成功要因)', content: threeC.keySuccessFactors.map(k => `- ${k}`).join('\n') },
          { heading: '戦略示唆', content: threeC.strategicImplications.map(s => `- ${s}`).join('\n') },
        ],
        format: 'markdown',
      });
    }

    case '5forces': {
      const fiveForces = analyzer.analyzeFiveForces({
        newEntrants: { intensity: 3, factors: ['参入障壁中程度', '資本集約的'] },
        substitutes: { intensity: 2, factors: ['代替品少ない'] },
        buyerPower: { intensity: 4, factors: ['価格感度高い', '情報非対称性低い'] },
        supplierPower: { intensity: 2, factors: ['供給者多数'] },
        rivalry: { intensity: 5, factors: ['競争激化', '差別化困難'] },
      });
      return reportGen.generate({
        title: `${topic} 5Forces分析レポート`,
        sections: [
          { heading: '新規参入の脅威', content: `強度: ${fiveForces.newEntrants.intensity}/5\n${fiveForces.newEntrants.description}` },
          { heading: '代替品の脅威', content: `強度: ${fiveForces.substitutes.intensity}/5\n${fiveForces.substitutes.description}` },
          { heading: '買い手の交渉力', content: `強度: ${fiveForces.buyerPower.intensity}/5\n${fiveForces.buyerPower.description}` },
          { heading: '売り手の交渉力', content: `強度: ${fiveForces.supplierPower.intensity}/5\n${fiveForces.supplierPower.description}` },
          { heading: '業界内競争', content: `強度: ${fiveForces.rivalry.intensity}/5\n${fiveForces.rivalry.description}` },
          { heading: '業界魅力度', content: `スコア: ${fiveForces.industryAttractiveness}/5` },
          { heading: '戦略示唆', content: fiveForces.strategicImplications.map(s => `- ${s}`).join('\n') },
        ],
        format: 'markdown',
      });
    }

    case '4p': {
      const fourP = analyzer.analyzeFourP({
        product: { current: ['主力製品A', '新製品B'], strengths: ['品質'], challenges: ['ラインナップ'] },
        price: { current: ['中価格帯'], strengths: ['競争力'], challenges: ['利益率'] },
        place: { current: ['直販', '代理店'], strengths: ['カバレッジ'], challenges: ['EC強化'] },
        promotion: { current: ['Web広告', '展示会'], strengths: ['認知度'], challenges: ['費用対効果'] },
      });
      return reportGen.generate({
        title: `${topic} 4P分析レポート`,
        sections: [
          { heading: 'Product (製品)', content: formatFourPElement(fourP.product) },
          { heading: 'Price (価格)', content: formatFourPElement(fourP.price) },
          { heading: 'Place (流通)', content: formatFourPElement(fourP.place) },
          { heading: 'Promotion (販促)', content: formatFourPElement(fourP.promotion) },
          { heading: '4P整合性スコア', content: `${fourP.consistency}/5` },
          { heading: '改善提案', content: fourP.recommendations.map(r => `- ${r}`).join('\n') },
        ],
        format: 'markdown',
      });
    }

    case 'valuechain': {
      const valueChain = analyzer.analyzeValueChain({
        primaryActivities: [
          { name: '購買', type: 'inbound', valueContribution: 3, costRatio: 0.2 },
          { name: '製造', type: 'operations', valueContribution: 5, costRatio: 0.35 },
          { name: '出荷', type: 'outbound', valueContribution: 3, costRatio: 0.15 },
          { name: 'マーケティング', type: 'marketing', valueContribution: 4, costRatio: 0.2 },
          { name: 'サービス', type: 'service', valueContribution: 4, costRatio: 0.1 },
        ],
        supportActivities: [
          { name: 'IT基盤', type: 'technology', valueContribution: 4, costRatio: 0.1 },
          { name: '人事', type: 'hr', valueContribution: 3, costRatio: 0.08 },
        ],
      });
      return reportGen.generate({
        title: `${topic} バリューチェーン分析レポート`,
        sections: [
          { heading: '主活動', content: valueChain.primaryActivities.map(a => `- ${a.name}: 価値貢献${a.valueContribution}/5, コスト${(a.costRatio*100).toFixed(0)}%`).join('\n') },
          { heading: '支援活動', content: valueChain.supportActivities.map(a => `- ${a.name}: 価値貢献${a.valueContribution}/5`).join('\n') },
          { heading: '価値創造ポイント', content: valueChain.valueCreationPoints.map(p => `- ${p}`).join('\n') },
          { heading: '競争優位', content: valueChain.competitiveAdvantages.map(a => `- ${a}`).join('\n') },
        ],
        format: 'markdown',
      });
    }

    default:
      // MECE分析やロジックツリーなど
      const mece = analyzer.analyzeMECE(['要素1', '要素2', '要素3']);
      return { mece };
  }
}

// 利用可能なフレームワーク一覧
const availableFrameworks = {
  swot: 'SWOT分析（強み・弱み・機会・脅威）',
  '3c': '3C分析（自社・顧客・競合）',
  '4p': '4P分析（製品・価格・流通・販促）',
  '5forces': '5Forces分析（ポーターの競争戦略）',
  valuechain: 'バリューチェーン分析',
  mece: 'MECE分析（漏れなく・ダブりなく）',
  logictree: 'ロジックツリー（Why/How/What）',
  hypothesis: '仮説フレームワーク',
  issuetree: 'イシューツリー',
};
```

---

## 🚀 統合ソルバー

ユーザーの課題を自動判定して解決：

```typescript
import * as katashiro from '@nahisaho/katashiro';

async function solveProblem(userInput: string, context?: any) {
  // 課題タイプを判定
  const problemType = detectProblemType(userInput);
  
  switch (problemType) {
    case 'research':
      return solveResearchProblem(extractTopic(userInput));
    case 'deepResearch':
      return deepResearch(extractTopic(userInput));
    case 'strategy':
      return solveStrategyProblem(extractTopic(userInput), detectFrameworkType(userInput));
    case 'analyze':
      return solveAnalysisProblem(context?.text || userInput);
    case 'summarize':
      return solveSummaryProblem(context?.text || userInput, extractMaxLength(userInput));
    case 'report':
      return solveReportProblem(context?.data, extractTitle(userInput));
    case 'extract':
      return solveExtractionProblem(context?.text || userInput, extractEntityTypes(userInput));
    case 'knowledge':
      return solveKnowledgeProblem(detectKnowledgeAction(userInput), context);
    case 'compare':
      const [itemA, itemB] = extractComparisonItems(userInput);
      return solveComparisonProblem(itemA, itemB);
    default:
      // 汎用的なリサーチとして処理
      return solveResearchProblem(userInput);
  }
}

// フレームワークタイプの検出
function detectFrameworkType(input: string): string {
  if (/swot/i.test(input) || /強み.*弱み|脅威.*機会/.test(input)) return 'swot';
  if (/3c|自社.*顧客.*競合/.test(input)) return '3c';
  if (/4p|マーケティング.*ミックス|製品.*価格.*流通/.test(input)) return '4p';
  if (/5forces|ファイブフォース|競争.*力/.test(input)) return '5forces';
  if (/バリューチェーン|価値連鎖/.test(input)) return 'valuechain';
  if (/mece|ミーシー|漏れなく/.test(input)) return 'mece';
  return 'swot'; // デフォルト
}
```

---

## 🤖 DeepResearchAgent パターン（v2.1.0）

jina-ai/node-DeepResearch風の**自律型リサーチエージェント**です。5種類のアクション（search, visit, reflect, answer, coding）を組み合わせて反復的に調査を行います。

### 基本的な使用方法

```typescript
import {
  DeepResearchAgent,
  TokenTracker,
  KnowledgeStore,
} from '@nahisaho/katashiro';

// LLMクライアント（chat()メソッドを持つインターフェース）
const llmClient = {
  async chat(options: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    // OpenAI, Anthropic, Ollama等のAPIを呼び出す実装
  },
};

// Web検索クライアント
const searchClient = new WebSearchClient();

// Webスクレイパー
const scraper = new WebScraper();

// エージェント作成
const agent = new DeepResearchAgent({
  llmClient,
  searchClient,
  scraper,
  config: {
    maxSteps: 30,        // 最大ステップ数
    tokenBudget: 500000, // トークン予算
    maxUrls: 10,         // 最大URL訪問数
  },
});

// イベントリスナー登録（プログレス監視）
agent.on((event) => {
  switch (event.type) {
    case 'stepStart':
      console.log(`📍 Step ${event.data.step}: ${event.data.action}`);
      break;
    case 'stepComplete':
      console.log(`✅ Step ${event.data.step} completed`);
      break;
    case 'knowledgeAdded':
      console.log(`📚 Knowledge: ${event.data.summary}`);
      break;
    case 'answerGenerated':
      console.log(`💡 Answer generated`);
      break;
    case 'error':
      console.error(`❌ Error: ${event.data.message}`);
      break;
  }
});

// リサーチ実行
const result = await agent.research('AIの医療分野への影響は何ですか？');

console.log('Answer:', result.answer);
console.log('Confidence:', result.confidence);
console.log('Steps:', result.steps.length);
console.log('Knowledge Items:', result.knowledgeItems.length);
console.log('Token Usage:', result.tokenUsage);
```

### 5つのアクションタイプ

| アクション | 説明 | パラメータ |
|-----------|------|-----------|
| **search** | Web検索を実行 | `searchQueries: string[]` |
| **visit** | URLを訪問してコンテンツ抽出 | `urlTargets: number[]` |
| **reflect** | 収集情報を分析、サブ質問生成 | `questions: string[]` |
| **answer** | 最終回答を生成 | `answer: string, isFinal?: boolean` |
| **coding** | 計算・コード実行 | `codingIssue: string, code?: string` |

### 回答品質評価（5つの基準）

```typescript
const evaluator = new AnswerEvaluator({ llmClient });

const evaluation = await evaluator.evaluate({
  question: 'AIの医療分野への影響は？',
  answer: '...',
  knowledgeItems: store.getAll(),
});

// 評価基準
console.log('Freshness:', evaluation.freshness);      // 情報の新しさ (0-1)
console.log('Plurality:', evaluation.plurality);      // 視点の多様性 (0-1)
console.log('Completeness:', evaluation.completeness); // 網羅性 (0-1)
console.log('Attribution:', evaluation.attribution);  // 根拠の明確さ (0-1)
console.log('Definitive:', evaluation.definitive);    // 明確さ (0-1)
console.log('Overall:', evaluation.overall);          // 総合スコア (0-1)
```

### Beast Mode（強制回答）

トークン予算が尽きた場合や、ステップ上限に達した場合に強制的に回答を生成：

```typescript
const agent = new DeepResearchAgent({
  llmClient,
  searchClient,
  scraper,
  config: {
    maxSteps: 10,
    tokenBudget: 100000,
    enableBeastMode: true, // 有効化
  },
});

// Beast Modeが発動した場合
agent.on((event) => {
  if (event.type === 'beastModeActivated') {
    console.log('⚡ Beast Mode activated - forcing answer generation');
  }
});
```

---

## 🔬 Deep Research パターン

複雑な調査課題に対して、**幅広い情報収集 → 反復的な深掘り → 統合分析**のパターンを適用します。

### 課題タイプの判定

以下のキーワードがある場合、Deep Researchパターンを適用：

| トリガー | キーワード例 |
|---------|-------------|
| **深い調査** | 詳しく調べて、徹底的に、包括的に、網羅的に |
| **多角的分析** | 様々な観点から、複数の視点で |
| **戦略的調査** | 戦略を立てて、計画を策定 |
| **市場調査** | 市場分析、競合調査、トレンド分析 |

### Deep Research ワークフロー

```typescript
/**
 * Deep Research パターン
 * 
 * Phase 1: 幅広い情報収集（Broad Search）
 * Phase 2: 反復的深掘り（Iterative Deepening）
 * Phase 3: 統合・合成（Synthesis）
 */
async function deepResearch(topic: string, options?: DeepResearchOptions) {
  const searchClient = new WebSearchClient();
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  const extractor = new EntityExtractor();
  const summarizer = new SummaryGenerator();
  const reportGen = new ReportGenerator();
  const kg = new KnowledgeGraph();

  // ========== Phase 1: 幅広い情報収集 ==========
  // 複数の検索クエリを生成して並列実行
  const searchQueries = generateSearchQueries(topic);
  // 例: ["topic overview", "topic latest news", "topic expert opinions"]
  
  const allResults = await Promise.all(
    searchQueries.map(q => searchClient.search(q, { maxResults: 10 }))
  );
  
  // 重複除去してユニークなURLを取得
  const uniqueUrls = [...new Set(allResults.flatMap(r => r.map(item => item.url)))];
  
  // 上位N件のページを取得
  const contents: Array<{ url: string; content: string }> = [];
  for (const url of uniqueUrls.slice(0, 15)) {
    const page = await scraper.scrape(url);
    if (isOk(page)) {
      contents.push({ url, content: page.value.content });
    }
  }

  // ========== Phase 2: 反復的深掘り ==========
  // 収集した内容を分析してギャップを特定
  const analyses = await Promise.all(
    contents.map(c => analyzer.analyze(c.content))
  );
  
  // エンティティ抽出で関連トピックを発見
  const entities = await Promise.all(
    contents.map(c => extractor.extract(c.content))
  );
  
  // 新たに発見したキーワードで追加検索（反復）
  const discoveredTopics = extractNewTopics(entities, topic);
  if (discoveredTopics.length > 0) {
    const additionalResults = await Promise.all(
      discoveredTopics.slice(0, 3).map(t => 
        searchClient.search(`${topic} ${t}`, { maxResults: 5 })
      )
    );
    // 追加コンテンツを収集...
  }
  
  // ナレッジグラフに情報を蓄積
  for (const entity of entities.flatMap(e => e.all)) {
    kg.addNode({
      id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: entity.type,
      properties: { name: entity.text, topic },
    });
  }

  // ========== Phase 3: 統合・合成 ==========
  // 全コンテンツを統合して要約
  const combinedContent = contents.map(c => c.content).join('\n\n---\n\n');
  const executiveSummary = await summarizer.generate(combinedContent, { 
    maxLength: 1000,
    style: 'paragraph'
  });
  
  // キーワードを集約
  const allKeywords = [...new Set(analyses.flatMap(a => a.keywords))];
  
  // 参照元を整理
  const sources = contents.map(c => c.url);
  
  // 構造化レポート生成
  const report = await reportGen.generate({
    title: `${topic} - Deep Research Report`,
    sections: [
      { heading: 'エグゼクティブサマリー', content: executiveSummary },
      { heading: '主要な発見', content: formatKeyFindings(analyses) },
      { heading: '関連キーワード', content: allKeywords.slice(0, 20).join(', ') },
      { heading: '関連エンティティ', content: formatEntities(entities) },
      { heading: '情報ソース', content: sources.map(s => `- ${s}`).join('\n') },
    ],
    format: 'markdown',
    metadata: { 
      author: 'KATASHIRO Deep Research',
      date: new Date().toISOString(),
      sourceCount: contents.length,
    },
  });
  
  return { report, knowledgeGraph: kg };
}

// 補助関数
function generateSearchQueries(topic: string): string[] {
  return [
    topic,
    `${topic} 最新動向`,
    `${topic} 専門家 意見`,
    `${topic} 事例 ケーススタディ`,
    `${topic} 課題 問題点`,
  ];
}

function extractNewTopics(entities: ExtractedEntities[], baseTopic: string): string[] {
  const allNames = entities.flatMap(e => [
    ...e.organizations,
    ...e.persons,
  ]);
  // 元のトピックと異なる関連トピックを抽出
  return [...new Set(allNames)].filter(n => !baseTopic.includes(n)).slice(0, 5);
}
```

### Deep Research 実行例

**ユーザー例**: 「生成AIの企業活用について詳しく調べてレポートにまとめて」

```typescript
// Deep Researchを実行
const result = await deepResearch('生成AI 企業活用', {
  maxSources: 20,        // 最大ソース数
  iterationDepth: 2,     // 深掘り反復回数
  includeKnowledgeGraph: true,
});

// 結果: 構造化されたレポート + ナレッジグラフ
console.log(result.report);
```

### Plan-and-Execute パターン（複雑な調査）

複数のサブタスクに分解して実行する高度なパターン：

```typescript
async function planAndExecuteResearch(complexQuery: string) {
  // 1. クエリを分解してサブタスクを生成
  const subTasks = decomposeQuery(complexQuery);
  // 例: "AIと教育の未来" → ["AI教育ツール", "教育改革トレンド", "AI倫理と教育"]
  
  // 2. 各サブタスクを並列実行
  const subResults = await Promise.all(
    subTasks.map(task => deepResearch(task))
  );
  
  // 3. 結果を統合
  const synthesizer = new ReportGenerator();
  return synthesizer.generate({
    title: `${complexQuery} - 包括的調査レポート`,
    sections: subResults.map((r, i) => ({
      heading: subTasks[i],
      content: r.report,
    })),
    format: 'markdown',
  });
}

function decomposeQuery(query: string): string[] {
  // AIエージェントがクエリを分解
  // KATASHIROはツールとして分解されたサブタスクを実行
  return [
    `${query} 現状分析`,
    `${query} 成功事例`,
    `${query} 課題と対策`,
    `${query} 将来展望`,
  ];
}
```

### MCP経由でのDeep Research

MCP Serverを通じてDeep Researchパターンを実行：

```typescript
// MCP経由で利用可能なツール
const mcpTools = {
  web_search: 'Web検索（DuckDuckGo/SearXNG）',
  web_scrape: 'Webページスクレイピング',
  analyze_content: 'テキスト分析',
  extract_entities: 'エンティティ抽出',
  generate_summary: '要約生成',
  knowledge_add_node: 'ナレッジグラフ追加',
  knowledge_query: 'ナレッジグラフ検索',
  generate_report: 'レポート生成',
};

// AIエージェント（GitHub Copilot等）がこれらのツールを
// 組み合わせてDeep Researchワークフローを実行
```

---

## 🔧 DeepResearch 強化機能（v2.2.0）

v2.2.0では、DeepResearchの信頼性・スケーラビリティを大幅に向上させる機能を追加しました。

### DeepResearchOrchestrator - 統合オーケストレーター

複数のコンポーネントを統合し、エラー耐性のある調査ワークフローを実行します。

```typescript
import {
  DeepResearchOrchestrator,
  DeepResearchConfig,
} from '@nahisaho/katashiro';

// オーケストレーター作成
const orchestrator = new DeepResearchOrchestrator({
  // 並列処理設定
  maxConcurrency: 5,           // 最大同時処理数
  domainRateLimit: 1000,       // ドメインあたりレート制限(ms)
  
  // リトライ設定
  maxRetries: 3,               // 最大リトライ回数
  initialBackoff: 1000,        // 初回バックオフ(ms)
  maxBackoff: 30000,           // 最大バックオフ(ms)
  
  // キャッシュ設定
  cacheEnabled: true,          // キャッシュ有効化
  cacheTTL: 86400000,          // キャッシュTTL(24時間)
  maxCacheSize: 1000,          // 最大キャッシュエントリ数
  
  // ロギング設定
  logLevel: 'info',            // ログレベル
  logFormat: 'json',           // ログ形式
  
  // イテレーション設定
  maxIterations: 10,           // 最大イテレーション数
  convergenceThreshold: 0.1,   // 収束閾値
  minNewInfoRate: 0.05,        // 最小新規情報率
});

// イベントリスナー
orchestrator.on('iterationStart', (data) => {
  console.log(`📍 Iteration ${data.iteration} started`);
});

orchestrator.on('urlProcessed', (data) => {
  console.log(`✅ ${data.url} processed (${data.fromCache ? 'cache' : 'fetch'})`);
});

orchestrator.on('convergence', (data) => {
  console.log(`🎯 Converged at iteration ${data.iteration}`);
});

// 調査実行
const result = await orchestrator.research('AIの医療分野への影響');

console.log('Findings:', result.findings);
console.log('Sources:', result.sources);
console.log('Iterations:', result.iterationCount);
console.log('Cache Hits:', result.stats.cacheHits);
```

### RetryHandler - 指数バックオフリトライ

ネットワークエラーやレート制限に対する堅牢なリトライ機構を提供します。

```typescript
import {
  RetryHandler,
  RetryError,
} from '@nahisaho/katashiro';

// リトライハンドラー作成
const retryHandler = new RetryHandler({
  maxRetries: 5,                // 最大リトライ回数
  initialBackoff: 1000,         // 初回バックオフ(ms)
  maxBackoff: 60000,            // 最大バックオフ(ms)
  backoffMultiplier: 2.0,       // バックオフ倍率
  jitter: 0.2,                  // ジッター（0-0.5）
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMITED'],
});

// リトライ付き実行
const result = await retryHandler.execute(async () => {
  const page = await scraper.scrape(url);
  if (!isOk(page)) {
    throw new Error('Scraping failed');
  }
  return page.value;
});

// リトライ付き fetch
const response = await retryHandler.fetchWithRetry(url, {
  timeout: 10000,
  headers: { 'User-Agent': 'KATASHIRO/2.2.0' },
});

// 統計情報
const stats = retryHandler.getStats();
console.log('Total Attempts:', stats.totalAttempts);
console.log('Retries:', stats.retries);
console.log('Failures:', stats.failures);
console.log('Success Rate:', stats.successRate);
```

### FallbackHandler - フォールバック戦略

主要ソースの取得に失敗した場合、代替ソース（Wayback Machine等）からコンテンツを取得します。

```typescript
import {
  FallbackHandler,
  WaybackMachineClient,
} from '@nahisaho/katashiro';

// フォールバックハンドラー作成
const fallback = new FallbackHandler({
  strategies: ['wayback', 'alternative', 'cached'],
  maxAge: 7 * 24 * 60 * 60 * 1000, // 最大7日前のアーカイブ
});

// フォールバック付き取得
const result = await fallback.fetchWithFallback(url);

if (result.source === 'primary') {
  console.log('Primary source used');
} else if (result.source === 'wayback') {
  console.log(`Wayback archive from ${result.archiveDate}`);
}

// Wayback Machineクライアント直接使用
const wayback = new WaybackMachineClient();

// 利用可能なスナップショットを確認
const available = await wayback.check(url);
if (available.archived) {
  console.log('Latest snapshot:', available.latestSnapshot);
}

// 特定日時のスナップショット取得
const snapshot = await wayback.getSnapshot(url, {
  timestamp: '20240101',  // YYYYMMDDhhmmss形式
});
```

### StructuredLogger - 構造化ロギング

機密情報のマスキング機能付き構造化ログを提供します。

```typescript
import {
  StructuredLogger,
  SensitiveDataMasker,
  ConsoleTransport,
  MemoryTransport,
} from '@nahisaho/katashiro';

// ロガー作成
const logger = new StructuredLogger({
  level: 'info',               // debug, info, warn, error
  format: 'json',              // json, text
  transports: [new ConsoleTransport()],
  context: { service: 'deep-research' },
});

// ログ出力
logger.info('Research started', { topic: 'AI' });
logger.debug('URL processing', { url: 'https://example.com' });
logger.warn('Rate limited', { domain: 'api.example.com' });
logger.error('Scraping failed', { error: err.message });

// 機密情報マスキング
const masker = new SensitiveDataMasker({
  patterns: ['email', 'apiKey', 'password', 'creditCard'],
  customPatterns: [/secret-\w+/gi],
});

const masked = masker.mask({
  email: 'user@example.com',
  apiKey: 'sk-1234567890',
  data: 'Contains secret-abc123',
});
// { email: '***@***.com', apiKey: 'sk-***', data: 'Contains ***' }
```

### RobotsParser - robots.txt準拠

Webサイトのrobots.txtを解析し、クローリングルールを遵守します。

```typescript
import { RobotsParser } from '@nahisaho/katashiro';

const robotsParser = new RobotsParser({
  userAgent: 'KATASHIRO',
  timeout: 5000,
});

// URL許可確認
const allowed = await robotsParser.isAllowed('https://example.com/page');
if (allowed) {
  // クロール許可
}

// Crawl-delay取得
const delay = await robotsParser.getCrawlDelay('https://example.com');
console.log('Crawl delay:', delay, 'ms');

// robots.txt解析
const rules = await robotsParser.parse('https://example.com/robots.txt');
console.log('Disallowed paths:', rules.disallowedPaths);
console.log('Sitemaps:', rules.sitemaps);
```

### ParallelExecutor - 並列処理オーケストレーター

大規模なURL処理を効率的に並列実行します。

```typescript
import {
  ParallelExecutor,
  Semaphore,
  DomainRateLimiter,
  AdaptiveConcurrencyController,
  ResourceMonitor,
  ConcurrencyQueue,
} from '@nahisaho/katashiro';

// 並列実行オーケストレーター
const executor = new ParallelExecutor({
  maxConcurrency: 10,          // 最大同時処理数
  domainConcurrency: 2,        // ドメインあたり同時処理数
  timeout: 30000,              // タイムアウト(ms)
  adaptiveConcurrency: true,   // 動的並列度調整
});

// URL一括処理
const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
const results = await executor.executeAll(urls, async (url) => {
  const page = await scraper.scrape(url);
  return isOk(page) ? page.value : null;
});

// Semaphore（同時実行数制御）
const semaphore = new Semaphore(5);  // 最大5並列
await semaphore.acquire();
try {
  // クリティカルセクション
} finally {
  semaphore.release();
}

// ドメイン別レート制限
const rateLimiter = new DomainRateLimiter({
  defaultLimit: 1000,  // デフォルト1秒
  domainLimits: {
    'api.example.com': 2000,  // 特定ドメインは2秒
  },
});
await rateLimiter.waitForDomain('api.example.com');

// 動的並列度調整
const controller = new AdaptiveConcurrencyController({
  minConcurrency: 2,
  maxConcurrency: 20,
  targetLatency: 1000,        // 目標レイテンシ(ms)
  adjustmentInterval: 5000,   // 調整間隔(ms)
});

// リソースモニター
const monitor = new ResourceMonitor();
const usage = monitor.getUsage();
console.log('CPU:', usage.cpu, '%');
console.log('Memory:', usage.memory, '%');

// 並列キュー
const queue = new ConcurrencyQueue<string>(5);
queue.enqueue(async () => await fetchUrl('https://a.com'));
queue.enqueue(async () => await fetchUrl('https://b.com'));
await queue.waitAll();
```

### ContentManager - コンテンツ管理統合

キャッシュ、チェックポイント、バージョン管理を統合したコンテンツ管理を提供します。

```typescript
import {
  ContentManager,
  ContentCache,
  CheckpointManager,
  VersionControl,
} from '@nahisaho/katashiro';

// コンテンツマネージャー作成
const contentManager = new ContentManager({
  cacheDir: './.cache',
  checkpointDir: './.checkpoints',
  maxCacheSize: 1000,
  cacheTTL: 86400000,          // 24時間
  autoCheckpoint: true,        // 自動チェックポイント
  checkpointInterval: 300000,  // 5分間隔
});

// コンテンツ取得（キャッシュ対応）
const content = await contentManager.getOrFetch(url, async () => {
  const page = await scraper.scrape(url);
  return isOk(page) ? page.value.content : null;
});

// チェックポイント保存
await contentManager.saveCheckpoint('research-session-1', {
  processedUrls: ['https://a.com', 'https://b.com'],
  findings: [...],
  iteration: 3,
});

// チェックポイント復元
const state = await contentManager.loadCheckpoint('research-session-1');
if (state) {
  console.log('Resuming from iteration', state.iteration);
}

// バージョン管理
const versionControl = new VersionControl('./.versions');
await versionControl.commit('research-data', data, 'Initial data');
const history = await versionControl.getHistory('research-data');
const oldVersion = await versionControl.checkout('research-data', history[0].version);
```

### UrlProcessor - URL処理統合

リトライ、フォールバック、キャッシュを統合したURL処理を提供します。

```typescript
import { UrlProcessor } from '@nahisaho/katashiro';

// URL処理器作成
const urlProcessor = new UrlProcessor({
  scraper,
  retryHandler,
  fallbackHandler,
  contentManager,
  robotsParser,
  domainRateLimiter,
});

// URL処理（全機能統合）
const result = await urlProcessor.process(url);

console.log('Content:', result.content);
console.log('Source:', result.source);      // 'primary', 'cache', 'wayback'
console.log('Retries:', result.retries);
console.log('Duration:', result.duration);

// バッチ処理
const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
const results = await urlProcessor.processAll(urls, {
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
```

### IterationController - イテレーション制御

収束判定とイテレーション管理を提供します。

```typescript
import { IterationController } from '@nahisaho/katashiro';

// イテレーション制御器作成
const controller = new IterationController({
  maxIterations: 10,
  convergenceThreshold: 0.1,   // 新規情報率が10%以下で収束
  minNewInfoRate: 0.05,        // 最小5%の新規情報
  stabilityWindow: 3,          // 3イテレーション安定で収束
});

// イテレーション実行
while (!controller.isConverged()) {
  const iteration = controller.getCurrentIteration();
  console.log(`Starting iteration ${iteration}`);
  
  // 調査実行
  const newFindings = await performResearch();
  
  // 進捗記録
  controller.recordIteration({
    findings: newFindings.length,
    newInfo: newFindings.filter(f => !existingFindings.includes(f)).length,
    totalInfo: existingFindings.length + newFindings.length,
  });
  
  // 収束判定結果
  const status = controller.getConvergenceStatus();
  console.log('New info rate:', status.newInfoRate);
  console.log('Is converging:', status.isConverging);
  console.log('Stability:', status.stabilityCount);
}

console.log('Research converged after', controller.getCurrentIteration(), 'iterations');
```

---

## 🎭 KOTODAMA4Biz プロンプトテンプレート統合

ユーザーの課題が**ビジネス課題**の場合、[KOTODAMA4Biz](https://github.com/nahisaho/KOTODAMA4Biz)のプロンプトテンプレートを参照して、専門家視点でのアドバイスを提供してください。

### ビジネス課題領域マッピング

| 課題領域 | キーワード | 推奨テンプレート | GitHub URL |
|---------|-----------|-----------------|------------|
| **経営戦略** | 戦略、成長、競争優位、M&A | strategy-consultant | [strategy-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/strategy-consultant.md) |
| **新規事業** | 新規事業、スタートアップ、起業 | startup-advisor, business-development | [startup-advisor.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/startup-advisor.md) |
| **DX・デジタル** | DX、デジタル化、IT戦略 | dx-consultant, it-strategist | [dx-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/dx-consultant.md) |
| **データ・AI** | データ活用、AI導入、分析基盤 | data-strategist, ai-business-consultant | [data-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/data-strategist.md) |
| **財務・会計** | 財務分析、予算、資金調達 | cfo-advisor, financial-analyst | [cfo-advisor.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/cfo-advisor.md) |
| **マーケティング** | マーケティング、ブランド、広告 | marketing-strategist, brand-strategist | [marketing-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/marketing-strategist.md) |
| **営業** | 営業、セールス、商談 | sales-consultant | [sales-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/sales-consultant.md) |
| **人事・組織** | 人事、採用、組織、人材育成 | hr-strategist, talent-development | [hr-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/hr-strategist.md) |
| **業務改善** | 業務効率、オペレーション、コスト削減 | operations-consultant, lean-sixsigma | [operations-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/operations-consultant.md) |
| **リスク管理** | リスク、危機管理、コンプライアンス | risk-management, crisis-management | [risk-management.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/risk-management.md) |
| **サプライチェーン** | 調達、物流、SCM | supply-chain-consultant | [supply-chain-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/supply-chain-consultant.md) |
| **顧客体験** | CX、顧客満足、カスタマーサクセス | cx-strategist, customer-success | [cx-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/cx-strategist.md) |
| **変革管理** | 変革、チェンジマネジメント | change-management | [change-management.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/change-management.md) |
| **リーダーシップ** | リーダーシップ、マネジメント | leadership-coach | [leadership-coach.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/leadership-coach.md) |
| **事業再生** | 再生、ターンアラウンド | turnaround-consultant | [turnaround-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/turnaround-consultant.md) |

### 全テンプレート一覧（43種）

<details>
<summary>クリックで展開</summary>

| テンプレート | 説明 |
|-------------|------|
| ai-business-consultant | AI/ML導入・活用戦略 |
| brand-strategist | ブランド戦略・ブランディング |
| business-development | 事業開発・新規事業 |
| cfo-advisor | CFO視点の財務アドバイス |
| change-management | 変革管理・チェンジマネジメント |
| cloud-strategy | クラウド戦略・移行 |
| compliance-advisor | コンプライアンス・法令遵守 |
| crisis-management | 危機管理・BCP |
| crm-consultant | CRM・顧客管理 |
| customer-success | カスタマーサクセス |
| cx-strategist | 顧客体験・CX戦略 |
| data-strategist | データ戦略・データドリブン経営 |
| digital-marketing | デジタルマーケティング |
| diversity-consultant | D&I・ダイバーシティ |
| dx-consultant | DX・デジタルトランスフォーメーション |
| financial-analyst | 財務分析・投資判断 |
| global-expansion | 海外展開・グローバル戦略 |
| hr-strategist | 人事戦略・CHRO視点 |
| innovation-consultant | イノベーション・新規事業創出 |
| ip-strategy | 知財戦略・IP |
| it-strategist | IT戦略・CIO視点 |
| leadership-coach | リーダーシップ・エグゼクティブコーチング |
| lean-sixsigma | リーンシックスシグマ・業務改善 |
| m-and-a-advisor | M&A・企業買収 |
| management-accounting | 管理会計・経営分析 |
| marketing-strategist | マーケティング戦略・CMO視点 |
| operations-consultant | オペレーション・業務効率化 |
| organization-development | 組織開発・OD |
| pricing-strategist | 価格戦略・プライシング |
| project-manager | プロジェクトマネジメント |
| quality-management | 品質管理・TQM |
| recruitment-consultant | 採用・リクルーティング |
| risk-management | リスク管理・ERM |
| sales-consultant | 営業戦略・セールス |
| startup-advisor | スタートアップ・起業支援 |
| strategy-consultant | 経営戦略・競争戦略 |
| succession-planning | 事業承継・後継者育成 |
| supply-chain-consultant | サプライチェーン・調達 |
| sustainability-consultant | サステナビリティ・ESG |
| talent-development | 人材開発・タレントマネジメント |
| tax-strategy | 税務戦略・タックスプランニング |
| turnaround-consultant | 事業再生・ターンアラウンド |
| venture-capital | ベンチャー投資・VC |

</details>

### ビジネス課題解決ワークフロー

```typescript
async function solveBusinessProblem(userInput: string, context?: any) {
  // 1. ビジネス課題領域を判定
  const domain = detectBusinessDomain(userInput);
  
  // 2. 課題領域に応じたKOTODAMA4Bizテンプレートを取得
  const templateUrl = getKotodamaTemplate(domain);
  
  // 3. テンプレートのフレームワークに基づいて情報収集
  const scraper = new WebScraper();
  const template = await scraper.scrape(templateUrl);
  
  // 4. ユーザーの課題に対してフレームワークを適用
  // （テンプレートの「フェーズ」に従って対話を進める）
  
  // 5. KATASHIROの情報収集・分析機能で補完
  const searchClient = new WebSearchClient();
  const results = await searchClient.search(userInput, { maxResults: 10 });
  
  // 6. 専門家視点でのレポート生成
  const reportGen = new ReportGenerator();
  return reportGen.generate({
    title: `${domain} 分析レポート`,
    sections: [
      { heading: 'エグゼクティブサマリー', content: summary },
      { heading: '現状分析', content: analysis },
      { heading: '推奨アクション', content: recommendations },
    ],
    format: 'markdown',
  });
}

function detectBusinessDomain(input: string): string {
  const domains = {
    'strategy': ['戦略', '成長', '競争', 'M&A', '買収'],
    'dx': ['DX', 'デジタル', 'IT', 'システム'],
    'data': ['データ', 'AI', '分析', '機械学習'],
    'finance': ['財務', '予算', '資金', '投資'],
    'marketing': ['マーケティング', 'ブランド', '広告', '集客'],
    'hr': ['人事', '採用', '組織', '人材'],
    'operations': ['業務', 'オペレーション', '効率', 'コスト'],
    'risk': ['リスク', '危機', 'コンプライアンス'],
  };
  
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(k => input.includes(k))) return domain;
  }
  return 'strategy'; // デフォルト
}

function getKotodamaTemplate(domain: string): string {
  const templates: Record<string, string> = {
    'strategy': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/strategy-consultant.md',
    'dx': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/dx-consultant.md',
    'data': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/data-strategist.md',
    'finance': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/cfo-advisor.md',
    'marketing': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/marketing-strategist.md',
    'hr': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/hr-strategist.md',
    'operations': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/operations-consultant.md',
    'risk': 'https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/risk-management.md',
  };
  return templates[domain] || templates['strategy'];
}
```

---

## 📦 インストール

```bash
npm install @nahisaho/katashiro
```

---

## �️ CLI（コマンドラインインターフェース）

KATASHIROはCLIツールとしても使用できます。

### 基本コマンド

```bash
# npxで直接実行（推奨）
npx katashiro <command> [options]

# スコープ付きでも実行可能
npx @nahisaho/katashiro <command> [options]

# グローバルインストール後
npm install -g katashiro
katashiro <command> [options]
```

### 利用可能なコマンド

#### 🔍 search - Web検索

```bash
# 基本検索
npx katashiro search "検索クエリ"

# プロバイダー指定（duckduckgo / searxng）
npx katashiro search "AI" --provider duckduckgo

# 結果数指定
npx katashiro search "TypeScript" --max 20
```

#### 🌐 scrape - Webページスクレイピング

```bash
# URLからコンテンツ取得
npx katashiro scrape https://example.com
```

#### 📊 analyze - テキスト分析

```bash
# ファイル分析
npx katashiro analyze document.txt

# または標準入力から
echo "分析対象のテキスト" | npx katashiro analyze
```

#### 🏷️ extract - エンティティ抽出

```bash
# ファイルからエンティティ抽出
npx katashiro extract article.txt

# 抽出される情報:
# - 人名、組織名、場所
# - URL、メールアドレス、電話番号
# - 日付、金額、パーセンテージ
```

#### 📝 summarize - 要約生成

```bash
# ファイルを要約
npx katashiro summarize long-document.txt

# 文字数指定
npx katashiro summarize document.txt --length 500
```

#### 🔬 deep-research - Deep Research（反復的深掘り調査）

```bash
# 基本的なDeep Research
npx katashiro deep-research "AI倫理"

# イテレーション数を指定
npx katashiro deep-research "量子コンピューティング" --iterations 10

# 収束閾値を指定（0.0-1.0）
npx katashiro deep-research "再生可能エネルギー" --threshold 0.1

# フォーカスエリアを指定（カンマ区切り）
npx katashiro deep-research "デジタルヘルス" --focus "遠隔医療,ウェアラブル,AI診断"

# JSON形式で出力
npx katashiro deep-research "フィンテック" --format json
```

Deep Researchは以下のプロセスを自動実行します：
1. **幅広い情報収集**: 複数の検索エンジン（Web、ニュース、学術、百科事典）から並列検索
2. **反復的な深掘り**: ギャップ分析で不足情報を特定し、追加調査
3. **収束判定**: 新規情報率が閾値以下になるか、最大イテレーションに達するまで反復
4. **知識統合**: ナレッジグラフに情報を蓄積し、主要な発見を抽出
5. **推論チェーン生成**: 結論に至った論理的説明を自動生成（観察→推論→統合→結論）

### 推論チェーン（Reasoning Chain）

Deep Researchは結果に「なぜその結論に至ったか」の論理的説明を含めます：

```typescript
interface ReasoningStep {
  step: number;           // ステップ番号
  type: 'observation' | 'inference' | 'synthesis' | 'conclusion';
  description: string;    // 説明
  sourceIds: string[];    // 根拠となるソースID
  findingIds: string[];   // 関連する発見事項ID
  confidence: number;     // 信頼度 (0-1)
}

// 出力例
{
  reasoningChain: [
    { step: 1, type: 'observation', description: '「AI倫理」について調査を開始...', confidence: 1.0 },
    { step: 2, type: 'inference', description: 'イテレーション1: プライバシー、バイアスについて調査...', confidence: 0.85 },
    { step: 3, type: 'synthesis', description: '主要な発見を統合: プライバシー保護、公平性確保...', confidence: 0.85 },
    { step: 4, type: 'conclusion', description: '調査完了。10件の主要な発見を特定...', confidence: 0.78 },
  ]
}
```

### 検索プロバイダー

| プロバイダー | 説明 | オプション |
|------------|------|----------|
| `duckduckgo` | DuckDuckGo検索（デフォルト） | `--provider duckduckgo` |
| `searxng` | SearXNG分散検索エンジン | `--provider searxng` |

---

## 🔗 関連リンク

- **npm**: https://www.npmjs.com/package/@nahisaho/katashiro
- **GitHub**: https://github.com/nahisaho/katashiro
- **KOTODAMA4Biz**: https://github.com/nahisaho/KOTODAMA4Biz

---

**Project**: KATASHIRO
**npm**: @nahisaho/katashiro
**Last Updated**: 2026-01-17
**Version**: 2.5.1
