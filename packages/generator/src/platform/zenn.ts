/**
 * ZennGenerator - Zenn記事・Book生成
 *
 * @since 0.2.0
 * @requirement REQ-GENERATE-009-NEW-001
 * @design DES-KATASHIRO-002 §4.4 Zenn記事生成
 */

/**
 * Zenn記事生成オプション
 */
export interface ZennArticleOptions {
  /** 記事タイトル */
  title: string;
  /** 絵文字（1文字） */
  emoji: string;
  /** 記事タイプ */
  type: 'tech' | 'idea';
  /** トピック（小文字、最大5個） */
  topics: string[];
  /** 公開状態 */
  published: boolean;
  /** 記事本文（Markdown） */
  body: string;
}

/**
 * Zenn Book章
 */
export interface ZennBookChapter {
  /** URLスラッグ */
  slug: string;
  /** 章タイトル */
  title: string;
  /** 章本文 */
  content: string;
  /** 無料公開章 */
  free?: boolean;
}

/**
 * Zenn Book生成オプション
 */
export interface ZennBookOptions {
  /** Book タイトル */
  title: string;
  /** 概要 */
  summary: string;
  /** 価格（0で無料） */
  price: number;
  /** トピック */
  topics: string[];
  /** 章リスト */
  chapters: ZennBookChapter[];
}

/**
 * 生成されたZenn記事
 */
export interface ZennArticle {
  /** YAML frontmatter */
  frontmatter: string;
  /** 本文 */
  body: string;
  /** frontmatter + body */
  fullContent: string;
  /** 警告 */
  warnings: string[];
}

/**
 * 生成されたZenn Book
 */
export interface ZennBook {
  /** config.yaml の内容 */
  configYaml: string;
  /** 章ファイル */
  chapters: Array<{ filename: string; content: string }>;
  /** 警告 */
  warnings: string[];
}

/**
 * Zenn記事・Book生成クラス
 */
export class ZennGenerator {
  /** トピック最大数 */
  private static readonly MAX_TOPICS = 5;
  /** デフォルト絵文字 */
  private static readonly DEFAULT_EMOJI = '📝';

  /**
   * Zenn記事を生成
   */
  async generateArticle(options: ZennArticleOptions): Promise<ZennArticle> {
    const warnings: string[] = [];

    // 絵文字検証
    const emoji = this.validateEmoji(options.emoji) 
      ? options.emoji 
      : ZennGenerator.DEFAULT_EMOJI;
    if (emoji !== options.emoji) {
      warnings.push(`Invalid emoji replaced with default: ${ZennGenerator.DEFAULT_EMOJI}`);
    }

    // トピック正規化
    let topics = options.topics.map(t => t.toLowerCase().trim()).filter(Boolean);
    topics = [...new Set(topics)]; // 重複除去
    if (topics.length > ZennGenerator.MAX_TOPICS) {
      warnings.push(`Topics truncated from ${topics.length} to ${ZennGenerator.MAX_TOPICS}`);
      topics = topics.slice(0, ZennGenerator.MAX_TOPICS);
    }

    // Markdown変換
    const convertedBody = this.convertToZennMarkdown(options.body);

    // Frontmatter生成
    const frontmatter = this.generateFrontmatter({
      title: options.title,
      emoji,
      type: options.type,
      topics,
      published: options.published,
    });

    const fullContent = `---\n${frontmatter}---\n\n${convertedBody}`;

    return {
      frontmatter,
      body: convertedBody,
      fullContent,
      warnings,
    };
  }

  /**
   * Zenn Bookを生成
   */
  async generateBook(options: ZennBookOptions): Promise<ZennBook> {
    const warnings: string[] = [];

    // トピック正規化
    let topics = options.topics.map(t => t.toLowerCase().trim()).filter(Boolean);
    topics = [...new Set(topics)];

    // config.yaml生成
    const configLines = [
      `title: "${options.title}"`,
      `summary: "${options.summary}"`,
      `topics:`,
      ...topics.map(t => `  - "${t}"`),
      `published: true`,
      `price: ${options.price}`,
      `chapters:`,
      ...options.chapters.map(ch => `  - "${ch.slug}"`),
    ];
    const configYaml = configLines.join('\n');

    // 章ファイル生成
    const chapters = options.chapters.map((chapter, _index) => {
      const frontmatter = [
        `---`,
        `title: "${chapter.title}"`,
        chapter.free ? `free: true` : null,
        `---`,
      ].filter(Boolean).join('\n');

      const content = `${frontmatter}\n\n${this.convertToZennMarkdown(chapter.content)}`;
      
      return {
        filename: `${chapter.slug}.md`,
        content,
      };
    });

    return {
      configYaml,
      chapters,
      warnings,
    };
  }

  /**
   * 標準MarkdownをZenn記法に変換
   */
  convertToZennMarkdown(markdown: string): string {
    let result = markdown;

    // Message記法への変換
    // > **Note**: → :::message
    result = result.replace(
      /> \*\*Note\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::message\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \*\*Warning\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::message alert\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \*\*Danger\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::message alert\n${content.trim()}\n:::`
    );

    // GitHub Alertsスタイルの変換
    result = result.replace(
      /> \[!NOTE\]\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::message\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \[!WARNING\]\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::message alert\n${content.trim()}\n:::`
    );

    // <details> → :::details
    result = result.replace(
      /<details>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/gi,
      (_, summary, content) => `:::details ${summary.trim()}\n${content.trim()}\n:::`
    );

    // URL埋め込み変換
    result = this.convertEmbeds(result);

    return result;
  }

  /**
   * URL埋め込みをZenn記法に変換
   */
  private convertEmbeds(markdown: string): string {
    let result = markdown;

    // YouTube
    // https://www.youtube.com/watch?v=VIDEO_ID → @[youtube](VIDEO_ID)
    result = result.replace(
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:&.*)?$/gm,
      '@[youtube]($1)'
    );
    result = result.replace(
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(?:\?.*)?$/gm,
      '@[youtube]($1)'
    );

    // Twitter/X
    result = result.replace(
      /^(https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)$/gm,
      '@[tweet]($1)'
    );

    // GitHub Gist
    result = result.replace(
      /^https?:\/\/gist\.github\.com\/(\w+\/[a-f0-9]+)$/gm,
      '@[gist]($1)'
    );

    // CodeSandbox
    result = result.replace(
      /^https?:\/\/codesandbox\.io\/s\/([a-zA-Z0-9-]+)$/gm,
      '@[codesandbox]($1)'
    );

    return result;
  }

  /**
   * 絵文字を検証
   */
  validateEmoji(emoji: string): boolean {
    if (!emoji) return false;
    
    // 絵文字の正規表現（基本的な絵文字範囲）
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})$/u;
    return emojiRegex.test(emoji);
  }

  /**
   * スラッグを生成
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'untitled';
  }

  /**
   * Frontmatter YAML生成
   */
  private generateFrontmatter(options: {
    title: string;
    emoji: string;
    type: 'tech' | 'idea';
    topics: string[];
    published: boolean;
  }): string {
    const lines = [
      `title: "${options.title}"`,
      `emoji: "${options.emoji}"`,
      `type: "${options.type}"`,
      `topics:`,
      ...options.topics.map(t => `  - "${t}"`),
      `published: ${options.published}`,
    ];
    return lines.join('\n') + '\n';
  }

  /**
   * 記事バリデーション
   */
  validate(options: ZennArticleOptions): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // タイトルチェック
    if (!options.title || options.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (options.title.length > 70) {
      errors.push('タイトルは70文字以内にしてください');
    }

    // 絵文字チェック
    if (!options.emoji || !this.validateEmoji(options.emoji)) {
      errors.push('絵文字を1つ指定してください');
    }

    // トピックチェック
    if (!options.topics || options.topics.length === 0) {
      errors.push('トピックを少なくとも1つ指定してください');
    } else if (options.topics.length > ZennGenerator.MAX_TOPICS) {
      errors.push(`トピックは${ZennGenerator.MAX_TOPICS}個までです`);
    }

    // 本文チェック
    if (!options.body || options.body.trim().length === 0) {
      errors.push('本文は必須です');
    } else if (options.body.length < 100) {
      warnings.push('本文が短すぎる可能性があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
