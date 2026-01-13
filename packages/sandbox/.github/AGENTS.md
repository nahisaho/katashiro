# MUSUBIX - Neuro-Symbolic AI Integration System

> **AI Coding Agent向け**: このファイルはAIエージェント（GitHub Copilot、Claude等）がMUSUBIXプロジェクトを理解するためのガイドです。

## 🎯 プロジェクト概要

**MUSUBIX**は、**Neural（LLM）** と **Symbolic（Knowledge Graph）** 推論を統合した次世代AIコーディングシステムです。MUSUBI SDD方法論とオントロジー推論を組み合わせ、高品質なソフトウェア開発を支援します。

| 項目 | 詳細 |
|------|------|
| **バージョン** | 3.0.0 (Git-Native Knowledge System) |
| **言語** | TypeScript |
| **ランタイム** | Node.js >= 20.0.0 |
| **パッケージマネージャ** | npm >= 10.0.0 |
| **ビルドシステム** | モノレポ（npm workspaces） |
| **テストフレームワーク** | Vitest |
| **テスト数** | 2249+ (全合格) |
| **パッケージ数** | 25 |
| **MCPツール数** | 61 |
| **Agent Skills** | 13 (Claude Code対応) |

---

## 📦 アーキテクチャ

### パッケージ構成

```
packages/
├── core/           # @nahisaho/musubix-core
├── mcp-server/     # @nahisaho/musubix-mcp-server  
├── security/       # @nahisaho/musubix-security
├── formal-verify/  # @nahisaho/musubix-formal-verify
├── pattern-mcp/    # @nahisaho/musubix-pattern-mcp
├── ontology-mcp/   # @nahisaho/musubix-ontology-mcp
├── wake-sleep/     # @nahisaho/musubix-wake-sleep
├── sdd-ontology/   # @nahisaho/musubix-sdd-ontology
├── dfg/            # @nahisaho/musubix-dfg
├── lean/           # @nahisaho/musubix-lean
├── library-learner/# @nahisaho/musubix-library-learner
├── neural-search/  # @nahisaho/musubix-neural-search
├── synthesis/      # @nahisaho/musubix-synthesis
├── agent-orchestrator/ # @nahisaho/musubix-agent-orchestrator
├── workflow-engine/    # @nahisaho/musubix-workflow-engine
├── skill-manager/      # @nahisaho/musubix-skill-manager
├── codegraph/          # @nahisaho/musubix-codegraph
├── knowledge/          # @musubix/knowledge (v3.0.0 NEW!)
├── policy/             # @musubix/policy (v3.0.0 NEW!)
└── decisions/          # @musubix/decisions (v3.0.0 NEW!)
```

| パッケージ | npm | 役割 |
|-----------|-----|------|
| `packages/core/` | `@nahisaho/musubix-core` | コアライブラリ - CLI、EARS検証、コード生成、設計パターン |
| `packages/mcp-server/` | `@nahisaho/musubix-mcp-server` | MCPサーバー - 61ツール、5プロンプト |
| `packages/security/` | `@nahisaho/musubix-security` | セキュリティ分析 - 脆弱性検出、シークレット検出、テイント解析 |
| `packages/formal-verify/` | `@nahisaho/musubix-formal-verify` | 形式検証 - Z3統合、Hoare検証、EARS→SMT変換 |
| `packages/pattern-mcp/` | `@nahisaho/musubix-pattern-mcp` | パターン学習 - 抽出・圧縮・ライブラリ |
| `packages/ontology-mcp/` | `@nahisaho/musubix-ontology-mcp` | オントロジー - N3Store・推論エンジン |
| `packages/wake-sleep/` | `@nahisaho/musubix-wake-sleep` | Wake-Sleep学習サイクル |
| `packages/sdd-ontology/` | `@nahisaho/musubix-sdd-ontology` | SDD方法論オントロジー |
| `packages/dfg/` | `@nahisaho/musubix-dfg` | **DFG/CFG抽出** - データフロー・制御フロー解析 |
| `packages/lean/` | `@nahisaho/musubix-lean` | **Lean 4統合** - 定理証明・EARS変換 |
| `packages/library-learner/` | `@nahisaho/musubix-library-learner` | **ライブラリ学習** - APIパターン抽出、メトリクスエクスポート |
| `packages/knowledge/` | `@musubix/knowledge` | **知識ストア (v3.0.0 NEW!)** - Git-friendly JSON知識グラフ |
| `packages/policy/` | `@musubix/policy` | **ポリシーエンジン (v3.0.0 NEW!)** - 9憲法条項検証 |
| `packages/decisions/` | `@musubix/decisions` | **ADRマネージャー (v3.0.0 NEW!)** - Architecture Decision Records |
| `packages/neural-search/` | `@nahisaho/musubix-neural-search` | **ニューラル検索** - 意味的コード検索、軌跡ロギング |
| `packages/synthesis/` | `@nahisaho/musubix-synthesis` | **プログラム合成** - ニューラル誘導合成、説明生成 |
| `packages/agent-orchestrator/` | `@nahisaho/musubix-agent-orchestrator` | **エージェント調整** - サブエージェント分散・複雑度分析 |
| `packages/workflow-engine/` | `@nahisaho/musubix-workflow-engine` | **ワークフロー制御** - 5フェーズ制御・品質ゲート |
| `packages/skill-manager/` | `@nahisaho/musubix-skill-manager` | **スキル管理** - スキル登録・実行・検証 |
| `packages/codegraph/` | `@nahisaho/musubix-codegraph` | **コードグラフ** - コード構造解析・依存関係追跡 |

### 非推奨パッケージ（Deprecated） ⚠️

以下のYATA関連パッケージはv3.0.0で非推奨となりました。`@musubix/knowledge`へ移行してください。

| パッケージ | 状態 | 移行先 |
|-----------|------|--------|
| `packages/yata-client/` | ⚠️ Deprecated | `@musubix/knowledge` |
| `packages/yata-global/` | ⚠️ Deprecated | `@musubix/knowledge` |
| `packages/yata-local/` | ⚠️ Deprecated | `@musubix/knowledge` |
| `packages/yata-scale/` | ⚠️ Deprecated | `@musubix/knowledge` |
| `packages/yata-ui/` | ⚠️ Deprecated | `@musubix/knowledge` |

**移行ガイド**: [docs/MIGRATION-v3.0.md](docs/MIGRATION-v3.0.md)

### Core パッケージモジュール

```
packages/core/src/
├── auth/           # 認証・認可
├── cli/            # CLIインターフェース
├── codegen/        # コード生成・解析
├── design/         # 設計パターン・C4モデル
├── error/          # エラーハンドリング
├── explanation/    # 説明生成・可視化
├── learning/       # 自己学習システム
├── requirements/   # 要件分析・分解
├── symbolic/       # シンボリック推論（v1.2.0 NEW!）
├── traceability/   # トレーサビリティ
├── types/          # 型定義
├── utils/          # ユーティリティ
└── validators/     # EARS検証
```

---

## 🛠️ CLI コマンド

```bash
# プロジェクト初期化
npx musubix init [path] [--name <name>] [--force]

# 要件分析（EARS形式）
npx musubix requirements analyze <file>    # 自然言語 → EARS変換
npx musubix requirements validate <file>   # EARS構文検証
npx musubix requirements map <file>        # オントロジーマッピング
npx musubix requirements search <query>    # 関連要件検索

# 設計生成
npx musubix design generate <file>         # 要件から設計生成
npx musubix design patterns <context>      # パターン検出
npx musubix design validate <file>         # SOLID準拠検証
npx musubix design c4 <file>               # C4ダイアグラム生成
npx musubix design adr <decision>          # ADR生成

# コード生成
npx musubix codegen generate <file>        # 設計からコード生成
npx musubix codegen analyze <file>         # 静的解析
npx musubix codegen security <path>        # セキュリティスキャン

# テスト
npx musubix test generate <file>           # テスト生成
npx musubix test coverage <dir>            # カバレッジ測定

# トレーサビリティ
npx musubix trace matrix                   # トレーサビリティマトリクス
npx musubix trace matrix -p <project>      # 指定プロジェクトのマトリクス
npx musubix trace impact <id>              # 影響分析
npx musubix trace validate                 # リンク検証
npx musubix trace sync                     # トレースマトリクス自動更新 (v1.6.7 NEW!)
npx musubix trace sync --dry-run           # プレビューのみ

# 説明生成
npx musubix explain why <id>               # 決定理由の説明
npx musubix explain graph <id>             # 推論グラフ生成

# 自己学習システム
npx musubix learn status                   # 学習状態ダッシュボード
npx musubix learn feedback <id>            # フィードバック記録
npx musubix learn patterns                 # パターン一覧表示
npx musubix learn add-pattern <name>       # パターン手動登録
npx musubix learn remove-pattern <id>      # パターン削除
npx musubix learn recommend                # コンテキストベースの推奨
npx musubix learn decay                    # 未使用パターンの減衰
npx musubix learn export                   # 学習データエクスポート
  # オプション: --output <file>, --privacy-filter, --patterns-only, --feedback-only, --min-confidence <n>
npx musubix learn import <file>            # 学習データインポート
  # オプション: --merge-strategy <skip|overwrite|merge>, --dry-run, --patterns-only, --feedback-only

# オントロジー操作 (v1.4.1 NEW!)
npx musubix ontology validate -f <file>    # 知識グラフ整合性検証
npx musubix ontology check-circular -f <file>  # 循環依存チェック
npx musubix ontology stats -f <file>       # 統計表示

# Interactive REPL (v1.5.0 NEW!)
npx musubix repl                           # 対話的シェルを起動
npx musubix repl --history <file>          # カスタム履歴ファイル
npx musubix repl --no-color                # 色なしモード

# KGPR - Knowledge Graph Pull Request (v1.6.4 - DEPRECATED)
# KGPRは廃止されました。通常のGit PRワークフローを使用してください。

# SDDプロジェクトスキャフォールド (v1.6.7 NEW!)
npx musubix scaffold domain-model <name>   # DDDプロジェクト生成
npx musubix scaffold domain-model <name> -e "Entity1,Entity2"  # エンティティ指定
npx musubix scaffold domain-model <name> -d DOMAIN  # ドメイン接頭辞指定
npx musubix scaffold minimal <name>        # 最小構成プロジェクト

# プログラム合成 (v2.2.0 NEW!)
npx musubix synthesize <examples.json>     # 例からプログラム合成
npx musubix synthesize pbe <examples.json> # PBE特化合成
npx musubix syn <examples.json>            # エイリアス

# パターンライブラリ管理 (v2.2.0 NEW!)
npx musubix library learn <file>           # コードからパターン学習
npx musubix library query <query>          # パターン検索
npx musubix library stats                  # 統計表示
npx musubix lib stats                      # エイリアス

# ヘルプ
npx musubix --help
npx musubix help <command>
```

---

## 🔌 MCP Server

### 起動方法

```bash
npx @nahisaho/musubix-mcp-server
npx musubix-mcp --transport stdio
```

### ツール一覧（61ツール）

#### SDD基本ツール（7ツール）

| ツール名 | 説明 |
|---------|------|
| `sdd_create_requirements` | EARS形式の要件ドキュメント作成 |
| `sdd_validate_requirements` | 要件のEARS検証・憲法準拠チェック |
| `sdd_create_design` | C4モデル設計ドキュメント作成 |
| `sdd_validate_design` | 設計の要件トレーサビリティ検証 |
| `sdd_create_tasks` | 設計から実装タスク生成 |
| `sdd_validate_constitution` | 9憲法条項への準拠検証 |
| `sdd_validate_traceability` | 要件↔設計↔タスクのトレーサビリティ検証 |

#### パターン統合ツール（7ツール）- v1.3.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `pattern_extract` | コードからパターンを抽出 |
| `pattern_compress` | パターンの抽象化・圧縮 |
| `pattern_store` | パターンライブラリへの保存 |
| `pattern_query` | パターンの検索・取得 |
| `pattern_consolidate` | 類似パターンの統合 |
| `ontology_query` | オントロジーグラフへのクエリ |
| `ontology_infer` | オントロジーによる推論実行 |

#### オントロジー検証ツール（3ツール）- v1.4.1 NEW!

| ツール名 | 説明 |
|---------|------|
| `consistency_validate` | 知識グラフの整合性検証 |
| `validate_triple` | 単一トリプルの事前検証 |
| `check_circular` | 循環依存の検出 |

#### Synthesisツール（5ツール）- v2.2.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `synthesis_from_examples` | 例からプログラム合成 |
| `synthesis_analyze_examples` | 例題品質分析 |
| `synthesis_learn_patterns` | パターン学習 |
| `synthesis_query_patterns` | パターン検索 |
| `synthesis_get_stats` | 統計取得 |

#### Agent Orchestratorツール（4ツール）- v2.4.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `agent_analyze_complexity` | タスク複雑度分析・サブエージェント分散判定 |
| `agent_dispatch` | サブエージェントへのタスクディスパッチ |
| `agent_collect_results` | サブエージェント結果の収集・統合 |
| `agent_get_status` | エージェント実行状態の取得 |

#### Workflow Engineツール（5ツール）- v2.4.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `workflow_create` | 新規ワークフロー作成（5フェーズ制御） |
| `workflow_advance_phase` | 次フェーズへの遷移（品質ゲート検証付き） |
| `workflow_set_approval` | ユーザー承認状態の設定 |
| `workflow_get_status` | ワークフロー現在状態の取得 |
| `workflow_validate_transition` | フェーズ遷移の事前検証 |

#### Skill Managerツール（5ツール）- v2.4.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `skill_register` | 新規スキルの登録 |
| `skill_execute` | スキルの実行 |
| `skill_list` | 登録済みスキル一覧の取得 |
| `skill_get_info` | スキル詳細情報の取得 |
| `skill_validate` | スキル定義の検証 |

#### Knowledge Storeツール（6ツール）- v3.0.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `knowledge_put_entity` | エンティティの作成・更新 |
| `knowledge_get_entity` | エンティティの取得 |
| `knowledge_delete_entity` | エンティティの削除 |
| `knowledge_add_relation` | リレーションの追加 |
| `knowledge_query` | グラフクエリによる検索 |
| `knowledge_traverse` | グラフ走査による関連エンティティ探索 |

#### Policy Engineツール（4ツール）- v3.0.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `policy_validate` | プロジェクトのポリシー検証 |
| `policy_list` | 登録済みポリシー一覧 |
| `policy_get` | ポリシー詳細取得 |
| `policy_check_file` | 単一ファイルのポリシー検証 |

#### Decision Recordsツール（8ツール）- v3.0.0 NEW!

| ツール名 | 説明 |
|---------|------|
| `decision_create` | ADRの作成 |
| `decision_list` | ADR一覧取得 |
| `decision_get` | ADR詳細取得 |
| `decision_accept` | ADRの承認 |
| `decision_deprecate` | ADRの廃止 |
| `decision_search` | ADRのキーワード検索 |
| `decision_find_by_requirement` | 要件からADR検索 |
| `decision_generate_index` | ADRインデックス生成 |

### プロンプト一覧（5プロンプト）

| プロンプト名 | 説明 |
|-------------|------|
| `sdd_requirements_analysis` | 機能説明からEARS形式要件を生成 |
| `sdd_requirements_review` | 要件の完全性・憲法準拠レビュー |
| `sdd_design_generation` | 要件からC4モデル設計を生成 |
| `synthesis_guidance` | 合成ガイダンス (v2.2.0 NEW!) |
| `synthesis_explain_pattern` | パターン説明 (v2.2.0 NEW!) |

---

## 📋 9憲法条項（Constitutional Articles）

すべての開発活動を統治する不変のルールです。

| 条項 | 名称 | 概要 |
|-----|------|------|
| **I** | Library-First | 機能は独立ライブラリとして開始 |
| **II** | CLI Interface | すべてのライブラリはCLI公開必須 |
| **III** | Test-First | Red-Green-Blueサイクルでテスト先行 |
| **IV** | EARS Format | 要件はEARS形式で記述 |
| **V** | Traceability | 要件↔設計↔コード↔テストの100%追跡 |
| **VI** | Project Memory | steering/を参照してから決定 |
| **VII** | Design Patterns | 設計パターン適用の文書化 |
| **VIII** | Decision Records | すべての決定をADRで記録 |
| **IX** | Quality Gates | フェーズ移行前の品質検証 |

**詳細**: [steering/rules/constitution.md](steering/rules/constitution.md)

---

## 📁 プロジェクトメモリ（Steering）

AIエージェントは決定前に必ずこれらのファイルを参照してください。

| ファイル | 内容 |
|---------|------|
| `steering/structure.ja.md` | アーキテクチャパターン、レイヤー構造 |
| `steering/tech.ja.md` | 技術スタック（TypeScript, Node.js 20+） |
| `steering/product.ja.md` | プロダクトコンテキスト |
| `steering/rules/constitution.md` | 9憲法条項 |
| `steering/project.yml` | プロジェクト設定 |

---

## 📂 ストレージ構造

| パス | 内容 |
|-----|------|
| `storage/specs/` | 要件(REQ-*)、設計(DES-*)、タスク(TSK-*) |
| `storage/design/` | 設計ドキュメント、C4ダイアグラム |
| `storage/traceability/` | トレーサビリティマトリクス |
| `storage/reviews/` | コードレビュー、検証結果 |
| `storage/changes/` | 変更履歴 |
| `storage/archive/` | アーカイブ |

---

## 🧪 開発コマンド

```bash
# 依存関係インストール
npm install

# 全パッケージビルド
npm run build

# テスト実行
npm run test              # 全テスト
npm run test:unit         # ユニットテスト
npm run test:integration  # 統合テスト
npm run test:coverage     # カバレッジ計測

# コード品質
npm run lint              # ESLint
npm run lint:fix          # ESLint 自動修正
npm run typecheck         # TypeScript型チェック

# クリーンアップ
npm run clean
```

---

## 🔑 主要機能

### 1. Neuro-Symbolic統合（REQ-INT-001〜003準拠）
- **Neural（LLM）**: 創造的なコード生成、自然言語理解
- **Symbolic（Ontology）**: オントロジーによる精密な推論、一貫性検証
- **信頼度評価ルール** (REQ-INT-002):
  | シンボリック結果 | ニューラル信頼度 | 最終決定 |
  |-----------------|-----------------|---------|
  | invalid | - | ニューラル結果を棄却 |
  | valid | ≥0.8 | ニューラル結果を採用 |
  | valid | <0.8 | シンボリック結果を優先 |

### 2. EARS要件分析
5つのEARSパターンで要件を形式化（REQ-RA-001準拠）：

| パターン | 構文 | 用途 |
|---------|------|------|
| Ubiquitous | `THE [system] SHALL [requirement]` | システムが常に満たすべき要件 |
| Event-driven | `WHEN [event], THE [system] SHALL [response]` | 特定イベント発生時の要件 |
| State-driven | `WHILE [state], THE [system] SHALL [response]` | 特定状態における要件 |
| Unwanted | `THE [system] SHALL NOT [behavior]` | 回避すべき動作の要件 |
| Optional | `IF [condition], THEN THE [system] SHALL [response]` | 条件付き要件 |

**要件総数**: 41要件（REQ-MUSUBIX-001定義）  
**優先度**: P0（必須）、P1（重要）、P2（任意）

### 3. C4モデル設計
4つのレベルで設計を構造化：
- **Context**: システム境界と外部アクター
- **Container**: 技術選択とコンテナ構成
- **Component**: コンテナ内部構造
- **Code**: 実装詳細

**C4コード生成** (v1.0.12 NEW!):
```bash
# C4設計ドキュメントからTypeScriptスケルトンコードを自動生成
npx musubix codegen generate <design.md> --output src/
```
- 設計パターン（Repository, Service, Factory等）を自動検出
- コンポーネントごとにTypeScriptファイル生成
- 設計との完全なトレーサビリティを維持

### 4. 完全なトレーサビリティ
```
要件(REQ-*) → 設計(DES-*) → タスク(TSK-*) → コード → テスト
```

### 5. 自己学習システム（REQ-LEARN-001〜006準拠）
- **フィードバック収集**: accept/reject/modifyの記録と分析
- **パターン抽出**: 繰り返しパターンの自動検出・登録
- **適応的推論**: 学習済みパターンに基づく推論調整
- **プライバシー保護**: 機密情報の自動フィルタリング（ローカルストレージのみ）

```
フィードバック → パターン候補 → 閾値超過 → パターン登録 → 推論に適用
```

### 6. Wake-Sleep学習サイクル（v1.3.0 NEW!）

Wake-Sleepアルゴリズムに基づいた継続的学習システム：

| フェーズ | 処理内容 |
|---------|----------|
| **Wake** | コード観察 → パターン抽出 → 知識グラフ更新 |
| **Sleep** | パターン統合 → 類似パターン圧縮 → メモリ最適化 |

```
Wake Phase: observe() → extractPatterns() → updateKnowledge()
Sleep Phase: consolidate() → compress() → optimize()
```

**主要コンポーネント**:
- `WakeSleepCycle`: 学習サイクル全体の制御
- `PatternLibrary`: 学習済みパターンの永続化管理
- `PatternOntologyBridge`: パターン↔オントロジー相互変換
- `N3Store`: RDF/OWLベースの知識グラフストレージ

### 7. Git-Native Knowledge System（v3.0.0 NEW!）

サーバーレス・Git-friendlyな知識グラフシステム：

| 特徴 | 説明 |
|------|------|
| **サーバーレス** | データベース不要、JSONファイルで完結 |
| **Git-friendly** | diff/merge/PR対応、バージョン管理可能 |
| **軽量** | ゼロ依存（外部ライブラリ不要） |
| **階層型ID** | `requirement:REQ-001`、`design:DES-001` |

```
.knowledge/
└── graph.json      # 全エンティティ・リレーション
```

**主要API**:
```typescript
import { createKnowledgeStore } from '@musubix/knowledge';

const store = createKnowledgeStore('.knowledge');

// エンティティ操作
await store.putEntity({
  id: 'requirement:REQ-001',
  type: 'requirement',
  name: 'User Authentication',
  properties: { ears: 'WHEN user logs in...' },
  tags: ['security', 'auth'],
});

const req = await store.getEntity('requirement:REQ-001');

// リレーション追加
await store.addRelation({
  source: 'requirement:REQ-001',
  target: 'design:DES-001',
  type: 'tracesTo',
  properties: { confidence: 0.95 },
});

// クエリ
const entities = await store.query({ type: 'requirement', tags: ['security'] });

// グラフ走査
const related = await store.traverse('requirement:REQ-001', {
  direction: 'outgoing',
  relationTypes: ['tracesTo'],
  maxDepth: 2,
});
```

**関連パッケージ**:
- `@musubix/policy`: 9憲法条項の自動検証
- `@musubix/decisions`: Architecture Decision Records管理

**ドキュメント**: [docs/packages/knowledge.md](docs/packages/knowledge.md)

### 8. Advanced Learning Enhancement（v2.2.0 NEW!）

3パッケージに高度な学習機能を追加：

#### Neural Search強化
```typescript
import {
  ContextAwareEmbedder,   // コンテキスト認識埋め込み
  HybridRanker,           // BM25 + ベクトル類似度
  EmbeddingCache,         // LRU + TTL キャッシュ
  createTrajectoryLogger, // 検索軌跡ロギング
} from '@nahisaho/musubix-neural-search';

const logger = createTrajectoryLogger();
logger.logBranch({ depth: 1, score: 0.85, action: 'expand' });
const parquet = logger.export('parquet');
```

#### Library Learner強化
```typescript
import {
  SemanticChunker,        // AST境界認識チャンキング
  PatternVersionManager,  // Git風バージョン管理
  createMetricsExporter,  // メトリクスエクスポート
} from '@nahisaho/musubix-library-learner';

const exporter = createMetricsExporter(library);
const markdown = exporter.export('markdown');
const summary = exporter.getSummary(); // { healthStatus: 'good' }
```

#### Synthesis強化
```typescript
import {
  createMetaLearningEngine,    // メタ学習エンジン
  createExampleAnalyzer,       // 例題品質分析
  createExplanationGenerator,  // 説明生成
} from '@nahisaho/musubix-synthesis';

const explainer = createExplanationGenerator();
const explanation = explainer.generate(program);
const summary = explainer.summarize(program);
// "Converts to uppercase"
```

---

## 📚 学習済みベストプラクティス（v1.1.10 Updated!）

Project-07〜14の実装から学習したパターンです。

### コードパターン

| ID | 名称 | 概要 | 信頼度 |
|----|------|------|--------|
| BP-CODE-001 | Entity Input DTO | エンティティ作成にInput DTOオブジェクトを使用 | 95% |
| BP-CODE-002 | Date-based ID Format | PREFIX-YYYYMMDD-NNN形式でIDを生成 | 90% |
| BP-CODE-003 | Value Objects | ドメイン概念にValue Objectを使用 | 90% |
| BP-CODE-004 | Function-based Value Objects | クラスではなくinterface+factory関数でVO実装 | 95% |
| BP-CODE-005 | Result Type | 失敗可能な操作にResult<T, E>を使用 | 95% |

**Function-based Value Object例**:
```typescript
// ✅ 推奨: Interface + Factory Function
interface Price {
  readonly amount: number;
  readonly currency: 'JPY';
}

function createPrice(amount: number): Result<Price, ValidationError> {
  if (amount < 100 || amount > 1_000_000) {
    return err(new ValidationError('Price must be between 100 and 1,000,000 JPY'));
  }
  return ok({ amount, currency: 'JPY' });
}

// ❌ 非推奨: クラスベース（構造的型付けと相性が悪い）
class Price {
  private constructor(readonly amount: number) {}
  static create(amount: number): Price { ... }
}
```

### 設計パターン

| ID | 名称 | 概要 | 信頼度 |
|----|------|------|--------|
| BP-DESIGN-001 | Status Transition Map | 有効なステータス遷移をMapで定義 | 95% |
| BP-DESIGN-002 | Repository Async Pattern | 将来のDB移行に備えてasync化 | 85% |
| BP-DESIGN-003 | Service Layer with DI | リポジトリをDIしたService層 | 90% |
| BP-DESIGN-004 | Optimistic Locking | 同時編集検出のためのversion管理 | 90% |
| BP-DESIGN-005 | AuditService | データ変更の監査ログ記録 | 85% |
| BP-DESIGN-006 | Entity Counter Reset | テスト用のresetXxxCounter()関数を提供 | 95% |
| BP-DESIGN-007 | Expiry Time Logic | 有効期限をexpiresAtフィールドで明示管理 | 90% |

**Status Transition Map例**:
```typescript
const validStatusTransitions: Record<Status, Status[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
```

### テストパターン

| ID | 名称 | 概要 | 信頼度 |
|----|------|------|--------|
| BP-TEST-001 | Test Counter Reset | beforeEachでIDカウンターをリセット | 95% |
| BP-TEST-002 | Verify API Before Test | テスト前にAPIシグネチャを確認 | 80% |
| BP-TEST-003 | Vitest ESM Configuration | Vitest + TypeScript ESM構成 | 85% |
| BP-TEST-004 | Result Type Test Pattern | isOk()/isErr()で両方のケースをテスト | 95% |
| BP-TEST-005 | Status Transition Testing | 有効・無効な遷移を網羅的にテスト | 90% |

**Result Type Test例**:
```typescript
describe('createPrice', () => {
  it('should create valid price', () => {
    const result = createPrice(1000);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.amount).toBe(1000);
    }
  });

  it('should reject price below minimum', () => {
    const result = createPrice(50);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('100');
    }
  });
});
```

### CLIでベストプラクティスを表示

```bash
# 全ベストプラクティス表示
npx musubix learn best-practices

# カテゴリ別フィルタ
npx musubix learn best-practices --category code
npx musubix learn best-practices --category design
npx musubix learn best-practices --category test

# 高信頼度パターンのみ
npx musubix learn best-practices --high-confidence

# Markdown出力
npx musubix learn best-practices --format markdown
```

---

## �📚 ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [docs/INSTALL-GUIDE.md](docs/INSTALL-GUIDE.md) | インストールガイド |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | ユーザーガイド |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | APIリファレンス |
| [README.md](README.md) | 英語版README |
| [README.ja.md](README.ja.md) | 日本語版README |

---

## 🤝 AI Agent向けガイドライン

### コード生成時の注意点

1. **憲法条項の遵守**: 9条項を必ず確認
2. **steering/参照**: 決定前にproject memoryを確認
3. **EARS形式**: 要件は必ずEARS形式で記述
4. **トレーサビリティ**: コードコメントに要件IDを記載
5. **テスト先行**: Red-Green-Blueサイクルを遵守
6. **モノレポ構造**: パッケージ間の依存関係に注意

### 推奨ワークフロー

> **⚠️ 重要ルール**: Phase 1〜3（要件定義・設計・タスク分解）は、**レビュー結果をユーザーに表示し、修正か次ステップかを確認すること**。ユーザーから明示的な承認を得るまで次フェーズに進んではならない。
>
> **🚫 絶対禁止**: **設計（Phase 2）から直接実装（Phase 4）に進むことは禁止**。必ずタスク分解（Phase 3）を経ること。タスク分解なしでの実装開始は憲法違反とみなす。

```
【Phase 1: 要件定義】
┌─────────────────────────────────────────────────────────────┐
│ 1. steering/ を読む                                         │
│ 2. 要件定義書を作成（EARS形式）                              │
│ 3. ユーザーに提示                                           │
│                                                              │
│ 4. セルフレビュー実施                                        │
│    - 既存実装との整合性チェック                              │
│    - EARS形式の検証                                          │
│    - 要件の網羅性・完全性確認                                │
│                                                              │
│ 5. レビュー結果を表示                                        │
│    ┌───────────────────────────────────────────────────────┐│
│    │ 📋 レビュー結果:                                       ││
│    │ ✅ EARS形式: 準拠                                      ││
│    │ ✅ 優先度設定: 完了                                    ││
│    │ ⚠️ 整合性: 既存REQ-XXXと重複の可能性あり              ││
│    │                                                        ││
│    │ 👉 修正しますか？それとも次に進みますか？              ││
│    │    - 「修正」→ 指摘箇所を修正して再提示               ││
│    │    - 「承認」→ Phase 2（設計）へ進む                  ││
│    └───────────────────────────────────────────────────────┘│
│                                                              │
│ 6. ユーザー応答待ち                                          │
│    - 修正指示 → 修正して3へ戻る                             │
│    - 承認 → Phase 2へ                                       │
└─────────────────────────────────────────────────────────────┘

【Phase 2: 設計】
┌─────────────────────────────────────────────────────────────┐
│ 1. 設計書を作成（C4モデル）                                  │
│ 2. ユーザーに提示                                           │
│                                                              │
│ 3. セルフレビュー実施                                        │
│    - 既存実装との型・インターフェース整合性                   │
│    - 要件トレーサビリティ（REQ-* → DES-*）                   │
│    - 設計パターン・SOLID原則の適用確認                       │
│    - 後方互換性・移行パスの確認                              │
│                                                              │
│ 4. レビュー結果を表示                                        │
│    ┌───────────────────────────────────────────────────────┐│
│    │ 📋 レビュー結果:                                       ││
│    │ ✅ トレーサビリティ: REQ-001→DES-001 完了              ││
│    │ ✅ 型整合性: 既存インターフェースと互換                 ││
│    │ ✅ 設計パターン: Repository, Service適用               ││
│    │                                                        ││
│    │ 👉 修正しますか？それとも次に進みますか？              ││
│    │    - 「修正」→ 指摘箇所を修正して再提示               ││
│    │    - 「承認」→ Phase 3（タスク分解）へ進む            ││
│    │    ⚠️ 実装への直接遷移は禁止！必ずタスク分解を経る    ││
│    └───────────────────────────────────────────────────────┘│
│                                                              │
│ 5. ユーザー応答待ち                                          │
│    - 修正指示 → 修正して2へ戻る                             │
│    - 承認 → Phase 3へ（※Phase 4への直接遷移は禁止）        │
└─────────────────────────────────────────────────────────────┘

【Phase 3: タスク分解】⚠️ 必須フェーズ - スキップ禁止
┌─────────────────────────────────────────────────────────────┐
│ 1. タスク分解書を作成（設計→実装タスク）                     │
│ 2. ユーザーに提示                                           │
│                                                              │
│ 3. セルフレビュー実施                                        │
│    - 設計との対応確認（DES-* → TSK-*）                       │
│    - タスクサイズの適切性                                    │
│    - 依存関係・実行順序の妥当性                              │
│    - 工数見積もりの現実性                                    │
│                                                              │
│ 4. レビュー結果を表示                                        │
│    ┌───────────────────────────────────────────────────────┐│
│    │ 📋 レビュー結果:                                       ││
│    │ ✅ トレーサビリティ: DES-001→TSK-001〜003 完了         ││
│    │ ✅ タスクサイズ: 各2-4時間で適切                       ││
│    │ ✅ 依存関係: TSK-001→TSK-002→TSK-003 明確             ││
│    │                                                        ││
│    │ 👉 修正しますか？それとも実装に進みますか？            ││
│    │    - 「修正」→ 指摘箇所を修正して再提示               ││
│    │    - 「承認」→ Phase 4（実装）へ進む                  ││
│    └───────────────────────────────────────────────────────┘│
│                                                              │
│ 5. ユーザー応答待ち                                          │
│    - 修正指示 → 修正して2へ戻る                             │
│    - 承認 → Phase 4へ                                       │
└─────────────────────────────────────────────────────────────┘

【Phase 4: 実装】⚠️ 前提条件: Phase 3（タスク分解）の承認が必須
┌─────────────────────────────────────────────────────────────┐
│ ⛔ 開始前チェック:                                           │
│    □ Phase 3（タスク分解）が完了し、ユーザー承認済みか？     │
│    □ TSK-* が定義されているか？                              │
│    → 未完了の場合、Phase 3に戻ること                        │
│                                                              │
│ タスクごとに:                                                │
│ 1. テスト作成（Red）                                        │
│ 2. 実装（Green）                                            │
│ 3. リファクタリング（Blue）                                  │
│ 4. ユニットテスト実行・合格確認                              │
│ 5. 必要に応じて統合テスト                                    │
└─────────────────────────────────────────────────────────────┘

【Phase 5: 完了】
┌─────────────────────────────────────────────────────────────┐
│ 1. CHANGELOG.md を更新                                      │
│ 2. 必要に応じてその他ドキュメント更新                        │
│ 3. Git コミット・プッシュ                                    │
└─────────────────────────────────────────────────────────────┘
```

### レビュー結果の表示フォーマット

各フェーズ終了時に以下の形式でレビュー結果を表示:

```
📋 **レビュー結果**

| 観点 | 状態 | 詳細 |
|------|------|------|
| チェック項目1 | ✅ OK | 説明 |
| チェック項目2 | ⚠️ 警告 | 要確認事項 |
| チェック項目3 | ❌ NG | 修正が必要 |

👉 **次のアクションを選択してください:**
- 「修正」/ 具体的な修正指示 → 修正して再提示
- 「承認」/「OK」/「進める」 → 次フェーズへ
```

### 承認キーワード

ユーザーが以下のキーワードを使用した場合、次フェーズへ進む:
- `承認` / `approve` / `LGTM` / `進める` / `OK` / `実装`

> **⚠️ 注意**: 「実装」キーワードが使われても、**現在のフェーズがPhase 2（設計）の場合は、必ずPhase 3（タスク分解）を先に実行すること**。タスク分解をスキップして実装に進むことは禁止されている。

---

**Agent**: GitHub Copilot / Claude
**Last Updated**: 2026-01-11
**Version**: 3.0.0
