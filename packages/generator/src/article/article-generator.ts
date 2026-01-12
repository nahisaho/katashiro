/**
 * ArticleGenerator - 記事生成（トーン制御・SEO最適化）
 *
 * @since 0.2.0
 * @requirement REQ-GENERATE-002-ENH-001
 * @design DES-KATASHIRO-002 §4.8 記事生成強化
 */

/**
 * 記事のトーン
 */
export type ArticleTone = 'formal' | 'casual' | 'technical' | 'conversational';

/**
 * 対象読者レベル
 */
export type ArticleAudience = 'beginner' | 'intermediate' | 'expert';

/**
 * 記事の長さ
 */
export type ArticleLength = 'short' | 'medium' | 'long';

/**
 * SEO設定
 */
export interface ArticleSEO {
  /** ターゲットキーワード */
  keywords: string[];
  /** メタディスクリプション */
  metaDescription?: string;
}

/**
 * CTA（Call to Action）設定
 */
export interface ArticleCTA {
  /** CTAタイプ */
  type: 'newsletter' | 'product' | 'link' | 'custom';
  /** CTAテキスト */
  text: string;
  /** リンクURL */
  url?: string;
}

/**
 * 記事生成オプション
 */
export interface ArticleOptions {
  /** タイトル */
  title: string;
  /** トピック/テーマ */
  topic: string;
  /** トーン */
  tone: ArticleTone;
  /** 対象読者 */
  audience: ArticleAudience;
  /** 長さ */
  length: ArticleLength;
  /** SEO設定 */
  seo?: ArticleSEO;
  /** CTA設定 */
  cta?: ArticleCTA;
  /** 参考ソース */
  sources?: Array<{ title: string; url: string }>;
  /** 追加コンテンツ（本文に含める内容） */
  content?: string;
}

/**
 * 生成された記事
 */
export interface GeneratedArticle {
  /** タイトル */
  title: string;
  /** 冒頭の引き込み文 */
  hook: string;
  /** 本文 */
  body: string;
  /** CTA部分 */
  cta?: string;
  /** メタ情報 */
  meta: {
    description: string;
    keywords: string[];
    readingTime: number;
    wordCount: number;
  };
  /** 参考文献リスト */
  citations: string[];
}

/**
 * 長さ設定（目安文字数）
 */
const LENGTH_CONFIG: Record<ArticleLength, { min: number; max: number; sections: number }> = {
  short: { min: 500, max: 800, sections: 2 },
  medium: { min: 1200, max: 2000, sections: 4 },
  long: { min: 2500, max: 4000, sections: 6 },
};

/**
 * 記事生成クラス
 */
export class ArticleGenerator {
  /**
   * 記事を生成
   */
  async generate(options: ArticleOptions): Promise<GeneratedArticle> {
    const lengthConfig = LENGTH_CONFIG[options.length];
    
    // フック生成
    const hook = await this.generateHook(options.topic, options.tone);
    
    // 本文生成
    const body = this.generateBody(options, lengthConfig);
    
    // CTA生成
    const cta = options.cta ? this.generateCTA(options.cta) : undefined;
    
    // メタ情報
    const fullContent = `${hook}\n\n${body}`;
    const wordCount = this.countWords(fullContent);
    const readingTime = this.estimateReadingTime(wordCount);
    
    // SEOメタ
    const keywords = options.seo?.keywords || this.extractKeywords(options.topic);
    const description = options.seo?.metaDescription || 
      this.generateMetaDescription(options.title, options.topic, options.tone);
    
    // 引用
    const citations = options.sources?.map(s => `- [${s.title}](${s.url})`) || [];

    return {
      title: options.title,
      hook,
      body,
      cta,
      meta: {
        description,
        keywords,
        readingTime,
        wordCount,
      },
      citations,
    };
  }

  /**
   * フック（冒頭文）を生成
   */
  async generateHook(topic: string, tone: ArticleTone): Promise<string> {
    const hooks: Record<ArticleTone, (topic: string) => string> = {
      formal: (t) => `${t}について、体系的に解説いたします。本記事では、重要なポイントを整理し、実践的な知見を提供します。`,
      casual: (t) => `${t}って、実は奥が深いんです！今日はその魅力と活用法をわかりやすく紹介しますね。`,
      technical: (t) => `本稿では${t}の技術的側面を詳細に解説する。実装例とベストプラクティスを中心に述べる。`,
      conversational: (t) => `「${t}」について気になっていませんか？この記事では、あなたの疑問にお答えしながら、一緒に理解を深めていきましょう。`,
    };

    return hooks[tone](topic);
  }

  /**
   * CTA部分を生成
   */
  generateCTA(cta: ArticleCTA): string {
    const templates: Record<ArticleCTA['type'], (cta: ArticleCTA) => string> = {
      newsletter: (c) => `\n\n---\n\n📬 **${c.text}**\n\n${c.url ? `[登録はこちら](${c.url})` : ''}`,
      product: (c) => `\n\n---\n\n🛒 **${c.text}**\n\n${c.url ? `[詳細を見る](${c.url})` : ''}`,
      link: (c) => `\n\n---\n\n🔗 **${c.text}**\n\n${c.url ? `[こちらをクリック](${c.url})` : ''}`,
      custom: (c) => `\n\n---\n\n${c.text}${c.url ? `\n\n[詳細](${c.url})` : ''}`,
    };

    return templates[cta.type](cta);
  }

  /**
   * 読了時間を推定（分）
   */
  estimateReadingTime(wordCount: number): number {
    // 日本語: 約400-600文字/分、英語: 約200-250語/分
    // 日本語は文字数ベースで計算
    const charsPerMinute = 500;
    return Math.max(1, Math.ceil(wordCount / charsPerMinute));
  }

  /**
   * 本文を生成
   */
  private generateBody(
    options: ArticleOptions, 
    lengthConfig: { min: number; max: number; sections: number }
  ): string {
    const sections: string[] = [];
    const { tone, audience, topic, content } = options;

    // 導入部
    sections.push(this.generateIntroduction(topic, tone, audience));

    // メインコンテンツがある場合は使用
    if (content) {
      sections.push(this.adaptTone(content, tone));
    } else {
      // セクションを生成
      for (let i = 0; i < lengthConfig.sections - 1; i++) {
        sections.push(this.generateSection(topic, tone, i));
      }
    }

    // まとめ
    sections.push(this.generateConclusion(topic, tone));

    return sections.join('\n\n');
  }

  /**
   * 導入部を生成
   */
  private generateIntroduction(
    topic: string, 
    _tone: ArticleTone, 
    audience: ArticleAudience
  ): string {
    const audienceNote: Record<ArticleAudience, string> = {
      beginner: '初めての方でも理解できるよう、基礎から丁寧に説明します。',
      intermediate: 'ある程度の基礎知識をお持ちの方向けに、実践的な内容を中心にお伝えします。',
      expert: '専門家の方向けに、高度なトピックと最新の知見を紹介します。',
    };

    return `## はじめに\n\n${audienceNote[audience]}\n\n${topic}を理解することで、より効果的な活用が可能になります。`;
  }

  /**
   * セクションを生成
   */
  private generateSection(topic: string, _tone: ArticleTone, index: number): string {
    const sectionTitles = [
      '基本概念',
      '実践方法',
      '応用テクニック',
      '注意点とベストプラクティス',
      '今後の展望',
    ];

    const title = sectionTitles[index % sectionTitles.length];
    return `## ${title}\n\n${topic}の${title}について解説します。\n\n（ここに詳細なコンテンツが入ります）`;
  }

  /**
   * まとめを生成
   */
  private generateConclusion(topic: string, tone: ArticleTone): string {
    const conclusions: Record<ArticleTone, string> = {
      formal: `## まとめ\n\n本記事では${topic}について解説いたしました。今後の参考にしていただければ幸いです。`,
      casual: `## まとめ\n\nいかがでしたか？${topic}について、少しでも参考になれば嬉しいです！`,
      technical: `## まとめ\n\n以上、${topic}の技術的概要を述べた。実装時の参考としていただきたい。`,
      conversational: `## まとめ\n\n${topic}について、一緒に見てきましたね。何か新しい発見はありましたか？`,
    };

    return conclusions[tone];
  }

  /**
   * テキストをトーンに合わせて調整
   */
  private adaptTone(text: string, tone: ArticleTone): string {
    // 簡易的なトーン調整（実際はより高度な処理が必要）
    let result = text;

    if (tone === 'casual') {
      result = result.replace(/です。/g, 'ですね！');
      result = result.replace(/ます。/g, 'ますよ！');
    } else if (tone === 'technical') {
      result = result.replace(/〜ですね/g, '〜である');
      result = result.replace(/〜しましょう/g, '〜する');
    }

    return result;
  }

  /**
   * 単語数をカウント
   */
  private countWords(text: string): number {
    // 日本語は文字数、英語は単語数でカウント
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    
    return japaneseChars.length + englishWords.length;
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(topic: string): string[] {
    // 簡易的なキーワード抽出
    const words = topic
      .split(/[\s、,]+/)
      .filter(w => w.length > 1);
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * メタディスクリプションを生成
   */
  private generateMetaDescription(
    title: string, 
    topic: string, 
    tone: ArticleTone
  ): string {
    const base = `${topic}について解説。`;
    const suffix: Record<ArticleTone, string> = {
      formal: '専門的な観点から体系的にまとめています。',
      casual: 'わかりやすく楽しく紹介しています！',
      technical: '技術的な詳細と実装例を含みます。',
      conversational: 'あなたの疑問にお答えします。',
    };

    const description = `${title} - ${base}${suffix[tone]}`;
    
    // 120-160文字に調整
    if (description.length > 160) {
      return description.slice(0, 157) + '...';
    }
    return description;
  }

  /**
   * SEOキーワード密度をチェック
   */
  checkKeywordDensity(
    content: string, 
    keywords: string[]
  ): { keyword: string; count: number; density: number; status: 'ok' | 'low' | 'high' }[] {
    const totalChars = content.length;
    
    return keywords.map(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex) || [];
      const count = matches.length;
      const density = (count * keyword.length / totalChars) * 100;
      
      let status: 'ok' | 'low' | 'high';
      if (density < 0.5) {
        status = 'low';
      } else if (density > 3) {
        status = 'high';
      } else {
        status = 'ok';
      }
      
      return { keyword, count, density: Math.round(density * 100) / 100, status };
    });
  }
}
