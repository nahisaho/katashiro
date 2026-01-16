/**
 * VideoGenerator テスト
 *
 * @task TASK-012-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VideoGenerator,
  RunwayProvider,
  PikaProvider,
} from '../src/index.js';
import type { VideoGenerationResult } from '../src/types.js';

// モックレスポンス
const mockVideoResponse: VideoGenerationResult = {
  video: 'bW9jay12aWRlby1kYXRh', // "mock-video-data" in base64
  format: 'mp4',
  width: 1280,
  height: 720,
  durationSeconds: 4,
  fps: 24,
  metadata: {
    provider: 'Runway',
    model: 'gen-2',
    generatedAt: new Date(),
    durationMs: 30000,
    cost: 0.20,
  },
};

describe('VideoGenerator', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const generator = new VideoGenerator();
      expect(generator).toBeInstanceOf(VideoGenerator);
      expect(generator.listProviders()).toEqual([]);
    });

    it('should create instance with Runway provider', () => {
      const generator = new VideoGenerator({
        defaultProvider: 'runway',
        providers: {
          runway: {
            type: 'runway',
            apiKey: 'test-api-key',
            model: 'gen-2',
          },
        },
      });

      expect(generator.listProviders()).toContain('runway');
    });

    it('should create instance with Pika provider', () => {
      const generator = new VideoGenerator({
        defaultProvider: 'pika',
        providers: {
          pika: {
            type: 'pika',
            apiKey: 'test-api-key',
            model: 'pika-1.5',
          },
        },
      });

      expect(generator.listProviders()).toContain('pika');
    });

    it('should create instance with multiple providers', () => {
      const generator = new VideoGenerator({
        providers: {
          runway: { type: 'runway', apiKey: 'runway-key' },
          pika: { type: 'pika', apiKey: 'pika-key' },
        },
      });

      expect(generator.listProviders()).toHaveLength(2);
      expect(generator.listProviders()).toContain('runway');
      expect(generator.listProviders()).toContain('pika');
    });
  });

  describe('factory methods', () => {
    it('should create with Runway via factory', () => {
      const generator = VideoGenerator.withRunway('test-api-key', 'gen-3-alpha');
      expect(generator.listProviders()).toContain('runway');
    });

    it('should create with Pika via factory', () => {
      const generator = VideoGenerator.withPika('test-api-key', 'pika-1.5');
      expect(generator.listProviders()).toContain('pika');
    });
  });

  describe('generate', () => {
    it('should throw error if provider not configured', async () => {
      const generator = new VideoGenerator();

      await expect(
        generator.generate({ prompt: 'A cat walking' })
      ).rejects.toThrow("Provider 'runway' is not configured");
    });

    it('should use default provider when not specified', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'runway',
        generate: vi.fn().mockResolvedValue(mockVideoResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        getJobStatus: vi.fn(),
        listModels: vi.fn().mockResolvedValue(['gen-2']),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({ defaultProvider: 'runway' });
      generator.addProvider('runway', mockProvider);

      const result = await generator.generate({ prompt: 'A cat walking' });

      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
      expect(result.video).toBeDefined();
      expect(result.format).toBe('mp4');
    });

    it('should use specified provider', async () => {
      const runwayMock = {
        name: 'Runway',
        type: 'runway',
        generate: vi.fn().mockResolvedValue(mockVideoResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        getJobStatus: vi.fn(),
        listModels: vi.fn().mockResolvedValue(['gen-2']),
        getInfo: vi.fn(),
      };

      const pikaMock = {
        name: 'Pika',
        type: 'pika',
        generate: vi.fn().mockResolvedValue({
          ...mockVideoResponse,
          metadata: { ...mockVideoResponse.metadata, provider: 'Pika' },
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        getJobStatus: vi.fn(),
        listModels: vi.fn().mockResolvedValue(['pika-1.5']),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({ defaultProvider: 'runway' });
      generator.addProvider('runway', runwayMock);
      generator.addProvider('pika', pikaMock);

      await generator.generate({ prompt: 'test' }, 'pika');

      expect(pikaMock.generate).toHaveBeenCalled();
      expect(runwayMock.generate).not.toHaveBeenCalled();
    });

    it('should timeout after configured duration', async () => {
      const slowProvider = {
        name: 'Slow',
        type: 'runway',
        generate: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(mockVideoResponse), 5000)
            )
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
        getJobStatus: vi.fn(),
        listModels: vi.fn().mockResolvedValue([]),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({
        defaultProvider: 'runway',
        options: { timeout: 100, maxRetries: 1 },
      });
      generator.addProvider('runway', slowProvider);

      await expect(
        generator.generate({ prompt: 'test' })
      ).rejects.toThrow('Generation timeout');
    });
  });

  describe('getJobStatus', () => {
    it('should get job status from provider', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'runway',
        generate: vi.fn(),
        isAvailable: vi.fn(),
        getJobStatus: vi.fn().mockResolvedValue({
          jobId: 'job-123',
          status: 'processing',
          progress: 50,
        }),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({ defaultProvider: 'runway' });
      generator.addProvider('runway', mockProvider);

      const status = await generator.getJobStatus('job-123');

      expect(status.jobId).toBe('job-123');
      expect(status.status).toBe('processing');
      expect(status.progress).toBe(50);
    });
  });

  describe('provider management', () => {
    it('should add and get provider', () => {
      const generator = new VideoGenerator();
      const mockProvider = {
        name: 'Custom',
        type: 'custom',
        generate: vi.fn(),
        isAvailable: vi.fn(),
        getJobStatus: vi.fn(),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      generator.addProvider('custom', mockProvider);

      expect(generator.getProvider('custom')).toBe(mockProvider);
      expect(generator.listProviders()).toContain('custom');
    });

    it('should list models', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'runway',
        generate: vi.fn(),
        isAvailable: vi.fn(),
        getJobStatus: vi.fn(),
        listModels: vi.fn().mockResolvedValue(['gen-2', 'gen-3-alpha']),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({ defaultProvider: 'runway' });
      generator.addProvider('runway', mockProvider);

      const models = await generator.listModels();
      expect(models).toContain('gen-2');
      expect(models).toContain('gen-3-alpha');
    });

    it('should check provider availability', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'runway',
        generate: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
        getJobStatus: vi.fn(),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      const generator = new VideoGenerator({ defaultProvider: 'runway' });
      generator.addProvider('runway', mockProvider);

      const available = await generator.isProviderAvailable();
      expect(available).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should return false for unconfigured provider', async () => {
      const generator = new VideoGenerator();
      const available = await generator.isProviderAvailable('runway');
      expect(available).toBe(false);
    });
  });

  describe('cost estimation', () => {
    it('should estimate cost for Runway', () => {
      const generator = new VideoGenerator();
      const cost = generator.estimateCost({ prompt: 'test', duration: 4 }, 'runway');
      expect(cost).toBe(0.20); // 4 seconds * $0.05
    });

    it('should estimate cost for Pika', () => {
      const generator = new VideoGenerator();
      const cost = generator.estimateCost({ prompt: 'test', duration: 3 }, 'pika');
      expect(cost).toBe(0.12); // 3 seconds * $0.04
    });
  });
});

describe('RunwayProvider', () => {
  it('should create with config', () => {
    const provider = new RunwayProvider({
      type: 'runway',
      apiKey: 'test-key',
      model: 'gen-3-alpha',
    });

    expect(provider.name).toBe('Runway');
    expect(provider.type).toBe('runway');
  });

  it('should list models', async () => {
    const provider = new RunwayProvider({
      type: 'runway',
      apiKey: 'test-key',
    });

    const models = await provider.listModels();
    expect(models).toContain('gen-2');
    expect(models).toContain('gen-3-alpha');
  });

  it('should get provider info', () => {
    const provider = new RunwayProvider({
      type: 'runway',
      apiKey: 'test-key',
    });

    const info = provider.getInfo();
    expect(info.name).toBe('Runway');
    expect(info.capabilities).toContain('text-to-video');
    expect(info.capabilities).toContain('image-to-video');
  });
});

describe('PikaProvider', () => {
  it('should create with config', () => {
    const provider = new PikaProvider({
      type: 'pika',
      apiKey: 'test-key',
      model: 'pika-1.5',
    });

    expect(provider.name).toBe('Pika');
    expect(provider.type).toBe('pika');
  });

  it('should list models', async () => {
    const provider = new PikaProvider({
      type: 'pika',
      apiKey: 'test-key',
    });

    const models = await provider.listModels();
    expect(models).toContain('pika-1.0');
    expect(models).toContain('pika-1.5');
  });

  it('should get provider info', () => {
    const provider = new PikaProvider({
      type: 'pika',
      apiKey: 'test-key',
    });

    const info = provider.getInfo();
    expect(info.name).toBe('Pika');
    expect(info.capabilities).toContain('text-to-video');
    expect(info.capabilities).toContain('lip-sync');
  });
});
