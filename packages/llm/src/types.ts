/**
 * LLM Package Types
 *
 * @requirement REQ-LLM-001, REQ-LLM-005, REQ-LLM-006
 * @design DES-KATASHIRO-003-LLM §3.1
 */

import type { ZodType, z } from 'zod';

/**
 * メッセージロール
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * コンテンツパート（マルチモーダル対応）
 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

/**
 * ツール呼び出し
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * ツール定義
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * メッセージ
 */
export interface Message {
  role: MessageRole;
  content: string | ContentPart[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/**
 * ツール選択オプション
 */
export type ToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };

/**
 * レスポンスフォーマット
 */
export interface ResponseFormat {
  type: 'text' | 'json_object';
}

/**
 * 生成リクエスト
 */
export interface GenerateRequest {
  /** モデル名 */
  model?: string;
  /** メッセージ履歴 */
  messages: Message[];
  /** 温度パラメータ (0-2) */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** Top-P サンプリング */
  topP?: number;
  /** 停止シーケンス */
  stopSequences?: string[];
  /** ツール定義 */
  tools?: ToolDefinition[];
  /** ツール選択 */
  toolChoice?: ToolChoice;
  /** レスポンスフォーマット */
  responseFormat?: ResponseFormat;
  /** ユーザーID（監査用） */
  user?: string;
}

/**
 * トークン使用量
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 終了理由
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter';

/**
 * 生成レスポンス
 */
export interface GenerateResponse {
  /** レスポンスID */
  id: string;
  /** 使用モデル */
  model: string;
  /** 生成テキスト */
  content: string;
  /** ツール呼び出し */
  toolCalls?: ToolCall[];
  /** トークン使用量 */
  usage: TokenUsage;
  /** 終了理由 */
  finishReason: FinishReason;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * ストリームチャンク
 */
export interface StreamChunk {
  type: 'content' | 'tool_call' | 'usage' | 'done';
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: TokenUsage;
}

/**
 * LLMプロバイダーインターフェース
 */
export interface LLMProvider {
  /** プロバイダー名 */
  readonly name: string;
  /** サポートモデル */
  readonly supportedModels: string[];

  /**
   * テキスト生成
   */
  generate(request: GenerateRequest): Promise<GenerateResponse>;

  /**
   * ストリーミング生成
   */
  generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;

  /**
   * 構造化出力生成
   */
  generateStructured<T extends ZodType>(
    request: GenerateRequest,
    schema: T
  ): Promise<z.infer<T>>;

  /**
   * トークン数カウント
   */
  countTokens(text: string, model?: string): Promise<number>;
}

/**
 * プロバイダー設定
 */
export interface ProviderConfig {
  /** APIキー */
  apiKey?: string;
  /** ベースURL */
  baseURL?: string;
  /** デフォルトモデル */
  defaultModel?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 最大リトライ回数 */
  maxRetries?: number;
}

/**
 * LLMクライアント設定
 */
export interface LLMClientConfig {
  /** プライマリプロバイダー */
  provider: LLMProvider;
  /** フォールバックプロバイダー */
  fallbackProviders?: LLMProvider[];
  /** セマンティックキャッシュ有効化 */
  enableCache?: boolean;
  /** キャッシュTTL（ミリ秒） */
  cacheTTL?: number;
  /** 自動リトライ有効化 */
  enableRetry?: boolean;
  /** リトライ回数 */
  retryCount?: number;
  /** リトライ遅延（ミリ秒） */
  retryDelay?: number;
}

/**
 * プロンプトテンプレート
 */
export interface PromptTemplate {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** テンプレート内容 */
  template: string;
  /** 変数定義 */
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    default?: unknown;
    description?: string;
  }>;
  /** 説明 */
  description?: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T = GenerateResponse> {
  /** キー（ハッシュ） */
  key: string;
  /** 値 */
  value: T;
  /** 作成日時 */
  createdAt: Date;
  /** 有効期限 */
  expiresAt: Date;
  /** ヒット数 */
  hits: number;
  /** 類似度スコア（セマンティックキャッシュ用） */
  similarity?: number;
}

/**
 * フォールバック結果
 */
export interface FallbackResult {
  /** 成功プロバイダー */
  provider: string;
  /** 試行プロバイダー */
  attemptedProviders: string[];
  /** エラー履歴 */
  errors: Array<{
    provider: string;
    error: Error;
    timestamp: Date;
  }>;
}
