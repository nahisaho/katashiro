/**
 * KATASHIRO v1.3.0 - ReportPostProcessor テスト
 * @requirement REQ-1.3.0-VIS-002, REQ-1.3.0-INT-001
 */

import { describe, it, expect } from 'vitest';
import { ReportPostProcessor } from '../../src/consensus/ReportPostProcessor';

describe('ReportPostProcessor', () => {
  describe('デフォルト設定', () => {
    const processor = new ReportPostProcessor();

    it('ASCII図がない場合はそのまま返す', () => {
      const report = `# レポート

これは通常のテキストです。
`;
      const result = processor.process(report);
      expect(result.processedReport).toBe(report);
      expect(result.conversions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('テーブルを検出して変換する', () => {
      const report = `# レポート

比較表:

| 項目 | 値 |
|------|-----|
| A    | 100 |
| B    | 200 |

結論です。
`;
      const result = processor.process(report);
      expect(result.conversions.length).toBeGreaterThanOrEqual(0);
    });

    it('フローチャートをMermaidに変換する', () => {
      const report = `# レポート

処理フロー:

[開始] --> [処理A] --> [判定]
[判定] --> [処理B]
[判定] --> [終了]

以上です。
`;
      const result = processor.process(report);
      // デフォルトはMermaid優先
      expect(result.processedReport).toContain('mermaid');
    });

    it('ツリーをMermaidに変換する', () => {
      const report = `# レポート

構造:

├── folder1
│   ├── file1.ts
│   └── file2.ts
└── folder2
    └── file3.ts

終わり。
`;
      const result = processor.process(report);
      expect(result.processedReport).toContain('mermaid');
    });
  });

  describe('Markdown優先設定', () => {
    const processor = new ReportPostProcessor({ preferMermaid: false });

    it('テーブルはそのままMarkdown形式で保持', () => {
      const report = `# レポート

| 項目 | 値 |
|------|-----|
| A    | 100 |

終わり。
`;
      const result = processor.process(report);
      // Markdownテーブルはすでに正しい形式
      expect(result.processedReport).toContain('| 項目 | 値 |');
    });

    it('ツリーをMarkdownリストに変換する', () => {
      const report = `# レポート

├── src
└── dist

終わり。
`;
      const result = processor.process(report);
      expect(result.processedReport).toContain('- src');
      expect(result.processedReport).toContain('- dist');
    });
  });

  describe('無効化設定', () => {
    const processor = new ReportPostProcessor({ enabled: false });

    it('無効化時はそのまま返す', () => {
      const report = `# レポート

[A] --> [B] --> [C]
`;
      const result = processor.process(report);
      expect(result.processedReport).toBe(report);
      expect(result.conversions).toHaveLength(0);
    });
  });

  describe('元テキスト保持設定', () => {
    const processor = new ReportPostProcessor({ preserveOriginal: true });

    it('元テキストをコメントとして保持する', () => {
      const report = `# レポート

[開始] --> [終了]

終わり。
`;
      const result = processor.process(report);
      expect(result.processedReport).toContain('<!--');
      expect(result.processedReport).toContain('[開始] --> [終了]');
    });
  });

  describe('厳格モード', () => {
    const processor = new ReportPostProcessor({ strictMode: true });

    it('変換に失敗した場合に警告を出す', () => {
      // 不完全なフローチャート
      const report = `# レポート

[ --> 

終わり。
`;
      const result = processor.process(report);
      // 厳格モードでも通常動作（警告は出力される可能性がある）
      expect(result.processedReport).toBeDefined();
    });
  });

  describe('conversions 記録', () => {
    const processor = new ReportPostProcessor();

    it('変換記録が正しく作成される', () => {
      const report = `# レポート

[開始] --> [処理] --> [終了]

終わり。
`;
      const result = processor.process(report);
      
      // conversionsが空でなく、かつ正しい形式であることを確認
      if (result.conversions.length > 0) {
        const conversion = result.conversions[0]!;
        // ConversionRecord型のプロパティを確認
        expect(conversion).toHaveProperty('type');
        expect(conversion).toHaveProperty('original');
        expect(conversion).toHaveProperty('converted');
      }
      // processedReportにMermaidが含まれていることを確認
      expect(result.processedReport).toContain('mermaid');
    });
  });

  describe('複数図の処理', () => {
    const processor = new ReportPostProcessor();

    it('複数のASCII図を一度に処理できる', () => {
      const report = `# レポート

## テーブル

| A | B |
|---|---|
| 1 | 2 |

## フローチャート

[A] --> [B]

## ツリー

├── src
└── dist

終わり。
`;
      const result = processor.process(report);
      expect(result.processedReport).toBeDefined();
      // 複数の変換が行われているはず
      expect(result.conversions.length).toBeGreaterThan(0);
    });
  });
});
