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
 * 拡張レポートオプション
 * @since 0.2.11
 */
export interface ExtendedReportOptions {
  readonly title: string;
  readonly sections?: Array<{ heading: string; content: string; subsections?: Array<{ heading: string; content: string }> }>;
  readonly format?: 'markdown' | 'html';
  readonly metadata?: { 
    author?: string; 
    date?: string;
    version?: string;
    department?: string;
    confidentiality?: 'public' | 'internal' | 'confidential';
  };
  readonly style?: 'executive' | 'technical' | 'academic';
  readonly includeToc?: boolean;
  readonly includeExecutiveSummary?: boolean;
  readonly includeConclusion?: boolean;
  readonly data?: {
    metrics?: Array<{ label: string; value: string | number; change?: string }>;
    entities?: Array<{ name: string; type: string }>;
    sources?: Array<{ title: string; url: string }>;
  };
}

/**
 * レポート生成実装
 */
export class ReportGenerator {
  /**
   * レポートを生成（簡易API）
   * @param options レポート設定
   * @since 0.2.11 - 拡張オプション対応
   */
  async generate(options: ExtendedReportOptions): Promise<string> {
    const format = options.format ?? 'markdown';
    const sections = options.sections ?? [];
    const lines: string[] = [];
    
    if (format === 'markdown') {
      // タイトル
      lines.push(`# ${options.title}`);
      lines.push('');
      
      // メタデータ（テーブル形式）
      if (options.metadata) {
        lines.push('| 項目 | 内容 |');
        lines.push('|------|------|');
        if (options.metadata.author) {
          lines.push(`| 作成者 | ${options.metadata.author} |`);
        }
        if (options.metadata.date) {
          lines.push(`| 作成日 | ${options.metadata.date} |`);
        }
        if (options.metadata.version) {
          lines.push(`| バージョン | ${options.metadata.version} |`);
        }
        if (options.metadata.department) {
          lines.push(`| 部署 | ${options.metadata.department} |`);
        }
        if (options.metadata.confidentiality) {
          const confLabel = { public: '公開', internal: '社内限定', confidential: '機密' }[options.metadata.confidentiality];
          lines.push(`| 機密レベル | ${confLabel} |`);
        }
        lines.push('');
      }
      
      // 目次
      if (options.includeToc !== false && sections.length > 0) {
        lines.push('## 目次');
        lines.push('');
        sections.forEach((s, i) => {
          lines.push(`${i + 1}. [${s.heading}](#${this.slugify(s.heading)})`);
        });
        lines.push('');
      }
      
      // エグゼクティブサマリー（自動生成）
      if (options.includeExecutiveSummary && sections.length > 0) {
        lines.push('## エグゼクティブサマリー');
        lines.push('');
        const summary = this.generateExecutiveSummary(sections, options.data);
        lines.push(summary);
        lines.push('');
      }
      
      // メトリクステーブル
      if (options.data?.metrics && options.data.metrics.length > 0) {
        lines.push('## 主要指標');
        lines.push('');
        lines.push('| 指標 | 値 | 変化 |');
        lines.push('|------|-----|------|');
        for (const metric of options.data.metrics) {
          lines.push(`| ${metric.label} | ${metric.value} | ${metric.change ?? '-'} |`);
        }
        lines.push('');
      }
      
      // セクション
      for (const section of sections) {
        lines.push(`## ${section.heading}`);
        lines.push('');
        lines.push(section.content);
        lines.push('');
        
        // サブセクション
        if (section.subsections) {
          for (const sub of section.subsections) {
            lines.push(`### ${sub.heading}`);
            lines.push('');
            lines.push(sub.content);
            lines.push('');
          }
        }
      }
      
      // エンティティリスト
      if (options.data?.entities && options.data.entities.length > 0) {
        lines.push('## 関連エンティティ');
        lines.push('');
        const byType = this.groupBy(options.data.entities, 'type');
        for (const [type, entities] of Object.entries(byType)) {
          lines.push(`### ${this.formatEntityType(type)}`);
          lines.push('');
          for (const e of entities) {
            lines.push(`- ${e.name}`);
          }
          lines.push('');
        }
      }
      
      // 結論（自動生成）
      if (options.includeConclusion && sections.length > 0) {
        lines.push('## 結論・提言');
        lines.push('');
        const conclusion = this.generateConclusion(sections, options.data);
        lines.push(conclusion);
        lines.push('');
      }
      
      // 参考文献
      if (options.data?.sources && options.data.sources.length > 0) {
        lines.push('## 参考文献');
        lines.push('');
        for (const source of options.data.sources) {
          lines.push(`- [${source.title}](${source.url})`);
        }
        lines.push('');
      }
      
      // フッター
      lines.push('---');
      lines.push(`*このレポートはKATASHIROにより自動生成されました (${new Date().toISOString().split('T')[0]})*`);
    } else {
      // HTML形式
      lines.push('<!DOCTYPE html>');
      lines.push('<html><head><meta charset="utf-8">');
      lines.push(`<title>${options.title}</title>`);
      lines.push('<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>');
      lines.push('</head><body>');
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
   * エグゼクティブサマリーを自動生成
   * @since 0.2.11
   */
  private generateExecutiveSummary(
    sections: Array<{ heading: string; content: string }>,
    data?: ExtendedReportOptions['data']
  ): string {
    const points: string[] = [];
    
    // 各セクションから要点を抽出
    for (const section of sections.slice(0, 3)) {
      const firstSentence = section.content.split(/[。.]/)[0];
      if (firstSentence && firstSentence.length > 10) {
        points.push(`- **${section.heading}**: ${firstSentence}`);
      }
    }
    
    // メトリクスのハイライト
    if (data?.metrics && data.metrics.length > 0) {
      const highlight = data.metrics[0];
      if (highlight) {
        points.push(`- **主要指標**: ${highlight.label}は${highlight.value}${highlight.change ? `（${highlight.change}）` : ''}`);
      }
    }
    
    return points.length > 0 ? points.join('\n') : '本レポートでは上記の項目について分析・報告する。';
  }

  /**
   * 結論を自動生成
   * @since 0.2.11
   */
  private generateConclusion(
    sections: Array<{ heading: string; content: string }>,
    _data?: ExtendedReportOptions['data']
  ): string {
    const lines: string[] = [];
    
    lines.push('本レポートの分析結果に基づき、以下を提言する：');
    lines.push('');
    
    // セクションから提言を生成
    let recNum = 1;
    for (const section of sections) {
      if (section.content.length > 50) {
        lines.push(`${recNum}. ${section.heading}に関する継続的なモニタリングを推奨`);
        recNum++;
        if (recNum > 3) break;
      }
    }
    
    return lines.join('\n');
  }

  /**
   * エンティティタイプを日本語に変換
   */
  private formatEntityType(type: string): string {
    const typeMap: Record<string, string> = {
      organization: '組織・企業',
      person: '人物',
      location: '場所',
      product: '製品・サービス',
      technology: '技術',
    };
    return typeMap[type.toLowerCase()] ?? type;
  }

  /**
   * 配列をキーでグループ化
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
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
