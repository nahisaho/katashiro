/**
 * AudioSynthesizer テスト
 *
 * @task TASK-011-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AudioSynthesizer,
  OpenAITTSProvider,
  ElevenLabsProvider,
} from '../src/index.js';
import type { AudioSynthesisResult } from '../src/types.js';

// モックレスポンス
const mockAudioResponse: AudioSynthesisResult = {
  audio: 'bW9jay1hdWRpby1kYXRh', // "mock-audio-data" in base64
  format: 'mp3',
  durationSeconds: 5.5,
  sampleRate: 24000,
  metadata: {
    provider: 'OpenAI TTS',
    model: 'tts-1',
    generatedAt: new Date(),
    durationMs: 2000,
    cost: 0.0015,
  },
};

describe('AudioSynthesizer', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const synthesizer = new AudioSynthesizer();
      expect(synthesizer).toBeInstanceOf(AudioSynthesizer);
      expect(synthesizer.listProviders()).toEqual([]);
    });

    it('should create instance with OpenAI provider', () => {
      const synthesizer = new AudioSynthesizer({
        defaultProvider: 'openai',
        providers: {
          openai: {
            type: 'openai',
            apiKey: 'test-api-key',
            model: 'tts-1-hd',
          },
        },
      });

      expect(synthesizer.listProviders()).toContain('openai');
    });

    it('should create instance with ElevenLabs provider', () => {
      const synthesizer = new AudioSynthesizer({
        defaultProvider: 'elevenlabs',
        providers: {
          elevenlabs: {
            type: 'elevenlabs',
            apiKey: 'test-api-key',
          },
        },
      });

      expect(synthesizer.listProviders()).toContain('elevenlabs');
    });

    it('should create instance with multiple providers', () => {
      const synthesizer = new AudioSynthesizer({
        providers: {
          openai: { type: 'openai', apiKey: 'openai-key' },
          elevenlabs: { type: 'elevenlabs', apiKey: 'elevenlabs-key' },
        },
      });

      expect(synthesizer.listProviders()).toHaveLength(2);
      expect(synthesizer.listProviders()).toContain('openai');
      expect(synthesizer.listProviders()).toContain('elevenlabs');
    });
  });

  describe('factory methods', () => {
    it('should create with OpenAI via factory', () => {
      const synthesizer = AudioSynthesizer.withOpenAI('test-api-key');
      expect(synthesizer.listProviders()).toContain('openai');
    });

    it('should create with ElevenLabs via factory', () => {
      const synthesizer = AudioSynthesizer.withElevenLabs('test-api-key');
      expect(synthesizer.listProviders()).toContain('elevenlabs');
    });
  });

  describe('synthesize', () => {
    it('should throw error if provider not configured', async () => {
      const synthesizer = new AudioSynthesizer();

      await expect(
        synthesizer.synthesize({ text: 'Hello', voice: 'nova' })
      ).rejects.toThrow("Provider 'openai' is not configured");
    });

    it('should use default provider when not specified', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        synthesize: vi.fn().mockResolvedValue(mockAudioResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue(['alloy', 'nova']),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', mockProvider);

      const result = await synthesizer.synthesize({
        text: 'Hello, world!',
        voice: 'nova',
      });

      expect(mockProvider.synthesize).toHaveBeenCalledTimes(1);
      expect(result.audio).toBeDefined();
      expect(result.format).toBe('mp3');
    });

    it('should use specified provider', async () => {
      const openaiMock = {
        name: 'OpenAI',
        type: 'openai',
        synthesize: vi.fn().mockResolvedValue(mockAudioResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue(['alloy', 'nova']),
      };

      const elevenlabsMock = {
        name: 'ElevenLabs',
        type: 'elevenlabs',
        synthesize: vi.fn().mockResolvedValue({
          ...mockAudioResponse,
          metadata: { ...mockAudioResponse.metadata, provider: 'ElevenLabs' },
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue(['voice-1', 'voice-2']),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', openaiMock);
      synthesizer.addProvider('elevenlabs', elevenlabsMock);

      await synthesizer.synthesize({ text: 'test', voice: 'voice-1' }, 'elevenlabs');

      expect(elevenlabsMock.synthesize).toHaveBeenCalled();
      expect(openaiMock.synthesize).not.toHaveBeenCalled();
    });

    it('should timeout after configured duration', async () => {
      const slowProvider = {
        name: 'Slow',
        type: 'openai',
        synthesize: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockAudioResponse), 5000))
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue([]),
      };

      const synthesizer = new AudioSynthesizer({
        defaultProvider: 'openai',
        options: { timeout: 100 },
      });
      synthesizer.addProvider('openai', slowProvider);

      await expect(
        synthesizer.synthesize({ text: 'test', voice: 'nova' })
      ).rejects.toThrow('Synthesis timeout');
    });
  });

  describe('synthesizeLongText', () => {
    it('should handle short text without splitting', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        synthesize: vi.fn().mockResolvedValue(mockAudioResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue([]),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', mockProvider);

      await synthesizer.synthesizeLongText('Short text.', { voice: 'nova' });

      expect(mockProvider.synthesize).toHaveBeenCalledTimes(1);
    });

    it('should split long text into chunks', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        synthesize: vi.fn().mockResolvedValue(mockAudioResponse),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn().mockResolvedValue([]),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', mockProvider);

      // 長いテキスト（5000文字以上）
      const longText = Array(100).fill('This is a long sentence that needs to be split. ').join('');

      const result = await synthesizer.synthesizeLongText(longText, { voice: 'nova' });

      expect(mockProvider.synthesize).toHaveBeenCalledTimes(2);
      expect(result.durationSeconds).toBe(11); // 5.5 * 2
    });
  });

  describe('provider management', () => {
    it('should add and get provider', () => {
      const synthesizer = new AudioSynthesizer();
      const mockProvider = {
        name: 'Custom',
        type: 'local',
        synthesize: vi.fn(),
        isAvailable: vi.fn(),
        listVoices: vi.fn(),
      };

      synthesizer.addProvider('local', mockProvider);

      expect(synthesizer.getProvider('local')).toBe(mockProvider);
      expect(synthesizer.listProviders()).toContain('local');
    });

    it('should list voices', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        synthesize: vi.fn(),
        isAvailable: vi.fn(),
        listVoices: vi.fn().mockResolvedValue(['alloy', 'echo', 'nova']),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', mockProvider);

      const voices = await synthesizer.listVoices();
      expect(voices).toContain('alloy');
      expect(voices).toContain('nova');
    });

    it('should check provider availability', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'openai',
        synthesize: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
        listVoices: vi.fn(),
      };

      const synthesizer = new AudioSynthesizer({ defaultProvider: 'openai' });
      synthesizer.addProvider('openai', mockProvider);

      const available = await synthesizer.isProviderAvailable();
      expect(available).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should return false for unconfigured provider', async () => {
      const synthesizer = new AudioSynthesizer();
      const available = await synthesizer.isProviderAvailable('openai');
      expect(available).toBe(false);
    });
  });
});

describe('OpenAITTSProvider', () => {
  it('should create with config', () => {
    const provider = new OpenAITTSProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'tts-1-hd',
    });

    expect(provider.name).toBe('OpenAI TTS');
    expect(provider.type).toBe('openai');
  });

  it('should list voices', async () => {
    const provider = new OpenAITTSProvider({
      type: 'openai',
      apiKey: 'test-key',
    });

    const voices = await provider.listVoices();
    expect(voices).toContain('alloy');
    expect(voices).toContain('nova');
    expect(voices).toContain('shimmer');
  });
});

describe('ElevenLabsProvider', () => {
  it('should create with config', () => {
    const provider = new ElevenLabsProvider({
      type: 'elevenlabs',
      apiKey: 'test-key',
    });

    expect(provider.name).toBe('ElevenLabs');
    expect(provider.type).toBe('elevenlabs');
  });
});
