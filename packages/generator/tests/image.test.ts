/**
 * Image Generator Tests
 * REQ-MEDIA-001: 画像生成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImageGenerator,
  createImageGenerator,
  PromptOptimizer,
  optimizePrompt,
  enhancePrompt,
  SIZE_PRESETS,
  STYLE_KEYWORDS,
  QUALITY_KEYWORDS,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_IMAGE_OPTIONS,
  ImageGeneratorError,
  IMAGE_ERROR_CODES,
  type ImageGenerationOptions,
  type ImageInput,
  type ImageStyle,
  type ImageQuality,
} from '../src/image/index.js';

describe('ImageGenerator', () => {
  let generator: ImageGenerator;

  beforeEach(() => {
    generator = new ImageGenerator();
  });

  describe('generate', () => {
    it('should generate basic image', async () => {
      const result = await generator.generate('a beautiful sunset over the ocean');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.dataType).toBe('base64');
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
      expect(result.prompt).toContain('sunset');
    });

    it('should generate image with custom dimensions', async () => {
      const options: ImageGenerationOptions = {
        width: 512,
        height: 768,
      };

      const result = await generator.generate('a cat', options);

      expect(result.width).toBe(512);
      expect(result.height).toBe(768);
    });

    it('should generate image with size preset', async () => {
      const options: ImageGenerationOptions = {
        sizePreset: 'portrait',
      };

      const result = await generator.generate('a portrait', options);

      expect(result.width).toBe(1024);
      expect(result.height).toBe(1792);
    });

    it('should generate image with style', async () => {
      const options: ImageGenerationOptions = {
        style: 'anime',
      };

      const result = await generator.generate('a character', options);

      expect(result.metadata.style).toBe('anime');
    });

    it('should include metadata', async () => {
      const result = await generator.generate('test image');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.model).toBe('mock');
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should optimize prompt when enabled', async () => {
      const options: ImageGenerationOptions = {
        optimizePrompt: true,
        style: 'photorealistic',
        quality: 'hd',
      };

      const result = await generator.generate('a dog', options);

      // プロンプトが最適化されている
      expect(result.prompt.length).toBeGreaterThanOrEqual('a dog'.length);
    });

    it('should skip prompt optimization when disabled', async () => {
      const options: ImageGenerationOptions = {
        optimizePrompt: false,
      };

      const result = await generator.generate('simple prompt', options);

      expect(result.prompt).toBe('simple prompt');
    });

    it('should return revised prompt when optimized', async () => {
      const options: ImageGenerationOptions = {
        optimizePrompt: true,
        style: 'cinematic',
        quality: 'hd',
      };

      const result = await generator.generate('a scene', options);

      // revisedPromptが設定される場合がある
      if (result.revisedPrompt) {
        expect(result.revisedPrompt).not.toBe('a scene');
      }
    });

    it('should throw error for empty prompt', async () => {
      await expect(generator.generate('')).rejects.toThrow(ImageGeneratorError);
    });

    it('should throw error for whitespace-only prompt', async () => {
      await expect(generator.generate('   ')).rejects.toThrow(ImageGeneratorError);
    });

    it('should throw error for too long prompt', async () => {
      const longPrompt = 'a'.repeat(5000);
      await expect(generator.generate(longPrompt)).rejects.toThrow(ImageGeneratorError);
    });
  });

  describe('generateMultiple', () => {
    it('should generate multiple images', async () => {
      const results = await generator.generateMultiple('a flower', 3);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.data).toBeDefined();
        expect(result.prompt).toContain('flower');
      });
    });

    it('should use different seeds for each image', async () => {
      const results = await generator.generateMultiple('test', 2, { seed: 42 });

      expect(results).toHaveLength(2);
      // メタデータのシードが異なることを確認
      const seeds = results.map((r) => r.metadata.seed).filter(Boolean);
      if (seeds.length > 1) {
        expect(new Set(seeds).size).toBeGreaterThan(1);
      }
    });
  });

  describe('generateVariations', () => {
    it('should generate variations of an image', async () => {
      const image: ImageInput = {
        data: 'base64data',
        dataType: 'base64',
      };

      const results = await generator.generateVariations(image, { count: 3 });

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.data).toBeDefined();
      });
    });

    it('should use default count when not specified', async () => {
      const image: ImageInput = {
        data: 'base64data',
        dataType: 'base64',
      };

      const results = await generator.generateVariations(image);

      expect(results).toHaveLength(4); // default count
    });

    it('should throw error for invalid image input', async () => {
      await expect(
        generator.generateVariations(null as unknown as ImageInput)
      ).rejects.toThrow(ImageGeneratorError);
    });

    it('should throw error for empty image data', async () => {
      const image: ImageInput = {
        data: '',
        dataType: 'base64',
      };

      await expect(generator.generateVariations(image)).rejects.toThrow(ImageGeneratorError);
    });
  });

  describe('edit', () => {
    it('should edit an image', async () => {
      const image: ImageInput = {
        data: 'base64data',
        dataType: 'base64',
      };

      const result = await generator.edit(image, {
        prompt: 'add a rainbow',
      });

      expect(result).toBeDefined();
      expect(result.prompt).toBe('add a rainbow');
    });

    it('should edit with custom size', async () => {
      const image: ImageInput = {
        data: 'base64data',
        dataType: 'base64',
      };

      const result = await generator.edit(image, {
        prompt: 'edit this',
        width: 512,
        height: 512,
      });

      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('should throw error for empty edit prompt', async () => {
      const image: ImageInput = {
        data: 'base64data',
        dataType: 'base64',
      };

      await expect(
        generator.edit(image, { prompt: '' })
      ).rejects.toThrow(ImageGeneratorError);
    });
  });

  describe('utility methods', () => {
    it('should get available models', () => {
      const models = generator.getAvailableModels();

      expect(models).toContain('dall-e-3');
      expect(models).toContain('dall-e-2');
      expect(models).toContain('stable-diffusion');
      expect(models).toContain('stable-diffusion-xl');
      expect(models).toContain('midjourney');
      expect(models).toContain('mock');
    });

    it('should get available styles', () => {
      const styles = generator.getAvailableStyles();

      expect(styles).toContain('natural');
      expect(styles).toContain('photorealistic');
      expect(styles).toContain('anime');
      expect(styles).toContain('cinematic');
      expect(styles.length).toBeGreaterThan(10);
    });

    it('should get size presets', () => {
      const presets = generator.getSizePresets();

      expect(presets.thumbnail).toEqual({ width: 256, height: 256 });
      expect(presets.medium).toEqual({ width: 1024, height: 1024 });
      expect(presets.portrait).toEqual({ width: 1024, height: 1792 });
      expect(presets.landscape).toEqual({ width: 1792, height: 1024 });
    });
  });

  describe('configuration', () => {
    it('should use default model from config', async () => {
      const gen = new ImageGenerator({
        defaultModel: 'mock',
      });

      const result = await gen.generate('test');

      expect(result.metadata.model).toBe('mock');
    });

    it('should use default options from config', async () => {
      const gen = new ImageGenerator({
        defaultOptions: {
          width: 512,
          height: 512,
          style: 'anime',
        },
      });

      const result = await gen.generate('test');

      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      expect(result.metadata.style).toBe('anime');
    });

    it('should allow disabling prompt optimization in config', async () => {
      const gen = new ImageGenerator({
        enablePromptOptimization: false,
      });

      const result = await gen.generate('simple', { style: 'photorealistic' });

      expect(result.prompt).toBe('simple');
    });
  });

  describe('createImageGenerator factory', () => {
    it('should create generator with default config', () => {
      const gen = createImageGenerator();
      expect(gen).toBeInstanceOf(ImageGenerator);
    });

    it('should create generator with custom config', async () => {
      const gen = createImageGenerator({
        defaultOptions: { width: 800, height: 600 },
      });

      const result = await gen.generate('test');

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
  });
});

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    optimizer = new PromptOptimizer();
  });

  describe('optimize', () => {
    it('should optimize basic prompt', () => {
      const result = optimizer.optimize('a cat');

      expect(result.original).toBe('a cat');
      expect(result.optimized).toContain('cat');
    });

    it('should add style keywords', () => {
      const result = optimizer.optimize('a landscape', 'photorealistic');

      expect(result.addedKeywords).toBeDefined();
      expect(result.addedKeywords.length).toBeGreaterThan(0);
    });

    it('should add quality keywords for HD', () => {
      const result = optimizer.optimize('a portrait', undefined, 'hd');

      expect(result.addedKeywords.some((k) => 
        k.toLowerCase().includes('quality') || 
        k.toLowerCase().includes('detailed')
      )).toBe(true);
    });

    it('should generate negative prompt', () => {
      const result = optimizer.optimize('a painting', 'oil-painting');

      expect(result.negativePrompt).toBeDefined();
      expect(result.negativePrompt!.length).toBeGreaterThan(0);
    });

    it('should not duplicate existing keywords', () => {
      const result = optimizer.optimize(
        'a photorealistic portrait with sharp focus',
        'photorealistic',
        'hd'
      );

      // 重複キーワードが追加されていないことを確認
      const photorealisticCount = (result.optimized.match(/photorealistic/gi) || []).length;
      expect(photorealisticCount).toBeLessThanOrEqual(1);
    });

    it('should detect suggested style from prompt', () => {
      const result = optimizer.optimize('anime character with big eyes');

      expect(result.suggestedStyle).toBe('anime');
    });

    it('should detect cartoon style', () => {
      const result = optimizer.optimize('cartoon style illustration');

      expect(result.suggestedStyle).toBe('cartoon');
    });

    it('should detect photorealistic style', () => {
      const result = optimizer.optimize('realistic photo of a person');

      expect(result.suggestedStyle).toBe('photorealistic');
    });

    it('should detect sketch style', () => {
      const result = optimizer.optimize('pencil sketch drawing');

      expect(result.suggestedStyle).toBe('sketch');
    });

    it('should detect pixel-art style', () => {
      const result = optimizer.optimize('pixel art character');

      expect(result.suggestedStyle).toBe('pixel-art');
    });

    it('should detect 3d-render style', () => {
      const result = optimizer.optimize('3d render of a car');

      expect(result.suggestedStyle).toBe('3d-render');
    });

    it('should detect cinematic style', () => {
      const result = optimizer.optimize('cinematic scene from a movie');

      expect(result.suggestedStyle).toBe('cinematic');
    });

    it('should clean prompt whitespace', () => {
      const result = optimizer.optimize('  a   messy    prompt  ');

      expect(result.optimized).not.toContain('  ');
    });
  });

  describe('enhance', () => {
    it('should enhance prompt', () => {
      const enhanced = optimizer.enhance('a simple scene');

      expect(enhanced.length).toBeGreaterThan('a simple scene'.length);
    });
  });

  describe('prepareForTranslation', () => {
    it('should provide translation suggestions for Japanese', () => {
      const result = optimizer.prepareForTranslation('美しい風景');

      expect(result.original).toBe('美しい風景');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle mixed language prompts', () => {
      const result = optimizer.prepareForTranslation('beautiful 風景 scene');

      expect(result.suggestions.some((s) => s.includes('風景'))).toBe(true);
    });
  });

  describe('optimizePrompt utility function', () => {
    it('should work as standalone function', () => {
      const result = optimizePrompt('a dog', 'natural', 'standard');

      expect(result.original).toBe('a dog');
      expect(result.optimized).toContain('dog');
    });

    it('should accept custom options', () => {
      const result = optimizePrompt('a cat', 'anime', 'hd', {
        addStyleKeywords: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('enhancePrompt utility function', () => {
    it('should enhance prompt', () => {
      const enhanced = enhancePrompt('basic prompt');

      expect(enhanced.length).toBeGreaterThan('basic prompt'.length);
    });
  });
});

describe('Constants', () => {
  describe('SIZE_PRESETS', () => {
    it('should have all preset sizes', () => {
      expect(SIZE_PRESETS.thumbnail).toEqual({ width: 256, height: 256 });
      expect(SIZE_PRESETS.small).toEqual({ width: 512, height: 512 });
      expect(SIZE_PRESETS.medium).toEqual({ width: 1024, height: 1024 });
      expect(SIZE_PRESETS.large).toEqual({ width: 1792, height: 1024 });
      expect(SIZE_PRESETS.portrait).toEqual({ width: 1024, height: 1792 });
      expect(SIZE_PRESETS.landscape).toEqual({ width: 1792, height: 1024 });
      expect(SIZE_PRESETS.square).toEqual({ width: 1024, height: 1024 });
      expect(SIZE_PRESETS.banner).toEqual({ width: 1920, height: 480 });
    });
  });

  describe('STYLE_KEYWORDS', () => {
    it('should have keywords for all styles', () => {
      expect(STYLE_KEYWORDS.natural).toBeDefined();
      expect(STYLE_KEYWORDS.photorealistic).toBeDefined();
      expect(STYLE_KEYWORDS.anime).toBeDefined();
      expect(STYLE_KEYWORDS.cinematic).toBeDefined();

      expect(STYLE_KEYWORDS.photorealistic).toContain('photorealistic');
      expect(STYLE_KEYWORDS.anime).toContain('anime style');
    });
  });

  describe('QUALITY_KEYWORDS', () => {
    it('should have standard and hd keywords', () => {
      expect(QUALITY_KEYWORDS.standard).toBeDefined();
      expect(QUALITY_KEYWORDS.hd).toBeDefined();
      expect(QUALITY_KEYWORDS.hd.length).toBeGreaterThan(QUALITY_KEYWORDS.standard.length);
    });
  });

  describe('DEFAULT_NEGATIVE_PROMPT', () => {
    it('should contain common negative terms', () => {
      expect(DEFAULT_NEGATIVE_PROMPT).toContain('blurry');
      expect(DEFAULT_NEGATIVE_PROMPT).toContain('low quality');
      expect(DEFAULT_NEGATIVE_PROMPT).toContain('watermark');
    });
  });

  describe('DEFAULT_IMAGE_OPTIONS', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_IMAGE_OPTIONS.width).toBe(1024);
      expect(DEFAULT_IMAGE_OPTIONS.height).toBe(1024);
      expect(DEFAULT_IMAGE_OPTIONS.style).toBe('natural');
      expect(DEFAULT_IMAGE_OPTIONS.quality).toBe('standard');
      expect(DEFAULT_IMAGE_OPTIONS.format).toBe('png');
    });
  });

  describe('IMAGE_ERROR_CODES', () => {
    it('should have all error codes', () => {
      expect(IMAGE_ERROR_CODES.INVALID_PROMPT).toBe('IMAGE_INVALID_PROMPT');
      expect(IMAGE_ERROR_CODES.INVALID_OPTIONS).toBe('IMAGE_INVALID_OPTIONS');
      expect(IMAGE_ERROR_CODES.INVALID_IMAGE).toBe('IMAGE_INVALID_IMAGE');
      expect(IMAGE_ERROR_CODES.MODEL_NOT_AVAILABLE).toBe('IMAGE_MODEL_NOT_AVAILABLE');
      expect(IMAGE_ERROR_CODES.GENERATION_FAILED).toBe('IMAGE_GENERATION_FAILED');
      expect(IMAGE_ERROR_CODES.RATE_LIMITED).toBe('IMAGE_RATE_LIMITED');
      expect(IMAGE_ERROR_CODES.CONTENT_POLICY).toBe('IMAGE_CONTENT_POLICY');
      expect(IMAGE_ERROR_CODES.TIMEOUT).toBe('IMAGE_TIMEOUT');
      expect(IMAGE_ERROR_CODES.API_ERROR).toBe('IMAGE_API_ERROR');
    });
  });
});

describe('ImageGeneratorError', () => {
  it('should create error with code and message', () => {
    const error = new ImageGeneratorError('TEST_CODE', 'Test message');

    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('ImageGeneratorError');
  });

  it('should include cause when provided', () => {
    const cause = new Error('Original error');
    const error = new ImageGeneratorError('TEST_CODE', 'Wrapper', cause);

    expect(error.cause).toBe(cause);
  });
});
