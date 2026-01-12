/**
 * TaskAnalyzer - タスクの分析とエージェント選択
 *
 * @requirement REQ-ANALYZE-011
 * @design DES-ANALYZE-011-MoAEngine
 */

import type { TaskAnalysis, AgentType } from './types.js';

/**
 * タスクを分析して適切なエージェント構成を推奨
 */
export class TaskAnalyzer {
  // 創造性を示すキーワード
  private readonly creativityKeywords = [
    'create', 'design', 'imagine', 'innovative', 'novel', 'creative',
    'brainstorm', 'ideate', 'invent', 'original', 'unique',
  ];

  // ファクトチェックを示すキーワード
  private readonly factCheckKeywords = [
    'true', 'false', 'verify', 'fact', 'accurate', 'evidence',
    'prove', 'confirm', 'validate', 'check', 'correct',
  ];

  // 批評を示すキーワード
  private readonly critiqueKeywords = [
    'evaluate', 'critique', 'assess', 'review', 'analyze', 'examine',
    'weakness', 'strength', 'pros', 'cons', 'risk', 'problem',
  ];

  // 技術を示すキーワード
  private readonly technicalKeywords = [
    'code', 'program', 'software', 'algorithm', 'technical',
    'engineer', 'develop', 'implement', 'architecture', 'system',
  ];

  // ビジネスを示すキーワード
  private readonly businessKeywords = [
    'business', 'strategy', 'market', 'revenue', 'profit',
    'customer', 'sales', 'marketing', 'roi', 'investment',
  ];

  /**
   * タスクを分析
   */
  analyze(task: string): TaskAnalysis {
    const lowerTask = task.toLowerCase();

    const requiresCreativity = this.containsKeywords(lowerTask, this.creativityKeywords);
    const requiresFactCheck = this.containsKeywords(lowerTask, this.factCheckKeywords);
    const requiresCritique = this.containsKeywords(lowerTask, this.critiqueKeywords);
    const requiresTechnical = this.containsKeywords(lowerTask, this.technicalKeywords);
    const requiresBusiness = this.containsKeywords(lowerTask, this.businessKeywords);

    // 推奨エージェントを決定
    const recommendedAgents: AgentType[] = ['analytical']; // 常に分析的思考を含める

    if (requiresCreativity) {
      recommendedAgents.push('creative');
    }
    if (requiresFactCheck) {
      recommendedAgents.push('factual');
    }
    if (requiresCritique) {
      recommendedAgents.push('critical');
    }
    if (requiresTechnical) {
      recommendedAgents.push('technical');
    }
    if (requiresBusiness) {
      recommendedAgents.push('business');
    }

    // 最低3つのエージェントタイプを確保
    if (recommendedAgents.length < 3) {
      if (!recommendedAgents.includes('critical')) {
        recommendedAgents.push('critical');
      }
      if (!recommendedAgents.includes('creative') && recommendedAgents.length < 3) {
        recommendedAgents.push('creative');
      }
    }

    return {
      requiresCreativity,
      requiresFactCheck,
      requiresCritique,
      requiresTechnical,
      requiresBusiness,
      recommendedAgents,
    };
  }

  /**
   * タスクの複雑度を評価 (0-1)
   */
  evaluateComplexity(task: string): number {
    let complexity = 0;

    // 長さによる複雑度
    complexity += Math.min(task.length / 500, 0.3);

    // 疑問文の数
    const questionCount = (task.match(/\?/g) || []).length;
    complexity += Math.min(questionCount * 0.1, 0.2);

    // 専門用語の存在
    const allKeywords = [
      ...this.creativityKeywords,
      ...this.factCheckKeywords,
      ...this.critiqueKeywords,
      ...this.technicalKeywords,
      ...this.businessKeywords,
    ];
    const lowerTask = task.toLowerCase();
    const keywordCount = allKeywords.filter(k => lowerTask.includes(k)).length;
    complexity += Math.min(keywordCount * 0.05, 0.3);

    // 複数の観点を要求
    const multiPerspective = /compare|contrast|pros.*cons|advantages.*disadvantages|both/i.test(task);
    if (multiPerspective) {
      complexity += 0.2;
    }

    return Math.min(complexity, 1);
  }

  /**
   * キーワードが含まれているかチェック
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
  }
}
