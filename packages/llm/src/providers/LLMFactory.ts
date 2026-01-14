/**
 * LLM Provider Factory
 *
 * Esperanto-style factory for creating LLM providers
 *
 * @requirement REQ-LLM-001
 * @design DES-KATASHIRO-003-LLM
 */

import type { LLMProvider, ProviderConfig } from '../types.js';
import { MockLLMProvider } from './MockLLMProvider.js';
import { OllamaLLMProvider } from './OllamaLLMProvider.js';
import type { OllamaProviderConfig } from './OllamaLLMProvider.js';
import { OpenAILLMProvider } from './OpenAILLMProvider.js';
import type { OpenAIProviderConfig } from './OpenAILLMProvider.js';
import { AzureOpenAILLMProvider } from './AzureOpenAILLMProvider.js';
import type { AzureOpenAIProviderConfig } from './AzureOpenAILLMProvider.js';

/**
 * プロバイダータイプ
 */
export type LLMProviderType =
  | 'mock'
  | 'ollama'
  | 'openai'
  | 'openai-compatible'
  | 'azure-openai';

/**
 * プロバイダー設定マップ
 */
export interface LLMProviderConfigMap {
  mock: ProviderConfig;
  ollama: OllamaProviderConfig;
  openai: OpenAIProviderConfig;
  'openai-compatible': OpenAIProviderConfig;
  'azure-openai': AzureOpenAIProviderConfig;
}

/**
 * 環境変数から設定を取得
 */
function getConfigFromEnv(
  provider: LLMProviderType
): Partial<LLMProviderConfigMap[LLMProviderType]> {
  switch (provider) {
    case 'ollama':
      return {
        baseUrl: process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST,
        model: process.env.OLLAMA_MODEL,
      };

    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
      };

    case 'openai-compatible':
      return {
        apiKey:
          process.env.OPENAI_COMPATIBLE_API_KEY_LLM ??
          process.env.OPENAI_COMPATIBLE_API_KEY,
        baseUrl:
          process.env.OPENAI_COMPATIBLE_BASE_URL_LLM ??
          process.env.OPENAI_COMPATIBLE_BASE_URL,
      };

    case 'azure-openai':
      return {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      };

    default:
      return {};
  }
}

/**
 * LLM Provider Factory
 *
 * Esperantoスタイルのファクトリクラス
 *
 * @example
 * ```typescript
 * // 利用可能なプロバイダーを確認
 * const providers = LLMFactory.getAvailableProviders();
 *
 * // プロバイダーを作成
 * const provider = LLMFactory.create('ollama', {
 *   baseUrl: 'http://192.168.224.1:11434',
 *   model: 'llama3.2',
 * });
 *
 * // または環境変数から自動設定
 * const provider = LLMFactory.create('openai');
 * ```
 */
export class LLMFactory {
  /**
   * プロバイダー作成
   */
  static create<T extends LLMProviderType>(
    provider: T,
    config?: Partial<LLMProviderConfigMap[T]>
  ): LLMProvider {
    // 環境変数からの設定とマージ
    const envConfig = getConfigFromEnv(provider);
    const mergedConfig = { ...envConfig, ...config };

    switch (provider) {
      case 'mock':
        return new MockLLMProvider(mergedConfig as unknown as import('./MockLLMProvider.js').MockProviderConfig);

      case 'ollama':
        return new OllamaLLMProvider(mergedConfig as OllamaProviderConfig);

      case 'openai':
      case 'openai-compatible':
        return new OpenAILLMProvider(mergedConfig as OpenAIProviderConfig);

      case 'azure-openai':
        return new AzureOpenAILLMProvider(
          mergedConfig as AzureOpenAIProviderConfig
        );

      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  static getAvailableProviders(): LLMProviderType[] {
    return ['mock', 'ollama', 'openai', 'openai-compatible', 'azure-openai'];
  }

  /**
   * デフォルトプロバイダー取得
   *
   * 環境変数から自動判定
   */
  static getDefaultProvider(): LLMProvider {
    // 優先順位: AZURE > OPENAI > OLLAMA > MOCK
    if (
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY
    ) {
      return this.create('azure-openai');
    }

    if (process.env.OPENAI_API_KEY) {
      return this.create('openai');
    }

    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
      return this.create('ollama');
    }

    // フォールバック: モック
    return this.create('mock');
  }

  /**
   * プロバイダーの利用可能確認
   */
  static isProviderConfigured(provider: LLMProviderType): boolean {
    switch (provider) {
      case 'mock':
        return true;

      case 'ollama':
        return !!(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST);

      case 'openai':
        return !!process.env.OPENAI_API_KEY;

      case 'openai-compatible':
        return !!(
          process.env.OPENAI_COMPATIBLE_BASE_URL_LLM ||
          process.env.OPENAI_COMPATIBLE_BASE_URL
        );

      case 'azure-openai':
        return !!(
          process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
        );

      default:
        return false;
    }
  }
}

/**
 * 便利関数: LLMプロバイダー作成
 */
export function createLLMProvider<T extends LLMProviderType>(
  provider: T,
  config?: Partial<LLMProviderConfigMap[T]>
): LLMProvider {
  return LLMFactory.create(provider, config);
}

/**
 * 便利関数: デフォルトプロバイダー取得
 */
export function getDefaultLLMProvider(): LLMProvider {
  return LLMFactory.getDefaultProvider();
}
