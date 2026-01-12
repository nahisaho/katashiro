/**
 * QiitaGenerator - Qiita記事生成
 *
 * @since 0.2.0
 * @requirement REQ-GENERATE-008-NEW-001
 * @design DES-KATASHIRO-002 §4.3 Qiita記事生成
 */

/**
 * Qiita記事生成オプション
 */
export interface QiitaArticleOptions {
  /** 記事タイトル */
  title: string;
  /** 記事本文（Markdown） */
  body: string;
  /** タグ（最大5個） */
  tags: string[];
  /** 限定公開 */
  private?: boolean;
  /** スライドモード */
  slideMode?: boolean;
}

/**
 * 生成されたQiita記事
 */
export interface QiitaArticle {
  /** タイトル */
  title: string;
  /** タグ配列（Qiita API形式） */
  tags: Array<{ name: string }>;
  /** Qiita互換Markdown本文 */
  body: string;
  /** 限定公開フラグ */
  private: boolean;
  /** 警告メッセージ */
  warnings: string[];
}

/**
 * タグバリデーション結果
 */
export interface TagValidationResult {
  /** 有効なタグ */
  valid: string[];
  /** 無効なタグ */
  invalid: string[];
}

/**
 * Qiita記事生成クラス
 */
export class QiitaGenerator {
  /** タグ最大数 */
  private static readonly MAX_TAGS = 5;
  /** タグ正規化パターン */
  private static readonly TAG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

  /**
   * Qiita記事を生成
   */
  async generate(options: QiitaArticleOptions): Promise<QiitaArticle> {
    const warnings: string[] = [];

    // タグ処理
    const tagValidation = this.validateTags(options.tags);
    if (tagValidation.invalid.length > 0) {
      warnings.push(`Invalid tags removed: ${tagValidation.invalid.join(', ')}`);
    }

    let validTags = tagValidation.valid;
    if (validTags.length > QiitaGenerator.MAX_TAGS) {
      warnings.push(`Tags truncated from ${validTags.length} to ${QiitaGenerator.MAX_TAGS}`);
      validTags = validTags.slice(0, QiitaGenerator.MAX_TAGS);
    }

    // Markdown変換
    const convertedBody = this.convertToQiitaMarkdown(options.body);

    return {
      title: options.title,
      tags: validTags.map(name => ({ name })),
      body: convertedBody,
      private: options.private ?? false,
      warnings,
    };
  }

  /**
   * 標準MarkdownをQiita記法に変換
   */
  convertToQiitaMarkdown(markdown: string): string {
    let result = markdown;

    // Note/Warning/Danger記法の変換
    // > **Note**: message → :::note info\nmessage\n:::
    result = result.replace(
      /> \*\*Note\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note info\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \*\*Warning\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note warn\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \*\*Danger\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note alert\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \*\*Alert\*\*:?\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note alert\n${content.trim()}\n:::`
    );

    // GitHub Alertsスタイルの変換
    // > [!NOTE] → :::note info
    result = result.replace(
      /> \[!NOTE\]\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note info\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \[!WARNING\]\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note warn\n${content.trim()}\n:::`
    );
    result = result.replace(
      /> \[!CAUTION\]\s*([\s\S]*?)(?=\n(?!>)|$)/gi,
      (_, content) => `:::note alert\n${content.trim()}\n:::`
    );

    return result;
  }

  /**
   * タグを検証
   */
  validateTags(tags: string[]): TagValidationResult {
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const tag of tags) {
      // 空文字スキップ
      if (!tag || tag.trim() === '') {
        continue;
      }

      // 正規化（小文字化、先頭/末尾の空白除去）
      const normalized = tag.trim().toLowerCase();

      // 重複チェック
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);

      // パターンチェック
      if (QiitaGenerator.TAG_PATTERN.test(normalized)) {
        valid.push(normalized);
      } else {
        // 正規化を試みる（特殊文字をハイフンに）
        const sanitized = normalized
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-+/g, '-');
        
        if (sanitized && QiitaGenerator.TAG_PATTERN.test(sanitized)) {
          if (!seen.has(sanitized)) {
            valid.push(sanitized);
            seen.add(sanitized);
          }
        } else {
          invalid.push(tag);
        }
      }
    }

    return { valid, invalid };
  }

  /**
   * コードブロックにファイル名を付与
   * @example ```typescript → ```typescript:example.ts
   */
  addFilenameToCodeBlock(
    markdown: string,
    filename: string,
    language?: string
  ): string {
    const langPattern = language 
      ? new RegExp(`\`\`\`${language}(?!:)`, 'g')
      : /```(\w+)(?!:)/g;
    
    if (language) {
      return markdown.replace(langPattern, `\`\`\`${language}:${filename}`);
    }
    return markdown.replace(langPattern, `\`\`\`$1:${filename}`);
  }

  /**
   * 記事バリデーション
   */
  validate(options: QiitaArticleOptions): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // タイトルチェック
    if (!options.title || options.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (options.title.length > 60) {
      errors.push('タイトルは60文字以内にしてください');
    }

    // 本文チェック
    if (!options.body || options.body.trim().length === 0) {
      errors.push('本文は必須です');
    } else if (options.body.length < 100) {
      warnings.push('本文が短すぎる可能性があります');
    }

    // タグチェック
    if (!options.tags || options.tags.length === 0) {
      errors.push('タグを少なくとも1つ指定してください');
    } else if (options.tags.length > QiitaGenerator.MAX_TAGS) {
      warnings.push(`タグは${QiitaGenerator.MAX_TAGS}個までです（超過分は自動削除されます）`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
