/**
 * ReportGenerator - レポート生成
 *
 * @requirement REQ-GEN-001
 * @design DES-KATASHIRO-001 §2.3 Generator Container
 * @task TSK-030
 */

import { ok, err, type Result, type Content, type Source } from '@nahisaho/katashiro-core';

/**
 * レポート設定
 */
export interface ReportConfig {
  readonly format: 'markdown' | 'html';
  readonly includeTitle?: boolean;
  readonly includeToc?: boolean;
  readonly includeSources?: boolean;
  readonly includeDate?: boolean;
  readonly style?: 'formal' | 'casual' | 'technical';
}

/**
 * レポートセクション
 */
export interface ReportSection {
  readonly heading: string;
  readonly level: number;
  readonly content: string;
  readonly subsections?: ReportSection[];
}

/**
 * レポート生成実装
 */
export class ReportGenerator {
  /**
   * レポートを生成（簡易API）
   * @param options レポート設定
   */
  async generate(options: {
    title: string;
    sections?: Array<{ heading: string; content: string }>;
    format?: 'markdown' | 'html';
    metadata?: { author?: string; date?: string };
  }): Promise<string> {
    const format = options.format ?? 'markdown';
    const sections = options.sections ?? [];
    const lines: string[] = [];
    
    if (format === 'markdown') {
      // タイトル
      lines.push(`# ${options.title}`);
      lines.push('');
      
      // メタデータ
      if (options.metadata) {
        if (options.metadata.author) {
          lines.push(`**Author**: ${options.metadata.author}`);
        }
        if (options.metadata.date) {
          lines.push(`**Date**: ${options.metadata.date}`);
        }
        lines.push('');
      }
      
      // セクション
      for (const section of sections) {
        lines.push(`## ${section.heading}`);
        lines.push('');
        lines.push(section.content);
        lines.push('');
      }
    } else {
      // HTML形式
      lines.push('<!DOCTYPE html>');
      lines.push('<html><head><meta charset="utf-8">');
      lines.push(`<title>${options.title}</title></head><body>`);
      lines.push(`<h1>${options.title}</h1>`);
      
      for (const section of sections) {
        lines.push(`<h2>${section.heading}</h2>`);
        lines.push(`<p>${section.content}</p>`);
      }
      
      lines.push('</body></html>');
    }
    
    return lines.join('\n');
  }

  /**
   * レポートを生成
   */
  async generateReport(
    content: Content,
    config: ReportConfig
  ): Promise<Result<string, Error>> {
    try {
      const sections = this.extractSections(content);
      
      if (config.format === 'markdown') {
        return ok(this.generateMarkdown(content, sections, config));
      } else {
        return ok(this.generateHtml(content, sections, config));
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * セクションを作成
   */
  createSection(
    heading: string,
    level: number,
    content: string,
    subsections?: ReportSection[]
  ): ReportSection {
    return {
      heading,
      level,
      content,
      subsections,
    };
  }

  /**
   * 目次を生成
   */
  generateToc(sections: ReportSection[]): string {
    const lines: string[] = ['## 目次\n'];
    
    const addToToc = (section: ReportSection, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      const anchor = this.slugify(section.heading);
      lines.push(`${indent}- [${section.heading}](#${anchor})`);
      
      if (section.subsections) {
        for (const sub of section.subsections) {
          addToToc(sub, depth + 1);
        }
      }
    };

    for (const section of sections) {
      addToToc(section);
    }

    return lines.join('\n');
  }

  /**
   * ソースをフォーマット
   */
  formatSources(sources: Source[], format: 'markdown' | 'html'): string {
    if (sources.length === 0) return '';

    if (format === 'markdown') {
      const lines = ['## 参考文献\n'];
      sources.forEach((source, index) => {
        const title = source.metadata?.title ?? source.url;
        lines.push(`[${index + 1}] ${title} - ${source.url}`);
      });
      return lines.join('\n');
    } else {
      const items = sources.map((source, index) => {
        const title = source.metadata?.title ?? source.url;
        return `<li>[${index + 1}] <a href="${this.escapeHtml(source.url)}">${this.escapeHtml(title)}</a></li>`;
      }).join('\n');
      return `<section class="references">
<h2>参考文献</h2>
<ol>
${items}
</ol>
</section>`;
    }
  }

  /**
   * コンテンツからセクションを抽出
   */
  private extractSections(content: Content): ReportSection[] {
    const body = content.body;
    const sections: ReportSection[] = [];
    
    // Simple extraction: split by paragraphs
    const paragraphs = body.split(/\n\n+/).filter(p => p.trim());
    
    if (paragraphs.length > 0) {
      sections.push({
        heading: '概要',
        level: 2,
        content: paragraphs[0] ?? '',
      });
    }

    if (paragraphs.length > 1) {
      sections.push({
        heading: '詳細',
        level: 2,
        content: paragraphs.slice(1).join('\n\n'),
      });
    }

    return sections;
  }

  /**
   * Markdownレポートを生成
   */
  private generateMarkdown(
    content: Content,
    sections: ReportSection[],
    config: ReportConfig
  ): string {
    const parts: string[] = [];

    // Title
    if (config.includeTitle !== false) {
      parts.push(`# ${content.title}\n`);
    }

    // Date
    if (config.includeDate) {
      parts.push(`*作成日: ${new Date(content.createdAt).toLocaleDateString('ja-JP')}*\n`);
    }

    // TOC
    if (config.includeToc) {
      parts.push(this.generateToc(sections));
      parts.push('');
    }

    // Sections
    for (const section of sections) {
      parts.push(this.renderMarkdownSection(section));
    }

    // Sources
    if (config.includeSources && content.sources.length > 0) {
      parts.push('');
      parts.push(this.formatSources(content.sources, 'markdown'));
    }

    return parts.join('\n');
  }

  /**
   * HTMLレポートを生成
   */
  private generateHtml(
    content: Content,
    sections: ReportSection[],
    config: ReportConfig
  ): string {
    const parts: string[] = [];

    parts.push('<!DOCTYPE html>');
    parts.push('<html lang="ja">');
    parts.push('<head>');
    parts.push(`<meta charset="UTF-8">`);
    parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
    parts.push(`<title>${this.escapeHtml(content.title)}</title>`);
    parts.push('<style>');
    parts.push(this.getDefaultStyles());
    parts.push('</style>');
    parts.push('</head>');
    parts.push('<body>');
    parts.push('<article>');

    // Title
    if (config.includeTitle !== false) {
      parts.push(`<h1>${this.escapeHtml(content.title)}</h1>`);
    }

    // Date
    if (config.includeDate) {
      parts.push(`<p class="date">作成日: ${new Date(content.createdAt).toLocaleDateString('ja-JP')}</p>`);
    }

    // Sections
    for (const section of sections) {
      parts.push(this.renderHtmlSection(section));
    }

    // Sources
    if (config.includeSources && content.sources.length > 0) {
      parts.push(this.formatSources(content.sources, 'html'));
    }

    parts.push('</article>');
    parts.push('</body>');
    parts.push('</html>');

    return parts.join('\n');
  }

  /**
   * Markdownセクションをレンダリング
   */
  private renderMarkdownSection(section: ReportSection): string {
    const parts: string[] = [];
    const heading = '#'.repeat(section.level) + ' ' + section.heading;
    parts.push(heading);
    parts.push('');
    
    if (section.content) {
      parts.push(section.content);
      parts.push('');
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        parts.push(this.renderMarkdownSection(sub));
      }
    }

    return parts.join('\n');
  }

  /**
   * HTMLセクションをレンダリング
   */
  private renderHtmlSection(section: ReportSection): string {
    const parts: string[] = [];
    const tag = `h${Math.min(section.level, 6)}`;
    const id = this.slugify(section.heading);
    
    parts.push(`<section id="${id}">`);
    parts.push(`<${tag}>${this.escapeHtml(section.heading)}</${tag}>`);
    
    if (section.content) {
      const paragraphs = section.content.split(/\n\n+/);
      for (const p of paragraphs) {
        if (p.trim()) {
          parts.push(`<p>${this.escapeHtml(p.trim())}</p>`);
        }
      }
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        parts.push(this.renderHtmlSection(sub));
      }
    }

    parts.push('</section>');
    return parts.join('\n');
  }

  /**
   * スラグを生成
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * デフォルトスタイル
   */
  private getDefaultStyles(): string {
    return `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.6;
}
h1, h2, h3 { margin-top: 2rem; }
.date { color: #666; font-style: italic; }
.references { margin-top: 3rem; border-top: 1px solid #ccc; padding-top: 1rem; }
.references ol { padding-left: 1.5rem; }
    `.trim();
  }
}
