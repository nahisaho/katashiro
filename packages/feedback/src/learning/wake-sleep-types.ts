/**
 * Wake-Sleep Learning System Types
 * 
 * @fileoverview DreamCoder風のWake-Sleep学習サイクル型定義
 * @module @nahisaho/katashiro-feedback
 * @since 0.2.12
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

/**
 * Wake-Sleep設定
 */
export interface WakeSleepConfig {
  /** パターン保持の最小品質スコア (0-1) */
  readonly minQualityThreshold: number;
  /** ライブラリの最大パターン数 */
  readonly maxLibrarySize: number;
  /** Sleepサイクルあたりの圧縮イテレーション回数 */
  readonly compressionIterations: number;
  /** 自動Sleepサイクルを有効化 */
  readonly autoSleep: boolean;
  /** 自動Sleepをトリガーする観察数 */
  readonly wakeThreshold: number;
  /** パターンの有効期限（日数）、0で無期限 */
  readonly patternTTLDays: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_WAKE_SLEEP_CONFIG: WakeSleepConfig = {
  minQualityThreshold: 0.3,
  maxLibrarySize: 500,
  compressionIterations: 3,
  autoSleep: true,
  wakeThreshold: 50,
  patternTTLDays: 90,
};

/**
 * 観察データの種類
 */
export type ObservationType = 
  | 'search_query'      // 検索クエリ
  | 'analysis_result'   // 分析結果
  | 'report_generation' // レポート生成
  | 'user_feedback'     // ユーザーフィードバック
  | 'entity_extraction' // エンティティ抽出
  | 'summary_creation'  // 要約作成
  | 'citation_format';  // 引用フォーマット

/**
 * Wake Phase 観察データ
 */
export interface WakeObservation {
  /** 観察ID */
  readonly id: ID;
  /** 観察タイプ */
  readonly type: ObservationType;
  /** 入力データ */
  readonly input: string;
  /** 出力データ */
  readonly output: string;
  /** コンテキスト情報 */
  readonly context: ObservationContext;
  /** 観察タイムスタンプ */
  readonly timestamp: Timestamp;
  /** ユーザー評価（オプション） */
  readonly rating?: number;
  /** 成功/失敗 */
  readonly success: boolean;
}

/**
 * 観察コンテキスト
 */
export interface ObservationContext {
  /** 言語 */
  readonly language?: string;
  /** ドメイン（ビジネス、学術、技術等） */
  readonly domain?: string;
  /** ソースタイプ */
  readonly sourceType?: string;
  /** 追加メタデータ */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 学習パターン
 */
export interface LearnedPattern {
  /** パターンID */
  readonly id: ID;
  /** パターン名 */
  readonly name: string;
  /** パターンタイプ */
  readonly type: ObservationType;
  /** 入力テンプレート（プレースホルダー付き） */
  readonly inputTemplate: string;
  /** 出力テンプレート */
  readonly outputTemplate: string;
  /** 品質スコア (0-1) */
  quality: number;
  /** 使用頻度 */
  frequency: number;
  /** ホール（プレースホルダー）の数 */
  readonly holes: number;
  /** 作成日時 */
  readonly createdAt: Timestamp;
  /** 更新日時 */
  updatedAt: Timestamp;
  /** 最終使用日時 */
  lastUsedAt: Timestamp;
  /** パターンから生成されたコンテキスト */
  readonly contexts: string[];
}

/**
 * パターン品質評価
 */
export interface PatternQuality {
  /** 総合スコア (0-1) */
  readonly score: number;
  /** 頻度スコア */
  readonly frequencyScore: number;
  /** 汎用性スコア */
  readonly generalityScore: number;
  /** 有用性スコア（成功率ベース） */
  readonly utilityScore: number;
  /** 鮮度スコア（最近使われたか） */
  readonly freshnessScore: number;
  /** 評価理由 */
  readonly reasons: string[];
}

/**
 * Sleep Phase 結果
 */
export interface SleepResult {
  /** 統合されたパターン数 */
  readonly patternsConsolidated: number;
  /** 削除されたパターン数 */
  readonly patternsRemoved: number;
  /** 圧縮率 */
  readonly compressionRatio: number;
  /** MDL改善率 */
  readonly mdlImprovement: number;
  /** サイクル実行時間（ミリ秒） */
  readonly cycleTimeMs: number;
  /** Sleep前のパターン数 */
  readonly beforeCount: number;
  /** Sleep後のパターン数 */
  readonly afterCount: number;
}

/**
 * 学習統計
 */
export interface WakeSleepStats {
  /** 総Wake観察数 */
  readonly totalWakeObservations: number;
  /** 総Sleepサイクル数 */
  readonly totalSleepCycles: number;
  /** 現在のライブラリサイズ */
  readonly currentLibrarySize: number;
  /** 平均パターン品質 */
  readonly averagePatternQuality: number;
  /** 抽出されたパターン総数 */
  readonly totalPatternsExtracted: number;
  /** 削除されたパターン総数 */
  readonly totalPatternsRemoved: number;
  /** タイプ別パターン数 */
  readonly patternsByType: Record<ObservationType, number>;
  /** 最後のWake日時 */
  readonly lastWakeAt?: Timestamp;
  /** 最後のSleep日時 */
  readonly lastSleepAt?: Timestamp;
}

/**
 * パターンマッチング結果
 */
export interface PatternMatch {
  /** マッチしたパターン */
  readonly pattern: LearnedPattern;
  /** マッチスコア (0-1) */
  readonly score: number;
  /** 抽出された変数 */
  readonly variables: Record<string, string>;
  /** 提案される出力 */
  readonly suggestedOutput: string;
}

/**
 * ライブラリエクスポート形式
 */
export interface LibraryExport {
  /** バージョン */
  readonly version: string;
  /** エクスポート日時 */
  readonly exportedAt: Timestamp;
  /** パターンリスト */
  readonly patterns: LearnedPattern[];
  /** 統計情報 */
  readonly stats: WakeSleepStats;
  /** 設定 */
  readonly config: WakeSleepConfig;
}
