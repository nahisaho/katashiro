/**
 * PresentationGenerator - Slide deck generation from content
 *
 * Generates presentation slides from analyzed content
 *
 * @module @nahisaho/katashiro-generator
 * @task TSK-032
 */

import { ok, err, type Result, type Content } from '@nahisaho/katashiro-core';

/**
 * Slide types
 */
export type SlideType =
  | 'title'
  | 'content'
  | 'section'
  | 'summary'
  | 'references'
  | 'blank';

/**
 * Slide structure
 */
export interface Slide {
  /** Slide number */
  number: number;
  /** Slide type */
  type: SlideType;
  /** Slide title */
  title: string;
  /** Slide subtitle (optional) */
  subtitle?: string;
  /** Bullet points */
  bulletPoints?: string[];
  /** Speaker notes */
  notes?: string;
}

/**
 * Presentation structure
 */
export interface Presentation {
  /** Presentation title */
  title: string;
  /** Author */
  author?: string;
  /** Creation date */
  date: string;
  /** Slides */
  slides: Slide[];
}

/**
 * Presentation generation config
 */
export interface PresentationConfig {
  /** Maximum bullet points per slide */
  maxBulletPoints?: number;
  /** Include references slide */
  includeReferences?: boolean;
  /** Include summary slide */
  includeSummary?: boolean;
  /** Author name */
  author?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PresentationConfig> = {
  maxBulletPoints: 5,
  includeReferences: false,
  includeSummary: false,
  author: '',
};

/**
 * PresentationGenerator
 *
 * Generates slide presentations from content
 */
export class PresentationGenerator {
  /**
   * Generate presentation from content
   *
   * @param content - Content to convert
   * @param config - Generation configuration
   * @returns Generated presentation
   */
  async generate(
    content: Content,
    config: PresentationConfig = {}
  ): Promise<Result<Presentation, Error>> {
    try {
      const mergedConfig = { ...DEFAULT_CONFIG, ...config };
      const slides: Slide[] = [];
      let slideNumber = 1;

      // Title slide
      slides.push({
        number: slideNumber++,
        type: 'title',
        title: content.title,
        subtitle: mergedConfig.author || undefined,
        notes: '発表の開始',
      });

      // Parse content into sections
      const sections = this.parseContent(content.body);

      // Generate content slides
      for (const section of sections) {
        // Section header slide
        if (section.level === 1) {
          slides.push({
            number: slideNumber++,
            type: 'section',
            title: section.title,
            notes: `${section.title}セクションの説明`,
          });
        }

        // Content slides
        if (section.content.length > 0) {
          const bulletPoints = this.extractBulletPoints(
            section.content,
            mergedConfig.maxBulletPoints
          );

          if (bulletPoints.length > 0) {
            slides.push({
              number: slideNumber++,
              type: 'content',
              title: section.title,
              bulletPoints,
              notes: section.content.join('\n'),
            });
          }
        }
      }

      // Summary slide
      if (mergedConfig.includeSummary) {
        const summaryPoints = this.generateSummaryPoints(sections);
        slides.push({
          number: slideNumber++,
          type: 'summary',
          title: 'まとめ',
          bulletPoints: summaryPoints.slice(0, mergedConfig.maxBulletPoints),
          notes: '本日の発表のまとめ',
        });
      }

      // References slide
      if (mergedConfig.includeReferences && content.sources.length > 0) {
        const references = content.sources.map((source) => {
          const title = source.metadata?.title ?? source.url;
          return title;
        });

        slides.push({
          number: slideNumber++,
          type: 'references',
          title: '参考文献',
          bulletPoints: references.slice(0, mergedConfig.maxBulletPoints),
          notes: '参考にした資料一覧',
        });
      }

      return ok({
        title: content.title,
        author: mergedConfig.author || undefined,
        date: new Date().toISOString().split('T')[0] ?? '',
        slides,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Convert presentation to Markdown slides format
   *
   * @param presentation - Presentation to convert
   * @returns Markdown string
   */
  toMarkdownSlides(presentation: Presentation): string {
    const parts: string[] = [];

    for (const slide of presentation.slides) {
      parts.push('---');
      parts.push('');

      switch (slide.type) {
        case 'title':
          parts.push(`# ${slide.title}`);
          if (slide.subtitle) {
            parts.push('');
            parts.push(`*${slide.subtitle}*`);
          }
          parts.push('');
          parts.push(`${presentation.date}`);
          break;

        case 'section':
          parts.push(`# ${slide.title}`);
          break;

        case 'content':
        case 'summary':
        case 'references':
          parts.push(`## ${slide.title}`);
          if (slide.bulletPoints) {
            parts.push('');
            slide.bulletPoints.forEach((point) => {
              parts.push(`- ${point}`);
            });
          }
          break;

        case 'blank':
          break;
      }

      parts.push('');
    }

    parts.push('---');

    return parts.join('\n');
  }

  /**
   * Get slide count
   *
   * @param presentation - Presentation
   * @returns Number of slides
   */
  getSlideCount(presentation: Presentation): number {
    return presentation.slides.length;
  }

  /**
   * Estimate presentation duration in minutes
   *
   * @param presentation - Presentation
   * @param minutesPerSlide - Average minutes per slide
   * @returns Estimated duration in minutes
   */
  estimateDuration(presentation: Presentation, minutesPerSlide = 1.5): number {
    return Math.round(presentation.slides.length * minutesPerSlide);
  }

  /**
   * Parse content into sections
   */
  private parseContent(
    body: string
  ): Array<{ level: number; title: string; content: string[] }> {
    const sections: Array<{ level: number; title: string; content: string[] }> =
      [];
    const lines = body.split('\n');

    let currentSection: { level: number; title: string; content: string[] } = {
      level: 0,
      title: '',
      content: [],
    };

    for (const line of lines) {
      // Check for headers
      const h1Match = line.match(/^#\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      if (h1Match?.[1]) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = { level: 1, title: h1Match[1], content: [] };
      } else if (h2Match?.[1]) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = { level: 2, title: h2Match[1], content: [] };
      } else if (h3Match?.[1]) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = { level: 3, title: h3Match[1], content: [] };
      } else if (line.trim()) {
        currentSection.content.push(line.trim());
      }
    }

    if (currentSection.title) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract bullet points from content
   */
  private extractBulletPoints(content: string[], maxPoints: number): string[] {
    const points: string[] = [];

    for (const line of content) {
      // Check if line is a list item
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch?.[1]) {
        points.push(listMatch[1]);
      } else {
        // Convert sentences to points
        const sentences = line.split(/[。.]/);
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (trimmed.length > 5) {
            points.push(trimmed);
          }
        }
      }

      if (points.length >= maxPoints) {
        break;
      }
    }

    return points.slice(0, maxPoints);
  }

  /**
   * Generate summary points from sections
   */
  private generateSummaryPoints(
    sections: Array<{ level: number; title: string; content: string[] }>
  ): string[] {
    return sections
      .filter((s) => s.level === 1)
      .map((s) => s.title)
      .filter((title) => title && !title.includes('はじめに'));
  }
}
