# KATASHIRO

> VS Code Agent Mode 向け情報収集・分析・生成システム

[![npm version](https://badge.fury.io/js/@nahisaho%2Fkatashiro-mcp-server.svg)](https://www.npmjs.com/package/@nahisaho/katashiro-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概要

**KATASHIRO**は、VS Code Agent Mode向けの情報収集・分析・コンテンツ生成システムです。Model Context Protocol (MCP) に対応し、AIエージェントがWeb情報を収集・分析し、レポートやプレゼンテーションを自動生成できます。

## 特徴

- 🌐 **情報収集**: Webスクレイピング、API連携、RSSフィード、Web検索
- 📊 **テキスト分析**: エンティティ抽出、トピック分析、品質評価
- 📝 **コンテンツ生成**: レポート、要約、プレゼンテーション、引用
- 🧠 **知識グラフ**: グラフ管理、クエリ、可視化
- 🔄 **フィードバック学習**: パターン検出、適応型推薦
- 🔌 **MCP対応**: VS Code Agent Modeとシームレス連携
- 🔍 **透明性機能**: AI/人間貢献追跡、バージョン管理、共同作業 *(v0.2.0)*
- ⚙️ **ワークフロー自動化**: パイプライン、品質ゲート、スタイルガイド *(v0.2.0)*
- 🤖 **エージェントオーケストレーション**: タスク分解、並列実行、ツール管理 *(v0.4.0)*
- 🔒 **セキュリティ**: リスク評価、監査ログ、サンドボックス実行 *(v0.4.0)*

## インストール

```bash
# オールインワンパッケージ（推奨）
npm install @nahisaho/katashiro

# MCPサーバー
npm install @nahisaho/katashiro-mcp-server

# 個別パッケージ
npm install @nahisaho/katashiro-core
npm install @nahisaho/katashiro-collector
npm install @nahisaho/katashiro-analyzer
npm install @nahisaho/katashiro-generator
npm install @nahisaho/katashiro-knowledge
npm install @nahisaho/katashiro-feedback

# v0.4.0 新規パッケージ
npm install @nahisaho/katashiro-orchestrator
npm install @nahisaho/katashiro-sandbox
npm install @nahisaho/katashiro-workspace
npm install @nahisaho/katashiro-security
```

## クイックスタート

### CLIとして使用

```bash
# Web検索
npx katashiro search "検索クエリ"

# Webスクレイピング
npx katashiro scrape https://example.com

# テキスト分析
npx katashiro analyze "分析するテキスト"

# エンティティ抽出
npx katashiro extract "株式会社テストの山田太郎さん"

# 要約
npx katashiro summarize "長いテキスト..." --length 200
```

### MCPサーバーとして使用

VS Code `settings.json`:

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

### ライブラリとして使用

```typescript
// オールインワンパッケージから
import { WebScraper, TextAnalyzer, ReportGenerator } from '@nahisaho/katashiro';

// または個別パッケージから
import { WebScraper } from '@nahisaho/katashiro-collector';
import { TextAnalyzer } from '@nahisaho/katashiro-analyzer';
import { ReportGenerator } from '@nahisaho/katashiro-generator';

// Webページをスクレイピング
const scraper = new WebScraper();
const page = await scraper.scrape('https://example.com');

// テキスト分析
const analyzer = new TextAnalyzer();
const analysis = await analyzer.analyze(page.value.text);

// レポート生成
const generator = new ReportGenerator();
const report = await generator.generate({
  title: '調査レポート',
  sections: [{ heading: '分析結果', content: analysis.summary }]
});
```

### エージェントオーケストレーション（v0.4.0）

```typescript
import {
  TaskDecomposer,
  MultiAgentOrchestrator,
  ToolRegistry,
} from '@nahisaho/katashiro-orchestrator';

// タスク分解
const decomposer = new TaskDecomposer();
const planResult = await decomposer.decompose('AIトレンドを調査して分析レポートを作成');
// => リサーチ → 分析 → レポート生成のサブタスクに分解

// マルチエージェント並列実行
const orchestrator = new MultiAgentOrchestrator({
  taskDecomposer: decomposer,
  config: { maxConcurrentAgents: 5 },
});
const result = await orchestrator.execute('複雑な調査タスク');
console.log(`${result.metadata.agentsUsed}エージェントが実行`);

// ツール登録とAction-Observationパターン
const registry = new ToolRegistry();
registry.register({
  name: 'web_search',
  description: 'Web検索',
  category: 'research',
  defaultRiskLevel: 'low',
  defaultTimeout: 30,
  paramsSchema: { type: 'object', required: ['query'] },
  resultSchema: { type: 'array' },
  execute: async (params) => { /* 検索ロジック */ },
});
```

### セキュリティ＆サンドボックス（v0.4.0）

```typescript
import { SecurityAnalyzer, ActionLogger } from '@nahisaho/katashiro-security';
import { LocalExecutor } from '@nahisaho/katashiro-sandbox';
import { LocalWorkspace } from '@nahisaho/katashiro-workspace';

// セキュリティ分析
const security = new SecurityAnalyzer({
  denyPatterns: ['*.env', '**/secrets/**'],
  allowPatterns: ['*.md', '*.txt'],
});
const analysis = security.analyze({
  type: 'file_read',
  target: '/project/.env',
});
console.log(`リスクレベル: ${analysis.riskLevel}`); // => 'high'

// 監査ログ
const logger = new ActionLogger();
logger.log({
  actionType: 'command_execute',
  target: 'npm install',
  timestamp: new Date().toISOString(),
  result: 'success',
  riskLevel: 'medium',
});
const summary = logger.getSummary();
console.log(`総アクション: ${summary.totalActions}`);

// サンドボックス実行
const executor = new LocalExecutor();
const execResult = await executor.execute({
  code: 'print("Hello")',
  language: 'python',
  timeout: 5000,
});

// ワークスペース操作
const workspace = new LocalWorkspace('/project');
const files = await workspace.list('/src');
const content = await workspace.read('/src/index.ts');
```

### 透明性機能（v0.2.0）

```typescript
import { 
  CollaborationTracker, 
  ContributionAnalyzer, 
  VersioningManager,
  TransparencyReport 
} from '@nahisaho/katashiro';

// 共同作業セッション追跡
const tracker = new CollaborationTracker();
const session = tracker.startSession('doc-001', 'Research Document', {
  name: 'Author',
  type: 'human',
});

// AI/人間の貢献分析
const contribAnalyzer = new ContributionAnalyzer();
const analysis = await contribAnalyzer.analyze(content);
console.log(`AI ratio: ${analysis.aiRatio * 100}%`);

// バージョン管理
const versionMgr = new VersioningManager();
versionMgr.initializeHistory({ documentId: 'doc-001' });
versionMgr.saveVersion(content, 'Initial version');

// 透明性レポート
const transparencyReport = new TransparencyReport();
const report = transparencyReport.generate({
  title: 'Research Document',
  sessions: [session],
  analyses: [analysis],
  operations: tracker.getOperationLog(session.id),
});
```

### ワークフロー自動化（v0.2.0）

```typescript
import { 
  WorkflowEngine, 
  QualityGate, 
  StyleGuideEnforcer,
  PipelineOrchestrator 
} from '@nahisaho/katashiro';

// ワークフローエンジン
const engine = new WorkflowEngine();
engine.loadDefinition({
  id: 'research-workflow',
  name: 'Research Pipeline',
  version: '1.0.0',
  steps: [
    { id: 'analyze', name: 'Analyze', type: 'analyze', execute: async (input) => { ... } },
    { id: 'generate', name: 'Generate', type: 'generate', dependsOn: ['analyze'], execute: async (input) => { ... } },
  ],
});
const result = await engine.execute({ content: 'input text' });

// 品質ゲート
const qualityGate = new QualityGate();
const qualityResult = await qualityGate.evaluate(content);
console.log(`Score: ${qualityResult.overallScore}/100`);

// スタイルガイド
const styleEnforcer = new StyleGuideEnforcer();
const styleResult = styleEnforcer.validate(content);
console.log(`Passed: ${styleResult.passed}`);
```

## パッケージ

| パッケージ | 説明 |
|-----------|------|
| [@nahisaho/katashiro](https://www.npmjs.com/package/@nahisaho/katashiro) | **オールインワン（推奨）** |
| [@nahisaho/katashiro-core](https://www.npmjs.com/package/@nahisaho/katashiro-core) | コアライブラリ |
| [@nahisaho/katashiro-collector](https://www.npmjs.com/package/@nahisaho/katashiro-collector) | 情報収集 |
| [@nahisaho/katashiro-analyzer](https://www.npmjs.com/package/@nahisaho/katashiro-analyzer) | テキスト分析 |
| [@nahisaho/katashiro-generator](https://www.npmjs.com/package/@nahisaho/katashiro-generator) | コンテンツ生成 |
| [@nahisaho/katashiro-knowledge](https://www.npmjs.com/package/@nahisaho/katashiro-knowledge) | 知識グラフ |
| [@nahisaho/katashiro-feedback](https://www.npmjs.com/package/@nahisaho/katashiro-feedback) | フィードバック |
| [@nahisaho/katashiro-mcp-server](https://www.npmjs.com/package/@nahisaho/katashiro-mcp-server) | MCPサーバー |
| [@nahisaho/katashiro-orchestrator](https://www.npmjs.com/package/@nahisaho/katashiro-orchestrator) | エージェントオーケストレーション *(v0.4.0)* |
| [@nahisaho/katashiro-sandbox](https://www.npmjs.com/package/@nahisaho/katashiro-sandbox) | サンドボックス実行 *(v0.4.0)* |
| [@nahisaho/katashiro-workspace](https://www.npmjs.com/package/@nahisaho/katashiro-workspace) | ワークスペース管理 *(v0.4.0)* |
| [@nahisaho/katashiro-security](https://www.npmjs.com/package/@nahisaho/katashiro-security) | セキュリティ分析 *(v0.4.0)* |

## ドキュメント

- [CHANGELOG](CHANGELOG.md)
- [ユーザーガイド](docs/USER-GUIDE.md)
- [ユーザーガイド（日本語）](docs/USER-GUIDE.ja.md)
- [要件定義書](../storage/specs/REQ-KATASHIRO-001.md)
- [設計書](../storage/design/DES-KATASHIRO-001.md)

## 開発

```bash
# クローン
git clone https://github.com/nahisaho/katashiro.git
cd katashiro

# 依存関係インストール
npm install

# ビルド
npm run build

# テスト
npm test
```

## テスト

```
Test Files  80 passed (80)
     Tests  1569 passed | 4 skipped (1573)
```

## ライセンス

MIT License

## 作者

[@nahisaho](https://github.com/nahisaho)
