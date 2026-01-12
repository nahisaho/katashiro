// KATASHIRO 品質チェック - 複数ユースケーステスト
import { 
  WebSearchClient, 
  WebScraper,
  TextAnalyzer, 
  EntityExtractor,
  ReportGenerator, 
  SummaryGenerator,
  TopicModeler,
  FeedReader,
  KnowledgeGraph
} from '@nahisaho/katashiro';

// テスト結果を記録
const testResults = [];

function logTest(name, status, details = {}) {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${status}`);
  if (details.error) console.log(`   Error: ${details.error}`);
  if (details.note) console.log(`   Note: ${details.note}`);
}

// ========================================
// ユースケース1: Web検索
// ========================================
async function testWebSearch() {
  console.log('\n📡 ユースケース1: Web検索テスト\n');
  const client = new WebSearchClient();
  
  // Test 1.1: 文字列引数での検索
  try {
    const result = await client.search('TypeScript best practices 2026');
    const results = result.value || result.results || result || [];
    if (Array.isArray(results) && results.length > 0) {
      logTest('1.1 文字列引数検索', 'PASS', { count: results.length });
    } else {
      logTest('1.1 文字列引数検索', 'FAIL', { note: '結果0件', actualResult: result });
    }
  } catch (e) {
    logTest('1.1 文字列引数検索', 'FAIL', { error: e.message });
  }

  // Test 1.2: オブジェクト引数での検索
  try {
    const result = await client.search({ query: 'AI productivity tools' });
    const results = result.value || result.results || result || [];
    if (Array.isArray(results) && results.length > 0) {
      logTest('1.2 オブジェクト引数検索', 'PASS', { count: results.length });
    } else {
      logTest('1.2 オブジェクト引数検索', 'FAIL', { note: '結果0件' });
    }
  } catch (e) {
    logTest('1.2 オブジェクト引数検索', 'FAIL', { error: e.message });
  }

  // Test 1.3: 日本語検索
  try {
    const result = await client.search('生成AI 企業導入事例 2026');
    const results = result.value || result.results || result || [];
    logTest('1.3 日本語検索', results.length > 0 ? 'PASS' : 'WARN', { count: results.length });
  } catch (e) {
    logTest('1.3 日本語検索', 'FAIL', { error: e.message });
  }
}

// ========================================
// ユースケース2: Webスクレイピング
// ========================================
async function testWebScraper() {
  console.log('\n🌐 ユースケース2: Webスクレイピングテスト\n');
  const scraper = new WebScraper();

  // Test 2.1: 通常のWebページ
  try {
    const result = await scraper.scrape('https://example.com');
    const content = result.value?.content || result.content || '';
    if (content.length > 0) {
      logTest('2.1 通常Webページ', 'PASS', { contentLength: content.length });
    } else {
      logTest('2.1 通常Webページ', 'FAIL', { note: 'コンテンツ取得失敗' });
    }
  } catch (e) {
    logTest('2.1 通常Webページ', 'FAIL', { error: e.message });
  }

  // Test 2.2: 日本語サイト
  try {
    const result = await scraper.scrape('https://www.microsoft.com/ja-jp/');
    const content = result.value?.content || result.content || '';
    logTest('2.2 日本語サイト', content.length > 0 ? 'PASS' : 'FAIL', { contentLength: content.length });
  } catch (e) {
    logTest('2.2 日本語サイト', 'FAIL', { error: e.message });
  }

  // Test 2.3: 無効なURL
  try {
    const result = await scraper.scrape('https://this-domain-does-not-exist-12345.com');
    logTest('2.3 無効URL処理', 'FAIL', { note: 'エラーが発生すべき' });
  } catch (e) {
    logTest('2.3 無効URL処理', 'PASS', { note: '適切にエラー処理' });
  }
}

// ========================================
// ユースケース3: テキスト分析
// ========================================
async function testTextAnalyzer() {
  console.log('\n🔬 ユースケース3: テキスト分析テスト\n');
  const analyzer = new TextAnalyzer();

  const sampleText = `
    Microsoft 365 Copilotは、AIを活用した生産性向上ツールです。
    Word、Excel、PowerPoint、Outlook、Teamsなどのアプリケーションと統合され、
    業務効率を大幅に向上させます。東京都港区にある日本マイクロソフト株式会社が
    2024年から提供を開始しました。価格は月額3,750円からとなっています。
  `;

  // Test 3.1: analyze メソッド
  try {
    const result = await analyzer.analyze(sampleText);
    const keywords = result.value?.keywords || result.keywords || [];
    if (keywords.length > 0) {
      logTest('3.1 analyze()', 'PASS', { keywords: keywords.slice(0, 5) });
    } else {
      logTest('3.1 analyze()', 'WARN', { note: 'キーワード抽出なし', result });
    }
  } catch (e) {
    logTest('3.1 analyze()', 'FAIL', { error: e.message });
  }

  // Test 3.2: 空文字テスト
  try {
    const result = await analyzer.analyze('');
    logTest('3.2 空文字処理', 'PASS', { note: '適切に処理' });
  } catch (e) {
    logTest('3.2 空文字処理', e.message.includes('empty') ? 'PASS' : 'FAIL', { error: e.message });
  }
}

// ========================================
// ユースケース4: エンティティ抽出
// ========================================
async function testEntityExtractor() {
  console.log('\n🏷️ ユースケース4: エンティティ抽出テスト\n');
  const extractor = new EntityExtractor();

  const sampleText = `
    株式会社マイクロソフトの田中太郎社長は、東京都港区で記者会見を行いました。
    連絡先は info@microsoft.com、電話番号は03-1234-5678です。
    発表日は2026年1月10日、価格は¥50,000となっています。
    詳細は https://www.microsoft.com/ja-jp/ をご覧ください。
  `;

  // Test 4.1: extract() メソッド（AGENTS.mdに記載）
  try {
    const result = await extractor.extract(sampleText);
    logTest('4.1 extract()', 'PASS', { result });
  } catch (e) {
    logTest('4.1 extract()', 'FAIL', { error: e.message, note: 'メソッドが存在しない可能性' });
  }

  // Test 4.2: extractEntities() メソッド（実際の実装）
  try {
    const result = extractor.extractEntities(sampleText);
    if (Array.isArray(result) && result.length > 0) {
      const types = [...new Set(result.map(e => e.type))];
      logTest('4.2 extractEntities()', 'PASS', { count: result.length, types });
    } else {
      logTest('4.2 extractEntities()', 'FAIL', { note: '結果0件' });
    }
  } catch (e) {
    logTest('4.2 extractEntities()', 'FAIL', { error: e.message });
  }

  // Test 4.3: extractByType() メソッド
  try {
    const emails = extractor.extractByType(sampleText, 'email');
    const urls = extractor.extractByType(sampleText, 'url');
    logTest('4.3 extractByType()', 'PASS', { emails: emails.length, urls: urls.length });
  } catch (e) {
    logTest('4.3 extractByType()', 'FAIL', { error: e.message });
  }
}

// ========================================
// ユースケース5: レポート生成
// ========================================
async function testReportGenerator() {
  console.log('\n📝 ユースケース5: レポート生成テスト\n');
  const generator = new ReportGenerator();

  // Test 5.1: generateReport() メソッド
  try {
    const reportData = {
      title: 'テストレポート',
      sections: [
        { heading: 'セクション1', content: 'テスト内容です。' }
      ]
    };
    const result = await generator.generateReport(reportData);
    const content = result.value?.content || result.content || result || '';
    logTest('5.1 generateReport()', content.length > 0 ? 'PASS' : 'WARN', { contentLength: content.length });
  } catch (e) {
    logTest('5.1 generateReport()', 'FAIL', { error: e.message });
  }

  // Test 5.2: generate() メソッド（AGENTS.mdに記載の可能性）
  try {
    const result = await generator.generate({ title: 'Test' });
    logTest('5.2 generate()', 'PASS');
  } catch (e) {
    logTest('5.2 generate()', 'FAIL', { error: e.message, note: 'メソッドが存在しない可能性' });
  }
}

// ========================================
// ユースケース6: 要約生成
// ========================================
async function testSummaryGenerator() {
  console.log('\n📋 ユースケース6: 要約生成テスト\n');
  const generator = new SummaryGenerator();

  const longText = `
    人工知能（AI）技術は、近年急速に発展しています。特に大規模言語モデル（LLM）の
    登場により、自然言語処理の分野で革命的な進歩が見られます。企業は生産性向上の
    ためにAIを積極的に導入しており、Microsoft 365 CopilotやGoogle Geminiなどの
    製品が市場に投入されています。これらのツールは、文書作成、データ分析、
    コミュニケーションの効率化に貢献しています。
  `;

  // Test 6.1: summarize() メソッド
  try {
    const result = await generator.summarize(longText);
    const summary = result.value?.summary || result.summary || result || '';
    logTest('6.1 summarize()', summary.length > 0 ? 'PASS' : 'WARN', { summaryLength: summary.length });
  } catch (e) {
    logTest('6.1 summarize()', 'FAIL', { error: e.message });
  }

  // Test 6.2: 文字数制限付き要約
  try {
    const result = await generator.summarize(longText, { maxLength: 100 });
    logTest('6.2 文字数制限要約', 'PASS');
  } catch (e) {
    logTest('6.2 文字数制限要約', 'FAIL', { error: e.message });
  }
}

// ========================================
// ユースケース7: トピックモデリング
// ========================================
async function testTopicModeler() {
  console.log('\n📊 ユースケース7: トピックモデリングテスト\n');
  const modeler = new TopicModeler();

  const documents = [
    'AIと機械学習は企業のDXを推進しています。',
    'クラウドコンピューティングはコスト削減に貢献します。',
    'セキュリティ対策は企業にとって重要な課題です。'
  ];

  // Test 7.1: model() メソッド
  try {
    const result = await modeler.model(documents);
    logTest('7.1 model()', 'PASS', { result });
  } catch (e) {
    logTest('7.1 model()', 'FAIL', { error: e.message });
  }

  // Test 7.2: extractTopics() メソッド
  try {
    const result = await modeler.extractTopics(documents);
    logTest('7.2 extractTopics()', 'PASS', { result });
  } catch (e) {
    logTest('7.2 extractTopics()', 'FAIL', { error: e.message });
  }
}

// ========================================
// ユースケース8: RSSフィード
// ========================================
async function testFeedReader() {
  console.log('\n📰 ユースケース8: RSSフィードテスト\n');
  const reader = new FeedReader();

  // Test 8.1: read() メソッド
  try {
    const result = await reader.read('https://feeds.feedburner.com/TechCrunch/');
    const items = result.value?.items || result.items || [];
    logTest('8.1 read()', items.length > 0 ? 'PASS' : 'WARN', { itemCount: items.length });
  } catch (e) {
    logTest('8.1 read()', 'FAIL', { error: e.message });
  }

  // Test 8.2: fetch() メソッド
  try {
    const result = await reader.fetch('https://feeds.feedburner.com/TechCrunch/');
    logTest('8.2 fetch()', 'PASS');
  } catch (e) {
    logTest('8.2 fetch()', 'FAIL', { error: e.message, note: 'メソッドが存在しない可能性' });
  }
}

// ========================================
// ユースケース9: 知識グラフ
// ========================================
async function testKnowledgeGraph() {
  console.log('\n🕸️ ユースケース9: 知識グラフテスト\n');
  
  try {
    const graph = new KnowledgeGraph();
    
    // Test 9.1: addNode() メソッド
    try {
      await graph.addNode({ id: 'test1', type: 'concept', label: 'AI' });
      logTest('9.1 addNode()', 'PASS');
    } catch (e) {
      logTest('9.1 addNode()', 'FAIL', { error: e.message });
    }

    // Test 9.2: query() メソッド
    try {
      const result = await graph.query('AI');
      logTest('9.2 query()', 'PASS', { result });
    } catch (e) {
      logTest('9.2 query()', 'FAIL', { error: e.message });
    }

  } catch (e) {
    logTest('9.0 KnowledgeGraph初期化', 'FAIL', { error: e.message });
  }
}

// ========================================
// メイン実行
// ========================================
async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('🧪 KATASHIRO 品質チェック - 複数ユースケーステスト');
  console.log('═'.repeat(60));
  console.log(`📅 実行日時: ${new Date().toISOString()}`);
  console.log(`📦 パッケージ: @nahisaho/katashiro`);

  await testWebSearch();
  await testWebScraper();
  await testTextAnalyzer();
  await testEntityExtractor();
  await testReportGenerator();
  await testSummaryGenerator();
  await testTopicModeler();
  await testFeedReader();
  await testKnowledgeGraph();

  // サマリー出力
  console.log('\n' + '═'.repeat(60));
  console.log('📊 テストサマリー');
  console.log('═'.repeat(60));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️ WARN: ${warned}`);
  console.log(`📝 TOTAL: ${testResults.length}`);

  // 失敗したテストの詳細
  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.details.error || r.details.note}`);
    });
  }

  // JSON出力
  console.log('\n📄 詳細結果をJSONファイルに出力...');
  return testResults;
}

runAllTests()
  .then(results => {
    console.log('\n✅ テスト完了');
    // 結果をファイルに保存したい場合
    // fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  })
  .catch(e => {
    console.error('❌ テスト実行エラー:', e);
  });
