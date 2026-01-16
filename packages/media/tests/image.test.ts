/**
 * ImageGenerator テスト
 *
 * @task TASK-010-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ImageGenerator,
  DalleProvider,
  StabilityProvider,
  PromptEnhancer,
} from '../src/index.js';
import type { ImageGenerationResult } from '../src/types.js';

// モックレスポンス
const mockDalleResponse: ImageGenerationResult = {
  images: [
    {
      base64: 'mock-base64-image-data',
      format: 'png',
      width: 1024,
      height: 1024,
    },
  ],
  metadata: {
    provider: 'OpenAI DALL-E',
    model: 'dall-e-3',
    generatedAt: new Date(),
    durationMs: 5000,
    cost: 0.04,
  },
  revisedPrompt: 'Enhanced prompt by DALL-E',
};

describe('ImageGenerator', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const generator = new ImageGenerator();
      expect(generator).toBeInstanceOf(ImageGenerator);
      expect(generator.listProviders()).toEqual([]);
    });

    it('should create instance with OpenAI provider', () => {
      const generator = new ImageGenerator({
        defaultProvider: 'openai',
        providers: {
          openai: {
            type: 'openai',
            apiKey: 'test-api-key',
            model: 'dall-e-3',
          },
        },
      });

      expect(generator.listProviders()).toContain('openai');
    });

    it('should create instance with Stability provider', () => {
      const generator = new ImageGenerator({
        defaultProvider: 'stability',
        providers: {
          stability: {
            type: 'stability',
            apiKey: 'test-api-key',
          },
        },
      });

      expect(generator.listProviders()).toContain('stability');
    });

    it('should create instance with multiple providers', () => {
      const generator = new ImageGenerator({
        providers: {
          openai: { type: 'openai', apiKey: 'openai-key' },
          stability: { type: 'stability', apiKey: 'stability-key' },
        },
      });

      expect(generator.listProviders()).toHaveLength(2);
      expect(generator.listProviders()).toContain('openai');
      expect(generator.listProviders()).toContain('stability');
    });
  });

  describe('factory methods', () => {
    it('should create with OpenAI via factory', () => {
      const generator = ImageGenerator.withOpenAI('test-api-key');
      expect(generator.listProviders()).toContain('openai');
    });

    it('should create with Stability via factory', () => {
      const generator = ImageGenerator.withStability('test-api-key');
      expect(generator.listProviders()).toContain('stability');
    });
  });

  describe('generate', () => {
    it('should throw error if provider not configured', async () => {
      const generator = new ImageGenerator();

      await expect(
        generator.generate({ prompt: 'test' })
      ).rejects.toThrow("Provider 'openai' is not configured");
    });

    it('should use default provider when not specified', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        generate: vi.fn().mockResolvedValue(mockDalleResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['dall-e-3']),
      };

      const generator = new ImageGenerator({ defaultProvider: 'openai' });
      generator.addProvider('openai', mockProvider);

      const result = await generator.generate({ prompt: 'test prompt' });

      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
      expect(result.images).toHaveLength(1);
    });

    it('should use specified provider', async () => {
      const openaiMock = {
        name: 'OpenAI',
        type: 'openai',
        generate: vi.fn().mockResolvedValue(mockDalleResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['dall-e-3']),
      };

      const stabilityMock = {
        name: 'Stability',
        type: 'stability',
        generate: vi.fn().mockResolvedValue({
          ...mockDalleResponse,
          metadata: { ...mockDalleResponse.metadata, provider: 'Stability AI' },
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['sdxl']),
      };

      const generator = new ImageGenerator({ defaultProvider: 'openai' });
      generator.addProvider('openai', openaiMock);
      generator.addProvider('stability', stabilityMock);

      await generator.generate({ prompt: 'test' }, 'stability');

      expect(stabilityMock.generate).toHaveBeenCalled();
      expect(openaiMock.generate).not.toHaveBeenCalled();
    });

    it('should enhance prompt when enabled', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        generate: vi.fn().mockResolvedValue(mockDalleResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['dall-e-3']),
      };

      const generator = new ImageGenerator({
        defaultProvider: 'openai',
        enhancePrompts: true,
      });
      generator.addProvider('openai', mockProvider);

      await generator.generate({ prompt: 'sunset mountains' });

      const calledConfig = mockProvider.generate.mock.calls[0][0];
      expect(calledConfig.prompt).toContain('sunset mountains');
      expect(calledConfig.prompt.length).toBeGreaterThan('sunset mountains'.length);
    });

    it('should timeout after configured duration', async () => {
      const slowProvider = {
        name: 'Slow',
        type: 'openai',
        generate: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockDalleResponse), 5000))
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue([]),
      };

      const generator = new ImageGenerator({
        defaultProvider: 'openai',
        options: { timeout: 100 },
      });
      generator.addProvider('openai', slowProvider);

      await expect(generator.generate({ prompt: 'test' })).rejects.toThrow('Generation timeout');
    });
  });

  describe('provider management', () => {
    it('should add and get provider', () => {
      const generator = new ImageGenerator();
      const mockProvider = {
        name: 'Custom',
        type: 'local',
        generate: vi.fn(),
        isAvailable: vi.fn(),
        listModels: vi.fn(),
      };

      generator.addProvider('local', mockProvider);

      expect(generator.getProvider('local')).toBe(mockProvider);
      expect(generator.listProviders()).toContain('local');
    });

    it('should check provider availability', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        generate: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
        listModels: vi.fn(),
      };

      const generator = new ImageGenerator({ defaultProvider: 'openai' });
      generator.addProvider('openai', mockProvider);

      const available = await generator.isProviderAvailable();
      expect(available).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should return false for unconfigured provider', async () => {
      const generator = new ImageGenerator();
      const available = await generator.isProviderAvailable('openai');
      expect(available).toBe(false);
    });
  });

  describe('enhancePrompt', () => {
    it('should enhance prompt with style', () => {
      const generator = new ImageGenerator();
      const enhanced = generator.enhancePrompt('cat', { style: 'photo' });

      expect(enhanced.prompt).toContain('cat');
      expect(enhanced.prompt).toContain('photograph');
      expect(enhanced.negativePrompt).toBeDefined();
    });
  });
});

describe('DalleProvider', () => {
  it('should create with config', () => {
    const provider = new DalleProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'dall-e-3',
    });

    expect(provider.name).toBe('OpenAI DALL-E');
    expect(provider.type).toBe('openai');
  });

  it('should list models', async () => {
    const provider = new DalleProvider({
      type: 'openai',
      apiKey: 'test-key',
    });

    const models = await provider.listModels();
    expect(models).toContain('dall-e-2');
    expect(models).toContain('dall-e-3');
  });
});

describe('StabilityProvider', () => {
  it('should create with config', () => {
    const provider = new StabilityProvider({
      type: 'stability',
      apiKey: 'test-key',
    });

    expect(provider.name).toBe('Stability AI');
    expect(provider.type).toBe('stability');
  });

  it('should list models', async () => {
    const provider = new StabilityProvider({
      type: 'stability',
      apiKey: 'test-key',
    });

    const models = await provider.listModels();
    expect(models).toContain('stable-diffusion-xl-1024-v1-0');
    expect(models).toContain('stable-diffusion-3');
  });
});

describe('PromptEnhancer', () => {
  let enhancer: PromptEnhancer;

  beforeEach(() => {
    enhancer = new PromptEnhancer();
  });

  describe('enhance', () => {
    it('should return basic prompt without options', () => {
      const result = enhancer.enhance('cat', {
        detailLevel: 1,
        addQualityTerms: false,
        generateNegative: false,
      });

      expect(result.prompt).toBe('cat');
    });

    it('should add style modifiers', () => {
      const result = enhancer.enhance('sunset', {
        style: 'photo',
        addQualityTerms: false,
        generateNegative: false,
      });

      expect(result.prompt).toContain('photograph');
    });

    it('should add quality terms', () => {
      const result = enhancer.enhance('mountains', {
        addQualityTerms: true,
        generateNegative: false,
      });

      expect(result.prompt).toContain('high quality');
      expect(result.prompt).toContain('masterpiece');
    });

    it('should generate negative prompt', () => {
      const result = enhancer.enhance('portrait', {
        generateNegative: true,
        addQualityTerms: false,
      });

      expect(result.negativePrompt).toBeDefined();
      expect(result.negativePrompt).toContain('blurry');
      expect(result.negativePrompt).toContain('low quality');
    });

    it('should add detail modifiers for high detail level', () => {
      const result = enhancer.enhance('landscape', {
        detailLevel: 5,
        addQualityTerms: false,
        generateNegative: false,
      });

      expect(result.prompt).toContain('hyper-detailed');
      expect(result.prompt).toContain('8K resolution');
    });

    it('should provide recommendations', () => {
      const result = enhancer.enhance('anime girl portrait', {
        addQualityTerms: false,
        generateNegative: false,
      });

      expect(result.recommendations?.style).toBe('anime');
      expect(result.recommendations?.size).toBe('1024x1792');
    });

    it('should recommend landscape size for panorama', () => {
      const result = enhancer.enhance('mountain panorama', {
        addQualityTerms: false,
        generateNegative: false,
      });

      expect(result.recommendations?.size).toBe('1792x1024');
    });
  });

  describe('translateToEnglish', () => {
    it('should return English prompt as-is', () => {
      const result = enhancer.translateToEnglish('beautiful sunset');
      expect(result).toBe('beautiful sunset');
    });

    it('should detect Japanese prompt', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      enhancer.translateToEnglish('美しい夕焼け');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
