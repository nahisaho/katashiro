/**
 * Code Validator
 * コードの安全性を検証するクラス
 * REQ-ANALYZE-009: コードインタープリタ機能
 */

import {
  SupportedLanguage,
  ValidationResult,
  BLOCKED_PYTHON_MODULES,
} from './types.js';

/**
 * 危険な関数パターン
 */
interface DangerousPattern {
  pattern: RegExp;
  name: string;
  severity: 'error' | 'warning';
}

/**
 * コードバリデーター
 *
 * コードの安全性を検証し、危険なコードパターンを検出する。
 *
 * @example
 * ```typescript
 * const validator = new CodeValidator();
 *
 * // Pythonコードの検証
 * const result = validator.validate(`
 *   import os  # blocked
 *   print("hello")
 * `, 'python');
 *
 * console.log(result.valid);  // false
 * console.log(result.errors); // ['Blocked module: os']
 * ```
 */
export class CodeValidator {
  private readonly maxCodeLength = 100000; // 100KB

  /**
   * コードを検証
   */
  validate(code: string, language: SupportedLanguage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // コード長チェック
    if (code.length > this.maxCodeLength) {
      errors.push(`Code exceeds maximum length (${this.maxCodeLength} bytes)`);
    }

    // 言語別チェック
    switch (language) {
      case 'python':
        this.validatePython(code, errors, warnings);
        break;
      case 'javascript':
      case 'typescript':
        this.validateJavaScript(code, errors, warnings);
        break;
      case 'shell':
        this.validateShell(code, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * インポートを抽出
   */
  extractImports(code: string, language: SupportedLanguage): string[] {
    const imports: string[] = [];

    if (language === 'python') {
      // import xxx
      const importRegex = /^import\s+([\w.]+)/gm;
      // from xxx import yyy
      const fromRegex = /^from\s+([\w.]+)\s+import/gm;

      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const mod = match[1]?.split('.')[0];
        if (mod) imports.push(mod);
      }
      while ((match = fromRegex.exec(code)) !== null) {
        const mod = match[1]?.split('.')[0];
        if (mod) imports.push(mod);
      }
    } else if (language === 'javascript' || language === 'typescript') {
      // require('xxx')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      // import xxx from 'yyy'
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      // import 'xxx'
      const importOnlyRegex = /import\s+['"]([^'"]+)['"]/g;

      let match;
      while ((match = requireRegex.exec(code)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
      while ((match = importRegex.exec(code)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
      while ((match = importOnlyRegex.exec(code)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
    }

    return [...new Set(imports)];
  }

  /**
   * 循環的複雑度を計算
   */
  calculateComplexity(code: string): number {
    const complexityPatterns = [
      /\bif\s+/g,
      /\belif\s+/g,
      /\belse\s*:/g,
      /\bfor\s+/g,
      /\bwhile\s+/g,
      /\btry\s*:/g,
      /\bexcept\b/g,
      /\bcatch\s*\(/g,
      /\bcase\s+/g,
      /\?\s*:/g, // 三項演算子
      /&&|\|\|/g, // 論理演算子
    ];

    let complexity = 1; // 基本複雑度

    for (const pattern of complexityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * ブロックされたモジュールかどうかをチェック
   */
  isBlockedModule(moduleName: string, language: SupportedLanguage): boolean {
    if (language === 'python') {
      return BLOCKED_PYTHON_MODULES.includes(moduleName as any);
    }

    // JavaScript/TypeScript の危険なモジュール
    const blockedJsModules = [
      'child_process',
      'fs',
      'net',
      'dgram',
      'cluster',
      'vm',
      'worker_threads',
    ];

    if (language === 'javascript' || language === 'typescript') {
      return blockedJsModules.includes(moduleName);
    }

    return false;
  }

  /**
   * Pythonコードの検証
   */
  private validatePython(
    code: string,
    errors: string[],
    warnings: string[]
  ): void {
    // ブロックされたモジュールのインポートチェック
    for (const module of BLOCKED_PYTHON_MODULES) {
      const importPatterns = [
        new RegExp(`^\\s*import\\s+${module}(?:\\s|$|,)`, 'm'),
        new RegExp(`^\\s*from\\s+${module}\\s+import`, 'm'),
        new RegExp(`__import__\\s*\\(\\s*['"]${module}['"]`, 'm'),
      ];

      for (const pattern of importPatterns) {
        if (pattern.test(code)) {
          errors.push(`Blocked module: ${module}`);
          break;
        }
      }
    }

    // 危険な関数のチェック
    const dangerousFunctions: DangerousPattern[] = [
      { pattern: /\beval\s*\(/, name: 'eval()', severity: 'error' },
      { pattern: /\bexec\s*\(/, name: 'exec()', severity: 'error' },
      { pattern: /\bcompile\s*\(/, name: 'compile()', severity: 'warning' },
      { pattern: /\b__import__\s*\(/, name: '__import__()', severity: 'error' },
      {
        pattern: /\bgetattr\s*\(.*,\s*['"]__/,
        name: 'getattr with dunder',
        severity: 'warning',
      },
      {
        pattern: /\bsetattr\s*\(.*,\s*['"]__/,
        name: 'setattr with dunder',
        severity: 'warning',
      },
    ];

    for (const { pattern, name, severity } of dangerousFunctions) {
      if (pattern.test(code)) {
        if (severity === 'error') {
          errors.push(`Blocked function: ${name}`);
        } else {
          warnings.push(`Potentially dangerous function: ${name}`);
        }
      }
    }

    // ファイル操作のチェック
    if (/\bopen\s*\(/.test(code)) {
      warnings.push('File operation detected: open()');
    }

    // グローバル変数アクセスのチェック
    if (/\bglobals\s*\(\)/.test(code) || /\blocals\s*\(\)/.test(code)) {
      warnings.push('Global/local scope access detected');
    }
  }

  /**
   * JavaScript/TypeScriptコードの検証
   */
  private validateJavaScript(
    code: string,
    errors: string[],
    warnings: string[]
  ): void {
    // 危険なグローバルオブジェクトのチェック
    const dangerousGlobals = [
      'process',
      'child_process',
      'fs',
      'net',
      'http',
      'https',
      'dgram',
      'cluster',
    ];

    for (const global of dangerousGlobals) {
      if (new RegExp(`\\b${global}\\b`).test(code)) {
        warnings.push(`Potentially dangerous global: ${global}`);
      }
    }

    // eval/Functionのチェック
    if (/\beval\s*\(/.test(code)) {
      errors.push('Dynamic code execution is blocked: eval()');
    }

    if (/\bnew\s+Function\s*\(/.test(code)) {
      errors.push('Dynamic code execution is blocked: new Function()');
    }

    // require のチェック
    const requireMatches = code.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    if (requireMatches) {
      for (const match of requireMatches) {
        const moduleMatch = match.match(/['"]([^'"]+)['"]/);
        const moduleName = moduleMatch?.[1];
        if (moduleName && this.isBlockedModule(moduleName, 'javascript')) {
          errors.push(`Blocked module: ${moduleName}`);
        }
      }
    }
  }

  /**
   * Shellスクリプトの検証
   */
  private validateShell(
    code: string,
    errors: string[],
    warnings: string[]
  ): void {
    // 危険なコマンドのチェック
    const dangerousCommands: DangerousPattern[] = [
      { pattern: /\brm\s+-rf/, name: 'rm -rf', severity: 'error' },
      { pattern: /\brm\s+.*\/\*/, name: 'rm with wildcard', severity: 'error' },
      { pattern: /\bsudo\b/, name: 'sudo', severity: 'error' },
      { pattern: /\bsu\b/, name: 'su', severity: 'error' },
      { pattern: /\bchmod\s+777/, name: 'chmod 777', severity: 'error' },
      { pattern: /\bchown\b/, name: 'chown', severity: 'warning' },
      { pattern: /\bcurl\b.*\|\s*bash/, name: 'curl | bash', severity: 'error' },
      { pattern: /\bwget\b.*\|\s*bash/, name: 'wget | bash', severity: 'error' },
      { pattern: /\bnc\b|\bnetcat\b/, name: 'netcat', severity: 'error' },
      { pattern: />\s*\/dev\//, name: 'device write', severity: 'error' },
      { pattern: /\bmkfs\b/, name: 'mkfs', severity: 'error' },
      { pattern: /\bdd\s+if=/, name: 'dd', severity: 'error' },
      { pattern: /:()\s*{\s*:\s*\|/, name: 'fork bomb', severity: 'error' },
    ];

    for (const { pattern, name, severity } of dangerousCommands) {
      if (pattern.test(code)) {
        if (severity === 'error') {
          errors.push(`Blocked command: ${name}`);
        } else {
          warnings.push(`Potentially dangerous command: ${name}`);
        }
      }
    }

    // パイプとリダイレクトのチェック
    if (/\|.*\|.*\|/.test(code)) {
      warnings.push('Multiple pipes detected');
    }

    // バックグラウンド実行のチェック
    if (/&\s*$/.test(code)) {
      warnings.push('Background execution detected');
    }
  }
}
