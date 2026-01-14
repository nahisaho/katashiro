/**
 * Ollama LLM Provider
 *
 * Local LLM provider using Ollama
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
} from '../types.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

/**
 * Ollama設定
 */
export interface OllamaProviderConfig extends ProviderConfig {
  /** ベースURL（デフォルト: http://localhost:11434） */
  baseUrl?: string;
  /** モデル名（デフォルト: llama3.2） */
  model?: string;
  /** Keep Alive（モデルをメモリに保持する時間） */
  keepAlive?: string;
}

/**
 * Ollamaメッセージ形式
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ollama Chat APIレスポンス
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama LLMプロバイダー
 *
 * ローカルでOllamaを使用したテキスト生成
 *
 * @example
 * ```typescript
 * const provider = new OllamaLLMProvider({
 *   baseUrl: 'http://192.168.224.1:11434',
 *   model: 'llama3.2',
 * });
 *
 * const response = await provider.generate({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export class OllamaLLMProvider extends BaseLLMProvider {
  readonly name = 'ollama';
  readonly supportedModels = [
    'llama3.2',
    'llama3.2:1b',
    'llama3.2:3b',
    'llama3.1',
    'llama3.1:8b',
    'llama3.1:70b',
    'qwen2.5',
    'qwen2.5:7b',
    'qwen2.5:14b',
    'qwen2.5:32b',
    'qwen2.5-coder',
    'mistral',
    'mixtral',
    'gemma2',
    'phi3',
    'codellama',
  ];

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly keepAlive: string;

  constructor(config: OllamaProviderConfig = {}) {
    super(config);

    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? config.defaultModel ?? 'llama3.2';
    this.keepAlive = config.keepAlive ?? '5m';
  }

  protected getDefaultModel(): string {
    return 'llama3.2';
  }

  /**
   * メッセージ形式変換
   */
  private convertMessages(messages: Message[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'tool' ? 'assistant' : msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
  }

  /**
   * テキスト生成
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.baseUrl}/api/chat`;
    const model = request.model ?? this.model;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 30000
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: this.convertMessages(request.messages),
          stream: false,
          keep_alive: this.keepAlive,
          options: {
            temperature: request.temperature ?? 0.7,
            top_p: request.topP,
            num_predict: request.maxTokens,
            stop: request.stopSequences,
          },
          format: request.responseFormat?.type === 'json_object' ? 'json' : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OllamaChatResponse;

      // トークン数推定
      const usage: TokenUsage = {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      };

      return {
        id: `ollama-${Date.now()}`,
        model: data.model,
        content: data.message.content,
        usage,
        finishReason: 'stop',
        metadata: {
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ストリーミング生成
   */
  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.baseUrl}/api/chat`;
    const model = request.model ?? this.model;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: this.convertMessages(request.messages),
        stream: true,
        keep_alive: this.keepAlive,
        options: {
          temperature: request.temperature ?? 0.7,
          top_p: request.topP,
          num_predict: request.maxTokens,
          stop: request.stopSequences,
        },
        format: request.responseFormat?.type === 'json_object' ? 'json' : undefined,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line) as OllamaChatResponse;

            if (chunk.message?.content) {
              yield {
                type: 'content',
                content: chunk.message.content,
              };
            }

            if (chunk.done) {
              yield {
                type: 'usage',
                usage: {
                  promptTokens: chunk.prompt_eval_count ?? 0,
                  completionTokens: chunk.eval_count ?? 0,
                  totalTokens:
                    (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? 0),
                },
              };
              yield { type: 'done' };
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
   * 構造化出力生成（Ollama JSON mode）
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
   * 利用可能なモデル一覧取得
   */
  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/api/tags`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    interface OllamaTagsResponse {
      models: Array<{ name: string; model: string }>;
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return data.models.map((m) => m.name);
  }

  /**
   * モデルの存在確認
   */
  async isModelAvailable(modelName?: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some((m) => m.includes(modelName ?? this.model));
    } catch {
      return false;
    }
  }
}
