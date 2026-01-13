/**
 * ReportGenerator - レポート生成
 *
 * @requirement REQ-GEN-001
 * @design DES-KATASHIRO-001 §2.3 Generator Container
 * @task TSK-030
 */

import { ok, err, type Result, type Content, type Source } from '@nahisaho/katashiro-core';
import {
  DiagramGenerator,
  type TimelineData,
  type ExtendedGanttData,
  type QuadrantData,
  type MindmapData,
  type FlowchartData,
} from '../chart/index.js';

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
 * チャンク生成結果
 * @since 1.0.0
 */
export interface ChunkResult {
  /** チャンクのインデックス（0から開始） */
  readonly index: number;
  /** チャンクのタイプ */
  readonly type: 'header' | 'toc' | 'section' | 'entities' | 'conclusion' | 'sources' | 'footer';
  /** セクション名（typeが'section'の場合） */
  readonly sectionName?: string;
  /** 生成されたコンテンツ */
  readonly content: string;
  /** 全体の進捗（0.0-1.0） */
  readonly progress: number;
  /** これが最後のチャンクかどうか */
  readonly isLast: boolean;
}

/**
 * チャンク保存コールバック
 * @since 1.0.0
 */
export type ChunkCallback = (chunk: ChunkResult) => Promise<void> | void;

/**
 * チャンク生成オプション
 * @since 1.0.0
 */
export interface ChunkGeneratorOptions extends ExtendedReportOptions {
  /** 各チャンク生成時に呼ばれるコールバック */
  readonly onChunk?: ChunkCallback;
  /** チャンク間の遅延（ミリ秒） */
  readonly chunkDelayMs?: number;
}

/**
 * テーブルデータ
 * @since 1.1.0
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  alignment?: ('left' | 'center' | 'right')[];
}

/**
 * レポートダイアグラムヒント
 * @since 1.1.0
 */
export interface ReportDiagramHint {
  /** ダイアグラムタイプ */
  type: 'timeline' | 'gantt' | 'flowchart' | 'quadrant' | 'mindmap' | 'table';
  /** ダイアグラムデータ */
  data: TimelineData | ExtendedGanttData | FlowchartData | QuadrantData | MindmapData | TableData;
}

/**
 * 拡張レポートセクション
 * @since 1.1.0
 */
export interface ExtendedReportSection {
  /** 見出し */
  heading: string;
  /** コンテンツ */
  content: string;
  /** ダイアグラム（オプション） */
  diagram?: ReportDiagramHint;
  /** サブセクション */
  subsections?: ExtendedReportSection[];
}

/**
 * レポート生成実装
 */
export class ReportGenerator {
  /** DiagramGeneratorインスタンス（v1.1.0） */
  private readonly diagramGenerator: DiagramGenerator;

  constructor() {
    this.diagramGenerator = new DiagramGenerator();
  }

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
   * チャンク化されたレポート生成
   * 
   * 大きなレポートを小さなチャンクに分割して順次生成し、
   * 各チャンクが生成されるたびにコールバックを呼び出します。
   * これにより、応答長制限を回避しながらレポートを生成できます。
   * 
   * @param options チャンク生成オプション
   * @returns 全チャンクを結合した完全なレポート
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const generator = new ReportGenerator();
   * const fullReport = await generator.generateInChunks({
   *   title: 'AI動向レポート',
   *   sections: [...],
   *   onChunk: async (chunk) => {
   *     await fs.appendFile('report.md', chunk.content);
   *     console.log(`進捗: ${(chunk.progress * 100).toFixed(0)}%`);
   *   }
   * });
   * ```
   */
  async generateInChunks(options: ChunkGeneratorOptions): Promise<string> {
    const format = options.format ?? 'markdown';
    const sections = options.sections ?? [];
    const allChunks: string[] = [];
    let chunkIndex = 0;

    // チャンク総数を計算（動的に変わる可能性があるため概算）
    let totalChunks = 1; // header
    if (options.includeToc !== false && sections.length > 0) totalChunks++;
    if (options.includeExecutiveSummary && sections.length > 0) totalChunks++;
    if (options.data?.metrics && options.data.metrics.length > 0) totalChunks++;
    totalChunks += sections.length; // 各セクション
    if (options.data?.entities && options.data.entities.length > 0) totalChunks++;
    if (options.includeConclusion && sections.length > 0) totalChunks++;
    if (options.data?.sources && options.data.sources.length > 0) totalChunks++;
    totalChunks++; // footer

    const emitChunk = async (
      type: ChunkResult['type'],
      content: string,
      sectionName?: string
    ): Promise<void> => {
      const chunk: ChunkResult = {
        index: chunkIndex,
        type,
        sectionName,
        content,
        progress: (chunkIndex + 1) / totalChunks,
        isLast: chunkIndex === totalChunks - 1,
      };
      allChunks.push(content);
      
      if (options.onChunk) {
        await options.onChunk(chunk);
      }
      
      if (options.chunkDelayMs && options.chunkDelayMs > 0) {
        await this.delay(options.chunkDelayMs);
      }
      
      chunkIndex++;
    };

    if (format === 'markdown') {
      // ===== ヘッダー（タイトル + メタデータ） =====
      const headerLines: string[] = [];
      headerLines.push(`# ${options.title}`);
      headerLines.push('');
      
      if (options.metadata) {
        headerLines.push('| 項目 | 内容 |');
        headerLines.push('|------|------|');
        if (options.metadata.author) {
          headerLines.push(`| 作成者 | ${options.metadata.author} |`);
        }
        if (options.metadata.date) {
          headerLines.push(`| 作成日 | ${options.metadata.date} |`);
        }
        if (options.metadata.version) {
          headerLines.push(`| バージョン | ${options.metadata.version} |`);
        }
        if (options.metadata.department) {
          headerLines.push(`| 部署 | ${options.metadata.department} |`);
        }
        if (options.metadata.confidentiality) {
          const confLabel = { public: '公開', internal: '社内限定', confidential: '機密' }[options.metadata.confidentiality];
          headerLines.push(`| 機密レベル | ${confLabel} |`);
        }
        headerLines.push('');
      }
      await emitChunk('header', headerLines.join('\n'));

      // ===== 目次 =====
      if (options.includeToc !== false && sections.length > 0) {
        const tocLines: string[] = [];
        tocLines.push('## 目次');
        tocLines.push('');
        sections.forEach((s, i) => {
          tocLines.push(`${i + 1}. [${s.heading}](#${this.slugify(s.heading)})`);
        });
        tocLines.push('');
        await emitChunk('toc', tocLines.join('\n'));
      }

      // ===== エグゼクティブサマリー =====
      if (options.includeExecutiveSummary && sections.length > 0) {
        const summaryLines: string[] = [];
        summaryLines.push('## エグゼクティブサマリー');
        summaryLines.push('');
        const summary = this.generateExecutiveSummary(sections, options.data);
        summaryLines.push(summary);
        summaryLines.push('');
        await emitChunk('section', summaryLines.join('\n'), 'エグゼクティブサマリー');
      }

      // ===== メトリクステーブル =====
      if (options.data?.metrics && options.data.metrics.length > 0) {
        const metricsLines: string[] = [];
        metricsLines.push('## 主要指標');
        metricsLines.push('');
        metricsLines.push('| 指標 | 値 | 変化 |');
        metricsLines.push('|------|-----|------|');
        for (const metric of options.data.metrics) {
          metricsLines.push(`| ${metric.label} | ${metric.value} | ${metric.change ?? '-'} |`);
        }
        metricsLines.push('');
        await emitChunk('section', metricsLines.join('\n'), '主要指標');
      }

      // ===== 各セクション（個別にチャンク化） =====
      for (const section of sections) {
        const sectionLines: string[] = [];
        sectionLines.push(`## ${section.heading}`);
        sectionLines.push('');
        sectionLines.push(section.content);
        sectionLines.push('');
        
        if (section.subsections) {
          for (const sub of section.subsections) {
            sectionLines.push(`### ${sub.heading}`);
            sectionLines.push('');
            sectionLines.push(sub.content);
            sectionLines.push('');
          }
        }
        await emitChunk('section', sectionLines.join('\n'), section.heading);
      }

      // ===== エンティティリスト =====
      if (options.data?.entities && options.data.entities.length > 0) {
        const entityLines: string[] = [];
        entityLines.push('## 関連エンティティ');
        entityLines.push('');
        const byType = this.groupBy(options.data.entities, 'type');
        for (const [type, entities] of Object.entries(byType)) {
          entityLines.push(`### ${this.formatEntityType(type)}`);
          entityLines.push('');
          for (const e of entities) {
            entityLines.push(`- ${e.name}`);
          }
          entityLines.push('');
        }
        await emitChunk('entities', entityLines.join('\n'));
      }

      // ===== 結論 =====
      if (options.includeConclusion && sections.length > 0) {
        const conclusionLines: string[] = [];
        conclusionLines.push('## 結論・提言');
        conclusionLines.push('');
        const conclusion = this.generateConclusion(sections, options.data);
        conclusionLines.push(conclusion);
        conclusionLines.push('');
        await emitChunk('conclusion', conclusionLines.join('\n'));
      }

      // ===== 参考文献 =====
      if (options.data?.sources && options.data.sources.length > 0) {
        const sourceLines: string[] = [];
        sourceLines.push('## 参考文献');
        sourceLines.push('');
        for (const source of options.data.sources) {
          sourceLines.push(`- [${source.title}](${source.url})`);
        }
        sourceLines.push('');
        await emitChunk('sources', sourceLines.join('\n'));
      }

      // ===== フッター =====
      const footerLines: string[] = [];
      footerLines.push('---');
      footerLines.push(`*このレポートはKATASHIROにより自動生成されました (${new Date().toISOString().split('T')[0]})*`);
      await emitChunk('footer', footerLines.join('\n'));

    } else {
      // HTML形式（チャンク化版）
      await emitChunk('header', `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${options.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
</head><body>
<h1>${options.title}</h1>`);

      for (const section of sections) {
        await emitChunk('section', `<h2>${section.heading}</h2>
<p>${section.content}</p>`, section.heading);
      }

      await emitChunk('footer', '</body></html>');
    }

    return allChunks.join('\n');
  }

  /**
   * AsyncGenerator版のチャンク生成
   * 
   * for-await-ofで逐次処理する場合に使用します。
   * 
   * @param options 生成オプション
   * @yields 各チャンクの結果
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const generator = new ReportGenerator();
   * for await (const chunk of generator.generateChunks(options)) {
   *   await fs.appendFile('report.md', chunk.content);
   *   console.log(`セクション: ${chunk.sectionName ?? chunk.type}`);
   * }
   * ```
   */
  async *generateChunks(options: ExtendedReportOptions): AsyncGenerator<ChunkResult, void, unknown> {
    const format = options.format ?? 'markdown';
    const sections = options.sections ?? [];
    let chunkIndex = 0;

    // チャンク総数を計算
    let totalChunks = 1;
    if (options.includeToc !== false && sections.length > 0) totalChunks++;
    if (options.includeExecutiveSummary && sections.length > 0) totalChunks++;
    if (options.data?.metrics && options.data.metrics.length > 0) totalChunks++;
    totalChunks += sections.length;
    if (options.data?.entities && options.data.entities.length > 0) totalChunks++;
    if (options.includeConclusion && sections.length > 0) totalChunks++;
    if (options.data?.sources && options.data.sources.length > 0) totalChunks++;
    totalChunks++;

    const createChunk = (
      type: ChunkResult['type'],
      content: string,
      sectionName?: string
    ): ChunkResult => {
      const chunk: ChunkResult = {
        index: chunkIndex,
        type,
        sectionName,
        content,
        progress: (chunkIndex + 1) / totalChunks,
        isLast: chunkIndex === totalChunks - 1,
      };
      chunkIndex++;
      return chunk;
    };

    if (format === 'markdown') {
      // ヘッダー
      const headerLines: string[] = [`# ${options.title}`, ''];
      if (options.metadata) {
        headerLines.push('| 項目 | 内容 |');
        headerLines.push('|------|------|');
        if (options.metadata.author) headerLines.push(`| 作成者 | ${options.metadata.author} |`);
        if (options.metadata.date) headerLines.push(`| 作成日 | ${options.metadata.date} |`);
        if (options.metadata.version) headerLines.push(`| バージョン | ${options.metadata.version} |`);
        if (options.metadata.department) headerLines.push(`| 部署 | ${options.metadata.department} |`);
        if (options.metadata.confidentiality) {
          const confLabel = { public: '公開', internal: '社内限定', confidential: '機密' }[options.metadata.confidentiality];
          headerLines.push(`| 機密レベル | ${confLabel} |`);
        }
        headerLines.push('');
      }
      yield createChunk('header', headerLines.join('\n'));

      // 目次
      if (options.includeToc !== false && sections.length > 0) {
        const tocLines = ['## 目次', ''];
        sections.forEach((s, i) => tocLines.push(`${i + 1}. [${s.heading}](#${this.slugify(s.heading)})`));
        tocLines.push('');
        yield createChunk('toc', tocLines.join('\n'));
      }

      // エグゼクティブサマリー
      if (options.includeExecutiveSummary && sections.length > 0) {
        yield createChunk('section', ['## エグゼクティブサマリー', '', this.generateExecutiveSummary(sections, options.data), ''].join('\n'), 'エグゼクティブサマリー');
      }

      // メトリクス
      if (options.data?.metrics && options.data.metrics.length > 0) {
        const metricsLines = ['## 主要指標', '', '| 指標 | 値 | 変化 |', '|------|-----|------|'];
        for (const m of options.data.metrics) metricsLines.push(`| ${m.label} | ${m.value} | ${m.change ?? '-'} |`);
        metricsLines.push('');
        yield createChunk('section', metricsLines.join('\n'), '主要指標');
      }

      // 各セクション
      for (const section of sections) {
        const lines = [`## ${section.heading}`, '', section.content, ''];
        if (section.subsections) {
          for (const sub of section.subsections) {
            lines.push(`### ${sub.heading}`, '', sub.content, '');
          }
        }
        yield createChunk('section', lines.join('\n'), section.heading);
      }

      // エンティティ
      if (options.data?.entities && options.data.entities.length > 0) {
        const entityLines = ['## 関連エンティティ', ''];
        const byType = this.groupBy(options.data.entities, 'type');
        for (const [type, entities] of Object.entries(byType)) {
          entityLines.push(`### ${this.formatEntityType(type)}`, '');
          for (const e of entities) entityLines.push(`- ${e.name}`);
          entityLines.push('');
        }
        yield createChunk('entities', entityLines.join('\n'));
      }

      // 結論
      if (options.includeConclusion && sections.length > 0) {
        yield createChunk('conclusion', ['## 結論・提言', '', this.generateConclusion(sections, options.data), ''].join('\n'));
      }

      // 参考文献
      if (options.data?.sources && options.data.sources.length > 0) {
        const sourceLines = ['## 参考文献', ''];
        for (const s of options.data.sources) sourceLines.push(`- [${s.title}](${s.url})`);
        sourceLines.push('');
        yield createChunk('sources', sourceLines.join('\n'));
      }

      // フッター
      yield createChunk('footer', ['---', `*このレポートはKATASHIROにより自動生成されました (${new Date().toISOString().split('T')[0]})*`].join('\n'));
    } else {
      // HTML
      yield createChunk('header', `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${options.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
</head><body>
<h1>${options.title}</h1>`);
      for (const section of sections) {
        yield createChunk('section', `<h2>${section.heading}</h2>\n<p>${section.content}</p>`, section.heading);
      }
      yield createChunk('footer', '</body></html>');
    }
  }

  /**
   * 遅延ヘルパー
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  // ========================================
  // v1.1.0 ダイアグラム統合機能
  // ========================================

  /**
   * セクションを拡張レポートセクションとしてレンダリング
   * @requirement REQ-1.1.0-RPT-001
   * @param section 拡張セクション
   * @param level 見出しレベル（1-6）
   * @returns Markdown文字列
   * @since 1.1.0
   */
  renderExtendedSection(section: ExtendedReportSection, level: number = 2): string {
    const lines: string[] = [];

    // 見出し
    const headingPrefix = '#'.repeat(Math.min(level, 6));
    lines.push(`${headingPrefix} ${section.heading}`);
    lines.push('');

    // コンテンツ（ダイアグラムヒント処理）
    const processedContent = this.processDiagramHints(section.content);
    lines.push(processedContent);
    lines.push('');

    // ダイアグラム埋め込み
    if (section.diagram) {
      const diagramMarkdown = this.renderDiagram(section.diagram);
      if (diagramMarkdown) {
        lines.push(diagramMarkdown);
        lines.push('');
      }
    }

    // サブセクション
    if (section.subsections) {
      for (const sub of section.subsections) {
        lines.push(this.renderExtendedSection(sub, level + 1));
      }
    }

    return lines.join('\n');
  }

  /**
   * ダイアグラムヒントをMermaid/Markdownに変換
   * @requirement REQ-1.1.0-RPT-001
   * @param hint ダイアグラムヒント
   * @returns Markdown文字列（失敗時は空文字）
   * @since 1.1.0
   */
  private renderDiagram(hint: ReportDiagramHint): string {
    try {
      switch (hint.type) {
        case 'timeline':
          const timelineCode = this.diagramGenerator.generateMermaidTimeline(hint.data as TimelineData);
          return timelineCode ? this.wrapMermaid(timelineCode) : '';

        case 'gantt':
          const ganttCode = this.diagramGenerator.generateMermaidGantt(hint.data as ExtendedGanttData);
          return ganttCode ? this.wrapMermaid(ganttCode) : '';

        case 'quadrant':
          const quadrantCode = this.diagramGenerator.generateMermaidQuadrant(hint.data as QuadrantData);
          return quadrantCode ? this.wrapMermaid(quadrantCode) : '';

        case 'mindmap':
          const mindmapCode = this.diagramGenerator.generateMermaidMindmap(hint.data as MindmapData);
          return mindmapCode ? this.wrapMermaid(mindmapCode) : '';

        case 'flowchart':
          const flowchartCode = this.diagramGenerator.generateMermaidFlowchart(hint.data as FlowchartData);
          return flowchartCode ? this.wrapMermaid(flowchartCode) : '';

        case 'table':
          const tableData = hint.data as TableData;
          return this.diagramGenerator.generateMarkdownTable(
            tableData.headers,
            tableData.rows,
            { alignment: tableData.alignment }
          );

        default:
          console.warn(`[ReportGenerator] Unknown diagram type: ${(hint as ReportDiagramHint).type}`);
          return '';
      }
    } catch (error) {
      console.error(`[ReportGenerator] Diagram rendering failed:`, error);
      return '';
    }
  }

  /**
   * Mermaidコードをコードブロックでラップ
   * @param code Mermaidコード
   * @returns Markdownコードブロック
   * @since 1.1.0
   */
  private wrapMermaid(code: string): string {
    return '```mermaid\n' + code + '\n```';
  }

  /**
   * コンテンツ内のダイアグラムヒントコメントを処理
   * @requirement REQ-1.1.0-RPT-002
   * @param content セクションコンテンツ
   * @returns 処理後のコンテンツ
   * @since 1.1.0
   */
  private processDiagramHints(content: string): string {
    const hintPattern = /<!--\s*diagram:(\w+)\s*-->/gi;

    return content.replace(hintPattern, (match, type) => {
      try {
        const diagramData = this.extractDiagramData(content, type, match);
        if (!diagramData) {
          return match; // 抽出失敗時は元のコメントを残す
        }

        let result = '';

        switch (type.toLowerCase()) {
          case 'timeline':
            result = this.diagramGenerator.generateMermaidTimeline(diagramData as TimelineData);
            break;
          case 'gantt':
            result = this.diagramGenerator.generateMermaidGantt(diagramData as ExtendedGanttData);
            break;
          case 'quadrant':
            result = this.diagramGenerator.generateMermaidQuadrant(diagramData as QuadrantData);
            break;
          case 'mindmap':
            result = this.diagramGenerator.generateMermaidMindmap(diagramData as MindmapData);
            break;
          case 'flowchart':
            result = this.diagramGenerator.generateMermaidFlowchart(diagramData as unknown as FlowchartData);
            break;
          default:
            return match;
        }

        return result ? this.wrapMermaid(result) : match;
      } catch (error) {
        console.warn(`[ReportGenerator] Failed to process diagram hint: ${error}`);
        return match;
      }
    });
  }

  /**
   * コンテンツからダイアグラムデータを抽出
   * @requirement REQ-1.1.0-RPT-002
   * @param content セクションコンテンツ全体
   * @param type ダイアグラムタイプ
   * @param match マッチしたコメント文字列
   * @returns 抽出されたデータまたはnull
   * @since 1.1.0
   */
  private extractDiagramData(
    content: string,
    type: string,
    match: string
  ): TimelineData | ExtendedGanttData | QuadrantData | MindmapData | FlowchartData | null {
    const matchIndex = content.indexOf(match);
    // コメントの前後500文字を解析対象とする
    const contextStart = Math.max(0, matchIndex - 500);
    const contextEnd = Math.min(content.length, matchIndex + match.length + 500);
    const context = content.slice(contextStart, contextEnd);

    switch (type.toLowerCase()) {
      case 'timeline':
        return this.extractTimelineData(context);
      case 'gantt':
        return this.extractGanttData(context);
      case 'quadrant':
        return this.extractQuadrantData(context);
      case 'mindmap':
        return this.extractMindmapData(context);
      case 'flowchart':
        return this.extractFlowchartData(context);
      default:
        return null;
    }
  }

  /**
   * タイムラインデータを抽出
   * @param context コンテキストテキスト
   * @returns TimelineData または null
   * @since 1.1.0
   */
  private extractTimelineData(context: string): TimelineData | null {
    // パターン: "YYYY年MM月DD日：イベント" or "YYYY-MM-DD: イベント"
    const datePattern = /(\d{4}[年\-\/]\d{1,2}[月\-\/]?\d{0,2}日?)[：:\s]+([^\n]+)/g;
    const events: Array<{ period: string; title: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = datePattern.exec(context)) !== null) {
      const period = match[1];
      const title = match[2];
      if (period && title) {
        events.push({
          period,
          title: title.trim(),
        });
      }
    }

    if (events.length === 0) return null;
    return { events };
  }

  /**
   * ガントデータを抽出
   * @param context コンテキストテキスト
   * @returns ExtendedGanttData または null
   * @since 1.1.0
   */
  private extractGanttData(context: string): ExtendedGanttData | null {
    // パターン: "- タスク名（YYYY-MM-DD 〜 YYYY-MM-DD）" or "- タスク名: 7日間"
    const taskPattern = /[-*]\s*([^（(\n]+)[（(]([^）)]+)[）)]/g;
    const tasks: Array<{
      id: string;
      name: string;
      start: string;
      duration?: string;
      end?: string;
    }> = [];
    let match: RegExpExecArray | null;
    let id = 1;

    while ((match = taskPattern.exec(context)) !== null) {
      const nameMatch = match[1];
      const dateInfo = match[2];
      if (!nameMatch || !dateInfo) continue;

      const name = nameMatch.trim();
      const dateRange = dateInfo.match(/(\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}日?)\s*[〜~\-]\s*(\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}日?)/);
      const durationMatch = dateInfo.match(/(\d+)\s*[日週月]/);

      if (dateRange && dateRange[1] && dateRange[2]) {
        tasks.push({
          id: `task${id++}`,
          name,
          start: dateRange[1],
          end: dateRange[2],
        });
      } else if (durationMatch && durationMatch[1]) {
        tasks.push({
          id: `task${id++}`,
          name,
          start: 'after prev',
          duration: `${durationMatch[1]}d`,
        });
      }
    }

    if (tasks.length === 0) return null;
    return { tasks };
  }

  /**
   * 四象限データを抽出
   * @param context コンテキストテキスト
   * @returns QuadrantData または null
   * @since 1.1.0
   */
  private extractQuadrantData(context: string): QuadrantData | null {
    // パターン: "項目名（優先度/重要度）" または "項目名: 高/低"
    const itemPattern = /[-*]\s*([^（(\n:]+)[：:（(]\s*(?:優先度|重要度|影響度|確率)?[：:]?\s*(高|中|低|high|medium|low)\s*[,、]\s*(?:緊急度|実現性)?[：:]?\s*(高|中|低|high|medium|low)/gi;
    const items: Array<{ label: string; x: number; y: number }> = [];
    let match: RegExpExecArray | null;

    const valueMap: Record<string, number> = {
      高: 0.8,
      中: 0.5,
      低: 0.2,
      high: 0.8,
      medium: 0.5,
      low: 0.2,
    };

    while ((match = itemPattern.exec(context)) !== null) {
      const label = match[1];
      const xVal = match[2];
      const yVal = match[3];
      if (label && xVal && yVal) {
        items.push({
          label: label.trim(),
          x: valueMap[xVal.toLowerCase()] ?? 0.5,
          y: valueMap[yVal.toLowerCase()] ?? 0.5,
        });
      }
    }

    if (items.length === 0) return null;
    return { items };
  }

  /**
   * マインドマップデータを抽出
   * @param context コンテキストテキスト
   * @returns MindmapData または null
   * @since 1.1.0
   */
  private extractMindmapData(context: string): MindmapData | null {
    // インデントリストからツリー構造を構築
    const lines = context.split('\n').filter((l) => /^\s*[-*]\s+/.test(l));
    if (lines.length === 0) return null;

    const buildTree = (items: string[], index: number, _baseIndent: number): { node: { label: string; children?: Array<{ label: string; children?: unknown[] }> }; nextIndex: number } => {
      const currentLine = items[index] ?? '';
      const indent = currentLine.match(/^\s*/)?.[0].length ?? 0;
      const label = currentLine.replace(/^\s*[-*]\s+/, '').trim();
      const node: { label: string; children?: Array<{ label: string; children?: unknown[] }> } = { label };
      const children: Array<{ label: string; children?: unknown[] }> = [];
      let nextIndex = index + 1;

      while (nextIndex < items.length) {
        const nextLine = items[nextIndex] ?? '';
        const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
        if (nextIndent <= indent) break;
        const result = buildTree(items, nextIndex, nextIndent);
        children.push(result.node);
        nextIndex = result.nextIndex;
      }

      if (children.length > 0) node.children = children;
      return { node, nextIndex };
    };

    try {
      const result = buildTree(lines, 0, 0);
      return { root: result.node as MindmapData['root'] };
    } catch {
      return null;
    }
  }

  /**
   * フローチャートデータを抽出
   * @param context コンテキストテキスト
   * @returns FlowchartData または null
   * @since 1.1.0
   */
  private extractFlowchartData(context: string): FlowchartData | null {
    // パターン: "A → B" または "1. ステップ → 2. ステップ"
    const arrowPattern = /([^→\n]+)\s*→\s*([^→\n]+)/g;
    const nodes: Map<string, { id: string; label: string }> = new Map();
    const edges: Array<{ from: string; to: string }> = [];
    let match: RegExpExecArray | null;

    const normalize = (text: string): string => {
      return text.trim().replace(/^\d+\.\s*/, '');
    };

    const getOrCreateNode = (label: string): string => {
      const normalized = normalize(label);
      if (!nodes.has(normalized)) {
        nodes.set(normalized, {
          id: `node${nodes.size + 1}`,
          label: normalized,
        });
      }
      return nodes.get(normalized)!.id;
    };

    while ((match = arrowPattern.exec(context)) !== null) {
      const from = match[1];
      const to = match[2];
      if (from && to) {
        const fromId = getOrCreateNode(from);
        const toId = getOrCreateNode(to);
        edges.push({ from: fromId, to: toId });
      }
    }

    if (nodes.size === 0) return null;
    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }
}
