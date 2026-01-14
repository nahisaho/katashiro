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
**Updated**: 2026-01-10
