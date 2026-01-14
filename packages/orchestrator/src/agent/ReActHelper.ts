/**
 * ReAct Helper
 *
 * ReAct（Reasoning + Acting）パターンの出力をパースするヘルパー
 *
 * @requirement REQ-AGENT-004
 */

import type { AgentAction } from './types.js';

/**
 * ReAct出力のパース結果
 */
export interface ReActParseResult {
  /** パース成功したか */
  success: boolean;
  /** 抽出されたアクション */
  actions: ReActStep[];
  /** 最終回答（存在する場合） */
  finalAnswer?: string;
  /** パースエラー */
  errors: string[];
  /** 生のテキスト */
  rawText: string;
}

/**
 * ReActステップ
 */
export interface ReActStep {
  /** ステップ番号 */
  step: number;
  /** 思考（Thought） */
  thought?: string;
  /** アクション（Action） */
  action?: {
    tool: string;
    input: string | Record<string, unknown>;
  };
  /** 観察（Observation） */
  observation?: string;
  /** 最終回答 */
  finalAnswer?: string;
}

/**
 * ReActフォーマット設定
 */
export interface ReActFormatConfig {
  /** 思考のプレフィックス */
  thoughtPrefix?: string;
  /** アクションのプレフィックス */
  actionPrefix?: string;
  /** アクション入力のプレフィックス */
  actionInputPrefix?: string;
  /** 観察のプレフィックス */
  observationPrefix?: string;
  /** 最終回答のプレフィックス */
  finalAnswerPrefix?: string;
  /** 大文字小文字を区別しない */
  caseInsensitive?: boolean;
}

/**
 * デフォルトのReActフォーマット
 */
export const DEFAULT_REACT_FORMAT: Required<ReActFormatConfig> = {
  thoughtPrefix: 'Thought:',
  actionPrefix: 'Action:',
  actionInputPrefix: 'Action Input:',
  observationPrefix: 'Observation:',
  finalAnswerPrefix: 'Final Answer:',
  caseInsensitive: true,
};

/**
 * ReActプロンプトテンプレート
 */
export const REACT_SYSTEM_PROMPT = `You are an AI assistant that uses the ReAct (Reasoning and Acting) pattern.

For each step, you should:
1. **Thought**: Think about what you need to do next
2. **Action**: Choose a tool to use
3. **Action Input**: Provide the input for the tool
4. **Observation**: (This will be filled in with the tool's output)

Continue this process until you can provide a final answer.

When you have enough information to answer the question, respond with:
Final Answer: [your answer]

Format your response as:
Thought: [your reasoning]
Action: [tool name]
Action Input: [tool input]

Available tools:
{tools}
`;

/**
 * ReActヘルパー
 */
export class ReActHelper {
  private config: Required<ReActFormatConfig>;

  constructor(config: ReActFormatConfig = {}) {
    this.config = { ...DEFAULT_REACT_FORMAT, ...config };
  }

  /**
   * ReAct形式のテキストをパース
   */
  parse(text: string): ReActParseResult {
    const errors: string[] = [];
    const actions: ReActStep[] = [];
    let finalAnswer: string | undefined;

    const lines = text.split('\n');
    let currentStep: Partial<ReActStep> = {};
    let stepNumber = 1;
    let inActionInput = false;
    let actionInputBuffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      const trimmedLine = line.trim();

      // 空行はスキップ
      if (!trimmedLine) {
        if (inActionInput) {
          actionInputBuffer += '\n';
        }
        continue;
      }

      // 各プレフィックスをチェック
      if (this.matchesPrefix(trimmedLine, this.config.thoughtPrefix)) {
        // 前のステップを保存
        if (Object.keys(currentStep).length > 0) {
          if (inActionInput && currentStep.action) {
            currentStep.action.input = this.parseActionInput(
              actionInputBuffer.trim(),
            );
            inActionInput = false;
            actionInputBuffer = '';
          }
          actions.push({ step: stepNumber++, ...currentStep } as ReActStep);
          currentStep = {};
        }

        currentStep.thought = this.extractValue(
          trimmedLine,
          this.config.thoughtPrefix,
        );
      } else if (this.matchesPrefix(trimmedLine, this.config.actionPrefix)) {
        if (inActionInput && currentStep.action) {
          currentStep.action.input = this.parseActionInput(
            actionInputBuffer.trim(),
          );
          inActionInput = false;
          actionInputBuffer = '';
        }

        const toolName = this.extractValue(
          trimmedLine,
          this.config.actionPrefix,
        );
        currentStep.action = { tool: toolName, input: '' };
      } else if (this.matchesPrefix(trimmedLine, this.config.actionInputPrefix)) {
        const inputValue = this.extractValue(
          trimmedLine,
          this.config.actionInputPrefix,
        );
        if (currentStep.action) {
          // 複数行の入力をサポート
          actionInputBuffer = inputValue;
          inActionInput = true;
        }
      } else if (this.matchesPrefix(trimmedLine, this.config.observationPrefix)) {
        if (inActionInput && currentStep.action) {
          currentStep.action.input = this.parseActionInput(
            actionInputBuffer.trim(),
          );
          inActionInput = false;
          actionInputBuffer = '';
        }

        currentStep.observation = this.extractValue(
          trimmedLine,
          this.config.observationPrefix,
        );
      } else if (this.matchesPrefix(trimmedLine, this.config.finalAnswerPrefix)) {
        if (inActionInput && currentStep.action) {
          currentStep.action.input = this.parseActionInput(
            actionInputBuffer.trim(),
          );
          inActionInput = false;
          actionInputBuffer = '';
        }

        finalAnswer = this.extractValue(
          trimmedLine,
          this.config.finalAnswerPrefix,
        );
        currentStep.finalAnswer = finalAnswer;
      } else if (inActionInput) {
        // Action Inputの継続行
        actionInputBuffer += '\n' + line;
      }
    }

    // 最後のステップを保存
    if (Object.keys(currentStep).length > 0) {
      if (inActionInput && currentStep.action) {
        currentStep.action.input = this.parseActionInput(
          actionInputBuffer.trim(),
        );
      }
      actions.push({ step: stepNumber, ...currentStep } as ReActStep);
    }

    return {
      success: actions.length > 0 || finalAnswer !== undefined,
      actions,
      finalAnswer,
      errors,
      rawText: text,
    };
  }

  /**
   * ReActステップをAgentActionに変換
   */
  toAgentActions(steps: ReActStep[]): AgentAction[] {
    const actions: AgentAction[] = [];
    const now = new Date().toISOString();

    for (const step of steps) {
      // Thoughtアクション
      if (step.thought) {
        actions.push({
          step: step.step,
          timestamp: now,
          type: 'thought',
          content: { thought: step.thought },
        });
      }

      // ツール呼び出しアクション
      if (step.action) {
        actions.push({
          step: step.step,
          timestamp: now,
          type: 'tool_call',
          content: {
            tool: step.action.tool,
            params:
              typeof step.action.input === 'object'
                ? step.action.input
                : { input: step.action.input },
          },
        });
      }

      // 観察アクション
      if (step.observation) {
        actions.push({
          step: step.step,
          timestamp: now,
          type: 'observation',
          content: {
            result: {
              toolName: step.action?.tool ?? 'unknown',
              success: true,
              data: step.observation,
            },
          },
        });
      }

      // 最終回答
      if (step.finalAnswer) {
        actions.push({
          step: step.step,
          timestamp: now,
          type: 'final_answer',
          content: { answer: step.finalAnswer },
        });
      }
    }

    return actions;
  }

  /**
   * AgentActionからReAct形式のテキストを生成
   */
  format(actions: AgentAction[]): string {
    const lines: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case 'thought':
          if (action.content.thought) {
            lines.push(`${this.config.thoughtPrefix} ${action.content.thought}`);
          }
          break;

        case 'tool_call':
          if (action.content.tool) {
            lines.push(`${this.config.actionPrefix} ${action.content.tool}`);
            if (action.content.params) {
              const inputStr =
                Object.keys(action.content.params).length === 1 &&
                'input' in action.content.params
                  ? String(action.content.params.input)
                  : JSON.stringify(action.content.params);
              lines.push(`${this.config.actionInputPrefix} ${inputStr}`);
            }
          }
          break;

        case 'observation':
          if (action.content.result) {
            const obsValue =
              typeof action.content.result.data === 'string'
                ? action.content.result.data
                : JSON.stringify(action.content.result.data);
            lines.push(`${this.config.observationPrefix} ${obsValue}`);
          }
          break;

        case 'final_answer':
          if (action.content.answer) {
            lines.push(`${this.config.finalAnswerPrefix} ${action.content.answer}`);
          }
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * ツール呼び出しを抽出（次のアクションを取得）
   */
  extractNextAction(text: string): {
    tool: string;
    input: string | Record<string, unknown>;
  } | null {
    const result = this.parse(text);

    // 最後のアクションを取得
    for (let i = result.actions.length - 1; i >= 0; i--) {
      const action = result.actions[i];
      if (action?.action) {
        return action.action;
      }
    }

    return null;
  }

  /**
   * 最終回答かどうかを判定
   */
  isFinalAnswer(text: string): boolean {
    return this.matchesPrefix(text.trim(), this.config.finalAnswerPrefix);
  }

  /**
   * 最終回答を抽出
   */
  extractFinalAnswer(text: string): string | null {
    const result = this.parse(text);
    return result.finalAnswer ?? null;
  }

  /**
   * プロンプトにObservationを追加
   */
  appendObservation(prompt: string, observation: string): string {
    return `${prompt}\n${this.config.observationPrefix} ${observation}`;
  }

  /**
   * システムプロンプトを生成
   */
  generateSystemPrompt(
    tools: Array<{ name: string; description: string }>,
  ): string {
    const toolsDescription = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    return REACT_SYSTEM_PROMPT.replace('{tools}', toolsDescription);
  }

  /**
   * プレフィックスマッチ
   */
  private matchesPrefix(text: string, prefix: string): boolean {
    if (this.config.caseInsensitive) {
      return text.toLowerCase().startsWith(prefix.toLowerCase());
    }
    return text.startsWith(prefix);
  }

  /**
   * プレフィックス後の値を抽出
   */
  private extractValue(text: string, prefix: string): string {
    const prefixLen = prefix.length;
    return text.slice(prefixLen).trim();
  }

  /**
   * アクション入力をパース
   */
  private parseActionInput(input: string): string | Record<string, unknown> {
    // JSONとしてパースを試みる
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return input;
    } catch {
      return input;
    }
  }

  /**
   * 設定を取得
   */
  getConfig(): Required<ReActFormatConfig> {
    return { ...this.config };
  }
}

/**
 * シンプルなパースヘルパー
 */
export function parseReActOutput(text: string): ReActParseResult {
  const helper = new ReActHelper();
  return helper.parse(text);
}

/**
 * シンプルな次アクション抽出ヘルパー
 */
export function extractNextReActAction(
  text: string,
): { tool: string; input: string | Record<string, unknown> } | null {
  const helper = new ReActHelper();
  return helper.extractNextAction(text);
}
