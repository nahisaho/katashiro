/**
 * MultiSourceComparator - 複数ソース比較分析
 *
 * @since 0.2.0
 * @requirement REQ-ANALYZE-002-ENH-001
 * @design DES-KATASHIRO-002 §4.7 比較分析強化
 */

/**
 * 比較用ソース
 */
export interface SourceForComparison {
  /** ソースID */
  id: string;
  /** コンテンツ本文 */
  content: string;
  /** メタデータ */
  metadata?: {
    title?: string;
    url?: string;
    credibility?: number;
  };
}

/**
 * 抽出されたクレーム（主張）
 */
export interface ExtractedClaim {
  /** 主張文 */
  statement: string;
  /** ソースID */
  sourceId: string;
  /** 抽出確度 (0-1) */
  confidence: number;
  /** 周辺文脈 */
  context: string;
}

/**
 * クレーム比較結果
 */
export interface ClaimComparison {
  /** 主張文（正規化済み） */
  statement: string;
  /** 支持するソース */
  supportingSources: string[];
  /** 否定するソース */
  opposingSources: string[];
  /** 中立（言及なし）のソース */
  neutralSources: string[];
  /** 合意度スコア (0-100%) */
  consensusScore: number;
}

/**
 * 比較分析結果
 */
export interface ComparisonResult {
  /** トピック */
  topic: string;
  /** クレーム比較リスト */
  claims: ClaimComparison[];
  /** 各ソース独自の洞察 */
  uniqueInsights: Array<{ sourceId: string; insight: string }>;
  /** 比較マトリクス（Markdown表形式） */
  matrix: string;
  /** 要約 */
  summary: string;
}

/**
 * 比較オプション
 */
export interface ComparisonOptions {
  /** 最小クレーム長（文字数） */
  minClaimLength?: number;
  /** 合意判定閾値 */
  consensusThreshold?: number;
  /** 類似度閾値 */
  similarityThreshold?: number;
}

/**
 * 複数ソース比較分析クラス
 */
export class MultiSourceComparator {
  /** デフォルト設定 */
  private static readonly DEFAULTS: Required<ComparisonOptions> = {
    minClaimLength: 10,
    consensusThreshold: 0.6,
    similarityThreshold: 0.8,
  };

  /**
   * 複数ソースを比較分析
   */
  async compare(
    topic: string,
    sources: SourceForComparison[],
    options?: ComparisonOptions
  ): Promise<ComparisonResult> {
    const opts = { ...MultiSourceComparator.DEFAULTS, ...options };

    if (sources.length < 2) {
      throw new Error('At least 2 sources are required for comparison');
    }

    // 1. 各ソースからクレームを抽出
    const allClaims: ExtractedClaim[] = [];
    for (const source of sources) {
      const claims = await this.extractClaims(source.content, source.id, opts);
      allClaims.push(...claims);
    }

    // 2. クレームをクラスタリング（類似クレームをグループ化）
    const claimClusters = this.clusterClaims(allClaims, opts.similarityThreshold);

    // 3. 各クラスタの合意度を計算
    const sourceIds = sources.map(s => s.id);
    const claimComparisons = claimClusters.map(cluster => 
      this.calculateConsensus(cluster, sourceIds)
    );

    // 4. 独自インサイトを抽出
    const uniqueInsights = this.extractUniqueInsights(allClaims, claimClusters, sources);

    // 5. 比較マトリクスを生成
    const matrix = this.generateMatrix(claimComparisons, sources);

    // 6. 要約を生成
    const summary = this.generateSummary(topic, claimComparisons, uniqueInsights);

    return {
      topic,
      claims: claimComparisons,
      uniqueInsights,
      matrix,
      summary,
    };
  }

  /**
   * テキストからクレーム（主張）を抽出
   */
  async extractClaims(
    content: string, 
    sourceId: string,
    options: Required<ComparisonOptions>
  ): Promise<ExtractedClaim[]> {
    const claims: ExtractedClaim[] = [];
    
    // 文分割（日本語・英語対応）
    const sentences = content
      .split(/[。．.!?！？\n]+/)
      .map(s => s.trim())
      .filter(s => s.length >= options.minClaimLength);

    for (const sentence of sentences) {
      // 事実主張フィルタ（意見・推測を除外）
      if (this.isFactualClaim(sentence)) {
        // 周辺文脈を取得
        const contextStart = Math.max(0, content.indexOf(sentence) - 50);
        const contextEnd = Math.min(content.length, content.indexOf(sentence) + sentence.length + 50);
        const context = content.slice(contextStart, contextEnd);

        claims.push({
          statement: sentence,
          sourceId,
          confidence: this.calculateClaimConfidence(sentence),
          context,
        });
      }
    }

    return claims;
  }

  /**
   * 事実主張かどうか判定
   */
  private isFactualClaim(sentence: string): boolean {
    // 意見・推測を示す表現を除外
    const opinionPatterns = [
      /思[うい]ます?/,
      /考え(ます|られ)/,
      /でしょう/,
      /かもしれ/,
      /ではないか/,
      /らしい$/,
      /ようだ$/,
      /I think/i,
      /I believe/i,
      /probably/i,
      /maybe/i,
      /might be/i,
      /could be/i,
      /in my opinion/i,
    ];

    for (const pattern of opinionPatterns) {
      if (pattern.test(sentence)) {
        return false;
      }
    }

    // 事実を示す表現を含むかチェック
    const factPatterns = [
      /である/,
      /です$/,
      /した$/,
      /いる$/,
      /ある$/,
      /によると/,
      /は.*だ$/,
      /\d+[%％]/,
      /\d+[年月日]/,
      /is|are|was|were/i,
      /according to/i,
    ];

    for (const pattern of factPatterns) {
      if (pattern.test(sentence)) {
        return true;
      }
    }

    return sentence.length > 20; // 短すぎる文は除外
  }

  /**
   * クレームの確度を計算
   */
  private calculateClaimConfidence(sentence: string): number {
    let confidence = 0.5; // ベース

    // 数値を含む → 具体的で信頼性高い
    if (/\d/.test(sentence)) {
      confidence += 0.2;
    }

    // 引用元を含む
    if (/によると|according to/i.test(sentence)) {
      confidence += 0.15;
    }

    // 固有名詞を含む（大文字始まり、または引用符内）
    if (/[A-Z][a-z]+|「.+」|".+"/.test(sentence)) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * 類似クレームをクラスタリング
   */
  private clusterClaims(
    claims: ExtractedClaim[],
    similarityThreshold: number
  ): ExtractedClaim[][] {
    const clusters: ExtractedClaim[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < claims.length; i++) {
      if (used.has(i)) continue;

      const currentClaim = claims[i];
      if (!currentClaim) continue;

      const cluster: ExtractedClaim[] = [currentClaim];
      used.add(i);

      for (let j = i + 1; j < claims.length; j++) {
        if (used.has(j)) continue;

        const otherClaim = claims[j];
        if (!otherClaim) continue;

        const similarity = this.calculateSimilarity(
          currentClaim.statement,
          otherClaim.statement
        );

        if (similarity >= similarityThreshold) {
          cluster.push(otherClaim);
          used.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * 文字列の類似度を計算（Jaccard係数ベース）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * テキストをトークン化
   */
  private tokenize(text: string): string[] {
    // 簡易的なトークン化（形態素解析なし）
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  /**
   * クラスタの合意度を計算
   */
  calculateConsensus(
    cluster: ExtractedClaim[],
    allSourceIds: string[]
  ): ClaimComparison {
    // 代表的な主張文を選択（最も確度が高いもの）
    const representative = cluster.reduce((a, b) => 
      a.confidence > b.confidence ? a : b
    );

    // ソースを分類
    const mentionedSources = new Set(cluster.map(c => c.sourceId));
    const supportingSources = [...mentionedSources];
    const neutralSources = allSourceIds.filter(id => !mentionedSources.has(id));

    // 合意度 = 言及ソース数 / 全ソース数
    const consensusScore = (supportingSources.length / allSourceIds.length) * 100;

    return {
      statement: representative.statement,
      supportingSources,
      opposingSources: [], // 否定の検出は高度なNLPが必要
      neutralSources,
      consensusScore,
    };
  }

  /**
   * 独自インサイトを抽出
   */
  private extractUniqueInsights(
    _allClaims: ExtractedClaim[],
    clusters: ExtractedClaim[][],
    sources: SourceForComparison[]
  ): Array<{ sourceId: string; insight: string }> {
    const insights: Array<{ sourceId: string; insight: string }> = [];

    // 単一ソースのみに含まれるクレームを抽出
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const claim = cluster[0];
        if (claim) {
          const source = sources.find(s => s.id === claim.sourceId);
          if (source && claim.confidence > 0.6) {
            insights.push({
              sourceId: claim.sourceId,
              insight: claim.statement,
            });
          }
        }
      }
    }

    // ソースごとに最大3件に制限
    const bySource = new Map<string, Array<{ sourceId: string; insight: string }>>();
    for (const insight of insights) {
      const list = bySource.get(insight.sourceId) || [];
      if (list.length < 3) {
        list.push(insight);
        bySource.set(insight.sourceId, list);
      }
    }

    return Array.from(bySource.values()).flat();
  }

  /**
   * 比較マトリクスを生成
   */
  generateMatrix(
    comparisons: ClaimComparison[],
    sources: SourceForComparison[]
  ): string {
    if (comparisons.length === 0) {
      return '| Claim | (No claims extracted) |\n|-------|----------------------|';
    }

    // ヘッダー行
    const sourceNames = sources.map(s => s.metadata?.title || s.id);
    const header = `| Claim | ${sourceNames.join(' | ')} |`;
    const separator = `|${'-'.repeat(7)}|${sourceNames.map(() => '-'.repeat(5)).join('|')}|`;

    // データ行
    const rows = comparisons.slice(0, 10).map(comp => {
      const shortClaim = comp.statement.slice(0, 50) + (comp.statement.length > 50 ? '...' : '');
      const cells = sources.map(s => {
        if (comp.supportingSources.includes(s.id)) return '✓';
        if (comp.opposingSources.includes(s.id)) return '✗';
        return '-';
      });
      return `| ${shortClaim} | ${cells.join(' | ')} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  /**
   * 要約を生成
   */
  private generateSummary(
    topic: string,
    comparisons: ClaimComparison[],
    uniqueInsights: Array<{ sourceId: string; insight: string }>
  ): string {
    const consensusClaims = comparisons.filter(c => c.consensusScore >= 80);
    const controversialClaims = comparisons.filter(c => 
      c.consensusScore < 50 && c.supportingSources.length > 0
    );

    const parts: string[] = [];

    parts.push(`## ${topic} - 比較分析結果`);
    parts.push('');

    if (consensusClaims.length > 0) {
      parts.push(`### 合意点（${consensusClaims.length}件）`);
      for (const claim of consensusClaims.slice(0, 5)) {
        parts.push(`- ${claim.statement}`);
      }
      parts.push('');
    }

    if (controversialClaims.length > 0) {
      parts.push(`### 意見が分かれる点（${controversialClaims.length}件）`);
      for (const claim of controversialClaims.slice(0, 5)) {
        parts.push(`- ${claim.statement}`);
      }
      parts.push('');
    }

    if (uniqueInsights.length > 0) {
      parts.push(`### 独自の視点（${uniqueInsights.length}件）`);
      for (const insight of uniqueInsights.slice(0, 5)) {
        parts.push(`- [${insight.sourceId}] ${insight.insight}`);
      }
    }

    return parts.join('\n');
  }
}
