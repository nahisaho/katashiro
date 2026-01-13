/**
 * Question Generator
 *
 * @fileoverview コンテキストに応じた質問を生成
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.1
 */

import type {
  DialogueQuestion,
  QuestionCategory,
  QuestionType,
  ExtractedContext,
  DialogueExchange,
  QuestionStrategy,
  InferredIntent,
} from './types';

/**
 * 質問テンプレート
 */
interface QuestionTemplate {
  readonly category: QuestionCategory;
  readonly type: QuestionType;
  readonly templates: readonly QuestionTemplateItem[];
  readonly priority: number;
  readonly requiredWhen?: (context: ExtractedContext) => boolean;
}

interface QuestionTemplateItem {
  readonly text: string;
  readonly hint?: string;
  readonly examples?: readonly string[];
  readonly options?: readonly string[];
}

/**
 * 質問生成器
 */
export class QuestionGenerator {
  private readonly language: 'ja' | 'en';
  private readonly templates: Map<QuestionCategory, QuestionTemplate>;

  constructor(language: 'ja' | 'en' = 'ja') {
    this.language = language;
    this.templates = this.initializeTemplates();
  }

  /**
   * 次の質問を生成
   */
  generateNextQuestion(
    _context: ExtractedContext,
    exchanges: DialogueExchange[],
    strategy: QuestionStrategy
  ): DialogueQuestion | null {
    // 回答済みカテゴリを取得
    const answeredCategories = new Set(
      exchanges
        .filter((e) => e.answer !== null)
        .map((e) => e.question.category)
    );

    // 戦略に応じて次の質問カテゴリを決定
    const nextCategory = this.selectNextCategory(
      answeredCategories,
      strategy
    );

    if (!nextCategory) {
      return null;
    }

    return this.generateQuestionForCategory(nextCategory);
  }

  /**
   * 確認質問を生成
   */
  generateConfirmationQuestion(
    _context: ExtractedContext,
    inferredIntent: InferredIntent
  ): DialogueQuestion {
    const templates = this.language === 'ja'
      ? {
          text: `ご要望を以下のように理解しました。\n\n「${inferredIntent.trueIntent}」\n\nこの理解で正しいでしょうか？`,
          hint: '修正があればお知らせください',
        }
      : {
          text: `I understand your request as follows:\n\n"${inferredIntent.trueIntent}"\n\nIs this understanding correct?`,
          hint: 'Please let me know if any corrections are needed',
        };

    return {
      text: templates.text,
      type: 'confirmation',
      category: 'confirmation',
      hint: templates.hint,
    };
  }

  /**
   * 明確化質問を生成
   */
  generateClarificationQuestion(
    ambiguousPoint: string,
    _context: ExtractedContext
  ): DialogueQuestion {
    const templates = this.language === 'ja'
      ? {
          text: `「${ambiguousPoint}」について、もう少し詳しく教えていただけますか？`,
          hint: '具体的な例や状況を教えていただけると助かります',
        }
      : {
          text: `Could you tell me more about "${ambiguousPoint}"?`,
          hint: 'Specific examples or situations would be helpful',
        };

    return {
      text: templates.text,
      type: 'open',
      category: 'clarification',
      hint: templates.hint,
    };
  }

  /**
   * 優先度質問を生成
   */
  generatePriorityQuestion(items: string[]): DialogueQuestion {
    const templates = this.language === 'ja'
      ? {
          text: '以下の項目を優先度の高い順に並べてください：',
          hint: '番号で回答してください（例: 2, 1, 3）',
        }
      : {
          text: 'Please rank the following items by priority:',
          hint: 'Answer with numbers (e.g., 2, 1, 3)',
        };

    return {
      text: `${templates.text}\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`,
      type: 'open',
      category: 'priority',
      hint: templates.hint,
    };
  }

  /**
   * カテゴリに対する質問を生成
   */
  private generateQuestionForCategory(
    category: QuestionCategory
  ): DialogueQuestion {
    const template = this.templates.get(category);
    if (!template) {
      // フォールバック質問
      return this.generateFallbackQuestion(category);
    }

    // テンプレートからランダムに選択
    const selectedTemplate = template.templates[Math.floor(Math.random() * template.templates.length)] ?? template.templates[0];

    return {
      text: selectedTemplate?.text ?? '',
      type: template.type,
      category: template.category,
      options: selectedTemplate?.options ? [...selectedTemplate.options] : undefined,
      hint: selectedTemplate?.hint,
      examples: selectedTemplate?.examples ? [...selectedTemplate.examples] : undefined,
    };
  }

  /**
   * 次の質問カテゴリを選択
   */
  private selectNextCategory(
    answeredCategories: Set<QuestionCategory>,
    strategy: QuestionStrategy
  ): QuestionCategory | null {
    // 優先度順のカテゴリリスト
    const priorityOrder: QuestionCategory[] = [
      'purpose',
      'background',
      'scope',
      'constraints',
      'success',
      'stakeholders',
      'timeline',
      'priority',
      'risks',
      'resources',
    ];

    switch (strategy) {
      case 'breadth_first':
        // 未回答のカテゴリを優先度順に
        return priorityOrder.find((c) => !answeredCategories.has(c)) ?? null;

      case 'depth_first':
        // 現在のカテゴリを深掘り（同じカテゴリで追加質問）
        // 簡易実装：未回答を順に
        return priorityOrder.find((c) => !answeredCategories.has(c)) ?? null;

      case 'adaptive':
        return this.selectAdaptiveCategory(answeredCategories, priorityOrder);

      case 'minimal':
        // 必須カテゴリのみ
        const essentialCategories: QuestionCategory[] = ['purpose', 'scope', 'success'];
        return essentialCategories.find((c) => !answeredCategories.has(c)) ?? null;

      default:
        return priorityOrder.find((c) => !answeredCategories.has(c)) ?? null;
    }
  }

  /**
   * 適応的にカテゴリを選択
   */
  private selectAdaptiveCategory(
    answeredCategories: Set<QuestionCategory>,
    priorityOrder: QuestionCategory[]
  ): QuestionCategory | null {
    // 目的が不明確なら目的を聞く
    if (!answeredCategories.has('purpose')) {
      return 'purpose';
    }

    // 背景が不明なら背景を聞く
    if (!answeredCategories.has('background')) {
      return 'background';
    }

    // 制約を確認
    if (!answeredCategories.has('constraints')) {
      return 'constraints';
    }

    // タイムラインを確認
    if (!answeredCategories.has('timeline')) {
      return 'timeline';
    }

    // 成功基準が未設定なら確認
    if (!answeredCategories.has('success')) {
      return 'success';
    }

    // それ以外は優先度順
    return priorityOrder.find((c) => !answeredCategories.has(c)) ?? null;
  }

  /**
   * フォールバック質問を生成
   */
  private generateFallbackQuestion(category: QuestionCategory): DialogueQuestion {
    const categoryLabels = this.language === 'ja'
      ? {
          purpose: '目的',
          background: '背景',
          constraints: '制約条件',
          stakeholders: '関係者',
          timeline: 'スケジュール',
          scope: '範囲',
          priority: '優先度',
          success: '成功基準',
          risks: 'リスク',
          resources: 'リソース',
          clarification: '詳細',
          confirmation: '確認',
        }
      : {
          purpose: 'purpose',
          background: 'background',
          constraints: 'constraints',
          stakeholders: 'stakeholders',
          timeline: 'timeline',
          scope: 'scope',
          priority: 'priority',
          success: 'success criteria',
          risks: 'risks',
          resources: 'resources',
          clarification: 'details',
          confirmation: 'confirmation',
        };

    const label = categoryLabels[category];
    const text = this.language === 'ja'
      ? `${label}について教えてください。`
      : `Please tell me about the ${label}.`;

    return {
      text,
      type: 'open',
      category,
    };
  }

  /**
   * テンプレートを初期化
   */
  private initializeTemplates(): Map<QuestionCategory, QuestionTemplate> {
    const templates = new Map<QuestionCategory, QuestionTemplate>();

    if (this.language === 'ja') {
      this.initializeJapaneseTemplates(templates);
    } else {
      this.initializeEnglishTemplates(templates);
    }

    return templates;
  }

  /**
   * 日本語テンプレートを初期化
   */
  private initializeJapaneseTemplates(
    templates: Map<QuestionCategory, QuestionTemplate>
  ): void {
    templates.set('purpose', {
      category: 'purpose',
      type: 'open',
      priority: 1,
      templates: [
        {
          text: 'この取り組みの最終的なゴールは何ですか？',
          hint: '達成したい状態や成果を具体的に教えてください',
          examples: [
            '売上を20%向上させたい',
            '顧客満足度を改善したい',
            '業務効率を上げたい',
          ],
        },
        {
          text: 'なぜこの課題に取り組もうと思われましたか？',
          hint: 'きっかけや動機を教えてください',
        },
        {
          text: 'この結果を誰が、どのように使いますか？',
          hint: '利用者と利用シーンを教えてください',
        },
      ],
    });

    templates.set('background', {
      category: 'background',
      type: 'open',
      priority: 2,
      templates: [
        {
          text: '現在どのような状況にありますか？',
          hint: '現状の課題や問題点を教えてください',
        },
        {
          text: 'これまでに試したことはありますか？',
          hint: '過去の取り組みとその結果を教えてください',
        },
        {
          text: 'この課題が発生した経緯を教えてください。',
        },
      ],
    });

    templates.set('scope', {
      category: 'scope',
      type: 'open',
      priority: 3,
      templates: [
        {
          text: '対象となる範囲を教えてください。',
          hint: '地域、部門、製品など具体的に',
          examples: ['国内市場のみ', '営業部門', '製品Aに関して'],
        },
        {
          text: '今回のスコープに含めないものはありますか？',
          hint: '除外したい範囲があれば教えてください',
        },
      ],
    });

    templates.set('constraints', {
      category: 'constraints',
      type: 'open',
      priority: 4,
      templates: [
        {
          text: '予算や時間などの制約はありますか？',
          hint: '厳守すべき条件を教えてください',
        },
        {
          text: '技術的な制約や前提条件はありますか？',
        },
        {
          text: '法規制やコンプライアンス上の制約はありますか？',
        },
      ],
    });

    templates.set('timeline', {
      category: 'timeline',
      type: 'open',
      priority: 5,
      templates: [
        {
          text: 'いつまでに完了させたいですか？',
          hint: '期限やマイルストーンを教えてください',
        },
        {
          text: '緊急度はどの程度ですか？',
          options: ['今すぐ必要', '1週間以内', '1ヶ月以内', '急ぎではない'],
        },
      ],
    });

    templates.set('success', {
      category: 'success',
      type: 'open',
      priority: 6,
      templates: [
        {
          text: 'どうなったら「成功」と言えますか？',
          hint: '具体的な成功基準を教えてください',
          examples: [
            'コスト30%削減',
            'NPS 50以上',
            '処理時間半減',
          ],
        },
        {
          text: '成果をどのように測定しますか？',
        },
      ],
    });

    templates.set('stakeholders', {
      category: 'stakeholders',
      type: 'open',
      priority: 7,
      templates: [
        {
          text: 'この取り組みに関係する人は誰ですか？',
          hint: '意思決定者、実行者、影響を受ける人など',
        },
        {
          text: '最終的な意思決定者は誰ですか？',
        },
      ],
    });

    templates.set('priority', {
      category: 'priority',
      type: 'open',
      priority: 8,
      templates: [
        {
          text: '最も重要視していることは何ですか？',
          hint: 'スピード、品質、コストなど優先順位を教えてください',
        },
        {
          text: '譲れない条件は何ですか？',
        },
      ],
    });

    templates.set('risks', {
      category: 'risks',
      type: 'open',
      priority: 9,
      templates: [
        {
          text: '懸念していることや心配なことはありますか？',
        },
        {
          text: 'うまくいかない可能性として考えられることは？',
        },
      ],
    });

    templates.set('resources', {
      category: 'resources',
      type: 'open',
      priority: 10,
      templates: [
        {
          text: '利用可能なリソース（人員、予算、ツールなど）はありますか？',
        },
        {
          text: '参考にできる既存の資料やデータはありますか？',
        },
      ],
    });
  }

  /**
   * 英語テンプレートを初期化
   */
  private initializeEnglishTemplates(
    templates: Map<QuestionCategory, QuestionTemplate>
  ): void {
    templates.set('purpose', {
      category: 'purpose',
      type: 'open',
      priority: 1,
      templates: [
        {
          text: 'What is the ultimate goal of this initiative?',
          hint: 'Please describe the desired state or outcome specifically',
          examples: [
            'Increase sales by 20%',
            'Improve customer satisfaction',
            'Enhance operational efficiency',
          ],
        },
        {
          text: 'Why did you decide to work on this issue?',
          hint: 'Please share the trigger or motivation',
        },
      ],
    });

    templates.set('background', {
      category: 'background',
      type: 'open',
      priority: 2,
      templates: [
        {
          text: 'What is the current situation?',
          hint: 'Please describe current challenges or issues',
        },
        {
          text: 'Have you tried anything before?',
          hint: 'Please share past attempts and their results',
        },
      ],
    });

    templates.set('scope', {
      category: 'scope',
      type: 'open',
      priority: 3,
      templates: [
        {
          text: 'What is the scope of this project?',
          hint: 'Region, department, product, etc.',
        },
      ],
    });

    templates.set('constraints', {
      category: 'constraints',
      type: 'open',
      priority: 4,
      templates: [
        {
          text: 'Are there any constraints (budget, time, etc.)?',
          hint: 'Please share any conditions that must be met',
        },
      ],
    });

    templates.set('timeline', {
      category: 'timeline',
      type: 'open',
      priority: 5,
      templates: [
        {
          text: 'When do you need this completed by?',
          hint: 'Please share deadlines or milestones',
        },
      ],
    });

    templates.set('success', {
      category: 'success',
      type: 'open',
      priority: 6,
      templates: [
        {
          text: 'What would success look like?',
          hint: 'Please describe specific success criteria',
        },
      ],
    });

    templates.set('stakeholders', {
      category: 'stakeholders',
      type: 'open',
      priority: 7,
      templates: [
        {
          text: 'Who are the stakeholders involved?',
          hint: 'Decision makers, executors, affected parties',
        },
      ],
    });

    templates.set('priority', {
      category: 'priority',
      type: 'open',
      priority: 8,
      templates: [
        {
          text: 'What is most important to you?',
          hint: 'Speed, quality, cost - please share your priorities',
        },
      ],
    });

    templates.set('risks', {
      category: 'risks',
      type: 'open',
      priority: 9,
      templates: [
        {
          text: 'Do you have any concerns or worries?',
        },
      ],
    });

    templates.set('resources', {
      category: 'resources',
      type: 'open',
      priority: 10,
      templates: [
        {
          text: 'What resources are available (people, budget, tools)?',
        },
      ],
    });
  }
}
