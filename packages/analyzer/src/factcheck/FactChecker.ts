/**
 * FactChecker - ファクトチェックオーケストレーター
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type { Result } from '@nahisaho/katashiro-core';
import { ok, err } from '@nahisaho/katashiro-core';
import type {
  FactCheckRequest,
  FactCheckResultDetail,
  QuickCheckResult,
  Evidence,
  VerificationDetails,
  Reference,
  FactCheckMetadata,
  FactCheckerConfig,
  StrictnessLevel,
  VerificationSourceType,
  MultiSourceVerificationResult,
  SourceVerificationResult,
  ConfidenceScoreResult,
  ConfidenceBreakdown,
  ConfidenceLevel,
} from './types.js';
import { DEFAULT_FACTCHECKER_CONFIG } from './types.js';
import { ClaimParser } from './ClaimParser.js';
import { TrustedSourceRegistry } from './TrustedSourceRegistry.js';
import {
  EvidenceCollector,
  type SearchClient,
  type Scraper,
} from './EvidenceCollector.js';
import { ConsistencyChecker } from './ConsistencyChecker.js';
import { VerdictGenerator } from './VerdictGenerator.js';

/**
 * ファクトチェックエラーコード
 */
export type FactCheckErrorCode =
  | 'INVALID_CLAIM'
  | 'COLLECTION_FAILED'
  | 'VERIFICATION_FAILED'
  | 'TIMEOUT';

/**
 * ファクトチェックエラー
 */
export interface FactCheckError {
  code: FactCheckErrorCode;
  message: string;
  details?: unknown;
}

/**
 * ファクトチェッカー - メインクラス
 */
export class FactChecker {
  private config: FactCheckerConfig;
  private claimParser: ClaimParser;
  private registry: TrustedSourceRegistry;
  private evidenceCollector: EvidenceCollector;
  private consistencyChecker: ConsistencyChecker;
  private verdictGenerator: VerdictGenerator;

  constructor(
    config?: Partial<FactCheckerConfig>,
    searchClient?: SearchClient,
    scraper?: Scraper
  ) {
    this.config = { ...DEFAULT_FACTCHECKER_CONFIG, ...config };
    this.claimParser = new ClaimParser();
    this.registry = new TrustedSourceRegistry(this.config.trustedSources);
    this.evidenceCollector = new EvidenceCollector(
      this.registry,
      searchClient,
      scraper,
      {
        maxResultsPerSource: this.config.maxConcurrentSearches,
        timeoutMs: this.config.searchTimeoutMs,
      }
    );
    this.consistencyChecker = new ConsistencyChecker();
    this.verdictGenerator = new VerdictGenerator();
  }

  /**
   * 単一の主張をファクトチェック
   */
  async check(
    request: FactCheckRequest
  ): Promise<Result<FactCheckResultDetail, FactCheckError>> {
    const startTime = Date.now();

    // 入力検証
    if (!request.claim || request.claim.trim().length === 0) {
      return err({
        code: 'INVALID_CLAIM',
        message: 'Claim cannot be empty',
      });
    }

    try {
      // 1. 主張を解析
      const extractedClaim = this.claimParser.parseSingle(request.claim);

      // 2. エビデンスを収集
      const sourceTypes = request.verificationSources || [
        'trusted_news',
        'factcheck_org',
        'academic',
      ];
      const evidence = await this.evidenceCollector.collect(
        extractedClaim,
        sourceTypes
      );

      // 3. 既存のファクトチェック結果を検索
      const existingFactChecks = await this.evidenceCollector.findExistingFactChecks(
        extractedClaim
      );

      // 4. 一貫性をチェック
      const consistencyResult = this.consistencyChecker.check(
        extractedClaim,
        evidence
      );

      // 5. 主張を検証
      const claimVerification = this.consistencyChecker.verify(
        extractedClaim,
        evidence
      );

      // 6. 判定を生成
      const strictnessLevel = request.strictnessLevel || this.config.defaultStrictnessLevel;
      const verdict = this.verdictGenerator.generate({
        claimVerifications: [claimVerification],
        consistencyScore: consistencyResult.score,
        evidenceCount: evidence.length,
        strictnessLevel,
        existingFactChecks,
      });

      // 7. 検証詳細を構築
      const verificationDetails = this.buildVerificationDetails(
        evidence,
        consistencyResult.score
      );

      // 8. 参考文献を構築
      const references = this.buildReferences(evidence);

      // 9. サマリーと説明を生成
      const summary = this.generateSummary(
        request.claim,
        verdict,
        evidence.length
      );
      const explanation = this.generateExplanation(
        extractedClaim,
        verdict,
        evidence,
        consistencyResult
      );

      // 10. 結果を構築
      const result: FactCheckResultDetail = {
        claim: request.claim,
        normalizedClaim: extractedClaim.normalized,
        verdict,
        confidenceScore: this.calculateConfidence(
          evidence,
          consistencyResult.score,
          verdict
        ),
        evidence,
        verificationDetails,
        summary,
        explanation,
        references,
        existingFactChecks: existingFactChecks.length > 0 ? existingFactChecks : undefined,
        metadata: this.buildMetadata(startTime, sourceTypes),
      };

      return ok(result);
    } catch (error) {
      return err({
        code: 'VERIFICATION_FAILED',
        message: `Fact check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      });
    }
  }

  /**
   * 複数の主張をバッチでファクトチェック
   */
  async checkBatch(
    claims: string[],
    options?: {
      strictnessLevel?: StrictnessLevel;
      verificationSources?: VerificationSourceType[];
    }
  ): Promise<Result<FactCheckResultDetail[], FactCheckError>> {
    const results: FactCheckResultDetail[] = [];

    for (const claim of claims) {
      const result = await this.check({
        claim,
        strictnessLevel: options?.strictnessLevel,
        verificationSources: options?.verificationSources,
      });

      if (result.isOk() && result._tag === 'Ok') {
        results.push(result.value);
      } else {
        // エラーの場合はスキップして続行
        continue;
      }
    }

    if (results.length === 0) {
      return err({
        code: 'VERIFICATION_FAILED',
        message: 'All claims failed to verify',
      });
    }

    return ok(results);
  }

  /**
   * クイックチェック（簡易版）
   */
  async quickCheck(claim: string): Promise<Result<QuickCheckResult, FactCheckError>> {
    if (!claim || claim.trim().length === 0) {
      return err({
        code: 'INVALID_CLAIM',
        message: 'Claim cannot be empty',
      });
    }

    try {
      // 主張を解析
      const extractedClaim = this.claimParser.parseSingle(claim);

      // 少数のエビデンスを収集
      const evidence = await this.evidenceCollector.collectQuick(
        extractedClaim,
        3
      );

      // カウント
      const supporting = evidence.filter(
        e => e.relation === 'supports' || e.relation === 'partially_supports'
      ).length;
      const contradicting = evidence.filter(
        e => e.relation === 'contradicts'
      ).length;

      // クイック判定
      const quickVerdict = this.verdictGenerator.generateQuick(
        supporting,
        contradicting,
        evidence.length
      );

      // 理由を生成
      const reason = this.generateQuickReason(
        quickVerdict.label,
        supporting,
        contradicting,
        evidence.length
      );

      // トップソースを取得
      const topSources = evidence
        .slice(0, 3)
        .map(e => e.sourceName);

      return ok({
        verdict: quickVerdict.label,
        confidence: Math.abs(quickVerdict.score),
        reason,
        topSources,
      });
    } catch (error) {
      return err({
        code: 'VERIFICATION_FAILED',
        message: `Quick check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * テキストから主張を抽出
   */
  extractClaims(text: string): string[] {
    const claims = this.claimParser.parse(text);
    return claims.map(c => c.original);
  }

  /**
   * 複数の独立ソースで主張を検証
   * @requirement REQ-EXT-FCK-001
   * @description 2つ以上の独立ソースで事実を相互検証する
   */
  async verifyWithMultipleSources(
    claim: string,
    options?: {
      minSources?: number;
      sourceTypes?: VerificationSourceType[];
      timeout?: number;
    }
  ): Promise<Result<MultiSourceVerificationResult, FactCheckError>> {
    const minSources = options?.minSources ?? 2;
    const sourceTypes = options?.sourceTypes ?? [
      'trusted_news',
      'factcheck_org',
      'academic',
      'government',
    ];

    if (!claim || claim.trim().length === 0) {
      return err({
        code: 'INVALID_CLAIM',
        message: 'Claim cannot be empty',
      });
    }

    try {
      // 1. 主張を解析
      const extractedClaim = this.claimParser.parseSingle(claim);

      // 2. 各ソースタイプから独立してエビデンスを収集
      const allEvidence: Evidence[] = [];
      const sourceResultMap = new Map<string, Evidence[]>();

      for (const sourceType of sourceTypes) {
        const evidence = await this.evidenceCollector.collect(
          extractedClaim,
          [sourceType]
        );
        if (evidence.length > 0) {
          sourceResultMap.set(sourceType, evidence);
          allEvidence.push(...evidence);
        }
      }

      // 3. 独立ソースの数をカウント（異なるドメインを独立とみなす）
      const uniqueDomains = new Set<string>();
      for (const e of allEvidence) {
        try {
          const url = new URL(e.sourceUrl);
          uniqueDomains.add(url.hostname);
        } catch {
          uniqueDomains.add(e.sourceName);
        }
      }
      const independentSourceCount = uniqueDomains.size;

      // 4. 各ソースの検証結果を構築
      const sourceResults: SourceVerificationResult[] = allEvidence.map(e => ({
        sourceName: e.sourceName,
        sourceType: e.sourceType,
        sourceUrl: e.sourceUrl,
        verdict: e.relation,
        excerpt: e.excerpt,
        sourceCredibility: e.credibilityScore,
        retrievedAt: e.retrievedAt,
      }));

      // 5. ソース間の一致度を計算
      const supporting = allEvidence.filter(
        e => e.relation === 'supports' || e.relation === 'partially_supports'
      ).length;
      const contradicting = allEvidence.filter(
        e => e.relation === 'contradicts'
      ).length;
      const total = allEvidence.length;

      let agreementScore = 0;
      if (total > 0) {
        // 一致度 = (支持数 - 矛盾数) / 総数、正規化して0-1に
        const rawAgreement = (supporting - contradicting) / total;
        agreementScore = (rawAgreement + 1) / 2; // -1〜1 を 0〜1 に変換
      }

      // 6. 総合判定を生成
      const overallVerdict = this.verdictGenerator.generateQuick(
        supporting,
        contradicting,
        total
      ).label;

      // 7. 信頼度スコアを計算
      const confidenceResult = this.calculateConfidenceScore(allEvidence, agreementScore);

      // 8. サマリーを生成
      const meetsMinimum = independentSourceCount >= minSources;
      const summary = this.generateMultiSourceSummary(
        claim,
        independentSourceCount,
        minSources,
        meetsMinimum,
        overallVerdict,
        confidenceResult.score
      );

      return ok({
        claim,
        sourceCount: independentSourceCount,
        meetsMinimumSources: meetsMinimum,
        agreementScore,
        sourceResults,
        overallVerdict,
        confidenceScore: confidenceResult.score,
        summary,
      });
    } catch (error) {
      return err({
        code: 'VERIFICATION_FAILED',
        message: `Multi-source verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      });
    }
  }

  /**
   * 信頼度スコアを計算
   * @requirement REQ-EXT-FCK-002
   * @description ソース一致度に基づく0-100の信頼度スコアを付与
   */
  calculateConfidenceScore(
    evidence: Evidence[],
    agreementScore?: number
  ): ConfidenceScoreResult {
    if (evidence.length === 0) {
      return {
        score: 0,
        breakdown: {
          sourceAgreement: 0,
          sourceCredibility: 0,
          evidenceQuantity: 0,
          consistency: 0,
          recency: 0,
        },
        level: 'very_low',
        explanation: 'No evidence available to calculate confidence score.',
      };
    }

    // 1. ソース一致スコア (0-100)
    const supporting = evidence.filter(
      e => e.relation === 'supports' || e.relation === 'partially_supports'
    ).length;
    const contradicting = evidence.filter(
      e => e.relation === 'contradicts'
    ).length;
    const total = evidence.length;

    let sourceAgreementScore: number;
    if (agreementScore !== undefined) {
      sourceAgreementScore = agreementScore * 100;
    } else {
      const rawAgreement = (supporting - contradicting) / total;
      sourceAgreementScore = ((rawAgreement + 1) / 2) * 100;
    }

    // 2. ソース信頼性スコア (0-100)
    const avgCredibility = evidence.reduce((sum, e) => sum + e.credibilityScore, 0) / total;
    const sourceCredibilityScore = avgCredibility * 100;

    // 3. エビデンス量スコア (0-100)
    // 5件以上で満点、線形スケール
    const evidenceQuantityScore = Math.min(100, (total / 5) * 100);

    // 4. 一貫性スコア (0-100)
    // 矛盾が少ないほど高い
    const consistencyScore = total > 0 ? ((total - contradicting) / total) * 100 : 0;

    // 5. 最新性スコア (0-100)
    // 最新のエビデンスが7日以内なら高スコア
    const now = new Date();
    let recencyScore = 50; // デフォルト
    const datesWithData = evidence.filter(e => e.publishedDate);
    if (datesWithData.length > 0) {
      const latestDate = new Date(Math.max(...datesWithData.map(e => e.publishedDate!.getTime())));
      const daysSinceLatest = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLatest <= 7) {
        recencyScore = 100;
      } else if (daysSinceLatest <= 30) {
        recencyScore = 80;
      } else if (daysSinceLatest <= 90) {
        recencyScore = 60;
      } else if (daysSinceLatest <= 365) {
        recencyScore = 40;
      } else {
        recencyScore = 20;
      }
    }

    // 6. 総合スコアを計算（加重平均）
    const weights = {
      sourceAgreement: 0.35,
      sourceCredibility: 0.25,
      evidenceQuantity: 0.15,
      consistency: 0.15,
      recency: 0.10,
    };

    const totalScore = Math.round(
      sourceAgreementScore * weights.sourceAgreement +
      sourceCredibilityScore * weights.sourceCredibility +
      evidenceQuantityScore * weights.evidenceQuantity +
      consistencyScore * weights.consistency +
      recencyScore * weights.recency
    );

    // 7. レベルを決定
    let level: ConfidenceLevel;
    if (totalScore >= 90) {
      level = 'very_high';
    } else if (totalScore >= 70) {
      level = 'high';
    } else if (totalScore >= 50) {
      level = 'moderate';
    } else if (totalScore >= 30) {
      level = 'low';
    } else {
      level = 'very_low';
    }

    // 8. 説明を生成
    const explanation = this.generateConfidenceExplanation(
      totalScore,
      level,
      evidence.length,
      supporting,
      contradicting
    );

    return {
      score: totalScore,
      breakdown: {
        sourceAgreement: Math.round(sourceAgreementScore),
        sourceCredibility: Math.round(sourceCredibilityScore),
        evidenceQuantity: Math.round(evidenceQuantityScore),
        consistency: Math.round(consistencyScore),
        recency: Math.round(recencyScore),
      },
      level,
      explanation,
    };
  }

  /**
   * 複数ソース検証サマリーを生成
   */
  private generateMultiSourceSummary(
    claim: string,
    sourceCount: number,
    minSources: number,
    meetsMinimum: boolean,
    verdict: string,
    confidenceScore: number
  ): string {
    const truncatedClaim = claim.length > 80 ? claim.slice(0, 80) + '...' : claim;
    const verdictText = verdict.replace(/_/g, ' ').toUpperCase();
    
    if (!meetsMinimum) {
      return `Verification of "${truncatedClaim}" used ${sourceCount} independent source(s), ` +
             `which is below the required minimum of ${minSources}. ` +
             `Preliminary verdict: ${verdictText} with ${confidenceScore}% confidence. ` +
             `Additional sources recommended for reliable verification.`;
    }

    return `Verification of "${truncatedClaim}" cross-referenced ${sourceCount} independent sources. ` +
           `Verdict: ${verdictText} with ${confidenceScore}% confidence.`;
  }

  /**
   * 信頼度スコアの説明を生成
   */
  private generateConfidenceExplanation(
    score: number,
    level: ConfidenceLevel,
    evidenceCount: number,
    supporting: number,
    contradicting: number
  ): string {
    const levelText = level.replace(/_/g, ' ');
    const lines: string[] = [
      `Confidence score: ${score}/100 (${levelText})`,
      `Based on ${evidenceCount} pieces of evidence:`,
      `  - ${supporting} supporting source(s)`,
      `  - ${contradicting} contradicting source(s)`,
    ];

    if (score >= 70) {
      lines.push('This claim has strong evidential support from multiple credible sources.');
    } else if (score >= 50) {
      lines.push('This claim has moderate support, but some sources provide conflicting information.');
    } else if (score >= 30) {
      lines.push('This claim has limited evidential support. Additional verification recommended.');
    } else {
      lines.push('This claim lacks sufficient evidence or has significant contradictions.');
    }

    return lines.join('\n');
  }

  /**
   * 検証詳細を構築
   */
  private buildVerificationDetails(
    evidence: Evidence[],
    consistencyScore: number
  ): VerificationDetails {
    const supporting = evidence.filter(
      e => e.relation === 'supports' || e.relation === 'partially_supports'
    ).length;
    const contradicting = evidence.filter(
      e => e.relation === 'contradicts'
    ).length;

    const limitations: string[] = [];
    if (evidence.length < 5) {
      limitations.push('Limited number of sources available');
    }
    if (consistencyScore < 0.5) {
      limitations.push('Sources show inconsistent information');
    }

    return {
      sourcesExamined: evidence.length,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting,
      consistencyScore,
      limitations,
    };
  }

  /**
   * 参考文献を構築
   */
  private buildReferences(evidence: Evidence[]): Reference[] {
    return evidence.map((e, index) => ({
      id: `ref-${index + 1}`,
      title: e.sourceName,
      url: e.sourceUrl,
      publishedDate: e.publishedDate,
      sourceType: e.sourceType,
    }));
  }

  /**
   * サマリーを生成
   */
  private generateSummary(
    claim: string,
    verdict: { label: string; score: number },
    evidenceCount: number
  ): string {
    const verdictUpper = verdict.label.toUpperCase().replace(/_/g, ' ');
    const truncatedClaim = claim.length > 100 ? claim.slice(0, 100) + '...' : claim;

    return `This claim is ${verdictUpper}. Based on ${evidenceCount} sources examined, ` +
           `"${truncatedClaim}" has been evaluated with a confidence of ` +
           `${Math.round(Math.abs(verdict.score) * 100)}%.`;
  }

  /**
   * 詳細説明を生成
   */
  private generateExplanation(
    claim: { normalized: string; type: string; verifiability: string },
    verdict: { label: string; rationale: string; caveats: string[] },
    evidence: Evidence[],
    consistency: { score: number; notes: string[] }
  ): string {
    const lines: string[] = [];

    // 主張の分析
    lines.push(`**Claim Analysis:**`);
    lines.push(`- Type: ${claim.type}`);
    lines.push(`- Verifiability: ${claim.verifiability}`);
    lines.push('');

    // 判定理由
    lines.push(`**Verdict Rationale:**`);
    lines.push(verdict.rationale);
    lines.push('');

    // エビデンスサマリー
    lines.push(`**Evidence Summary:**`);
    const supporting = evidence.filter(
      e => e.relation === 'supports' || e.relation === 'partially_supports'
    );
    const contradicting = evidence.filter(e => e.relation === 'contradicts');

    if (supporting.length > 0) {
      lines.push(`- ${supporting.length} source(s) support this claim`);
    }
    if (contradicting.length > 0) {
      lines.push(`- ${contradicting.length} source(s) contradict this claim`);
    }
    lines.push('');

    // 一貫性
    lines.push(`**Consistency Analysis:**`);
    lines.push(`- Consistency score: ${(consistency.score * 100).toFixed(0)}%`);
    for (const note of consistency.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');

    // 注意事項
    if (verdict.caveats.length > 0) {
      lines.push(`**Caveats:**`);
      for (const caveat of verdict.caveats) {
        lines.push(`- ${caveat}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 確信度を計算
   */
  private calculateConfidence(
    evidence: Evidence[],
    consistencyScore: number,
    verdict: { label: string; score: number }
  ): number {
    // 基本スコア: 判定スコアの絶対値
    let confidence = Math.abs(verdict.score);

    // エビデンス数による調整
    const evidenceFactor = Math.min(1.0, evidence.length / 5);
    confidence = confidence * 0.6 + evidenceFactor * 0.2;

    // 一貫性による調整
    confidence = confidence + consistencyScore * 0.2;

    // 高信頼性ソースがある場合にボーナス
    const highCredibilityCount = evidence.filter(e => e.credibilityScore > 0.8).length;
    if (highCredibilityCount > 0) {
      confidence = Math.min(1.0, confidence + highCredibilityCount * 0.05);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * メタデータを構築
   */
  private buildMetadata(
    startTime: number,
    sourceTypes: VerificationSourceType[]
  ): FactCheckMetadata {
    return {
      checkedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
      verificationSourcesUsed: sourceTypes,
      version: '0.2.3',
    };
  }

  /**
   * クイックチェック用の理由を生成
   */
  private generateQuickReason(
    label: string,
    supporting: number,
    contradicting: number,
    total: number
  ): string {
    if (total === 0) {
      return 'No evidence found for quick verification';
    }

    const verdictText = label.replace(/_/g, ' ');
    return `Based on ${total} quick checks: ${supporting} supporting, ` +
           `${contradicting} contradicting. Verdict: ${verdictText}.`;
  }
}
