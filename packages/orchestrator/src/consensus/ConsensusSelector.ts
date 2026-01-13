/**
 * KATASHIRO v1.2.0 - ConsensusSelector
 * 最良レポートの選択ロジックを担当
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.2.0
 */

import {
  ReportScore,
  ConsensusSelection,
  ConsensusResearchError,
  ConsensusResearchErrorCode,
} from './types';

/**
 * コンセンサスセレクター
 * @requirement REQ-1.2.0-WFL-003
 */
export class ConsensusSelector {
  /**
   * 最良レポートを選択
   * @requirement REQ-1.2.0-WFL-003
   * @param scores スコア配列
   * @returns 選択結果
   */
  select(scores: ReportScore[]): ConsensusSelection {
    if (scores.length === 0) {
      throw new ConsensusResearchError(
        ConsensusResearchErrorCode.SELECTION_ERROR,
        'No reports to select from'
      );
    }

    if (scores.length === 1) {
      const onlyScore = scores[0]!;
      return {
        selectedReportId: onlyScore.reportId,
        reason: 'Only one report available',
      };
    }

    // 総合スコアでソート（降順）
    const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    const best = sorted[0]!; // 必ず存在（scores.length >= 2）
    const secondBest = sorted[1]!; // 必ず存在（scores.length >= 2）

    // タイブレーカー: 同スコアの場合はconsistencyで判断
    if (Math.abs(best.totalScore - secondBest.totalScore) < 0.01) {
      const byConsistency = [...scores].sort(
        (a, b) => b.consistencyScore - a.consistencyScore
      );
      const topByConsistency = byConsistency[0]!;
      return {
        selectedReportId: topByConsistency.reportId,
        reason: `Tie-breaker: highest consistency score (${topByConsistency.consistencyScore.toFixed(3)})`,
      };
    }

    return {
      selectedReportId: best.reportId,
      reason: this.generateReason(best, sorted.slice(1)),
    };
  }

  /**
   * 選択理由を生成
   * @param selected 選択されたスコア
   * @param others 他のスコア
   * @returns 選択理由
   */
  private generateReason(selected: ReportScore, others: ReportScore[]): string {
    const avgOthers = others.reduce((sum, s) => sum + s.totalScore, 0) / others.length;
    const margin = ((selected.totalScore - avgOthers) * 100).toFixed(1);

    return (
      `Selected with total score ${selected.totalScore.toFixed(3)} ` +
      `(+${margin}% vs average). ` +
      `Consistency: ${selected.consistencyScore.toFixed(3)}, ` +
      `Reliability: ${selected.reliabilityScore.toFixed(3)}, ` +
      `Coverage: ${selected.coverageScore.toFixed(3)}. ` +
      `Conflicts: ${selected.conflicts.length}`
    );
  }

  /**
   * 選択結果の詳細分析を生成
   * @param scores 全スコア
   * @param selection 選択結果
   * @returns 詳細分析
   */
  analyzeSelection(
    scores: ReportScore[],
    selection: ConsensusSelection
  ): SelectionAnalysis {
    const selected = scores.find((s) => s.reportId === selection.selectedReportId);
    if (!selected) {
      throw new ConsensusResearchError(
        ConsensusResearchErrorCode.SELECTION_ERROR,
        'Selected report not found in scores'
      );
    }

    const others = scores.filter((s) => s.reportId !== selection.selectedReportId);
    const avgTotalScore = others.reduce((sum, s) => sum + s.totalScore, 0) / others.length;
    const avgConsistency = others.reduce((sum, s) => sum + s.consistencyScore, 0) / others.length;
    const avgReliability = others.reduce((sum, s) => sum + s.reliabilityScore, 0) / others.length;
    const avgCoverage = others.reduce((sum, s) => sum + s.coverageScore, 0) / others.length;

    return {
      selectedReportId: selection.selectedReportId,
      selectedScore: selected,
      comparison: {
        totalScoreDiff: selected.totalScore - avgTotalScore,
        consistencyDiff: selected.consistencyScore - avgConsistency,
        reliabilityDiff: selected.reliabilityScore - avgReliability,
        coverageDiff: selected.coverageScore - avgCoverage,
      },
      ranking: scores
        .map((s) => ({
          reportId: s.reportId,
          rank: scores.filter((o) => o.totalScore > s.totalScore).length + 1,
          score: s.totalScore,
        }))
        .sort((a, b) => a.rank - b.rank),
      confidence: this.calculateSelectionConfidence(selected, others),
    };
  }

  /**
   * 選択の信頼度を計算
   */
  private calculateSelectionConfidence(
    selected: ReportScore,
    others: ReportScore[]
  ): number {
    if (others.length === 0) return 1.0;

    const maxOtherScore = Math.max(...others.map((s) => s.totalScore));
    const scoreDiff = selected.totalScore - maxOtherScore;

    // スコア差が大きいほど信頼度が高い
    // 0.1以上の差で高信頼、0.01未満は低信頼
    if (scoreDiff >= 0.1) return 0.95;
    if (scoreDiff >= 0.05) return 0.8;
    if (scoreDiff >= 0.02) return 0.6;
    if (scoreDiff >= 0.01) return 0.4;
    return 0.3; // 僅差
  }
}

/**
 * 選択分析結果
 */
export interface SelectionAnalysis {
  /** 選択されたレポートID */
  selectedReportId: string;
  /** 選択されたスコア */
  selectedScore: ReportScore;
  /** 他との比較 */
  comparison: {
    totalScoreDiff: number;
    consistencyDiff: number;
    reliabilityDiff: number;
    coverageDiff: number;
  };
  /** ランキング */
  ranking: Array<{
    reportId: string;
    rank: number;
    score: number;
  }>;
  /** 選択の信頼度 */
  confidence: number;
}
