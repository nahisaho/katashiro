/**
 * Dialogue Types
 *
 * @fileoverview 対話型情報収集のための型定義
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.1
 */

// =============================================================================
// 基本型
// =============================================================================

/** ID型 */
export type ID = string;

/** タイムスタンプ型 */
export type Timestamp = Date;

// =============================================================================
// 対話セッション
// =============================================================================

/**
 * 対話セッション
 */
export interface DialogueSession {
  /** セッションID */
  id: ID;
  /** 初期入力（ユーザーが最初に入力した内容） */
  initialInput: string;
  /** 対話履歴 */
  exchanges: DialogueExchange[];
  /** 抽出されたコンテキスト */
  extractedContext: ExtractedContext;
  /** 推定された真の目的 */
  inferredIntent: InferredIntent | null;
  /** セッション状態 */
  status: DialogueStatus;
  /** 開始日時 */
  startTime: Date;
  /** 終了日時 */
  endTime?: Date;
}

/**
 * 対話状態
 */
export type DialogueStatus =
  | 'in_progress'   // 進行中
  | 'completed'     // 完了
  | 'cancelled';    // キャンセル

/**
 * 対話のやりとり（1問1答）
 */
export interface DialogueExchange {
  /** やりとりID */
  id: ID;
  /** 質問 */
  question: DialogueQuestion;
  /** 回答（未回答の場合はnull） */
  answer: DialogueAnswer | null;
  /** タイムスタンプ */
  timestamp: Date;
}

/**
 * 質問
 */
export interface DialogueQuestion {
  /** 質問ID */
  id?: string;
  /** 質問テキスト */
  text: string;
  /** 質問タイプ */
  type: QuestionType;
  /** 質問カテゴリ */
  category: QuestionCategory;
  /** 選択肢（選択式の場合） */
  options?: string[];
  /** ヒント・説明 */
  hint?: string;
  /** 期待する回答の例 */
  examples?: string[];
}

/**
 * 質問タイプ
 */
export type QuestionType =
  | 'open'          // 自由記述
  | 'single_choice' // 単一選択
  | 'multi_choice'  // 複数選択
  | 'yes_no'        // はい/いいえ
  | 'scale'         // スケール（1-5など）
  | 'confirmation'; // 確認

/**
 * 質問カテゴリ
 */
export type QuestionCategory =
  | 'purpose'       // 目的
  | 'background'    // 背景・経緯
  | 'constraints'   // 制約条件
  | 'stakeholders'  // 関係者
  | 'timeline'      // スケジュール
  | 'scope'         // 範囲
  | 'priority'      // 優先度
  | 'success'       // 成功基準
  | 'risks'         // リスク
  | 'resources'     // リソース
  | 'clarification' // 明確化
  | 'confirmation'; // 確認

/**
 * 回答
 */
export interface DialogueAnswer {
  /** 回答テキスト */
  text: string;
  /** 選択された選択肢（選択式の場合） */
  selectedOptions?: string[];
  /** スケール値（スケール式の場合） */
  scaleValue?: number;
  /** 回答の信頼度（0-1） */
  confidence: number;
  /** 回答日時 */
  timestamp: Date;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// コンテキスト抽出
// =============================================================================

/**
 * 抽出されたコンテキスト
 */
export interface ExtractedContext {
  /** 明示的な目的 */
  readonly explicitPurpose: string | null;
  /** 推測される真の目的 */
  readonly implicitPurpose: string | null;
  /** 背景情報 */
  readonly background: BackgroundInfo;
  /** 制約条件 */
  readonly constraints: Constraint[];
  /** 関係者 */
  readonly stakeholders: Stakeholder[];
  /** 成功基準 */
  readonly successCriteria: SuccessCriterion[];
  /** 優先事項 */
  readonly priorities: Priority[];
  /** リスク */
  readonly risks: Risk[];
  /** キーワード */
  readonly keywords: string[];
  /** ドメイン */
  readonly domain: string | null;
  /** 緊急度 */
  readonly urgency: 'low' | 'medium' | 'high' | 'critical';
  /** 複雑度 */
  readonly complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
}

/**
 * 背景情報
 */
export interface BackgroundInfo {
  /** 経緯・理由 */
  reason: string | null;
  /** 現状 */
  currentState: string | null;
  /** 理想状態 */
  desiredState: string | null;
  /** 試したこと */
  attemptedSolutions: string[];
}

/**
 * 制約条件
 */
export interface Constraint {
  /** 制約タイプ */
  type: 'time' | 'budget' | 'resource' | 'technical' | 'legal' | 'other';
  /** 説明 */
  description: string;
  /** 厳格度（1-5） */
  strictness: number;
}

/**
 * 関係者
 */
export interface Stakeholder {
  /** 役割 */
  role: string;
  /** 関心事 */
  concerns: string[];
  /** 影響力（1-5） */
  influence: number;
}

/**
 * 成功基準
 */
export interface SuccessCriterion {
  /** 基準 */
  criterion: string;
  /** 測定可能か */
  measurable: boolean;
  /** 重要度（1-5） */
  importance: number;
}

/**
 * 優先事項
 */
export interface Priority {
  /** 項目 */
  item: string;
  /** 優先度（1=最高） */
  rank: number;
}

/**
 * リスク
 */
export interface Risk {
  /** リスク */
  description: string;
  /** 発生確率（1-5） */
  probability: number;
  /** 影響度（1-5） */
  impact: number;
}

// =============================================================================
// 意図推定
// =============================================================================

/**
 * 推定された意図
 */
export interface InferredIntent {
  /** 表層的な目的（ユーザーが言った通り） */
  surfaceIntent: string;
  /** 真の目的（推測） */
  trueIntent: string;
  /** 推定の信頼度（0-1） */
  confidence: number;
  /** 推定根拠 */
  reasoning: string[];
  /** 代替解釈 */
  alternativeInterpretations: AlternativeInterpretation[];
  /** 推奨アプローチ */
  recommendedApproach: string;
  /** 追加で確認すべき事項 */
  needsClarification: string[];
}

/**
 * 代替解釈
 */
export interface AlternativeInterpretation {
  /** 解釈 */
  interpretation: string;
  /** 確率（0-1） */
  probability: number;
  /** 根拠 */
  reasoning: string;
}

// =============================================================================
// 設定
// =============================================================================

/**
 * 対話コレクター設定
 */
export interface DialogueCollectorConfig {
  /** 最大質問数 */
  maxQuestions: number;
  /** 最小質問数 */
  minQuestions: number;
  /** 信頼度閾値 */
  confidenceThreshold: number;
  /** 質問戦略 */
  strategy: QuestionStrategy;
  /** 言語 */
  language: 'ja' | 'en';
}

/**
 * 質問戦略
 */
export type QuestionStrategy =
  | 'breadth_first'  // 幅優先（各カテゴリから1問ずつ）
  | 'depth_first'    // 深さ優先（1カテゴリを深掘り）
  | 'adaptive'       // 適応的（回答に応じて調整）
  | 'minimal';       // 最小限（必要最低限の質問のみ）

/**
 * デフォルト設定
 */
export const DEFAULT_DIALOGUE_CONFIG: DialogueCollectorConfig = {
  maxQuestions: 10,
  minQuestions: 3,
  confidenceThreshold: 0.8,
  strategy: 'adaptive',
  language: 'ja',
};
