/**
 * Analyzer型定義
 *
 * @requirement REQ-ANALYZE-001 ~ REQ-ANALYZE-011
 */

import type { ID, Timestamp } from '@nahisaho/katashiro-core';

export interface Summary {
  readonly id: ID;
  readonly text: string;
  readonly keyPoints: string[];
  readonly wordCount: number;
  readonly createdAt: Timestamp;
}

export interface FactCheckResult {
  readonly claim: string;
  readonly verdict: 'true' | 'false' | 'partially_true' | 'unverifiable';
  readonly confidence: number;
  readonly explanation: string;
  readonly sources: string[];
}

export interface BiasReport {
  readonly overallBias: 'left' | 'center' | 'right' | 'unknown';
  readonly biasScore: number; // -1 (left) to 1 (right)
  readonly indicators: BiasIndicator[];
}

export interface BiasIndicator {
  readonly type: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

export interface Contradiction {
  readonly claim1: string;
  readonly claim2: string;
  readonly source1: string;
  readonly source2: string;
  readonly severity: 'minor' | 'major' | 'critical';
  readonly explanation: string;
}

export interface TrendData {
  readonly topic: string;
  readonly timeRange: string;
  readonly dataPoints: TrendPoint[];
  readonly analysis: string;
}

export interface TrendPoint {
  readonly timestamp: Timestamp;
  readonly value: number;
  readonly label?: string;
}

export interface SentimentResult {
  readonly sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  readonly score: number; // -1 to 1
  readonly confidence: number;
  readonly aspects: AspectSentiment[];
}

export interface AspectSentiment {
  readonly aspect: string;
  readonly sentiment: 'positive' | 'negative' | 'neutral';
  readonly score: number;
}

export interface MoAResponse {
  readonly answer: string;
  readonly confidence: number;
  readonly providerResponses: ProviderResponse[];
  readonly consensusLevel: 'high' | 'medium' | 'low';
  readonly contradictions?: string[];
}

export interface ProviderResponse {
  readonly provider: string;
  readonly response: string;
  readonly confidence: number;
  readonly latency: number;
}
