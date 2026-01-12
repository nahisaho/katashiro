/**
 * StructureAnalyzer Tests
 *
 * @requirement REQ-ANALYZE-007
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-021
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StructureAnalyzer } from '../../src/structure/structure-analyzer.js';

describe('StructureAnalyzer', () => {
  let analyzer: StructureAnalyzer;

  beforeEach(() => {
    analyzer = new StructureAnalyzer();
  });

  describe('extractHeadings', () => {
    it('should extract markdown headings', () => {
      const markdown = `
# Main Title

Some intro text.

## Section 1

Content for section 1.

### Subsection 1.1

More content.

## Section 2

Content for section 2.
      `;

      const headings = analyzer.extractHeadings(markdown);
      expect(headings.length).toBe(4);
      expect(headings[0]).toEqual({ level: 1, text: 'Main Title', line: 2 });
      expect(headings[1]).toEqual({ level: 2, text: 'Section 1', line: 6 });
      expect(headings[2]).toEqual({ level: 3, text: 'Subsection 1.1', line: 10 });
      expect(headings[3]).toEqual({ level: 2, text: 'Section 2', line: 14 });
    });

    it('should handle empty document', () => {
      const headings = analyzer.extractHeadings('');
      expect(headings).toHaveLength(0);
    });

    it('should handle document without headings', () => {
      const text = 'Just some plain text without any headings.';
      const headings = analyzer.extractHeadings(text);
      expect(headings).toHaveLength(0);
    });
  });

  describe('extractSections', () => {
    it('should extract sections from markdown', () => {
      const markdown = `
# Document

Intro paragraph.

## First Section

This is the first section content.
It has multiple lines.

## Second Section

This is the second section.
      `;

      const sections = analyzer.extractSections(markdown);
      expect(sections.length).toBe(3);
      expect(sections[0].title).toBe('Document');
      expect(sections[1].title).toBe('First Section');
      expect(sections[2].title).toBe('Second Section');
    });

    it('should preserve section content', () => {
      const markdown = `
## Section A

Content A line 1.
Content A line 2.

## Section B

Content B.
      `;

      const sections = analyzer.extractSections(markdown);
      expect(sections[0].content).toContain('Content A line 1');
      expect(sections[0].content).toContain('Content A line 2');
      expect(sections[1].content).toContain('Content B');
    });
  });

  describe('buildOutline', () => {
    it('should build hierarchical outline', () => {
      const markdown = `
# Chapter 1

## Section 1.1

### Topic 1.1.1

## Section 1.2

# Chapter 2

## Section 2.1
      `;

      const outline = analyzer.buildOutline(markdown);
      expect(outline.length).toBe(2); // Two top-level chapters
      expect(outline[0].text).toBe('Chapter 1');
      expect(outline[0].children?.length).toBe(2); // Two sections under Chapter 1
      expect(outline[0].children?.[0].children?.length).toBe(1); // One topic under Section 1.1
    });

    it('should handle flat structure', () => {
      const markdown = `
## Item 1
## Item 2
## Item 3
      `;

      const outline = analyzer.buildOutline(markdown);
      expect(outline.length).toBe(3);
    });
  });

  describe('extractLists', () => {
    it('should extract unordered lists', () => {
      const markdown = `
Some text.

- Item 1
- Item 2
- Item 3

More text.
      `;

      const lists = analyzer.extractLists(markdown);
      expect(lists.length).toBe(1);
      expect(lists[0].type).toBe('unordered');
      expect(lists[0].items).toHaveLength(3);
    });

    it('should extract ordered lists', () => {
      const markdown = `
1. First item
2. Second item
3. Third item
      `;

      const lists = analyzer.extractLists(markdown);
      expect(lists.length).toBe(1);
      expect(lists[0].type).toBe('ordered');
      expect(lists[0].items).toHaveLength(3);
    });

    it('should extract multiple lists', () => {
      const markdown = `
- Bullet 1
- Bullet 2

Some text between.

1. Number 1
2. Number 2
      `;

      const lists = analyzer.extractLists(markdown);
      expect(lists.length).toBe(2);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract fenced code blocks', () => {
      const markdown = `
Some text.

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

More text.

\`\`\`python
print("hello")
\`\`\`
      `;

      const codeBlocks = analyzer.extractCodeBlocks(markdown);
      expect(codeBlocks.length).toBe(2);
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].code).toContain('const x = 1');
      expect(codeBlocks[1].language).toBe('python');
    });

    it('should handle code blocks without language', () => {
      const markdown = `
\`\`\`
plain code
\`\`\`
      `;

      const codeBlocks = analyzer.extractCodeBlocks(markdown);
      expect(codeBlocks.length).toBe(1);
      expect(codeBlocks[0].language).toBe('');
    });
  });

  describe('extractTables', () => {
    it('should extract markdown tables', () => {
      const markdown = `
| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |
      `;

      const tables = analyzer.extractTables(markdown);
      expect(tables.length).toBe(1);
      expect(tables[0].headers).toEqual(['Name', 'Age']);
      expect(tables[0].rows).toHaveLength(2);
    });
  });

  describe('analyzeStructure', () => {
    it('should provide complete structure analysis', () => {
      const markdown = `
# Document Title

Introduction paragraph.

## Section 1

- Point 1
- Point 2

## Section 2

\`\`\`javascript
code();
\`\`\`
      `;

      const analysis = analyzer.analyzeStructure(markdown);
      expect(analysis.headings.length).toBeGreaterThan(0);
      expect(analysis.sections.length).toBeGreaterThan(0);
      expect(analysis.lists.length).toBe(1);
      expect(analysis.codeBlocks.length).toBe(1);
    });
  });
});
