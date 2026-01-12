# KATASHIRO ユーザーガイド（日本語版）

> **KATASHIRO** - VS Code Agent Mode 向け情報収集・分析・生成システム

## 📦 インストール

### オールインワンパッケージ（推奨）

```bash
npm install @nahisaho/katashiro
```

これ1つで全機能が利用可能です。

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

VS Codeの `settings.json` に以下を追加：

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

### 2. ライブラリとして使用

#### オールインワンパッケージから（推奨）

```typescript
import { WebScraper, TextAnalyzer, ReportGenerator, isOk } from '@nahisaho/katashiro';

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
    title: '調査レポート',
    sections: [{ heading: '分析結果', content: analysis.value.summary }]
  });
}
```

#### 個別パッケージから

```typescript
import { WebScraper } from '@nahisaho/katashiro-collector';
import { TextAnalyzer } from '@nahisaho/katashiro-analyzer';
import { ReportGenerator } from '@nahisaho/katashiro-generator';
```

---

## 📚 パッケージ一覧

| パッケージ | 説明 | 主な機能 |
|-----------|------|----------|
| `@nahisaho/katashiro` | **オールインワン（推奨）** | 全機能を1パッケージで提供 |
| `@nahisaho/katashiro-core` | コアライブラリ | Result型、Logger、ユーティリティ |
| `@nahisaho/katashiro-collector` | 情報収集 | Webスクレイピング、API、RSS、検索 |
| `@nahisaho/katashiro-analyzer` | テキスト分析 | エンティティ抽出、トピック分析、品質評価 |
| `@nahisaho/katashiro-generator` | コンテンツ生成 | レポート、要約、プレゼンテーション |
| `@nahisaho/katashiro-knowledge` | 知識グラフ | グラフ管理、クエリ、永続化、可視化 |
| `@nahisaho/katashiro-feedback` | フィードバック | 収集、学習、パターン検出、推薦 |
| `@nahisaho/katashiro-mcp-server` | MCPサーバー | VS Code Agent Mode連携 |

---

## 🔧 主要機能

### 情報収集（Collector）

| クラス | 機能 |
|--------|------|
| `WebScraper` | Webページのスクレイピング |
| `APIClient` | REST API呼び出し（レート制限対応） |
| `FeedReader` | RSS/Atomフィードの読み取り |
| `WebSearchClient` | Web検索 |
| `MediaExtractor` | 画像・動画の抽出 |
| `YouTubeTranscript` | YouTube字幕の取得 |

### テキスト分析（Analyzer）

| クラス | 機能 |
|--------|------|
| `TextAnalyzer` | 基本テキスト分析（単語数、複雑度等） |
| `EntityExtractor` | 固有表現抽出（人名、組織名、地名等） |
| `TopicModeler` | トピック分析 |
| `RelationAnalyzer` | 関係性分析 |
| `QualityScorer` | 品質評価 |
| `StructureAnalyzer` | 文書構造分析 |

### コンテンツ生成（Generator）

| クラス | 機能 |
|--------|------|
| `ReportGenerator` | レポート生成 |
| `SummaryGenerator` | 要約生成 |
| `PresentationGenerator` | プレゼンテーション生成 |
| `CitationGenerator` | 引用生成（APA、MLA等） |
| `TemplateEngine` | テンプレートエンジン |
| `ExportService` | エクスポート（HTML、PDF等） |

### 知識グラフ（Knowledge）

| クラス | 機能 |
|--------|------|
| `KnowledgeGraph` | グラフ基本操作 |
| `GraphQuery` | クエリ実行 |
| `GraphPersistence` | 永続化 |
| `GraphVisualization` | 可視化（SVG、Mermaid） |
| `GraphSync` | 同期・マージ |

### フィードバック（Feedback）

| クラス | 機能 |
|--------|------|
| `FeedbackCollector` | フィードバック収集 |
| `FeedbackStorage` | 永続化 |
| `LearningEngine` | 学習エンジン |
| `PatternDetector` | パターン検出 |
| `AdaptiveRecommender` | 適応型推薦 |

---

## 🛠️ MCPサーバーツール

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

---

## 📄 ライセンス

MIT License

## 🔗 リンク

- **GitHub**: https://github.com/nahisaho/katashiro
- **npm**: https://www.npmjs.com/org/nahisaho
