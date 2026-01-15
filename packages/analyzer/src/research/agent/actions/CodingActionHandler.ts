/**
 * CodingActionHandler - コード実行アクション
 *
 * @requirement REQ-DR-001
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { CodingParams } from '../types.js';
import { BaseActionHandler, type ExecutionContext, type ActionResult, type ActionHandlerOptions } from './BaseActionHandler.js';

/**
 * コード実行アクションハンドラのオプション
 */
export interface CodingActionHandlerOptions extends ActionHandlerOptions {
  /** コードエグゼキューター（オプション） */
  codeExecutor?: CodeExecutor;
}

/**
 * コードエグゼキューターのインターフェース
 */
export interface CodeExecutor {
  execute(code: string, language: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }>;
}

/**
 * 計算やデータ処理のためのコード実行アクションハンドラ
 */
export class CodingActionHandler extends BaseActionHandler<CodingParams> {
  readonly actionType = 'coding' as const;

  private codeExecutor?: CodeExecutor;

  constructor(options: CodingActionHandlerOptions) {
    super(options);
    this.codeExecutor = options.codeExecutor;
  }

  /**
   * コードを実行
   */
  async execute(params: CodingParams, _context: ExecutionContext): Promise<ActionResult> {
    const { codingIssue, code } = params;

    try {
      let result: { success: boolean; output: string; error?: string };

      if (this.codeExecutor && code) {
        // 外部エグゼキューターでコードを実行
        result = await this.codeExecutor.execute(code, 'python');
      } else {
        // ビルトインの計算を試行
        result = await this.executeBuiltIn(codingIssue ?? '');
      }

      // 結果をナレッジアイテムとして保存
      const item = this.createKnowledgeItem(
        `Coding Task: ${codingIssue ?? 'Unknown'}\n\nCode:\n${code || 'Built-in calculation'}\n\nResult:\n${result.output}${result.error ? `\n\nError: ${result.error}` : ''}`,
        {
          type: 'code',
          title: `Calculation: ${(codingIssue ?? 'Unknown').slice(0, 50)}...`,
        }
      );

      return {
        success: result.success,
        knowledgeItems: [item],
        error: result.error,
        metadata: {
          codingIssue,
          output: result.output,
        },
      };
    } catch (error) {
      return {
        success: false,
        knowledgeItems: [],
        error: error instanceof Error ? error.message : 'Code execution failed',
      };
    }
  }

  /**
   * ビルトインの計算を実行
   */
  private async executeBuiltIn(issue: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    // 日付計算
    if (this.isDateCalculation(issue)) {
      return this.calculateDate(issue);
    }

    // 数値計算
    if (this.isMathCalculation(issue)) {
      return this.calculateMath(issue);
    }

    // 単位変換
    if (this.isUnitConversion(issue)) {
      return this.convertUnit(issue);
    }

    return {
      success: false,
      output: '',
      error: 'No code executor available and built-in calculation not supported',
    };
  }

  /**
   * 日付計算かどうか
   */
  private isDateCalculation(issue: string): boolean {
    const dateKeywords = [
      'days ago',
      'days from',
      'date',
      'year',
      'month',
      'week',
      'today',
      'yesterday',
      'tomorrow',
    ];
    return dateKeywords.some((k) => issue.toLowerCase().includes(k));
  }

  /**
   * 日付計算を実行
   */
  private calculateDate(issue: string): { success: boolean; output: string; error?: string } {
    try {
      const today = new Date();

      // "X days ago" パターン
      const daysAgoMatch = issue.match(/(\d+)\s*days?\s*ago/i);
      if (daysAgoMatch && daysAgoMatch[1]) {
        const days = parseInt(daysAgoMatch[1], 10);
        const date = new Date(today);
        date.setDate(date.getDate() - days);
        return {
          success: true,
          output: `${days} days ago was: ${date.toISOString().split('T')[0]}`,
        };
      }

      // "X days from now" パターン
      const daysFromMatch = issue.match(/(\d+)\s*days?\s*from\s*(?:now|today)/i);
      if (daysFromMatch && daysFromMatch[1]) {
        const days = parseInt(daysFromMatch[1], 10);
        const date = new Date(today);
        date.setDate(date.getDate() + days);
        return {
          success: true,
          output: `${days} days from now: ${date.toISOString().split('T')[0]}`,
        };
      }

      // 今日の日付
      return {
        success: true,
        output: `Today's date: ${today.toISOString().split('T')[0]}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Date calculation failed',
      };
    }
  }

  /**
   * 数値計算かどうか
   */
  private isMathCalculation(issue: string): boolean {
    const mathKeywords = ['calculate', 'compute', 'sum', 'average', 'multiply', 'divide', '+', '-', '*', '/', '%'];
    return mathKeywords.some((k) => issue.toLowerCase().includes(k));
  }

  /**
   * 数値計算を実行
   */
  private calculateMath(issue: string): { success: boolean; output: string; error?: string } {
    try {
      // 数式を抽出（安全なパターンのみ）
      const mathMatch = issue.match(/[\d\s+\-*/().]+/);
      if (mathMatch) {
        const expression = mathMatch[0].trim();
        // 安全性チェック: 数字と演算子のみ
        if (/^[\d\s+\-*/().]+$/.test(expression)) {
          // eval の代わりに Function を使用（やや安全）
          const result = new Function(`return ${expression}`)();
          return {
            success: true,
            output: `${expression} = ${result}`,
          };
        }
      }

      return {
        success: false,
        output: '',
        error: 'Could not parse math expression',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Math calculation failed',
      };
    }
  }

  /**
   * 単位変換かどうか
   */
  private isUnitConversion(issue: string): boolean {
    const unitKeywords = ['convert', 'to', 'from', 'km', 'miles', 'kg', 'pounds', 'celsius', 'fahrenheit'];
    return unitKeywords.some((k) => issue.toLowerCase().includes(k));
  }

  /**
   * 単位変換を実行
   */
  private convertUnit(issue: string): { success: boolean; output: string; error?: string } {
    try {
      const lowerIssue = issue.toLowerCase();

      // km to miles
      const kmToMilesMatch = lowerIssue.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\s*to\s*miles?/);
      if (kmToMilesMatch && kmToMilesMatch[1]) {
        const km = parseFloat(kmToMilesMatch[1]);
        const miles = km * 0.621371;
        return { success: true, output: `${km} km = ${miles.toFixed(2)} miles` };
      }

      // miles to km
      const milesToKmMatch = lowerIssue.match(/(\d+(?:\.\d+)?)\s*miles?\s*to\s*(?:km|kilometers?)/);
      if (milesToKmMatch && milesToKmMatch[1]) {
        const miles = parseFloat(milesToKmMatch[1]);
        const km = miles * 1.60934;
        return { success: true, output: `${miles} miles = ${km.toFixed(2)} km` };
      }

      // celsius to fahrenheit
      const celsiusMatch = lowerIssue.match(/(\d+(?:\.\d+)?)\s*(?:°?c|celsius)\s*to\s*(?:°?f|fahrenheit)/);
      if (celsiusMatch && celsiusMatch[1]) {
        const c = parseFloat(celsiusMatch[1]);
        const f = (c * 9) / 5 + 32;
        return { success: true, output: `${c}°C = ${f.toFixed(1)}°F` };
      }

      // fahrenheit to celsius
      const fahrenheitMatch = lowerIssue.match(/(\d+(?:\.\d+)?)\s*(?:°?f|fahrenheit)\s*to\s*(?:°?c|celsius)/);
      if (fahrenheitMatch && fahrenheitMatch[1]) {
        const f = parseFloat(fahrenheitMatch[1]);
        const c = ((f - 32) * 5) / 9;
        return { success: true, output: `${f}°F = ${c.toFixed(1)}°C` };
      }

      return {
        success: false,
        output: '',
        error: 'Unit conversion pattern not recognized',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unit conversion failed',
      };
    }
  }
}
