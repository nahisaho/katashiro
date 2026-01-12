# KATASHIRO - AI Coding Agent Guide

> **AI Coding Agent向け**: このファイルはAIエージェント（GitHub Copilot、Claude等）がKATASHIROサービスを自然言語で利用するためのガイドです。

## 🎯 KATASHIROでできること

KATASHIROは以下のタスクを自然言語で実行できます：

| やりたいこと | 自然言語での依頼例 |
|-------------|-------------------|
| **Web調査** | 「〜について調べて」「〜の最新情報を検索して」 |
| **Webページ取得** | 「このURLの内容を取得して」「〜のサイトをスクレイピングして」 |
| **テキスト分析** | 「この文章を分析して」「キーワードを抽出して」 |
| **エンティティ抽出** | 「人名・組織名を抽出して」「固有表現を見つけて」 |
| **レポート生成** | 「調査レポートを作成して」「分析結果をまとめて」 |
| **要約作成** | 「この文章を要約して」「3行でまとめて」 |
| **知識グラフ操作** | 「知識グラフに追加して」「関連情報を検索して」 |

---

## 🔧 MCPツール（自然言語で呼び出し可能）

### 情報収集ツール

| ツール | 自然言語での呼び出し例 |
|--------|----------------------|
| `katashiro_scrape` | 「https://example.com の内容を取得して」 |
| `katashiro_search` | 「TypeScript best practices について検索して」 |
| `katashiro_feed` | 「このRSSフィードを読み込んで」 |

### 分析ツール

| ツール | 自然言語での呼び出し例 |
|--------|----------------------|
| `katashiro_analyze` | 「この文章のキーワードと複雑度を分析して」 |
| `katashiro_extract_entities` | 「このテキストから人名と組織名を抽出して」 |
| `katashiro_topics` | 「これらの文書のトピックを分析して」 |

### 生成ツール

| ツール | 自然言語での呼び出し例 |
|--------|----------------------|
| `katashiro_generate_report` | 「調査結果からレポートを生成して」 |
| `katashiro_summarize` | 「この長文を300文字で要約して」 |
| `katashiro_citation` | 「APA形式で引用を生成して」 |

### 知識グラフツール

| ツール | 自然言語での呼び出し例 |
|--------|----------------------|
| `katashiro_knowledge_query` | 「知識グラフから〜に関連する情報を検索して」 |
| `katashiro_knowledge_add` | 「この情報を知識グラフに追加して」 |

---

## 📝 ユースケース別ワークフロー

### 1. 競合調査レポート作成

```
ユーザー: 「〇〇社について競合調査して、レポートにまとめて」

AIエージェントの動作:
1. katashiro_search で「〇〇社」を検索
2. katashiro_scrape で上位結果のページを取得
3. katashiro_analyze でテキスト分析
4. katashiro_extract_entities で企業名・人名を抽出
5. katashiro_generate_report でレポート生成
```

### 2. 技術トレンド分析

```
ユーザー: 「2026年のAI技術トレンドを調べて分析して」

AIエージェントの動作:
1. katashiro_search で「AI trends 2026」を検索
2. katashiro_scrape で技術ブログを取得
3. katashiro_topics でトピック分析
4. katashiro_summarize で要点をまとめ
```

### 3. 論文・記事の要約

```
ユーザー: 「このURLの論文を要約して、重要なポイントを箇条書きにして」

AIエージェントの動作:
1. katashiro_scrape でページ内容を取得
2. katashiro_analyze で構造分析
3. katashiro_summarize で要約生成
4. katashiro_citation で引用情報を生成
```

### 4. 知識ベース構築

```
ユーザー: 「このプロジェクトの情報を知識グラフに登録して」

AIエージェントの動作:
1. katashiro_extract_entities でエンティティ抽出
2. katashiro_knowledge_add でノード追加
3. katashiro_knowledge_query で関連性確認
```

---

## 💡 自然言語プロンプト例

### 調査系
- 「〜について調べて」
- 「〜の最新ニュースを検索して」
- 「〜に関する情報を集めて」
- 「このURLの内容を取得して分析して」

### 分析系
- 「この文章を分析して」
- 「キーワードを抽出して」
- 「人名・組織名をリストアップして」
- 「トピックを分類して」
- 「感情分析して」

### 生成系
- 「レポートにまとめて」
- 「要約して」
- 「〜文字でまとめて」
- 「プレゼン資料を作って」
- 「引用を生成して」

### 知識グラフ系
- 「知識グラフに追加して」
- 「関連情報を検索して」
- 「この情報を保存して」

---

## 📦 npmパッケージ

```bash
# オールインワン（推奨）
npm install @nahisaho/katashiro

# MCPサーバー
npm install @nahisaho/katashiro-mcp-server
```

### CLI使用法

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

### プログラムAPI

```typescript
import { 
  WebSearchClient, 
  WebScraper, 
  TextAnalyzer, 
  EntityExtractor, 
  SummaryGenerator, 
  ReportGenerator,
  TopicModeler,
  FeedReader,
  KnowledgeGraph,
  isOk 
} from '@nahisaho/katashiro';

// Web検索（文字列を直接渡せる）
const search = new WebSearchClient();
const results = await search.search('検索クエリ');

// スクレイピング
const scraper = new WebScraper();
const page = await scraper.scrape('https://example.com');

// テキスト分析（日本語キーワード対応）
const analyzer = new TextAnalyzer();
const analysis = await analyzer.analyzeText('分析するテキスト');
// { keywords, complexity, sentiment, wordCount, sentenceCount }

// エンティティ抽出
const extractor = new EntityExtractor();
const entities = await extractor.extract('テキスト');
// { persons, organizations, locations, urls, all }

// 要約（Result型を返す）
const summarizer = new SummaryGenerator();
const summaryResult = await summarizer.summarize('長いテキスト', { maxLength: 300 });

// 要約（文字列を返す簡易版）
const summary = await summarizer.generate('長いテキスト', { maxLength: 300 });

// レポート生成
const reporter = new ReportGenerator();
const report = await reporter.generate({
  title: 'レポートタイトル',
  sections: [{ heading: 'セクション', content: '内容' }],
  format: 'markdown'
});

// トピックモデリング（配列対応）
const modeler = new TopicModeler();
const topics = modeler.model(['文書1', '文書2'], { numTopics: 5 });
// または: modeler.extractTopics(['文書1', '文書2'], 5);

// RSSフィード
const reader = new FeedReader();
const feed = await reader.read('https://example.com/rss.xml');

// 知識グラフ検索
const kg = new KnowledgeGraph();
const nodes = kg.query('検索キーワード');
```

### VS Code MCP設定

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

## 🏗️ プロジェクト構造

```
katashiro/
├── packages/
│   ├── katashiro/        # @nahisaho/katashiro（オールインワン）
│   ├── core/             # @nahisaho/katashiro-core
│   ├── collector/        # @nahisaho/katashiro-collector
│   ├── analyzer/         # @nahisaho/katashiro-analyzer
│   ├── generator/        # @nahisaho/katashiro-generator
│   ├── knowledge/        # @nahisaho/katashiro-knowledge
│   ├── feedback/         # @nahisaho/katashiro-feedback
│   ├── mcp-server/       # @nahisaho/katashiro-mcp-server
│   └── vscode-extension/ # katashiro VS Code拡張
└── docs/
    ├── USER-GUIDE.md
    └── USER-GUIDE.ja.md
```

---

## 🛠️ 開発コマンド

```bash
npm install          # 依存関係インストール
npm run build        # 全パッケージビルド
npm run test         # テスト実行（448テスト）
npm run lint         # ESLint
npm run typecheck    # TypeScript型チェック
```

---

**Project**: KATASHIRO
**npm**: @nahisaho/katashiro
**Last Updated**: 2026-01-10
**Version**: 0.1.18
