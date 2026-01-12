/**
 * AgentOrchestrator - エージェントの実行オーケストレーション
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import type { AgentConfig, AgentResponse } from './types.js';

/**
 * LLMプロバイダーインターフェース
 */
export interface LLMProvider {
  generate(prompt: string, config?: AgentConfig): Promise<string>;
}

/**
 * エージェントの実行を管理
 */
export class AgentOrchestrator {
  private llmProvider?: LLMProvider;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * LLMプロバイダーを設定
   */
  setProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * 複数のエージェントを並列実行
   */
  async execute(
    agents: AgentConfig[],
    task: string,
    context?: string,
    _timeout?: number
  ): Promise<AgentResponse[]> {
    const startTime = Date.now();

    // 並列実行
    const responsePromises = agents.map(async (agent) => {
      const agentStartTime = Date.now();

      try {
        const response = await this.executeAgent(agent, task, context);
        
        return {
          agentId: agent.id,
          agentName: agent.name,
          response,
          selfScore: this.estimateSelfScore(response, agent),
          processingTime: Date.now() - agentStartTime,
        };
      } catch (error) {
        // エラーの場合はデフォルトレスポンス
        return {
          agentId: agent.id,
          agentName: agent.name,
          response: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          selfScore: 0,
          processingTime: Date.now() - agentStartTime,
        };
      }
    });

    const responses = await Promise.all(responsePromises);

    // ピア評価を追加（オプション）
    const withPeerScores = this.addPeerScores(responses);

    // 総処理時間のログ（verbose時）
    const totalTime = Date.now() - startTime;
    console.debug(`AgentOrchestrator: Executed ${agents.length} agents in ${totalTime}ms`);

    return withPeerScores;
  }

  /**
   * 単一エージェントを実行
   */
  private async executeAgent(
    agent: AgentConfig,
    task: string,
    context?: string
  ): Promise<string> {
    const prompt = this.buildPrompt(agent, task, context);

    if (this.llmProvider) {
      return await this.llmProvider.generate(prompt, agent);
    }

    // LLMプロバイダーがない場合はシミュレーション
    return this.simulateResponse(agent, task);
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(agent: AgentConfig, task: string, context?: string): string {
    let prompt = '';

    // システムプロンプト
    if (agent.systemPrompt) {
      prompt += `System: ${agent.systemPrompt}\n\n`;
    }

    // コンテキスト
    if (context) {
      prompt += `Context:\n${context}\n\n`;
    }

    // タスク
    prompt += `Task: ${task}\n\n`;

    // エージェント固有の指示
    prompt += `As a ${agent.name} (${agent.specialization || agent.type}), please provide your perspective on this task.`;

    return prompt;
  }

  /**
   * レスポンスをシミュレート（LLMプロバイダーがない場合）
   */
  private simulateResponse(agent: AgentConfig, task: string): string {
    const taskWords = task.split(/\s+/).slice(0, 10).join(' ');
    
    const responses: Record<string, string> = {
      creative: `From a creative perspective on "${taskWords}...": I see several innovative approaches. First, we could explore unconventional solutions that challenge traditional assumptions. Consider leveraging emerging technologies or combining disparate concepts for a novel approach. The key is to think beyond conventional boundaries and embrace experimentation.`,
      analytical: `Analyzing "${taskWords}...": Let me break this down systematically. The core components include: 1) The primary question or objective, 2) Key variables and constraints, 3) Potential approaches and their tradeoffs. A structured analysis reveals that the most effective approach would involve careful consideration of all factors.`,
      critical: `Critically evaluating "${taskWords}...": Several potential issues deserve attention. First, there may be hidden assumptions that need validation. Second, we should consider edge cases and failure modes. Third, the proposed solution might have unintended consequences. I recommend addressing these concerns before proceeding.`,
      factual: `Regarding the factual aspects of "${taskWords}...": Based on available evidence, the key facts are: 1) Established research supports certain approaches, 2) Data indicates specific trends, 3) Expert consensus aligns with particular conclusions. It's important to verify claims and consult authoritative sources.`,
      synthesizer: `Synthesizing perspectives on "${taskWords}...": Combining multiple viewpoints reveals a balanced understanding. Creative approaches offer innovation potential, analytical thinking provides structure, critical evaluation identifies risks, and factual grounding ensures accuracy. An integrated approach leverages all these strengths.`,
    };

    return responses[agent.type] || responses.analytical!;
  }

  /**
   * 自己評価スコアを推定
   */
  private estimateSelfScore(response: string, agent: AgentConfig): number {
    let score = 0.5;

    // レスポンスの長さ
    if (response.length > 200) {
      score += 0.1;
    }
    if (response.length > 500) {
      score += 0.1;
    }

    // 構造化されているか（番号付きリストなど）
    if (/\d+\)|[1-9]\./g.test(response)) {
      score += 0.1;
    }

    // エージェントの重み
    score += (agent.weight || 1.0) * 0.1;

    return Math.min(score, 1);
  }

  /**
   * ピア評価を追加
   */
  private addPeerScores(responses: AgentResponse[]): AgentResponse[] {
    return responses.map((response, index) => {
      const peerScores = responses
        .filter((_, i) => i !== index)
        .map((peer) => ({
          evaluatorId: peer.agentId,
          score: this.calculatePeerScore(response.response, peer.response),
        }));

      return {
        ...response,
        peerScores,
      };
    });
  }

  /**
   * ピアスコアを計算
   */
  private calculatePeerScore(response: string, peerResponse: string): number {
    // 類似度に基づくスコア（類似していると高スコア）
    const words1 = new Set(response.toLowerCase().split(/\s+/));
    const words2 = new Set(peerResponse.toLowerCase().split(/\s+/));

    let overlap = 0;
    words1.forEach(w => {
      if (words2.has(w)) overlap++;
    });

    const similarity = overlap / Math.max(words1.size, words2.size);
    
    // 適度な類似度が望ましい（完全一致は良くない）
    if (similarity > 0.8) {
      return 0.6; // 類似しすぎ
    } else if (similarity > 0.3) {
      return 0.8; // 適度な一致
    } else {
      return 0.5; // 異なる視点
    }
  }
}
