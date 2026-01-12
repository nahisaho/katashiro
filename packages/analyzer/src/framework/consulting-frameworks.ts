/**
 * コンサルティングフレームワーク分析モジュール
 *
 * MECE、SWOT、3C、4P、5Forces、バリューチェーンなど
 * コンサルタントが利用する論理フレームワークを提供
 */

// ========== SWOT Types ==========
export interface SWOTAnalysis {
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  crossStrategies: CrossSWOTStrategy[];
}

export interface SWOTItem {
  item: string;
  importance: number;
  description?: string;
  evidence?: string;
}

export interface CrossSWOTStrategy {
  type: 'SO' | 'WO' | 'ST' | 'WT';
  name: string;
  description: string;
  relatedInternal: string[];
  relatedExternal: string[];
}

export interface SWOTInput {
  strengths: (string | SWOTItemInput)[];
  weaknesses: (string | SWOTItemInput)[];
  opportunities: (string | SWOTItemInput)[];
  threats: (string | SWOTItemInput)[];
}

export interface SWOTItemInput {
  item: string;
  importance?: number;
  description?: string;
  evidence?: string;
}

// ========== 3C Types ==========
export interface ThreeCAnalysis {
  company: ThreeCElement;
  customer: ThreeCElement;
  competitor: ThreeCElement;
  keySuccessFactors: string[];
  strategicImplications: string[];
}

export interface ThreeCElement {
  factors: ThreeCFactor[];
  summary: string;
}

export interface ThreeCFactor {
  name: string;
  detail: string;
  importance: number;
}

export interface ThreeCInput {
  company: ThreeCFactorInput[];
  customer: ThreeCFactorInput[];
  competitor: ThreeCFactorInput[];
}

export interface ThreeCFactorInput {
  name: string;
  detail?: string;
  importance?: number;
}

// ========== 4P Types ==========
export interface FourPAnalysis {
  product: FourPElement;
  price: FourPElement;
  place: FourPElement;
  promotion: FourPElement;
  consistency: number;
  recommendations: string[];
}

export interface FourPElement {
  current: string[];
  strengths: string[];
  challenges: string[];
  improvements: string[];
}

export interface FourPInput {
  product: FourPElementInput;
  price: FourPElementInput;
  place: FourPElementInput;
  promotion: FourPElementInput;
}

export interface FourPElementInput {
  current?: string[];
  strengths?: string[];
  challenges?: string[];
  improvements?: string[];
}

// ========== 5Forces Types ==========
export interface FiveForcesAnalysis {
  newEntrants: ForceAnalysis;
  substitutes: ForceAnalysis;
  buyerPower: ForceAnalysis;
  supplierPower: ForceAnalysis;
  rivalry: ForceAnalysis;
  industryAttractiveness: number;
  strategicImplications: string[];
}

export interface ForceAnalysis {
  intensity: number;
  factors: string[];
  description: string;
}

export interface FiveForcesInput {
  newEntrants: ForceInput;
  substitutes: ForceInput;
  buyerPower: ForceInput;
  supplierPower: ForceInput;
  rivalry: ForceInput;
}

export interface ForceInput {
  intensity?: number;
  factors?: string[];
  description?: string;
}

// ========== ValueChain Types ==========
export interface ValueChainAnalysis {
  primaryActivities: ValueChainActivity[];
  supportActivities: ValueChainActivity[];
  valueCreationPoints: string[];
  costStructure: CostItem[];
  competitiveAdvantages: string[];
}

export type ActivityType = 
  | 'inbound' | 'operations' | 'outbound' | 'marketing' | 'service'
  | 'infrastructure' | 'hr' | 'technology' | 'procurement';

export interface ValueChainActivity {
  name: string;
  type: ActivityType;
  description: string;
  valueContribution: number;
  costRatio: number;
}

export interface CostItem {
  item: string;
  ratio: number;
  improvementPotential: 'high' | 'medium' | 'low';
}

export interface ValueChainInput {
  primaryActivities: ActivityInput[];
  supportActivities: ActivityInput[];
}

export interface ActivityInput {
  name: string;
  type?: ActivityType;
  description?: string;
  valueContribution?: number;
  costRatio?: number;
}

// ========== MECE Types ==========
export interface MECEAnalysis {
  categories: MECECategory[];
  evaluation: {
    mutuallyExclusive: number;
    collectivelyExhaustive: number;
    overallScore: number;
  };
  suggestions: string[];
}

export interface MECECategory {
  name: string;
  items: string[];
  description?: string;
}

// ========== LogicTree Types ==========
export interface LogicTree {
  root: LogicTreeNode;
  type: 'why' | 'how' | 'what';
  meceCheck: boolean;
}

export interface LogicTreeNode {
  id: string;
  content: string;
  children: LogicTreeNode[];
  nodeType: 'issue' | 'cause' | 'solution' | 'action';
  priority?: number;
}

// ========== Hypothesis Types ==========
export interface HypothesisFramework {
  mainHypothesis: string;
  subHypotheses: SubHypothesis[];
  validationPlan: ValidationStep[];
  status: 'unverified' | 'partially_verified' | 'verified' | 'rejected';
}

export interface SubHypothesis {
  hypothesis: string;
  status: 'unverified' | 'verified' | 'rejected';
  evidence?: string;
}

export interface ValidationStep {
  step: string;
  method: string;
  requiredData: string[];
  completed: boolean;
}

// ========== IssueTree Types ==========
export interface IssueTree {
  centralIssue: string;
  issues: Issue[];
  prioritizedIssues: PrioritizedIssue[];
}

export interface Issue {
  id: string;
  content: string;
  parentId?: string;
  type: 'strategic' | 'operational' | 'tactical';
  solvability: 'high' | 'medium' | 'low';
}

export interface PrioritizedIssue {
  issueId: string;
  priorityScore: number;
  impact: number;
  urgency: number;
  feasibility: number;
}

/**
 * コンサルティングフレームワークアナライザー
 */
export class FrameworkAnalyzer {
  /**
   * SWOT分析を実行
   */
  analyzeSWOT(input: SWOTInput): SWOTAnalysis {
    const strengthItems = this.toSWOTItems(input.strengths);
    const weaknessItems = this.toSWOTItems(input.weaknesses);
    const opportunityItems = this.toSWOTItems(input.opportunities);
    const threatItems = this.toSWOTItems(input.threats);

    const crossStrategies = this.generateCrossStrategies(
      strengthItems, weaknessItems, opportunityItems, threatItems
    );

    return {
      strengths: strengthItems,
      weaknesses: weaknessItems,
      opportunities: opportunityItems,
      threats: threatItems,
      crossStrategies,
    };
  }

  /**
   * 3C分析を実行
   */
  analyzeThreeC(input: ThreeCInput): ThreeCAnalysis {
    const company = this.toThreeCElement(input.company);
    const customer = this.toThreeCElement(input.customer);
    const competitor = this.toThreeCElement(input.competitor);

    const keySuccessFactors = this.deriveKSF(company, customer, competitor);
    const strategicImplications = this.deriveStrategicImplications(
      company, customer, competitor, keySuccessFactors
    );

    return { company, customer, competitor, keySuccessFactors, strategicImplications };
  }

  /**
   * 4P分析を実行
   */
  analyzeFourP(input: FourPInput): FourPAnalysis {
    const product = this.toFourPElement(input.product);
    const price = this.toFourPElement(input.price);
    const place = this.toFourPElement(input.place);
    const promotion = this.toFourPElement(input.promotion);

    const consistency = this.evaluateFourPConsistency(product, price, place, promotion);
    const recommendations = this.generateFourPRecommendations(product, price, place, promotion);

    return { product, price, place, promotion, consistency, recommendations };
  }

  /**
   * 5Forces分析を実行
   */
  analyzeFiveForces(input: FiveForcesInput): FiveForcesAnalysis {
    const newEntrants = this.toForceAnalysis(input.newEntrants, '新規参入');
    const substitutes = this.toForceAnalysis(input.substitutes, '代替品');
    const buyerPower = this.toForceAnalysis(input.buyerPower, '買い手');
    const supplierPower = this.toForceAnalysis(input.supplierPower, '売り手');
    const rivalry = this.toForceAnalysis(input.rivalry, '競争');

    const avgIntensity = (newEntrants.intensity + substitutes.intensity + 
      buyerPower.intensity + supplierPower.intensity + rivalry.intensity) / 5;
    const industryAttractiveness = Math.round((6 - avgIntensity) * 10) / 10;

    const strategicImplications = this.deriveFiveForcesImplications({
      newEntrants, substitutes, buyerPower, supplierPower, rivalry,
    });

    return {
      newEntrants, substitutes, buyerPower, supplierPower, rivalry,
      industryAttractiveness, strategicImplications,
    };
  }

  /**
   * バリューチェーン分析を実行
   */
  analyzeValueChain(input: ValueChainInput): ValueChainAnalysis {
    const primaryActivities = this.toPrimaryActivities(input.primaryActivities);
    const supportActivities = this.toSupportActivities(input.supportActivities);

    const valueCreationPoints = this.identifyValueCreationPoints(primaryActivities, supportActivities);
    const costStructure = this.analyzeCostStructure(primaryActivities, supportActivities);
    const competitiveAdvantages = this.identifyCompetitiveAdvantages(
      primaryActivities, supportActivities, valueCreationPoints
    );

    return {
      primaryActivities, supportActivities, valueCreationPoints,
      costStructure, competitiveAdvantages,
    };
  }

  /**
   * MECE分析を実行
   */
  analyzeMECE(items: string[], categories?: string[]): MECEAnalysis {
    const meceCategories = categories
      ? this.categorizeItems(items, categories)
      : this.autoCategorizeMECE(items);

    const evaluation = this.evaluateMECE(meceCategories, items);
    const suggestions = this.generateMECESuggestions(meceCategories, evaluation);

    return { categories: meceCategories, evaluation, suggestions };
  }

  /**
   * ロジックツリーを構築
   */
  buildLogicTree(rootIssue: string, type: 'why' | 'how' | 'what'): LogicTree {
    return {
      root: { id: 'root', content: rootIssue, children: [], nodeType: 'issue' },
      type,
      meceCheck: false,
    };
  }

  /**
   * ロジックツリーにノードを追加
   */
  addLogicTreeNode(
    tree: LogicTree, parentId: string, content: string, nodeType: LogicTreeNode['nodeType']
  ): LogicTree {
    const newNode: LogicTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content, children: [], nodeType,
    };

    const addToParent = (node: LogicTreeNode): boolean => {
      if (node.id === parentId) {
        node.children.push(newNode);
        return true;
      }
      for (const child of node.children) {
        if (addToParent(child)) return true;
      }
      return false;
    };

    addToParent(tree.root);
    tree.meceCheck = this.checkTreeMECE(tree.root);
    return tree;
  }

  /**
   * 仮説を構築
   */
  buildHypothesis(mainHypothesis: string): HypothesisFramework {
    return {
      mainHypothesis, subHypotheses: [], validationPlan: [], status: 'unverified',
    };
  }

  /**
   * イシューツリーを構築
   */
  buildIssueTree(centralIssue: string): IssueTree {
    return { centralIssue, issues: [], prioritizedIssues: [] };
  }

  /**
   * イシューを追加
   */
  addIssue(
    tree: IssueTree, content: string,
    options: { parentId?: string; type?: Issue['type']; solvability?: Issue['solvability'] } = {}
  ): IssueTree {
    tree.issues.push({
      id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content,
      parentId: options.parentId,
      type: options.type || 'operational',
      solvability: options.solvability || 'medium',
    });
    return tree;
  }

  /**
   * イシューを優先順位付け
   */
  prioritizeIssues(tree: IssueTree): IssueTree {
    tree.prioritizedIssues = tree.issues.map((issue) => {
      const impact = this.calculateImpact(issue);
      const urgency = this.calculateUrgency(issue);
      const feasibility = this.calculateFeasibility(issue);
      return {
        issueId: issue.id,
        priorityScore: Math.round((impact * 0.4 + urgency * 0.3 + feasibility * 0.3) * 100) / 100,
        impact, urgency, feasibility,
      };
    });
    tree.prioritizedIssues.sort((a, b) => b.priorityScore - a.priorityScore);
    return tree;
  }

  // ========== Private Methods ==========

  private toSWOTItems(items: (string | SWOTItemInput)[]): SWOTItem[] {
    return items.map((item) => {
      if (typeof item === 'string') {
        return { item, importance: 3 };
      }
      return {
        item: item.item,
        importance: item.importance ?? 3,
        description: item.description,
        evidence: item.evidence,
      };
    });
  }

  private generateCrossStrategies(
    strengths: SWOTItem[], weaknesses: SWOTItem[],
    opportunities: SWOTItem[], threats: SWOTItem[]
  ): CrossSWOTStrategy[] {
    const strategies: CrossSWOTStrategy[] = [];
    const s0 = strengths[0];
    const w0 = weaknesses[0];
    const o0 = opportunities[0];
    const t0 = threats[0];

    if (s0 && o0) {
      strategies.push({
        type: 'SO', name: '積極的攻勢戦略',
        description: `${s0.item}を活かして${o0.item}を獲得する`,
        relatedInternal: strengths.slice(0, 2).map(s => s.item),
        relatedExternal: opportunities.slice(0, 2).map(o => o.item),
      });
    }
    if (w0 && o0) {
      strategies.push({
        type: 'WO', name: '弱点強化戦略',
        description: `${w0.item}を改善して${o0.item}を活かす`,
        relatedInternal: weaknesses.slice(0, 2).map(w => w.item),
        relatedExternal: opportunities.slice(0, 2).map(o => o.item),
      });
    }
    if (s0 && t0) {
      strategies.push({
        type: 'ST', name: '差別化戦略',
        description: `${s0.item}を活かして${t0.item}に対抗する`,
        relatedInternal: strengths.slice(0, 2).map(s => s.item),
        relatedExternal: threats.slice(0, 2).map(t => t.item),
      });
    }
    if (w0 && t0) {
      strategies.push({
        type: 'WT', name: '防衛・撤退戦略',
        description: `${w0.item}による${t0.item}の影響を最小化する`,
        relatedInternal: weaknesses.slice(0, 2).map(w => w.item),
        relatedExternal: threats.slice(0, 2).map(t => t.item),
      });
    }
    return strategies;
  }

  private toThreeCElement(factors: ThreeCFactorInput[]): ThreeCElement {
    const convertedFactors = factors.map(f => ({
      name: f.name, detail: f.detail || '', importance: f.importance ?? 3,
    }));
    const summary = convertedFactors.length > 0
      ? `主要な要因: ${convertedFactors.slice(0, 3).map(f => f.name).join('、')}`
      : '要因なし';
    return { factors: convertedFactors, summary };
  }

  private deriveKSF(
    company: ThreeCElement, customer: ThreeCElement, competitor: ThreeCElement
  ): string[] {
    const ksf: string[] = [];
    customer.factors.filter(f => f.importance >= 4).forEach(f => {
      ksf.push(`顧客ニーズ「${f.name}」への対応力`);
    });
    if (competitor.factors.length > 0) ksf.push('競合との明確な差別化');
    company.factors.filter(f => f.importance >= 4).forEach(f => {
      ksf.push(`${f.name}の維持・強化`);
    });
    return ksf.slice(0, 5);
  }

  private deriveStrategicImplications(
    company: ThreeCElement, customer: ThreeCElement,
    competitor: ThreeCElement, ksf: string[]
  ): string[] {
    const implications: string[] = [];
    if (ksf.length > 0) implications.push('KSFに基づく競争戦略の構築が必要');
    if (customer.factors.some(f => f.importance >= 4)) {
      implications.push('高重要度の顧客ニーズへの優先的対応');
    }
    if (competitor.factors.length > 2) {
      implications.push('競合分析に基づく差別化ポジショニング');
    }
    if (company.factors.some(f => f.importance <= 2)) {
      implications.push('自社の弱点領域の補強');
    }
    return implications;
  }

  private toFourPElement(input: FourPElementInput): FourPElement {
    return {
      current: input.current || [],
      strengths: input.strengths || [],
      challenges: input.challenges || [],
      improvements: input.improvements || [],
    };
  }

  private evaluateFourPConsistency(
    product: FourPElement, price: FourPElement, place: FourPElement, promotion: FourPElement
  ): number {
    let score = 1.0;
    const elements = [product, price, place, promotion];
    const definedCount = elements.filter(e => e.current.length > 0 || e.strengths.length > 0).length;
    score *= definedCount / 4;
    const challengeCount = elements.reduce((sum, e) => sum + e.challenges.length, 0);
    score *= Math.max(0.5, 1 - challengeCount * 0.1);
    return Math.round(score * 100) / 100;
  }

  private generateFourPRecommendations(
    product: FourPElement, price: FourPElement, place: FourPElement, promotion: FourPElement
  ): string[] {
    const recommendations: string[] = [];
    if (product.challenges.length > 0) recommendations.push(`製品の課題を解決: ${product.challenges[0]}`);
    if (price.challenges.length > 0) recommendations.push(`価格戦略の見直し: ${price.challenges[0]}`);
    if (place.challenges.length > 0) recommendations.push(`流通チャネルの最適化: ${place.challenges[0]}`);
    if (promotion.challenges.length > 0) recommendations.push(`プロモーション強化: ${promotion.challenges[0]}`);
    return recommendations;
  }

  private toForceAnalysis(input: ForceInput, name: string): ForceAnalysis {
    return {
      intensity: input.intensity ?? 3,
      factors: input.factors || [],
      description: input.description || `${name}の脅威: ${input.intensity ?? 3}/5`,
    };
  }

  private deriveFiveForcesImplications(forces: {
    newEntrants: ForceAnalysis; substitutes: ForceAnalysis;
    buyerPower: ForceAnalysis; supplierPower: ForceAnalysis; rivalry: ForceAnalysis;
  }): string[] {
    const implications: string[] = [];
    if (forces.newEntrants.intensity >= 4) implications.push('参入障壁の構築が急務');
    if (forces.substitutes.intensity >= 4) implications.push('代替品との差別化戦略が必要');
    if (forces.buyerPower.intensity >= 4) implications.push('顧客ロイヤルティ向上策の検討');
    if (forces.supplierPower.intensity >= 4) implications.push('調達先の多様化を推進');
    if (forces.rivalry.intensity >= 4) implications.push('競争激化への対応戦略が必要');
    if (implications.length === 0) implications.push('業界環境は比較的安定');
    return implications;
  }

  private toPrimaryActivities(inputs: ActivityInput[]): ValueChainActivity[] {
    const types: ActivityType[] = ['inbound', 'operations', 'outbound', 'marketing', 'service'];
    return inputs.map((input, index) => ({
      name: input.name,
      type: input.type ?? types[index % 5] as ActivityType,
      description: input.description || '',
      valueContribution: input.valueContribution ?? 3,
      costRatio: input.costRatio ?? 20,
    }));
  }

  private toSupportActivities(inputs: ActivityInput[]): ValueChainActivity[] {
    const types: ActivityType[] = ['infrastructure', 'hr', 'technology', 'procurement'];
    return inputs.map((input, index) => ({
      name: input.name,
      type: input.type ?? types[index % 4] as ActivityType,
      description: input.description || '',
      valueContribution: input.valueContribution ?? 3,
      costRatio: input.costRatio ?? 10,
    }));
  }

  private identifyValueCreationPoints(
    primary: ValueChainActivity[], support: ValueChainActivity[]
  ): string[] {
    return [...primary, ...support]
      .filter(a => a.valueContribution >= 4)
      .map(a => `${a.name} (価値貢献度: ${a.valueContribution}/5)`);
  }

  private analyzeCostStructure(
    primary: ValueChainActivity[], support: ValueChainActivity[]
  ): CostItem[] {
    return [...primary, ...support].map(a => ({
      item: a.name,
      ratio: a.costRatio,
      improvementPotential: a.costRatio > 25 ? 'high' : a.costRatio > 15 ? 'medium' : 'low',
    }));
  }

  private identifyCompetitiveAdvantages(
    primary: ValueChainActivity[], support: ValueChainActivity[], valuePoints: string[]
  ): string[] {
    const advantages: string[] = [];
    if (valuePoints.length >= 3) {
      advantages.push('複数の価値創出ポイントによる総合的な競争優位');
    }
    const highValuePrimary = primary.filter(a => a.valueContribution >= 4);
    if (highValuePrimary.length > 0) {
      advantages.push(`主活動における強み: ${highValuePrimary.map(a => a.name).join('、')}`);
    }
    const highValueSupport = support.filter(a => a.valueContribution >= 4);
    if (highValueSupport.length > 0) {
      advantages.push(`支援活動における強み: ${highValueSupport.map(a => a.name).join('、')}`);
    }
    return advantages;
  }

  private categorizeItems(items: string[], categories: string[]): MECECategory[] {
    const result: MECECategory[] = categories.map(cat => ({ name: cat, items: [] }));
    items.forEach(item => {
      let assigned = false;
      for (const cat of result) {
        const first = item.toLowerCase().split(' ')[0] || '';
        if (item.toLowerCase().includes(cat.name.toLowerCase()) ||
            cat.name.toLowerCase().includes(first)) {
          cat.items.push(item);
          assigned = true;
          break;
        }
      }
      if (!assigned && result.length > 0) {
        const lastCat = result[result.length - 1];
        if (lastCat) lastCat.items.push(item);
      }
    });
    return result;
  }

  private autoCategorizeMECE(items: string[]): MECECategory[] {
    if (items.length <= 3) {
      return [{ name: '全体', items }];
    }
    const categoryCount = Math.min(Math.ceil(items.length / 3), 5);
    const categories: MECECategory[] = [];
    for (let i = 0; i < categoryCount; i++) {
      categories.push({ name: `カテゴリ${i + 1}`, items: [] });
    }
    items.forEach((item, index) => {
      const cat = categories[index % categoryCount];
      if (cat) cat.items.push(item);
    });
    return categories;
  }

  private evaluateMECE(
    categories: MECECategory[], originalItems: string[]
  ): MECEAnalysis['evaluation'] {
    const allCategorizedItems = categories.flatMap(c => c.items);
    const uniqueItems = new Set(allCategorizedItems);
    const mutuallyExclusive = allCategorizedItems.length === uniqueItems.size ? 1.0 : 0.5;

    const coveredItems = new Set(allCategorizedItems);
    const uncovered = originalItems.filter(i => !coveredItems.has(i));
    const collectivelyExhaustive = uncovered.length === 0 
      ? 1.0 
      : 1.0 - uncovered.length / originalItems.length;

    const overallScore = (mutuallyExclusive + collectivelyExhaustive) / 2;
    return {
      mutuallyExclusive: Math.round(mutuallyExclusive * 100) / 100,
      collectivelyExhaustive: Math.round(collectivelyExhaustive * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
    };
  }

  private generateMECESuggestions(
    categories: MECECategory[], evaluation: MECEAnalysis['evaluation']
  ): string[] {
    const suggestions: string[] = [];
    if (evaluation.mutuallyExclusive < 1.0) {
      suggestions.push('カテゴリ間で重複するアイテムがあります。分類基準を見直してください。');
    }
    if (evaluation.collectivelyExhaustive < 1.0) {
      suggestions.push('すべてのアイテムがカテゴリに含まれていません。漏れを確認してください。');
    }
    if (categories.some(c => c.items.length === 0)) {
      suggestions.push('空のカテゴリがあります。カテゴリの統合を検討してください。');
    }
    if (categories.some(c => c.items.length > 10)) {
      suggestions.push('アイテムが多すぎるカテゴリがあります。細分化を検討してください。');
    }
    if (suggestions.length === 0) {
      suggestions.push('MECE性は良好です。');
    }
    return suggestions;
  }

  private checkTreeMECE(node: LogicTreeNode): boolean {
    if (node.children.length === 0) return true;
    const contents = node.children.map(c => c.content.toLowerCase());
    const unique = new Set(contents);
    if (contents.length !== unique.size) return false;
    return node.children.every(child => this.checkTreeMECE(child));
  }

  private calculateImpact(issue: Issue): number {
    const scores: Record<Issue['type'], number> = { strategic: 5, operational: 3, tactical: 2 };
    return scores[issue.type];
  }

  private calculateUrgency(issue: Issue): number {
    const scores: Record<Issue['solvability'], number> = { low: 4, medium: 3, high: 2 };
    return scores[issue.solvability];
  }

  private calculateFeasibility(issue: Issue): number {
    const scores: Record<Issue['solvability'], number> = { high: 5, medium: 3, low: 1 };
    return scores[issue.solvability];
  }
}
