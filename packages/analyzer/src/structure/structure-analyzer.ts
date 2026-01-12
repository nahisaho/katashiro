/**
 * StructureAnalyzer - 文書構造分析
 *
 * @requirement REQ-ANALYZE-007
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-021
 */

/**
 * 見出し情報
 */
export interface Heading {
  readonly level: number;
  readonly text: string;
  readonly line: number;
}

/**
 * セクション情報
 */
export interface Section {
  readonly title: string;
  readonly level: number;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
}

/**
 * アウトラインノード
 */
export interface OutlineNode {
  readonly text: string;
  readonly level: number;
  readonly line: number;
  readonly children?: OutlineNode[];
}

/**
 * リスト情報
 */
export interface ListInfo {
  readonly type: 'ordered' | 'unordered';
  readonly items: string[];
  readonly startLine: number;
}

/**
 * コードブロック情報
 */
export interface CodeBlock {
  readonly language: string;
  readonly code: string;
  readonly startLine: number;
  readonly endLine: number;
}

/**
 * テーブル情報
 */
export interface TableInfo {
  readonly headers: string[];
  readonly rows: string[][];
  readonly startLine: number;
}

/**
 * 構造分析結果
 */
export interface StructureAnalysis {
  readonly headings: Heading[];
  readonly sections: Section[];
  readonly outline: OutlineNode[];
  readonly lists: ListInfo[];
  readonly codeBlocks: CodeBlock[];
  readonly tables: TableInfo[];
}

/**
 * 文書構造分析実装
 */
export class StructureAnalyzer {
  /**
   * 見出しを抽出
   */
  extractHeadings(markdown: string): Heading[] {
    const headings: Heading[] = [];
    const lines = markdown.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match?.[1] && match?.[2]) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i + 1,
        });
      }
    }

    return headings;
  }

  /**
   * セクションを抽出
   */
  extractSections(markdown: string): Section[] {
    const sections: Section[] = [];
    const lines = markdown.split('\n');
    const headings = this.extractHeadings(markdown);

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      if (!heading) continue;

      const nextHeading = headings[i + 1];
      const startLine = heading.line;
      const endLine = nextHeading ? nextHeading.line - 1 : lines.length;

      // Extract content between this heading and the next
      const contentLines = lines.slice(startLine, endLine);
      const content = contentLines.join('\n').trim();

      sections.push({
        title: heading.text,
        level: heading.level,
        content,
        startLine,
        endLine,
      });
    }

    return sections;
  }

  /**
   * 階層的なアウトラインを構築
   */
  buildOutline(markdown: string): OutlineNode[] {
    const headings = this.extractHeadings(markdown);
    if (headings.length === 0) return [];

    const root: OutlineNode[] = [];
    const stack: { node: OutlineNode; level: number }[] = [];

    for (const heading of headings) {
      const node: OutlineNode = {
        text: heading.text,
        level: heading.level,
        line: heading.line,
        children: [],
      };

      // Find parent node
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top && top.level >= heading.level) {
          stack.pop();
        } else {
          break;
        }
      }

      if (stack.length === 0) {
        root.push(node);
      } else {
        const parentEntry = stack[stack.length - 1];
        if (parentEntry) {
          const parent = parentEntry.node;
          if (!parent.children) {
            (parent as { children: OutlineNode[] }).children = [];
          }
          parent.children!.push(node);
        }
      }

      stack.push({ node, level: heading.level });
    }

    return root;
  }

  /**
   * リストを抽出
   */
  extractLists(markdown: string): ListInfo[] {
    const lists: ListInfo[] = [];
    const lines = markdown.split('\n');
    
    let currentList: { type: 'ordered' | 'unordered'; items: string[]; startLine: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      
      // Unordered list item
      const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
      // Ordered list item
      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);

      if (unorderedMatch?.[1]) {
        if (!currentList || currentList.type !== 'unordered') {
          if (currentList) lists.push(currentList);
          currentList = { type: 'unordered', items: [], startLine: i + 1 };
        }
        currentList.items.push(unorderedMatch[1]);
      } else if (orderedMatch?.[1]) {
        if (!currentList || currentList.type !== 'ordered') {
          if (currentList) lists.push(currentList);
          currentList = { type: 'ordered', items: [], startLine: i + 1 };
        }
        currentList.items.push(orderedMatch[1]);
      } else if (line.trim() === '' && currentList) {
        lists.push(currentList);
        currentList = null;
      }
    }

    if (currentList) {
      lists.push(currentList);
    }

    return lists;
  }

  /**
   * コードブロックを抽出
   */
  extractCodeBlocks(markdown: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const lines = markdown.split('\n');
    
    let inCodeBlock = false;
    let currentBlock: { language: string; lines: string[]; startLine: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      
      if (line.match(/^```(\w*)$/)) {
        if (!inCodeBlock) {
          // Start of code block
          const langMatch = line.match(/^```(\w*)$/);
          currentBlock = {
            language: langMatch?.[1] ?? '',
            lines: [],
            startLine: i + 1,
          };
          inCodeBlock = true;
        } else {
          // End of code block
          if (currentBlock) {
            codeBlocks.push({
              language: currentBlock.language,
              code: currentBlock.lines.join('\n'),
              startLine: currentBlock.startLine,
              endLine: i + 1,
            });
            currentBlock = null;
          }
          inCodeBlock = false;
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.lines.push(line);
      }
    }

    return codeBlocks;
  }

  /**
   * テーブルを抽出
   */
  extractTables(markdown: string): TableInfo[] {
    const tables: TableInfo[] = [];
    const lines = markdown.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? '';
      const nextLine = lines[i + 1];
      
      // Check if this looks like a table header row
      if (line.includes('|') && nextLine?.match(/^\|?[\s-:|]+\|?$/)) {
        const headerCells = this.parseTableRow(line);
        const rows: string[][] = [];
        
        // Skip separator line
        i += 2;
        
        // Parse data rows
        while (i < lines.length) {
          const rowLine = lines[i];
          if (rowLine && rowLine.includes('|')) {
            const rowCells = this.parseTableRow(rowLine);
            if (rowCells.length > 0) {
              rows.push(rowCells);
            }
            i++;
          } else {
            break;
          }
        }
        
        if (headerCells.length > 0) {
          tables.push({
            headers: headerCells,
            rows,
            startLine: i - rows.length - 2,
          });
        }
      } else {
        i++;
      }
    }

    return tables;
  }

  /**
   * テーブル行をパース
   */
  private parseTableRow(line: string): string[] {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
  }

  /**
   * 完全な構造分析を実行
   */
  analyzeStructure(markdown: string): StructureAnalysis {
    return {
      headings: this.extractHeadings(markdown),
      sections: this.extractSections(markdown),
      outline: this.buildOutline(markdown),
      lists: this.extractLists(markdown),
      codeBlocks: this.extractCodeBlocks(markdown),
      tables: this.extractTables(markdown),
    };
  }

  /**
   * 構造分析を実行（analyzeStructureのエイリアス）
   * AGENTS.md互換API
   */
  analyze(markdown: string): StructureAnalysis {
    return this.analyzeStructure(markdown);
  }
}
