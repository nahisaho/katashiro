/**
 * Prompt Manager - プロンプトテンプレート管理
 *
 * @requirement REQ-LLM-002
 * @design DES-KATASHIRO-003-LLM §3.2
 */

import type { PromptTemplate, Message } from './types.js';

/**
 * テンプレート変数
 */
export type TemplateVariables = Record<string, unknown>;

/**
 * PromptManager - プロンプトテンプレート管理
 */
export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();

  /**
   * テンプレート登録
   */
  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * テンプレート取得
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * テンプレート一覧取得
   */
  list(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * テンプレート削除
   */
  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * テンプレートをレンダリング
   */
  render(id: string, variables: TemplateVariables = {}): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return this.renderTemplate(template, variables);
  }

  /**
   * テンプレートをメッセージとしてレンダリング
   */
  renderAsMessage(
    id: string,
    variables: TemplateVariables = {},
    role: Message['role'] = 'user'
  ): Message {
    const content = this.render(id, variables);
    return { role, content };
  }

  /**
   * 複数テンプレートをチェーン
   */
  chain(
    templateIds: string[],
    variables: TemplateVariables = {},
    separator = '\n\n'
  ): string {
    return templateIds
      .map((id) => this.render(id, variables))
      .join(separator);
  }

  /**
   * テンプレート文字列をレンダリング（直接）
   */
  renderString(template: string, variables: TemplateVariables = {}): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      if (value === undefined) {
        return `{{${key}}}`;
      }
      return String(value);
    });
  }

  /**
   * テンプレートをレンダリング（内部）
   */
  private renderTemplate(
    template: PromptTemplate,
    variables: TemplateVariables
  ): string {
    // 必須変数のチェック
    for (const varDef of template.variables) {
      if (varDef.required && variables[varDef.name] === undefined) {
        if (varDef.default !== undefined) {
          variables[varDef.name] = varDef.default;
        } else {
          throw new Error(
            `Missing required variable: ${varDef.name} for template: ${template.id}`
          );
        }
      }
    }

    // デフォルト値の適用
    for (const varDef of template.variables) {
      if (variables[varDef.name] === undefined && varDef.default !== undefined) {
        variables[varDef.name] = varDef.default;
      }
    }

    // テンプレートのレンダリング
    return this.renderString(template.template, variables);
  }

  /**
   * クリア
   */
  clear(): void {
    this.templates.clear();
  }
}

// シングルトン
let promptManagerInstance: PromptManager | null = null;

/**
 * PromptManager シングルトン取得
 */
export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager();
  }
  return promptManagerInstance;
}

/**
 * PromptManager リセット（テスト用）
 */
export function resetPromptManager(): void {
  promptManagerInstance = null;
}
