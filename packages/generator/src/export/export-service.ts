/**
 * ExportService - Multi-format content export
 *
 * Exports content to various formats (Markdown, HTML, JSON, Text)
 *
 * @module @nahisaho/katashiro-generator
 * @task TSK-035
 */

import { ok, err, type Result, type Content } from '@nahisaho/katashiro-core';

/**
 * Supported export formats
 */
export type ExportFormat = 'markdown' | 'html' | 'json' | 'text';

/**
 * Export options
 */
export interface ExportOptions {
  /** Include metadata in export */
  includeMetadata?: boolean;
  /** Include sources/citations */
  includeSources?: boolean;
  /** Custom template for export */
  template?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export format */
  format: ExportFormat;
  /** Exported content */
  content: string;
  /** MIME type */
  mimeType: string;
  /** Suggested filename */
  filename: string;
}

/**
 * MIME types for each format
 */
const MIME_TYPES: Record<ExportFormat, string> = {
  markdown: 'text/markdown',
  html: 'text/html',
  json: 'application/json',
  text: 'text/plain',
};

/**
 * File extensions for each format
 */
const EXTENSIONS: Record<ExportFormat, string> = {
  markdown: '.md',
  html: '.html',
  json: '.json',
  text: '.txt',
};

/**
 * ExportService
 *
 * Provides multi-format export capabilities for content
 */
export class ExportService {
  /**
   * Export content to specified format
   *
   * @param content - Content to export
   * @param format - Target format
   * @param options - Export options
   * @returns Export result
   */
  async export(
    content: Content,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<Result<ExportResult, Error>> {
    try {
      let exportedContent: string;

      switch (format) {
        case 'markdown':
          exportedContent = this.exportToMarkdown(content, options);
          break;
        case 'html':
          exportedContent = this.exportToHtml(content, options);
          break;
        case 'json':
          exportedContent = this.exportToJson(content, options);
          break;
        case 'text':
          exportedContent = this.exportToText(content, options);
          break;
        default:
          return err(new Error(`Unsupported format: ${format}`));
      }

      return ok({
        format,
        content: exportedContent,
        mimeType: MIME_TYPES[format],
        filename: this.getFilename(content, format),
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(content: Content, options: ExportOptions): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${content.title}`);
    lines.push('');

    // Metadata
    if (options.includeMetadata) {
      lines.push('---');
      lines.push(`作成日: ${content.createdAt}`);
      lines.push(`更新日: ${content.updatedAt}`);
      lines.push('---');
      lines.push('');
    }

    // Body
    lines.push(content.body);

    // Sources
    if (options.includeSources && content.sources.length > 0) {
      lines.push('');
      lines.push('## 参考文献');
      lines.push('');
      content.sources.forEach((source, index) => {
        const title = source.metadata?.title ?? source.url;
        lines.push(`${index + 1}. [${title}](${source.url})`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export to HTML format
   */
  private exportToHtml(content: Content, options: ExportOptions): string {
    const bodyHtml = this.markdownToHtml(content.body);

    let metadataHtml = '';
    if (options.includeMetadata) {
      metadataHtml = `
    <div class="metadata">
      <p>作成日: ${content.createdAt}</p>
      <p>更新日: ${content.updatedAt}</p>
    </div>`;
    }

    let sourcesHtml = '';
    if (options.includeSources && content.sources.length > 0) {
      const sourceItems = content.sources
        .map((source) => {
          const title = source.metadata?.title ?? source.url;
          return `      <li><a href="${source.url}">${this.escapeHtml(title)}</a></li>`;
        })
        .join('\n');

      sourcesHtml = `
    <section class="sources">
      <h2>参考文献</h2>
      <ol>
${sourceItems}
      </ol>
    </section>`;
    }

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(content.title)}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    .metadata { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .sources { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <article>
    <h1>${this.escapeHtml(content.title)}</h1>${metadataHtml}
    <div class="content">
${bodyHtml}
    </div>${sourcesHtml}
  </article>
</body>
</html>`;
  }

  /**
   * Export to JSON format
   */
  private exportToJson(content: Content, options: ExportOptions): string {
    const data: Record<string, unknown> = {
      title: content.title,
      body: content.body,
      type: content.type,
    };

    if (options.includeMetadata) {
      data.createdAt = content.createdAt;
      data.updatedAt = content.updatedAt;
      data.id = content.id;
    }

    if (options.includeSources) {
      data.sources = content.sources;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export to plain text format
   */
  private exportToText(content: Content, options: ExportOptions): string {
    const lines: string[] = [];

    // Title
    lines.push(content.title);
    lines.push('='.repeat(content.title.length));
    lines.push('');

    // Metadata
    if (options.includeMetadata) {
      lines.push(`作成日: ${content.createdAt}`);
      lines.push(`更新日: ${content.updatedAt}`);
      lines.push('');
    }

    // Body (strip markdown)
    lines.push(this.stripMarkdown(content.body));

    // Sources
    if (options.includeSources && content.sources.length > 0) {
      lines.push('');
      lines.push('参考文献');
      lines.push('-'.repeat(8));
      content.sources.forEach((source, index) => {
        const title = source.metadata?.title ?? source.url;
        lines.push(`${index + 1}. ${title}: ${source.url}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get suggested filename for content
   *
   * @param content - Content
   * @param format - Export format
   * @returns Suggested filename
   */
  getFilename(content: Content, format: ExportFormat): string {
    const safeTitle = content.title
      .replace(/[<>:"/\\|?*]/g, '_')
      .substring(0, 50)
      .trim();

    return `${safeTitle}${EXTENSIONS[format]}`;
  }

  /**
   * Get list of supported export formats
   *
   * @returns Array of supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return ['markdown', 'html', 'json', 'text'];
  }

  /**
   * Convert basic Markdown to HTML
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .split('\n\n')
      .map((paragraph) => {
        // Headers
        if (paragraph.startsWith('# ')) {
          return `      <h1>${this.escapeHtml(paragraph.slice(2))}</h1>`;
        }
        if (paragraph.startsWith('## ')) {
          return `      <h2>${this.escapeHtml(paragraph.slice(3))}</h2>`;
        }
        if (paragraph.startsWith('### ')) {
          return `      <h3>${this.escapeHtml(paragraph.slice(4))}</h3>`;
        }

        // Lists
        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
          const items = paragraph
            .split('\n')
            .map((line) => `        <li>${this.escapeHtml(line.slice(2))}</li>`)
            .join('\n');
          return `      <ul>\n${items}\n      </ul>`;
        }

        // Regular paragraph
        return `      <p>${this.escapeHtml(paragraph)}</p>`;
      })
      .join('\n');
  }

  /**
   * Escape HTML special characters
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
   * Strip Markdown formatting from text
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      .replace(/^#+\s*/gm, '') // Headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      .replace(/^[-*]\s*/gm, '• '); // Lists
  }
}
