/**
 * DiagramGenerator
 * Mermaidダイアグラムの生成
 * REQ-MEDIA-002-002: ダイアグラム生成
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type {
  DiagramOptions,
  DiagramOutput,
  DiagramType,
  OutputFormat,
} from './types.js';
import { ChartGeneratorError, CHART_ERROR_CODES } from './types.js';
import {
  MermaidBuilder,
  type FlowchartData,
  type SequenceData,
  type ClassDiagramData,
  type GanttData,
} from './MermaidBuilder.js';

/**
 * ダイアグラムジェネレータークラス
 * Mermaidを使用して各種ダイアグラムを生成
 */
export class DiagramGenerator {
  private readonly mermaidBuilder: MermaidBuilder;
  private readonly defaultWidth: number;
  private readonly defaultHeight: number;

  constructor(options?: { defaultWidth?: number; defaultHeight?: number }) {
    this.mermaidBuilder = new MermaidBuilder();
    this.defaultWidth = options?.defaultWidth ?? 800;
    this.defaultHeight = options?.defaultHeight ?? 600;
  }

  /**
   * Mermaid定義からダイアグラムを生成
   * @param definition Mermaid定義文字列
   * @param options オプション
   * @returns 生成結果
   */
  async generate(
    definition: string,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!definition || typeof definition !== 'string') {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DIAGRAM,
          'Mermaid definition must be a non-empty string'
        );
      }

      const diagramType = this.mermaidBuilder.parseDiagramType(definition);
      const theme = options?.theme ?? 'default';
      const themedDefinition = this.mermaidBuilder.wrapWithTheme(definition, theme);

      // SVGに変換
      const svg = await this.renderMermaid(themedDefinition);

      const output: DiagramOutput = {
        format: options?.type === 'pie' ? 'svg' : 'svg', // 後でPNG対応
        content: svg,
        width: options?.width ?? this.defaultWidth,
        height: options?.height ?? this.defaultHeight,
        metadata: {
          type: diagramType,
          generatedAt: new Date(),
          library: 'mermaid',
          title: options?.title,
        },
      };

      return ok(output);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * フローチャートを生成
   */
  async generateFlowchart(
    data: FlowchartData,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      this.validateFlowchartData(data);
      const definition = this.mermaidBuilder.buildFlowchart(data, options);
      return this.generate(definition, { ...options, type: 'flowchart' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * シーケンス図を生成
   */
  async generateSequenceDiagram(
    data: SequenceData,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      this.validateSequenceData(data);
      const definition = this.mermaidBuilder.buildSequenceDiagram(data, options);
      return this.generate(definition, { ...options, type: 'sequence' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * クラス図を生成
   */
  async generateClassDiagram(
    data: ClassDiagramData,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      this.validateClassDiagramData(data);
      const definition = this.mermaidBuilder.buildClassDiagram(data, options);
      return this.generate(definition, { ...options, type: 'class' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * 状態図を生成
   */
  async generateStateDiagram(
    states: Array<{
      id: string;
      label?: string;
      type?: 'start' | 'end' | 'choice' | 'fork' | 'join';
    }>,
    transitions: Array<{ from: string; to: string; label?: string }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!states || states.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'State diagram must have at least one state'
        );
      }

      const definition = this.mermaidBuilder.buildStateDiagram(
        states,
        transitions,
        options
      );
      return this.generate(definition, { ...options, type: 'state' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * ER図を生成
   */
  async generateErDiagram(
    entities: Array<{
      name: string;
      attributes: Array<{ name: string; type: string; key?: 'PK' | 'FK' | 'UK' }>;
    }>,
    relationships: Array<{
      from: string;
      to: string;
      relation: string;
      fromCardinality: '|o' | '||' | '}o' | '}|';
      toCardinality: 'o|' | '||' | 'o{' | '|{';
    }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!entities || entities.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'ER diagram must have at least one entity'
        );
      }

      const definition = this.mermaidBuilder.buildErDiagram(
        entities,
        relationships,
        options
      );
      return this.generate(definition, { ...options, type: 'er' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * ガントチャートを生成
   */
  async generateGanttChart(
    data: GanttData,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!data.tasks || data.tasks.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Gantt chart must have at least one task'
        );
      }

      const definition = this.mermaidBuilder.buildGanttChart(data, options);
      return this.generate(definition, { ...options, type: 'gantt' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * パイチャート（Mermaid版）を生成
   */
  async generatePieChart(
    data: Array<{ label: string; value: number }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!data || data.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Pie chart must have at least one data point'
        );
      }

      const definition = this.mermaidBuilder.buildPieChart(data, options);
      return this.generate(definition, { ...options, type: 'pie' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * マインドマップを生成
   */
  async generateMindmap(
    root: string,
    children: Array<{
      text: string;
      children?: Array<{ text: string; children?: Array<{ text: string }> }>;
    }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!root) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Mindmap must have a root node'
        );
      }

      const definition = this.mermaidBuilder.buildMindmap(root, children, options);
      return this.generate(definition, { ...options, type: 'mindmap' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * タイムラインを生成
   */
  async generateTimeline(
    title: string,
    sections: Array<{ period: string; events: string[] }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!sections || sections.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Timeline must have at least one section'
        );
      }

      const definition = this.mermaidBuilder.buildTimeline(title, sections, options);
      return this.generate(definition, { ...options, type: 'timeline' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * Gitグラフを生成
   */
  async generateGitGraph(
    commits: Array<{
      id?: string;
      type: 'commit' | 'branch' | 'checkout' | 'merge';
      message?: string;
      tag?: string;
      branch?: string;
    }>,
    options?: DiagramOptions
  ): Promise<Result<DiagramOutput, Error>> {
    try {
      if (!commits || commits.length === 0) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Git graph must have at least one commit'
        );
      }

      const definition = this.mermaidBuilder.buildGitGraph(commits, options);
      return this.generate(definition, { ...options, type: 'gitgraph' });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * ダイアグラムタイプを判定
   */
  detectDiagramType(definition: string): DiagramType {
    return this.mermaidBuilder.parseDiagramType(definition);
  }

  /**
   * Mermaid定義を検証
   */
  validateDefinition(definition: string): { valid: boolean; error?: string } {
    if (!definition || typeof definition !== 'string') {
      return { valid: false, error: 'Definition must be a non-empty string' };
    }

    const trimmed = definition.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Definition cannot be empty' };
    }

    // 基本的なMermaid構文チェック
    const firstLine = trimmed.split('\n')[0]?.toLowerCase() ?? '';
    const validStarts = [
      'flowchart',
      'graph',
      'sequencediagram',
      'classDiagram',
      'stateDiagram',
      'erdiagram',
      'gantt',
      'pie',
      'mindmap',
      'timeline',
      'gitgraph',
      '%%{',
    ];

    const hasValidStart = validStarts.some(start =>
      firstLine.startsWith(start.toLowerCase())
    );

    if (!hasValidStart) {
      return {
        valid: false,
        error: `Unknown diagram type. Definition must start with one of: ${validStarts.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * MermaidをSVGにレンダリング
   */
  private async renderMermaid(definition: string): Promise<string> {
    // Mermaidのサーバーサイドレンダリング
    // 実際の実装では mermaid-cli や puppeteer を使用
    // ここではMermaid定義をSVGコンテナで包んで返す

    const escapedDefinition = definition
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // プレースホルダーSVG（実際の実装ではMermaidでレンダリング）
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.defaultWidth} ${this.defaultHeight}" width="${this.defaultWidth}" height="${this.defaultHeight}">
  <style>
    .mermaid-container { font-family: sans-serif; }
    .mermaid-definition { white-space: pre-wrap; font-size: 10px; fill: #666; }
  </style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g class="mermaid-container">
    <text x="20" y="30" font-size="14" font-weight="bold">Mermaid Diagram</text>
    <text x="20" y="60" class="mermaid-definition">${escapedDefinition}</text>
    <text x="20" y="${this.defaultHeight - 20}" font-size="10" fill="#999">Render with mermaid-cli for full visualization</text>
  </g>
</svg>`;

    return svg;
  }

  /**
   * フローチャートデータの検証
   */
  private validateFlowchartData(data: FlowchartData): void {
    if (!data.nodes || data.nodes.length === 0) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Flowchart must have at least one node'
      );
    }

    const nodeIds = new Set(data.nodes.map((n: { id: string }) => n.id));

    for (const edge of data.edges ?? []) {
      if (!nodeIds.has(edge.from)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Edge references unknown source node: ${edge.from}`
        );
      }
      if (!nodeIds.has(edge.to)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Edge references unknown target node: ${edge.to}`
        );
      }
    }
  }

  /**
   * シーケンス図データの検証
   */
  private validateSequenceData(data: SequenceData): void {
    if (!data.participants || data.participants.length === 0) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Sequence diagram must have at least one participant'
      );
    }

    const participantIds = new Set(data.participants.map((p: { id: string }) => p.id));

    for (const msg of data.messages ?? []) {
      if (!participantIds.has(msg.from)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Message references unknown sender: ${msg.from}`
        );
      }
      if (!participantIds.has(msg.to)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Message references unknown receiver: ${msg.to}`
        );
      }
    }
  }

  /**
   * クラス図データの検証
   */
  private validateClassDiagramData(data: ClassDiagramData): void {
    if (!data.classes || data.classes.length === 0) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Class diagram must have at least one class'
      );
    }

    const classNames = new Set(data.classes.map((c: { name: string }) => c.name));

    for (const rel of data.relations ?? []) {
      if (!classNames.has(rel.from)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Relation references unknown class: ${rel.from}`
        );
      }
      if (!classNames.has(rel.to)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Relation references unknown class: ${rel.to}`
        );
      }
    }
  }

  /**
   * PNGフォーマットへの変換（未実装）
   */
  async convertToPng(
    _diagramOutput: DiagramOutput,
    _format: OutputFormat
  ): Promise<Buffer> {
    // TODO: sharp等を使用したPNG変換
    throw new ChartGeneratorError(
      CHART_ERROR_CODES.UNSUPPORTED_FORMAT,
      'PNG export is not yet implemented'
    );
  }

  // ====================
  // Markdown/Mermaid表現（推奨）
  // ====================

  /**
   * Markdownテーブルを生成
   * @requirement REQ-EXT-VIS-004
   * @description 標準的なMarkdownテーブル形式で表を生成
   * @since 1.0.1
   */
  generateMarkdownTable(
    headers: string[],
    rows: string[][],
    options?: {
      alignment?: ('left' | 'center' | 'right')[];
    }
  ): string {
    if (!headers.length) return '';

    const alignmentRow = headers.map((_, i) => {
      const align = options?.alignment?.[i] ?? 'left';
      switch (align) {
        case 'right': return '---:';
        case 'center': return ':---:';
        default: return ':---';
      }
    });

    const lines: string[] = [];
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push('| ' + alignmentRow.join(' | ') + ' |');
    for (const row of rows) {
      const paddedRow = headers.map((_, i) => row[i] ?? '');
      lines.push('| ' + paddedRow.join(' | ') + ' |');
    }

    return lines.join('\n');
  }

  /**
   * Mermaidフローチャート文字列を生成
   * @requirement REQ-EXT-VIS-004
   * @description レポート埋め込み用のMermaidフローチャート定義を生成
   * @since 1.0.1
   */
  generateMermaidFlowchart(
    data: FlowchartData,
    options?: {
      direction?: 'TB' | 'TD' | 'BT' | 'LR' | 'RL';
    }
  ): string {
    // TD is an alias for TB in Mermaid
    const dir = options?.direction === 'TD' ? 'TB' : options?.direction;
    return this.mermaidBuilder.buildFlowchart(data, { direction: dir });
  }

  /**
   * Markdownツリー（インデント形式）を生成
   * @requirement REQ-EXT-VIS-004
   * @description インデントを使ったMarkdownリスト形式でツリーを生成
   * @since 1.0.1
   */
  generateMarkdownTree(
    root: { label: string; children?: unknown[] },
    _options?: { marker?: '-' | '*' | '+' }
  ): string {
    const marker = _options?.marker ?? '-';
    const lines: string[] = [];

    const renderNode = (
      node: { label: string; children?: unknown[] },
      indent: number
    ) => {
      const prefix = '  '.repeat(indent) + marker + ' ';
      lines.push(prefix + node.label);

      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          renderNode(child as { label: string; children?: unknown[] }, indent + 1);
        }
      }
    };

    lines.push(marker + ' ' + root.label);
    if (root.children && Array.isArray(root.children)) {
      for (const child of root.children) {
        renderNode(child as { label: string; children?: unknown[] }, 1);
      }
    }

    return lines.join('\n');
  }

  // ====================
  // ASCII高度化機能（非推奨）
  // ====================

  /**
   * Unicode罫線文字を使用した改善されたASCII図を生成
   * @requirement REQ-EXT-VIS-003
   * @description Unicode box-drawing文字と適切な配置でASCIIダイアグラムを生成
   * @since 1.0.0
   * @deprecated v1.0.1以降は generateMermaidFlowchart() を使用してください
   */
  generateAsciiFlowchart(
    data: FlowchartData,
    options?: {
      style?: 'simple' | 'rounded' | 'double' | 'heavy';
      width?: number;
    }
  ): string {
    const style = options?.style ?? 'simple';
    const boxChars = this.getBoxCharacters(style);
    const maxWidth = options?.width ?? 80;

    const lines: string[] = [];
    const nodePositions = new Map<string, { row: number; col: number }>();

    // ノードを行に配置（シンプルな縦並び）
    let currentRow = 0;
    for (const node of data.nodes) {
      nodePositions.set(node.id, { row: currentRow, col: 0 });
      currentRow += 4; // ノード間隔
    }

    // 各ノードを描画
    for (const node of data.nodes) {
      // nodePositionsは直前のループで設定済み
      const nodeLines = this.drawAsciiNode(node, boxChars, maxWidth);
      lines.push(...nodeLines);

      // エッジを検索して矢印を追加
      const outgoingEdges = data.edges.filter(e => e.from === node.id);
      if (outgoingEdges.length > 0) {
        const centerPadding = Math.floor((maxWidth - 3) / 2);
        lines.push(' '.repeat(centerPadding) + boxChars.vertical);
        lines.push(' '.repeat(centerPadding) + '▼');
      }
    }

    return lines.join('\n');
  }

  /**
   * Unicode罫線文字を使用した改善されたASCII表を生成
   * @requirement REQ-EXT-VIS-003
   * @since 1.0.0
   * @deprecated v1.0.1以降は generateMarkdownTable() を使用してください
   */
  generateAsciiTable(
    headers: string[],
    rows: string[][],
    options?: {
      style?: 'simple' | 'rounded' | 'double' | 'heavy';
      alignment?: ('left' | 'center' | 'right')[];
    }
  ): string {
    const style = options?.style ?? 'simple';
    const chars = this.getBoxCharacters(style);

    // 各列の最大幅を計算
    const colWidths = headers.map((h, i) => {
      const maxInColumn = Math.max(
        h.length,
        ...rows.map(r => (r[i] ?? '').length)
      );
      return maxInColumn + 2; // パディング
    });

    const lines: string[] = [];

    // 上罫線
    lines.push(this.drawHorizontalLine(colWidths, chars, 'top'));

    // ヘッダー行
    lines.push(this.drawTableRow(headers, colWidths, chars, options?.alignment));

    // ヘッダーと本体の区切り
    lines.push(this.drawHorizontalLine(colWidths, chars, 'middle'));

    // データ行
    for (const row of rows) {
      lines.push(this.drawTableRow(row, colWidths, chars, options?.alignment));
    }

    // 下罫線
    lines.push(this.drawHorizontalLine(colWidths, chars, 'bottom'));

    return lines.join('\n');
  }

  /**
   * Unicode罫線文字を使用したツリー図を生成
   * @requirement REQ-EXT-VIS-003
   * @since 1.0.0
   * @deprecated v1.0.1以降は generateMarkdownTree() を使用してください
   */
  generateAsciiTree(
    root: { label: string; children?: unknown[] },
    options?: { style?: 'simple' | 'double' }
  ): string {
    const lines: string[] = [];
    const style = options?.style ?? 'simple';
    
    const branch = style === 'double' ? '╠══' : '├──';
    const lastBranch = style === 'double' ? '╚══' : '└──';
    const vertical = style === 'double' ? '║  ' : '│  ';

    const renderNode = (
      node: { label: string; children?: unknown[] },
      prefix: string,
      isLast: boolean
    ) => {
      const connector = isLast ? lastBranch : branch;
      lines.push(prefix + connector + ' ' + node.label);

      if (node.children && Array.isArray(node.children)) {
        const childPrefix = prefix + (isLast ? '   ' : vertical);
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i] as { label: string; children?: unknown[] };
          const isLastChild = i === node.children.length - 1;
          renderNode(child, childPrefix, isLastChild);
        }
      }
    };

    lines.push(root.label);
    if (root.children && Array.isArray(root.children)) {
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i] as { label: string; children?: unknown[] };
        const isLast = i === root.children.length - 1;
        renderNode(child, '', isLast);
      }
    }

    return lines.join('\n');
  }

  /**
   * 罫線文字セットを取得
   */
  private getBoxCharacters(style: 'simple' | 'rounded' | 'double' | 'heavy'): {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    teeDown: string;
    teeUp: string;
    teeLeft: string;
    teeRight: string;
    cross: string;
  } {
    switch (style) {
      case 'rounded':
        return {
          topLeft: '╭',
          topRight: '╮',
          bottomLeft: '╰',
          bottomRight: '╯',
          horizontal: '─',
          vertical: '│',
          teeDown: '┬',
          teeUp: '┴',
          teeLeft: '┤',
          teeRight: '├',
          cross: '┼',
        };
      case 'double':
        return {
          topLeft: '╔',
          topRight: '╗',
          bottomLeft: '╚',
          bottomRight: '╝',
          horizontal: '═',
          vertical: '║',
          teeDown: '╦',
          teeUp: '╩',
          teeLeft: '╣',
          teeRight: '╠',
          cross: '╬',
        };
      case 'heavy':
        return {
          topLeft: '┏',
          topRight: '┓',
          bottomLeft: '┗',
          bottomRight: '┛',
          horizontal: '━',
          vertical: '┃',
          teeDown: '┳',
          teeUp: '┻',
          teeLeft: '┫',
          teeRight: '┣',
          cross: '╋',
        };
      default: // simple
        return {
          topLeft: '┌',
          topRight: '┐',
          bottomLeft: '└',
          bottomRight: '┘',
          horizontal: '─',
          vertical: '│',
          teeDown: '┬',
          teeUp: '┴',
          teeLeft: '┤',
          teeRight: '├',
          cross: '┼',
        };
    }
  }

  /**
   * ASCIIノードを描画
   */
  private drawAsciiNode(
    node: { id: string; label: string; shape?: string },
    chars: ReturnType<typeof this.getBoxCharacters>,
    maxWidth: number
  ): string[] {
    const label = node.label || node.id;
    const boxWidth = Math.min(label.length + 4, maxWidth - 4);
    const padding = Math.floor((maxWidth - boxWidth) / 2);
    const innerPadding = Math.floor((boxWidth - 2 - label.length) / 2);
    const extraPadding = (boxWidth - 2 - label.length) % 2;

    const isRhombus = node.shape === 'diamond' || node.shape === 'rhombus';
    
    if (isRhombus) {
      // 菱形（条件分岐用）
      const halfWidth = Math.floor(boxWidth / 2);
      return [
        ' '.repeat(padding + halfWidth) + '◇',
        ' '.repeat(padding) + '/' + ' '.repeat(halfWidth - 1) + label + ' '.repeat(halfWidth - 1) + '\\',
        ' '.repeat(padding + halfWidth) + '◇',
      ];
    }

    return [
      ' '.repeat(padding) + chars.topLeft + chars.horizontal.repeat(boxWidth - 2) + chars.topRight,
      ' '.repeat(padding) + chars.vertical + ' '.repeat(innerPadding) + label + ' '.repeat(innerPadding + extraPadding) + chars.vertical,
      ' '.repeat(padding) + chars.bottomLeft + chars.horizontal.repeat(boxWidth - 2) + chars.bottomRight,
    ];
  }

  /**
   * 表の水平線を描画
   */
  private drawHorizontalLine(
    colWidths: number[],
    chars: ReturnType<typeof this.getBoxCharacters>,
    position: 'top' | 'middle' | 'bottom'
  ): string {
    let left: string, mid: string, right: string;

    switch (position) {
      case 'top':
        left = chars.topLeft;
        mid = chars.teeDown;
        right = chars.topRight;
        break;
      case 'middle':
        left = chars.teeRight;
        mid = chars.cross;
        right = chars.teeLeft;
        break;
      case 'bottom':
        left = chars.bottomLeft;
        mid = chars.teeUp;
        right = chars.bottomRight;
        break;
    }

    const segments = colWidths.map(w => chars.horizontal.repeat(w));
    return left + segments.join(mid) + right;
  }

  /**
   * 表の行を描画
   */
  private drawTableRow(
    cells: string[],
    colWidths: number[],
    chars: ReturnType<typeof this.getBoxCharacters>,
    alignment?: ('left' | 'center' | 'right')[]
  ): string {
    const formattedCells = cells.map((cell, i) => {
      const width = colWidths[i] ?? 10;
      const align = alignment?.[i] ?? 'left';
      return this.alignText(cell, width, align);
    });

    return chars.vertical + formattedCells.join(chars.vertical) + chars.vertical;
  }

  /**
   * テキストを揃える
   */
  private alignText(
    text: string,
    width: number,
    alignment: 'left' | 'center' | 'right'
  ): string {
    const padding = width - text.length;
    if (padding <= 0) return text.slice(0, width);

    switch (alignment) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + text + ' '.repeat(right);
      default:
        return text + ' '.repeat(padding);
    }
  }
}
