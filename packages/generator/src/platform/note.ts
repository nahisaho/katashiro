/**
 * NoteGenerator - note.com記事生成
 *
 * @since 0.2.0
 * @requirement REQ-GENERATE-010-NEW-001
 * @design DES-KATASHIRO-002 §4.5 note記事生成
 */

/**
 * note記事生成オプション
 */
export interface NoteArticleOptions {
  /** 記事タイトル */
  title: string;
  /** 記事本文（Markdown） */
  body: string;
  /** アイキャッチ画像URL */
  eyecatch?: string;
}

/**
 * 生成されたnote記事
 */
export interface NoteArticle {
  /** タイトル */
  title: string;
  /** note.com互換Markdown本文 */
  body: string;
  /** アイキャッチ画像URL */
  eyecatch?: string;
  /** 警告メッセージ */
  warnings: string[];
  /** 削除された要素のリスト */
  removedElements: string[];
}

/**
 * note.com記事生成クラス
 * 
 * note.comの制約:
 * - h4, h5, h6 → h3にダウングレード
 * - テーブル記法非対応 → 削除
 * - HTMLタグ非対応 → 削除
 * - コードブロックのネストは非対応
 * - **bold** は前後にスペースが必要
 */
export class NoteGenerator {
  /**
   * note記事を生成
   */
  async generate(options: NoteArticleOptions): Promise<NoteArticle> {
    const warnings: string[] = [];
    const removedElements: string[] = [];

    // Markdown変換
    const { body: convertedBody, warnings: convWarnings, removed } = 
      this.convertToNoteMarkdown(options.body);
    
    warnings.push(...convWarnings);
    removedElements.push(...removed);

    // タイトル内のh1チェック
    let finalBody = convertedBody;
    const h1Match = finalBody.match(/^#\s+(.+)$/m);
    if (h1Match) {
      warnings.push('h1 found in body - should be in title field only');
      // h1を削除
      finalBody = finalBody.replace(/^#\s+.+\n*/m, '');
    }

    return {
      title: options.title,
      body: finalBody.trim(),
      eyecatch: options.eyecatch,
      warnings,
      removedElements,
    };
  }

  /**
   * 標準Markdownをnote.com互換に変換
   */
  convertToNoteMarkdown(markdown: string): { 
    body: string; 
    warnings: string[]; 
    removed: string[];
  } {
    const warnings: string[] = [];
    const removed: string[] = [];
    let result = markdown;

    // h4, h5, h6 → h3 にダウングレード
    const h4Count = (result.match(/^####\s/gm) || []).length;
    const h5Count = (result.match(/^#####\s/gm) || []).length;
    const h6Count = (result.match(/^######\s/gm) || []).length;
    
    if (h4Count > 0) {
      warnings.push(`${h4Count} h4 heading(s) downgraded to h3`);
    }
    if (h5Count > 0) {
      warnings.push(`${h5Count} h5 heading(s) downgraded to h3`);
    }
    if (h6Count > 0) {
      warnings.push(`${h6Count} h6 heading(s) downgraded to h3`);
    }

    result = result.replace(/^######\s+/gm, '### ');
    result = result.replace(/^#####\s+/gm, '### ');
    result = result.replace(/^####\s+/gm, '### ');

    // テーブル記法の削除
    const tableMatches = result.match(/^\|.+\|$/gm);
    if (tableMatches && tableMatches.length > 0) {
      warnings.push('Tables are not supported in note.com and will be removed');
      removed.push(...tableMatches.slice(0, 3).map(t => t.slice(0, 50) + '...'));
      
      // テーブル全体を削除（ヘッダー行、区切り行、データ行）
      result = result.replace(/^\|.+\|\n(?:\|[-:| ]+\|\n)?(?:\|.+\|\n?)*/gm, '\n');
    }

    // HTMLタグの削除
    const htmlTags = result.match(/<[^>]+>/g);
    if (htmlTags && htmlTags.length > 0) {
      const uniqueTags = [...new Set(htmlTags.map(t => t.match(/<\/?(\w+)/)?.[1] || t))];
      warnings.push(`HTML tags are not supported: ${uniqueTags.join(', ')}`);
      removed.push(...uniqueTags.map(t => `<${t}>`));
      
      // 自己終了タグ
      result = result.replace(/<[^>]+\/>/g, '');
      // 開始・終了タグペア（内容は保持）
      result = result.replace(/<(\w+)[^>]*>([\s\S]*?)<\/\1>/g, '$2');
      // 残りのタグ
      result = result.replace(/<[^>]+>/g, '');
    }

    // __bold__ → **bold** 変換
    result = result.replace(/__([^_]+)__/g, '**$1**');

    // **bold** の前後にスペースを追加（日本語対応）
    result = this.fixBoldSpacing(result);

    // 連続する空行を2行に制限
    result = result.replace(/\n{3,}/g, '\n\n');

    return { body: result, warnings, removed };
  }

  /**
   * 記事バリデーション
   */
  validate(options: NoteArticleOptions): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // タイトルチェック
    if (!options.title || options.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (options.title.length > 100) {
      errors.push('タイトルは100文字以内にしてください');
    }

    // 本文チェック
    if (!options.body || options.body.trim().length === 0) {
      errors.push('本文は必須です');
    } else if (options.body.length < 50) {
      warnings.push('本文が短すぎる可能性があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * note.comの太字制約に対応（前後にスペース必要）
   */
  private fixBoldSpacing(markdown: string): string {
    let result = markdown;

    // **text** の前にスペースがない場合（日本語文字の後）
    result = result.replace(/([^\s*])(\*\*[^*]+\*\*)/g, '$1 $2');
    
    // **text** の後にスペースがない場合（日本語文字の前）
    result = result.replace(/(\*\*[^*]+\*\*)([^\s*])/g, '$1 $2');

    return result;
  }

  /**
   * コンテンツをnote.com用にサニタイズ
   */
  sanitizeForNote(markdown: string): string {
    const { body } = this.convertToNoteMarkdown(markdown);
    return body;
  }
}
