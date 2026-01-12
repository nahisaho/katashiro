/**
 * QualityScorer - コンテンツ品質スコアリング
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-025
 */

/**
 * 品質次元
 */
export interface QualityDimension {
  readonly name: string;
  readonly score: number;
  readonly details?: string;
}

/**
 * 品質スコア
 */
export interface QualityScore {
  readonly overall: number;
  readonly dimensions: QualityDimension[];
}

/**
 * 品質レポート
 */
export interface QualityReport {
  readonly score: QualityScore;
  readonly summary: string;
  readonly strengths: string[];
  readonly improvements: string[];
}

/**
 * 主観的表現パターン
 */
const SUBJECTIVE_PATTERNS = [
  /私[はが]?思[うい]/,
  /絶対に/,
  /最高/,
  /最悪/,
  /素晴らしい/,
  /ひどい/,
  /大好き/,
  /大嫌い/,
  /！+/,
  /？+/,
  /きっと/,
  /たぶん/,
  /definitely/i,
  /absolutely/i,
  /amazing/i,
  /terrible/i,
  /best/i,
  /worst/i,
];

/**
 * コンテンツ品質スコアリング実装
 */
export class QualityScorer {
  /**
   * コンテンツ品質をスコアリング（scoreContentのエイリアス）
   * AGENTS.md互換API
   */
  score(text: string): QualityScore {
    return this.scoreContent(text);
  }

  /**
   * コンテンツ品質をスコアリング
   */
  scoreContent(text: string): QualityScore {
    if (!text || text.trim().length === 0) {
      return {
        overall: 0,
        dimensions: [],
      };
    }

    const dimensions: QualityDimension[] = [
      this.scoreReadability(text),
      this.scoreCompleteness(text),
      this.scoreCitation(text),
      this.scoreObjectivity(text),
      this.scoreFreshness(text),
    ];

    // Calculate weighted average
    const weights = [0.25, 0.2, 0.2, 0.2, 0.15];
    let overall = 0;
    for (let i = 0; i < dimensions.length; i++) {
      overall += (dimensions[i]?.score ?? 0) * (weights[i] ?? 0.2);
    }

    return {
      overall: Math.min(Math.max(overall, 0), 1),
      dimensions,
    };
  }

  /**
   * 可読性スコア
   */
  scoreReadability(text: string): QualityDimension {
    if (!text.trim()) {
      return { name: 'readability', score: 0, details: '空のテキスト' };
    }

    // Split into sentences
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      return { name: 'readability', score: 0.5, details: '文が検出されませんでした' };
    }

    // Calculate average sentence length
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    
    // Score based on average sentence length
    // Ideal sentence length is around 20-40 characters
    let score: number;
    if (avgLength <= 40) {
      score = 1;
    } else if (avgLength <= 60) {
      score = 0.9;
    } else if (avgLength <= 80) {
      score = 0.7;
    } else if (avgLength <= 100) {
      score = 0.5;
    } else {
      score = 0.3;
    }

    // Check for paragraph breaks (bonus)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      score = Math.min(score + 0.1, 1);
    }

    return {
      name: 'readability',
      score,
      details: `平均文長: ${avgLength.toFixed(1)}文字`,
    };
  }

  /**
   * 完全性スコア
   */
  scoreCompleteness(text: string): QualityDimension {
    if (!text.trim()) {
      return { name: 'completeness', score: 0, details: '空のテキスト' };
    }

    let score = 0.3; // Base score for having content
    const details: string[] = [];

    // Check for headings
    const headings = text.match(/^#+\s+.+$/gm) ?? [];
    if (headings.length > 0) {
      score += 0.2;
      details.push(`${headings.length}個の見出し`);
    }

    // Check for multiple sections
    const sections = text.split(/\n#{1,3}\s+/).length;
    if (sections > 2) {
      score += 0.15;
      details.push('複数セクション');
    }

    // Check for lists
    const lists = text.match(/^[-*+]\s+.+$/gm) ?? text.match(/^\d+\.\s+.+$/gm) ?? [];
    if (lists.length > 0) {
      score += 0.1;
      details.push('リスト含む');
    }

    // Check for reasonable length
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 100) {
      score += 0.15;
      details.push('十分な長さ');
    }

    // Check for code blocks
    const codeBlocks = text.match(/```[\s\S]*?```/g) ?? [];
    if (codeBlocks.length > 0) {
      score += 0.1;
      details.push('コードブロック含む');
    }

    return {
      name: 'completeness',
      score: Math.min(score, 1),
      details: details.join(', ') || 'コンテンツあり',
    };
  }

  /**
   * 引用・参照スコア
   */
  scoreCitation(text: string): QualityDimension {
    if (!text.trim()) {
      return { name: 'citation', score: 0, details: '空のテキスト' };
    }

    let score = 0.2; // Base score
    const details: string[] = [];

    // Check for URLs
    const urls = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) ?? [];
    if (urls.length > 0) {
      score += Math.min(0.3, urls.length * 0.1);
      details.push(`${urls.length}個のURL`);
    }

    // Check for citation patterns [1], [2], etc.
    const citations = text.match(/\[\d+\]/g) ?? [];
    if (citations.length > 0) {
      score += Math.min(0.2, citations.length * 0.05);
      details.push(`${citations.length}個の引用`);
    }

    // Check for "参考" or "参照" sections
    if (/参考|参照|References|Sources|Bibliography/i.test(text)) {
      score += 0.15;
      details.push('参考セクション');
    }

    // Check for quotes
    const quotes = text.match(/「[^」]+」|"[^"]+"/g) ?? [];
    if (quotes.length > 0) {
      score += Math.min(0.15, quotes.length * 0.03);
      details.push(`${quotes.length}個の引用符`);
    }

    return {
      name: 'citation',
      score: Math.min(score, 1),
      details: details.join(', ') || '引用なし',
    };
  }

  /**
   * 客観性スコア
   */
  scoreObjectivity(text: string): QualityDimension {
    if (!text.trim()) {
      return { name: 'objectivity', score: 0, details: '空のテキスト' };
    }

    let score = 0.8; // Start high, penalize subjective content
    const details: string[] = [];
    let subjectiveCount = 0;

    for (const pattern of SUBJECTIVE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        subjectiveCount += matches.length;
      }
    }

    if (subjectiveCount > 0) {
      score -= Math.min(0.5, subjectiveCount * 0.1);
      details.push(`${subjectiveCount}個の主観的表現`);
    }

    // Check for data/numbers (more objective)
    const numbers = text.match(/\d+(?:[,.]\d+)?(?:%|円|ドル|個|件|人)?/g) ?? [];
    if (numbers.length > 0) {
      score += Math.min(0.15, numbers.length * 0.02);
      details.push('数値データ含む');
    }

    // Check for "によると" (according to)
    if (/によると|according to/i.test(text)) {
      score += 0.1;
      details.push('出典参照あり');
    }

    return {
      name: 'objectivity',
      score: Math.min(Math.max(score, 0), 1),
      details: details.join(', ') || '客観的',
    };
  }

  /**
   * 新鮮さスコア
   */
  scoreFreshness(text: string): QualityDimension {
    const currentYear = new Date().getFullYear();
    
    // Extract years from text
    const yearMatches = text.match(/20\d{2}年?/g) ?? [];
    const years = yearMatches.map(y => parseInt(y.replace('年', '')));

    if (years.length === 0) {
      return {
        name: 'freshness',
        score: 0.5, // Neutral score when no dates
        details: '日付情報なし',
      };
    }

    // Get most recent year mentioned
    const mostRecent = Math.max(...years);
    const age = currentYear - mostRecent;

    let score: number;
    let details: string;

    if (age <= 0) {
      score = 1;
      details = '最新';
    } else if (age <= 1) {
      score = 0.9;
      details = '1年以内';
    } else if (age <= 2) {
      score = 0.7;
      details = '2年以内';
    } else if (age <= 5) {
      score = 0.5;
      details = `${age}年前`;
    } else {
      score = Math.max(0.2, 0.5 - (age - 5) * 0.05);
      details = `${age}年前（古い情報）`;
    }

    return {
      name: 'freshness',
      score,
      details,
    };
  }

  /**
   * 品質レポート生成
   */
  getQualityReport(text: string): QualityReport {
    const score = this.scoreContent(text);
    const strengths: string[] = [];
    const improvements: string[] = [];

    for (const dim of score.dimensions) {
      if (dim.score >= 0.7) {
        strengths.push(`${dim.name}: ${dim.details}`);
      } else if (dim.score < 0.5) {
        improvements.push(`${dim.name}の改善: ${dim.details}`);
      }
    }

    let summary: string;
    if (score.overall >= 0.8) {
      summary = '高品質なコンテンツです。';
    } else if (score.overall >= 0.6) {
      summary = '良好なコンテンツですが、改善の余地があります。';
    } else if (score.overall >= 0.4) {
      summary = '基本的なコンテンツですが、複数の改善が推奨されます。';
    } else {
      summary = 'コンテンツの品質向上が必要です。';
    }

    return {
      score,
      summary,
      strengths,
      improvements,
    };
  }
}
