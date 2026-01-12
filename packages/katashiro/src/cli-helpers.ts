/**
 * CLI Helper Functions
 * Extracted for better testability
 *
 * @requirement REQ-CLI-001
 */

import { generateId, formatTimestamp } from './index.js';
import type { Content } from './index.js';

/**
 * CLI用にContentオブジェクトを作成
 */
export function createContent(title: string, body: string, url: string = ''): Content {
  return {
    id: generateId('CLI'),
    type: 'article',
    title,
    body,
    sources: url ? [{
      id: generateId('SRC'),
      url,
      metadata: { title },
      fetchedAt: formatTimestamp()
    }] : [],
    createdAt: formatTimestamp(),
    updatedAt: formatTimestamp(),
  };
}

/**
 * 出力フォーマット検証
 */
export function isValidFormat(format: string): format is 'json' | 'text' {
  return format === 'json' || format === 'text';
}

/**
 * 検索プロバイダー検証
 */
export function isValidProvider(provider: string): provider is 'duckduckgo' | 'searxng' {
  return provider === 'duckduckgo' || provider === 'searxng';
}

/**
 * 数値オプションのパース
 */
export function parseNumberOption(value: string, defaultValue: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

/**
 * テキスト出力のフォーマット
 */
export function formatSearchResult(result: { title: string; url: string; snippet?: string }): string {
  let output = `📄 ${result.title}\n`;
  output += `   ${result.url}\n`;
  if (result.snippet) {
    output += `   ${result.snippet.substring(0, 100)}...\n`;
  }
  return output;
}

/**
 * エラーメッセージのフォーマット
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * テキストを省略表示
 */
export function truncateText(text: string, maxLength: number): { text: string; omitted: number } {
  if (text.length <= maxLength) {
    return { text, omitted: 0 };
  }
  return {
    text: text.substring(0, maxLength),
    omitted: text.length - maxLength
  };
}
