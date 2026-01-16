/**
 * Framework Reasoning - コンサルティングフレームワーク統合モジュール
 *
 * クエリタイプに応じて適切なフレームワークを選択し、
 * 各フェーズで構造化された分析を行う
 *
 * @version 3.1.0 (v2.5.0)
 */

import type { KnowledgeItem, ReflectiveQuestion, ResearchContext, LMProvider } from './types.js';

// ========== フレームワークタイプ ==========

/**
 * サポートされるフレームワークタイプ
 */
export type FrameworkType =
  | 'swot'           // 強み・弱み・機会・脅威
  | '3c'             // 自社・顧客・競合
  | '4p'             // 製品・価格・流通・販促
  | '5forces'        // ポーターの5フォース
  | 'valuechain'     // バリューチェーン
  | 'pestel'         // 政治・経済・社会・技術・環境・法律
  | 'mece'           // 漏れなくダブりなく
  | 'hypothesis'     // 仮説検証
  | 'general';       // 汎用（フレームワークなし）

/**
 * クエリタイプ
 */
export type QueryType =
  | 'strategy'       // 戦略策定
  | 'market'         // 市場分析
  | 'competitor'     // 競合分析
  | 'product'        // 製品・サービス分析
  | 'internal'       // 内部環境分析
  | 'external'       // 外部環境分析
  | 'marketing'      // マーケティング
  | 'investment'     // 投資判断
  | 'general';       // 一般的な調査

/**
 * フレームワーク選択結果
 */
export interface FrameworkSelection {
  queryType: QueryType;
  primaryFramework: FrameworkType;
  secondaryFrameworks: FrameworkType[];
  reasoning: string;
  axes: FrameworkAxis[];
}

/**
 * フレームワークの軸（質問生成・分類に使用）
 */
export interface FrameworkAxis {
  name: string;
  description: string;
  keywords: string[];
  questions: string[];
}

/**
 * フレームワーク分析結果
 */
export interface FrameworkAnalysisResult {
  framework: FrameworkType;
  axes: AnalyzedAxis[];
  crossAnalysis?: CrossAnalysisResult;
  insights: string[];
  recommendations: string[];
}

/**
 * 分析済み軸
 */
export interface AnalyzedAxis {
  name: string;
  items: AxisItem[];
  summary: string;
  confidence: number;
}

/**
 * 軸アイテム
 */
export interface AxisItem {
  content: string;
  importance: number;
  evidence: string[];
  sources: string[];
}

/**
 * クロス分析結果（SWOT戦略など）
 */
export interface CrossAnalysisResult {
  type: string;
  strategies: CrossStrategy[];
}

/**
 * クロス戦略
 */
export interface CrossStrategy {
  name: string;
  description: string;
  relatedAxes: string[];
  priority: number;
}

// ========== フレームワーク定義 ==========

/**
 * 各フレームワークの軸定義
 */
const FRAMEWORK_DEFINITIONS: Record<FrameworkType, FrameworkAxis[]> = {
  swot: [
    {
      name: 'Strengths',
      description: '内部の強み・競争優位',
      keywords: ['強み', '優位', '得意', '実績', '技術力', 'strength', 'advantage', 'core competency'],
      questions: [
        '競合と比較した際の強みは何か？',
        '独自の技術やノウハウはあるか？',
        'ブランド力や認知度はどうか？',
        '人材や組織の強みは何か？',
      ],
    },
    {
      name: 'Weaknesses',
      description: '内部の弱み・課題',
      keywords: ['弱み', '課題', '問題', '不足', '劣る', 'weakness', 'challenge', 'limitation'],
      questions: [
        '改善が必要な領域は何か？',
        'リソースが不足している分野は？',
        '競合に劣っている点は何か？',
        '組織的な課題はあるか？',
      ],
    },
    {
      name: 'Opportunities',
      description: '外部環境の機会',
      keywords: ['機会', 'チャンス', '成長', '市場拡大', 'トレンド', 'opportunity', 'growth', 'trend'],
      questions: [
        '市場のトレンドや成長機会は何か？',
        '技術革新による機会はあるか？',
        '規制緩和の影響は？',
        '新たな顧客セグメントの可能性は？',
      ],
    },
    {
      name: 'Threats',
      description: '外部環境の脅威',
      keywords: ['脅威', 'リスク', '競合参入', '規制強化', 'threat', 'risk', 'competition'],
      questions: [
        '競合からの脅威は何か？',
        '技術的な陳腐化リスクは？',
        '規制強化の影響は？',
        '経済環境の変化による影響は？',
      ],
    },
  ],
  '3c': [
    {
      name: 'Company',
      description: '自社分析',
      keywords: ['自社', '当社', '我々', '弊社', 'company', 'ourselves', 'internal'],
      questions: [
        '自社の強みと弱みは何か？',
        '保有するリソースや能力は？',
        '事業戦略の方向性は？',
        '組織文化や価値観は？',
      ],
    },
    {
      name: 'Customer',
      description: '顧客分析',
      keywords: ['顧客', 'ユーザー', '消費者', 'ニーズ', '購買', 'customer', 'user', 'need'],
      questions: [
        'ターゲット顧客は誰か？',
        '顧客のニーズや課題は何か？',
        '購買決定要因は何か？',
        '顧客満足度はどうか？',
      ],
    },
    {
      name: 'Competitor',
      description: '競合分析',
      keywords: ['競合', 'ライバル', '他社', '市場シェア', 'competitor', 'rival', 'market share'],
      questions: [
        '主要な競合企業は誰か？',
        '競合の戦略は何か？',
        '競合の強みと弱みは？',
        '市場シェアの分布は？',
      ],
    },
  ],
  '4p': [
    {
      name: 'Product',
      description: '製品・サービス',
      keywords: ['製品', 'サービス', '商品', '機能', '品質', 'product', 'service', 'feature'],
      questions: [
        '製品・サービスの特徴は何か？',
        '顧客に提供する価値は？',
        '品質やデザインはどうか？',
        'ラインナップの構成は？',
      ],
    },
    {
      name: 'Price',
      description: '価格戦略',
      keywords: ['価格', '料金', 'コスト', '値段', 'プライシング', 'price', 'cost', 'pricing'],
      questions: [
        '価格設定の方針は？',
        '競合との価格比較は？',
        '価格弾力性はどうか？',
        '割引やプロモーション価格は？',
      ],
    },
    {
      name: 'Place',
      description: '流通・チャネル',
      keywords: ['流通', 'チャネル', '販売', '店舗', '配送', 'place', 'channel', 'distribution'],
      questions: [
        '販売チャネルは何か？',
        '流通経路の効率性は？',
        'オンライン/オフラインの比率は？',
        '地理的なカバレッジは？',
      ],
    },
    {
      name: 'Promotion',
      description: '販売促進・広告',
      keywords: ['広告', 'プロモーション', 'マーケティング', 'PR', '販促', 'promotion', 'advertising', 'marketing'],
      questions: [
        'プロモーション戦略は何か？',
        '広告媒体の選択は？',
        'デジタルマーケティングの活用は？',
        'ブランディングの取り組みは？',
      ],
    },
  ],
  '5forces': [
    {
      name: 'NewEntrants',
      description: '新規参入の脅威',
      keywords: ['新規参入', '参入障壁', '新興', 'スタートアップ', 'new entrant', 'barrier to entry'],
      questions: [
        '参入障壁の高さは？',
        '新規参入者の動向は？',
        '必要な初期投資は？',
        '規制による参入制限は？',
      ],
    },
    {
      name: 'Substitutes',
      description: '代替品の脅威',
      keywords: ['代替', '代わり', '置き換え', '他の選択肢', 'substitute', 'alternative'],
      questions: [
        '代替品・代替サービスは存在するか？',
        '代替品への切り替えコストは？',
        '代替品の価格性能比は？',
        'テクノロジーによる代替リスクは？',
      ],
    },
    {
      name: 'BuyerPower',
      description: '買い手の交渉力',
      keywords: ['買い手', '顧客', '交渉力', '価格感度', 'buyer power', 'customer power'],
      questions: [
        '顧客の価格感度はどの程度か？',
        '顧客の集中度は？',
        '切り替えコストは高いか低いか？',
        '顧客の情報アクセス度は？',
      ],
    },
    {
      name: 'SupplierPower',
      description: '売り手の交渉力',
      keywords: ['サプライヤー', '供給', '調達', 'ベンダー', 'supplier power', 'vendor'],
      questions: [
        'サプライヤーの集中度は？',
        '代替サプライヤーの存在は？',
        'サプライヤー切り替えコストは？',
        '原材料の希少性は？',
      ],
    },
    {
      name: 'Rivalry',
      description: '業界内競争',
      keywords: ['競争', '競合', '業界', '市場', 'rivalry', 'competition', 'industry'],
      questions: [
        '競合企業の数と規模は？',
        '業界の成長率は？',
        '差別化の程度は？',
        '撤退障壁の高さは？',
      ],
    },
  ],
  valuechain: [
    {
      name: 'InboundLogistics',
      description: '購買物流',
      keywords: ['購買', '調達', 'サプライチェーン', '在庫', 'inbound', 'procurement', 'inventory'],
      questions: [
        '原材料の調達方法は？',
        '在庫管理の効率性は？',
        'サプライヤーとの関係は？',
      ],
    },
    {
      name: 'Operations',
      description: '製造・オペレーション',
      keywords: ['製造', '生産', 'オペレーション', '品質管理', 'operations', 'manufacturing', 'production'],
      questions: [
        '生産プロセスの効率性は？',
        '品質管理体制は？',
        '自動化の程度は？',
      ],
    },
    {
      name: 'OutboundLogistics',
      description: '出荷物流',
      keywords: ['出荷', '配送', '物流', 'デリバリー', 'outbound', 'delivery', 'logistics'],
      questions: [
        '配送ネットワークは？',
        '物流コストの構造は？',
        'リードタイムは？',
      ],
    },
    {
      name: 'MarketingSales',
      description: 'マーケティング・販売',
      keywords: ['マーケティング', '販売', '営業', 'セールス', 'marketing', 'sales'],
      questions: [
        '販売チャネルは？',
        '営業活動の効率性は？',
        'ブランド構築への投資は？',
      ],
    },
    {
      name: 'Service',
      description: 'サービス',
      keywords: ['サービス', 'サポート', 'アフターサービス', 'カスタマー', 'service', 'support', 'after-sales'],
      questions: [
        'カスタマーサポート体制は？',
        'サービス品質は？',
        '顧客満足度は？',
      ],
    },
  ],
  pestel: [
    {
      name: 'Political',
      description: '政治的要因',
      keywords: ['政治', '政策', '規制', '政府', 'political', 'policy', 'regulation', 'government'],
      questions: ['政治的な影響要因は何か？', '政策変更のリスクは？'],
    },
    {
      name: 'Economic',
      description: '経済的要因',
      keywords: ['経済', '景気', 'GDP', 'インフレ', '為替', 'economic', 'economy', 'inflation'],
      questions: ['経済環境の影響は？', '景気動向の影響は？'],
    },
    {
      name: 'Social',
      description: '社会的要因',
      keywords: ['社会', '人口', 'ライフスタイル', '価値観', 'social', 'demographic', 'lifestyle'],
      questions: ['社会的なトレンドは？', '人口動態の影響は？'],
    },
    {
      name: 'Technological',
      description: '技術的要因',
      keywords: ['技術', 'テクノロジー', 'イノベーション', 'デジタル', 'technology', 'innovation', 'digital'],
      questions: ['技術革新の影響は？', 'DXの進展度合いは？'],
    },
    {
      name: 'Environmental',
      description: '環境的要因',
      keywords: ['環境', 'サステナビリティ', 'ESG', 'カーボン', 'environmental', 'sustainability', 'green'],
      questions: ['環境規制の影響は？', 'サステナビリティへの取り組みは？'],
    },
    {
      name: 'Legal',
      description: '法的要因',
      keywords: ['法律', '法規制', 'コンプライアンス', '訴訟', 'legal', 'compliance', 'law'],
      questions: ['法規制の影響は？', 'コンプライアンスリスクは？'],
    },
  ],
  mece: [
    {
      name: 'Category1',
      description: 'カテゴリ1',
      keywords: [],
      questions: ['どのようなカテゴリに分類できるか？'],
    },
  ],
  hypothesis: [
    {
      name: 'Hypothesis',
      description: '仮説',
      keywords: ['仮説', '検証', '確認', 'hypothesis', 'verify'],
      questions: ['主要な仮説は何か？', 'どのように検証するか？'],
    },
  ],
  general: [],
};

// ========== クエリタイプ判定のキーワード ==========

const QUERY_TYPE_KEYWORDS: Record<QueryType, string[]> = {
  strategy: ['戦略', '成長', '方向性', '中期計画', 'ビジョン', 'strategy', 'growth', 'vision'],
  market: ['市場', 'マーケット', '市場規模', '市場動向', '業界', 'market', 'industry', 'sector'],
  competitor: ['競合', 'ライバル', '他社', '競争', 'シェア', 'competitor', 'rival', 'competition'],
  product: ['製品', 'サービス', '商品', 'プロダクト', '開発', 'product', 'service', 'development'],
  internal: ['内部', '組織', '人材', '能力', 'リソース', 'internal', 'organization', 'capability'],
  external: ['外部', '環境', 'マクロ', 'トレンド', '社会', 'external', 'environment', 'macro'],
  marketing: ['マーケティング', '販促', '広告', 'ブランド', 'PR', 'marketing', 'branding', 'advertising'],
  investment: ['投資', '買収', 'M&A', '出資', 'ROI', 'investment', 'acquisition', 'roi'],
  general: [],
};

// ========== クエリタイプからフレームワークへのマッピング ==========

const QUERY_FRAMEWORK_MAP: Record<QueryType, { primary: FrameworkType; secondary: FrameworkType[] }> = {
  strategy: { primary: 'swot', secondary: ['3c', '5forces'] },
  market: { primary: '5forces', secondary: ['pestel', '3c'] },
  competitor: { primary: '3c', secondary: ['5forces', 'swot'] },
  product: { primary: '4p', secondary: ['valuechain', 'swot'] },
  internal: { primary: 'valuechain', secondary: ['swot'] },
  external: { primary: 'pestel', secondary: ['5forces'] },
  marketing: { primary: '4p', secondary: ['3c', 'swot'] },
  investment: { primary: '5forces', secondary: ['swot', 'valuechain'] },
  general: { primary: 'general', secondary: [] },
};

// ========== FrameworkReasoningクラス ==========

/**
 * Framework Reasoning Configuration
 */
export interface FrameworkReasoningConfig {
  /** LLM Provider for enhanced classification */
  lmProvider?: LMProvider;
  /** Enable debug logging */
  debug?: boolean;
  /** Language */
  language?: 'ja' | 'en';
}

/**
 * FrameworkReasoning - フレームワーク統合推論モジュール
 */
export class FrameworkReasoning {
  private readonly debug: boolean;
  private readonly _language: 'ja' | 'en';
  private readonly _lmProvider?: LMProvider;

  constructor(config: FrameworkReasoningConfig = {}) {
    this.debug = config.debug ?? false;
    this._language = config.language ?? 'ja';
    this._lmProvider = config.lmProvider;
  }

  /** Get language setting */
  get language(): 'ja' | 'en' {
    return this._language;
  }

  /** Get LM provider (if configured) */
  get lmProvider(): LMProvider | undefined {
    return this._lmProvider;
  }

  /**
   * クエリを分類し、適切なフレームワークを選択
   */
  classifyQuery(query: string): FrameworkSelection {
    const lowerQuery = query.toLowerCase();

    // キーワードベースでクエリタイプを判定
    let bestMatch: QueryType = 'general';
    let maxScore = 0;

    for (const [type, keywords] of Object.entries(QUERY_TYPE_KEYWORDS)) {
      const score = keywords.filter((kw) => lowerQuery.includes(kw.toLowerCase())).length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = type as QueryType;
      }
    }

    // フレームワークを選択
    const mapping = QUERY_FRAMEWORK_MAP[bestMatch];
    const primaryFramework = mapping.primary;
    const secondaryFrameworks = mapping.secondary;

    // 軸を取得
    const axes = FRAMEWORK_DEFINITIONS[primaryFramework] || [];

    const reasoning = this.generateSelectionReasoning(query, bestMatch, primaryFramework);

    if (this.debug) {
      console.log(`[FrameworkReasoning] Query type: ${bestMatch}, Framework: ${primaryFramework}`);
    }

    return {
      queryType: bestMatch,
      primaryFramework,
      secondaryFrameworks,
      reasoning,
      axes,
    };
  }

  /**
   * フレームワークの軸に基づいた質問を生成
   */
  generateFrameworkQuestions(
    selection: FrameworkSelection,
    context: ResearchContext,
    currentKnowledge: KnowledgeItem[]
  ): ReflectiveQuestion[] {
    const questions: ReflectiveQuestion[] = [];
    const coveredAxes = this.identifyCoveredAxes(selection.axes, currentKnowledge);

    for (const axis of selection.axes) {
      const coverage = coveredAxes.get(axis.name) ?? 0;

      // カバレッジが低い軸に対して質問を生成
      if (coverage < 0.5) {
        const priority = coverage < 0.2 ? 5 : coverage < 0.4 ? 4 : 3;

        // 軸の質問リストから未回答のものを選択
        for (const q of axis.questions.slice(0, 2)) {
          if (!this.isQuestionCovered(q, currentKnowledge)) {
            questions.push({
              question: `${context.query}について、${q}`,
              reason: `${selection.primaryFramework.toUpperCase()}分析の「${axis.name}」軸を深掘り`,
              priority,
            });
          }
        }
      }
    }

    // 質問が少ない場合はデフォルト質問を追加
    if (questions.length < 2) {
      questions.push({
        question: `${context.query}に関する最新動向は何か？`,
        reason: '基本情報の収集',
        priority: 4,
      });
    }

    return questions.slice(0, 5); // 最大5問
  }

  /**
   * 収集した知識をフレームワークに沿って分類
   */
  classifyKnowledge(
    selection: FrameworkSelection,
    knowledge: KnowledgeItem[]
  ): Map<string, KnowledgeItem[]> {
    const classified = new Map<string, KnowledgeItem[]>();

    // 各軸を初期化
    for (const axis of selection.axes) {
      classified.set(axis.name, []);
    }
    classified.set('Other', []);

    // 知識を分類
    for (const item of knowledge) {
      let assigned = false;
      const content = item.content.toLowerCase();

      for (const axis of selection.axes) {
        const matchScore = axis.keywords.filter((kw) =>
          content.includes(kw.toLowerCase())
        ).length;

        if (matchScore > 0) {
          classified.get(axis.name)?.push(item);
          assigned = true;
          break; // 最初にマッチした軸に分類
        }
      }

      if (!assigned) {
        classified.get('Other')?.push(item);
      }
    }

    return classified;
  }

  /**
   * フレームワーク分析を実行
   */
  analyzeWithFramework(
    selection: FrameworkSelection,
    classifiedKnowledge: Map<string, KnowledgeItem[]>
  ): FrameworkAnalysisResult {
    const axes: AnalyzedAxis[] = [];

    for (const axis of selection.axes) {
      const items = classifiedKnowledge.get(axis.name) ?? [];
      const analyzedItems: AxisItem[] = items.map((item) => ({
        content: item.content,
        importance: item.relevance,
        evidence: [],
        sources: item.sources,
      }));

      const summary = this.generateAxisSummary(axis.name, analyzedItems);
      const confidence = items.length > 0 ? Math.min(items.length / 3, 1) : 0;

      axes.push({
        name: axis.name,
        items: analyzedItems,
        summary,
        confidence,
      });
    }

    // クロス分析（SWOTの場合）
    const crossAnalysis = selection.primaryFramework === 'swot'
      ? this.generateSWOTCrossAnalysis(axes)
      : undefined;

    // インサイト生成
    const insights = this.generateInsights(selection.primaryFramework, axes);

    // 推奨事項生成
    const recommendations = this.generateRecommendations(selection.primaryFramework, axes);

    return {
      framework: selection.primaryFramework,
      axes,
      crossAnalysis,
      insights,
      recommendations,
    };
  }

  /**
   * フレームワーク形式のMarkdownを生成
   */
  formatAsMarkdown(
    query: string,
    analysis: FrameworkAnalysisResult,
    summary: string
  ): string {
    const lines: string[] = [];

    lines.push(`# ${query}`);
    lines.push('');
    lines.push(`> **分析フレームワーク**: ${this.getFrameworkDisplayName(analysis.framework)}`);
    lines.push(`> Generated by KATASHIRO Deep Research v3.1.0`);
    lines.push('');

    // サマリー
    lines.push('## 📋 エグゼクティブサマリー');
    lines.push('');
    lines.push(summary);
    lines.push('');

    // フレームワーク分析
    lines.push(`## 📊 ${this.getFrameworkDisplayName(analysis.framework)}分析`);
    lines.push('');

    for (const axis of analysis.axes) {
      const emoji = this.getAxisEmoji(axis.name);
      lines.push(`### ${emoji} ${axis.name}`);
      lines.push('');

      if (axis.items.length > 0) {
        for (const item of axis.items.slice(0, 5)) {
          const stars = '★'.repeat(Math.round(item.importance * 5)) +
            '☆'.repeat(5 - Math.round(item.importance * 5));
          lines.push(`- ${item.content} [${stars}]`);
        }
      } else {
        lines.push('*情報不足*');
      }
      lines.push('');
      lines.push(`> ${axis.summary}`);
      lines.push('');
    }

    // クロス分析（SWOTの場合）
    if (analysis.crossAnalysis) {
      lines.push('### 🔀 クロスSWOT戦略');
      lines.push('');
      for (const strategy of analysis.crossAnalysis.strategies) {
        lines.push(`#### ${strategy.name}`);
        lines.push(`- **説明**: ${strategy.description}`);
        lines.push(`- **優先度**: ${strategy.priority}/5`);
        lines.push('');
      }
    }

    // インサイト
    if (analysis.insights.length > 0) {
      lines.push('## 💡 主要なインサイト');
      lines.push('');
      for (const insight of analysis.insights) {
        lines.push(`- ${insight}`);
      }
      lines.push('');
    }

    // 推奨事項
    if (analysis.recommendations.length > 0) {
      lines.push('## 🎯 推奨事項');
      lines.push('');
      for (let i = 0; i < analysis.recommendations.length; i++) {
        lines.push(`${i + 1}. ${analysis.recommendations[i]}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 利用可能なフレームワーク一覧を取得
   */
  getAvailableFrameworks(): Array<{ type: FrameworkType; name: string; description: string }> {
    return [
      { type: 'swot', name: 'SWOT分析', description: '強み・弱み・機会・脅威' },
      { type: '3c', name: '3C分析', description: '自社・顧客・競合' },
      { type: '4p', name: '4P分析', description: '製品・価格・流通・販促' },
      { type: '5forces', name: '5Forces分析', description: 'ポーターの競争戦略' },
      { type: 'valuechain', name: 'バリューチェーン', description: '価値連鎖分析' },
      { type: 'pestel', name: 'PESTEL分析', description: '外部環境分析' },
    ];
  }

  // ========== Private Methods ==========

  private generateSelectionReasoning(
    _query: string,
    queryType: QueryType,
    _framework: FrameworkType
  ): string {
    const reasonings: Record<QueryType, string> = {
      strategy: '戦略策定に関するクエリのため、内外環境を包括的に分析するSWOT分析を適用します',
      market: '市場分析に関するクエリのため、業界構造を分析する5Forces分析を適用します',
      competitor: '競合分析に関するクエリのため、3つの視点から分析する3C分析を適用します',
      product: '製品・サービスに関するクエリのため、マーケティングミックスの4P分析を適用します',
      internal: '内部環境分析に関するクエリのため、バリューチェーン分析を適用します',
      external: '外部環境分析に関するクエリのため、PESTEL分析を適用します',
      marketing: 'マーケティングに関するクエリのため、4P分析を適用します',
      investment: '投資判断に関するクエリのため、業界魅力度を分析する5Forces分析を適用します',
      general: '汎用的なクエリのため、標準的な調査アプローチを適用します',
    };
    return reasonings[queryType];
  }

  private identifyCoveredAxes(axes: FrameworkAxis[], knowledge: KnowledgeItem[]): Map<string, number> {
    const coverage = new Map<string, number>();

    for (const axis of axes) {
      let matchCount = 0;
      for (const item of knowledge) {
        const content = item.content.toLowerCase();
        if (axis.keywords.some((kw) => content.includes(kw.toLowerCase()))) {
          matchCount++;
        }
      }
      coverage.set(axis.name, Math.min(matchCount / 3, 1)); // 3アイテムで100%
    }

    return coverage;
  }

  private isQuestionCovered(question: string, knowledge: KnowledgeItem[]): boolean {
    const questionWords = question.toLowerCase().split(/\s+/);
    for (const item of knowledge) {
      const content = item.content.toLowerCase();
      const matchCount = questionWords.filter((w) => content.includes(w)).length;
      if (matchCount >= 2) return true;
    }
    return false;
  }

  private generateAxisSummary(axisName: string, items: AxisItem[]): string {
    if (items.length === 0) {
      return `${axisName}に関する情報が不足しています。追加調査が必要です。`;
    }

    const topItems = items.slice(0, 3).map((i) => i.content.slice(0, 50)).join('、');
    return `主要な${axisName}として「${topItems}」が挙げられます。`;
  }

  private generateSWOTCrossAnalysis(axes: AnalyzedAxis[]): CrossAnalysisResult {
    const strategies: CrossStrategy[] = [];

    const s = axes.find((a) => a.name === 'Strengths');
    const w = axes.find((a) => a.name === 'Weaknesses');
    const o = axes.find((a) => a.name === 'Opportunities');
    const t = axes.find((a) => a.name === 'Threats');

    if (s && o && s.items.length > 0 && o.items.length > 0) {
      strategies.push({
        name: 'SO戦略（積極攻勢）',
        description: `強み「${s.items[0]?.content.slice(0, 30) ?? ''}」を活かして機会「${o.items[0]?.content.slice(0, 30) ?? ''}」を獲得する`,
        relatedAxes: ['Strengths', 'Opportunities'],
        priority: 5,
      });
    }

    if (w && o && w.items.length > 0 && o.items.length > 0) {
      strategies.push({
        name: 'WO戦略（弱点強化）',
        description: `弱み「${w.items[0]?.content.slice(0, 30) ?? ''}」を克服して機会を活かす`,
        relatedAxes: ['Weaknesses', 'Opportunities'],
        priority: 4,
      });
    }

    if (s && t && s.items.length > 0 && t.items.length > 0) {
      strategies.push({
        name: 'ST戦略（差別化）',
        description: `強み「${s.items[0]?.content.slice(0, 30) ?? ''}」で脅威「${t.items[0]?.content.slice(0, 30) ?? ''}」に対抗する`,
        relatedAxes: ['Strengths', 'Threats'],
        priority: 4,
      });
    }

    if (w && t && w.items.length > 0 && t.items.length > 0) {
      strategies.push({
        name: 'WT戦略（防衛撤退）',
        description: `弱み「${w.items[0]?.content.slice(0, 30) ?? ''}」と脅威「${t.items[0]?.content.slice(0, 30) ?? ''}」のリスクを最小化する`,
        relatedAxes: ['Weaknesses', 'Threats'],
        priority: 3,
      });
    }

    return { type: 'CrossSWOT', strategies };
  }

  private generateInsights(_framework: FrameworkType, axes: AnalyzedAxis[]): string[] {
    const insights: string[] = [];

    // 高信頼度の軸からインサイトを抽出
    for (const axis of axes.filter((a) => a.confidence > 0.5)) {
      if (axis.items.length >= 2) {
        insights.push(`${axis.name}において複数の重要な要素が確認されました`);
      }
    }

    // 低信頼度の軸についてギャップを指摘
    for (const axis of axes.filter((a) => a.confidence < 0.3)) {
      insights.push(`${axis.name}に関する情報が不足しており、追加調査が推奨されます`);
    }

    return insights.slice(0, 5);
  }

  private generateRecommendations(framework: FrameworkType, _axes: AnalyzedAxis[]): string[] {
    // フレームワーク別の推奨事項テンプレート
    const templates: Record<FrameworkType, string[]> = {
      swot: [
        '強みを活かした成長戦略の策定',
        '弱みを補完するための施策検討',
        '市場機会への迅速な対応',
      ],
      '3c': [
        '顧客ニーズの深掘り調査',
        '競合ベンチマーキングの実施',
        '自社の差別化ポイントの明確化',
      ],
      '4p': [
        'マーケティングミックスの整合性確保',
        '価格戦略の見直し',
        'チャネル戦略の最適化',
      ],
      '5forces': [
        '参入障壁の強化',
        '顧客ロイヤルティ向上施策',
        '差別化戦略の推進',
      ],
      valuechain: [
        'バリューチェーン全体の効率化',
        '価値創造ポイントへの投資強化',
        'コスト構造の最適化',
      ],
      pestel: [
        'マクロ環境変化への対応計画策定',
        'リスク管理体制の強化',
        '規制動向のモニタリング',
      ],
      mece: ['分類の網羅性確認'],
      hypothesis: ['仮説検証の実施'],
      general: ['追加情報の収集'],
    };

    return templates[framework] || [];
  }

  private getFrameworkDisplayName(framework: FrameworkType): string {
    const names: Record<FrameworkType, string> = {
      swot: 'SWOT',
      '3c': '3C',
      '4p': '4P',
      '5forces': '5Forces',
      valuechain: 'バリューチェーン',
      pestel: 'PESTEL',
      mece: 'MECE',
      hypothesis: '仮説検証',
      general: '一般調査',
    };
    return names[framework];
  }

  private getAxisEmoji(axisName: string): string {
    const emojis: Record<string, string> = {
      Strengths: '💪',
      Weaknesses: '⚠️',
      Opportunities: '🌟',
      Threats: '⚡',
      Company: '🏢',
      Customer: '👥',
      Competitor: '🥊',
      Product: '📦',
      Price: '💰',
      Place: '🏪',
      Promotion: '📣',
      NewEntrants: '🚀',
      Substitutes: '🔄',
      BuyerPower: '🛒',
      SupplierPower: '🏭',
      Rivalry: '⚔️',
      Political: '🏛️',
      Economic: '📈',
      Social: '👨‍👩‍👧‍👦',
      Technological: '🔬',
      Environmental: '🌿',
      Legal: '⚖️',
    };
    return emojis[axisName] || '📌';
  }
}

/**
 * Factory function
 */
export function createFrameworkReasoning(
  config?: FrameworkReasoningConfig
): FrameworkReasoning {
  return new FrameworkReasoning(config);
}
