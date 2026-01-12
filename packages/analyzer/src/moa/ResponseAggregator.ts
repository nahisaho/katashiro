/**
 * ResponseAggregator - エージェントレスポンスの統合
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import type {
  AgentResponse,
  AggregationStrategy,
  AggregationResult,
} from './types.js';

/**
 * 複数のエージェントレスポンスを統合
 */
export class ResponseAggregator {
  /**
   * レスポンスを統合
   */
  async aggregate(
    responses: AgentResponse[],
    strategy: AggregationStrategy,
    task: string
  ): Promise<AggregationResult> {
    switch (strategy) {
      case 'majority_vote':
        return this.majorityVote(responses);
      case 'weighted_average':
        return this.weightedAverage(responses);
      case 'best_of_n':
        return this.bestOfN(responses);
      case 'synthesis':
        return this.synthesize(responses, task);
      case 'debate':
        return this.debate(responses, task);
      case 'hierarchical':
        return this.hierarchical(responses, task);
      default:
        return this.synthesize(responses, task);
    }
  }

  /**
   * 多数決方式
   */
  private majorityVote(responses: AgentResponse[]): AggregationResult {
    // 最も多く選ばれた回答を返す（類似度ベース）
    const votes = new Map<number, number>();

    for (let i = 0; i < responses.length; i++) {
      votes.set(i, 0);
      for (let j = 0; j < responses.length; j++) {
        if (i !== j) {
          const similarity = this.calculateSimilarity(
            responses[i]!.response,
            responses[j]!.response
          );
          if (similarity > 0.5) {
            votes.set(i, (votes.get(i) || 0) + 1);
          }
        }
      }
    }

    const entries = [...votes.entries()].sort((a, b) => b[1] - a[1]);
    const winnerIndex = entries[0]?.[0] ?? 0;

    return {
      response: responses[winnerIndex]!.response,
      selectedResponses: [responses[winnerIndex]!],
    };
  }

  /**
   * 重み付き平均方式
   */
  private weightedAverage(responses: AgentResponse[]): AggregationResult {
    // 自己評価とピア評価で重み付けして最良を選択
    const scored = responses
      .map(r => ({
        response: r,
        score: this.calculateWeightedScore(r),
      }))
      .sort((a, b) => b.score - a.score);

    return {
      response: scored[0]!.response.response,
      selectedResponses: [scored[0]!.response],
    };
  }

  /**
   * Best of N 方式
   */
  private bestOfN(responses: AgentResponse[]): AggregationResult {
    // 最高スコアの回答を選択
    const scored = responses
      .map(r => ({
        response: r,
        score: this.scoreResponse(r),
      }))
      .sort((a, b) => b.score - a.score);

    return {
      response: scored[0]!.response.response,
      selectedResponses: [scored[0]!.response],
    };
  }

  /**
   * 統合方式
   */
  private synthesize(
    responses: AgentResponse[],
    _task: string
  ): AggregationResult {
    // 全ての回答からキーポイントを抽出して統合
    const allPoints = responses.flatMap(r =>
      r.response.split(/[.!?]+/).filter(s => s.trim().length > 20)
    );

    // 重複を除去してキーポイントを抽出
    const uniquePoints = this.deduplicatePoints(allPoints).slice(0, 10);

    // 統合された回答を構築
    const synthesized = this.buildSynthesizedResponse(responses, uniquePoints);

    return {
      response: synthesized,
      selectedResponses: responses,
    };
  }

  /**
   * 討論方式
   */
  private debate(
    responses: AgentResponse[],
    _task: string
  ): AggregationResult {
    // 討論形式で最終回答を導出
    const positions = responses.map(r => ({
      agent: r.agentName,
      position: r.response.slice(0, 300),
    }));

    // 各エージェントの立場をまとめる
    let debateSummary = `After considering ${responses.length} different perspectives:\n\n`;

    positions.forEach((p, i) => {
      debateSummary += `**${p.agent}**: ${p.position}${p.position.length >= 300 ? '...' : ''}\n\n`;
      if (i < positions.length - 1) {
        debateSummary += '---\n\n';
      }
    });

    // 結論を追加
    const commonPoints = this.findCommonPoints(responses);
    debateSummary += `**Conclusion**: `;
    if (commonPoints.length > 0) {
      debateSummary += `The agents agree on several key points: ${commonPoints.slice(0, 3).join('; ')}. `;
    }
    debateSummary += `Considering all perspectives, a balanced view incorporates insights from each approach while acknowledging their limitations.`;

    return {
      response: debateSummary,
      selectedResponses: responses,
    };
  }

  /**
   * 階層的統合方式
   */
  private hierarchical(
    responses: AgentResponse[],
    task: string
  ): AggregationResult {
    if (responses.length <= 2) {
      return this.synthesize(responses, task);
    }

    // ペアワイズ統合
    const pairs: AgentResponse[][] = [];
    for (let i = 0; i < responses.length; i += 2) {
      const pair = responses.slice(i, Math.min(i + 2, responses.length));
      pairs.push(pair);
    }

    // 各ペアを統合
    const intermediateResponses = pairs.map((pair, index) => {
      const pairSynthesis = this.synthesize(pair, task);
      return {
        agentId: `intermediate-${index}`,
        agentName: `Intermediate Synthesis ${index + 1}`,
        response: pairSynthesis.response,
        processingTime: 0,
      };
    });

    // 中間結果を最終統合
    return this.synthesize(intermediateResponses, task);
  }

  /**
   * 類似度を計算
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    let intersection = 0;
    words1.forEach(w => {
      if (words2.has(w)) intersection++;
    });

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 重み付きスコアを計算
   */
  private calculateWeightedScore(response: AgentResponse): number {
    let score = response.selfScore || 0.5;

    // ピア評価の平均
    if (response.peerScores && response.peerScores.length > 0) {
      const avgPeer = response.peerScores.reduce((sum, p) => sum + p.score, 0)
        / response.peerScores.length;
      score = score * 0.6 + avgPeer * 0.4;
    }

    return score;
  }

  /**
   * レスポンスをスコアリング
   */
  private scoreResponse(response: AgentResponse): number {
    let score = 0.5;

    // 自己評価スコア
    if (response.selfScore) {
      score += response.selfScore * 0.3;
    }

    // ピア評価の平均
    if (response.peerScores && response.peerScores.length > 0) {
      const avgPeer = response.peerScores.reduce((sum, p) => sum + p.score, 0)
        / response.peerScores.length;
      score += avgPeer * 0.2;
    }

    // 回答の長さ（適度な長さを評価）
    const lengthScore = Math.min(response.response.length / 1000, 1) * 0.1;
    score += lengthScore;

    return Math.min(score, 1);
  }

  /**
   * ポイントの重複を除去
   */
  private deduplicatePoints(points: string[]): string[] {
    const unique: string[] = [];

    for (const point of points) {
      const trimmed = point.trim();
      if (trimmed.length < 20) continue;

      // 既存のポイントと類似していないか確認
      const isDuplicate = unique.some(
        u => this.calculateSimilarity(u, trimmed) > 0.6
      );

      if (!isDuplicate) {
        unique.push(trimmed);
      }
    }

    return unique;
  }

  /**
   * 統合レスポンスを構築
   */
  private buildSynthesizedResponse(
    responses: AgentResponse[],
    keyPoints: string[]
  ): string {
    let synthesized = 'Based on multiple perspectives:\n\n';

    // キーポイントを箇条書きで追加
    keyPoints.forEach(point => {
      synthesized += `• ${point.trim()}\n`;
    });

    synthesized += '\n';

    // サマリーを追加
    synthesized += '**Summary**: ';
    if (keyPoints.length > 0) {
      const topPoints = keyPoints.slice(0, 3).map(p => p.trim().slice(0, 60));
      synthesized += `The key aspects include: ${topPoints.join('; ')}. `;
    }

    // 貢献したエージェントを記載
    const agentNames = responses.map(r => r.agentName).join(', ');
    synthesized += `This synthesis incorporates insights from: ${agentNames}.`;

    return synthesized;
  }

  /**
   * 共通ポイントを見つける
   */
  private findCommonPoints(responses: AgentResponse[]): string[] {
    if (responses.length < 2) return [];

    const allSentences = responses.map(r =>
      r.response.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20)
    );

    const commonPoints: string[] = [];

    // 最初のレスポンスの文を基準に共通点を探す
    for (const sentence of allSentences[0] || []) {
      const keywords = sentence.split(/\s+/).filter(w => w.length > 4);
      
      // 他のレスポンスにも類似の内容があるか確認
      let matchCount = 0;
      for (let i = 1; i < allSentences.length; i++) {
        const otherSentences = allSentences[i] || [];
        for (const other of otherSentences) {
          const matchingKeywords = keywords.filter(k => other.includes(k));
          if (matchingKeywords.length >= 2) {
            matchCount++;
            break;
          }
        }
      }

      // 半数以上のエージェントで共通していれば追加
      if (matchCount >= responses.length / 2) {
        commonPoints.push(sentence);
      }
    }

    return commonPoints.slice(0, 5);
  }
}
