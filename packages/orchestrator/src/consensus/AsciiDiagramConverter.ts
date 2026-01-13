/**
 * KATASHIRO v1.3.0 - AsciiDiagramConverter
 * ASCII図を検出してMermaid/Markdownに変換
 * @module @nahisaho/katashiro-orchestrator/consensus
 * @version 1.3.0
 */

import type { AsciiDiagram } from './types';

/**
 * ASCII図検出・変換クラス
 * @requirement REQ-1.3.0-VIS-001
 */
export class AsciiDiagramConverter {
  // ASCII テーブル検出パターン
  private static readonly TABLE_PATTERNS = {
    // +---+---+ スタイル
    plusStyle: /^\s*\+[-+]+\+\s*$/,
    // |---|---| スタイル
    pipeStyle: /^\s*\|[-|]+\|\s*$/,
    // セル行
    cellRow: /^\s*\|[^|]+\|/,
  };

  // ASCII ツリー検出パターン
  private static readonly TREE_PATTERNS = {
    // ├── または └── スタイル
    treeNode: /^[\s]*[├└│┌┐┘┬┴┼─┤].*$/,
    // インデント + - スタイル
    dashNode: /^(\s*)[-*]\s+.+$/,
  };

  // ASCII フローチャート検出パターン
  private static readonly FLOWCHART_PATTERNS = {
    // [Node] --> [Node] スタイル
    bracketArrow: /\[([^\]]+)\]\s*(?:-->|->|==>|=>|--)\s*\[([^\]]+)\]/,
    // (Node) --> (Node) スタイル
    parenArrow: /\(([^)]+)\)\s*(?:-->|->|==>|=>|--)\s*\(([^)]+)\)/,
    // Node --> Node スタイル（行全体が矢印）
    simpleArrow: /^\s*\S+\s*(?:-->|->|==>|=>)\s*\S+\s*$/,
  };

  /**
   * テキストからASCII図を検出
   * @param text 入力テキスト
   * @returns 検出されたASCII図配列
   */
  detect(text: string): AsciiDiagram[] {
    const diagrams: AsciiDiagram[] = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      // テーブル検出
      const tableResult = this.detectTable(lines, i);
      if (tableResult) {
        diagrams.push(tableResult.diagram);
        i = tableResult.endLine + 1;
        continue;
      }

      // ツリー検出
      const treeResult = this.detectTree(lines, i);
      if (treeResult) {
        diagrams.push(treeResult.diagram);
        i = treeResult.endLine + 1;
        continue;
      }

      // ボックス検出
      const boxResult = this.detectBox(lines, i);
      if (boxResult) {
        diagrams.push(boxResult.diagram);
        i = boxResult.endLine + 1;
        continue;
      }

      // フローチャート検出
      const flowchartResult = this.detectFlowchart(lines, i);
      if (flowchartResult) {
        diagrams.push(flowchartResult.diagram);
        i = flowchartResult.endLine + 1;
        continue;
      }

      i++;
    }

    return diagrams;
  }

  /**
   * ASCII図をMermaidに変換
   * @param diagram ASCII図
   * @returns Mermaid形式の文字列
   */
  convertToMermaid(diagram: AsciiDiagram): string {
    switch (diagram.type) {
      case 'flowchart':
        return this.convertFlowchartToMermaid(diagram.original);
      case 'tree':
        return this.convertTreeToMermaid(diagram.original);
      case 'box':
        return this.convertBoxToMermaid(diagram.original);
      case 'table':
        // テーブルはMarkdownの方が適切
        return this.convertTableToMarkdown(diagram.original);
      default:
        return diagram.original;
    }
  }

  /**
   * ASCII図をMarkdownに変換
   * @param diagram ASCII図
   * @returns Markdown形式の文字列
   */
  convertToMarkdown(diagram: AsciiDiagram): string {
    switch (diagram.type) {
      case 'table':
        return this.convertTableToMarkdown(diagram.original);
      case 'tree':
        return this.convertTreeToMarkdownList(diagram.original);
      case 'flowchart':
      case 'box':
        // フローチャートとボックスはMermaidが適切
        return this.convertToMermaid(diagram);
      default:
        return diagram.original;
    }
  }

  // =========================================================================
  // 検出メソッド
  // =========================================================================

  private detectTable(
    lines: string[],
    startLine: number
  ): { diagram: AsciiDiagram; endLine: number } | null {
    const line = lines[startLine];
    if (!line) return null;

    // +---+---+ スタイルのテーブル開始を検出
    if (AsciiDiagramConverter.TABLE_PATTERNS.plusStyle.test(line)) {
      let endLine = startLine;

      // テーブル終了を探す
      for (let i = startLine + 1; i < lines.length; i++) {
        const currentLine = lines[i] || '';
        if (AsciiDiagramConverter.TABLE_PATTERNS.plusStyle.test(currentLine)) {
          endLine = i;
          // 次の行もテーブルの一部かチェック
          const nextLine = lines[i + 1];
          if (
            nextLine &&
            !AsciiDiagramConverter.TABLE_PATTERNS.plusStyle.test(nextLine) &&
            !AsciiDiagramConverter.TABLE_PATTERNS.cellRow.test(nextLine)
          ) {
            break;
          }
        } else if (!AsciiDiagramConverter.TABLE_PATTERNS.cellRow.test(currentLine)) {
          break;
        }
        endLine = i;
      }

      if (endLine > startLine) {
        const original = lines.slice(startLine, endLine + 1).join('\n');
        const startIndex = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
        return {
          diagram: {
            type: 'table',
            original,
            startIndex,
            endIndex: startIndex + original.length,
            lineNumber: startLine + 1,
          },
          endLine,
        };
      }
    }

    return null;
  }

  private detectTree(
    lines: string[],
    startLine: number
  ): { diagram: AsciiDiagram; endLine: number } | null {
    const line = lines[startLine];
    if (!line) return null;

    // ツリーノード検出
    if (AsciiDiagramConverter.TREE_PATTERNS.treeNode.test(line)) {
      let endLine = startLine;

      for (let i = startLine + 1; i < lines.length; i++) {
        const currentLine = lines[i] || '';
        if (
          AsciiDiagramConverter.TREE_PATTERNS.treeNode.test(currentLine) ||
          /^[\s]*[│]\s*$/.test(currentLine) // 縦線のみの行
        ) {
          endLine = i;
        } else if (currentLine.trim() === '') {
          // 空行で終了
          break;
        } else {
          break;
        }
      }

      if (endLine > startLine) {
        const original = lines.slice(startLine, endLine + 1).join('\n');
        const startIndex = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
        return {
          diagram: {
            type: 'tree',
            original,
            startIndex,
            endIndex: startIndex + original.length,
            lineNumber: startLine + 1,
          },
          endLine,
        };
      }
    }

    return null;
  }

  private detectBox(
    lines: string[],
    startLine: number
  ): { diagram: AsciiDiagram; endLine: number } | null {
    const line = lines[startLine];
    if (!line) return null;

    // ┌ で始まるボックス
    if (/^\s*┌/.test(line)) {
      let endLine = startLine;

      for (let i = startLine + 1; i < lines.length; i++) {
        const currentLine = lines[i] || '';
        if (/^\s*└/.test(currentLine)) {
          endLine = i;
          break;
        } else if (/^\s*│/.test(currentLine)) {
          endLine = i;
        } else {
          break;
        }
      }

      if (endLine > startLine) {
        const original = lines.slice(startLine, endLine + 1).join('\n');
        const startIndex = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
        return {
          diagram: {
            type: 'box',
            original,
            startIndex,
            endIndex: startIndex + original.length,
            lineNumber: startLine + 1,
          },
          endLine,
        };
      }
    }

    return null;
  }

  private detectFlowchart(
    lines: string[],
    startLine: number
  ): { diagram: AsciiDiagram; endLine: number } | null {
    const line = lines[startLine];
    if (!line) return null;

    // [Node] --> [Node] パターン
    if (AsciiDiagramConverter.FLOWCHART_PATTERNS.bracketArrow.test(line)) {
      let endLine = startLine;

      for (let i = startLine + 1; i < lines.length; i++) {
        const currentLine = lines[i] || '';
        if (
          AsciiDiagramConverter.FLOWCHART_PATTERNS.bracketArrow.test(currentLine) ||
          AsciiDiagramConverter.FLOWCHART_PATTERNS.parenArrow.test(currentLine) ||
          /^\s*\|?\s*v?\s*$/.test(currentLine) || // 縦線のみ
          /^\s*$/.test(currentLine) // 空行（フローチャート内の区切り）
        ) {
          // 連続する空行は終了とみなす
          const nextLine = lines[i + 1];
          if (/^\s*$/.test(currentLine) && nextLine !== undefined && /^\s*$/.test(nextLine)) {
            break;
          }
          endLine = i;
        } else {
          break;
        }
      }

      const original = lines.slice(startLine, endLine + 1).join('\n');
      const startIndex = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
      return {
        diagram: {
          type: 'flowchart',
          original,
          startIndex,
          endIndex: startIndex + original.length,
          lineNumber: startLine + 1,
        },
        endLine,
      };
    }

    return null;
  }

  // =========================================================================
  // 変換メソッド
  // =========================================================================

  private convertTableToMarkdown(ascii: string): string {
    const lines = ascii.split('\n').filter((l) => l.trim());
    const dataRows: string[][] = [];

    for (const line of lines) {
      // +---+---+ 行はスキップ
      if (AsciiDiagramConverter.TABLE_PATTERNS.plusStyle.test(line)) {
        continue;
      }

      // | cell | cell | 行からセルを抽出
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .slice(1, -1) // 最初と最後の空要素を除去
          .map((c) => c.trim());
        if (cells.length > 0 && cells.some((c) => c !== '')) {
          dataRows.push(cells);
        }
      }
    }

    if (dataRows.length === 0) return ascii;

    // Markdown テーブル生成
    const result: string[] = [];
    const colCount = Math.max(...dataRows.map((r) => r.length));

    // ヘッダー行
    if (dataRows[0]) {
      const header = dataRows[0].map((c) => c || '').concat(Array(colCount - dataRows[0].length).fill(''));
      result.push(`| ${header.join(' | ')} |`);
      result.push(`| ${header.map(() => '---').join(' | ')} |`);
    }

    // データ行
    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row) {
        const cells = row.map((c) => c || '').concat(Array(colCount - row.length).fill(''));
        result.push(`| ${cells.join(' | ')} |`);
      }
    }

    return result.join('\n');
  }

  private convertTreeToMarkdownList(ascii: string): string {
    const lines = ascii.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      // ツリー記号を除去してインデントレベルを計算
      const match = line.match(/^([\s│]*)[├└─┬┴┼├┤]*\s*(.+)$/);
      if (match) {
        const [, indent, content] = match;
        const level = Math.floor((indent?.replace(/│/g, ' ').length || 0) / 2);
        const cleanContent = content?.trim() || '';
        if (cleanContent) {
          result.push(`${'  '.repeat(level)}- ${cleanContent}`);
        }
      }
    }

    return result.join('\n') || ascii;
  }

  private convertTreeToMermaid(ascii: string): string {
    const lines = ascii.split('\n');
    const nodes: { id: string; label: string; level: number }[] = [];
    const edges: { from: string; to: string }[] = [];

    let nodeId = 0;
    const levelStack: string[] = [];

    for (const line of lines) {
      const match = line.match(/^([\s│]*)[├└─┬┴┼├┤]*\s*(.+)$/);
      if (match) {
        const [, indent, content] = match;
        const level = Math.floor((indent?.replace(/│/g, ' ').length || 0) / 2);
        const cleanContent = content?.trim() || '';

        if (cleanContent) {
          const id = `node${nodeId++}`;
          nodes.push({ id, label: cleanContent, level });

          // レベルスタックを更新
          levelStack[level] = id;

          // 親ノードとの接続
          if (level > 0 && levelStack[level - 1]) {
            edges.push({ from: levelStack[level - 1]!, to: id });
          }
        }
      }
    }

    if (nodes.length === 0) return ascii;

    // Mermaid graph生成
    const result: string[] = ['```mermaid', 'graph TD'];
    for (const node of nodes) {
      result.push(`    ${node.id}[${node.label}]`);
    }
    for (const edge of edges) {
      result.push(`    ${edge.from} --> ${edge.to}`);
    }
    result.push('```');

    return result.join('\n');
  }

  private convertFlowchartToMermaid(ascii: string): string {
    const lines = ascii.split('\n');
    const edges: { from: string; to: string; label?: string }[] = [];
    const nodeSet = new Set<string>();

    for (const line of lines) {
      // [Node1] --> [Node2] パターン
      const bracketMatch = line.match(/\[([^\]]+)\]\s*(?:-->|->|==>|=>|--)\s*\[([^\]]+)\]/g);
      if (bracketMatch) {
        for (const match of bracketMatch) {
          const parts = match.match(/\[([^\]]+)\]\s*(?:-->|->|==>|=>|--)\s*\[([^\]]+)\]/);
          if (parts && parts[1] && parts[2]) {
            const from = this.sanitizeNodeId(parts[1]);
            const to = this.sanitizeNodeId(parts[2]);
            edges.push({ from, to });
            nodeSet.add(from);
            nodeSet.add(to);
          }
        }
      }

      // (Node1) --> (Node2) パターン
      const parenMatch = line.match(/\(([^)]+)\)\s*(?:-->|->|==>|=>|--)\s*\(([^)]+)\)/g);
      if (parenMatch) {
        for (const match of parenMatch) {
          const parts = match.match(/\(([^)]+)\)\s*(?:-->|->|==>|=>|--)\s*\(([^)]+)\)/);
          if (parts && parts[1] && parts[2]) {
            const from = this.sanitizeNodeId(parts[1]);
            const to = this.sanitizeNodeId(parts[2]);
            edges.push({ from, to });
            nodeSet.add(from);
            nodeSet.add(to);
          }
        }
      }
    }

    if (edges.length === 0) return ascii;

    // Mermaid flowchart生成
    const result: string[] = ['```mermaid', 'flowchart TD'];
    for (const edge of edges) {
      result.push(`    ${edge.from} --> ${edge.to}`);
    }
    result.push('```');

    return result.join('\n');
  }

  private convertBoxToMermaid(ascii: string): string {
    const lines = ascii.split('\n');
    const boxes: string[] = [];

    for (const line of lines) {
      // │ content │ パターンからコンテンツを抽出
      const match = line.match(/│\s*(.+?)\s*│/);
      if (match && match[1]) {
        const content = match[1].trim();
        if (content && !/^[-─]+$/.test(content)) {
          boxes.push(content);
        }
      }
    }

    if (boxes.length === 0) return ascii;

    // シンプルなボックスとして Mermaid graph生成
    const result: string[] = ['```mermaid', 'graph TD'];
    boxes.forEach((box, i) => {
      const id = `box${i}`;
      result.push(`    ${id}[${box}]`);
      if (i > 0) {
        result.push(`    box${i - 1} --> ${id}`);
      }
    });
    result.push('```');

    return result.join('\n');
  }

  private sanitizeNodeId(label: string): string {
    // Mermaidのノード名として使える形式に変換
    return label
      .trim()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'node';
  }
}
