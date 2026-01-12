/**
 * ConsistencyChecker - エビデンスの一貫性チェック
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type {
  Evidence,
  ExtractedClaim,
  ClaimVerification,
  EvidenceRelation,
} from './types.js';

/**
 * 一貫性チェックの結果
 */
export interface ConsistencyResult {
  /** 一貫性スコア (0-1) */
  score: number;
  /** 支持するエビデンス数 */
  supportingCount: number;
  /** 矛盾するエビデンス数 */
  contradictingCount: number;
  /** 主な矛盾点 */
  contradictions: string[];
  /** 分析メモ */
  notes: string[];
}

/**
 * エビデンス間の一貫性をチェックするクラス
 */
export class ConsistencyChecker {
  /**
   * エビデンスの一貫性をチェック
   */
  check(_claim: ExtractedClaim, evidence: Evidence[]): ConsistencyResult {
    if (evidence.length === 0) {
      return {
        score: 0,
        supportingCount: 0,
        contradictingCount: 0,
        contradictions: [],
        notes: ['No evidence available for consistency check'],
      };
    }

    // エビデンスを関係性で分類
    const supporting = evidence.filter(e => 
      e.relation === 'supports' || e.relation === 'partially_supports'
    );
    const contradicting = evidence.filter(e => e.relation === 'contradicts');
    const neutral = evidence.filter(e => 
      e.relation === 'neutral' || e.relation === 'context'
    );

    // 一貫性スコアを計算
    const score = this.calculateConsistencyScore(
      supporting.length,
      contradicting.length,
      neutral.length,
      evidence
    );

    // 矛盾点を特定
    const contradictions = this.identifyContradictions(supporting, contradicting);

    // 分析メモを生成
    const notes = this.generateNotes(supporting, contradicting, neutral, score);

    return {
      score,
      supportingCount: supporting.length,
      contradictingCount: contradicting.length,
      contradictions,
      notes,
    };
  }

  /**
   * 主張の検証結果を生成
   */
  verify(claim: ExtractedClaim, evidence: Evidence[]): ClaimVerification {
    const consistency = this.check(claim, evidence);

    // 検証結果を判定
    let verified: boolean | null;
    
    if (evidence.length === 0) {
      verified = null;
    } else if (consistency.supportingCount > 0 && consistency.contradictingCount === 0) {
      verified = true;
    } else if (consistency.contradictingCount > 0 && consistency.supportingCount === 0) {
      verified = false;
    } else if (consistency.score > 0.7) {
      verified = true;
    } else if (consistency.score < 0.3) {
      verified = false;
    } else {
      verified = null;
    }

    return {
      claim,
      verified,
      evidence,
      notes: consistency.notes,
    };
  }

  /**
   * 複数のエビデンス間の相互一貫性をチェック
   */
  checkMutualConsistency(evidence: Evidence[]): number {
    if (evidence.length < 2) {
      return 1.0;
    }

    let consistentPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        totalPairs++;
        if (this.areConsistent(evidence[i]!, evidence[j]!)) {
          consistentPairs++;
        }
      }
    }

    return totalPairs > 0 ? consistentPairs / totalPairs : 1.0;
  }

  /**
   * 2つのエビデンスが一貫しているかチェック
   */
  private areConsistent(e1: Evidence, e2: Evidence): boolean {
    // 両方が支持または両方が矛盾なら一貫
    if (e1.relation === e2.relation) {
      return true;
    }

    // 一方が支持、他方が矛盾なら非一貫
    const supportRelations: EvidenceRelation[] = ['supports', 'partially_supports'];
    const isE1Supporting = supportRelations.includes(e1.relation);
    const isE2Supporting = supportRelations.includes(e2.relation);
    const isE1Contradicting = e1.relation === 'contradicts';
    const isE2Contradicting = e2.relation === 'contradicts';

    if ((isE1Supporting && isE2Contradicting) || (isE1Contradicting && isE2Supporting)) {
      return false;
    }

    // それ以外は一貫とみなす
    return true;
  }

  /**
   * 一貫性スコアを計算
   */
  private calculateConsistencyScore(
    supporting: number,
    contradicting: number,
    neutral: number,
    evidence: Evidence[]
  ): number {
    const total = supporting + contradicting + neutral;
    
    if (total === 0) {
      return 0;
    }

    // 基本スコア: 支持エビデンスの割合
    let score = supporting / total;

    // 矛盾があればペナルティ
    if (contradicting > 0) {
      const contradictionPenalty = Math.min(0.3, contradicting * 0.1);
      score = score - contradictionPenalty;
    }

    // 信頼性の高いソースからの支持にボーナス
    const highCredibilitySupporting = evidence.filter(
      e => (e.relation === 'supports' || e.relation === 'partially_supports') &&
           e.credibilityScore > 0.8
    ).length;
    
    if (highCredibilitySupporting > 0) {
      score = Math.min(1.0, score + highCredibilitySupporting * 0.05);
    }

    // 相互一貫性をチェック
    const mutualConsistency = this.checkMutualConsistency(evidence);
    score = score * 0.7 + mutualConsistency * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 矛盾点を特定
   */
  private identifyContradictions(
    supporting: Evidence[],
    contradicting: Evidence[]
  ): string[] {
    const contradictions: string[] = [];

    if (supporting.length > 0 && contradicting.length > 0) {
      // 支持と矛盾が混在している場合
      for (const contra of contradicting) {
        for (const support of supporting) {
          contradictions.push(
            `"${support.sourceName}" supports the claim, but "${contra.sourceName}" contradicts it.`
          );
        }
      }
    }

    // 重複を除去して返す
    return [...new Set(contradictions)].slice(0, 5);
  }

  /**
   * 分析メモを生成
   */
  private generateNotes(
    supporting: Evidence[],
    contradicting: Evidence[],
    neutral: Evidence[],
    score: number
  ): string[] {
    const notes: string[] = [];

    // エビデンスの分布
    notes.push(
      `Evidence distribution: ${supporting.length} supporting, ` +
      `${contradicting.length} contradicting, ${neutral.length} neutral`
    );

    // 一貫性評価
    if (score > 0.8) {
      notes.push('High consistency across sources');
    } else if (score > 0.5) {
      notes.push('Moderate consistency with some variations');
    } else if (score > 0.3) {
      notes.push('Mixed evidence with notable contradictions');
    } else {
      notes.push('Low consistency - significant contradictions found');
    }

    // 高信頼性ソースからの情報
    const highCredibility = [...supporting, ...contradicting].filter(
      e => e.credibilityScore > 0.8
    );
    if (highCredibility.length > 0) {
      notes.push(
        `${highCredibility.length} high-credibility source(s) referenced`
      );
    }

    return notes;
  }
}
