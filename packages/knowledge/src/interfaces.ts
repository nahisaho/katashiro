/**
 * Knowledgeインターフェース定義
 */

import type { Result, Source, ID } from '@nahisaho/katashiro-core';
import type { LLMConfig, LLMResponse, TrackedSource, KnowledgeEntity } from './types.js';

export interface ILLMProvider {
  complete(prompt: string, config?: LLMConfig): Promise<Result<LLMResponse, Error>>;
  stream(prompt: string, config?: LLMConfig): AsyncIterable<string>;
}

export interface ISourceTracker {
  track(source: Source): Promise<Result<TrackedSource, Error>>;
  get(id: ID): Promise<Result<TrackedSource | null, Error>>;
  list(): Promise<Result<TrackedSource[], Error>>;
}

export interface IYATAClient {
  store(entity: KnowledgeEntity): Promise<Result<void, Error>>;
  query(sparql: string): Promise<Result<unknown[], Error>>;
  infer(subject: string, predicate: string): Promise<Result<string[], Error>>;
}
