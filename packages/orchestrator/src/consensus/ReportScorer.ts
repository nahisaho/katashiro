/**
 * KATASHIRO v1.2.0 - ReportScorer
 * レポートのスコアリングと矛盾検出を担当
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.2.0
 */

import {
  AgentReport,
  ReportScore,
  ConflictDetail,
  SourceReference,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
} from './types';

/**
 * レポートスコアラー
 * @requirement REQ-1.2.0-WFL-002
 */
export class ReportScorer {
  private readonly conflictThreshold: number;
  private readonly weights: ScoringWeights;

  /**
   * コンストラクタ
   * @param conflictThreshold 矛盾許容閾値（デフォルト: 0.1）
   * @param weights スコアリング重み
   */
  constructor(
    conflictThreshold: number = 0.1,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
  ) {
    this.conflictThreshold = conflictThreshold;
    this.weights = weights;
  }

  /**
   * 複数レポートをスコアリング
   * @param reports エージェントレポート配列
   * @returns スコア配列
   */
  scoreReports(reports: AgentReport[]): ReportScore[] {
    return reports.map((report) => this.scoreReport(report, reports));
  }

  /**
   * 単一レポートをスコアリング
   * @requirement REQ-1.2.0-WFL-002
   * @param report 対象レポート
   * @param allReports 全レポート（矛盾検出用）
   * @returns スコア
   */
  scoreReport(report: AgentReport, allReports: AgentReport[]): ReportScore {
    // 1. 矛盾検出
    const otherReports = allReports.filter((r) => r.reportId !== report.reportId);
    const conflicts = this.detectConflicts(report, otherReports);

    // 2. 一貫性スコア（矛盾が少ないほど高い）
    const consistencyScore = this.calculateConsistencyScore(report, conflicts);

    // 3. ソース信頼性スコア
    const reliabilityScore = this.calculateReliabilityScore(report.sources);

    // 4. カバレッジスコア
    const coverageScore = this.calculateCoverageScore(report);

    // 5. 総合スコア計算
    // Score = (ConsistencyScore * 0.5) + (ReliabilityScore * 0.3) + (CoverageScore * 0.2)
    const totalScore =
      consistencyScore * this.weights.consistency +
      reliabilityScore * this.weights.reliability +
      coverageScore * this.weights.coverage;

    // 6. ソースURL一覧を抽出
    const sourceUrls = report.sources.map((s) => s.url);

    return {
      reportId: report.reportId,
      consistencyScore,
      reliabilityScore,
      coverageScore,
      totalScore,
      conflicts,
      unverifiedCount: this.countUnverifiedStatements(report),
      sourceUrls,
    };
  }

  /**
   * 矛盾を検出
   * @param report 対象レポート
   * @param otherReports 他のレポート
   * @returns 矛盾詳細配列
   */
  detectConflicts(report: AgentReport, otherReports: AgentReport[]): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const statements = this.extractStatements(report.content);

    for (const otherReport of otherReports) {
      const otherStatements = this.extractStatements(otherReport.content);

      for (const stmt of statements) {
        for (const otherStmt of otherStatements) {
          const conflict = this.detectStatementConflict(
            stmt,
            report,
            otherStmt,
            otherReport
          );
          if (conflict && conflict.confidence >= this.conflictThreshold) {
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * 一貫性スコアを計算
   * 矛盾の数と深刻度に基づいて減点
   */
  private calculateConsistencyScore(
    _report: AgentReport,
    conflicts: ConflictDetail[]
  ): number {
    if (conflicts.length === 0) return 1.0;

    // 深刻度に応じた減点
    const totalPenalty = conflicts.reduce((sum, c) => {
      const severityWeight = c.severity / 5; // 1-5 → 0.2-1.0
      const confidenceWeight = c.confidence;
      return sum + severityWeight * confidenceWeight * 0.1;
    }, 0);

    return Math.max(0, 1.0 - totalPenalty);
  }

  /**
   * ソース信頼性スコアを計算
   */
  private calculateReliabilityScore(sources: SourceReference[]): number {
    if (sources.length === 0) return 0;

    const avgReliability =
      sources.reduce((sum, s) => sum + (s.reliabilityScore || 0.5), 0) / sources.length;
    return avgReliability;
  }

  /**
   * カバレッジスコアを計算
   * レポートの情報網羅度を評価
   */
  private calculateCoverageScore(report: AgentReport): number {
    const content = report.content;

    // 評価基準
    const metrics = {
      // ソース数（多いほど良い、最大10で1.0）
      sourceCount: Math.min(report.sources.length / 10, 1.0),
      // コンテンツ長（適度な長さが良い、2000-5000文字で最高）
      contentLength: this.normalizeContentLength(content.length),
      // セクション数（構造化されているほど良い）
      sectionCount: (content.match(/^#{1,3}\s/gm) || []).length / 10,
      // エンティティ多様性（人名、組織名、日付などの種類）
      entityDiversity: this.estimateEntityDiversity(content),
    };

    // 重み付き平均
    return (
      metrics.sourceCount * 0.3 +
      metrics.contentLength * 0.2 +
      metrics.sectionCount * 0.2 +
      metrics.entityDiversity * 0.3
    );
  }

  /**
   * コンテンツ長を正規化
   */
  private normalizeContentLength(length: number): number {
    if (length < 1000) return length / 1000;
    if (length <= 5000) return 1.0;
    if (length <= 10000) return 1.0 - (length - 5000) / 10000;
    return 0.5;
  }

  /**
   * エンティティ多様性を推定
   */
  private estimateEntityDiversity(content: string): number {
    const patterns = [
      /\d{4}年/g, // 年
      /[A-Z][a-z]+/g, // 固有名詞（英語）
      /「[^」]+」/g, // 引用
      /https?:\/\/[^\s]+/g, // URL
    ];

    let diversityScore = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        diversityScore += Math.min(matches.length / 5, 0.25);
      }
    }

    return Math.min(diversityScore, 1.0);
  }

  /**
   * 未検証ステートメントをカウント
   */
  private countUnverifiedStatements(report: AgentReport): number {
    const unverifiedPatterns = [
      /\[要検証\]/g,
      /\[未確認\]/g,
      /\[unverified\]/gi,
      /（要確認）/g,
    ];

    let count = 0;
    for (const pattern of unverifiedPatterns) {
      const matches = report.content.match(pattern);
      if (matches) count += matches.length;
    }

    return count;
  }

  /**
   * ステートメントを抽出
   */
  private extractStatements(content: string): string[] {
    // 文単位で分割
    const sentences = content
      .split(/[。.!?！？]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // 数値や日付を含む事実ステートメントを優先
    const factualStatements = sentences.filter(
      (s) =>
        /\d+/.test(s) || // 数値を含む
        /年|月|日/.test(s) || // 日付を含む
        /は|である|された|される/.test(s) // 断定表現
    );

    return factualStatements.slice(0, 50); // 最大50件
  }

  /**
   * ステートメント間の矛盾を検出
   */
  private detectStatementConflict(
    stmt1: string,
    report1: AgentReport,
    stmt2: string,
    report2: AgentReport
  ): ConflictDetail | null {
    // 類似度が高いが内容が矛盾するケースを検出

    // 1. キーワード類似度チェック
    const keywords1 = this.extractKeywords(stmt1);
    const keywords2 = this.extractKeywords(stmt2);
    const commonKeywords = keywords1.filter((k) => keywords2.includes(k));

    // 共通キーワードが少なければ関連性なし
    if (commonKeywords.length < 2) return null;

    // 2. 数値の矛盾チェック
    const numbers1 = stmt1.match(/\d+(?:\.\d+)?/g) || [];
    const numbers2 = stmt2.match(/\d+(?:\.\d+)?/g) || [];

    if (numbers1.length > 0 && numbers2.length > 0) {
      // 同じ文脈で異なる数値
      const hasConflictingNumbers = numbers1.some(
        (n1) => numbers2.some((n2) => n1 !== n2 && Math.abs(parseFloat(n1) - parseFloat(n2)) > 0.1)
      );

      if (hasConflictingNumbers && commonKeywords.length >= 2) {
        return {
          conflictId: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'inconsistency',
          statement1: {
            text: stmt1,
            source: report1.sources[0]?.url || 'unknown',
            reportId: report1.reportId,
          },
          statement2: {
            text: stmt2,
            source: report2.sources[0]?.url || 'unknown',
            reportId: report2.reportId,
          },
          severity: 3,
          confidence: 0.6 + commonKeywords.length * 0.1,
        };
      }
    }

    // 3. 否定表現の矛盾チェック
    const negatives = ['ない', 'なかった', 'ではない', 'not', 'no', '否定'];
    const hasNegative1 = negatives.some((n) => stmt1.includes(n));
    const hasNegative2 = negatives.some((n) => stmt2.includes(n));

    if (hasNegative1 !== hasNegative2 && commonKeywords.length >= 3) {
      return {
        conflictId: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'contradiction',
        statement1: {
          text: stmt1,
          source: report1.sources[0]?.url || 'unknown',
          reportId: report1.reportId,
        },
        statement2: {
          text: stmt2,
          source: report2.sources[0]?.url || 'unknown',
          reportId: report2.reportId,
        },
        severity: 4,
        confidence: 0.5 + commonKeywords.length * 0.1,
      };
    }

    return null;
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): string[] {
    // 日本語の名詞っぽいものを抽出（簡易版）
    const words = text
      .replace(/[。、！？「」（）\[\]【】]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    // ストップワード除去
    const stopWords = [
      'これ',
      'それ',
      'あれ',
      'この',
      'その',
      'ある',
      'いる',
      'する',
      'なる',
      'れる',
      'られる',
    ];

    return words.filter((w) => !stopWords.includes(w));
  }
}
