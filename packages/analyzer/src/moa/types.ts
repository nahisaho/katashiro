/**
 * MoA (Mixture of Agents) Engine 型定義
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

/**
 * 統合戦略
 */
export type AggregationStrategy =
  | 'majority_vote'       // 多数決
  | 'weighted_average'    // 重み付き平均
  | 'best_of_n'          // 最高スコアを選択
  | 'synthesis'          // 統合生成
  | 'debate'             // 討論後に結論
  | 'hierarchical';      // 階層的統合

/**
 * エージェントタイプ
 */
export type AgentType =
  | 'creative'      // 創造的思考
  | 'analytical'    // 分析的思考
  | 'critical'      // 批判的思考
  | 'factual'       // 事実重視
  | 'empathetic'    // 共感重視
  | 'technical'     // 技術専門
  | 'business'      // ビジネス専門
  | 'legal'         // 法務専門
  | 'medical'       // 医療専門
  | 'evaluator'     // 評価者
  | 'synthesizer'   // 統合者
  | 'custom';       // カスタム

/**
 * MoA リクエスト
 */
export interface MoARequest {
  /** タスク/質問 */
  readonly task: string;
  /** コンテキスト情報 */
  readonly context?: string;
  /** 使用するエージェント（指定しない場合は自動選択） */
  readonly agents?: AgentConfig[];
  /** 統合戦略 */
  readonly strategy?: AggregationStrategy;
  /** 設定オーバーライド */
  readonly config?: Partial<MoAConfig>;
  /** ラウンド数（反復回数） */
  readonly rounds?: number;
  /** 最小エージェント数 */
  readonly minAgents?: number;
  /** 最大エージェント数 */
  readonly maxAgents?: number;
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
  /** 詳細ログを出力するか */
  readonly verbose?: boolean;
}

/**
 * MoA 設定
 */
export interface MoAConfig {
  /** デフォルト統合戦略 */
  readonly defaultStrategy: AggregationStrategy;
  /** 最大ラウンド数 */
  readonly maxRounds: number;
  /** 最小エージェント数 */
  readonly minAgents: number;
  /** 最大エージェント数 */
  readonly maxAgents: number;
  /** タイムアウト（ミリ秒） */
  readonly timeout: number;
  /** 早期終了有効 */
  readonly earlyTermination: boolean;
  /** 合意度閾値 */
  readonly consensusThreshold: number;
  /** 詳細ログ */
  readonly verbose: boolean;
}

/**
 * エージェント設定
 */
export interface AgentConfig {
  /** エージェントID */
  readonly id: string;
  /** エージェント名 */
  readonly name: string;
  /** エージェントタイプ */
  readonly type: AgentType;
  /** 特性/専門領域 */
  readonly specialization?: string;
  /** 重み（統合時の重要度） */
  readonly weight?: number;
  /** システムプロンプト */
  readonly systemPrompt?: string;
  /** パラメータ */
  readonly parameters?: AgentParameters;
}

/**
 * エージェントパラメータ
 */
export interface AgentParameters {
  /** 温度（創造性） */
  readonly temperature?: number;
  /** 最大トークン数 */
  readonly maxTokens?: number;
  /** 使用モデル */
  readonly model?: string;
  /** カスタムパラメータ */
  readonly custom?: Record<string, unknown>;
}

/**
 * エージェントレスポンス
 */
export interface AgentResponse {
  /** エージェントID */
  readonly agentId: string;
  /** エージェント名 */
  readonly agentName: string;
  /** レスポンス内容 */
  readonly response: string;
  /** 自己評価スコア (0-1) */
  readonly selfScore?: number;
  /** 他エージェントからの評価 */
  readonly peerScores?: PeerScore[];
  /** 推論過程 */
  readonly reasoning?: string;
  /** 処理時間（ミリ秒） */
  readonly processingTime: number;
  /** 使用トークン数 */
  readonly tokenUsage?: TokenUsage;
}

/**
 * ピア評価
 */
export interface PeerScore {
  /** 評価者エージェントID */
  readonly evaluatorId: string;
  /** スコア (0-1) */
  readonly score: number;
  /** コメント */
  readonly comment?: string;
}

/**
 * トークン使用量
 */
export interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

/**
 * 統合詳細
 */
export interface AggregationDetails {
  /** 使用した戦略 */
  readonly strategy: AggregationStrategy;
  /** 参加エージェント */
  readonly participatingAgents: string[];
  /** 合意された点 */
  readonly agreedPoints?: string[];
  /** 意見が分かれた点 */
  readonly disagreedPoints?: string[];
  /** 統合の根拠 */
  readonly rationale?: string;
  /** 各エージェントの貢献度 */
  readonly contributions: AgentContribution[];
}

/**
 * エージェント貢献度
 */
export interface AgentContribution {
  /** エージェントID */
  readonly agentId: string;
  /** 影響度 (0-1) */
  readonly influence: number;
  /** キーポイント */
  readonly keyPoints: string[];
  /** 最終回答への貢献度 (0-1) */
  readonly contributionScore?: number;
  /** 採用された主要ポイント */
  readonly adoptedPoints?: string[];
}

/**
 * ラウンド結果
 */
export interface RoundResult {
  /** ラウンド番号 */
  readonly roundNumber: number;
  /** レスポンス一覧 */
  readonly responses: AgentResponse[];
  /** 合意度 (0-1) */
  readonly consensus: number;
  /** 前ラウンドからの改善点 */
  readonly improvements?: string[];
  /** このラウンドの中間回答 */
  readonly intermediateResponse?: string;
  /** このラウンドの合意度 */
  readonly consensusScore?: number;
}

/**
 * MoA メタデータ
 */
export interface MoAMetadata {
  /** 総ラウンド数 */
  readonly totalRounds: number;
  /** 使用エージェント数 */
  readonly totalAgents: number;
  /** 統合戦略 */
  readonly aggregationStrategy: AggregationStrategy;
  /** 合意度履歴 */
  readonly consensusHistory: number[];
  /** 総トークン使用量 */
  readonly tokenUsage: TokenUsage;
  /** 処理時間（ミリ秒） */
  readonly processingTime: number;
  /** 統合詳細 */
  readonly aggregationDetails: AggregationDetails;
  /** 開始時刻 */
  readonly startedAt?: Date;
  /** 完了時刻 */
  readonly completedAt?: Date;
  /** エラー（発生した場合） */
  readonly errors?: string[];
}

/**
 * MoA 結果
 */
export interface MoAResult {
  /** 最終回答 */
  readonly response: string;
  /** 信頼度スコア (0-1) */
  readonly confidence: number;
  /** 合意度 (0-1) */
  readonly consensus: number;
  /** 使用したエージェントのレスポンス */
  readonly agentResponses: AgentResponse[];
  /** メタデータ */
  readonly metadata: MoAMetadata;
  /** タスク */
  readonly task?: string;
  /** 統合プロセスの詳細 */
  readonly aggregationDetails?: AggregationDetails;
  /** 各ラウンドの結果（複数ラウンドの場合） */
  readonly roundResults?: RoundResult[];
}

/**
 * タスク分析結果
 */
export interface TaskAnalysis {
  /** 創造性が必要か */
  readonly requiresCreativity: boolean;
  /** ファクトチェックが必要か */
  readonly requiresFactCheck: boolean;
  /** 批評が必要か */
  readonly requiresCritique: boolean;
  /** 技術的知識が必要か */
  readonly requiresTechnical: boolean;
  /** ビジネス知識が必要か */
  readonly requiresBusiness: boolean;
  /** 推奨エージェントタイプ */
  readonly recommendedAgents: AgentType[];
}

/**
 * 統合結果（内部用）
 */
export interface AggregationResult {
  readonly response: string;
  readonly selectedResponses?: AgentResponse[];
  readonly details?: AggregationDetails;
}

/**
 * 組み込みエージェントプリセット
 */
export const AGENT_PRESETS: Record<string, AgentConfig> = {
  creative: {
    id: 'creative',
    name: 'Creative Thinker',
    type: 'creative',
    specialization: 'Novel ideas and unconventional approaches',
    weight: 1.0,
    systemPrompt: 'You are a creative thinker. Generate innovative and unconventional ideas.',
    parameters: { temperature: 0.9 },
  },
  analytical: {
    id: 'analytical',
    name: 'Analytical Reasoner',
    type: 'analytical',
    specialization: 'Logical analysis and structured reasoning',
    weight: 1.0,
    systemPrompt: 'You are an analytical reasoner. Break down problems systematically.',
    parameters: { temperature: 0.3 },
  },
  critical: {
    id: 'critical',
    name: 'Critical Evaluator',
    type: 'critical',
    specialization: 'Identifying flaws and potential issues',
    weight: 1.0,
    systemPrompt: 'You are a critical evaluator. Identify weaknesses and potential problems.',
    parameters: { temperature: 0.4 },
  },
  factual: {
    id: 'factual',
    name: 'Fact Checker',
    type: 'factual',
    specialization: 'Accuracy and factual correctness',
    weight: 1.2,
    systemPrompt: 'You prioritize factual accuracy. Verify claims and cite sources.',
    parameters: { temperature: 0.2 },
  },
  synthesizer: {
    id: 'synthesizer',
    name: 'Response Synthesizer',
    type: 'synthesizer',
    specialization: 'Combining multiple perspectives into coherent response',
    weight: 1.5,
    systemPrompt: 'You synthesize multiple viewpoints into a comprehensive, balanced response.',
    parameters: { temperature: 0.5 },
  },
};

/**
 * デフォルト設定
 */
export const DEFAULT_MOA_CONFIG: MoAConfig = {
  defaultStrategy: 'synthesis' as AggregationStrategy,
  maxRounds: 3,
  minAgents: 3,
  maxAgents: 5,
  timeout: 120000, // 2分
  earlyTermination: true,
  consensusThreshold: 0.9,
  verbose: false,
};
