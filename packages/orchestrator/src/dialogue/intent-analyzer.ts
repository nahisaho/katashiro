/**
 * Intent Analyzer
 *
 * @fileoverview ユーザーの回答から真の意図を分析
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.1
 */

import type {
  DialogueExchange,
  ExtractedContext,
  InferredIntent,
  AlternativeInterpretation,
  BackgroundInfo,
  Constraint,
  Stakeholder,
  SuccessCriterion,
  Priority,
  Risk,
} from './types';

/**
 * 意図分析器
 */
export class IntentAnalyzer {
  private readonly language: 'ja' | 'en';

  constructor(language: 'ja' | 'en' = 'ja') {
    this.language = language;
  }

  /**
   * 対話から意図を分析
   */
  analyzeIntent(
    initialInput: string,
    exchanges: DialogueExchange[]
  ): InferredIntent {
    // コンテキストを抽出
    const context = this.extractContext(initialInput, exchanges);

    // 表層的な意図を抽出
    const surfaceIntent = this.extractSurfaceIntent(initialInput, context);

    // 真の意図を推測
    const trueIntent = this.inferTrueIntent(surfaceIntent, context, exchanges);

    // 代替解釈を生成
    const alternatives = this.generateAlternatives(surfaceIntent, context);

    // 推定根拠を生成
    const reasoning = this.generateReasoning(context, exchanges);

    // 追加確認事項を特定
    const needsClarification = this.identifyUnclearPoints(context);

    // 信頼度を計算
    const confidence = this.calculateConfidence(context, exchanges);

    // 推奨アプローチを決定
    const recommendedApproach = this.determineApproach(trueIntent, context);

    return {
      surfaceIntent,
      trueIntent,
      confidence,
      reasoning,
      alternativeInterpretations: alternatives,
      recommendedApproach,
      needsClarification,
    };
  }

  /**
   * コンテキストを抽出
   */
  extractContext(
    initialInput: string,
    exchanges: DialogueExchange[]
  ): ExtractedContext {
    // 全回答テキストを結合
    const allAnswers = exchanges
      .filter((e) => e.answer !== null)
      .map((e) => e.answer!.text)
      .join(' ');

    const combinedText = `${initialInput} ${allAnswers}`;

    return {
      explicitPurpose: this.extractPurpose(exchanges),
      implicitPurpose: this.inferImplicitPurpose(combinedText, exchanges),
      background: this.extractBackground(exchanges),
      constraints: this.extractConstraints(exchanges),
      stakeholders: this.extractStakeholders(exchanges),
      successCriteria: this.extractSuccessCriteria(exchanges),
      priorities: this.extractPriorities(exchanges),
      risks: this.extractRisks(exchanges),
      keywords: this.extractKeywords(combinedText),
      domain: this.detectDomain(combinedText),
      urgency: this.assessUrgency(exchanges),
      complexity: this.assessComplexity(combinedText),
    };
  }

  /**
   * 明示的な目的を抽出
   */
  private extractPurpose(exchanges: DialogueExchange[]): string | null {
    const purposeExchange = exchanges.find(
      (e) => e.question.category === 'purpose' && e.answer !== null
    );
    return purposeExchange?.answer?.text ?? null;
  }

  /**
   * 暗黙的な目的を推測
   */
  private inferImplicitPurpose(
    text: string,
    _exchanges: DialogueExchange[]
  ): string | null {
    // パターンマッチングで暗黙的な目的を推測
    const patterns = this.language === 'ja'
      ? [
          { pattern: /売上|収益|利益/, intent: '収益向上' },
          { pattern: /コスト|費用|削減/, intent: 'コスト削減' },
          { pattern: /効率|生産性|時間/, intent: '業務効率化' },
          { pattern: /品質|改善|向上/, intent: '品質向上' },
          { pattern: /顧客|満足|体験/, intent: '顧客体験向上' },
          { pattern: /リスク|安全|セキュリティ/, intent: 'リスク低減' },
          { pattern: /成長|拡大|スケール/, intent: '事業成長' },
          { pattern: /差別化|競争|優位/, intent: '競争優位の構築' },
          { pattern: /自動化|省力化/, intent: '業務自動化' },
          { pattern: /情報|データ|分析/, intent: 'データ活用・分析' },
        ]
      : [
          { pattern: /revenue|sales|profit/, intent: 'Revenue growth' },
          { pattern: /cost|expense|reduction/, intent: 'Cost reduction' },
          { pattern: /efficiency|productivity|time/, intent: 'Operational efficiency' },
          { pattern: /quality|improvement/, intent: 'Quality improvement' },
          { pattern: /customer|satisfaction|experience/, intent: 'Customer experience' },
          { pattern: /risk|safety|security/, intent: 'Risk reduction' },
          { pattern: /growth|expansion|scale/, intent: 'Business growth' },
          { pattern: /differentiation|competitive/, intent: 'Competitive advantage' },
          { pattern: /automation/, intent: 'Process automation' },
          { pattern: /data|analytics|insights/, intent: 'Data utilization' },
        ];

    const matchedPatterns = patterns.filter((p) => p.pattern.test(text));
    if (matchedPatterns.length > 0) {
      return matchedPatterns[0]!.intent;
    }

    return null;
  }

  /**
   * 背景情報を抽出
   */
  private extractBackground(exchanges: DialogueExchange[]): BackgroundInfo {
    const backgroundExchange = exchanges.find(
      (e) => e.question.category === 'background' && e.answer !== null
    );

    return {
      reason: backgroundExchange?.answer?.text ?? null,
      currentState: null,
      desiredState: null,
      attemptedSolutions: [],
    };
  }

  /**
   * 制約条件を抽出
   */
  private extractConstraints(exchanges: DialogueExchange[]): Constraint[] {
    const constraintExchange = exchanges.find(
      (e) => e.question.category === 'constraints' && e.answer !== null
    );

    if (!constraintExchange?.answer) {
      return [];
    }

    const text = constraintExchange.answer.text;
    const constraints: Constraint[] = [];

    // 時間制約を検出
    if (/期限|締め切り|deadline|until|by/i.test(text)) {
      constraints.push({
        type: 'time',
        description: text,
        strictness: 4,
      });
    }

    // 予算制約を検出
    if (/予算|費用|コスト|budget|cost/i.test(text)) {
      constraints.push({
        type: 'budget',
        description: text,
        strictness: 4,
      });
    }

    // 技術制約を検出
    if (/技術|システム|ツール|technical|system/i.test(text)) {
      constraints.push({
        type: 'technical',
        description: text,
        strictness: 3,
      });
    }

    return constraints;
  }

  /**
   * 関係者を抽出
   */
  private extractStakeholders(exchanges: DialogueExchange[]): Stakeholder[] {
    const stakeholderExchange = exchanges.find(
      (e) => e.question.category === 'stakeholders' && e.answer !== null
    );

    if (!stakeholderExchange?.answer) {
      return [];
    }

    // 簡易実装：回答をそのまま関係者として追加
    return [
      {
        role: stakeholderExchange.answer.text,
        concerns: [],
        influence: 3,
      },
    ];
  }

  /**
   * 成功基準を抽出
   */
  private extractSuccessCriteria(exchanges: DialogueExchange[]): SuccessCriterion[] {
    const successExchange = exchanges.find(
      (e) => e.question.category === 'success' && e.answer !== null
    );

    if (!successExchange?.answer) {
      return [];
    }

    return [
      {
        criterion: successExchange.answer.text,
        measurable: /\d+|%|倍|半/.test(successExchange.answer.text),
        importance: 5,
      },
    ];
  }

  /**
   * 優先事項を抽出
   */
  private extractPriorities(exchanges: DialogueExchange[]): Priority[] {
    const priorityExchange = exchanges.find(
      (e) => e.question.category === 'priority' && e.answer !== null
    );

    if (!priorityExchange?.answer) {
      return [];
    }

    return [
      {
        item: priorityExchange.answer.text,
        rank: 1,
      },
    ];
  }

  /**
   * リスクを抽出
   */
  private extractRisks(exchanges: DialogueExchange[]): Risk[] {
    const riskExchange = exchanges.find(
      (e) => e.question.category === 'risks' && e.answer !== null
    );

    if (!riskExchange?.answer) {
      return [];
    }

    return [
      {
        description: riskExchange.answer.text,
        probability: 3,
        impact: 3,
      },
    ];
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): string[] {
    // 簡易実装：形態素解析なしでキーワード抽出
    // 日本語の場合は名詞っぽい文字列を抽出
    const keywords: string[] = [];

    // 英単語を抽出
    const englishWords = text.match(/[A-Za-z]{3,}/g) ?? [];
    keywords.push(...englishWords.map((w) => w.toLowerCase()));

    // カタカナ語を抽出
    const katakana = text.match(/[ァ-ヶー]{3,}/g) ?? [];
    keywords.push(...katakana);

    // 重複を除去
    return [...new Set(keywords)].slice(0, 20);
  }

  /**
   * ドメインを検出
   */
  private detectDomain(text: string): string | null {
    const domainPatterns = this.language === 'ja'
      ? [
          { pattern: /マーケティング|広告|プロモーション/, domain: 'marketing' },
          { pattern: /営業|セールス|商談/, domain: 'sales' },
          { pattern: /人事|採用|組織/, domain: 'hr' },
          { pattern: /財務|会計|経理/, domain: 'finance' },
          { pattern: /IT|システム|開発|プログラム/, domain: 'technology' },
          { pattern: /製造|生産|工場/, domain: 'manufacturing' },
          { pattern: /物流|配送|サプライチェーン/, domain: 'logistics' },
          { pattern: /経営|戦略|事業/, domain: 'strategy' },
          { pattern: /研究|開発|R&D/, domain: 'r&d' },
          { pattern: /カスタマー|顧客|サポート/, domain: 'customer_service' },
        ]
      : [
          { pattern: /marketing|advertising|promotion/, domain: 'marketing' },
          { pattern: /sales|selling/, domain: 'sales' },
          { pattern: /hr|hiring|organization/, domain: 'hr' },
          { pattern: /finance|accounting/, domain: 'finance' },
          { pattern: /it|system|development|software/, domain: 'technology' },
          { pattern: /manufacturing|production/, domain: 'manufacturing' },
          { pattern: /logistics|shipping|supply chain/, domain: 'logistics' },
          { pattern: /strategy|business/, domain: 'strategy' },
          { pattern: /research|development|r&d/, domain: 'r&d' },
          { pattern: /customer|support|service/, domain: 'customer_service' },
        ];

    const match = domainPatterns.find((p) => p.pattern.test(text));
    return match?.domain ?? null;
  }

  /**
   * 緊急度を評価
   */
  private assessUrgency(
    exchanges: DialogueExchange[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const timelineExchange = exchanges.find(
      (e) => e.question.category === 'timeline' && e.answer !== null
    );

    if (!timelineExchange?.answer) {
      return 'medium';
    }

    const text = timelineExchange.answer.text.toLowerCase();

    if (/今すぐ|緊急|急|asap|urgent|immediately/i.test(text)) {
      return 'critical';
    }
    if (/今週|1週間|week|soon/i.test(text)) {
      return 'high';
    }
    if (/今月|1ヶ月|month/i.test(text)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * 複雑度を評価
   */
  private assessComplexity(
    text: string
  ): 'simple' | 'moderate' | 'complex' | 'highly_complex' {
    let score = 0;

    // テキストの長さ
    score += Math.floor(text.length / 500);

    // キーワードの多様性
    const keywords = this.extractKeywords(text);
    score += Math.floor(keywords.length / 5);

    if (score <= 3) return 'simple';
    if (score <= 7) return 'moderate';
    if (score <= 12) return 'complex';
    return 'highly_complex';
  }

  /**
   * 表層的な意図を抽出
   */
  private extractSurfaceIntent(
    initialInput: string,
    context: ExtractedContext
  ): string {
    // 明示的な目的があればそれを使用
    if (context.explicitPurpose) {
      return context.explicitPurpose;
    }
    // なければ初期入力を使用
    return initialInput;
  }

  /**
   * 真の意図を推測
   */
  private inferTrueIntent(
    surfaceIntent: string,
    context: ExtractedContext,
    _exchanges: DialogueExchange[]
  ): string {
    // 暗黙的な目的があればそれを組み合わせる
    if (context.implicitPurpose) {
      const templates = this.language === 'ja'
        ? `${context.implicitPurpose}を実現するために、${surfaceIntent}`
        : `${surfaceIntent} to achieve ${context.implicitPurpose}`;
      return templates;
    }

    // 背景情報があれば文脈を追加
    if (context.background.reason) {
      const templates = this.language === 'ja'
        ? `${context.background.reason}という背景から、${surfaceIntent}`
        : `${surfaceIntent}, given the context of ${context.background.reason}`;
      return templates;
    }

    return surfaceIntent;
  }

  /**
   * 代替解釈を生成
   */
  private generateAlternatives(
    surfaceIntent: string,
    context: ExtractedContext
  ): AlternativeInterpretation[] {
    const alternatives: AlternativeInterpretation[] = [];

    // ドメインに基づく代替解釈
    if (context.domain) {
      const domainInterpretation = this.language === 'ja'
        ? `${context.domain}領域における${surfaceIntent}`
        : `${surfaceIntent} in the ${context.domain} domain`;

      alternatives.push({
        interpretation: domainInterpretation,
        probability: 0.3,
        reasoning: this.language === 'ja'
          ? `ドメインキーワードから${context.domain}領域と推測`
          : `Inferred ${context.domain} domain from keywords`,
      });
    }

    // 暗黙的な目的に基づく代替解釈
    if (context.implicitPurpose && context.implicitPurpose !== surfaceIntent) {
      alternatives.push({
        interpretation: context.implicitPurpose,
        probability: 0.25,
        reasoning: this.language === 'ja'
          ? '文脈から推測される根本的な目的'
          : 'Underlying purpose inferred from context',
      });
    }

    return alternatives;
  }

  /**
   * 推定根拠を生成
   */
  private generateReasoning(
    context: ExtractedContext,
    _exchanges: DialogueExchange[]
  ): string[] {
    const reasoning: string[] = [];

    if (context.explicitPurpose) {
      reasoning.push(
        this.language === 'ja'
          ? `目的として「${context.explicitPurpose}」が明示されています`
          : `"${context.explicitPurpose}" was explicitly stated as the purpose`
      );
    }

    if (context.background.reason) {
      reasoning.push(
        this.language === 'ja'
          ? `背景として「${context.background.reason}」が説明されました`
          : `"${context.background.reason}" was provided as background`
      );
    }

    if (context.constraints.length > 0) {
      reasoning.push(
        this.language === 'ja'
          ? `${context.constraints.length}件の制約条件が特定されました`
          : `${context.constraints.length} constraint(s) were identified`
      );
    }

    if (context.successCriteria.length > 0) {
      reasoning.push(
        this.language === 'ja'
          ? `成功基準として「${context.successCriteria[0]?.criterion}」が設定されています`
          : `"${context.successCriteria[0]?.criterion}" was set as success criterion`
      );
    }

    return reasoning;
  }

  /**
   * 不明確な点を特定
   */
  private identifyUnclearPoints(context: ExtractedContext): string[] {
    const unclear: string[] = [];

    if (!context.explicitPurpose && !context.implicitPurpose) {
      unclear.push(
        this.language === 'ja' ? '具体的な目的' : 'Specific purpose'
      );
    }

    if (context.successCriteria.length === 0) {
      unclear.push(
        this.language === 'ja' ? '成功基準' : 'Success criteria'
      );
    }

    if (context.constraints.length === 0) {
      unclear.push(
        this.language === 'ja' ? '制約条件' : 'Constraints'
      );
    }

    if (context.urgency === 'medium') {
      unclear.push(
        this.language === 'ja' ? 'スケジュール・期限' : 'Timeline/deadline'
      );
    }

    return unclear;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    context: ExtractedContext,
    exchanges: DialogueExchange[]
  ): number {
    let confidence = 0.5; // ベース値

    // 回答数による加点
    const answeredCount = exchanges.filter((e) => e.answer !== null).length;
    confidence += Math.min(answeredCount * 0.05, 0.25);

    // 明示的な目的がある場合
    if (context.explicitPurpose) {
      confidence += 0.1;
    }

    // 成功基準がある場合
    if (context.successCriteria.length > 0) {
      confidence += 0.05;
    }

    // 制約がある場合
    if (context.constraints.length > 0) {
      confidence += 0.05;
    }

    // キーワードが多い場合
    if (context.keywords.length >= 5) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 推奨アプローチを決定
   */
  private determineApproach(
    _trueIntent: string,
    context: ExtractedContext
  ): string {
    // 緊急度と複雑度に基づいてアプローチを決定
    if (context.urgency === 'critical') {
      return this.language === 'ja'
        ? '緊急対応：最小限の調査で即座に対応策を提示'
        : 'Urgent: Provide immediate solutions with minimal research';
    }

    if (context.complexity === 'highly_complex') {
      return this.language === 'ja'
        ? '段階的アプローチ：フェーズ分けして順次対応'
        : 'Phased approach: Address in stages';
    }

    if (context.complexity === 'simple') {
      return this.language === 'ja'
        ? '直接対応：シンプルな解決策を提示'
        : 'Direct approach: Provide simple solution';
    }

    return this.language === 'ja'
      ? '標準アプローチ：調査・分析後に提案を作成'
      : 'Standard approach: Research, analyze, then propose';
  }
}
