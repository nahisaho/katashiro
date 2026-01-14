/**
 * OpenAI LLM Provider
 *
 * OpenAI API provider for chat completions
 *
 * @requirement REQ-LLM-001
 * @design DES-KATASHIRO-003-LLM
 */

import type { z, ZodType } from 'zod';
import type {
  ProviderConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
  Message,
  TokenUsage,
  ToolCall,
  ToolDefinition,
  FinishReason,
} from '../types.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

/**
 * OpenAI設定
 */
export interface OpenAIProviderConfig extends ProviderConfig {
  /** APIキー */
  apiKey?: string;
  /** ベースURL（カスタムエンドポイント用） */
  baseUrl?: string;
  /** モデル名 */
  model?: string;
  /** 組織ID */
  organization?: string;
}

/**
 * OpenAIメッセージ形式
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * OpenAI Chat Completion レスポンス
 */
interface OpenAIChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Stream Chunk
 */
interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI LLMプロバイダー
 *
 * OpenAI API（またはOpenAI互換API）を使用したテキスト生成
 *
 * @example
 * ```typescript
 * // OpenAI API
 * const provider = new OpenAILLMProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o',
 * });
 *
 * // OpenAI互換API（vLLM, LM Studio等）
 * const localProvider = new OpenAILLMProvider({
 *   baseUrl: 'http://localhost:8000/v1',
 *   model: 'local-model',
 * });
 * ```
 */
export class OpenAILLMProvider extends BaseLLMProvider {
  readonly name = 'openai';
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1',
    'o1-mini',
    'o1-preview',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly organization?: string;

  constructor(config: OpenAIProviderConfig = {}) {
    super(config);

    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model ?? config.defaultModel ?? 'gpt-4o-mini';
    this.organization = config.organization;
  }

  protected getDefaultModel(): string {
    return 'gpt-4o-mini';
  }

  /**
   * メッセージ形式変換
   */
  private convertMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map((msg) => {
      const converted: OpenAIMessage = {
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      };

      if (msg.name) converted.name = msg.name;
      if (msg.toolCallId) converted.tool_call_id = msg.toolCallId;
      if (msg.toolCalls) {
        converted.tool_calls = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        }));
      }

      return converted;
    });
  }

  /**
   * ツール定義変換
   */
  private convertTools(tools?: ToolDefinition[]): unknown[] | undefined {
    if (!tools) return undefined;

    return tools.map((tool) => ({
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }

  /**
   * Finish Reason変換
   */
  private convertFinishReason(
    reason: string | null
  ): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * テキスト生成
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const model = request.model ?? this.model;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const body: Record<string, unknown> = {
      model,
      messages: this.convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stop: request.stopSequences,
      user: request.user,
    };

    if (request.tools) {
      body.tools = this.convertTools(request.tools);
      body.tool_choice = request.toolChoice;
    }

    if (request.responseFormat) {
      body.response_format = {
        type: request.responseFormat.type,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 30000
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new Error('No choices returned from OpenAI API');
      }

      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map(
        (tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        })
      );

      const usage: TokenUsage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };

      return {
        id: data.id,
        model: data.model,
        content: choice.message.content ?? '',
        toolCalls,
        usage,
        finishReason: this.convertFinishReason(choice.finish_reason),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ストリーミング生成
   */
  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;
    const model = request.model ?? this.model;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const body: Record<string, unknown> = {
      model,
      messages: this.convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stop: request.stopSequences,
      user: request.user,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (request.tools) {
      body.tools = this.convertTools(request.tools);
      body.tool_choice = request.toolChoice;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // ツール呼び出しを累積
    const toolCallsMap = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done' };
            continue;
          }

          try {
            const chunk = JSON.parse(data) as OpenAIStreamChunk;
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              yield {
                type: 'content',
                content: delta.content,
              };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCallsMap.get(tc.index) ?? {
                  id: '',
                  name: '',
                  arguments: '',
                };
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) {
                  existing.arguments += tc.function.arguments;
                }
                toolCallsMap.set(tc.index, existing);
              }
            }

            if (chunk.usage) {
              yield {
                type: 'usage',
                usage: {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                },
              };
            }

            // ツール呼び出し完了時
            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason === 'tool_calls') {
              for (const [, tc] of toolCallsMap) {
                yield {
                  type: 'tool_call',
                  toolCall: {
                    id: tc.id,
                    type: 'function',
                    function: {
                      name: tc.name,
                      arguments: tc.arguments,
                    },
                  },
                };
              }
            }
          } catch {
            // JSON parse error - skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 構造化出力生成
   */
  override async generateStructured<T extends ZodType>(
    request: GenerateRequest,
    schema: T
  ): Promise<z.infer<T>> {
    const jsonSchema = this.zodToJsonSchema(schema);

    const enhancedRequest: GenerateRequest = {
      ...request,
      responseFormat: { type: 'json_object' },
      messages: [
        ...request.messages,
        {
          role: 'user',
          content: `Respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
        },
      ],
    };

    const response = await this.generate(enhancedRequest);
    const parsed = JSON.parse(response.content);
    return schema.parse(parsed);
  }

  /**
   * トークン数カウント（近似）
   */
  override async countTokens(text: string, _model?: string): Promise<number> {
    // tiktoken互換の近似計算
    // 英語: ~4文字/トークン, 日本語: ~2文字/トークン
    const englishChars = text.replace(/[^\x00-\x7F]/g, '').length;
    const nonEnglishChars = text.length - englishChars;
    return Math.ceil(englishChars / 4 + nonEnglishChars / 2);
  }
}

/**
 * OpenAI互換プロバイダー（ファクトリ関数）
 */
export function createOpenAICompatibleLLMProvider(
  baseUrl: string,
  model: string,
  config: Partial<OpenAIProviderConfig> = {}
): OpenAILLMProvider {
  return new OpenAILLMProvider({
    ...config,
    baseUrl,
    model,
    apiKey: config.apiKey ?? 'not-required',
  });
}
