/**
 * Embedding module exports
 */

// Manager
export { EmbeddingManager } from './EmbeddingManager.js';

// Base
export { BaseEmbeddingProvider } from './BaseEmbeddingProvider.js';

// Providers
export { MockEmbeddingProvider } from './MockEmbeddingProvider.js';
export type { MockEmbeddingProviderConfig } from './MockEmbeddingProvider.js';

export { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider.js';
export type { OllamaEmbeddingConfig } from './OllamaEmbeddingProvider.js';

export { OpenAIEmbeddingProvider, createOpenAICompatibleEmbeddingProvider } from './OpenAIEmbeddingProvider.js';
export type { OpenAIEmbeddingConfig } from './OpenAIEmbeddingProvider.js';

export { AzureOpenAIEmbeddingProvider } from './AzureOpenAIEmbeddingProvider.js';
export type { AzureOpenAIEmbeddingConfig } from './AzureOpenAIEmbeddingProvider.js';

// Factory
export {
  EmbeddingFactory,
  createEmbeddingProvider,
  getDefaultEmbeddingProvider,
} from './EmbeddingFactory.js';
export type {
  EmbeddingProviderType,
  EmbeddingProviderConfigMap,
} from './EmbeddingFactory.js';
