/**
 * Azure OpenAI LLM Provider
 *
 * Azure OpenAI Service provider for chat completions
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
 * Azure OpenAI設定
 */
export interface AzureOpenAIProviderConfig extends ProviderConfig {
  /** Azure OpenAI エンドポイント */
  endpoint?: string;
  /** APIキー */
  apiKey?: string;
  /** デプロイメント名 */
  deploymentName?: string;
  /** APIバージョン */
  apiVersion?: string;
}

/**
 * Azure OpenAIメッセージ形式
 */
interface AzureMessage {
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
 * Azure Chat Completion レスポンス
 */
interface AzureChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: AzureMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Azure Stream Chunk
 */
interface AzureStreamChunk {
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
 * Azure OpenAI LLMプロバイダー
 *
 * Azure OpenAI Serviceを使用したテキスト生成
 *
 * @example
 * ```typescript
 * const provider = new AzureOpenAILLMProvider({
 *   endpoint: 'https://your-resource.openai.azure.com',
 *   apiKey: process.env.AZURE_OPENAI_API_KEY,
 *   deploymentName: 'gpt-4o',
 *   apiVersion: '2024-02-15-preview',
 * });
 *
 * const response = await provider.generate({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export class AzureOpenAILLMProvider extends BaseLLMProvider {
  readonly name = 'azure-openai';
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-35-turbo',
  ];

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;
  private readonly apiVersion: string;

  constructor(config: AzureOpenAIProviderConfig = {}) {
    super(config);

    this.endpoint = config.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? '';
    this.apiKey = config.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? '';
    this.deploymentName =
      config.deploymentName ??
      process.env.AZURE_OPENAI_DEPLOYMENT ??
      config.defaultModel ??
      '';
    this.apiVersion = config.apiVersion ?? '2024-02-15-preview';

    // 設定検証
    if (!this.endpoint) {
      throw new Error(
        'Azure OpenAI endpoint is required. Set AZURE_OPENAI_ENDPOINT or provide endpoint in config.'
      );
    }
    if (!this.apiKey) {
      throw new Error(
        'Azure OpenAI API key is required. Set AZURE_OPENAI_API_KEY or provide apiKey in config.'
      );
    }
    if (!this.deploymentName) {
      throw new Error(
        'Azure OpenAI deployment name is required. Set AZURE_OPENAI_DEPLOYMENT or provide deploymentName in config.'
      );
    }
  }

  protected getDefaultModel(): string {
    return this.deploymentName;
  }

  /**
   * メッセージ形式変換
   */
  private convertMessages(messages: Message[]): AzureMessage[] {
    return messages.map((msg) => {
      const converted: AzureMessage = {
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
  private convertFinishReason(reason: string | null): FinishReason {
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
    const baseUrl = this.endpoint.endsWith('/')
      ? this.endpoint.slice(0, -1)
      : this.endpoint;

    const url = `${baseUrl}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };

    const body: Record<string, unknown> = {
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
        throw new Error(
          `Azure OpenAI API error: ${response.status} - ${errorText}`
        );
      }

      const data = (await response.json()) as AzureChatResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new Error('No choices returned from Azure OpenAI API');
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
    const baseUrl = this.endpoint.endsWith('/')
      ? this.endpoint.slice(0, -1)
      : this.endpoint;

    const url = `${baseUrl}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };

    const body: Record<string, unknown> = {
      messages: this.convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stop: request.stopSequences,
      user: request.user,
      stream: true,
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
      throw new Error(
        `Azure OpenAI API error: ${response.status} - ${errorText}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
            const chunk = JSON.parse(data) as AzureStreamChunk;
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
    const englishChars = text.replace(/[^\x00-\x7F]/g, '').length;
    const nonEnglishChars = text.length - englishChars;
    return Math.ceil(englishChars / 4 + nonEnglishChars / 2);
  }
}
