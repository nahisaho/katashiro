# KATASHIRO - Claude向け課題解決ガイド

> このファイルを読み込んだClaudeは、ユーザーの課題を解決するためにKATASHIROライブラリの機能を自動的に活用できます。

## 🎯 基本動作

**ユーザーが課題を入力したら、以下の手順で解決してください：**

1. 課題タイプを判定
2. 適切なKATASHIRO機能を選択
3. コードを生成して実行
4. 結果をユーザーに提示

---

## 📋 課題タイプ判定表

| ユーザーの言葉 | 課題タイプ | 使用機能 |
|---------------|-----------|----------|
| 「〜について調べて」「検索して」「情報を集めて」 | 調査 | WebSearchClient → WebScraper → TextAnalyzer → ReportGenerator |
| 「このテキストを分析して」「特徴を教えて」 | 分析 | TextAnalyzer + EntityExtractor + StructureAnalyzer |
| 「要約して」「まとめて」「短くして」 | 要約 | SummaryGenerator |
| 「レポートを作成して」「報告書にして」 | レポート | ReportGenerator |
| 「人名を抽出して」「組織名を取り出して」 | 抽出 | EntityExtractor |
| 「保存して」「覚えておいて」「記録して」 | 保存 | KnowledgeGraph + GraphPersistence |
| 「〜を探して」「検索して」（保存済みデータ） | 検索 | GraphQuery |
| 「AとBを比較して」「違いを教えて」 | 比較 | 複合（調査×2 → 分析 → レポート） |
| 「このURLの内容を取得して」 | 取得 | WebScraper |
| 「RSSフィードを読んで」 | フィード | FeedReader |

---

## 🔧 機能別クイックリファレンス

### 情報収集

```typescript
import { WebScraper, WebSearchClient, FeedReader } from '@nahisaho/katashiro';

// URL取得
const scraper = new WebScraper();
const page = await scraper.scrape('https://example.com');

// Web検索
const search = new WebSearchClient();
const results = await search.search('キーワード', { maxResults: 10 });

// RSSフィード
const reader = new FeedReader();
const feed = await reader.read('https://example.com/rss.xml');
```

### テキスト分析

```typescript
import { TextAnalyzer, EntityExtractor, TopicModeler, StructureAnalyzer, QualityScorer } from '@nahisaho/katashiro';

// 基本分析
const analyzer = new TextAnalyzer();
const { keywords, complexity, sentiment } = await analyzer.analyze(text);

// エンティティ抽出
const extractor = new EntityExtractor();
const entities = await extractor.extract(text);
// entities: [{ type: 'PERSON', text: '山田太郎' }, { type: 'ORGANIZATION', text: '〇〇株式会社' }]

// トピック分析
const modeler = new TopicModeler();
const topics = await modeler.model(documents, { numTopics: 5 });

// 構造分析
const structAnalyzer = new StructureAnalyzer();
const structure = await structAnalyzer.analyze(text);

// 品質スコア
const scorer = new QualityScorer();
const score = await scorer.score(text);
```

### コンテンツ生成

```typescript
import { ReportGenerator, SummaryGenerator, CitationGenerator } from '@nahisaho/katashiro';

// 要約
const summarizer = new SummaryGenerator();
const summary = await summarizer.generate(longText, { maxLength: 300, style: 'paragraph' });

// レポート
const reportGen = new ReportGenerator();
const report = await reportGen.generate({
  title: 'タイトル',
  sections: [
    { heading: 'セクション1', content: '内容1' },
    { heading: 'セクション2', content: '内容2' },
  ],
  format: 'markdown',
});

// 引用
const citationGen = new CitationGenerator();
const citation = citationGen.generate(source, { style: 'APA' });
```

### 知識グラフ

```typescript
import { KnowledgeGraph, GraphQuery, GraphPersistence } from '@nahisaho/katashiro';

const kg = new KnowledgeGraph();
const persistence = new GraphPersistence();
const query = new GraphQuery(kg);

// 保存
kg.addNode({ id: 'node-1', type: 'Person', properties: { name: '山田太郎' } });
await persistence.save(kg, './knowledge.json');

// 読み込み
const loaded = await persistence.load('./knowledge.json');

// 検索
const results = query.findByType('Person');
```

---

## 📝 課題解決テンプレート

### テンプレート1: 調査タスク

```typescript
// ユーザー: 「〇〇について調べてまとめて」
import { WebSearchClient, WebScraper, TextAnalyzer, EntityExtractor, SummaryGenerator, ReportGenerator, isOk } from '@nahisaho/katashiro';

async function research(topic: string) {
  // 1. 検索
  const search = new WebSearchClient();
  const results = await search.search(topic, { maxResults: 10 });
  
  // 2. ページ取得
  const scraper = new WebScraper();
  const contents: string[] = [];
  for (const r of results.slice(0, 5)) {
    const page = await scraper.scrape(r.url);
    if (isOk(page)) contents.push(page.value.content);
  }
  
  // 3. 分析
  const analyzer = new TextAnalyzer();
  const keywords = new Set<string>();
  for (const c of contents) {
    const a = await analyzer.analyze(c);
    a.keywords.forEach(k => keywords.add(k));
  }
  
  // 4. エンティティ抽出
  const extractor = new EntityExtractor();
  const entities = new Set<string>();
  for (const c of contents) {
    const e = await extractor.extract(c);
    e.forEach(ent => entities.add(ent.text));
  }
  
  // 5. 要約
  const summarizer = new SummaryGenerator();
  const summary = await summarizer.generate(contents.join('\n\n'), { maxLength: 500 });
  
  // 6. レポート生成
  const reportGen = new ReportGenerator();
  return reportGen.generate({
    title: `${topic} 調査レポート`,
    sections: [
      { heading: '概要', content: summary },
      { heading: 'キーワード', content: [...keywords].join(', ') },
      { heading: '関連エンティティ', content: [...entities].join(', ') },
      { heading: '参考URL', content: results.map(r => `- ${r.url}`).join('\n') },
    ],
    format: 'markdown',
  });
}
```

### テンプレート2: 分析タスク

```typescript
// ユーザー: 「このテキストを分析して」
import { TextAnalyzer, EntityExtractor, StructureAnalyzer, QualityScorer } from '@nahisaho/katashiro';

async function analyze(text: string) {
  const [analysis, entities, structure, quality] = await Promise.all([
    new TextAnalyzer().analyze(text),
    new EntityExtractor().extract(text),
    new StructureAnalyzer().analyze(text),
    new QualityScorer().score(text),
  ]);
  
  return {
    keywords: analysis.keywords,
    complexity: analysis.complexity,
    sentiment: analysis.sentiment,
    entities: entities.map(e => ({ type: e.type, text: e.text })),
    structure,
    qualityScore: quality,
  };
}
```

### テンプレート3: 比較タスク

```typescript
// ユーザー: 「AとBを比較して」
import { WebSearchClient, WebScraper, TextAnalyzer, ReportGenerator, isOk } from '@nahisaho/katashiro';

async function compare(itemA: string, itemB: string) {
  const search = new WebSearchClient();
  const scraper = new WebScraper();
  const analyzer = new TextAnalyzer();
  
  async function gatherInfo(item: string) {
    const results = await search.search(item, { maxResults: 5 });
    const contents: string[] = [];
    for (const r of results) {
      const page = await scraper.scrape(r.url);
      if (isOk(page)) contents.push(page.value.content);
    }
    const analysis = await analyzer.analyze(contents.join('\n'));
    return { item, analysis, sources: results };
  }
  
  const [infoA, infoB] = await Promise.all([gatherInfo(itemA), gatherInfo(itemB)]);
  
  const reportGen = new ReportGenerator();
  return reportGen.generate({
    title: `${itemA} vs ${itemB} 比較`,
    sections: [
      { heading: itemA, content: `キーワード: ${infoA.analysis.keywords.join(', ')}` },
      { heading: itemB, content: `キーワード: ${infoB.analysis.keywords.join(', ')}` },
      { heading: '比較まとめ', content: '（AIが分析結果を基に比較コメントを生成）' },
    ],
    format: 'markdown',
  });
}
```

---

## 🎭 KOTODAMA4Biz ビジネス課題解決

**ビジネス課題**が入力された場合、[KOTODAMA4Biz](https://github.com/nahisaho/KOTODAMA4Biz)のプロンプトテンプレートを参照してください。

### ビジネス課題の判定

| ユーザーの言葉 | 課題領域 | 参照テンプレート |
|---------------|---------|-----------------|
| 「戦略を考えて」「成長戦略」「競争優位」 | 経営戦略 | [strategy-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/strategy-consultant.md) |
| 「DXを進めたい」「IT戦略」「システム刷新」 | DX | [dx-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/dx-consultant.md) |
| 「データ活用」「AI導入」「分析基盤」 | データ | [data-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/data-strategist.md) |
| 「財務分析」「予算」「資金調達」 | 財務 | [cfo-advisor.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/cfo-advisor.md) |
| 「マーケティング」「ブランディング」「集客」 | マーケ | [marketing-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/marketing-strategist.md) |
| 「人事」「採用」「組織改革」「人材育成」 | HR | [hr-strategist.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/hr-strategist.md) |
| 「業務改善」「効率化」「コスト削減」 | オペレーション | [operations-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/operations-consultant.md) |
| 「リスク」「危機管理」「コンプライアンス」 | リスク | [risk-management.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/risk-management.md) |
| 「営業」「セールス」「商談」 | 営業 | [sales-consultant.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/sales-consultant.md) |
| 「新規事業」「スタートアップ」「起業」 | 新規事業 | [startup-advisor.md](https://raw.githubusercontent.com/nahisaho/KOTODAMA4Biz/main/templates/claude/startup-advisor.md) |

### テンプレートの使い方

1. **ビジネス課題領域を判定** → 上記テーブルからテンプレートを選択
2. **テンプレートのフレームワークを参照** → 専門家視点で分析
3. **KATASHIROで情報収集・分析** → WebSearchClient, TextAnalyzerを活用
4. **フレームワークに基づいたレポート生成** → ReportGenerator

### ビジネス課題解決テンプレート

```typescript
// ユーザー: 「〇〇業界で新規事業を考えたい」
import { WebSearchClient, WebScraper, TextAnalyzer, ReportGenerator, isOk } from '@nahisaho/katashiro';

async function solveBusinessProblem(domain: string, question: string) {
  // 1. 市場調査
  const search = new WebSearchClient();
  const results = await search.search(`${domain} ${question}`, { maxResults: 10 });
  
  // 2. 情報収集
  const scraper = new WebScraper();
  const contents: string[] = [];
  for (const r of results.slice(0, 5)) {
    const page = await scraper.scrape(r.url);
    if (isOk(page)) contents.push(page.value.content);
  }
  
  // 3. 分析
  const analyzer = new TextAnalyzer();
  const analysis = await analyzer.analyze(contents.join('\n\n'));
  
  // 4. KOTODAMA4Bizフレームワーク適用（例: 戦略コンサルタント視点）
  // - 5フォース分析
  // - SWOT分析
  // - アンゾフマトリクス
  
  // 5. レポート生成
  const reportGen = new ReportGenerator();
  return reportGen.generate({
    title: `${domain} ビジネス分析レポート`,
    sections: [
      { heading: 'エグゼクティブサマリー', content: '（分析結果の要約）' },
      { heading: '市場環境', content: '（PEST/5フォース分析）' },
      { heading: 'キーワード・トレンド', content: analysis.keywords.join(', ') },
      { heading: '戦略オプション', content: '（推奨アクション）' },
    ],
    format: 'markdown',
  });
}
```

---

## ⚡ クイックスタート

```bash
npm install @nahisaho/katashiro
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

### プログラムから使用

```typescript
import * as katashiro from '@nahisaho/katashiro';

// すべての機能にアクセス可能
const { 
  WebScraper, WebSearchClient, FeedReader,
  TextAnalyzer, EntityExtractor, TopicModeler,
  ReportGenerator, SummaryGenerator, CitationGenerator,
  KnowledgeGraph, GraphQuery, GraphPersistence,
  isOk, isErr
} = katashiro;
```

---

## 🔗 関連リンク

- **npm**: https://www.npmjs.com/package/@nahisaho/katashiro
- **GitHub**: https://github.com/nahisaho/katashiro
- **KOTODAMA4Biz**: https://github.com/nahisaho/KOTODAMA4Biz

---

**Project**: KATASHIRO
**npm**: @nahisaho/katashiro
**Last Updated**: 2026-01-10
**Version**: 0.1.18
