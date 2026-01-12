#!/usr/bin/env node
/**
 * KATASHIRO CLI - AI Research & Analysis Tool
 *
 * @requirement REQ-CLI-001
 * @design DES-KATASHIRO-001 §2.6 CLI Interface
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import { WebSearchClient, WebScraper, TextAnalyzer, EntityExtractor, SummaryGenerator, isOk, isErr } from './index.js';
import {
  createContent,
  isValidFormat,
  isValidProvider,
  parseNumberOption,
  formatSearchResult,
  formatError,
  truncateText
} from './cli-helpers.js';

// package.json からバージョンを取得
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('katashiro')
  .description('KATASHIRO CLI - AI Research & Analysis Tool')
  .version(pkg.version, '-v, --version', 'バージョンを表示');

// 検索コマンド
program
  .command('search <query>')
  .description('Web検索を実行')
  .option('-n, --max <number>', '結果の最大件数', '10')
  .option('-p, --provider <provider>', '検索プロバイダー (duckduckgo|searxng)', 'duckduckgo')
  .option('-f, --format <format>', '出力形式 (json|text)', 'text')
  .action(async (query: string, options: { max: string; provider: string; format: string }) => {
    try {
      const client = new WebSearchClient();
      const provider = options.provider as 'duckduckgo' | 'searxng';
      const results = await client.search(query, { 
        maxResults: parseInt(options.max, 10),
        provider
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(`\n🔍 "${query}" の検索結果: ${results.length}件\n`);
        for (const r of results) {
          console.log(`📄 ${r.title}`);
          console.log(`   ${r.url}`);
          if (r.snippet) {
            console.log(`   ${r.snippet.substring(0, 100)}...`);
          }
          console.log();
        }
      }
    } catch (error) {
      console.error('❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// スクレイピングコマンド
program
  .command('scrape <url>')
  .description('Webページの内容を取得')
  .option('-f, --format <format>', '出力形式 (json|text)', 'text')
  .option('-s, --summary', '要約を表示', false)
  .action(async (url: string, options: { format: string; summary: boolean }) => {
    try {
      const scraper = new WebScraper();
      const result = await scraper.scrape(url);
      
      if (isErr(result)) {
        console.error('❌ スクレイプエラー:', result.error.message);
        process.exit(1);
      }

      const page = result.value;
      
      if (options.format === 'json') {
        console.log(JSON.stringify(page, null, 2));
      } else {
        console.log(`\n📄 ${page.title}`);
        console.log(`🔗 ${page.url}`);
        console.log('\n---\n');
        
        if (options.summary) {
          const summarizer = new SummaryGenerator();
          const content = createContent(page.title, page.content, page.url);
          const summary = await summarizer.generateSummary(content, { maxLength: 500 });
          if (isOk(summary)) {
            console.log('📝 要約:\n');
            console.log(summary.value);
          }
        } else {
          console.log(page.content.substring(0, 2000));
          if (page.content.length > 2000) {
            console.log(`\n... (${page.content.length - 2000}文字省略)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// 分析コマンド
program
  .command('analyze <text>')
  .description('テキストを分析（キーワード・感情分析）')
  .option('-f, --format <format>', '出力形式 (json|text)', 'text')
  .action(async (text: string, options: { format: string }) => {
    try {
      const analyzer = new TextAnalyzer();
      const result = await analyzer.analyze(text);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n📊 テキスト分析結果\n');
        console.log(`🔑 キーワード: ${result.keywords.join(', ')}`);
        console.log(`💬 感情: ${result.sentiment.sentiment}`);
        console.log(`📈 感情スコア: ${result.sentiment.score.toFixed(2)}`);
        console.log(`📝 複雑度: ${result.complexity.level} (${result.complexity.score})`);
        console.log(`📄 単語数: ${result.wordCount}`);
        console.log(`📄 文数: ${result.sentenceCount}`);
      }
    } catch (error) {
      console.error('❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// エンティティ抽出コマンド
program
  .command('extract <text>')
  .description('テキストからエンティティを抽出')
  .option('-f, --format <format>', '出力形式 (json|text)', 'text')
  .action(async (text: string, options: { format: string }) => {
    try {
      const extractor = new EntityExtractor();
      const entities = await extractor.extract(text);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(entities, null, 2));
      } else {
        console.log('\n🔍 エンティティ抽出結果\n');
        
        if (entities.persons.length > 0) {
          console.log(`👤 人名: ${entities.persons.join(', ')}`);
        }
        if (entities.organizations.length > 0) {
          console.log(`🏢 組織: ${entities.organizations.join(', ')}`);
        }
        if (entities.locations.length > 0) {
          console.log(`📍 場所: ${entities.locations.join(', ')}`);
        }
        if (entities.dates.length > 0) {
          console.log(`📅 日付: ${entities.dates.join(', ')}`);
        }
        if (entities.urls.length > 0) {
          console.log(`🔗 URL: ${entities.urls.join(', ')}`);
        }
        if (entities.emails.length > 0) {
          console.log(`📧 メール: ${entities.emails.join(', ')}`);
        }
        if (entities.phones.length > 0) {
          console.log(`📞 電話: ${entities.phones.join(', ')}`);
        }
        if (entities.money.length > 0) {
          console.log(`💰 金額: ${entities.money.join(', ')}`);
        }
        
        console.log(`\n📊 合計: ${entities.all.length}件のエンティティ`);
      }
    } catch (error) {
      console.error('❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// 要約コマンド
program
  .command('summarize <text>')
  .description('テキストを要約')
  .option('-l, --length <number>', '要約の最大文字数', '300')
  .option('-f, --format <format>', '出力形式 (json|text)', 'text')
  .action(async (text: string, options: { length: string; format: string }) => {
    try {
      const summarizer = new SummaryGenerator();
      const content = createContent('CLI Input', text);
      const result = await summarizer.generateSummary(content, { maxLength: parseInt(options.length, 10) });
      
      if (isErr(result)) {
        const error = result.error as Error;
        console.error('❌ 要約エラー:', error.message);
        process.exit(1);
      }

      const summary = result.value;
      
      if (options.format === 'json') {
        console.log(JSON.stringify({ summary, originalLength: text.length }, null, 2));
      } else {
        console.log('\n📝 要約結果\n');
        console.log(summary);
        console.log(`\n(元のテキスト: ${text.length}文字 → 要約: ${summary.length}文字)`);
      }
    } catch (error) {
      console.error('❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
