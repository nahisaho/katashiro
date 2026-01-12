# KATASHIRO ユーザーガイド

> **KATASHIRO** - VS Code Agent Mode 向け情報収集・分析・生成システム

## 📦 インストール

### オールインワンパッケージ（推奨）

```bash
npm install @nahisaho/katashiro
```

これ1つで全機能（core, collector, analyzer, generator, knowledge, feedback）が利用可能です。

### MCPサーバー

```bash
npm install @nahisaho/katashiro-mcp-server
```

### 個別パッケージ

```bash
# コアライブラリ
npm install @nahisaho/katashiro-core

# 情報収集
npm install @nahisaho/katashiro-collector

# テキスト分析
npm install @nahisaho/katashiro-analyzer

# コンテンツ生成
npm install @nahisaho/katashiro-generator

# 知識グラフ
npm install @nahisaho/katashiro-knowledge

# フィードバック・学習
npm install @nahisaho/katashiro-feedback
```

---

## 🚀 クイックスタート

### 1. MCPサーバーとして使用

#### VS Code設定（settings.json）

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "text": "Use KATASHIRO MCP server for research tasks"
    }
  ],
  "mcp.servers": {
    "katashiro": {
      "command": "npx",
      "args": ["@nahisaho/katashiro-mcp-server"]
    }
  }
}
```

#### CLIから起動

```bash
npx @nahisaho/katashiro-mcp-server
```

### 1.5 KATASHIRO CLIを使用

KATASHIRO CLIで直接Web検索やテキスト分析ができます：

```bash
# Web検索
npx katashiro search "検索クエリ"

# Webスクレイピング
npx katashiro scrape https://example.com

# テキスト分析
npx katashiro analyze "分析するテキスト"

# エンティティ抽出
npx katashiro extract "テキスト"

# 要約
npx katashiro summarize "長いテキスト" --length 300
```

### 2. ライブラリとして使用

#### オールインワンパッケージから（推奨）

```typescript
// 全機能を1つのパッケージからインポート
import { 
  WebScraper, 
  TextAnalyzer, 
  ReportGenerator, 
  KnowledgeGraph,
  isOk 
} from '@nahisaho/katashiro';

// Webページをスクレイピング
const scraper = new WebScraper();
const result = await scraper.scrape('https://example.com');

if (isOk(result)) {
  // テキスト分析
  const analyzer = new TextAnalyzer();
  const analysis = await analyzer.analyze(result.value.text);
  
  // レポート生成
  const generator = new ReportGenerator();
  const report = await generator.generate({
    title: 'Research Report',
    sections: [{ heading: 'Analysis', content: analysis.value.summary }]
  });
}
```

#### 名前空間でアクセス

```typescript
import { collector, analyzer, generator, knowledge } from '@nahisaho/katashiro';

const scraper = new collector.WebScraper();
const textAnalyzer = new analyzer.TextAnalyzer();
const reportGen = new generator.ReportGenerator();
const graph = new knowledge.KnowledgeGraph();
```

#### 個別パッケージから

```typescript
import { WebScraper, APIClient, FeedReader } from '@nahisaho/katashiro-collector';
import { TextAnalyzer, EntityExtractor, TopicModeler } from '@nahisaho/katashiro-analyzer';
import { ReportGenerator, SummaryGenerator } from '@nahisaho/katashiro-generator';
import { KnowledgeGraph } from '@nahisaho/katashiro-knowledge';

// Webページをスクレイピング
const scraper = new WebScraper();
const result = await scraper.scrape('https://example.com');

if (isOk(result)) {
  const content = result.value;
  
  // テキスト分析
  const analyzer = new TextAnalyzer();
  const analysis = await analyzer.analyze(content.text);
  
  // エンティティ抽出
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(content.text);
  
  // レポート生成
  const generator = new ReportGenerator();
  const report = await generator.generate({
    title: 'Research Report',
    sections: [{ heading: 'Analysis', content: analysis }]
  });
}
```

---

## 📚 パッケージ詳細

### @nahisaho/katashiro（オールインワン）

全機能を1つのパッケージで提供します。

```typescript
import { 
  // Core
  Result, ok, err, isOk, isErr, Logger, LogLevel, generateId,
  
  // Collector
  WebScraper, APIClient, FeedReader, WebSearchClient, MediaExtractor, YouTubeTranscript,
  
  // Analyzer
  TextAnalyzer, EntityExtractor, TopicModeler, RelationAnalyzer, QualityScorer, StructureAnalyzer,
  
  // Generator
  ReportGenerator, SummaryGenerator, PresentationGenerator, CitationGenerator, TemplateEngine, ExportService,
  
  // Knowledge
  KnowledgeGraph, GraphQuery, GraphPersistence, GraphVisualization, GraphSync,
  
  // Feedback
  FeedbackCollector, FeedbackStorage, LearningEngine, PatternDetector, AdaptiveRecommender
} from '@nahisaho/katashiro';
```

### @nahisaho/katashiro-core

共通の型定義とユーティリティを提供します。

```typescript
import { Result, ok, err, isOk, isErr } from '@nahisaho/katashiro-core';
import { Logger, LogLevel } from '@nahisaho/katashiro-core';
import { generateId, sleep, retry } from '@nahisaho/katashiro-core';

// Result型の使用
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return err(new Error('Division by zero'));
  }
  return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value); // 5
}

// ロガー
const logger = new Logger({ level: LogLevel.INFO, prefix: 'MyApp' });
logger.info('Application started');
logger.error('Something went wrong', new Error('details'));

// ユーティリティ
const id = generateId('RES'); // RES-20260110-001
await sleep(1000); // 1秒待機
const data = await retry(() => fetchData(), { maxRetries: 3 });
```

---

### @nahisaho/katashiro-collector

Web情報収集機能を提供します。

#### WebScraper - Webページスクレイピング

```typescript
import { WebScraper, ScraperOptions } from '@nahisaho/katashiro-collector';

const scraper = new WebScraper({
  timeout: 30000,
  userAgent: 'KATASHIRO/1.0',
  followRedirects: true,
  maxRedirects: 5
});

// 単一ページ
const result = await scraper.scrape('https://example.com');
if (isOk(result)) {
  console.log(result.value.title);
  console.log(result.value.text);
  console.log(result.value.links);
  console.log(result.value.images);
}

// 複数ページ
const results = await scraper.scrapeMultiple([
  'https://example.com/page1',
  'https://example.com/page2'
]);
```

#### APIClient - REST API呼び出し

```typescript
import { APIClient, RateLimitConfig } from '@nahisaho/katashiro-collector';

const client = new APIClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer TOKEN'
  },
  rateLimit: {
    requestsPerSecond: 10,
    burstSize: 20
  },
  timeout: 10000
});

// GET
const users = await client.get<User[]>('/users');

// POST
const newUser = await client.post<User>('/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT, DELETE
await client.put('/users/1', { name: 'Jane' });
await client.delete('/users/1');
```

#### FeedReader - RSS/Atomフィード

```typescript
import { FeedReader } from '@nahisaho/katashiro-collector';

const reader = new FeedReader({
  maxItems: 50,
  timeout: 10000
});

// 単一フィード
const feed = await reader.read('https://example.com/feed.xml');
if (isOk(feed)) {
  console.log(feed.value.title);
  for (const item of feed.value.items) {
    console.log(item.title, item.pubDate);
  }
}

// 複数フィード集約
const aggregated = await reader.aggregate([
  'https://blog1.com/feed',
  'https://blog2.com/rss'
]);
```

#### WebSearchClient - Web検索

```typescript
import { WebSearchClient, SearchProvider } from '@nahisaho/katashiro-collector';

const search = new WebSearchClient({
  provider: SearchProvider.DuckDuckGo,
  maxResults: 10
});

const results = await search.search('TypeScript best practices');
if (isOk(results)) {
  for (const result of results.value) {
    console.log(result.title, result.url);
  }
}
```

#### MediaExtractor - メディア抽出

```typescript
import { MediaExtractor } from '@nahisaho/katashiro-collector';

const extractor = new MediaExtractor();

// 画像抽出
const images = await extractor.extractImages('https://example.com');

// 動画抽出
const videos = await extractor.extractVideos('https://example.com');

// すべてのメディア
const media = await extractor.extractAll('https://example.com');
```

#### YouTubeTranscript - YouTube字幕

```typescript
import { YouTubeTranscript } from '@nahisaho/katashiro-collector';

const youtube = new YouTubeTranscript();

// 字幕取得
const transcript = await youtube.getTranscript('VIDEO_ID');
if (isOk(transcript)) {
  for (const segment of transcript.value) {
    console.log(`[${segment.start}] ${segment.text}`);
  }
}

// 言語指定
const jpTranscript = await youtube.getTranscript('VIDEO_ID', { lang: 'ja' });
```

---

### @nahisaho/katashiro-analyzer

テキスト分析機能を提供します。

#### TextAnalyzer - 基本テキスト分析

```typescript
import { TextAnalyzer } from '@nahisaho/katashiro-analyzer';

const analyzer = new TextAnalyzer();

const result = await analyzer.analyze('Your text here...');
if (isOk(result)) {
  console.log(result.value.wordCount);      // 単語数
  console.log(result.value.sentenceCount);  // 文数
  console.log(result.value.paragraphCount); // 段落数
  console.log(result.value.readingTime);    // 読了時間（分）
  console.log(result.value.complexity);     // 複雑度スコア
  console.log(result.value.keywords);       // キーワード
}
```

#### EntityExtractor - 固有表現抽出

```typescript
import { EntityExtractor, EntityType } from '@nahisaho/katashiro-analyzer';

const extractor = new EntityExtractor({
  types: [EntityType.PERSON, EntityType.ORGANIZATION, EntityType.LOCATION]
});

const entities = await extractor.extract('Apple Inc. was founded by Steve Jobs in Cupertino.');
if (isOk(entities)) {
  for (const entity of entities.value) {
    console.log(`${entity.text} (${entity.type}): ${entity.confidence}`);
  }
  // Apple Inc. (ORGANIZATION): 0.95
  // Steve Jobs (PERSON): 0.92
  // Cupertino (LOCATION): 0.88
}
```

#### TopicModeler - トピック分析

```typescript
import { TopicModeler } from '@nahisaho/katashiro-analyzer';

const modeler = new TopicModeler({
  numTopics: 5,
  minDocFrequency: 2
});

// 複数文書からトピック抽出
const topics = await modeler.extractTopics([
  'Document 1 text...',
  'Document 2 text...',
  'Document 3 text...'
]);

if (isOk(topics)) {
  for (const topic of topics.value) {
    console.log(`Topic ${topic.id}: ${topic.keywords.join(', ')}`);
    console.log(`  Weight: ${topic.weight}`);
  }
}
```

#### RelationAnalyzer - 関係性分析

```typescript
import { RelationAnalyzer } from '@nahisaho/katashiro-analyzer';

const analyzer = new RelationAnalyzer();

const relations = await analyzer.analyze('John works at Google. Mary is John\'s manager.');
if (isOk(relations)) {
  for (const rel of relations.value) {
    console.log(`${rel.subject} --[${rel.predicate}]--> ${rel.object}`);
  }
  // John --[works_at]--> Google
  // Mary --[manages]--> John
}
```

#### QualityScorer - 品質評価

```typescript
import { QualityScorer, QualityCriteria } from '@nahisaho/katashiro-analyzer';

const scorer = new QualityScorer({
  criteria: [
    QualityCriteria.READABILITY,
    QualityCriteria.COHERENCE,
    QualityCriteria.FACTUALITY
  ]
});

const score = await scorer.score('Your content here...');
if (isOk(score)) {
  console.log(`Overall: ${score.value.overall}`);
  console.log(`Readability: ${score.value.readability}`);
  console.log(`Coherence: ${score.value.coherence}`);
  console.log(`Suggestions: ${score.value.suggestions.join(', ')}`);
}
```

#### StructureAnalyzer - 構造分析

```typescript
import { StructureAnalyzer } from '@nahisaho/katashiro-analyzer';

const analyzer = new StructureAnalyzer();

const structure = await analyzer.analyze(markdownContent);
if (isOk(structure)) {
  console.log(structure.value.headings);   // 見出し階層
  console.log(structure.value.sections);   // セクション構造
  console.log(structure.value.outline);    // アウトライン
}
```

---

### @nahisaho/katashiro-generator

コンテンツ生成機能を提供します。

#### ReportGenerator - レポート生成

```typescript
import { ReportGenerator, ReportFormat } from '@nahisaho/katashiro-generator';

const generator = new ReportGenerator({
  format: ReportFormat.MARKDOWN,
  includeTableOfContents: true,
  includeSummary: true
});

const report = await generator.generate({
  title: 'Research Report',
  author: 'KATASHIRO',
  date: new Date(),
  sections: [
    {
      heading: 'Introduction',
      content: 'This report covers...'
    },
    {
      heading: 'Findings',
      content: 'Our analysis shows...',
      subsections: [
        { heading: 'Key Insight 1', content: '...' },
        { heading: 'Key Insight 2', content: '...' }
      ]
    },
    {
      heading: 'Conclusion',
      content: 'In summary...'
    }
  ],
  references: [
    { title: 'Source 1', url: 'https://...' }
  ]
});

console.log(report.value.content);
```

#### SummaryGenerator - 要約生成

```typescript
import { SummaryGenerator, SummaryLength } from '@nahisaho/katashiro-generator';

const generator = new SummaryGenerator({
  length: SummaryLength.MEDIUM, // SHORT, MEDIUM, LONG
  preserveKeyPoints: true
});

// 単一文書の要約
const summary = await generator.summarize(longText);

// 複数文書の統合要約
const combined = await generator.summarizeMultiple([doc1, doc2, doc3]);

// 箇条書き要約
const bullets = await generator.toBulletPoints(text, { maxPoints: 5 });
```

#### PresentationGenerator - プレゼンテーション生成

```typescript
import { PresentationGenerator, SlideLayout } from '@nahisaho/katashiro-generator';

const generator = new PresentationGenerator();

const presentation = await generator.generate({
  title: 'Project Overview',
  theme: 'professional',
  slides: [
    {
      layout: SlideLayout.TITLE,
      title: 'Welcome',
      subtitle: 'Project Overview 2026'
    },
    {
      layout: SlideLayout.BULLETS,
      title: 'Key Points',
      bullets: ['Point 1', 'Point 2', 'Point 3']
    },
    {
      layout: SlideLayout.IMAGE,
      title: 'Architecture',
      imageUrl: 'https://...'
    }
  ]
});

// Markdown形式で出力
console.log(presentation.value.toMarkdown());

// HTML形式で出力
console.log(presentation.value.toHTML());
```

#### CitationGenerator - 引用生成

```typescript
import { CitationGenerator, CitationStyle } from '@nahisaho/katashiro-generator';

const generator = new CitationGenerator({
  style: CitationStyle.APA // APA, MLA, Chicago, IEEE
});

const citation = generator.generate({
  type: 'webpage',
  title: 'Article Title',
  author: 'John Doe',
  url: 'https://example.com/article',
  accessDate: new Date()
});

console.log(citation);
// Doe, J. (2026). Article Title. Retrieved January 10, 2026, from https://example.com/article
```

#### TemplateEngine - テンプレートエンジン

```typescript
import { TemplateEngine } from '@nahisaho/katashiro-generator';

const engine = new TemplateEngine();

// テンプレート登録
engine.register('email', `
Dear {{name}},

{{#if urgent}}URGENT: {{/if}}{{message}}

Best regards,
{{sender}}
`);

// レンダリング
const output = engine.render('email', {
  name: 'John',
  urgent: true,
  message: 'Please review the document.',
  sender: 'KATASHIRO'
});
```

#### ExportService - エクスポート

```typescript
import { ExportService, ExportFormat } from '@nahisaho/katashiro-generator';

const exporter = new ExportService();

// Markdown → HTML
const html = await exporter.export(markdownContent, ExportFormat.HTML);

// Markdown → PDF（要: puppeteer）
const pdf = await exporter.export(markdownContent, ExportFormat.PDF);

// JSON → CSV
const csv = await exporter.toCSV(jsonData);
```

---

### @nahisaho/katashiro-knowledge

知識グラフ管理機能を提供します。

#### KnowledgeGraph - 基本操作

```typescript
import { KnowledgeGraph, Node, Edge } from '@nahisaho/katashiro-knowledge';

const graph = new KnowledgeGraph();

// ノード追加
graph.addNode({
  id: 'person-1',
  type: 'Person',
  properties: { name: 'John Doe', age: 30 }
});

graph.addNode({
  id: 'company-1',
  type: 'Company',
  properties: { name: 'Acme Inc.' }
});

// エッジ追加
graph.addEdge({
  source: 'person-1',
  target: 'company-1',
  type: 'WORKS_AT',
  properties: { since: 2020 }
});

// ノード取得
const person = graph.getNode('person-1');

// 隣接ノード取得
const neighbors = graph.getNeighbors('person-1');

// パス検索
const path = graph.findPath('person-1', 'company-2');
```

#### GraphQuery - クエリ

```typescript
import { GraphQuery } from '@nahisaho/katashiro-knowledge';

const query = new GraphQuery(graph);

// タイプでフィルタ
const people = query.findByType('Person');

// プロパティで検索
const johns = query.findByProperty('name', 'John');

// 複合クエリ
const results = query
  .where({ type: 'Person' })
  .where({ 'properties.age': { $gt: 25 } })
  .orderBy('properties.name')
  .limit(10)
  .execute();

// 関係クエリ
const colleagues = query.findRelated('person-1', 'WORKS_AT');
```

#### GraphPersistence - 永続化

```typescript
import { GraphPersistence, StorageBackend } from '@nahisaho/katashiro-knowledge';

const persistence = new GraphPersistence({
  backend: StorageBackend.FILE,
  path: './knowledge-graph.json'
});

// 保存
await persistence.save(graph);

// 読み込み
const loadedGraph = await persistence.load();

// 自動保存
persistence.enableAutoSave(graph, { interval: 60000 }); // 1分ごと
```

#### GraphVisualization - 可視化

```typescript
import { GraphVisualization, LayoutAlgorithm } from '@nahisaho/katashiro-knowledge';

const viz = new GraphVisualization({
  layout: LayoutAlgorithm.FORCE_DIRECTED,
  width: 800,
  height: 600
});

// SVG出力
const svg = viz.toSVG(graph);

// D3.js用データ
const d3Data = viz.toD3Format(graph);

// Mermaid図
const mermaid = viz.toMermaid(graph);
console.log(mermaid);
// graph TD
//   person-1[John Doe] -->|WORKS_AT| company-1[Acme Inc.]
```

#### GraphSync - 同期

```typescript
import { GraphSync, ConflictResolution } from '@nahisaho/katashiro-knowledge';

const sync = new GraphSync({
  conflictResolution: ConflictResolution.LATEST_WINS
});

// グラフのマージ
const merged = sync.merge(graph1, graph2);

// 差分計算
const diff = sync.diff(oldGraph, newGraph);
console.log(diff.added);   // 追加されたノード/エッジ
console.log(diff.removed); // 削除されたノード/エッジ
console.log(diff.modified);// 変更されたノード/エッジ
```

---

### @nahisaho/katashiro-feedback

フィードバック収集と学習機能を提供します。

#### FeedbackCollector - フィードバック収集

```typescript
import { FeedbackCollector, FeedbackType } from '@nahisaho/katashiro-feedback';

const collector = new FeedbackCollector();

// フィードバック記録
await collector.record({
  type: FeedbackType.RATING,
  targetId: 'report-123',
  rating: 4,
  comment: 'Very helpful analysis'
});

// 複数選択フィードバック
await collector.record({
  type: FeedbackType.CHOICE,
  targetId: 'suggestion-456',
  choice: 'accepted',
  context: { reason: 'Accurate recommendation' }
});

// 修正フィードバック
await collector.record({
  type: FeedbackType.CORRECTION,
  targetId: 'entity-789',
  original: 'Gogle',
  corrected: 'Google'
});
```

#### FeedbackStorage - 永続化

```typescript
import { FeedbackStorage } from '@nahisaho/katashiro-feedback';

const storage = new FeedbackStorage({
  path: './feedback-data.json'
});

// 保存
await storage.save(feedback);

// 取得
const all = await storage.getAll();
const byTarget = await storage.getByTarget('report-123');
const recent = await storage.getRecent(100);

// 統計
const stats = await storage.getStatistics();
console.log(stats.totalCount);
console.log(stats.averageRating);
console.log(stats.feedbackByType);
```

#### LearningEngine - 学習エンジン

```typescript
import { LearningEngine } from '@nahisaho/katashiro-feedback';

const engine = new LearningEngine({
  minSamplesForPattern: 5,
  confidenceThreshold: 0.7
});

// フィードバックから学習
await engine.learn(feedbackData);

// パターン取得
const patterns = engine.getPatterns();
for (const pattern of patterns) {
  console.log(`${pattern.name}: ${pattern.confidence}`);
}

// 予測
const prediction = engine.predict(newInput);
console.log(prediction.suggestedAction);
console.log(prediction.confidence);
```

#### PatternDetector - パターン検出

```typescript
import { PatternDetector } from '@nahisaho/katashiro-feedback';

const detector = new PatternDetector();

// パターン検出
const patterns = detector.detect(feedbackHistory);
for (const pattern of patterns) {
  console.log(`Pattern: ${pattern.description}`);
  console.log(`Frequency: ${pattern.frequency}`);
  console.log(`Examples: ${pattern.examples.length}`);
}
```

#### AdaptiveRecommender - 適応型推薦

```typescript
import { AdaptiveRecommender } from '@nahisaho/katashiro-feedback';

const recommender = new AdaptiveRecommender({
  learningRate: 0.1,
  explorationRate: 0.2
});

// 推薦取得
const recommendations = recommender.recommend({
  context: 'research',
  userHistory: previousInteractions
});

// フィードバックで更新
recommender.update(recommendationId, {
  wasHelpful: true,
  userRating: 5
});
```

---

### @nahisaho/katashiro-mcp-server

Model Context Protocol サーバーを提供します。

#### MCPサーバー起動

```typescript
import { MCPServer } from '@nahisaho/katashiro-mcp-server';

const server = new MCPServer({
  name: 'katashiro',
  version: '0.1.0'
});

// カスタムツール追加
server.registerTool({
  name: 'custom_tool',
  description: 'A custom tool',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    }
  },
  handler: async (params) => {
    return { result: `Processed: ${params.query}` };
  }
});

// サーバー起動
await server.start();
```

#### 組み込みツール

| ツール名 | 説明 |
|---------|------|
| `katashiro_scrape` | Webページスクレイピング |
| `katashiro_search` | Web検索 |
| `katashiro_analyze` | テキスト分析 |
| `katashiro_extract_entities` | エンティティ抽出 |
| `katashiro_generate_report` | レポート生成 |
| `katashiro_summarize` | 要約生成 |
| `katashiro_knowledge_query` | 知識グラフクエリ |
| `katashiro_knowledge_add` | 知識グラフ追加 |

#### 組み込みリソース

| リソース | 説明 |
|---------|------|
| `katashiro://knowledge/graph` | 知識グラフ全体 |
| `katashiro://knowledge/nodes/{type}` | タイプ別ノード |
| `katashiro://feedback/patterns` | 学習済みパターン |

---

## 🔧 設定

### 環境変数

```bash
# ログレベル
KATASHIRO_LOG_LEVEL=info  # debug, info, warn, error

# キャッシュ
KATASHIRO_CACHE_DIR=~/.katashiro/cache
KATASHIRO_CACHE_TTL=3600  # 秒

# ネットワーク
KATASHIRO_TIMEOUT=30000   # ミリ秒
KATASHIRO_USER_AGENT=KATASHIRO/1.0

# 知識グラフ
KATASHIRO_GRAPH_PATH=~/.katashiro/knowledge.json
```

### プログラムによる設定

```typescript
import { configure } from '@nahisaho/katashiro-core';

configure({
  logging: {
    level: 'debug',
    format: 'json'
  },
  cache: {
    enabled: true,
    ttl: 3600
  },
  network: {
    timeout: 30000,
    retries: 3
  }
});
```

---

## 📖 使用例

### 例1: 競合分析レポート

```typescript
import { WebSearchClient, WebScraper } from '@nahisaho/katashiro-collector';
import { TextAnalyzer, EntityExtractor } from '@nahisaho/katashiro-analyzer';
import { ReportGenerator } from '@nahisaho/katashiro-generator';
import { KnowledgeGraph } from '@nahisaho/katashiro-knowledge';

async function competitorAnalysis(companyName: string) {
  const search = new WebSearchClient();
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  const extractor = new EntityExtractor();
  const graph = new KnowledgeGraph();
  const reporter = new ReportGenerator();

  // 1. 検索
  const searchResults = await search.search(`${companyName} news 2026`);
  
  // 2. スクレイピング
  const contents = [];
  for (const result of searchResults.value.slice(0, 5)) {
    const page = await scraper.scrape(result.url);
    if (isOk(page)) {
      contents.push(page.value);
    }
  }

  // 3. 分析
  const analyses = [];
  for (const content of contents) {
    const analysis = await analyzer.analyze(content.text);
    const entities = await extractor.extract(content.text);
    analyses.push({ analysis, entities, source: content.url });
    
    // 知識グラフに追加
    for (const entity of entities.value) {
      graph.addNode({
        id: `entity-${entity.text}`,
        type: entity.type,
        properties: { name: entity.text }
      });
    }
  }

  // 4. レポート生成
  const report = await reporter.generate({
    title: `${companyName} 競合分析レポート`,
    sections: analyses.map(a => ({
      heading: new URL(a.source).hostname,
      content: a.analysis.value.summary
    }))
  });

  return report;
}
```

### 例2: 知識ベース構築

```typescript
import { FeedReader } from '@nahisaho/katashiro-collector';
import { EntityExtractor, RelationAnalyzer } from '@nahisaho/katashiro-analyzer';
import { KnowledgeGraph, GraphPersistence } from '@nahisaho/katashiro-knowledge';

async function buildKnowledgeBase(feedUrls: string[]) {
  const reader = new FeedReader();
  const extractor = new EntityExtractor();
  const relationAnalyzer = new RelationAnalyzer();
  const graph = new KnowledgeGraph();
  const persistence = new GraphPersistence({ path: './kb.json' });

  // フィードを読み込み
  const feeds = await reader.aggregate(feedUrls);

  for (const item of feeds.value.items) {
    // エンティティ抽出
    const entities = await extractor.extract(item.content);
    
    // 関係抽出
    const relations = await relationAnalyzer.analyze(item.content);

    // グラフに追加
    for (const entity of entities.value) {
      graph.addNode({
        id: `${entity.type}-${entity.text}`,
        type: entity.type,
        properties: {
          name: entity.text,
          source: item.link,
          date: item.pubDate
        }
      });
    }

    for (const relation of relations.value) {
      graph.addEdge({
        source: `${relation.subject.type}-${relation.subject.text}`,
        target: `${relation.object.type}-${relation.object.text}`,
        type: relation.predicate
      });
    }
  }

  // 保存
  await persistence.save(graph);
  
  return graph;
}
```

---

## 🐛 トラブルシューティング

### よくある問題

#### 1. タイムアウトエラー

```typescript
// タイムアウトを延長
const scraper = new WebScraper({ timeout: 60000 });
```

#### 2. レート制限

```typescript
// レート制限を設定
const client = new APIClient({
  rateLimit: { requestsPerSecond: 5 }
});
```

#### 3. メモリ不足

```typescript
// ストリーミング処理
const generator = new ReportGenerator({ streaming: true });
```

### デバッグ

```typescript
import { Logger, LogLevel } from '@nahisaho/katashiro-core';

// デバッグログを有効化
const logger = new Logger({ level: LogLevel.DEBUG });
```

---

## 📄 ライセンス

MIT License

## 🔗 リンク

- **GitHub**: https://github.com/nahisaho/katashiro
- **npm**: https://www.npmjs.com/org/nahisaho
- **Issues**: https://github.com/nahisaho/katashiro/issues
