/**
 * FactChecker 型定義
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

/**
 * 検証ソースの種類
 */
export type VerificationSourceType =
  | 'trusted_news'
  | 'academic'
  | 'government'
  | 'factcheck_org'
  | 'statistics'
  | 'primary_source';

/**
 * 判定ラベル
 */
export type VerdictLabel =
  | 'true'
  | 'mostly_true'
  | 'half_true'
  | 'mostly_false'
  | 'false'
  | 'unverifiable'
  | 'misleading'
  | 'outdated'
  | 'lacks_context';

/**
 * エビデンスの関係性
 */
export type EvidenceRelation =
  | 'supports'
  | 'contradicts'
  | 'partially_supports'
  | 'neutral'
  | 'context';

/**
 * 厳密さのレベル
 */
export type StrictnessLevel = 'lenient' | 'moderate' | 'strict';

/**
 * ファクトチェックリクエスト
 */
export interface FactCheckRequest {
  /** 検証対象の主張 */
  readonly claim: string;
  /** 主張の出典 */
  readonly source?: string;
  /** 主張がなされた日付 */
  readonly claimDate?: Date;
  /** 追加のコンテキスト */
  readonly context?: string;
  /** 使用する検証ソースの種類 */
  readonly verificationSources?: VerificationSourceType[];
  /** 厳密さレベル */
  readonly strictnessLevel?: StrictnessLevel;
  /** 必要な最小エビデンス数 */
  readonly minEvidence?: number;
  /** 言語 */
  readonly language?: string;
}

/**
 * 判定結果
 */
export interface Verdict {
  /** 判定ラベル */
  readonly label: VerdictLabel;
  /** スコア (-1 to 1) */
  readonly score: number;
  /** 判定理由 */
  readonly rationale: string;
  /** 注意事項 */
  readonly caveats: string[];
}

/**
 * エビデンス
 */
export interface Evidence {
  /** エビデンスID */
  readonly id: string;
  /** ソース名 */
  readonly sourceName: string;
  /** ソースURL */
  readonly sourceUrl: string;
  /** ソースの種類 */
  readonly sourceType: VerificationSourceType;
  /** 抜粋 */
  readonly excerpt: string;
  /** 主張との関係 */
  readonly relation: EvidenceRelation;
  /** 信頼性スコア (0-1) */
  readonly credibilityScore: number;
  /** 公開日 */
  readonly publishedDate?: Date;
  /** 取得日 */
  readonly retrievedAt: Date;
}

/**
 * 検証詳細
 */
export interface VerificationDetails {
  /** 調査したソースの数 */
  readonly sourcesExamined: number;
  /** 支持するエビデンスの数 */
  readonly supportingEvidence: number;
  /** 矛盾するエビデンスの数 */
  readonly contradictingEvidence: number;
  /** 一貫性スコア */
  readonly consistencyScore: number;
  /** 調査の制限事項 */
  readonly limitations: string[];
}

/**
 * 参考文献
 */
export interface Reference {
  /** 参照ID */
  readonly id: string;
  /** タイトル */
  readonly title: string;
  /** URL */
  readonly url: string;
  /** 著者 */
  readonly author?: string;
  /** 公開日 */
  readonly publishedDate?: Date;
  /** ソースの種類 */
  readonly sourceType: VerificationSourceType;
}

/**
 * 既存のファクトチェック結果
 */
export interface ExistingFactCheck {
  /** 組織名 */
  readonly organization: string;
  /** 判定 */
  readonly verdict: string;
  /** URL */
  readonly url: string;
  /** 日付 */
  readonly date: Date;
}

/**
 * メタデータ
 */
export interface FactCheckMetadata {
  /** チェック日時 */
  readonly checkedAt: Date;
  /** 処理時間(ms) */
  readonly processingTimeMs: number;
  /** 使用した検証ソース */
  readonly verificationSourcesUsed: VerificationSourceType[];
  /** バージョン */
  readonly version: string;
}

/**
 * ファクトチェック結果
 */
export interface FactCheckResultDetail {
  /** 元の主張 */
  readonly claim: string;
  /** 正規化された主張 */
  readonly normalizedClaim: string;
  /** 判定 */
  readonly verdict: Verdict;
  /** 確信度 (0-1) */
  readonly confidenceScore: number;
  /** エビデンス一覧 */
  readonly evidence: Evidence[];
  /** 検証詳細 */
  readonly verificationDetails: VerificationDetails;
  /** 要約 */
  readonly summary: string;
  /** 詳細説明 */
  readonly explanation: string;
  /** 参考文献 */
  readonly references: Reference[];
  /** 既存のファクトチェック結果 */
  readonly existingFactChecks?: ExistingFactCheck[];
  /** メタデータ */
  readonly metadata: FactCheckMetadata;
}

/**
 * クイックチェック結果
 */
export interface QuickCheckResult {
  /** 判定ラベル */
  readonly verdict: VerdictLabel;
  /** 確信度 */
  readonly confidence: number;
  /** 主要な理由 */
  readonly reason: string;
  /** 主要なソース */
  readonly topSources: string[];
}

/**
 * 抽出された主張
 */
export interface ExtractedClaim {
  /** 主張の原文 */
  readonly original: string;
  /** 正規化された主張 */
  readonly normalized: string;
  /** 主張に含まれるエンティティ */
  readonly entities: string[];
  /** 主張の種類 */
  readonly type: ClaimType;
  /** 検証可能性 */
  readonly verifiability: 'high' | 'medium' | 'low';
  /** コンテキスト */
  readonly context?: string;
}

/**
 * 主張の種類
 */
export type ClaimType =
  | 'factual'      // 事実に関する主張
  | 'statistical'  // 統計に関する主張
  | 'quote'        // 引用
  | 'prediction'   // 予測
  | 'opinion';     // 意見

/**
 * 主張の検証結果
 */
export interface ClaimVerification {
  /** 対象の主張 */
  readonly claim: ExtractedClaim;
  /** 検証されたか */
  readonly verified: boolean | null;
  /** エビデンス */
  readonly evidence: Evidence[];
  /** 追加の注記 */
  readonly notes: string[];
}

/**
 * 信頼できるソースの設定
 */
export interface TrustedSourceConfig {
  /** ソースの名前 */
  readonly name: string;
  /** ドメイン */
  readonly domain: string;
  /** ソースの種類 */
  readonly sourceType: VerificationSourceType;
  /** 基本信頼度スコア */
  readonly baseCredibility: number;
  /** 専門分野 */
  readonly specialties?: string[];
  /** 言語 */
  readonly language?: string;
}

/**
 * VerdictGenerator入力
 */
export interface VerdictInput {
  /** 主張の検証結果 */
  readonly claimVerifications: ClaimVerification[];
  /** 一貫性スコア */
  readonly consistencyScore: number;
  /** エビデンス数 */
  readonly evidenceCount: number;
  /** 厳密さレベル */
  readonly strictnessLevel: StrictnessLevel;
  /** 既存のファクトチェック結果 */
  readonly existingFactChecks?: ExistingFactCheck[];
}

/**
 * ファクトチェッカーの設定
 */
export interface FactCheckerConfig {
  /** デフォルトの厳密さレベル */
  readonly defaultStrictnessLevel: StrictnessLevel;
  /** デフォルトの最小エビデンス数 */
  readonly defaultMinEvidence: number;
  /** 検索タイムアウト(ms) */
  readonly searchTimeoutMs: number;
  /** 最大同時検索数 */
  readonly maxConcurrentSearches: number;
  /** 信頼できるソース一覧 */
  readonly trustedSources: TrustedSourceConfig[];
  /** 言語 */
  readonly language: string;
}

/**
 * デフォルトのファクトチェッカー設定
 */
export const DEFAULT_FACTCHECKER_CONFIG: FactCheckerConfig = {
  defaultStrictnessLevel: 'moderate',
  defaultMinEvidence: 3,
  searchTimeoutMs: 30000,
  maxConcurrentSearches: 5,
  trustedSources: [],
  language: 'en',
};

/**
 * 複数ソース検証結果
 * @requirement REQ-EXT-FCK-001
 */
export interface MultiSourceVerificationResult {
  /** 検証対象の主張 */
  readonly claim: string;
  /** 使用した独立ソース数 */
  readonly sourceCount: number;
  /** 必要な最小ソース数を満たしているか */
  readonly meetsMinimumSources: boolean;
  /** ソース間の一致度 (0-1) */
  readonly agreementScore: number;
  /** 各ソースからの検証結果 */
  readonly sourceResults: SourceVerificationResult[];
  /** 総合判定 */
  readonly overallVerdict: VerdictLabel;
  /** 信頼度スコア (0-100) */
  readonly confidenceScore: number;
  /** 検証サマリー */
  readonly summary: string;
}

/**
 * 個別ソース検証結果
 */
export interface SourceVerificationResult {
  /** ソース名 */
  readonly sourceName: string;
  /** ソースタイプ */
  readonly sourceType: VerificationSourceType;
  /** ソースURL */
  readonly sourceUrl: string;
  /** 検証結果（支持/矛盾/中立） */
  readonly verdict: EvidenceRelation;
  /** 関連する抜粋 */
  readonly excerpt: string;
  /** ソースの信頼性スコア (0-1) */
  readonly sourceCredibility: number;
  /** 取得日時 */
  readonly retrievedAt: Date;
}

/**
 * 信頼度スコア計算結果
 * @requirement REQ-EXT-FCK-002
 */
export interface ConfidenceScoreResult {
  /** 信頼度スコア (0-100) */
  readonly score: number;
  /** スコアの内訳 */
  readonly breakdown: ConfidenceBreakdown;
  /** スコアレベル */
  readonly level: ConfidenceLevel;
  /** 説明 */
  readonly explanation: string;
}

/**
 * 信頼度スコアの内訳
 */
export interface ConfidenceBreakdown {
  /** ソース一致スコア (0-100) */
  readonly sourceAgreement: number;
  /** ソース信頼性スコア (0-100) */
  readonly sourceCredibility: number;
  /** エビデンス量スコア (0-100) */
  readonly evidenceQuantity: number;
  /** 一貫性スコア (0-100) */
  readonly consistency: number;
  /** 最新性スコア (0-100) */
  readonly recency: number;
}

/**
 * 信頼度レベル
 */
export type ConfidenceLevel = 
  | 'very_high'    // 90-100
  | 'high'         // 70-89
  | 'moderate'     // 50-69
  | 'low'          // 30-49
  | 'very_low';    // 0-29

/**
 * 矛盾検出結果
 * @requirement REQ-EXT-FCK-003
 * @since 1.0.0
 */
export interface ConflictDetectionResult {
  /** 矛盾が検出されたか */
  readonly hasConflicts: boolean;
  /** 検出された矛盾の数 */
  readonly conflictCount: number;
  /** 矛盾の詳細 */
  readonly conflicts: ConflictDetail[];
  /** 複数の観点の提示 */
  readonly viewpoints: Viewpoint[];
  /** 解決の推奨 */
  readonly resolution?: ConflictResolution;
  /** サマリー */
  readonly summary: string;
}

/**
 * 矛盾の詳細
 */
export interface ConflictDetail {
  /** 矛盾ID */
  readonly id: string;
  /** 矛盾する2つのソースのエビデンス */
  readonly conflictingSources: [Evidence, Evidence];
  /** 矛盾のタイプ */
  readonly conflictType: ConflictType;
  /** 矛盾の深刻度 (1-5) */
  readonly severity: number;
  /** 矛盾の説明 */
  readonly description: string;
  /** 矛盾の解消に向けた提案 */
  readonly suggestion?: string;
}

/**
 * 矛盾のタイプ
 */
export type ConflictType =
  | 'factual'         // 事実の矛盾
  | 'numerical'       // 数値の矛盾
  | 'temporal'        // 時間的矛盾
  | 'contextual'      // コンテキストの違い
  | 'interpretive';   // 解釈の違い

/**
 * 観点（複数視点の提示）
 */
export interface Viewpoint {
  /** 観点のラベル */
  readonly label: string;
  /** この観点を支持するソース */
  readonly supportingSources: Evidence[];
  /** 主張の要約 */
  readonly summary: string;
  /** 信頼性スコア (0-1) */
  readonly credibility: number;
}

/**
 * 矛盾の解決提案
 */
export interface ConflictResolution {
  /** 推奨される解釈 */
  readonly recommendedInterpretation: string;
  /** 追加調査が必要か */
  readonly needsMoreResearch: boolean;
  /** 調査すべき追加ソース */
  readonly suggestedSources?: string[];
  /** 理由 */
  readonly rationale: string;
}

/**
 * 未検証ステートメント
 * @requirement REQ-EXT-FCK-004
 * @since 1.0.0
 */
export interface UnverifiedStatement {
  /** ステートメントID */
  readonly id: string;
  /** 元のテキスト */
  readonly text: string;
  /** ラベル（デフォルト: "[要検証]"） */
  readonly label: string;
  /** 未検証の理由 */
  readonly reason: UnverificationReason;
  /** 検証のための推奨アクション */
  readonly suggestedActions: string[];
  /** ステータス */
  readonly status: VerificationStatus;
}

/**
 * 未検証の理由
 */
export type UnverificationReason =
  | 'no_sources_found'     // ソースが見つからない
  | 'conflicting_info'     // 情報が矛盾している
  | 'insufficient_evidence' // エビデンス不足
  | 'timeout'              // タイムアウト
  | 'source_unavailable'   // ソース利用不可
  | 'unverifiable_claim';  // 検証不可能な主張

/**
 * 検証ステータス
 */
export type VerificationStatus =
  | 'verified'      // 検証済み
  | 'unverified'    // 未検証
  | 'pending'       // 検証中
  | 'failed';       // 検証失敗

/**
 * ラベル付きステートメント
 * @requirement REQ-EXT-FCK-004
 */
export interface LabeledStatement {
  /** 元のテキスト */
  readonly original: string;
  /** ラベル付きテキスト */
  readonly labeled: string;
  /** 検証ステータス */
  readonly status: VerificationStatus;
  /** 適用されたラベル（未検証の場合） */
  readonly appliedLabel?: string;
}
