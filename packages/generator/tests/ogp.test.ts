/**
 * OGP Generator Tests
 * REQ-MEDIA-004: サムネイル・OGP生成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OGPGenerator,
  createOGPGenerator,
  OGPSvgBuilder,
  PLATFORM_CONFIGS,
  THEME_STYLES,
  DEFAULT_OGP_OPTIONS,
  OGPGeneratorError,
  OGP_ERROR_CODES,
  type OGPContent,
  type OGPOptions,
  type Platform,
  type AspectRatio,
  type OGPTheme,
} from '../src/ogp/index.js';

describe('OGPGenerator', () => {
  let generator: OGPGenerator;

  beforeEach(() => {
    generator = new OGPGenerator();
  });

  describe('generate', () => {
    it('should generate basic OGP image', async () => {
      const content: OGPContent = {
        title: 'Test Title',
      };

      const result = await generator.generate(content);

      expect(result).toBeDefined();
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('</svg>');
      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.format).toBe('svg');
    });

    it('should generate OGP with custom dimensions', async () => {
      const content: OGPContent = { title: 'Test' };
      const options: OGPOptions = { width: 800, height: 400 };

      const result = await generator.generate(content, options);

      expect(result.width).toBe(800);
      expect(result.height).toBe(400);
      expect(result.svg).toContain('width="800"');
      expect(result.svg).toContain('height="400"');
    });

    it('should generate OGP with description', async () => {
      const content: OGPContent = {
        title: 'Main Title',
        description: 'This is a description',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('Main Title');
      expect(result.svg).toContain('This is a description');
      expect(result.metadata).toHaveProperty('description', 'This is a description');
    });

    it('should generate OGP with author', async () => {
      const content: OGPContent = {
        title: 'Test',
        author: 'John Doe',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('John Doe');
      expect(result.metadata).toHaveProperty('author', 'John Doe');
    });

    it('should generate OGP with site name', async () => {
      const content: OGPContent = {
        title: 'Test',
        siteName: 'Example Site',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('Example Site');
      expect(result.metadata).toHaveProperty('siteName', 'Example Site');
    });

    it('should generate OGP with tags', async () => {
      const content: OGPContent = {
        title: 'Test',
        tags: ['typescript', 'nodejs'],
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('#typescript');
      expect(result.svg).toContain('#nodejs');
    });

    it('should generate OGP with emoji', async () => {
      const content: OGPContent = {
        title: 'Test',
        emoji: '🚀',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('🚀');
    });

    it('should generate OGP with date', async () => {
      const content: OGPContent = {
        title: 'Test',
        date: '2025-01-10',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('2025-01-10');
    });

    it('should generate OGP with read time', async () => {
      const content: OGPContent = {
        title: 'Test',
        readTime: '5 min read',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('5 min read');
    });

    it('should include metadata', async () => {
      const content: OGPContent = { title: 'Test' };

      const result = await generator.generate(content);

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('title', 'Test');
      expect(result.metadata).toHaveProperty('width', 1200);
      expect(result.metadata).toHaveProperty('height', 630);
      expect(result.metadata).toHaveProperty('generatedAt');
    });

    it('should throw error for missing content', async () => {
      await expect(generator.generate(null as unknown as OGPContent))
        .rejects.toThrow(OGPGeneratorError);
    });

    it('should throw error for empty title', async () => {
      const content: OGPContent = { title: '' };

      await expect(generator.generate(content))
        .rejects.toThrow(OGPGeneratorError);
    });

    it('should throw error for whitespace-only title', async () => {
      const content: OGPContent = { title: '   ' };

      await expect(generator.generate(content))
        .rejects.toThrow(OGPGeneratorError);
    });
  });

  describe('generateForPlatform', () => {
    it('should generate OGP for Twitter', async () => {
      const content: OGPContent = { title: 'Twitter Post' };

      const result = await generator.generateForPlatform(content, 'twitter');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(628);
      expect(result.metadata).toHaveProperty('platform', 'Twitter/X');
      expect(result.metadata).toHaveProperty('platformId', 'twitter');
    });

    it('should generate OGP for Facebook', async () => {
      const content: OGPContent = { title: 'Facebook Post' };

      const result = await generator.generateForPlatform(content, 'facebook');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.metadata).toHaveProperty('platform', 'Facebook');
    });

    it('should generate OGP for LinkedIn', async () => {
      const content: OGPContent = { title: 'LinkedIn Post' };

      const result = await generator.generateForPlatform(content, 'linkedin');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(627);
      expect(result.metadata).toHaveProperty('platform', 'LinkedIn');
    });

    it('should generate OGP for Discord', async () => {
      const content: OGPContent = { title: 'Discord Embed' };

      const result = await generator.generateForPlatform(content, 'discord');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.metadata).toHaveProperty('platform', 'Discord');
    });

    it('should generate OGP for Slack', async () => {
      const content: OGPContent = { title: 'Slack Message' };

      const result = await generator.generateForPlatform(content, 'slack');

      expect(result.width).toBe(800);
      expect(result.height).toBe(418);
      expect(result.metadata).toHaveProperty('platform', 'Slack');
    });

    it('should generate OGP for Qiita', async () => {
      const content: OGPContent = { title: 'Qiita記事' };

      const result = await generator.generateForPlatform(content, 'qiita');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.metadata).toHaveProperty('platform', 'Qiita');
    });

    it('should generate OGP for Zenn', async () => {
      const content: OGPContent = { title: 'Zenn記事' };

      const result = await generator.generateForPlatform(content, 'zenn');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.metadata).toHaveProperty('platform', 'Zenn');
    });

    it('should generate OGP for note', async () => {
      const content: OGPContent = { title: 'note記事' };

      const result = await generator.generateForPlatform(content, 'note');

      expect(result.width).toBe(1280);
      expect(result.height).toBe(670);
      expect(result.metadata).toHaveProperty('platform', 'note');
    });

    it('should generate OGP for generic platform', async () => {
      const content: OGPContent = { title: 'Generic' };

      const result = await generator.generateForPlatform(content, 'generic');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.metadata).toHaveProperty('platform', 'Generic');
    });

    it('should throw error for invalid platform', async () => {
      const content: OGPContent = { title: 'Test' };

      await expect(
        generator.generateForPlatform(content, 'invalid' as Platform)
      ).rejects.toThrow(OGPGeneratorError);
    });
  });

  describe('generateForPlatforms', () => {
    it('should generate OGP for multiple platforms', async () => {
      const content: OGPContent = { title: 'Multi-platform Post' };
      const platforms: Platform[] = ['twitter', 'facebook', 'linkedin'];

      const results = await generator.generateForPlatforms(content, platforms);

      expect(results.size).toBe(3);
      expect(results.has('twitter')).toBe(true);
      expect(results.has('facebook')).toBe(true);
      expect(results.has('linkedin')).toBe(true);
    });

    it('should generate with correct dimensions for each platform', async () => {
      const content: OGPContent = { title: 'Test' };
      const platforms: Platform[] = ['twitter', 'note'];

      const results = await generator.generateForPlatforms(content, platforms);

      const twitter = results.get('twitter')!;
      const note = results.get('note')!;

      expect(twitter.width).toBe(1200);
      expect(twitter.height).toBe(628);
      expect(note.width).toBe(1280);
      expect(note.height).toBe(670);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate 16:9 thumbnail', async () => {
      const content: OGPContent = { title: 'Thumbnail Test' };

      const result = await generator.generateThumbnail(content, '16:9');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(675);
      expect(result.metadata).toHaveProperty('aspectRatio', '16:9');
      expect(result.metadata).toHaveProperty('isThumbnail', true);
    });

    it('should generate 1:1 thumbnail', async () => {
      const content: OGPContent = { title: 'Square' };

      const result = await generator.generateThumbnail(content, '1:1');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(1200);
      expect(result.metadata).toHaveProperty('aspectRatio', '1:1');
    });

    it('should generate 4:3 thumbnail', async () => {
      const content: OGPContent = { title: 'Standard' };

      const result = await generator.generateThumbnail(content, '4:3');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(900);
      expect(result.metadata).toHaveProperty('aspectRatio', '4:3');
    });

    it('should generate 2:1 thumbnail', async () => {
      const content: OGPContent = { title: 'Wide' };

      const result = await generator.generateThumbnail(content, '2:1');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(600);
      expect(result.metadata).toHaveProperty('aspectRatio', '2:1');
    });

    it('should generate 1.91:1 thumbnail', async () => {
      const content: OGPContent = { title: 'OGP Standard' };

      const result = await generator.generateThumbnail(content, '1.91:1');

      expect(result.width).toBe(1200);
      expect(result.height).toBe(628);
      expect(result.metadata).toHaveProperty('aspectRatio', '1.91:1');
    });

    it('should generate thumbnail with custom base width', async () => {
      const content: OGPContent = { title: 'Custom Width' };

      const result = await generator.generateThumbnail(content, '16:9', { width: 800 });

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });
  });

  describe('generateThumbnails', () => {
    it('should generate thumbnails for multiple aspect ratios', async () => {
      const content: OGPContent = { title: 'Multi-size' };
      const ratios: AspectRatio[] = ['16:9', '1:1', '4:3'];

      const results = await generator.generateThumbnails(content, ratios);

      expect(results.size).toBe(3);
      expect(results.has('16:9')).toBe(true);
      expect(results.has('1:1')).toBe(true);
      expect(results.has('4:3')).toBe(true);
    });
  });

  describe('themes', () => {
    it('should generate OGP with default theme', async () => {
      const content: OGPContent = { title: 'Default Theme' };

      const result = await generator.generate(content, { theme: 'default' });

      expect(result.svg).toContain('#ffffff'); // default background
      expect(result.metadata).toHaveProperty('theme', 'default');
    });

    it('should generate OGP with dark theme', async () => {
      const content: OGPContent = { title: 'Dark Theme' };

      const result = await generator.generate(content, { theme: 'dark' });

      expect(result.svg).toContain('#0a0a0a'); // dark background
      expect(result.metadata).toHaveProperty('theme', 'dark');
    });

    it('should generate OGP with light theme', async () => {
      const content: OGPContent = { title: 'Light Theme' };

      const result = await generator.generate(content, { theme: 'light' });

      expect(result.svg).toContain('#f8fafc'); // light background
      expect(result.metadata).toHaveProperty('theme', 'light');
    });

    it('should generate OGP with gradient theme', async () => {
      const content: OGPContent = { title: 'Gradient Theme' };

      const result = await generator.generate(content, { theme: 'gradient' });

      expect(result.svg).toContain('linearGradient');
      expect(result.metadata).toHaveProperty('theme', 'gradient');
    });

    it('should generate OGP with minimal theme', async () => {
      const content: OGPContent = { title: 'Minimal Theme' };

      const result = await generator.generate(content, { theme: 'minimal' });

      expect(result.metadata).toHaveProperty('theme', 'minimal');
    });

    it('should generate OGP with vibrant theme', async () => {
      const content: OGPContent = { title: 'Vibrant Theme' };

      const result = await generator.generate(content, { theme: 'vibrant' });

      expect(result.svg).toContain('linearGradient');
      expect(result.metadata).toHaveProperty('theme', 'vibrant');
    });
  });

  describe('generateThemePreviews', () => {
    it('should generate previews for multiple themes', async () => {
      const content: OGPContent = { title: 'Theme Preview' };
      const themes: OGPTheme[] = ['default', 'dark', 'gradient'];

      const results = await generator.generateThemePreviews(content, themes);

      expect(results.size).toBe(3);
      expect(results.has('default')).toBe(true);
      expect(results.has('dark')).toBe(true);
      expect(results.has('gradient')).toBe(true);
    });
  });

  describe('decorations', () => {
    it('should add dots decoration', async () => {
      const content: OGPContent = { title: 'With Dots' };

      const result = await generator.generate(content, { decoration: 'dots' });

      expect(result.svg).toContain('<circle');
    });

    it('should add lines decoration', async () => {
      const content: OGPContent = { title: 'With Lines' };

      const result = await generator.generate(content, { decoration: 'lines' });

      expect(result.svg).toContain('<line');
    });

    it('should add circles decoration', async () => {
      const content: OGPContent = { title: 'With Circles' };

      const result = await generator.generate(content, { decoration: 'circles' });

      expect(result.svg).toContain('<circle');
    });

    it('should add corner decoration', async () => {
      const content: OGPContent = { title: 'With Corner' };

      const result = await generator.generate(content, { decoration: 'corner' });

      expect(result.svg).toContain('<path');
    });
  });

  describe('custom style', () => {
    it('should apply custom background color', async () => {
      const content: OGPContent = { title: 'Custom' };
      const options: OGPOptions = {
        customStyle: {
          backgroundColor: '#ff0000',
        },
      };

      const result = await generator.generate(content, options);

      expect(result.svg).toContain('#ff0000');
    });

    it('should apply custom text color', async () => {
      const content: OGPContent = { title: 'Custom Text' };
      const options: OGPOptions = {
        customStyle: {
          textColor: '#00ff00',
        },
      };

      const result = await generator.generate(content, options);

      expect(result.svg).toContain('#00ff00');
    });

    it('should apply custom font size', async () => {
      const content: OGPContent = { title: 'Big Title' };
      const options: OGPOptions = {
        customStyle: {
          titleFontSize: 80,
        },
      };

      const result = await generator.generate(content, options);

      expect(result.svg).toContain('font-size="80"');
    });

    it('should apply custom gradient', async () => {
      const content: OGPContent = { title: 'Custom Gradient' };
      const options: OGPOptions = {
        customStyle: {
          gradientFrom: '#ff0000',
          gradientTo: '#0000ff',
        },
      };

      const result = await generator.generate(content, options);

      expect(result.svg).toContain('#ff0000');
      expect(result.svg).toContain('#0000ff');
    });
  });

  describe('footer options', () => {
    it('should hide footer when showFooter is false', async () => {
      const content: OGPContent = {
        title: 'No Footer',
        author: 'Should not show',
      };
      const options: OGPOptions = { showFooter: false };

      const result = await generator.generate(content, options);

      // Author should still be in metadata but not prominently in footer area
      expect(result.metadata).toHaveProperty('author', 'Should not show');
    });

    it('should show footer by default', async () => {
      const content: OGPContent = {
        title: 'With Footer',
        author: 'Author Name',
        siteName: 'Site Name',
      };

      const result = await generator.generate(content);

      expect(result.svg).toContain('Author Name');
      expect(result.svg).toContain('Site Name');
    });
  });

  describe('utility methods', () => {
    it('should get platform config', () => {
      const config = generator.getPlatformConfig('twitter');

      expect(config.name).toBe('Twitter/X');
      expect(config.width).toBe(1200);
      expect(config.height).toBe(628);
      expect(config.aspectRatio).toBe('1.91:1');
    });

    it('should get available platforms', () => {
      const platforms = generator.getAvailablePlatforms();

      expect(platforms).toContain('twitter');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('linkedin');
      expect(platforms).toContain('qiita');
      expect(platforms).toContain('zenn');
      expect(platforms).toContain('note');
      expect(platforms.length).toBe(9);
    });

    it('should get available themes', () => {
      const themes = generator.getAvailableThemes();

      expect(themes).toContain('default');
      expect(themes).toContain('dark');
      expect(themes).toContain('light');
      expect(themes).toContain('gradient');
      expect(themes).toContain('minimal');
      expect(themes).toContain('vibrant');
      expect(themes).toContain('custom');
      expect(themes.length).toBe(7);
    });
  });

  describe('createOGPGenerator factory', () => {
    it('should create generator with default options', () => {
      const gen = createOGPGenerator();
      expect(gen).toBeInstanceOf(OGPGenerator);
    });

    it('should create generator with custom default options', async () => {
      const gen = createOGPGenerator({ theme: 'dark', width: 800, height: 400 });
      const content: OGPContent = { title: 'Test' };

      const result = await gen.generate(content);

      expect(result.width).toBe(800);
      expect(result.height).toBe(400);
      expect(result.metadata).toHaveProperty('theme', 'dark');
    });
  });
});

describe('OGPSvgBuilder', () => {
  describe('construction', () => {
    it('should create builder with default theme', () => {
      const builder = new OGPSvgBuilder(1200, 630);
      builder.addHeader();
      builder.addBackground();
      const svg = builder.build();

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should create builder with dark theme', () => {
      const builder = new OGPSvgBuilder(1200, 630, 'dark');
      builder.addHeader();
      builder.addBackground();
      const svg = builder.build();

      expect(svg).toContain('#0a0a0a');
    });

    it('should create builder with gradient theme', () => {
      const builder = new OGPSvgBuilder(1200, 630, 'gradient');
      builder.addHeader();
      builder.addBackground();
      const svg = builder.build();

      expect(svg).toContain('linearGradient');
    });
  });

  describe('content', () => {
    it('should add content with title', () => {
      const builder = new OGPSvgBuilder(1200, 630);
      builder.addHeader();
      builder.addBackground();
      builder.addContent({ title: 'Hello World' });
      const svg = builder.build();

      expect(svg).toContain('Hello World');
    });

    it('should escape XML characters', () => {
      const builder = new OGPSvgBuilder(1200, 630);
      builder.addHeader();
      builder.addBackground();
      builder.addContent({ title: 'Test <script> & "quotes"' });
      const svg = builder.build();

      expect(svg).toContain('&lt;script&gt;');
      expect(svg).toContain('&amp;');
      expect(svg).toContain('&quot;');
    });
  });

  describe('decorations', () => {
    it('should add dot pattern', () => {
      const builder = new OGPSvgBuilder(1200, 630);
      builder.addHeader();
      builder.addBackground();
      builder.addDecoration('dots');
      const svg = builder.build();

      expect(svg).toContain('<circle');
    });

    it('should add line pattern', () => {
      const builder = new OGPSvgBuilder(1200, 630);
      builder.addHeader();
      builder.addBackground();
      builder.addDecoration('lines');
      const svg = builder.build();

      expect(svg).toContain('<line');
    });
  });
});

describe('Constants', () => {
  describe('PLATFORM_CONFIGS', () => {
    it('should have correct Twitter config', () => {
      expect(PLATFORM_CONFIGS.twitter.width).toBe(1200);
      expect(PLATFORM_CONFIGS.twitter.height).toBe(628);
    });

    it('should have correct Facebook config', () => {
      expect(PLATFORM_CONFIGS.facebook.width).toBe(1200);
      expect(PLATFORM_CONFIGS.facebook.height).toBe(630);
    });

    it('should have correct note config', () => {
      expect(PLATFORM_CONFIGS.note.width).toBe(1280);
      expect(PLATFORM_CONFIGS.note.height).toBe(670);
    });
  });

  describe('THEME_STYLES', () => {
    it('should have default theme', () => {
      expect(THEME_STYLES.default.backgroundColor).toBe('#ffffff');
      expect(THEME_STYLES.default.textColor).toBe('#1a1a1a');
    });

    it('should have dark theme', () => {
      expect(THEME_STYLES.dark.backgroundColor).toBe('#0a0a0a');
      expect(THEME_STYLES.dark.textColor).toBe('#ffffff');
    });

    it('should have gradient theme with gradient colors', () => {
      expect(THEME_STYLES.gradient.gradientFrom).toBeDefined();
      expect(THEME_STYLES.gradient.gradientTo).toBeDefined();
    });
  });

  describe('DEFAULT_OGP_OPTIONS', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_OGP_OPTIONS.width).toBe(1200);
      expect(DEFAULT_OGP_OPTIONS.height).toBe(630);
      expect(DEFAULT_OGP_OPTIONS.theme).toBe('default');
      expect(DEFAULT_OGP_OPTIONS.format).toBe('svg');
    });
  });

  describe('OGP_ERROR_CODES', () => {
    it('should have all error codes', () => {
      expect(OGP_ERROR_CODES.INVALID_CONTENT).toBe('OGP_INVALID_CONTENT');
      expect(OGP_ERROR_CODES.INVALID_PLATFORM).toBe('OGP_INVALID_PLATFORM');
      expect(OGP_ERROR_CODES.INVALID_DIMENSIONS).toBe('OGP_INVALID_DIMENSIONS');
      expect(OGP_ERROR_CODES.RENDER_ERROR).toBe('OGP_RENDER_ERROR');
    });
  });
});

describe('OGPGeneratorError', () => {
  it('should create error with code and message', () => {
    const error = new OGPGeneratorError('TEST_CODE', 'Test message');

    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('OGPGeneratorError');
  });
});
