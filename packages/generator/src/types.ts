/**
 * Generator型定義
 */

import type { ContentType, URL } from '@nahisaho/katashiro-core';

export interface GenerationOptions {
  readonly type: ContentType;
  readonly maxLength?: number;
  readonly style?: string;
  readonly tone?: 'formal' | 'casual' | 'technical';
  readonly includeImages?: boolean;
  readonly includeToc?: boolean;
}

export interface Outline {
  readonly title: string;
  readonly sections: OutlineSection[];
}

export interface OutlineSection {
  readonly heading: string;
  readonly level: number;
  readonly points?: string[];
  readonly subsections?: OutlineSection[];
}

export interface Citation {
  readonly id: string;
  readonly source: URL;
  readonly title: string;
  readonly author?: string;
  readonly date?: string;
  readonly accessedAt: string;
  readonly formatted: string;
}

export interface ChartConfig {
  readonly type: 'bar' | 'line' | 'pie' | 'scatter' | 'mermaid';
  readonly title?: string;
  readonly xLabel?: string;
  readonly yLabel?: string;
  readonly colors?: string[];
  readonly width?: number;
  readonly height?: number;
}

export type PlatformFormat = 'markdown' | 'html' | 'qiita' | 'zenn' | 'note' | 'medium';
