/**
 * PromptRegistry - プロンプト登録・管理
 *
 * MCPプロンプトの登録と実行を管理
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-062
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';

/**
 * Prompt argument definition
 */
export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

/**
 * Registered prompt
 */
export interface RegisteredPrompt {
  name: string;
  description: string;
  template: string;
  arguments?: PromptArgument[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
}

/**
 * PromptRegistry
 *
 * Manages MCP prompt registration and rendering
 */
export class PromptRegistry {
  private prompts: Map<string, RegisteredPrompt> = new Map();

  /**
   * Register a prompt
   *
   * @param prompt - Prompt to register
   * @returns Result
   */
  register(prompt: RegisteredPrompt): Result<void, Error> {
    try {
      if (this.prompts.has(prompt.name)) {
        return err(new Error(`Prompt already registered: ${prompt.name}`));
      }
      this.prompts.set(prompt.name, prompt);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get a registered prompt
   *
   * @param name - Prompt name
   * @returns Prompt or null
   */
  get(name: string): Result<RegisteredPrompt | null, Error> {
    try {
      return ok(this.prompts.get(name) ?? null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List all registered prompts
   *
   * @returns Array of prompts
   */
  list(): Result<RegisteredPrompt[], Error> {
    try {
      return ok(Array.from(this.prompts.values()));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Render a prompt with arguments
   *
   * @param name - Prompt name
   * @param args - Arguments to fill in
   * @returns Rendered template
   */
  render(name: string, args: Record<string, string>): Result<string, Error> {
    try {
      const prompt = this.prompts.get(name);
      if (!prompt) {
        return err(new Error(`Unknown prompt: ${name}`));
      }

      let rendered = prompt.template;
      for (const [key, value] of Object.entries(args)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      return ok(rendered);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate arguments for a prompt
   *
   * @param name - Prompt name
   * @param args - Arguments to validate
   * @returns Validation result
   */
  validate(
    name: string,
    args: Record<string, unknown>
  ): Result<ValidationResult, Error> {
    try {
      const prompt = this.prompts.get(name);
      if (!prompt) {
        return err(new Error(`Unknown prompt: ${name}`));
      }

      const missing: string[] = [];
      const extra: string[] = [];

      // Check for missing required arguments
      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (arg.required && !(arg.name in args)) {
            missing.push(arg.name);
          }
        }

        // Check for extra arguments
        const validNames = new Set(prompt.arguments.map((a) => a.name));
        for (const key of Object.keys(args)) {
          if (!validNames.has(key)) {
            extra.push(key);
          }
        }
      }

      return ok({
        valid: missing.length === 0,
        missing,
        extra,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unregister a prompt
   *
   * @param name - Prompt name
   * @returns Whether unregistered
   */
  unregister(name: string): Result<boolean, Error> {
    try {
      return ok(this.prompts.delete(name));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if prompt exists
   *
   * @param name - Prompt name
   * @returns Whether exists
   */
  has(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Clear all prompts
   */
  clear(): void {
    this.prompts.clear();
  }
}
