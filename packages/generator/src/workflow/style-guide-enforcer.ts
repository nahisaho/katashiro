/**
 * StyleGuideEnforcer
 * スタイルガイド適用
 *
 * @module workflow/style-guide-enforcer
 */

import { StyleRule, StyleViolation, StyleCheckResult } from './types.js';

/**
 * スタイルガイドエンフォーサー
 * スタイルルールを検証し、違反を検出・修正する
 */
export class StyleGuideEnforcer {
  private rules: Map<string, StyleRule> = new Map();
  private maxErrorsToFail = 0; // 0 = エラーがあれば失敗

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * デフォルトのスタイルルールを登録
   */
  private registerDefaultRules(): void {
    // 行末スペース
    this.registerRule({
      id: 'no-trailing-whitespace',
      name: '行末スペース禁止',
      description: '行末に不要なスペースがないこと',
      category: 'formatting',
      severity: 'warning',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (/\s+$/.test(line)) {
            violations.push({
              ruleId: 'no-trailing-whitespace',
              severity: 'warning',
              message: '行末に不要なスペースがあります',
              line: index + 1,
              text: line,
              suggestion: line.trimEnd(),
            });
          }
        });
        return violations;
      },
      fix: (content) => {
        return content
          .split('\n')
          .map((line) => line.trimEnd())
          .join('\n');
      },
    });

    // 連続空行
    this.registerRule({
      id: 'no-consecutive-blank-lines',
      name: '連続空行禁止',
      description: '3行以上の連続した空行がないこと',
      category: 'formatting',
      severity: 'info',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const matches = content.matchAll(/\n{4,}/g);
        for (const match of matches) {
          if (match.index !== undefined) {
            const lineNumber =
              content.substring(0, match.index).split('\n').length + 1;
            violations.push({
              ruleId: 'no-consecutive-blank-lines',
              severity: 'info',
              message: '3行以上の連続した空行があります',
              line: lineNumber,
            });
          }
        }
        return violations;
      },
      fix: (content) => {
        return content.replace(/\n{4,}/g, '\n\n\n');
      },
    });

    // 見出しスタイル
    this.registerRule({
      id: 'heading-style',
      name: '見出しスタイル',
      description: '見出しの後に空行があること',
      category: 'structure',
      severity: 'warning',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i]!;
          const nextLine = lines[i + 1]!;
          if (/^#{1,6}\s/.test(line) && nextLine.trim() !== '' && !/^#{1,6}\s/.test(nextLine)) {
            violations.push({
              ruleId: 'heading-style',
              severity: 'warning',
              message: '見出しの後に空行が必要です',
              line: i + 1,
              text: line,
            });
          }
        }
        return violations;
      },
      fix: (content) => {
        const lines = content.split('\n');
        const result: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          result.push(line);
          if (/^#{1,6}\s/.test(line)) {
            const nextLine = lines[i + 1];
            if (nextLine && nextLine.trim() !== '' && !/^#{1,6}\s/.test(nextLine)) {
              result.push('');
            }
          }
        }
        return result.join('\n');
      },
    });

    // リストスタイル
    this.registerRule({
      id: 'list-marker-style',
      name: 'リストマーカースタイル',
      description: 'リストマーカーは「-」を使用すること',
      category: 'formatting',
      severity: 'info',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (/^(\s*)\*\s/.test(line)) {
            violations.push({
              ruleId: 'list-marker-style',
              severity: 'info',
              message: 'リストマーカーは「-」を使用してください',
              line: index + 1,
              text: line,
              suggestion: line.replace(/^(\s*)\*/, '$1-'),
            });
          }
        });
        return violations;
      },
      fix: (content) => {
        return content
          .split('\n')
          .map((line) => line.replace(/^(\s*)\*\s/, '$1- '))
          .join('\n');
      },
    });

    // リンクテキスト
    this.registerRule({
      id: 'meaningful-link-text',
      name: '意味のあるリンクテキスト',
      description: 'リンクテキストが「こちら」「ここ」などではないこと',
      category: 'language',
      severity: 'warning',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const badLinkTexts = ['こちら', 'ここ', 'これ', 'click here', 'here', 'link'];
        const linkPattern = /\[([^\]]+)\]\([^)]+\)/g;
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const linkText = match[1]?.toLowerCase() || '';
          if (badLinkTexts.some((bad) => linkText === bad.toLowerCase())) {
            const lineNumber =
              content.substring(0, match.index).split('\n').length;
            violations.push({
              ruleId: 'meaningful-link-text',
              severity: 'warning',
              message: `リンクテキスト「${match[1]}」は具体的な内容に変更してください`,
              line: lineNumber,
              text: match[0],
            });
          }
        }
        return violations;
      },
    });

    // 文末句点
    this.registerRule({
      id: 'sentence-ending',
      name: '文末句点',
      description: '文末に句点「。」があること（見出し・箇条書きを除く）',
      category: 'language',
      severity: 'info',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          // 見出し、箇条書き、空行、コードブロック、引用、URLで終わる行はスキップ
          if (
            !trimmed ||
            /^#{1,6}\s/.test(trimmed) ||
            /^[-*•]\s/.test(trimmed) ||
            /^\d+\.\s/.test(trimmed) ||
            /^```/.test(trimmed) ||
            /^>/.test(trimmed) ||
            /https?:\/\/[^\s]+$/.test(trimmed) ||
            /\|$/.test(trimmed)
          ) {
            return;
          }
          // 日本語の文で句点がない
          if (
            /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed) &&
            !/[。！？!?]$/.test(trimmed)
          ) {
            violations.push({
              ruleId: 'sentence-ending',
              severity: 'info',
              message: '文末に句点がありません',
              line: index + 1,
              text: trimmed,
              suggestion: trimmed + '。',
            });
          }
        });
        return violations;
      },
    });

    // 半角全角スペース
    this.registerRule({
      id: 'space-around-alphanumeric',
      name: '英数字周りのスペース',
      description: '日本語と英数字の間にスペースがあること',
      category: 'formatting',
      severity: 'info',
      enabled: false, // デフォルト無効（好みが分かれる）
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        const pattern =
          /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF])([a-zA-Z0-9])|([a-zA-Z0-9])([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF])/g;
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            violations.push({
              ruleId: 'space-around-alphanumeric',
              severity: 'info',
              message: '日本語と英数字の間にスペースを入れることを推奨します',
              line: index + 1,
              text: line,
            });
          }
          pattern.lastIndex = 0; // リセット
        });
        return violations;
      },
    });

    // コードブロック言語指定
    this.registerRule({
      id: 'code-block-language',
      name: 'コードブロック言語指定',
      description: 'コードブロックに言語が指定されていること',
      category: 'structure',
      severity: 'warning',
      enabled: true,
      validate: (content) => {
        const violations: StyleViolation[] = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (/^```$/.test(line.trim())) {
            violations.push({
              ruleId: 'code-block-language',
              severity: 'warning',
              message: 'コードブロックに言語を指定してください',
              line: index + 1,
              text: line,
              suggestion: '```javascript',
            });
          }
        });
        return violations;
      },
    });
  }

  /**
   * スタイルルールを登録
   */
  registerRule(rule: StyleRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * スタイルルールを削除
   */
  unregisterRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * スタイルルールを有効/無効化
   */
  setRuleEnabled(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * コンテンツを検証
   */
  validate(content: string, options?: { rules?: string[] }): StyleCheckResult {
    const enabledRules = options?.rules
      ? Array.from(this.rules.values()).filter(
          (r) => r.enabled && options.rules?.includes(r.id)
        )
      : Array.from(this.rules.values()).filter((r) => r.enabled);

    const allViolations: StyleViolation[] = [];

    for (const rule of enabledRules) {
      const violations = rule.validate(content);
      allViolations.push(...violations);
    }

    const errorCount = allViolations.filter((v) => v.severity === 'error').length;
    const warningCount = allViolations.filter((v) => v.severity === 'warning').length;
    const infoCount = allViolations.filter((v) => v.severity === 'info').length;

    const passed =
      this.maxErrorsToFail === 0 ? errorCount === 0 : errorCount <= this.maxErrorsToFail;

    return {
      violations: allViolations,
      errorCount,
      warningCount,
      infoCount,
      passed,
    };
  }

  /**
   * コンテンツを修正
   */
  fix(content: string, options?: { rules?: string[] }): StyleCheckResult {
    const enabledRules = options?.rules
      ? Array.from(this.rules.values()).filter(
          (r) => r.enabled && r.fix && options.rules?.includes(r.id)
        )
      : Array.from(this.rules.values()).filter((r) => r.enabled && r.fix);

    let fixedContent = content;

    for (const rule of enabledRules) {
      if (rule.fix) {
        fixedContent = rule.fix(fixedContent);
      }
    }

    // 修正後に再検証
    const result = this.validate(fixedContent, options);

    return {
      ...result,
      fixedContent,
    };
  }

  /**
   * 登録済みルールを取得
   */
  getRules(): StyleRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 特定のルールを取得
   */
  getRule(id: string): StyleRule | undefined {
    return this.rules.get(id);
  }

  /**
   * 失敗するエラー数の閾値を設定
   */
  setMaxErrorsToFail(count: number): void {
    this.maxErrorsToFail = count;
  }

  /**
   * スタイルガイドをエクスポート
   */
  exportGuide(format: 'markdown' | 'json' = 'markdown'): string {
    const rules = this.getRules().filter((r) => r.enabled);

    if (format === 'json') {
      return JSON.stringify(
        rules.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          severity: r.severity,
        })),
        null,
        2
      );
    }

    const lines: string[] = ['# スタイルガイド', ''];

    const categories = new Map<string, StyleRule[]>();
    for (const rule of rules) {
      const cat = categories.get(rule.category) || [];
      cat.push(rule);
      categories.set(rule.category, cat);
    }

    const categoryNames: Record<string, string> = {
      formatting: 'フォーマット',
      naming: '命名規則',
      structure: '構造',
      language: '言語・表現',
      custom: 'カスタム',
    };

    for (const [category, catRules] of categories) {
      lines.push(`## ${categoryNames[category] || category}`);
      lines.push('');
      for (const rule of catRules) {
        const severityBadge =
          rule.severity === 'error'
            ? '🔴'
            : rule.severity === 'warning'
              ? '🟡'
              : '🔵';
        lines.push(`### ${severityBadge} ${rule.name}`);
        lines.push('');
        lines.push(rule.description);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * スタイルルールを作成
 */
export function createStyleRule(
  id: string,
  name: string,
  validate: (content: string) => StyleViolation[],
  options?: {
    description?: string;
    category?: StyleRule['category'];
    severity?: StyleRule['severity'];
    fix?: (content: string) => string;
    enabled?: boolean;
  }
): StyleRule {
  return {
    id,
    name,
    description: options?.description || name,
    category: options?.category || 'custom',
    severity: options?.severity || 'warning',
    validate,
    fix: options?.fix,
    enabled: options?.enabled ?? true,
  };
}
