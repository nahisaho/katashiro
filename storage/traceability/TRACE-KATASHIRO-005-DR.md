# トレーサビリティマトリクス: REQ-KATASHIRO-005-DR

| 項目 | 内容 |
|------|------|
| プロジェクト | KATASHIRO DeepResearch Enhancement |
| 要件書 | REQ-KATASHIRO-005-DR v1.0.0 |
| 設計書 | DES-KATASHIRO-005-DR v1.0.0 |
| タスク分解 | TASK-KATASHIRO-005-DR v1.0.0 |
| 作成日 | 2026-01-16 |
| 検証方式 | MUSUBIX Article V準拠 |

---

## 1. 要件 → 設計 トレーサビリティ

### 1.1 Ubiquitous Requirements（普遍的要件）

| 要件ID | 要件名 | 設計書 | 設計セクション | カバレッジ |
|--------|--------|--------|----------------|------------|
| REQ-DR-U-001 | リトライ機構 | DES-005-DR-RETRY | 全体 | ✅ 100% |
| REQ-DR-U-002 | エラーログ詳細化 | DES-005-DR-LOG | 3.1-3.4 | ✅ 100% |
| REQ-DR-U-003 | User-Agent設定 | DES-005-DR | 3.4 UserAgentManager | ✅ 100% |
| REQ-DR-U-004 | タイムアウト設定 | DES-005-DR | 3.4 TimeoutConfig | ✅ 100% |
| REQ-DR-U-005 | 構造化ログ | DES-005-DR-LOG | 4.1-4.3 | ✅ 100% |

### 1.2 Event-driven Requirements（イベント駆動要件）

| 要件ID | 要件名 | 設計書 | 設計セクション | カバレッジ |
|--------|--------|--------|----------------|------------|
| REQ-DR-E-001 | スクレイピング失敗時のフォールバック | DES-005-DR-FB | 3.1-4.4 | ✅ 100% |
| REQ-DR-E-002 | レート制限検出時の待機 | DES-005-DR-FB | 3.5 RateLimitHandler | ✅ 100% |
| REQ-DR-E-003 | プログレス更新 | DES-005-DR | 3.6 ProgressReporter | ✅ 100% |
| REQ-DR-E-004 | データ検証失敗時の警告 | DES-005-DR | 3.7 QualityValidator | ✅ 100% |
| REQ-DR-E-005 | キャッシュヒット時の高速応答 | DES-005-DR-CACHE | 3.1-4.2 | ✅ 100% |

### 1.3 State-driven Requirements（状態駆動要件）

| 要件ID | 要件名 | 設計書 | 設計セクション | カバレッジ |
|--------|--------|--------|----------------|------------|
| REQ-DR-S-001 | 中断時のチェックポイント保存 | DES-005-DR-CKP | 3.1-5.2 | ✅ 100% |
| REQ-DR-S-002 | 並列処理の動的制御 | DES-005-DR-PAR | 3.1-4.4 | ✅ 100% |
| REQ-DR-S-003 | キャッシュサイズ管理 | DES-005-DR-CACHE | 3.2 LRUCache | ✅ 100% |
| REQ-DR-S-004 | タスクキューの優先度制御 | DES-005-DR | 3.8 TaskQueue | ✅ 100% |

### 1.4 Optional Requirements（オプション要件）

| 要件ID | 要件名 | 設計書 | 設計セクション | カバレッジ |
|--------|--------|--------|----------------|------------|
| REQ-DR-O-001 | プラグインシステム | - | Phase 3対応 | ⏳ 未設計 |
| REQ-DR-O-002 | リアルタイム通知 | - | Phase 3対応 | ⏳ 未設計 |
| REQ-DR-O-003 | MLベースランキング | - | Phase 3対応 | ⏳ 未設計 |
| REQ-DR-O-004 | 分散処理対応 | - | Phase 3対応 | ⏳ 未設計 |

### 1.5 Unwanted Behavior（回避すべき振る舞い）

| 要件ID | 要件名 | 設計書 | 設計セクション | カバレッジ |
|--------|--------|--------|----------------|------------|
| REQ-DR-W-001 | 無限リトライの禁止 | DES-005-DR-RETRY | 3.2 maxRetries=3 | ✅ 100% |
| REQ-DR-W-002 | 大規模コンテンツの無制限読み込み禁止 | DES-005-DR-PAR | 4.2 ContentStreamHandler | ✅ 100% |
| REQ-DR-W-003 | robots.txt違反の禁止 | DES-005-DR | 3.5 RobotsParser | ✅ 100% |
| REQ-DR-W-004 | 過度な並列アクセスの禁止 | DES-005-DR-PAR | 3.3 DomainRateLimiter | ✅ 100% |
| REQ-DR-W-005 | 機密情報のログ出力禁止 | DES-005-DR-LOG | 3.3 SensitiveDataMasker | ✅ 100% |

---

## 2. 設計 → タスク トレーサビリティ

### 2.1 Phase 1タスク（基盤強化）

| 設計書 | 対象コンポーネント | タスクID範囲 | タスク数 |
|--------|-------------------|-------------|----------|
| DES-005-DR-RETRY | RetryHandler | TASK-001〜006 | 6 |
| DES-005-DR-LOG | StructuredLogger, SensitiveDataMasker | TASK-007〜015 | 9 |
| DES-005-DR-FB | FallbackHandler, WaybackMachineClient | TASK-016〜023 | 8 |
| DES-005-DR (UA/Timeout) | UserAgentManager, TimeoutConfig | TASK-024〜028 | 5 |
| DES-005-DR (robots.txt) | RobotsParser | TASK-029〜033 | 5 |

**Phase 1合計**: 33タスク

### 2.2 Phase 2タスク（パフォーマンス最適化）

| 設計書 | 対象コンポーネント | タスクID範囲 | タスク数 |
|--------|-------------------|-------------|----------|
| DES-005-DR-CACHE | CacheManager, LRUCache | TASK-034〜042 | 9 |
| DES-005-DR-PAR | ParallelExecutor, DomainRateLimiter | TASK-043〜051 | 9 |
| DES-005-DR-CKP | CheckpointManager, RecoveryHandler | TASK-052〜059 | 8 |
| DES-005-DR (統合) | DeepResearchOrchestrator, 統合テスト | TASK-060〜066 | 7 |

**Phase 2合計**: 33タスク

---

## 3. 要件 → タスク ダイレクトマッピング

| 要件ID | 関連タスクID | タスク概要 |
|--------|-------------|-----------|
| REQ-DR-U-001 | TASK-001〜006 | RetryHandler実装・テスト |
| REQ-DR-U-002 | TASK-007, 010, 014 | LogEntry, LogFormatter, StructuredLogger |
| REQ-DR-U-003 | TASK-024〜028 | UserAgentManager実装・テスト |
| REQ-DR-U-004 | TASK-026〜028 | TimeoutConfig実装・テスト |
| REQ-DR-U-005 | TASK-008, 011〜015 | LogConfig, Destination, StructuredLogger |
| REQ-DR-E-001 | TASK-016〜023 | FallbackHandler, WaybackMachine, Readability |
| REQ-DR-E-002 | TASK-020〜023 | RateLimitHandler, AlternativeSearch |
| REQ-DR-E-003 | TASK-060 | ProgressReporter実装 |
| REQ-DR-E-004 | TASK-061 | QualityValidator実装 |
| REQ-DR-E-005 | TASK-034〜042 | CacheManager, LRUCache実装 |
| REQ-DR-S-001 | TASK-052〜059 | CheckpointManager, RecoveryHandler |
| REQ-DR-S-002 | TASK-043〜051 | ParallelExecutor, Semaphore |
| REQ-DR-S-003 | TASK-035〜042 | LRUCache, TTLManager |
| REQ-DR-S-004 | TASK-062 | TaskQueue実装 |
| REQ-DR-W-001 | TASK-001, 005 | RetryPolicy.maxRetries=3 |
| REQ-DR-W-002 | TASK-050 | ContentStreamHandler実装 |
| REQ-DR-W-003 | TASK-029〜033 | RobotsParser実装・テスト |
| REQ-DR-W-004 | TASK-044〜045 | DomainRateLimiter実装 |
| REQ-DR-W-005 | TASK-009, 015 | SensitiveDataMasker実装・テスト |

---

## 4. テストケース → 要件 トレーサビリティ

| テストシナリオID | テストケース | 対応要件 |
|-----------------|-------------|----------|
| TS-001 | 3回リトライ後の失敗確認 | REQ-DR-U-001, W-001 |
| TS-002 | 構造化JSONログ出力検証 | REQ-DR-U-002, U-005 |
| TS-003 | User-Agentヘッダー設定確認 | REQ-DR-U-003 |
| TS-004 | タイムアウト動作検証 | REQ-DR-U-004 |
| TS-005 | Wayback Machineフォールバック | REQ-DR-E-001 |
| TS-006 | 429エラー時Retry-After待機 | REQ-DR-E-002 |
| TS-007 | プログレス1秒更新確認 | REQ-DR-E-003 |
| TS-008 | 品質スコア低下警告 | REQ-DR-E-004 |
| TS-009 | キャッシュヒット時即応答 | REQ-DR-E-005 |
| TS-010 | チェックポイントから再開 | REQ-DR-S-001 |
| TS-011 | 並列度動的調整 | REQ-DR-S-002 |
| TS-012 | LRUキャッシュ削除動作 | REQ-DR-S-003 |
| TS-013 | 優先度ベースタスク処理 | REQ-DR-S-004 |
| TS-014 | 10MB超コンテンツのストリーム処理 | REQ-DR-W-002 |
| TS-015 | robots.txt禁止URL回避 | REQ-DR-W-003 |
| TS-016 | ドメイン別5並列制限 | REQ-DR-W-004 |
| TS-017 | APIキーマスキング確認 | REQ-DR-W-005 |

---

## 5. カバレッジサマリー

### 5.1 要件カバレッジ

| カテゴリ | 総数 | 設計済み | カバレッジ |
|----------|------|----------|------------|
| Ubiquitous (U) | 5 | 5 | ✅ 100% |
| Event-driven (E) | 5 | 5 | ✅ 100% |
| State-driven (S) | 4 | 4 | ✅ 100% |
| Optional (O) | 4 | 0 | ⏳ 0% (Phase 3) |
| Unwanted (W) | 5 | 5 | ✅ 100% |
| **合計** | **23** | **19** | **83%** |

### 5.2 Phase別カバレッジ

| Phase | 対象要件数 | タスク数 | ステータス |
|-------|-----------|----------|-----------|
| Phase 1 | 10 | 33 | ✅ タスク分解完了 |
| Phase 2 | 9 | 33 | ✅ タスク分解完了 |
| Phase 3 | 4 | - | ⏳ 未分解（オプション） |

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|------------|------|----------|--------|
| 1.0.0 | 2026-01-16 | 初版作成 | KATASHIRO Team |
