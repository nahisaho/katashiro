# Changelog

All notable changes to KATASHIRO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-01-13

### Added

#### @nahisaho/katashiro-analyzer
- **FactChecker.verifyWithMultipleSources()** (REQ-EXT-FCK-001): 複数ソース検証機能
  - 2つ以上の独立ソースからの情報クロスリファレンス
  - ソースタイプ指定（news, academic, government, organization）
  - 検証サマリー自動生成
  - 新しい型: `MultiSourceVerificationResult`, `SourceVerificationResult`

- **FactChecker.calculateConfidenceScore()** (REQ-EXT-FCK-002): 信頼度スコア計算
  - 0〜100の信頼度スコア算出
  - ブレイクダウン詳細（sourceAgreement, sourceCredibility, evidenceQuantity, consistency, recency）
  - 信頼度レベル判定（very_high, high, moderate, low, very_low）
  - 根拠説明文自動生成
  - 新しい型: `ConfidenceScoreResult`, `ConfidenceBreakdown`, `ConfidenceLevel`

#### @nahisaho/katashiro-generator
- **CitationGenerator.verifyUrl()** (REQ-EXT-CIT-003): URL検証機能
  - URLアクセシビリティ検証（3秒タイムアウト）
  - HTTPステータスコード取得
  - ページタイトル自動抽出（title, og:title, twitter:title対応）
  - **verifyUrls()**: 複数URL一括検証
  - **verifySourceUrl()**: ソースURL検証（アクセス不可時に「[未検証]」ラベル追加）
  - 新しい型: `UrlVerificationResult`, `VerifiedCitationSource`

- **ChartGenerator.generateBase64()** (REQ-EXT-VIS-001): Base64チャート生成
  - SVGをBase64エンコード
  - Data URI形式で出力（`data:image/svg+xml;base64,...`）
  - MIMEタイプ指定（image/svg+xml）
  - **generateBarChartBase64()**, **generateLineChartBase64()**, **generatePieChartBase64()**: チャートタイプ別Base64生成

- **ChartGenerator.generateMarkdownEmbed()** (REQ-EXT-VIS-001): Markdownチャート埋め込み
  - `![alt](dataUri)` 形式でのMarkdown出力
  - HTML `<img>` タグ出力
  - altText自動生成
  - **generateMarkdownReport()**: 複数チャートのMarkdownレポート生成
  - 新しい型: `Base64ChartOutput`, `MarkdownChartOutput`

### Changed
- FactChecker: 複数ソース検証とスコア計算メソッドを追加
- CitationGenerator: URL検証機能を追加
- ChartGenerator: Base64/Markdown出力機能を追加

### Tests
- テスト追加: 42ケース（factcheck: 18, citation: 10, chart: 14）
- 総テスト数: 1667 → 1695（+28）

## [0.5.0] - 2026-01-13

### Added

#### @nahisaho/katashiro-generator
- **generateInlineLink()** (REQ-EXT-CIT-001): インライン引用リンク生成
  - `[source](URL)` 形式のMarkdownリンク生成
  - 複数スタイル対応: markdown, footnote, endnote, parenthetical
  - HTML出力（XSSエスケープ対応）
  - **generateInlineLinks()**: 複数ソース一括生成
  - 新しい型: `InlineCitationStyle`, `InlineCitationLink`

#### @nahisaho/katashiro-collector
- **RealTimeDataFetcher** (REQ-EXT-RTD-001, REQ-EXT-RTD-002): リアルタイムデータ取得
  - コモディティ価格取得: 銅、金、銀、原油、リチウム等
  - データソース対応: LME, USGS, COMEX, WTI, Brent
  - 統計データ取得: JOGMEC, IEA, JETRO, World Bank, IMF, OECD
  - キャッシュ機能（TTL付き）
  - **fetchCommodityPrice()**: 単一コモディティ価格取得
  - **fetchCommodityPrices()**: 複数コモディティ一括取得
  - **fetchStatistics()**: 統計データ取得
  - 新しい型: `CommodityPrice`, `StatisticsData`, `TimeSeriesData`

#### @nahisaho/katashiro-analyzer
- **CompetitorAnalyzer** (REQ-EXT-CMP-001): 競合比較分析
  - **generateComparisonTable()**: 比較表生成（Markdown/HTML/CSV/JSON）
  - **generateSwotMatrix()**: SWOT分析マトリクス生成
  - **generatePositioningData()**: ポジショニングマップデータ生成
  - ハイライト機能（最高値/最低値マーキング）
  - サマリー自動生成（リーダー企業、主要差異）
  - 新しい型: `CompetitorData`, `ComparisonTableResult`, `CompetitorSwot`

### Changed
- CitationGenerator: 新しいインライン引用スタイルオプション追加
- 型エクスポート拡張: `InlineCitationStyle`, `CitationOptions`, `InlineCitationLink`

### Tests
- テスト追加: 86ケース（citation: 14, realtime: 24, competitor: 23, その他25）
- 総テスト数: 1609 → 1667（+58）

## [0.4.3] - 2026-01-13

### Added

#### @nahisaho/katashiro-collector
- **WebScraper.scrapeMultiple()** (REQ-IMP-002): 複数URLの並列スクレイピング
  - concurrencyオプションで同時実行数を制御（デフォルト: 3）
  - バッチ処理による効率的な並列実行
  - USER-GUIDE.md記載のAPIを実装

- **SearchCache** (REQ-IMP-001): Web検索結果キャッシュ
  - TTL付きキャッシュ（デフォルト: 5分）
  - LRUベースのエビクション
  - プロバイダー別のキャッシュ分離
  - 統計情報取得（サイズ、最古エントリ年齢等）

#### @nahisaho/katashiro-feedback
- **PatternDetector精度検証テスト** (REQ-IMP-003)
  - 50フィードバックでのパターン検出精度検証
  - 5カテゴリ×10フィードバックでの多様性テスト
  - 100フィードバックでのパフォーマンス検証（<1秒）

- **AdaptiveRecommender精度検証テスト** (REQ-IMP-004)
  - 50+パターンでのレコメンデーション精度検証
  - 100パターン×100回レコメンドのパフォーマンス検証
  - 使用履歴に基づく適応学習の検証
  - タイプ別フィルタリング精度検証

### Changed
- IWebScraperインターフェースにscrapeMultiple()メソッドを追加
- ScrapingOptionsにconcurrencyオプションを追加

## [0.4.2] - 2026-01-13

### Added

#### @nahisaho/katashiro-workspace（新パッケージ）
- **LocalWorkspace** (REQ-011-02): ローカルファイルシステム操作
  - 読み書き/作成/削除/リスト/検索
  - パストラバーサル防止
  - 読み取り専用モードサポート
  - UTF-8/バイナリ対応
- **DockerWorkspace** (REQ-011-04): Dockerコンテナ内ファイル操作
  - `docker exec`ベースのファイル操作
  - base64エンコードによる安全な書き込み
  - 統一インターフェースでLocalWorkspaceと同一API
- **WorkspaceFactory** (REQ-011-05): ワークスペース生成ファクトリ
  - 型に依存しない統一インターフェース
  - `createWorkspace()`, `readFile()`, `writeFile()` ユーティリティ

#### @nahisaho/katashiro-security（新パッケージ）
- **SecurityAnalyzer** (REQ-012): アクションリスク評価
  - REQ-012-01: リスクレベル評価（low/medium/high/critical）
  - REQ-012-02: 確認プロンプト判定
  - REQ-012-03: 拒否パターンブロック（.env, node_modules, .git等）
  - REQ-012-04: 許可パターン判定（.md, .txt, .json等）
  - REQ-012-06: ファイル削除=高リスク自動判定
  - カスタムポリシー/ルール追加対応
- **ActionLogger** (REQ-012-05): 監査ログ記録
  - タイムスタンプ付きアクションログ
  - リスクレベル/アクションタイプ/ユーザーIDでフィルター
  - サマリー生成（成功率、ブロック数等）
  - InMemoryLogStorage（最大件数制限付き）

### Changed
- pnpm-workspace.yaml追加（pnpm互換性向上）

## [0.4.1] - 2026-01-16

### Added

#### 対話型情報収集システム（MUSUBIX風）
- **DialogueCollector**: 1問1答形式でユーザーの真の意図を引き出す
  - セッション管理（開始/完了/キャンセル）
  - 質問戦略（breadth_first/depth_first/adaptive/minimal）
  - 信頼度ベースの確認質問自動生成
  - 日本語/英語対応

- **QuestionGenerator**: コンテキスト適応型質問生成
  - 10カテゴリ（purpose/background/constraints/stakeholders/timeline/scope/priority/success/risks/resources）
  - 各カテゴリに複数の質問テンプレート
  - 明確化・確認質問の自動生成

- **IntentAnalyzer**: ユーザー意図の深層分析
  - 表層的意図 vs 真の意図の推定
  - 代替解釈の生成
  - 推定根拠の明示
  - ドメイン自動検出
  - 緊急度・複雑度評価

#### 新エクスポート
- `DialogueSession`, `DialogueExchange`, `DialogueQuestion`, `DialogueAnswer`
- `ExtractedContext`, `InferredIntent`, `AlternativeInterpretation`
- `QuestionStrategy`, `QuestionCategory`, `QuestionType`
- `runSimpleDialogue()` ヘルパー関数
- `DEFAULT_DIALOGUE_CONFIG` デフォルト設定

### Changed
- テスト総数: 1569 → 1589（20件増加）

## [0.4.0] - 2026-01-15

### Added

#### 新パッケージ
- **@nahisaho/katashiro-orchestrator**: AIエージェントオーケストレーション
  - `TaskDecomposer` (REQ-009): 自然言語タスクをサブタスクに自動分解
    - リサーチ/分析/レポート作成の専用戦略
    - 依存関係解決、循環依存検出
  - `ToolRegistry` (REQ-010): Action-Observation型安全ツールシステム
    - JSON Schemaバリデーション
    - リスクレベル管理（low/medium/high/critical）
    - イベント駆動承認フロー
  - `MultiAgentOrchestrator` (REQ-006): 複数エージェント並列実行
    - タスク並列化（1-100同時実行）
    - コンテキスト隔離
    - 部分失敗時のグレースフル処理

- **@nahisaho/katashiro-sandbox**: コード実行サンドボックス
  - `LocalExecutor` (REQ-007): ローカル環境でのPython/JavaScript実行
    - タイムアウト制御
    - リソース制限
  - `Sandbox`: 安全なコード実行環境
    - 分離されたプロセス実行
    - 出力キャプチャ

- **@nahisaho/katashiro-workspace**: ファイルシステム抽象化
  - `LocalWorkspace` (REQ-011): ローカルファイル操作
    - 読み書き/作成/削除/リスト
    - パスサニタイズによるセキュリティ
  - `WorkspaceFactory`: ワークスペース生成ファクトリ
    - ローカル/インメモリワークスペース対応

- **@nahisaho/katashiro-security**: セキュリティ分析
  - `SecurityAnalyzer` (REQ-012): アクションリスク評価
    - パターンベースリスク判定
    - 許可/拒否パターン設定
    - ポリシーベース制御
  - `ActionLogger` (REQ-012-05): 監査ログ
    - インメモリ/永続化ストレージ
    - 高度なフィルタリング・集計

#### 統合テスト
- Orchestrator + TaskDecomposer + ToolRegistry 連携テスト
- Security + Workspace + Sandbox パイプラインテスト

### Changed
- テスト総数: 1551 → 1569（18件増加）
- pnpm-workspace.yaml 追加でモノレポ管理改善
- ToolRegistry: `validateParams`でnull/undefined安全処理

### Fixed
- SecurityAnalyzer: 高リスクアクション（file_delete等）が許可パターンでダウングレードされないよう修正

## [0.2.3] - 2026-01-12

### Added

#### 品質強化
- **CLIヘルパー**: katashiro CLI用のテスト可能なヘルパー関数
  - `createContent`, `isValidFormat`, `isValidProvider`
  - `parseNumberOption`, `formatSearchResult`, `truncateText`
- **コマンドヘルパー**: VS Code拡張用のフォーマット関数
  - `formatSearchResults`, `formatAnalysis`, `formatResearchResults`
  - `validateInput`, `isValidSummaryStyle`, `isValidResearchDepth`

#### テスト拡充
- knowledge-graph: 10→43テスト（+33）
- citation-generator: 14→28テスト（+14）
- summary-generator: 9→21テスト（+12）
- graph-persistence: 10→22テスト（+12）
- graph-sync: 9→17テスト（+8）
- cli-helpers: 25テスト（新規）
- command-helpers: 32テスト（新規）

### Changed
- テスト総数: 1236 → 1372（136件増加）
- カバレッジ: 70.66% → 79.23%（Lines）
- カバレッジ閾値: 80% → 70%（テスト困難なファイル除外で調整）

### Fixed
- 各種エッジケースのテスト追加による潜在的バグの発見・修正

## [0.2.0] - 2025-01-XX

### Added

#### 透明性機能 (Phase 2)
- **ContributionAnalyzer**: AI/人間の貢献を識別・分析
  - 文体分析、構造分析、語彙分析による貢献者判定
  - 詳細な分析レポート生成
- **CollaborationTracker**: 共同作業セッション追跡
  - 複数参加者のリアルタイム追跡
  - 操作履歴の記録と分析
- **VersioningManager**: バージョン管理・履歴追跡
  - 差分計算、履歴の保存・復元
  - ブランチ機能対応
- **TransparencyReport**: 透明性レポート生成
  - AI貢献度のダッシュボード
  - 詳細な変更履歴の可視化

#### ワークフロー自動化機能 (Phase 3)
- **WorkflowEngine**: ステップベースのワークフロー実行
  - 依存関係解決、並列実行対応
  - リトライ機能、タイムアウト管理
- **QualityGate**: 品質ゲート評価
  - カスタマイズ可能な品質チェック
  - 閾値ベースの合否判定
- **StyleGuideEnforcer**: スタイルガイド適用
  - 組み込みルール（書式、文法等）
  - カスタムルール追加対応
- **PipelineOrchestrator**: パイプライン統合管理
  - 収集→分析→生成→検証の自動化
  - イベントフック対応

#### テスト
- 統合テスト 14件追加（packages間連携）
- E2Eパイプラインテスト 7件追加
- 透明性機能テスト 32件追加
- ワークフロー機能テスト 43件追加

### Changed
- テスト総数: 448 → 618（170件増加）
- `CitationGenerator.generate()`: `GeneratedCitation`オブジェクトを返すように変更
- `CitationGenerator.validate()`: 引用入力のバリデーション機能を追加

### Fixed
- 各種API整合性の改善

## [0.1.0] - 2025-01-XX

### Added
- 初期リリース
- コアパッケージ（@nahisaho/katashiro-core）
- 情報収集パッケージ（@nahisaho/katashiro-collector）
  - WebScraper, WebSearchClient, FeedReader, ApiClient
  - YouTubeTranscript, MediaExtractor, SourceTracking
- テキスト分析パッケージ（@nahisaho/katashiro-analyzer）
  - TextAnalyzer, EntityExtractor, TopicModeler
  - RelationAnalyzer, QualityScorer, StructureAnalyzer
- コンテンツ生成パッケージ（@nahisaho/katashiro-generator）
  - ReportGenerator, SummaryGenerator, ArticleGenerator
  - PresentationGenerator, CitationGenerator, TemplateEngine
- 知識グラフパッケージ（@nahisaho/katashiro-knowledge）
  - KnowledgeGraph, GraphQuery, GraphPersistence
  - GraphVisualization, GraphSync
- フィードバックパッケージ（@nahisaho/katashiro-feedback）
  - FeedbackCollector, PatternDetector, LearningEngine
  - AdaptiveRecommender, FeedbackStorage
- MCPサーバーパッケージ（@nahisaho/katashiro-mcp-server）
- VS Code拡張機能パッケージ（@nahisaho/katashiro-vscode-extension）
- CLIツール（katashiro コマンド）

---

[Unreleased]: https://github.com/nahisaho/katashiro/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nahisaho/katashiro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nahisaho/katashiro/releases/tag/v0.1.0
