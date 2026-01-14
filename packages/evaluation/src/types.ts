/**
 * Evaluation Types
 *
 * @requirement REQ-EVAL-001, REQ-EVAL-002, REQ-EVAL-003, REQ-EVAL-004, REQ-EVAL-005
 * @design DES-KATASHIRO-003-EVAL §3
 */

/**
 * 評価入力
 */
export interface EvaluationInput {
  /** 評価対象出力 */
  output: string;
  /** 入力（コンテキスト） */
  input?: string;
  /** 期待出力（比較用） */
  expected?: string;
  /** 追加コンテキスト */
  context?: Record<string, unknown>;
}

/**
 * 評価結果
 */
export interface EvaluationResult {
  /** 評価器名 */
  evaluator: string;
  /** スコア */
  score: number;
  /** 正規化スコア（0-1） */
  normalizedScore: number;
  /** 合否 */
  passed?: boolean;
  /** 根拠 */
  reasoning: string;
  /** 生スコア（複数回試行時） */
  rawScores?: number[];
  /** メタデータ */
  metadata?: EvaluationMetadata;
}

/**
 * 評価メタデータ
 */
export interface EvaluationMetadata {
  /** 最適長（LengthEvaluator） */
  optimalLength?: number;
  /** 発見キーワード（KeywordEvaluator） */
  foundKeywords?: string[];
  /** 欠落キーワード（KeywordEvaluator） */
  missingKeywords?: string[];
  /** 欠落フィールド（JsonStructureEvaluator） */
  missingFields?: string[];
  /** コンポーネントスコア（CompositeEvaluator） */
  componentScores?: Array<{ evaluator: string; score: number }>;
  /** その他のメタデータ */
  [key: string]: unknown;
}

/**
 * 評価器インターフェース
 */
export interface Evaluator {
  /** 評価器名 */
  readonly name: string;
  /** 評価実行 */
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}

/**
 * 評価スケール
 */
export interface EvaluationScale {
  min: number;
  max: number;
  descriptions?: Record<number, string>;
}

/**
 * データセット
 */
export interface Dataset {
  /** データセットID */
  id: string;
  /** 名前 */
  name: string;
  /** 説明 */
  description?: string;
  /** データ件数 */
  size: number;
  /** タグ */
  tags?: string[];
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/**
 * データセットアイテム
 */
export interface DatasetItem {
  /** アイテムID */
  id: string;
  /** 入力 */
  input: string;
  /** 期待出力 */
  expected?: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * 実験設定
 */
export interface ExperimentConfig {
  /** 実験名 */
  name: string;
  /** 説明 */
  description?: string;
  /** データセットID */
  datasetId: string;
  /** 使用評価器 */
  evaluators: string[];
  /** タグ */
  tags?: string[];
}

/**
 * 実験結果
 */
export interface ExperimentResult {
  /** 実験ID */
  id: string;
  /** 実験名 */
  name: string;
  /** 実行日時 */
  timestamp: string;
  /** 使用データセット */
  datasetId: string;
  /** 評価結果サマリー */
  summary: ExperimentSummary;
  /** 詳細結果 */
  details: ExperimentDetailResult[];
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * 実験結果サマリー
 */
export interface ExperimentSummary {
  /** 評価器ごとの平均スコア */
  averageScores: Record<string, number>;
  /** 評価器ごとの標準偏差 */
  stdDevs: Record<string, number>;
  /** 全体の平均スコア */
  overallScore: number;
  /** 評価件数 */
  totalItems: number;
  /** 成功件数 */
  successCount: number;
  /** エラー件数 */
  errorCount: number;
}

/**
 * 実験詳細結果
 */
export interface ExperimentDetailResult {
  /** アイテムID */
  itemId: string;
  /** 入力 */
  input: string;
  /** 出力 */
  output: string;
  /** 期待出力 */
  expected?: string;
  /** 評価結果 */
  evaluations: EvaluationResult[];
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
}

/**
 * A/Bテスト設定
 */
export interface ABTestConfig {
  /** テスト名 */
  name: string;
  /** 説明 */
  description?: string;
  /** バリアントA設定 */
  variantA: VariantConfig;
  /** バリアントB設定 */
  variantB: VariantConfig;
  /** データセットID */
  datasetId: string;
  /** 評価器 */
  evaluators: string[];
  /** 統計的有意水準 */
  significanceLevel?: number;
}

/**
 * バリアント設定
 */
export interface VariantConfig {
  /** バリアント名 */
  name: string;
  /** 生成関数 */
  generator: (input: string) => Promise<string>;
}

/**
 * A/Bテスト結果
 */
export interface ABTestResult {
  /** テストID */
  id: string;
  /** テスト名 */
  name: string;
  /** 実行日時 */
  timestamp: string;
  /** バリアントA結果 */
  variantA: VariantResult;
  /** バリアントB結果 */
  variantB: VariantResult;
  /** 統計分析結果 */
  analysis: ABAnalysis;
  /** 勝者 */
  winner: 'A' | 'B' | 'tie';
  /** 結論 */
  conclusion: string;
}

/**
 * バリアント結果
 */
export interface VariantResult {
  /** バリアント名 */
  name: string;
  /** 評価器ごとの平均スコア */
  averageScores: Record<string, number>;
  /** 評価器ごとの標準偏差 */
  stdDevs: Record<string, number>;
  /** サンプル数 */
  sampleSize: number;
}

/**
 * A/Bテストバリアント型
 */
export type ABTestVariant = 'A' | 'B';

/**
 * A/B分析結果
 */
export interface ABAnalysis {
  /** 評価器ごとのt検定結果 */
  tTests: Record<
    string,
    {
      tStatistic: number;
      pValue: number;
      significant: boolean;
      effectSize: number;
    }
  >;
  /** 全体の有意性 */
  overallSignificant: boolean;
  /** 信頼区間 */
  confidenceIntervals: Record<
    string,
    {
      lower: number;
      upper: number;
    }
  >;
}

/**
 * ベンチマーク設定
 */
export interface BenchmarkConfig {
  /** ベンチマーク名 */
  name: string;
  /** 反復回数 */
  iterations?: number;
  /** ウォームアップ回数 */
  warmupIterations?: number;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * ベンチマーク結果
 */
export interface BenchmarkResult {
  /** ベンチマーク名 */
  name: string;
  /** 平均実行時間（ミリ秒） */
  meanMs: number;
  /** 標準偏差 */
  stdDevMs: number;
  /** 最小実行時間 */
  minMs: number;
  /** 最大実行時間 */
  maxMs: number;
  /** パーセンタイル */
  percentiles: {
    p50: number;
    p90: number;
    p99: number;
  };
  /** 反復回数 */
  iterations: number;
  /** 実行日時 */
  timestamp: string;
}

// ====================================
// LLMJudge評価器関連型 (REQ-EVAL-101)
// ====================================

/**
 * 評価基準定義
 * @requirement REQ-EVAL-101
 */
export interface EvaluationCriteria {
  /** 基準名 */
  name: string;
  /** 説明 */
  description: string;
  /** スコア範囲 (デフォルト: 1-5) */
  scale?: {
    min: number;
    max: number;
  };
  /** 各スコアの説明（オプション） */
  rubric?: Record<number, string>;
  /** 重み（複合評価時） */
  weight?: number;
}

/**
 * LLMJudge評価器設定
 * @requirement REQ-EVAL-101
 */
export interface LLMJudgeEvaluatorConfig {
  /** 評価器名 */
  name?: string;
  /** 評価基準リスト */
  criteria: EvaluationCriteria[];
  /** 評価スケール（デフォルト: 1-5） */
  scale?: {
    min: number;
    max: number;
  };
  /** システムプロンプト（カスタマイズ用） */
  systemPrompt?: string;
  /** 評価プロンプトテンプレート */
  evaluationPromptTemplate?: string;
  /** リトライ回数（パース失敗時） */
  maxRetries?: number;
  /** 温度パラメータ */
  temperature?: number;
  /** 評価結果のJSON出力を強制 */
  forceJsonOutput?: boolean;
}

/**
 * LLMJudge評価結果
 * @requirement REQ-EVAL-101
 */
export interface LLMJudgeResult extends EvaluationResult {
  /** 各基準ごとのスコア */
  criteriaScores: Record<string, {
    score: number;
    reasoning: string;
  }>;
  /** LLMの生の出力 */
  rawLLMOutput?: string;
  /** 使用トークン数 */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ====================================
// RAG評価関連型 (REQ-EVAL-102)
// ====================================

/**
 * RAG評価入力
 * @requirement REQ-EVAL-102
 */
export interface RAGEvaluationInput extends EvaluationInput {
  /** ユーザークエリ（質問） */
  query: string;
  /** 取得されたコンテキスト */
  retrievedContexts: string[];
  /** 生成された回答 */
  generatedAnswer: string;
  /** グラウンドトゥルース（オプション） */
  groundTruth?: string;
}

/**
 * RAGAS評価結果
 * @requirement REQ-EVAL-102
 */
export interface RAGASEvaluationResult extends EvaluationResult {
  /** 各メトリクスのスコア */
  metrics: {
    /** Faithfulness: 回答がコンテキストに基づいているか */
    faithfulness?: number;
    /** Context Relevancy: 取得コンテキストの関連性 */
    contextRelevancy?: number;
    /** Answer Relevancy: 回答がクエリに関連しているか */
    answerRelevancy?: number;
    /** Context Recall: コンテキストがグラウンドトゥルースをカバーしているか */
    contextRecall?: number;
    /** Context Precision: 関連コンテキストの精度 */
    contextPrecision?: number;
  };
  /** 詳細な分析 */
  analysis?: {
    /** 回答から抽出されたステートメント */
    statements?: string[];
    /** コンテキストでサポートされているステートメント */
    supportedStatements?: string[];
    /** サポートされていないステートメント */
    unsupportedStatements?: string[];
  };
}
