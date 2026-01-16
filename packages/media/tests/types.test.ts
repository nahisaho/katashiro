/**
 * KATASHIRO Media - 型定義テスト
 *
 * @task TASK-009
 */

import { describe, it, expect } from 'vitest';
import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  AudioSynthesisConfig,
  AudioSynthesisResult,
  TranscriptionConfig,
  TranscriptionResult,
  VideoGenerationConfig,
  VideoGenerationResult,
  MediaProvider,
  GenerationMetadata,
} from '../src/index.js';

describe('Media Types', () => {
  describe('ImageGenerationConfig', () => {
    it('should define valid image generation config', () => {
      const config: ImageGenerationConfig = {
        prompt: 'A beautiful sunset over mountains',
        size: '1024x1024',
        style: 'natural',
        count: 1,
        format: 'png',
      };

      expect(config.prompt).toBe('A beautiful sunset over mountains');
      expect(config.size).toBe('1024x1024');
      expect(config.style).toBe('natural');
    });

    it('should support custom size', () => {
      const config: ImageGenerationConfig = {
        prompt: 'Custom size image',
        size: 'custom',
        width: 800,
        height: 600,
      };

      expect(config.size).toBe('custom');
      expect(config.width).toBe(800);
      expect(config.height).toBe(600);
    });

    it('should support negative prompt', () => {
      const config: ImageGenerationConfig = {
        prompt: 'A cute cat',
        negativePrompt: 'blurry, low quality',
      };

      expect(config.negativePrompt).toBe('blurry, low quality');
    });
  });

  describe('AudioSynthesisConfig', () => {
    it('should define valid audio synthesis config', () => {
      const config: AudioSynthesisConfig = {
        text: 'Hello, world!',
        voice: 'alloy',
        language: 'en-US',
        speed: 1.0,
        format: 'mp3',
      };

      expect(config.text).toBe('Hello, world!');
      expect(config.voice).toBe('alloy');
      expect(config.format).toBe('mp3');
    });

    it('should support pitch adjustment', () => {
      const config: AudioSynthesisConfig = {
        text: 'High pitched voice',
        voice: 'nova',
        pitch: 0.5,
      };

      expect(config.pitch).toBe(0.5);
    });
  });

  describe('TranscriptionConfig', () => {
    it('should define valid transcription config', () => {
      const config: TranscriptionConfig = {
        audio: 'base64-encoded-audio-data',
        language: 'en-US',
        enableSpeakerDiarization: true,
        speakerCount: 2,
        includeTimestamps: true,
      };

      expect(config.enableSpeakerDiarization).toBe(true);
      expect(config.speakerCount).toBe(2);
    });

    it('should support word-level timestamps', () => {
      const config: TranscriptionConfig = {
        audio: 'audio-data',
        wordLevelTimestamps: true,
      };

      expect(config.wordLevelTimestamps).toBe(true);
    });
  });

  describe('VideoGenerationConfig', () => {
    it('should define valid video generation config', () => {
      const config: VideoGenerationConfig = {
        prompt: 'A timelapse of clouds moving',
        durationSeconds: 5,
        resolution: '1080p',
        fps: 30,
        format: 'mp4',
      };

      expect(config.prompt).toBe('A timelapse of clouds moving');
      expect(config.durationSeconds).toBe(5);
      expect(config.resolution).toBe('1080p');
    });

    it('should support start and end images', () => {
      const config: VideoGenerationConfig = {
        prompt: 'Transition between images',
        startImage: 'base64-start-image',
        endImage: 'base64-end-image',
      };

      expect(config.startImage).toBeDefined();
      expect(config.endImage).toBeDefined();
    });
  });

  describe('GenerationMetadata', () => {
    it('should define valid metadata', () => {
      const metadata: GenerationMetadata = {
        provider: 'openai',
        model: 'dall-e-3',
        generatedAt: new Date(),
        durationMs: 5000,
        tokensUsed: 100,
        cost: 0.04,
      };

      expect(metadata.provider).toBe('openai');
      expect(metadata.model).toBe('dall-e-3');
      expect(metadata.durationMs).toBe(5000);
    });
  });

  describe('MediaProvider interface', () => {
    it('should be implementable', () => {
      // Type check only - verify interface is correctly defined
      const mockProvider: MediaProvider<ImageGenerationConfig, ImageGenerationResult> = {
        name: 'mock',
        generate: async (config: ImageGenerationConfig): Promise<ImageGenerationResult> => ({
          images: [{
            base64: 'mock-image-data',
            format: 'png',
            width: 1024,
            height: 1024,
          }],
          metadata: {
            provider: 'mock',
            model: 'mock-model',
            generatedAt: new Date(),
            durationMs: 100,
          },
        }),
        isAvailable: async () => true,
      };

      expect(mockProvider.name).toBe('mock');
    });
  });
});
