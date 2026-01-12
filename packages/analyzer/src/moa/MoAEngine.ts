/**
 * MoAEngine - Mixture of Agents エンジン
 *
 * 複数のAIエージェントを協調動作させ、
 * 多角的な視点からの分析・回答を生成する
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import type {
  MoARequest,
  MoAResult,
  MoAConfig,
  AgentConfig,
  AgentResponse,
  AggregationStrategy,
  RoundResult,
  MoAMetadata,
  AggregationDetails,
  AgentContribution,
} from './types.js';
import { AGENT_PRESETS, DEFAULT_MOA_CONFIG } from './types.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentOrchestrator, type LLMProvider } from './AgentOrchestrator.js';
import { ResponseAggregator } from './ResponseAggregator.js';
import { ConsensusCalculator } from './ConsensusCalculator.js';

/**
 * MoAエンジンオプション
 */
export interface MoAEngineOptions {
  /** LLMプロバイダー */
  llmProvider?: LLMProvider;
  /** 設定 */
  config?: Partial<MoAConfig>;
}

/**
 * Mixture of Agents エンジン
 */
export class MoAEngine {
  private config: MoAConfig;
  private taskAnalyzer: TaskAnalyzer;
  private orchestrator: AgentOrchestrator;
  private aggregator: ResponseAggregator;
  private consensusCalculator: ConsensusCalculator;

  /** エージェントプリセット */
  static readonly presets = AGENT_PRESETS;

  constructor(options: MoAEngineOptions = {}) {
    this.config = { ...DEFAULT_MOA_CONFIG, ...options.config };
    this.taskAnalyzer = new TaskAnalyzer();
    this.orchestrator = new AgentOrchestrator(options.llmProvider);
    this.aggregator = new ResponseAggregator();
    this.consensusCalculator = new ConsensusCalculator();
  }

  /**
   * MoA処理を実行
   *
   * @param request MoAリクエスト
   * @returns MoA結果
   */
  async process(request: MoARequest): Promise<MoAResult> {
    const startTime = Date.now();
    const requestConfig = { ...this.config, ...request.config };

    // タスク分析
    const taskAnalysis = this.taskAnalyzer.analyze(request.task);

    // エージェント選択
    const agents = this.selectAgents(request.agents, taskAnalysis.recommendedAgents);

    // マルチラウンド処理
    const rounds: RoundResult[] = [];
    let allResponses: AgentResponse[] = [];
    let finalConsensus = 0;

    for (let round = 1; round <= requestConfig.maxRounds; round++) {
      // ラウンドコンテキストを構築
      const roundContext = this.buildRoundContext(request.task, request.context, rounds);

      // エージェント実行
      const responses = await this.orchestrator.execute(agents, roundContext);
      allResponses = responses;

      // 合意度を計算
      const consensus = this.consensusCalculator.calculate(responses);
      finalConsensus = consensus;

      // ラウンド結果を記録
      rounds.push({
        roundNumber: round,
        responses,
        consensus,
        improvements: round > 1 ? this.identifyImprovements(rounds) : [],
      });

      // 早期終了条件のチェック
      if (requestConfig.earlyTermination && consensus >= requestConfig.consensusThreshold) {
        break;
      }
    }

    // レスポンス集約
    const strategy = request.strategy || requestConfig.defaultStrategy;
    const aggregationResult = await this.aggregator.aggregate(allResponses, strategy, request.task);

    // メタデータを構築
    const metadata = this.buildMetadata(
      startTime,
      agents,
      rounds,
      finalConsensus,
      strategy,
      aggregationResult.details
    );

    return {
      response: aggregationResult.response,
      confidence: this.calculateConfidence(agents.length, finalConsensus, aggregationResult.details),
      consensus: finalConsensus,
      agentResponses: allResponses,
      metadata,
    };
  }

  /**
   * 単純投票モードで処理
   *
   * @param request MoAリクエスト
   * @returns MoA結果
   */
  async vote(request: MoARequest): Promise<MoAResult> {
    return this.process({
      ...request,
      strategy: 'majority_vote',
      config: { ...request.config, maxRounds: 1 },
    });
  }

  /**
   * ディベートモードで処理
   *
   * @param request MoAリクエスト
   * @param maxRounds 最大ラウンド数
   * @returns MoA結果
   */
  async debate(request: MoARequest, maxRounds: number = 3): Promise<MoAResult> {
    return this.process({
      ...request,
      strategy: 'debate',
      config: { ...request.config, maxRounds },
    });
  }

  /**
   * エージェントを選択
   */
  private selectAgents(
    requestedAgents: AgentConfig[] | undefined,
    recommendedTypes: string[]
  ): AgentConfig[] {
    if (requestedAgents && requestedAgents.length > 0) {
      return requestedAgents;
    }

    // 推奨タイプからエージェントを選択
    const agents: AgentConfig[] = [];
    const usedTypes = new Set<string>();

    for (const type of recommendedTypes) {
      if (usedTypes.has(type)) continue;

      const preset = AGENT_PRESETS[type as keyof typeof AGENT_PRESETS];
      if (preset) {
        agents.push(preset);
        usedTypes.add(type);
      }
    }

    // 最低3エージェントを確保
    if (agents.length < 3) {
      const defaultTypes = ['analytical', 'creative', 'critical'];
      for (const type of defaultTypes) {
        if (!usedTypes.has(type)) {
          const preset = AGENT_PRESETS[type as keyof typeof AGENT_PRESETS];
          if (preset) {
            agents.push(preset);
            usedTypes.add(type);
          }
        }
        if (agents.length >= 3) break;
      }
    }

    return agents;
  }

  /**
   * ラウンドコンテキストを構築
   */
  private buildRoundContext(
    task: string,
    context: string | undefined,
    previousRounds: RoundResult[]
  ): string {
    let roundContext = task;

    if (context) {
      roundContext = `Context: ${context}\n\nTask: ${task}`;
    }

    if (previousRounds.length > 0) {
      const lastRound = previousRounds[previousRounds.length - 1]!;
      const summaries = lastRound.responses
        .map(r => `[${r.agentName}]: ${r.response.substring(0, 200)}...`)
        .join('\n');

      roundContext += `\n\n--- Previous Round Perspectives ---\n${summaries}\n\nPlease consider these perspectives and provide an improved response.`;
    }

    return roundContext;
  }

  /**
   * 改善点を特定
   */
  private identifyImprovements(rounds: RoundResult[]): string[] {
    if (rounds.length < 2) return [];

    const current = rounds[rounds.length - 1]!;
    const previous = rounds[rounds.length - 2]!;

    const improvements: string[] = [];

    // 合意度の変化
    const consensusChange = current.consensus - previous.consensus;
    if (consensusChange > 0.1) {
      improvements.push(`Consensus improved by ${(consensusChange * 100).toFixed(1)}%`);
    }

    // 新しい視点の追加
    const currentKeywords = this.extractAllKeywords(current.responses);
    const previousKeywords = this.extractAllKeywords(previous.responses);
    const newKeywords = [...currentKeywords].filter(k => !previousKeywords.has(k));

    if (newKeywords.length > 0) {
      improvements.push(`New perspectives added: ${newKeywords.slice(0, 3).join(', ')}`);
    }

    return improvements;
  }

  /**
   * 全レスポンスからキーワードを抽出
   */
  private extractAllKeywords(responses: AgentResponse[]): Set<string> {
    const keywords = new Set<string>();
    for (const response of responses) {
      const words = response.response.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);
      words.forEach(w => keywords.add(w));
    }
    return keywords;
  }

  /**
   * メタデータを構築
   */
  private buildMetadata(
    startTime: number,
    agents: AgentConfig[],
    rounds: RoundResult[],
    _consensus: number,
    strategy: AggregationStrategy,
    aggregationDetails?: AggregationDetails
  ): MoAMetadata {
    const totalTokens = rounds.reduce((sum, round) => {
      return sum + round.responses.reduce((rSum: number, r: AgentResponse) => {
        return rSum + (r.tokenUsage?.total || 0);
      }, 0);
    }, 0);

    return {
      totalRounds: rounds.length,
      totalAgents: agents.length,
      aggregationStrategy: strategy,
      consensusHistory: rounds.map(r => r.consensus),
      tokenUsage: {
        prompt: Math.floor(totalTokens * 0.3),
        completion: Math.floor(totalTokens * 0.7),
        total: totalTokens,
      },
      processingTime: Date.now() - startTime,
      aggregationDetails: aggregationDetails || {
        strategy,
        participatingAgents: agents.map(a => a.name),
        contributions: this.calculateContributions(rounds),
      },
    };
  }

  /**
   * 貢献度を計算
   */
  private calculateContributions(rounds: RoundResult[]): AgentContribution[] {
    const contributionMap = new Map<string, { influence: number; keyPoints: string[] }>();

    for (const round of rounds) {
      for (const response of round.responses) {
        const existing = contributionMap.get(response.agentName) || {
          influence: 0,
          keyPoints: [],
        };

        // 影響度を加算（selfScoreを使用）
        existing.influence += response.selfScore || 0.5;

        // キーポイントを抽出
        const sentences = response.response.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
        if (sentences.length > 0) {
          existing.keyPoints.push(sentences[0]!.trim());
        }

        contributionMap.set(response.agentName, existing);
      }
    }

    // 正規化
    const maxInfluence = Math.max(...[...contributionMap.values()].map(v => v.influence));

    return [...contributionMap.entries()].map(([agentId, data]) => ({
      agentId,
      influence: maxInfluence > 0 ? data.influence / maxInfluence : 0,
      keyPoints: [...new Set(data.keyPoints)].slice(0, 3),
    }));
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    agentCount: number,
    consensus: number,
    details?: AggregationDetails
  ): number {
    // ベース信頼度
    let confidence = 0.5;

    // エージェント数による調整（3以上で加点）
    if (agentCount >= 3) {
      confidence += 0.1;
    }
    if (agentCount >= 5) {
      confidence += 0.1;
    }

    // 合意度による調整
    confidence += consensus * 0.2;

    // 貢献の均等さによる調整
    if (details?.contributions && details.contributions.length > 1) {
      const influences = details.contributions.map(c => c.influence);
      const avgInfluence = influences.reduce((s, i) => s + i, 0) / influences.length;
      const variance = influences.reduce((s, i) => s + Math.pow(i - avgInfluence, 2), 0) / influences.length;
      const uniformity = Math.max(0, 1 - variance * 2);
      confidence += uniformity * 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 合意分析を実行
   */
  analyzeConsensus(responses: AgentResponse[]) {
    return this.consensusCalculator.analyzeConsensus(responses);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<MoAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): MoAConfig {
    return { ...this.config };
  }
}

// デフォルトエクスポート
export default MoAEngine;
