/**
 * VerdictGenerator - 判定結果の生成
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type {
  Verdict,
  VerdictLabel,
  VerdictInput,
  ExistingFactCheck,
} from './types.js';

/**
 * 最終判定を生成するクラス
 */
export class VerdictGenerator {
  /**
   * 判定結果を生成
   */
  generate(input: VerdictInput): Verdict {
    const {
      claimVerifications,
      consistencyScore,
      evidenceCount,
      strictnessLevel,
      existingFactChecks,
    } = input;

    // エビデンス不足チェック
    const minEvidence = strictnessLevel === 'strict' ? 5
      : strictnessLevel === 'moderate' ? 3 : 2;

    if (evidenceCount < minEvidence) {
      return {
        label: 'unverifiable',
        score: 0,
        rationale: `Insufficient evidence for verification (found ${evidenceCount}, need ${minEvidence})`,
        caveats: ['More evidence needed for a reliable verdict'],
      };
    }

    // 検証結果を集計
    const verified = claimVerifications.filter(v => v.verified === true).length;
    const falsified = claimVerifications.filter(v => v.verified === false).length;
    const total = claimVerifications.length;

    // 既存のファクトチェック結果を考慮
    if (existingFactChecks && existingFactChecks.length > 0) {
      const existingVerdicts = existingFactChecks.map(fc => fc.verdict.toLowerCase());
      if (existingVerdicts.every(v => v.includes('true') && !v.includes('false'))) {
        return this.adjustVerdict('true', consistencyScore, existingFactChecks);
      }
      if (existingVerdicts.every(v => v.includes('false'))) {
        return this.adjustVerdict('false', consistencyScore, existingFactChecks);
      }
    }

    // 判定ロジック
    const verifiedRatio = total > 0 ? verified / total : 0;
    const falsifiedRatio = total > 0 ? falsified / total : 0;

    let label: VerdictLabel;
    let score: number;

    if (verifiedRatio >= 0.9 && falsifiedRatio === 0) {
      label = 'true';
      score = 0.9 + consistencyScore * 0.1;
    } else if (verifiedRatio >= 0.7 && falsifiedRatio < 0.1) {
      label = 'mostly_true';
      score = 0.7 + verifiedRatio * 0.2;
    } else if (verifiedRatio >= 0.4 && falsifiedRatio < 0.3) {
      label = 'half_true';
      score = 0.3 + (verifiedRatio - falsifiedRatio) * 0.4;
    } else if (falsifiedRatio >= 0.7 && verifiedRatio < 0.1) {
      label = 'mostly_false';
      score = -0.7 - falsifiedRatio * 0.2;
    } else if (falsifiedRatio >= 0.9 && verifiedRatio === 0) {
      label = 'false';
      score = -0.9 - consistencyScore * 0.1;
    } else if (consistencyScore < 0.3) {
      label = 'misleading';
      score = 0;
    } else {
      label = 'lacks_context';
      score = 0;
    }

    return {
      label,
      score: Math.max(-1, Math.min(1, score)),
      rationale: this.generateRationale(label, verified, falsified, total),
      caveats: this.generateCaveats(label, consistencyScore, evidenceCount),
    };
  }

  /**
   * クイック判定を生成
   */
  generateQuick(
    supporting: number,
    contradicting: number,
    total: number
  ): { label: VerdictLabel; score: number } {
    if (total === 0) {
      return { label: 'unverifiable', score: 0 };
    }

    const supportRatio = supporting / total;
    const contradictRatio = contradicting / total;

    if (supportRatio > 0.7 && contradictRatio < 0.1) {
      return { label: 'true', score: 0.8 };
    } else if (supportRatio > 0.5) {
      return { label: 'mostly_true', score: 0.6 };
    } else if (contradictRatio > 0.7) {
      return { label: 'false', score: -0.8 };
    } else if (contradictRatio > 0.5) {
      return { label: 'mostly_false', score: -0.6 };
    } else {
      return { label: 'half_true', score: 0 };
    }
  }

  /**
   * 既存ファクトチェック結果に基づいて判定を調整
   */
  private adjustVerdict(
    baseLabel: VerdictLabel,
    consistencyScore: number,
    existingFactChecks: ExistingFactCheck[]
  ): Verdict {
    return {
      label: baseLabel,
      score: baseLabel === 'true' ? 0.9 : -0.9,
      rationale: `This claim has been previously fact-checked by ${existingFactChecks.length} organization(s)`,
      caveats: [
        'Verdict influenced by existing fact-check results',
        `Consistency score: ${(consistencyScore * 100).toFixed(0)}%`,
      ],
    };
  }

  /**
   * 判定理由を生成
   */
  private generateRationale(
    label: VerdictLabel,
    verified: number,
    falsified: number,
    total: number
  ): string {
    const rationales: Record<VerdictLabel, string> = {
      true: `All ${total} verifiable claims were confirmed by evidence`,
      mostly_true: `${verified} of ${total} claims verified; minor inaccuracies found`,
      half_true: `Mixed evidence: ${verified} claims supported, ${falsified} contradicted`,
      mostly_false: `Most claims contradicted by evidence (${falsified} of ${total})`,
      false: `All ${total} verifiable claims were contradicted by evidence`,
      unverifiable: `Unable to find sufficient evidence to verify the claims`,
      misleading: `Evidence shows the claim is technically accurate but misleading in context`,
      outdated: `The information was once true but is no longer current`,
      lacks_context: `The claim omits important context that changes its meaning`,
    };

    return rationales[label];
  }

  /**
   * 注意事項を生成
   */
  private generateCaveats(
    label: VerdictLabel,
    consistencyScore: number,
    evidenceCount: number
  ): string[] {
    const caveats: string[] = [];

    if (consistencyScore < 0.5) {
      caveats.push('Evidence sources show some inconsistency');
    }

    if (evidenceCount < 5) {
      caveats.push('Limited number of sources consulted');
    }

    if (label === 'half_true' || label === 'lacks_context') {
      caveats.push('Full context should be considered when evaluating this claim');
    }

    return caveats;
  }
}
