/**
 * AudioTranscriber テスト
 *
 * @task TASK-013-6
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AudioTranscriber,
  WhisperProvider,
  SpeakerLabeler,
} from '../src/index.js';
import type { TranscriptionResult, TranscriptionSegment } from '../src/types.js';

// モックレスポンス
const mockTranscriptionResult: TranscriptionResult = {
  text: 'Hello, this is a test transcription.',
  language: 'en',
  durationSeconds: 10.5,
  segments: [
    {
      id: 0,
      start: 0,
      end: 5,
      text: 'Hello, this is',
      confidence: 0.95,
    },
    {
      id: 1,
      start: 5,
      end: 10.5,
      text: 'a test transcription.',
      confidence: 0.92,
    },
  ],
  metadata: {
    provider: 'OpenAI Whisper',
    model: 'whisper-1',
    generatedAt: new Date(),
    durationMs: 3000,
    cost: 0.00105,
  },
};

describe('AudioTranscriber', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const transcriber = new AudioTranscriber();
      expect(transcriber).toBeInstanceOf(AudioTranscriber);
      expect(transcriber.listProviders()).toEqual([]);
    });

    it('should create instance with Whisper provider', () => {
      const transcriber = new AudioTranscriber({
        defaultProvider: 'whisper',
        providers: {
          whisper: {
            type: 'whisper',
            apiKey: 'test-api-key',
          },
        },
      });

      expect(transcriber.listProviders()).toContain('whisper');
    });

    it('should enable speaker diarization', () => {
      const transcriber = new AudioTranscriber({
        options: {
          enableSpeakerDiarization: true,
          speakerDiarizationConfig: {
            maxSpeakers: 5,
          },
        },
      });

      expect(transcriber).toBeInstanceOf(AudioTranscriber);
    });
  });

  describe('factory methods', () => {
    it('should create with Whisper via factory', () => {
      const transcriber = AudioTranscriber.withWhisper('test-api-key');
      expect(transcriber.listProviders()).toContain('whisper');
    });
  });

  describe('transcribe', () => {
    it('should throw error if provider not configured', async () => {
      const transcriber = new AudioTranscriber();

      await expect(
        transcriber.transcribe({ audio: 'base64-audio-data' })
      ).rejects.toThrow("Provider 'whisper' is not configured");
    });

    it('should use default provider when not specified', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn().mockResolvedValue(mockTranscriptionResult),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn().mockResolvedValue(['en', 'ja']),
        listModels: vi.fn().mockResolvedValue(['whisper-1']),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      const result = await transcriber.transcribe({ audio: 'base64-data' });

      expect(mockProvider.transcribe).toHaveBeenCalledTimes(1);
      expect(result.text).toBeDefined();
      expect(result.language).toBe('en');
    });

    it('should include speaker diarization when enabled', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn().mockResolvedValue(mockTranscriptionResult),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn().mockResolvedValue(['en']),
        listModels: vi.fn().mockResolvedValue(['whisper-1']),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({
        defaultProvider: 'whisper',
        options: {
          enableSpeakerDiarization: true,
        },
      });
      transcriber.addProvider('whisper', mockProvider);

      const result = await transcriber.transcribe({ audio: 'base64-data' });

      expect(result.speakerDiarization).toBeDefined();
      expect(result.speakerDiarization?.speakers).toBeDefined();
      expect(result.speakerDiarization?.labeledSegments).toBeDefined();
    });

    it('should timeout after configured duration', async () => {
      const slowProvider = {
        name: 'Slow',
        type: 'whisper',
        transcribe: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(mockTranscriptionResult), 5000)
            )
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn().mockResolvedValue([]),
        listModels: vi.fn().mockResolvedValue([]),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({
        defaultProvider: 'whisper',
        options: { timeout: 100 },
      });
      transcriber.addProvider('whisper', slowProvider);

      await expect(
        transcriber.transcribe({ audio: 'test' })
      ).rejects.toThrow('Transcription timeout');
    });
  });

  describe('transcribeFromBase64', () => {
    it('should transcribe from base64 audio', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn().mockResolvedValue(mockTranscriptionResult),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn().mockResolvedValue(['en']),
        listModels: vi.fn().mockResolvedValue(['whisper-1']),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      const result = await transcriber.transcribeFromBase64('base64-audio', {
        language: 'en',
      });

      expect(result.text).toBeDefined();
      expect(mockProvider.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: 'base64-audio',
          language: 'en',
        })
      );
    });
  });

  describe('diarizeSpeakers', () => {
    it('should perform speaker diarization', async () => {
      const transcriber = new AudioTranscriber();

      const result = await transcriber.diarizeSpeakers(mockTranscriptionResult);

      expect(result.speakers).toBeDefined();
      expect(result.labeledSegments).toHaveLength(2);
      expect(result.speakerCount).toBeGreaterThan(0);
    });

    it('should throw error if segments are missing', async () => {
      const transcriber = new AudioTranscriber();

      const resultWithoutSegments: TranscriptionResult = {
        text: 'test',
        language: 'en',
        durationSeconds: 1,
        metadata: mockTranscriptionResult.metadata,
      };

      await expect(
        transcriber.diarizeSpeakers(resultWithoutSegments)
      ).rejects.toThrow('Segments are required for speaker diarization');
    });
  });

  describe('provider management', () => {
    it('should add and get provider', () => {
      const transcriber = new AudioTranscriber();
      const mockProvider = {
        name: 'Custom',
        type: 'custom',
        transcribe: vi.fn(),
        isAvailable: vi.fn(),
        listLanguages: vi.fn(),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      transcriber.addProvider('custom', mockProvider);

      expect(transcriber.getProvider('custom')).toBe(mockProvider);
      expect(transcriber.listProviders()).toContain('custom');
    });

    it('should list languages', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn(),
        isAvailable: vi.fn(),
        listLanguages: vi.fn().mockResolvedValue(['en', 'ja', 'zh']),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      const languages = await transcriber.listLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('ja');
    });

    it('should list models', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn(),
        isAvailable: vi.fn(),
        listLanguages: vi.fn(),
        listModels: vi.fn().mockResolvedValue(['whisper-1']),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      const models = await transcriber.listModels();
      expect(models).toContain('whisper-1');
    });

    it('should check provider availability', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn(),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      const available = await transcriber.isProviderAvailable();
      expect(available).toBe(true);
    });

    it('should return false for unconfigured provider', async () => {
      const transcriber = new AudioTranscriber();
      const available = await transcriber.isProviderAvailable('whisper');
      expect(available).toBe(false);
    });
  });

  describe('setSpeakerDiarization', () => {
    it('should enable/disable speaker diarization', async () => {
      const mockProvider = {
        name: 'Mock',
        type: 'whisper',
        transcribe: vi.fn().mockResolvedValue(mockTranscriptionResult),
        isAvailable: vi.fn().mockResolvedValue(true),
        listLanguages: vi.fn(),
        listModels: vi.fn(),
        getInfo: vi.fn(),
      };

      const transcriber = new AudioTranscriber({ defaultProvider: 'whisper' });
      transcriber.addProvider('whisper', mockProvider);

      // Initially disabled
      let result = await transcriber.transcribe({ audio: 'test' });
      expect(result.speakerDiarization).toBeUndefined();

      // Enable
      transcriber.setSpeakerDiarization(true);
      result = await transcriber.transcribe({ audio: 'test' });
      expect(result.speakerDiarization).toBeDefined();

      // Disable again
      transcriber.setSpeakerDiarization(false);
      result = await transcriber.transcribe({ audio: 'test' });
      expect(result.speakerDiarization).toBeUndefined();
    });
  });

  describe('cost estimation', () => {
    it('should estimate cost for Whisper', () => {
      const transcriber = new AudioTranscriber();
      const cost = transcriber.estimateCost(60, 'whisper'); // 1 minute
      expect(cost).toBeCloseTo(0.006, 5);
    });

    it('should estimate cost for default provider', () => {
      const transcriber = new AudioTranscriber();
      const cost = transcriber.estimateCost(120); // 2 minutes
      expect(cost).toBeCloseTo(0.012, 5);
    });
  });
});

describe('WhisperProvider', () => {
  it('should create with config', () => {
    const provider = new WhisperProvider({
      type: 'whisper',
      apiKey: 'test-key',
    });

    expect(provider.name).toBe('OpenAI Whisper');
    expect(provider.type).toBe('whisper');
  });

  it('should list models', async () => {
    const provider = new WhisperProvider({
      type: 'whisper',
      apiKey: 'test-key',
    });

    const models = await provider.listModels();
    expect(models).toContain('whisper-1');
  });

  it('should list languages', async () => {
    const provider = new WhisperProvider({
      type: 'whisper',
      apiKey: 'test-key',
    });

    const languages = await provider.listLanguages();
    expect(languages).toContain('en');
    expect(languages).toContain('ja');
    expect(languages).toContain('zh');
  });

  it('should get provider info', () => {
    const provider = new WhisperProvider({
      type: 'whisper',
      apiKey: 'test-key',
    });

    const info = provider.getInfo();
    expect(info.name).toBe('OpenAI Whisper');
    expect(info.capabilities).toContain('transcription');
    expect(info.capabilities).toContain('word-timestamps');
  });
});

describe('SpeakerLabeler', () => {
  const mockSegments: TranscriptionSegment[] = [
    { id: 0, start: 0, end: 3, text: 'Hello, how are you?', confidence: 0.95 },
    { id: 1, start: 3.5, end: 6, text: "I'm fine, thank you.", confidence: 0.92 },
    { id: 2, start: 10, end: 13, text: 'What about the weather?', confidence: 0.90 },
    { id: 3, start: 13.5, end: 16, text: "It's sunny today.", confidence: 0.93 },
  ];

  describe('labelSegments', () => {
    it('should label segments with heuristics', async () => {
      const labeler = new SpeakerLabeler();
      const result = await labeler.labelSegments(mockSegments);

      expect(result.labeledSegments).toHaveLength(4);
      expect(result.speakers.length).toBeGreaterThan(0);
      expect(result.speakerCount).toBeGreaterThan(0);

      // Each segment should have speaker info
      for (const seg of result.labeledSegments) {
        expect(seg.speakerId).toBeDefined();
        expect(seg.speakerLabel).toBeDefined();
      }
    });

    it('should detect speaker changes on long gaps', async () => {
      const labeler = new SpeakerLabeler();
      const result = await labeler.labelSegments(mockSegments);

      // Segment 0-1 have short gap, segment 2 has long gap (4 seconds)
      const seg1Speaker = result.labeledSegments[1].speakerId;
      const seg2Speaker = result.labeledSegments[2].speakerId;

      // Long gap should trigger speaker change
      expect(seg1Speaker).not.toBe(seg2Speaker);
    });
  });

  describe('setManualLabels', () => {
    it('should set manual speaker labels', () => {
      const labeler = new SpeakerLabeler();
      const assignments = new Map<number, string>([
        [0, 'Alice'],
        [1, 'Bob'],
        [2, 'Alice'],
        [3, 'Bob'],
      ]);

      const result = labeler.setManualLabels(mockSegments, assignments);

      expect(result[0].speakerLabel).toBe('Alice');
      expect(result[1].speakerLabel).toBe('Bob');
      expect(result[2].speakerLabel).toBe('Alice');
      expect(result[3].speakerLabel).toBe('Bob');
    });
  });

  describe('calculateSpeakerStats', () => {
    it('should calculate speaker statistics', async () => {
      const labeler = new SpeakerLabeler();
      const diarization = await labeler.labelSegments(mockSegments);
      const stats = labeler.calculateSpeakerStats(diarization.labeledSegments);

      expect(stats.length).toBeGreaterThan(0);
      for (const speaker of stats) {
        expect(speaker.id).toBeDefined();
        expect(speaker.label).toBeDefined();
        expect(speaker.totalDuration).toBeGreaterThan(0);
        expect(speaker.wordCount).toBeGreaterThan(0);
        expect(speaker.segments.length).toBeGreaterThan(0);
      }
    });
  });

  describe('config options', () => {
    it('should respect maxSpeakers config', async () => {
      const labeler = new SpeakerLabeler({ maxSpeakers: 2 });
      const result = await labeler.labelSegments(mockSegments);

      expect(result.speakerCount).toBeLessThanOrEqual(2);
    });
  });
});
