/**
 * Audio Generator Tests
 * REQ-MEDIA-005: 音声/ポッドキャスト生成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioGenerator,
  SSMLBuilder,
  buildSSML,
  segmentText,
  PRESET_VOICES,
  QUALITY_PRESETS,
  DEFAULT_TTS_OPTIONS,
  AUDIO_ERROR_CODES,
  AudioGeneratorError,
  type TTSOptions,
  type PodcastScript,
  type TextSegment,
  type VoiceConfig,
} from '../src/audio/index.js';

describe('AudioGenerator', () => {
  let generator: AudioGenerator;

  beforeEach(() => {
    generator = new AudioGenerator({ provider: 'mock' });
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const gen = new AudioGenerator();
      expect(gen).toBeInstanceOf(AudioGenerator);
    });

    it('should create instance with custom provider', () => {
      const gen = new AudioGenerator({ provider: 'mock' });
      expect(gen).toBeInstanceOf(AudioGenerator);
    });

    it('should create instance with quality options', () => {
      const gen = new AudioGenerator({
        provider: 'mock',
        defaultQuality: 'high',
        defaultFormat: 'wav',
      });
      expect(gen).toBeInstanceOf(AudioGenerator);
    });
  });

  describe('textToSpeech', () => {
    it('should generate audio from simple text', async () => {
      const result = await generator.textToSpeech('こんにちは、世界！');

      expect(result).toBeDefined();
      expect(result.audio).toBeDefined();
      expect(result.audio.data).toBeInstanceOf(Uint8Array);
      expect(result.audio.duration).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    it('should generate audio with custom voice', async () => {
      const options: TTSOptions = {
        voice: {
          voiceName: 'test-voice',
          language: 'ja-JP',
          speed: 1.2,
          pitch: 1.1,
        },
      };

      const result = await generator.textToSpeech('テスト音声', options);

      expect(result.audio).toBeDefined();
      expect(result.metadata.language).toBe('ja-JP');
    });

    it('should generate audio with specified format', async () => {
      const result = await generator.textToSpeech('音声テスト', { format: 'wav' });

      expect(result.audio.format).toBe('wav');
    });

    it('should generate audio with specified quality', async () => {
      const result = await generator.textToSpeech('高品質テスト', { quality: 'high' });

      expect(result.audio.sampleRate).toBe(QUALITY_PRESETS.high.sampleRate);
    });

    it('should include text segments in output', async () => {
      const text = 'これはテストメッセージです';
      const result = await generator.textToSpeech(text);

      expect(result.segments).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].text).toBe(text);
    });

    it('should include metadata in output', async () => {
      const result = await generator.textToSpeech('メタデータテスト');

      expect(result.metadata.format).toBeDefined();
      expect(result.metadata.duration).toBeGreaterThan(0);
      expect(result.metadata.sampleRate).toBeGreaterThan(0);
      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.createdAt).toBeDefined();
    });

    it('should throw error for empty text', async () => {
      await expect(generator.textToSpeech('')).rejects.toThrow(AudioGeneratorError);
    });

    it('should throw error for invalid text', async () => {
      await expect(generator.textToSpeech(null as unknown as string)).rejects.toThrow(
        AudioGeneratorError
      );
    });

    it('should handle long text by splitting', async () => {
      const longText = 'これは長いテキストです。'.repeat(1000);
      const result = await generator.textToSpeech(longText);

      expect(result.audio).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(1);
    });

    it('should enable SSML processing when option is set', async () => {
      const result = await generator.textToSpeech('SSML有効テスト', {
        enableSSML: true,
      });

      expect(result.audio).toBeDefined();
    });
  });

  describe('synthesizeSegments', () => {
    it('should synthesize multiple segments', async () => {
      const segments: TextSegment[] = [
        { text: '最初のセグメント' },
        { text: '二番目のセグメント' },
        { text: '三番目のセグメント' },
      ];

      const result = await generator.synthesizeSegments(segments);

      expect(result.audio).toBeDefined();
      expect(result.segments.length).toBe(3);
    });

    it('should apply different voices to segments', async () => {
      const segments: TextSegment[] = [
        { text: '女性の声', voice: PRESET_VOICES['ja-female-1'] },
        { text: '男性の声', voice: PRESET_VOICES['ja-male-1'] },
      ];

      const result = await generator.synthesizeSegments(segments);

      expect(result.segments.length).toBe(2);
    });

    it('should handle pauses between segments', async () => {
      const segments: TextSegment[] = [
        { text: '最初', pauseAfter: 500 },
        { text: '次', pauseBefore: 300 },
      ];

      const result = await generator.synthesizeSegments(segments);

      expect(result.audio.duration).toBeGreaterThan(0);
    });

    it('should track segment timing', async () => {
      const segments: TextSegment[] = [
        { text: 'セグメント1' },
        { text: 'セグメント2' },
      ];

      const result = await generator.synthesizeSegments(segments);

      expect(result.segments[0].startTime).toBe(0);
      expect(result.segments[1].startTime).toBeGreaterThan(result.segments[0].endTime - 0.01);
    });

    it('should throw error for empty segments', async () => {
      await expect(generator.synthesizeSegments([])).rejects.toThrow(AudioGeneratorError);
    });
  });

  describe('generatePodcast', () => {
    it('should generate podcast from script', async () => {
      const script: PodcastScript = {
        title: 'テストポッドキャスト',
        speakers: [
          { id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] },
          { id: 'guest', name: 'ゲスト', voice: PRESET_VOICES['ja-male-1'] },
        ],
        segments: [
          { speakerId: 'host', text: 'ようこそ、今日のエピソードへ。' },
          { speakerId: 'guest', text: 'お招きいただきありがとうございます。' },
          { speakerId: 'host', text: '早速、本題に入りましょう。' },
        ],
      };

      const result = await generator.generatePodcast(script);

      expect(result.audio).toBeDefined();
      expect(result.metadata.title).toBe('テストポッドキャスト');
      expect(result.metadata.speakers).toContain('ホスト');
      expect(result.metadata.speakers).toContain('ゲスト');
      expect(result.segments.length).toBe(3);
    });

    it('should include intro when provided', async () => {
      const script: PodcastScript = {
        title: 'イントロ付きポッドキャスト',
        intro: 'この番組は〇〇の提供でお送りします。',
        speakers: [
          { id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] },
        ],
        segments: [
          { speakerId: 'host', text: 'こんにちは。' },
        ],
      };

      const result = await generator.generatePodcast(script);

      expect(result.segments.length).toBe(2);
      expect(result.segments[0].speaker).toBe('_intro');
    });

    it('should include outro when provided', async () => {
      const script: PodcastScript = {
        title: 'アウトロ付きポッドキャスト',
        outro: 'ご視聴ありがとうございました。',
        speakers: [
          { id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] },
        ],
        segments: [
          { speakerId: 'host', text: 'さようなら。' },
        ],
      };

      const result = await generator.generatePodcast(script);

      const lastSegment = result.segments[result.segments.length - 1];
      expect(lastSegment.speaker).toBe('_outro');
    });

    it('should handle segment pauses', async () => {
      const script: PodcastScript = {
        title: 'ポーズ付きポッドキャスト',
        speakers: [
          { id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] },
        ],
        segments: [
          { speakerId: 'host', text: '少し間を置いて...', pauseAfter: 1000 },
          { speakerId: 'host', text: '続けます。' },
        ],
      };

      const result = await generator.generatePodcast(script);

      expect(result.audio.duration).toBeGreaterThan(0);
    });

    it('should throw error for missing title', async () => {
      const script = {
        speakers: [{ id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] }],
        segments: [{ speakerId: 'host', text: 'テスト' }],
      } as PodcastScript;

      await expect(generator.generatePodcast(script)).rejects.toThrow(AudioGeneratorError);
    });

    it('should throw error for empty segments', async () => {
      const script: PodcastScript = {
        title: 'テスト',
        speakers: [{ id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] }],
        segments: [],
      };

      await expect(generator.generatePodcast(script)).rejects.toThrow(AudioGeneratorError);
    });

    it('should throw error for unknown speaker', async () => {
      const script: PodcastScript = {
        title: 'テスト',
        speakers: [{ id: 'host', name: 'ホスト', voice: PRESET_VOICES['ja-female-1'] }],
        segments: [{ speakerId: 'unknown', text: 'テスト' }],
      };

      await expect(generator.generatePodcast(script)).rejects.toThrow(AudioGeneratorError);
    });
  });

  describe('listVoices', () => {
    it('should list all available voices', async () => {
      const voices = await generator.listVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });

    it('should filter voices by language', async () => {
      const voices = await generator.listVoices('ja-JP');

      expect(voices.every(v => v.language === 'ja-JP')).toBe(true);
    });

    it('should include voice details', async () => {
      const voices = await generator.listVoices();
      const voice = voices[0];

      expect(voice.voiceId).toBeDefined();
      expect(voice.name).toBeDefined();
      expect(voice.language).toBeDefined();
    });
  });

  describe('getPresetVoice', () => {
    it('should return preset voice configuration', () => {
      const voice = generator.getPresetVoice('ja-female-1');

      expect(voice).toBeDefined();
      expect(voice.language).toBe('ja-JP');
      expect(voice.gender).toBe('female');
    });

    it('should throw error for unknown preset', () => {
      expect(() => generator.getPresetVoice('unknown' as any)).toThrow(AudioGeneratorError);
    });
  });

  describe('getQualityPreset', () => {
    it('should return quality preset settings', () => {
      const preset = generator.getQualityPreset('high');

      expect(preset.sampleRate).toBe(44100);
      expect(preset.bitrate).toBe(192);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const formats = generator.getSupportedFormats();

      expect(Array.isArray(formats)).toBe(true);
      expect(formats).toContain('mp3');
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration for Japanese text', () => {
      const duration = generator.estimateDuration('これは日本語のテストです');

      expect(duration).toBeGreaterThan(0);
    });

    it('should estimate duration for English text', () => {
      const duration = generator.estimateDuration('This is an English test', {
        language: 'en-US',
      });

      expect(duration).toBeGreaterThan(0);
    });

    it('should adjust duration for speed', () => {
      const normalDuration = generator.estimateDuration('テスト');
      const fastDuration = generator.estimateDuration('テスト', { speed: 2.0 });

      expect(fastDuration).toBeLessThan(normalDuration);
    });
  });
});

describe('SSMLBuilder', () => {
  let builder: SSMLBuilder;

  beforeEach(() => {
    builder = new SSMLBuilder('ja-JP');
  });

  describe('basic operations', () => {
    it('should create SSML document', () => {
      const ssml = builder.start().text('こんにちは').build();

      expect(ssml).toContain('<speak');
      expect(ssml).toContain('xml:lang="ja-JP"');
      expect(ssml).toContain('こんにちは');
      expect(ssml).toContain('</speak>');
    });

    it('should add text', () => {
      const ssml = builder.start().text('テスト').end().build();

      expect(ssml).toContain('テスト');
    });

    it('should escape XML characters', () => {
      const ssml = builder.start().text('<script>alert("test")</script>').build();

      expect(ssml).toContain('&lt;script&gt;');
      expect(ssml).not.toContain('<script>');
    });
  });

  describe('pause', () => {
    it('should add pause with milliseconds', () => {
      const ssml = builder.start().pause(500).build();

      expect(ssml).toContain('<break time="500ms"/>');
    });

    it('should add pause with strength', () => {
      const ssml = builder.start().pause('strong').build();

      expect(ssml).toContain('<break strength="strong"/>');
    });
  });

  describe('emphasis', () => {
    it('should add emphasis', () => {
      const ssml = builder.start().emphasis('重要', 'strong').build();

      expect(ssml).toContain('<emphasis level="strong">重要</emphasis>');
    });

    it('should use default moderate level', () => {
      const ssml = builder.start().emphasis('普通').build();

      expect(ssml).toContain('level="moderate"');
    });
  });

  describe('prosody', () => {
    it('should set rate', () => {
      const ssml = builder.start().prosody('速く', { rate: 150 }).build();

      expect(ssml).toContain('rate="150%"');
    });

    it('should set pitch', () => {
      const ssml = builder.start().prosody('高く', { pitch: 200 }).build();

      expect(ssml).toContain('pitch="200Hz"');
    });

    it('should set volume', () => {
      const ssml = builder.start().prosody('大きく', { volume: 10 }).build();

      expect(ssml).toContain('volume="10dB"');
    });

    it('should set multiple prosody attributes', () => {
      const ssml = builder
        .start()
        .prosody('複合', { rate: 120, pitch: 150, volume: 5 })
        .build();

      expect(ssml).toContain('rate="120%"');
      expect(ssml).toContain('pitch="150Hz"');
      expect(ssml).toContain('volume="5dB"');
    });
  });

  describe('sayAs', () => {
    it('should add say-as for numbers', () => {
      const ssml = builder.start().sayAs('123', 'cardinal').build();

      expect(ssml).toContain('<say-as interpret-as="cardinal">123</say-as>');
    });

    it('should add say-as for dates with format', () => {
      const ssml = builder.start().sayAs('2024-01-10', 'date', 'ymd').build();

      expect(ssml).toContain('interpret-as="date"');
      expect(ssml).toContain('format="ymd"');
    });

    it('should add say-as for telephone', () => {
      const ssml = builder.start().sayAs('03-1234-5678', 'telephone').build();

      expect(ssml).toContain('interpret-as="telephone"');
    });
  });

  describe('phoneme', () => {
    it('should add phoneme with IPA', () => {
      const ssml = builder.start().phoneme('東京', 'toːkjoː').build();

      expect(ssml).toContain('<phoneme alphabet="ipa" ph="toːkjoː">東京</phoneme>');
    });
  });

  describe('sub', () => {
    it('should add substitution', () => {
      const ssml = builder.start().sub('WHO', 'World Health Organization').build();

      expect(ssml).toContain('<sub alias="World Health Organization">WHO</sub>');
    });
  });

  describe('voice', () => {
    it('should set voice', () => {
      const ssml = builder
        .start()
        .voice('別の声で', { voiceName: 'test-voice', language: 'en-US' })
        .build();

      expect(ssml).toContain('<voice name="test-voice"');
      expect(ssml).toContain('xml:lang="en-US"');
    });
  });

  describe('paragraph and sentence', () => {
    it('should add paragraph', () => {
      const ssml = builder.start().paragraph('段落のテスト').build();

      expect(ssml).toContain('<p>段落のテスト</p>');
    });

    it('should add sentence', () => {
      const ssml = builder.start().sentence('文のテスト').build();

      expect(ssml).toContain('<s>文のテスト</s>');
    });
  });

  describe('style', () => {
    it('should add speaking style', () => {
      const ssml = builder.start().style('ニュース風に', 'newscast').build();

      expect(ssml).toContain('style="newscast"');
    });

    it('should add style with degree', () => {
      const ssml = builder.start().style('嬉しそうに', 'cheerful', 1.5).build();

      expect(ssml).toContain('styledegree="1.5"');
    });
  });

  describe('fromSegments', () => {
    it('should build SSML from segments', () => {
      const segments: TextSegment[] = [
        { text: '最初' },
        { text: '次', pauseBefore: 500, pauseAfter: 300 },
      ];

      const ssml = builder.fromSegments(segments).build();

      expect(ssml).toContain('最初');
      expect(ssml).toContain('次');
      expect(ssml).toContain('break');
    });

    it('should apply voice settings from segments', () => {
      const segments: TextSegment[] = [
        {
          text: 'テスト',
          voice: { speed: 1.5, pitch: 1.2, volume: 0.8 },
        },
      ];

      const ssml = builder.fromSegments(segments).build();

      expect(ssml).toContain('prosody');
    });
  });

  describe('toPlainText', () => {
    it('should convert SSML to plain text', () => {
      const text = builder
        .start()
        .text('こんにちは')
        .pause(500)
        .emphasis('世界', 'strong')
        .end()
        .toPlainText();

      expect(text).toBe('こんにちは世界');
    });
  });
});

describe('buildSSML utility', () => {
  it('should build simple SSML', () => {
    const ssml = buildSSML('テスト');

    expect(ssml).toContain('<speak');
    expect(ssml).toContain('テスト');
    expect(ssml).toContain('</speak>');
  });

  it('should build SSML with language', () => {
    const ssml = buildSSML('Test', { language: 'en-US' });

    expect(ssml).toContain('xml:lang="en-US"');
  });

  it('should build SSML with prosody', () => {
    const ssml = buildSSML('速いテスト', { rate: 150, pitch: 1.1, volume: 0.9 });

    expect(ssml).toContain('<prosody');
  });

  it('should add pauses at punctuation', () => {
    const ssml = buildSSML('文1。文2。', { pauses: true });

    expect(ssml).toContain('<break');
  });
});

describe('segmentText utility', () => {
  it('should return single segment for short text', () => {
    const segments = segmentText('短いテキスト');

    expect(segments.length).toBe(1);
  });

  it('should split long text', () => {
    const longText = 'あ'.repeat(10000);
    const segments = segmentText(longText, { maxLength: 1000 });

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every(s => s.length <= 1000)).toBe(true);
  });

  it('should preserve sentences when splitting', () => {
    const text = '文1です。文2です。文3です。文4です。文5です。';
    const segments = segmentText(text, { maxLength: 20, preserveSentences: true });

    expect(segments.every(s => !s.endsWith('。') || s.match(/。$/)));
  });
});

describe('Constants and Presets', () => {
  describe('PRESET_VOICES', () => {
    it('should have Japanese female preset', () => {
      expect(PRESET_VOICES['ja-female-1']).toBeDefined();
      expect(PRESET_VOICES['ja-female-1'].language).toBe('ja-JP');
      expect(PRESET_VOICES['ja-female-1'].gender).toBe('female');
    });

    it('should have Japanese male preset', () => {
      expect(PRESET_VOICES['ja-male-1']).toBeDefined();
      expect(PRESET_VOICES['ja-male-1'].gender).toBe('male');
    });

    it('should have English presets', () => {
      expect(PRESET_VOICES['en-female-1']).toBeDefined();
      expect(PRESET_VOICES['en-male-1']).toBeDefined();
    });

    it('should have news style preset', () => {
      expect(PRESET_VOICES['ja-news']).toBeDefined();
      expect(PRESET_VOICES['ja-news'].style).toBe('newscast');
    });
  });

  describe('QUALITY_PRESETS', () => {
    it('should have four quality levels', () => {
      expect(QUALITY_PRESETS.low).toBeDefined();
      expect(QUALITY_PRESETS.standard).toBeDefined();
      expect(QUALITY_PRESETS.high).toBeDefined();
      expect(QUALITY_PRESETS.ultra).toBeDefined();
    });

    it('should have increasing quality settings', () => {
      expect(QUALITY_PRESETS.low.sampleRate).toBeLessThan(QUALITY_PRESETS.standard.sampleRate);
      expect(QUALITY_PRESETS.standard.sampleRate).toBeLessThan(QUALITY_PRESETS.high.sampleRate);
      expect(QUALITY_PRESETS.high.bitrate).toBeLessThan(QUALITY_PRESETS.ultra.bitrate);
    });
  });

  describe('DEFAULT_TTS_OPTIONS', () => {
    it('should have default format', () => {
      expect(DEFAULT_TTS_OPTIONS.format).toBe('mp3');
    });

    it('should have default quality', () => {
      expect(DEFAULT_TTS_OPTIONS.quality).toBe('standard');
    });
  });

  describe('AUDIO_ERROR_CODES', () => {
    it('should have all error codes defined', () => {
      expect(AUDIO_ERROR_CODES.INVALID_TEXT).toBeDefined();
      expect(AUDIO_ERROR_CODES.SYNTHESIS_FAILED).toBeDefined();
      expect(AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBeDefined();
      expect(AUDIO_ERROR_CODES.VOICE_NOT_AVAILABLE).toBeDefined();
      expect(AUDIO_ERROR_CODES.INVALID_SCRIPT).toBeDefined();
      expect(AUDIO_ERROR_CODES.SPEAKER_NOT_FOUND).toBeDefined();
    });
  });
});

describe('AudioGeneratorError', () => {
  it('should create error with message and code', () => {
    const error = new AudioGeneratorError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('AudioGeneratorError');
  });

  it('should include details in error', () => {
    const error = new AudioGeneratorError('Error with details', 'CODE', {
      provider: 'test',
      reason: 'testing',
    });

    expect(error.details).toEqual({ provider: 'test', reason: 'testing' });
  });

  it('should be instanceof Error', () => {
    const error = new AudioGeneratorError('Test', 'CODE');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AudioGeneratorError);
  });
});

describe('Provider Error Handling', () => {
  it('should throw error for unconfigured Google TTS', async () => {
    const gen = new AudioGenerator({ provider: 'google-tts' });

    await expect(gen.textToSpeech('test')).rejects.toThrow(AudioGeneratorError);
    await expect(gen.textToSpeech('test')).rejects.toMatchObject({
      code: AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    });
  });

  it('should throw error for unconfigured Amazon Polly', async () => {
    const gen = new AudioGenerator({ provider: 'amazon-polly' });

    await expect(gen.textToSpeech('test')).rejects.toThrow(AudioGeneratorError);
  });

  it('should throw error for unconfigured ElevenLabs', async () => {
    const gen = new AudioGenerator({ provider: 'elevenlabs' });

    await expect(gen.textToSpeech('test')).rejects.toThrow(AudioGeneratorError);
  });

  it('should throw error for unconfigured OpenAI TTS', async () => {
    const gen = new AudioGenerator({ provider: 'openai-tts' });

    await expect(gen.textToSpeech('test')).rejects.toThrow(AudioGeneratorError);
  });

  it('should throw error for unconfigured Azure TTS', async () => {
    const gen = new AudioGenerator({ provider: 'azure-tts' });

    await expect(gen.textToSpeech('test')).rejects.toThrow(AudioGeneratorError);
  });
});
