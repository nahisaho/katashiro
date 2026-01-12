/**
 * Knowledge型定義
 */

import type { ID, Timestamp, URL, Source } from '@nahisaho/katashiro-core';

export type LLMProvider = 'claude' | 'openai' | 'gemini' | 'ollama';

export interface LLMConfig {
  readonly provider?: LLMProvider;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly systemPrompt?: string;
}

export interface LLMResponse {
  readonly text: string;
  readonly provider: LLMProvider;
  readonly model: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly latency: number;
}

export interface TrackedSource extends Source {
  readonly contentHash: string;
  readonly usageCount: number;
  readonly lastUsedAt: Timestamp;
}

export interface KnowledgeEntity {
  readonly id: ID;
  readonly type: string;
  readonly label: string;
  readonly properties: Record<string, unknown>;
  readonly relations: KnowledgeRelation[];
  readonly sources: URL[];
  readonly createdAt: Timestamp;
}

export interface KnowledgeRelation {
  readonly predicate: string;
  readonly object: ID | string;
  readonly confidence: number;
}
