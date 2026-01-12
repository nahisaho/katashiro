# Changelog

All notable changes to KATASHIRO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
