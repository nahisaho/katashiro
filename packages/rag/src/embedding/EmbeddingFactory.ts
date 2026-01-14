/**
 * Embedding Provider Factory
 *
 * Esperanto-style factory for creating embedding providers
 *
 * @requirement REQ-RAG-001
 * @design DES-KATASHIRO-003-RAG
 */

import type { EmbeddingProvider, EmbeddingConfig } from '../types.js';
import { MockEmbeddingProvider } from './MockEmbeddingProvider.js';
import type { MockEmbeddingProviderConfig } from './MockEmbeddingProvider.js';
import { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider.js';
import type { OllamaEmbeddingConfig } from './OllamaEmbeddingProvider.js';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider.js';
import type { OpenAIEmbeddingConfig } from './OpenAIEmbeddingProvider.js';
import { AzureOpenAIEmbeddingProvider } from './AzureOpenAIEmbeddingProvider.js';
import type { AzureOpenAIEmbeddingConfig } from './AzureOpenAIEmbeddingProvider.js';

/**
 * プロバイダータイプ
 */
export type EmbeddingProviderType =
  | 'mock'
  | 'ollama'
  | 'openai'
  | 'openai-compatible'
  | 'azure-openai';

/**
 * プロバイダー設定マップ
 */
export interface EmbeddingProviderConfigMap {
  mock: EmbeddingConfig;
  ollama: OllamaEmbeddingConfig;
  openai: OpenAIEmbeddingConfig;
  'openai-compatible': OpenAIEmbeddingConfig;
  'azure-openai': AzureOpenAIEmbeddingConfig;
}

/**
 * 環境変数から設定を取得
 */
function getConfigFromEnv(
  provider: EmbeddingProviderType
): Partial<EmbeddingProviderConfigMap[EmbeddingProviderType]> {
  switch (provider) {
    case 'ollama':
      return {
        baseUrl: process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST,
        model: process.env.OLLAMA_EMBEDDING_MODEL,
      };

    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_EMBEDDING_MODEL,
      };

    case 'openai-compatible':
      return {
        apiKey:
          process.env.OPENAI_COMPATIBLE_API_KEY_EMBEDDING ??
          process.env.OPENAI_COMPATIBLE_API_KEY,
        baseUrl:
          process.env.OPENAI_COMPATIBLE_BASE_URL_EMBEDDING ??
          process.env.OPENAI_COMPATIBLE_BASE_URL,
      };

    case 'azure-openai':
      return {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      };

    default:
      return {};
  }
}

/**
 * Embedding Provider Factory
 *
 * Esperantoスタイルのファクトリクラス
 *
 * @example
 * ```typescript
 * // 利用可能なプロバイダーを確認
 * const providers = EmbeddingFactory.getAvailableProviders();
 *
 * // プロバイダーを作成
 * const provider = EmbeddingFactory.create('ollama', {
 *   baseUrl: 'http://192.168.224.1:11434',
 *   model: 'nomic-embed-text',
 * });
 *
 * // または環境変数から自動設定
 * const provider = EmbeddingFactory.create('openai');
 * ```
 */
export class EmbeddingFactory {
  /**
   * プロバイダー作成
   */
  static create<T extends EmbeddingProviderType>(
    provider: T,
    config?: Partial<EmbeddingProviderConfigMap[T]>
  ): EmbeddingProvider {
    // 環境変数からの設定とマージ
    const envConfig = getConfigFromEnv(provider);
    const mergedConfig = { ...envConfig, ...config };

    switch (provider) {
      case 'mock':
        return new MockEmbeddingProvider({
          dimensions: (mergedConfig as MockEmbeddingProviderConfig).dimensions ?? 1536,
          delay: (mergedConfig as MockEmbeddingProviderConfig).delay ?? 0,
          shouldFail: (mergedConfig as MockEmbeddingProviderConfig).shouldFail ?? false,
        });

      case 'ollama':
        return new OllamaEmbeddingProvider(
          mergedConfig as OllamaEmbeddingConfig
        );

      case 'openai':
      case 'openai-compatible':
        return new OpenAIEmbeddingProvider(
          mergedConfig as OpenAIEmbeddingConfig
        );

      case 'azure-openai':
        return new AzureOpenAIEmbeddingProvider(
          mergedConfig as AzureOpenAIEmbeddingConfig
        );

      default:
        throw new Error(`Unknown embedding provider: ${provider}`);
    }
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  static getAvailableProviders(): EmbeddingProviderType[] {
    return ['mock', 'ollama', 'openai', 'openai-compatible', 'azure-openai'];
  }

  /**
   * デフォルトプロバイダー取得
   *
   * 環境変数から自動判定
   */
  static getDefaultProvider(): EmbeddingProvider {
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
  static isProviderConfigured(provider: EmbeddingProviderType): boolean {
    switch (provider) {
      case 'mock':
        return true;

      case 'ollama':
        return !!(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST);

      case 'openai':
        return !!process.env.OPENAI_API_KEY;

      case 'openai-compatible':
        return !!(
          process.env.OPENAI_COMPATIBLE_BASE_URL_EMBEDDING ||
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
 * 便利関数: Embeddingプロバイダー作成
 */
export function createEmbeddingProvider<T extends EmbeddingProviderType>(
  provider: T,
  config?: Partial<EmbeddingProviderConfigMap[T]>
): EmbeddingProvider {
  return EmbeddingFactory.create(provider, config);
}

/**
 * 便利関数: デフォルトプロバイダー取得
 */
export function getDefaultEmbeddingProvider(): EmbeddingProvider {
  return EmbeddingFactory.getDefaultProvider();
}
