/**
 * エラーコード定数
 *
 * @design DES-COMMON-001 §4
 * @task TASK-000
 */

/**
 * 共通エラーコード定数
 *
 * 形式: {MODULE}_{CATEGORY}_{NUMBER}
 * - MODULE: モジュール識別子 (COR, COL, ANA, MED, GEN, KNW)
 * - CATEGORY: カテゴリ (VAL, AUT, PRM, NTF, CNF, NET, TMO, SEC, SYS, EXT)
 * - NUMBER: 連番 (001-999)
 */
export const ErrorCodes = {
  // ========================================
  // Core (COR) - 共通エラー
  // ========================================

  /** パラメータが無効 */
  INVALID_PARAMETER: 'COR_VAL_001',
  /** 必須パラメータが欠落 */
  MISSING_REQUIRED: 'COR_VAL_002',
  /** 型が不一致 */
  TYPE_MISMATCH: 'COR_VAL_003',
  /** 内部エラー */
  INTERNAL_ERROR: 'COR_SYS_001',
  /** 未実装機能 */
  NOT_IMPLEMENTED: 'COR_SYS_002',
  /** 接続失敗 */
  CONNECTION_FAILED: 'COR_NET_001',
  /** 操作タイムアウト */
  OPERATION_TIMEOUT: 'COR_TMO_001',

  // ========================================
  // Collector (COL) - 情報収集エラー
  // ========================================

  /** ファイルが見つからない */
  FILE_NOT_FOUND: 'COL_NTF_001',
  /** 未対応のファイル形式 */
  UNSUPPORTED_FORMAT: 'COL_VAL_001',
  /** ファイルが破損 */
  CORRUPTED_FILE: 'COL_VAL_002',
  /** パスワード保護 */
  PASSWORD_PROTECTED: 'COL_SEC_001',
  /** スクレイピング失敗 */
  SCRAPE_FAILED: 'COL_NET_001',
  /** レート制限 */
  RATE_LIMITED: 'COL_NET_002',
  /** リサーチタイムアウト */
  RESEARCH_TIMEOUT: 'COL_TMO_001',
  /** 検索APIエラー */
  SEARCH_API_ERROR: 'COL_EXT_001',

  // ========================================
  // Analyzer (ANA) - 分析エラー
  // ========================================

  /** コードが無効 */
  INVALID_CODE: 'ANA_VAL_001',
  /** ブロックされたモジュール */
  BLOCKED_MODULE: 'ANA_VAL_002',
  /** サンドボックス違反 */
  SANDBOX_VIOLATION: 'ANA_SEC_001',
  /** 権限拒否 */
  PERMISSION_DENIED: 'ANA_SEC_002',
  /** 実行タイムアウト */
  EXECUTION_TIMEOUT: 'ANA_TMO_001',
  /** メモリ超過 */
  MEMORY_EXCEEDED: 'ANA_SYS_001',
  /** 収束失敗 */
  CONVERGENCE_FAILED: 'ANA_SYS_002',
  /** LLM APIエラー */
  LLM_API_ERROR: 'ANA_EXT_001',

  // ========================================
  // Media (MED) - メディア生成エラー
  // ========================================

  /** プロンプトが無効 */
  INVALID_PROMPT: 'MED_VAL_001',
  /** コンテンツポリシー違反 */
  CONTENT_POLICY_VIOLATION: 'MED_VAL_002',
  /** 未対応の音声形式 */
  UNSUPPORTED_AUDIO_FORMAT: 'MED_VAL_003',
  /** 未対応の画像形式 */
  UNSUPPORTED_IMAGE_FORMAT: 'MED_VAL_004',
  /** 生成失敗 */
  GENERATION_FAILED: 'MED_NET_001',
  /** 生成タイムアウト */
  GENERATION_TIMEOUT: 'MED_TMO_001',
  /** プロバイダーエラー */
  PROVIDER_ERROR: 'MED_EXT_001',
  /** クォータ超過 */
  QUOTA_EXCEEDED: 'MED_EXT_002',

  // ========================================
  // Generator (GEN) - コンテンツ生成エラー
  // ========================================

  /** テンプレートエラー */
  TEMPLATE_ERROR: 'GEN_VAL_001',
  /** レンダリング失敗 */
  RENDER_FAILED: 'GEN_SYS_001',

  // ========================================
  // Knowledge (KNW) - 知識管理エラー
  // ========================================

  /** ノードが見つからない */
  NODE_NOT_FOUND: 'KNW_NTF_001',
  /** エッジが見つからない */
  EDGE_NOT_FOUND: 'KNW_NTF_002',
  /** 永続化失敗 */
  PERSISTENCE_FAILED: 'KNW_SYS_001',
  /** クエリエラー */
  QUERY_ERROR: 'KNW_VAL_001',
} as const;

/**
 * エラーコードキー型
 */
export type ErrorCodeKey = keyof typeof ErrorCodes;

/**
 * エラーコード値型
 */
export type ErrorCodeValue = (typeof ErrorCodes)[ErrorCodeKey];
