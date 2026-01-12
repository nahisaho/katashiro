/**
 * Analyzerインターフェース定義
 *
 * @requirement REQ-ANALYZE-001 ~ REQ-ANALYZE-011
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 */

import type { Result, Content } from '@nahisaho/katashiro-core';
import type {
  Summary,
  FactCheckResult,
  BiasReport,
  Contradiction,
  TrendData,
  SentimentResult,
  MoAResponse,
} from './types.js';

/** @requirement REQ-ANALYZE-001 */
export interface ISummarizer {
  summarize(content: Content, maxLength?: number): Promise<Result<Summary, Error>>;
}

/** @requirement REQ-ANALYZE-002 */
export interface IFactChecker {
  check(claim: string, sources: Content[]): Promise<Result<FactCheckResult, Error>>;
}

/** @requirement REQ-ANALYZE-003 */
export interface IBiasDetector {
  detect(content: Content): Promise<Result<BiasReport, Error>>;
}

/** @requirement REQ-ANALYZE-004 */
export interface IContradictionDetector {
  findContradictions(contents: Content[]): Promise<Result<Contradiction[], Error>>;
}

/** @requirement REQ-ANALYZE-005 */
export interface ITrendAnalyzer {
  analyze(topic: string, timeRange: string): Promise<Result<TrendData, Error>>;
}

/** @requirement REQ-ANALYZE-006 */
export interface ISentimentAnalyzer {
  analyze(content: Content): Promise<Result<SentimentResult, Error>>;
}

/** @requirement REQ-ANALYZE-011 */
export interface IMoAEngine {
  query(prompt: string, providers?: string[]): Promise<Result<MoAResponse, Error>>;
}
