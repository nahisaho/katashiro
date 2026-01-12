/**
 * TemplateEngine - テンプレートエンジン
 *
 * @requirement REQ-GEN-004
 * @design DES-KATASHIRO-001 §2.3 Generator Container
 * @task TSK-034
 */

/**
 * テンプレート
 */
export interface Template {
  readonly name: string;
  readonly content: string;
  readonly description?: string;
}

/**
 * ヘルパー関数型
 */
export type HelperFunction = (value: unknown, ...args: unknown[]) => string;

/**
 * テンプレートエンジン実装
 */
export class TemplateEngine {
  private templates: Map<string, string> = new Map();
  private helpers: Map<string, HelperFunction> = new Map();

  constructor() {
    this.registerBuiltInHelpers();
    this.registerBuiltInTemplates();
  }

  /**
   * テンプレートをレンダリング
   */
  render(template: string, data: Record<string, unknown>): string {
    let result = template;

    // Process conditionals first
    result = this.processConditionals(result, data);

    // Process each loops
    result = this.processEachLoops(result, data);

    // Process helpers
    result = this.processHelpers(result, data);

    // Process simple variables
    result = this.processVariables(result, data);

    return result;
  }

  /**
   * 名前付きテンプレートをレンダリング
   */
  renderNamed(name: string, data: Record<string, unknown>): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    return this.render(template, data);
  }

  /**
   * テンプレートを登録
   */
  registerTemplate(name: string, content: string): void {
    this.templates.set(name, content);
  }

  /**
   * ヘルパーを登録
   */
  registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn);
  }

  /**
   * ビルトインテンプレート一覧
   */
  getBuiltInTemplates(): Template[] {
    return [
      {
        name: 'report',
        content: '# {{title}}\n\n{{body}}\n\n## 参考文献\n{{references}}',
        description: 'Basic report template',
      },
      {
        name: 'summary',
        content: '## {{title}}\n\n{{summary}}',
        description: 'Summary template',
      },
      {
        name: 'bullet-list',
        content: '{{#each items}}• {{this}}\n{{/each}}',
        description: 'Bullet list template',
      },
    ];
  }

  /**
   * 条件分岐を処理
   */
  private processConditionals(template: string, data: Record<string, unknown>): string {
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(ifRegex, (_, key, content) => {
      const value = this.getValue(data, key);
      return value ? content : '';
    });
  }

  /**
   * eachループを処理
   */
  private processEachLoops(template: string, data: Record<string, unknown>): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(eachRegex, (_, key, content) => {
      const array = this.getValue(data, key);
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map(item => {
        let itemContent = content;
        // Replace {{this}} with current item
        itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        // Replace {{@index}} with current index
        return itemContent;
      }).join('');
    });
  }

  /**
   * ヘルパーを処理
   */
  private processHelpers(template: string, data: Record<string, unknown>): string {
    const helperRegex = /\{\{(\w+)\s+(\w+(?:\.\w+)*)\}\}/g;
    
    return template.replace(helperRegex, (match, helperName, key) => {
      const helper = this.helpers.get(helperName);
      if (!helper) {
        return match; // Not a helper, leave as is
      }

      const value = this.getValue(data, key);
      return helper(value);
    });
  }

  /**
   * 変数を処理
   */
  private processVariables(template: string, data: Record<string, unknown>): string {
    const varRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
    
    return template.replace(varRegex, (_, key) => {
      const value = this.getValue(data, key);
      if (value === undefined) return '';
      // Normalize escape sequences in string values
      return this.normalizeEscapes(String(value));
    });
  }

  /**
   * エスケープ文字を正規化
   * @since 0.2.11 - \nを実際の改行に変換
   */
  private normalizeEscapes(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  }

  /**
   * ネストしたオブジェクトから値を取得
   */
  private getValue(data: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = data;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[key];
    }

    return value;
  }

  /**
   * ビルトインヘルパーを登録
   */
  private registerBuiltInHelpers(): void {
    this.helpers.set('upper', (v) => String(v).toUpperCase());
    this.helpers.set('lower', (v) => String(v).toLowerCase());
    this.helpers.set('capitalize', (v) => {
      const s = String(v);
      return s.charAt(0).toUpperCase() + s.slice(1);
    });
    this.helpers.set('trim', (v) => String(v).trim());
  }

  /**
   * ビルトインテンプレートを登録
   */
  private registerBuiltInTemplates(): void {
    for (const t of this.getBuiltInTemplates()) {
      this.templates.set(t.name, t.content);
    }
  }
}
