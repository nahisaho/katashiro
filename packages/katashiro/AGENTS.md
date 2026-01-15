# KATASHIRO - AI Coding Agent Guide

> **AI Coding Agent向け**: このファイルを読み込んだAIエージェントは、ユーザーの課題を解決するためにKATASHIROライブラリの機能を自動的に活用できます。

## 🎯 このガイドの目的

ユーザーが自然言語で入力した課題に対して、KATASHIROの機能を適切に組み合わせて解決策を提供します。

---

## 📋 課題タイプ別の解決アプローチ

### 課題タイプの判定

ユーザーの入力から以下のタイプを判定してください：

| 課題タイプ | キーワード例 | 使用する機能 |
|-----------|-------------|-------------|
| **調査・リサーチ** | 調べて、検索、情報収集、〜について | Collector → Analyzer → Generator |
| **分析・解析** | 分析して、解析、キーワード、傾向 | Analyzer |
| **要約・まとめ** | 要約、まとめて、短くして | Generator (SummaryGenerator) |
| **レポート作成** | レポート、報告書、文書化 | Generator (ReportGenerator) |
| **データ抽出** | 抽出、取り出して、リストアップ | Analyzer (EntityExtractor) |
| **知識管理** | 保存、記録、覚えておいて | Knowledge |
| **比較・評価** | 比較、評価、どちらが | Collector → Analyzer → Generator |

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
  
  // テキスト分析（テキストデータがある場合）
  TextAnalyzer,      // キーワード・複雑度分析
  EntityExtractor,   // 人名・組織名抽出
  TopicModeler,      // トピック分類
  StructureAnalyzer, // 文書構造解析
  QualityScorer,     // 品質スコアリング
  
  // コンテンツ生成（出力が必要な場合）
  ReportGenerator,   // レポート生成
  SummaryGenerator,  // 要約生成
  CitationGenerator, // 引用生成
  TemplateEngine,    // テンプレート処理
  
  // 知識管理（情報を蓄積・検索する場合）
  KnowledgeGraph,    // グラフ管理
  GraphQuery,        // 検索
  GraphPersistence,  // 永続化
  
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
  // 1. 情報収集
  const searchClient = new WebSearchClient();
  const results = await searchClient.search(topic, { maxResults: 10 });
  
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
  const entities = await extractor.extract(text);
  
  // 4. 品質スコアリング
  const scorer = new QualityScorer();
  const quality = await scorer.score(text);
  
  return {
    keywords: analysis.keywords,
    complexity: analysis.complexity,
    sentiment: analysis.sentiment,
    structure: structure,
    entities: entities,
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
async function solveExtractionProblem(text: string, types: string[] = ['PERSON', 'ORGANIZATION']) {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(text);
  
  const filtered = entities.filter(e => types.includes(e.type));
  const grouped = types.reduce((acc, type) => {
    acc[type] = filtered.filter(e => e.type === type).map(e => e.text);
    return acc;
  }, {} as Record<string, string[]>);
  
  return grouped;
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
    const entities = await extractor.extract(data.text);
    
    for (const entity of entities) {
      kg.addNode({
        id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: entity.type,
        properties: { name: entity.text, source: data.source },
      });
    }
    
    await persistence.save(kg, './knowledge-graph.json');
    return { saved: entities.length };
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

## 🔗 関連リンク

- **npm**: https://www.npmjs.com/package/@nahisaho/katashiro
- **GitHub**: https://github.com/nahisaho/katashiro
- **KOTODAMA4Biz**: https://github.com/nahisaho/KOTODAMA4Biz

---

**Project**: KATASHIRO
**npm**: @nahisaho/katashiro
**Last Updated**: 2026-01-10
**Version**: 0.1.8
