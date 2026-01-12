/**
 * Generatorインターフェース定義
 */

import type { Result, Content, Source } from '@nahisaho/katashiro-core';
import type { GenerationOptions, Outline, Citation, ChartConfig, PlatformFormat } from './types.js';

export interface IContentGenerator {
  generate(sources: Source[], options?: GenerationOptions): Promise<Result<Content, Error>>;
}

export interface ICitationManager {
  createCitation(source: Source, style?: string): Citation;
  formatReferences(citations: Citation[]): string;
}

export interface IOutlineGenerator {
  generate(topic: string, depth?: number): Promise<Result<Outline, Error>>;
}

export interface ISummaryGenerator {
  generate(content: Content, maxLength?: number): Promise<Result<string, Error>>;
}

export interface ITranslationGenerator {
  translate(content: string, targetLang: string): Promise<Result<string, Error>>;
}

export interface IChartGenerator {
  generate(data: unknown, config: ChartConfig): Promise<Result<string, Error>>;
}

export interface IPlatformFormatter {
  format(content: Content, platform: PlatformFormat): string;
}
