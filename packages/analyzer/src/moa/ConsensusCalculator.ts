/**
 * ConsensusCalculator - エージェント間の合意度を計算
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import type { AgentResponse } from './types.js';

/**
 * エージェント間の合意度を計算
 */
export class ConsensusCalculator {
  /**
   * レスポンス間の合意度を計算
   */
  calculate(responses: AgentResponse[]): number {
    if (responses.length < 2) {
      return 1.0; // 1つ以下のレスポンスは完全合意とみなす
    }

    // ペアワイズ類似度の平均
    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculatePairwiseSimilarity(
          responses[i]!.response,
          responses[j]!.response
        );
        totalSimilarity += similarity;
        pairCount++;
      }
    }

    const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

    // ピア評価の一貫性も考慮
    const peerConsistency = this.calculatePeerConsistency(responses);

    // 最終的な合意度（類似度60%、ピア一貫性40%）
    return avgSimilarity * 0.6 + peerConsistency * 0.4;
  }

  /**
   * 詳細な合意分析を実行
   */
  analyzeConsensus(responses: AgentResponse[]): ConsensusAnalysis {
    const consensusScore = this.calculate(responses);

    // 合意レベルを判定
    let level: ConsensusLevel;
    if (consensusScore >= 0.8) {
      level = 'high';
    } else if (consensusScore >= 0.5) {
      level = 'moderate';
    } else if (consensusScore >= 0.3) {
      level = 'low';
    } else {
      level = 'none';
    }

    // 合意点と不一致点を特定
    const { agreedTopics, disagreedTopics } = this.identifyTopics(responses);

    // 最も合意が取れているエージェントペアを特定
    const mostAgreedPair = this.findMostAgreedPair(responses);

    // 最も意見が分かれているエージェントペアを特定
    const mostDisagreedPair = this.findMostDisagreedPair(responses);

    return {
      score: consensusScore,
      level,
      agreedTopics,
      disagreedTopics,
      mostAgreedPair,
      mostDisagreedPair,
      recommendation: this.generateRecommendation(level, responses.length),
    };
  }

  /**
   * ペアワイズ類似度を計算
   */
  private calculatePairwiseSimilarity(text1: string, text2: string): number {
    // 単語ベースのJaccard類似度
    const words1 = this.extractKeywords(text1);
    const words2 = this.extractKeywords(text2);

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // N-gramベースの類似度
    const ngrams1 = this.extractNgrams(text1, 3);
    const ngrams2 = this.extractNgrams(text2, 3);

    const ngramIntersection = new Set([...ngrams1].filter(n => ngrams2.has(n)));
    const ngramUnion = new Set([...ngrams1, ...ngrams2]);

    const ngramSimilarity = ngramUnion.size > 0 ? ngramIntersection.size / ngramUnion.size : 0;

    // 両方の類似度を組み合わせ
    return jaccardSimilarity * 0.6 + ngramSimilarity * 0.4;
  }

  /**
   * ピア評価の一貫性を計算
   */
  private calculatePeerConsistency(responses: AgentResponse[]): number {
    const peerScores: number[] = [];

    for (const response of responses) {
      if (response.peerScores && response.peerScores.length > 0) {
        const avgPeerScore = response.peerScores.reduce((sum, p) => sum + p.score, 0)
          / response.peerScores.length;
        peerScores.push(avgPeerScore);
      }
    }

    if (peerScores.length < 2) {
      return 0.5; // デフォルト
    }

    // 標準偏差が小さいほど一貫性が高い
    const mean = peerScores.reduce((sum, s) => sum + s, 0) / peerScores.length;
    const variance = peerScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / peerScores.length;
    const stdDev = Math.sqrt(variance);

    // 標準偏差を0-1のスコアに変換（低いほど高スコア）
    return Math.max(0, 1 - stdDev * 2);
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): Set<string> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // ストップワードを除去（簡易版）
    const stopWords = new Set([
      'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they',
      'their', 'what', 'when', 'where', 'which', 'will', 'would', 'could',
      'should', 'about', 'there', 'these', 'those', 'other', 'some', 'very',
    ]);

    return new Set(words.filter(w => !stopWords.has(w)));
  }

  /**
   * N-gramを抽出
   */
  private extractNgrams(text: string, n: number): Set<string> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const ngrams = new Set<string>();
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }

    return ngrams;
  }

  /**
   * 合意点と不一致点を特定
   */
  private identifyTopics(responses: AgentResponse[]): {
    agreedTopics: string[];
    disagreedTopics: string[];
  } {
    // 全レスポンスからキーワードを抽出
    const keywordCounts = new Map<string, number>();

    for (const response of responses) {
      const keywords = this.extractKeywords(response.response);
      keywords.forEach(k => {
        keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
      });
    }

    // 出現頻度でソート
    const sortedKeywords = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1]);

    // 全員が言及しているキーワード = 合意点
    const agreedTopics = sortedKeywords
      .filter(([_, count]) => count >= responses.length * 0.8)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    // 一部のみが言及しているキーワード = 不一致点の可能性
    const disagreedTopics = sortedKeywords
      .filter(([_, count]) => count >= 1 && count <= responses.length * 0.3)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    return { agreedTopics, disagreedTopics };
  }

  /**
   * 最も合意が取れているペアを見つける
   */
  private findMostAgreedPair(responses: AgentResponse[]): [string, string] | null {
    if (responses.length < 2) return null;

    let maxSimilarity = -1;
    let mostAgreedPair: [string, string] | null = null;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculatePairwiseSimilarity(
          responses[i]!.response,
          responses[j]!.response
        );
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostAgreedPair = [responses[i]!.agentName, responses[j]!.agentName];
        }
      }
    }

    return mostAgreedPair;
  }

  /**
   * 最も意見が分かれているペアを見つける
   */
  private findMostDisagreedPair(responses: AgentResponse[]): [string, string] | null {
    if (responses.length < 2) return null;

    let minSimilarity = 2;
    let mostDisagreedPair: [string, string] | null = null;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculatePairwiseSimilarity(
          responses[i]!.response,
          responses[j]!.response
        );
        if (similarity < minSimilarity) {
          minSimilarity = similarity;
          mostDisagreedPair = [responses[i]!.agentName, responses[j]!.agentName];
        }
      }
    }

    return mostDisagreedPair;
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendation(level: ConsensusLevel, agentCount: number): string {
    switch (level) {
      case 'high':
        return 'High consensus achieved. The synthesized response is reliable.';
      case 'moderate':
        return 'Moderate consensus. Consider reviewing individual agent responses for nuances.';
      case 'low':
        return `Low consensus among ${agentCount} agents. Additional rounds or more agents may help.`;
      case 'none':
        return 'No consensus. The task may be subjective or require clarification.';
    }
  }
}

/**
 * 合意レベル
 */
export type ConsensusLevel = 'high' | 'moderate' | 'low' | 'none';

/**
 * 合意分析結果
 */
export interface ConsensusAnalysis {
  /** 合意スコア (0-1) */
  score: number;
  /** 合意レベル */
  level: ConsensusLevel;
  /** 合意が取れているトピック */
  agreedTopics: string[];
  /** 意見が分かれているトピック */
  disagreedTopics: string[];
  /** 最も合意が取れているペア */
  mostAgreedPair: [string, string] | null;
  /** 最も意見が分かれているペア */
  mostDisagreedPair: [string, string] | null;
  /** 推奨事項 */
  recommendation: string;
}
