# KATASHIRO - Claude Code専用ガイド

> このファイルはClaude CodeがKATASHIROサービスを自然言語で利用するためのガイドです。

## 🎯 KATASHIROとは

KATASHIROは情報収集・分析・コンテンツ生成を行うMCPサーバーです。ユーザーから以下のような依頼があった場合、KATASHIROのツールを使用してください。

---

## 📝 自然言語 → ツール対応表

### 「〜について調べて」「検索して」

```
katashiro_search を使用
```

例:
- 「TypeScriptのベストプラクティスについて調べて」
- 「2026年のAIトレンドを検索して」
- 「〇〇社の最新ニュースを調べて」

### 「このURLの内容を取得して」「スクレイピングして」

```
katashiro_scrape を使用
```

例:
- 「https://example.com の内容を取得して」
- 「このページの本文を抽出して」

### 「分析して」「キーワードを抽出して」

```
katashiro_analyze を使用
```

例:
- 「この文章を分析して」
- 「テキストの複雑度を調べて」
- 「重要なキーワードを抽出して」

### 「人名・組織名を抽出して」「固有表現を見つけて」

```
katashiro_extract_entities を使用
```

例:
- 「この記事に出てくる人名をリストアップして」
- 「組織名と地名を抽出して」

### 「レポートを作成して」「まとめて」

```
katashiro_generate_report を使用
```

例:
- 「調査結果をレポートにまとめて」
- 「分析結果からレポートを生成して」

### 「要約して」「〜文字でまとめて」

```
katashiro_summarize を使用
```

例:
- 「この長文を要約して」
- 「300文字以内でまとめて」
- 「3行で要点をまとめて」

### 「知識グラフに追加して」「保存して」

```
katashiro_knowledge_add を使用
```

例:
- 「この情報を知識グラフに登録して」
- 「エンティティを保存して」

### 「知識グラフから検索して」「関連情報を探して」

```
katashiro_knowledge_query を使用
```

例:
- 「〇〇に関連する情報を知識グラフから検索して」
- 「保存した情報を検索して」

### 「リトライ付きで取得して」「エラー耐性を持って」（v2.2.0）

```
RetryHandler を使用
```

例:
- 「リトライ付きでURLを取得して」
- 「エラー時に自動再試行して」

### 「アーカイブから取得して」「フォールバックを使って」（v2.2.0）

```
FallbackHandler, WaybackMachineClient を使用
```

例:
- 「ページが見つからない場合はアーカイブから取得して」
- 「Wayback Machineで過去のバージョンを取得」

### 「並列で処理して」「高速に取得して」（v2.2.0）

```
ParallelExecutor, DomainRateLimiter を使用
```

例:
- 「これらのURLを並列で処理して」
- 「高速に複数ページを取得して」

### 「ログを構造化して」「機密情報をマスクして」（v2.2.0）

```
StructuredLogger, SensitiveDataMasker を使用
```

例:
- 「処理ログをJSON形式で出力して」
- 「メールアドレスをマスクしてログ出力」

### 「robots.txtを確認して」「クロール許可を確認」（v2.2.0）

```
RobotsParser を使用
```

例:
- 「このURLはクロール可能か確認して」
- 「robots.txtのルールを取得して」

### 「キャッシュを使って」「チェックポイントを保存」（v2.2.0）

```
ContentManager, ContentCache, CheckpointManager を使用
```

例:
- 「取得済みのコンテンツはキャッシュから使って」
- 「調査の途中状態を保存して」
- 「前回の続きから再開して」

---

## 🤖 DeepResearchAgent（v2.1.0）

### 「詳しく調べて」「徹底的にリサーチして」「自律的に調査して」

jina-ai/node-DeepResearch風の反復型リサーチエージェントです。5種類のアクション（search, visit, reflect, answer, coding）を自律的に組み合わせて調査を行います。

```typescript
import { DeepResearchAgent, WebSearchClient, WebScraper } from '@nahisaho/katashiro';

// エージェント作成
const agent = new DeepResearchAgent({
  llmClient,  // LLMClientInterface（chat()メソッドを持つ）
  searchClient: new WebSearchClient(),
  scraper: new WebScraper(),
  config: {
    maxSteps: 30,        // 最大ステップ数
    tokenBudget: 500000, // トークン予算
  },
});

// プログレス監視
agent.on((event) => {
  console.log(`[${event.type}]`, event.data);
});

// リサーチ実行
const result = await agent.research('AIの医療分野への影響は？');
console.log('Answer:', result.answer);
console.log('Confidence:', result.confidence);
```

**回答品質評価（5基準）:**
- `Freshness`: 情報の新しさ
- `Plurality`: 視点の多様性
- `Completeness`: 網羅性
- `Attribution`: 根拠の明確さ
- `Definitive`: 明確さ

---

## 🎯 Deep Research v3.1.0 - コンサルティングフレームワーク統合（v2.5.0）

### 「SWOT分析して」「戦略分析して」「フレームワークで調査」

Deep ResearchがSWOT/3C/4P/5Forces/ValueChain/PESTELのコンサルティングフレームワークを自動選択・適用して構造化分析を行います。

```typescript
import { deepResearch, ResearchEngine } from '@nahisaho/katashiro';

// 方法1: シンプルなヘルパー関数（自動フレームワーク選択）
const report = await deepResearch('AI業界への新規参入戦略を分析して', {
  framework: 'auto',  // 自動選択（デフォルト）
  // framework: 'swot',  // SWOT分析を強制
  // framework: '3c',    // 3C分析を強制
  // framework: 'none',  // フレームワークなし
  maxIterations: 5,
  tokenBudget: 500_000,
});

console.log(report.markdown);  // フレームワーク構造化されたレポート
console.log(report.metadata.frameworkUsed);  // 使用されたフレームワーク
```

**フレームワーク自動選択ロジック**:

| クエリタイプ | キーワード例 | 選択されるフレームワーク |
|------------|-------------|------------------------|
| strategy | 戦略、参入、競争優位 | SWOT |
| market | 市場、顧客、ニーズ | 3C |
| competitor | 競合、ライバル、シェア | 5Forces |
| product | 製品、サービス、価格 | 4P |
| internal | 組織、プロセス、能力 | ValueChain |
| external | 政治、経済、技術動向 | PESTEL |

**出力例（SWOT分析時）**:

```markdown
## SWOT分析

### 強み (Strengths)
- 技術力の高さ（3件のソース）
- ブランド認知度（2件のソース）

### 弱み (Weaknesses)
- 販売チャネルの限定（2件のソース）

### 機会 (Opportunities)
- 市場成長（4件のソース）

### 脅威 (Threats)
- 競合の参入（3件のソース）

## クロスSWOT戦略

### SO戦略（強み×機会）
- 技術力を活かした新市場開拓

### WO戦略（弱み×機会）
- パートナーシップによる販売網拡大

### ST戦略（強み×脅威）
- ブランド力で差別化

### WT戦略（弱み×脅威）
- ニッチ市場への集中
```

**ResearchEngineでイベント監視**:

```typescript
const engine = new ResearchEngine({ /* config */ });

engine.on('framework_selected', (event) => {
  console.log(`選択されたフレームワーク: ${event.framework}`);
  console.log(`クエリタイプ: ${event.queryType}`);
});

const report = await engine.research('競合分析');
```

---

## 🔧 DeepResearch強化機能（v2.2.0）

### 「エラー耐性のある調査」「信頼性の高い調査」

DeepResearchOrchestratorを使用して、リトライ・フォールバック・キャッシュを統合した堅牢な調査を実行します。

```typescript
import { DeepResearchOrchestrator } from '@nahisaho/katashiro';

const orchestrator = new DeepResearchOrchestrator({
  maxConcurrency: 5,
  maxRetries: 3,
  cacheEnabled: true,
});

const result = await orchestrator.research('AIの最新動向');
console.log('Findings:', result.findings);
console.log('Cache hits:', result.stats.cacheHits);
```

### 「リトライ付きで実行」「エラー時に再試行」

RetryHandlerで指数バックオフリトライを実行します。

```typescript
import { RetryHandler } from '@nahisaho/katashiro';

const retryHandler = new RetryHandler({
  maxRetries: 5,
  initialBackoff: 1000,
  maxBackoff: 60000,
});

const result = await retryHandler.execute(async () => {
  return await fetchData(url);
});
```

### 「フォールバック付きで取得」「アーカイブから取得」

FallbackHandlerでWayback Machine等の代替ソースを利用します。

```typescript
import { FallbackHandler, WaybackMachineClient } from '@nahisaho/katashiro';

const fallback = new FallbackHandler({
  strategies: ['wayback', 'cached'],
});

const result = await fallback.fetchWithFallback(url);
console.log('Source:', result.source);  // 'primary' or 'wayback'
```

### 「並列で処理」「高速に調査」

ParallelExecutorで大規模URL処理を並列実行します。

```typescript
import { ParallelExecutor, DomainRateLimiter } from '@nahisaho/katashiro';

const executor = new ParallelExecutor({
  maxConcurrency: 10,
  domainConcurrency: 2,
});

const results = await executor.executeAll(urls, async (url) => {
  return await scraper.scrape(url);
});
```

### 「ログを出力して」「機密情報をマスクして」

StructuredLoggerで構造化ログを出力し、SensitiveDataMaskerで機密情報をマスキングします。

```typescript
import { StructuredLogger, SensitiveDataMasker } from '@nahisaho/katashiro';

const logger = new StructuredLogger({ level: 'info', format: 'json' });
logger.info('Research started', { topic: 'AI' });

const masker = new SensitiveDataMasker();
const masked = masker.mask({ email: 'user@example.com' });
// { email: '***@***.com' }
```

### 「robots.txtを確認して」「クロール許可を確認」

RobotsParserでWebサイトのクローリングルールを遵守します。

```typescript
import { RobotsParser } from '@nahisaho/katashiro';

const parser = new RobotsParser({ userAgent: 'KATASHIRO' });
const allowed = await parser.isAllowed('https://example.com/page');
```

### 「キャッシュから取得」「チェックポイントを保存」

ContentManagerでキャッシュ・チェックポイント・バージョン管理を統合します。

```typescript
import { ContentManager, CheckpointManager } from '@nahisaho/katashiro';

const manager = new ContentManager({ cacheDir: './.cache' });
const content = await manager.getOrFetch(url, () => scraper.scrape(url));

// チェックポイント保存・復元
await manager.saveCheckpoint('session-1', { processedUrls, findings });
const state = await manager.loadCheckpoint('session-1');
```

---

## 🤖 LLM統合（v2.0.0）

### 「LLMで生成して」「AIに聞いて」

```typescript
import { LLMClient, PromptManager, TokenCounter } from '@nahisaho/katashiro';

// LLMクライアント（OpenAI/Anthropic/Ollama対応）
const client = new LLMClient({ provider: 'openai', model: 'gpt-4' });
const response = await client.complete('質問内容');

// プロンプト管理
const prompts = new PromptManager();
const prompt = prompts.get('summarize', { text: '長文' });

// トークンカウント
const tokens = new TokenCounter().count('テキスト');
```

---

## 🔒 セキュリティ・サンドボックス（v2.0.0）

### 「コードを安全に実行して」「セキュリティチェック」

```typescript
import { DockerExecutor, SecurityAnalyzer, ActionLogger } from '@nahisaho/katashiro';

// Docker内でコード実行
const executor = new DockerExecutor();
const result = await executor.execute({ code: 'print("hello")' });

// セキュリティリスク分析
const analyzer = new SecurityAnalyzer();
const analysis = await analyzer.analyze(action, context);

// アクション監査ログ
const logger = new ActionLogger();
await logger.log(action, context, result);
```

---

## 📁 ワークスペース管理（v2.0.0）

### 「ファイルを読み書きして」「ワークスペース操作」

```typescript
import { LocalWorkspace, DockerWorkspace, WorkspaceFactory } from '@nahisaho/katashiro';

// ローカルファイルシステム
const workspace = new LocalWorkspace('/path/to/workspace');
const content = await workspace.readFile('file.txt');
await workspace.writeFile('output.txt', content);

// Docker内ワークスペース
const dockerWs = new DockerWorkspace({ image: 'node:20' });
await dockerWs.writeFile('script.js', code);
```

---

## 📊 可観測性（v2.0.0）

### 「トレース」「メトリクス」「ヘルスチェック」

```typescript
import { Tracer, MetricsCollector, HealthChecker } from '@nahisaho/katashiro';

// 分散トレーシング
const tracer = new Tracer();
const span = tracer.startSpan('operation');
// ... 処理 ...
span.end();

// メトリクス収集
const metrics = new MetricsCollector();
metrics.increment('requests');

// ヘルスチェック
const health = new HealthChecker();
const status = await health.check();
```

---

## 🔄 複合タスクのワークフロー

### 競合調査レポート

ユーザー: 「〇〇社について調査してレポートにまとめて」

```
1. katashiro_search("〇〇社 最新 ニュース")
2. katashiro_scrape(検索結果のURL)
3. katashiro_analyze(取得したテキスト)
4. katashiro_extract_entities(取得したテキスト)
5. katashiro_generate_report(分析結果)
```

### 論文要約

ユーザー: 「このURLの論文を要約して」

```
1. katashiro_scrape(URL)
2. katashiro_analyze(取得したテキスト)
3. katashiro_summarize(取得したテキスト)
```

### 技術調査と知識ベース構築

ユーザー: 「〜について調べて知識グラフに保存して」

```
1. katashiro_search(クエリ)
2. katashiro_scrape(検索結果)
3. katashiro_extract_entities(テキスト)
4. katashiro_knowledge_add(エンティティ)
```

---

## 💻 コード例（TypeScript）

```typescript
import { 
  WebScraper, 
  TextAnalyzer, 
  ReportGenerator,
  KnowledgeGraph,
  isOk 
} from '@nahisaho/katashiro';

// Web調査 → 分析 → レポート生成
async function research(url: string) {
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  const generator = new ReportGenerator();

  const page = await scraper.scrape(url);
  if (isOk(page)) {
    const analysis = await analyzer.analyze(page.value.text);
    const report = await generator.generate({
      title: '調査レポート',
      sections: [{ heading: '分析結果', content: analysis.value.summary }]
    });
    return report;
  }
}
```

---

## 📦 インストール

```bash
# オールインワン
npm install @nahisaho/katashiro

# MCPサーバー
npm install @nahisaho/katashiro-mcp-server
```

## 🖥️ CLI使用法

コマンドラインから直接使用できます：

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

# Deep Research（v2.5.3: レートリミット対応）
npx katashiro deep-research "調査トピック"
npx katashiro deep-research "AI倫理" --iterations 5
npx katashiro deep-research "競合分析" --framework swot
npx katashiro deep-research "市場調査" --focus "トレンド,競合,顧客"
```

### 🎯 AIエージェントの推奨利用パターン

ユーザーが「〜について調べて」「レポートを作成して」と依頼した場合：

| パターン | 推奨度 | 説明 |
|---------|-------|------|
| **CLI実行** | ⭐⭐⭐ | `npx katashiro deep-research`を直接実行し、結果をファイルに保存 |
| **MCP Server** | ⭐⭐⭐ | MCPツールとして呼び出し（設定済みの場合） |
| **スクリプト作成** | ⭐ | 複雑なカスタマイズが必要な場合のみ |

**推奨フロー:**
```
1. npx katashiro deep-research "トピック" --iterations 5 を実行
2. 結果（Markdown）をユーザー指定のファイルに保存
3. 必要に応じて追加の分析・整形を実施
```

## VS Code MCP設定

```json
{
  "mcp.servers": {
    "katashiro": {
      "command": "npx",
      "args": ["@nahisaho/katashiro-mcp-server"]
    }
  }
}
```

---

## 🔧 開発時の注意

### Result型パターン
```typescript
import { Result, ok, err, isOk, isErr } from '@nahisaho/katashiro';

const result = await scraper.scrape(url);
if (isOk(result)) {
  // 成功時の処理
  console.log(result.value);
} else {
  // エラー時の処理
  console.error(result.error);
}
```

### パッケージ依存関係
```
@nahisaho/katashiro-core (依存なし)
  ↓
collector, analyzer, generator, knowledge, feedback (coreに依存)
  ↓
@nahisaho/katashiro (オールインワン - 全てを含む)
@nahisaho/katashiro-mcp-server (全パッケージを使用)
```

---

**Project**: KATASHIRO
**npm**: @nahisaho/katashiro
**Updated**: 2026-01-17
**Version**: 2.5.1
