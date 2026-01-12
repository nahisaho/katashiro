/**
 * ContributionAnalyzer
 * AI/人間の貢献度を分析するクラス
 *
 * @module transparency/contribution-analyzer
 * @requirement Phase 2 - 透明性機能
 */

import type {
  ContributionAnalysis,
  SectionContribution,
  ContributionSummary,
  ContributorType,
  AIContributionType,
  HumanContributionType,
} from './types.js';

/** セクション入力 */
export interface SectionInput {
  /** セクションID */
  id: string;
  /** セクション名 */
  name: string;
  /** セクション内容 */
  content: string;
  /** AIによる生成か（既知の場合） */
  isAIGenerated?: boolean;
  /** AIモデル（既知の場合） */
  aiModel?: string;
  /** 人間貢献者（既知の場合） */
  humanContributor?: string;
  /** AI貢献の種類（既知の場合） */
  aiContributions?: AIContributionType[];
  /** 人間貢献の種類（既知の場合） */
  humanContributions?: HumanContributionType[];
  /** 作成日時 */
  createdAt?: Date;
  /** 更新日時 */
  updatedAt?: Date;
}

/** 分析オプション */
export interface AnalysisOptions {
  /** 詳細分析を行うか */
  detailed?: boolean;
  /** デフォルトのAI貢献率（情報がない場合） */
  defaultAIRatio?: number;
  /** 閾値：この比率以上でAI主導と判定 */
  aiDominantThreshold?: number;
  /** 閾値：この比率以下で人間主導と判定 */
  humanDominantThreshold?: number;
}

/** AIパターン検出結果 */
interface AIPatternResult {
  score: number;
  patterns: string[];
}

/**
 * ContributionAnalyzer
 * セクション単位でAIと人間の貢献度を分析
 */
export class ContributionAnalyzer {
  private aiDominantThreshold: number;
  private humanDominantThreshold: number;

  constructor(options?: { aiDominantThreshold?: number; humanDominantThreshold?: number }) {
    this.aiDominantThreshold = options?.aiDominantThreshold ?? 70;
    this.humanDominantThreshold = options?.humanDominantThreshold ?? 30;
  }

  /**
   * ドキュメント全体の貢献度を分析
   */
  analyze(
    documentId: string,
    title: string,
    sections: SectionInput[],
    options?: AnalysisOptions
  ): ContributionAnalysis {
    const opts = {
      detailed: false,
      defaultAIRatio: 50,
      aiDominantThreshold: this.aiDominantThreshold,
      humanDominantThreshold: this.humanDominantThreshold,
      ...options,
    };

    const analyzedSections = sections.map((section) => this.analyzeSection(section, opts));

    const summary = this.calculateSummary(analyzedSections, opts);
    const aiModelsUsed = this.extractUniqueAIModels(analyzedSections);
    const humanContributors = this.extractUniqueHumanContributors(analyzedSections);

    const overallAIRatio = summary.totalChars > 0
      ? Math.round((summary.aiGeneratedChars + summary.mixedChars * 0.5) / summary.totalChars * 100)
      : 0;

    return {
      documentId,
      title,
      overallAIRatio,
      overallHumanRatio: 100 - overallAIRatio,
      sections: analyzedSections,
      aiModelsUsed,
      humanContributors,
      summary,
      analyzedAt: new Date(),
    };
  }

  /**
   * 単一セクションの貢献度を分析
   */
  analyzeSection(section: SectionInput, options?: AnalysisOptions): SectionContribution {
    const opts = {
      defaultAIRatio: 50,
      ...options,
    };

    let aiRatio: number;
    let contributorType: ContributorType;

    if (section.isAIGenerated !== undefined) {
      // 明示的に指定されている場合
      aiRatio = section.isAIGenerated ? 100 : 0;
    } else {
      // ヒューリスティック分析
      aiRatio = this.estimateAIRatio(section.content, opts);
    }

    // 貢献者タイプを決定
    if (aiRatio >= (opts.aiDominantThreshold ?? 70)) {
      contributorType = 'ai';
    } else if (aiRatio <= (opts.humanDominantThreshold ?? 30)) {
      contributorType = 'human';
    } else {
      contributorType = 'mixed';
    }

    // 貢献の種類を推定
    const aiContributions = section.aiContributions ?? this.inferAIContributions(section.content, aiRatio);
    const humanContributions = section.humanContributions ?? this.inferHumanContributions(contributorType);

    return {
      sectionId: section.id,
      sectionName: section.name,
      content: section.content,
      charCount: section.content.length,
      contributorType,
      aiContributionRatio: aiRatio,
      aiContributions,
      humanContributions,
      aiModel: section.aiModel,
      humanContributor: section.humanContributor,
      createdAt: section.createdAt ?? new Date(),
      updatedAt: section.updatedAt ?? new Date(),
    };
  }

  /**
   * AI貢献率を推定（ヒューリスティック分析）
   */
  private estimateAIRatio(content: string, options: AnalysisOptions): number {
    if (!content || content.trim().length === 0) {
      return options.defaultAIRatio ?? 50;
    }

    // AI生成テキストの特徴をチェック
    const patterns = this.detectAIPatterns(content);

    // パターンに基づいてスコアを計算
    return Math.min(100, Math.max(0, patterns.score));
  }

  /**
   * AI生成テキストの特徴パターンを検出
   */
  private detectAIPatterns(content: string): AIPatternResult {
    let score = 50; // 基準スコア
    const detectedPatterns: string[] = [];

    // AI生成テキストによく見られるパターン

    // 1. 構造化された見出し（多すぎると AI っぽい）
    const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
    if (headingCount > 5) {
      score += 10;
      detectedPatterns.push('structured-headings');
    }

    // 2. リスト形式の多用
    const listCount = (content.match(/^[-*]\s|^\d+\.\s/gm) || []).length;
    if (listCount > 10) {
      score += 10;
      detectedPatterns.push('extensive-lists');
    }

    // 3. 説明的な接続詞・フレーズ
    const explanatoryPhrases = [
      'まず', 'つまり', '具体的には', '例えば', '要するに',
      'さらに', 'また', 'そして', '一方で', 'したがって',
      'In summary', 'Additionally', 'Furthermore', 'Moreover', 'In conclusion',
    ];
    const phraseCount = explanatoryPhrases.filter(p => content.includes(p)).length;
    if (phraseCount > 5) {
      score += 15;
      detectedPatterns.push('explanatory-phrases');
    }

    // 4. 均一な段落長
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 3) {
      const lengths = paragraphs.map(p => p.length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < avg * 0.3) {
        score += 10;
        detectedPatterns.push('uniform-paragraph-length');
      }
    }

    // 5. 丁寧で形式的な表現
    const formalExpressions = [
      'させていただきます', 'ございます', 'いたします',
      '以下のとおりです', '次のように',
    ];
    if (formalExpressions.some(expr => content.includes(expr))) {
      score += 5;
      detectedPatterns.push('formal-expressions');
    }

    // 6. 短い文が連続（人間的）
    const sentences = content.split(/[。.!?！？]/);
    const shortSentences = sentences.filter(s => s.trim().length > 0 && s.trim().length < 30);
    if (shortSentences.length / sentences.length > 0.5) {
      score -= 10;
      detectedPatterns.push('human-like-short-sentences');
    }

    // 7. 口語表現（人間的）
    const colloquialExpressions = [
      'ね', 'よ', 'かな', 'だろう', 'じゃん',
      'すごい', 'めっちゃ', 'やっぱり',
    ];
    if (colloquialExpressions.some(expr => content.includes(expr))) {
      score -= 15;
      detectedPatterns.push('colloquial-expressions');
    }

    // 8. タイプミス・誤字（人間的）
    // 簡易的な検出：同じ文字の3連続など
    if (/(.)\1{2,}/.test(content)) {
      score -= 10;
      detectedPatterns.push('potential-typos');
    }

    return { score, patterns: detectedPatterns };
  }

  /**
   * AI貢献の種類を推定
   */
  private inferAIContributions(content: string, aiRatio: number): AIContributionType[] {
    const contributions: AIContributionType[] = [];

    if (aiRatio >= 70) {
      contributions.push('generation');
    } else if (aiRatio >= 30) {
      contributions.push('completion');
      contributions.push('editing');
    }

    // コンテンツ内容から追加推定
    if (content.includes('## ') || content.includes('### ')) {
      contributions.push('formatting');
    }

    if (content.includes('まとめ') || content.includes('要約') || content.includes('Summary')) {
      contributions.push('summarization');
    }

    return [...new Set(contributions)];
  }

  /**
   * 人間貢献の種類を推定
   */
  private inferHumanContributions(contributorType: ContributorType): HumanContributionType[] {
    switch (contributorType) {
      case 'human':
        return ['original'];
      case 'mixed':
        return ['review', 'editing', 'direction'];
      case 'ai':
        return ['direction', 'verification'];
      default:
        return [];
    }
  }

  /**
   * 貢献サマリを計算
   */
  private calculateSummary(
    sections: SectionContribution[],
    options: { aiDominantThreshold?: number; humanDominantThreshold?: number }
  ): ContributionSummary {
    const opts = {
      aiDominantThreshold: this.aiDominantThreshold,
      humanDominantThreshold: this.humanDominantThreshold,
      ...options,
    };

    let aiGeneratedChars = 0;
    let humanCreatedChars = 0;
    let mixedChars = 0;
    let aiDominantSections = 0;
    let humanDominantSections = 0;
    let equalContributionSections = 0;

    for (const section of sections) {
      const charCount = section.charCount;

      if (section.aiContributionRatio >= opts.aiDominantThreshold) {
        aiGeneratedChars += charCount;
        aiDominantSections++;
      } else if (section.aiContributionRatio <= opts.humanDominantThreshold) {
        humanCreatedChars += charCount;
        humanDominantSections++;
      } else {
        mixedChars += charCount;
        equalContributionSections++;
      }
    }

    return {
      aiGeneratedChars,
      humanCreatedChars,
      mixedChars,
      totalChars: aiGeneratedChars + humanCreatedChars + mixedChars,
      totalSections: sections.length,
      aiDominantSections,
      humanDominantSections,
      equalContributionSections,
    };
  }

  /**
   * 使用されたAIモデルを抽出
   */
  private extractUniqueAIModels(sections: SectionContribution[]): string[] {
    const models = new Set<string>();
    for (const section of sections) {
      if (section.aiModel) {
        models.add(section.aiModel);
      }
    }
    return Array.from(models);
  }

  /**
   * 人間貢献者を抽出
   */
  private extractUniqueHumanContributors(sections: SectionContribution[]): string[] {
    const contributors = new Set<string>();
    for (const section of sections) {
      if (section.humanContributor) {
        contributors.add(section.humanContributor);
      }
    }
    return Array.from(contributors);
  }

  /**
   * セクションをマージ
   */
  mergeSections(sections: SectionContribution[]): SectionContribution {
    if (sections.length === 0) {
      throw new Error('At least one section is required');
    }

    if (sections.length === 1) {
      return sections[0]!;
    }

    const totalChars = sections.reduce((sum, s) => sum + s.charCount, 0);
    const weightedAIRatio = sections.reduce(
      (sum, s) => sum + s.aiContributionRatio * s.charCount,
      0
    ) / totalChars;

    const mergedContent = sections.map(s => s.content).join('\n\n');
    const allAIContributions = [...new Set(sections.flatMap(s => s.aiContributions))];
    const allHumanContributions = [...new Set(sections.flatMap(s => s.humanContributions))];
    const allAIModels = [...new Set(sections.map(s => s.aiModel).filter(Boolean))] as string[];
    const allHumanContributors = [...new Set(sections.map(s => s.humanContributor).filter(Boolean))] as string[];

    let contributorType: ContributorType;
    if (weightedAIRatio >= this.aiDominantThreshold) {
      contributorType = 'ai';
    } else if (weightedAIRatio <= this.humanDominantThreshold) {
      contributorType = 'human';
    } else {
      contributorType = 'mixed';
    }

    return {
      sectionId: `merged-${sections.map(s => s.sectionId).join('-')}`,
      sectionName: 'Merged Section',
      content: mergedContent,
      charCount: totalChars,
      contributorType,
      aiContributionRatio: Math.round(weightedAIRatio),
      aiContributions: allAIContributions,
      humanContributions: allHumanContributions,
      aiModel: allAIModels.length > 0 ? allAIModels.join(', ') : undefined,
      humanContributor: allHumanContributors.length > 0 ? allHumanContributors.join(', ') : undefined,
      createdAt: sections.reduce((min, s) => s.createdAt < min ? s.createdAt : min, sections[0]!.createdAt),
      updatedAt: sections.reduce((max, s) => s.updatedAt > max ? s.updatedAt : max, sections[0]!.updatedAt),
    };
  }
}
