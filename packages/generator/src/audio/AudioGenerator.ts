/**
 * AudioGenerator
 * 音声生成・テキスト読み上げエンジン
 * REQ-MEDIA-005: 音声/ポッドキャスト生成
 */

import type {
  AudioProvider,
  AudioFormat,
  AudioQuality,
  LanguageCode,
  VoiceConfig,
  TTSOptions,
  PodcastScript,
  AudioBuffer,
  GeneratedAudio,
  AudioMetadata,
  AvailableVoice,
  AudioGeneratorOptions,
  TextSegment,
} from './types.js';

import {
  PRESET_VOICES,
  QUALITY_PRESETS,
  DEFAULT_TTS_OPTIONS,
  AudioGeneratorError,
  AUDIO_ERROR_CODES,
} from './types.js';

import { SSMLBuilder, buildSSML, segmentText } from './SSMLBuilder.js';

/**
 * TTS APIプロバイダーインターフェース
 */
interface TTSProvider {
  synthesize(text: string, options: TTSOptions): Promise<AudioBuffer>;
  listVoices(language?: LanguageCode): Promise<AvailableVoice[]>;
  getSupportedFormats(): AudioFormat[];
  getMaxTextLength(): number;
}

/**
 * モックTTSプロバイダー（テスト用）
 */
class MockTTSProvider implements TTSProvider {
  private readonly voices: AvailableVoice[] = [
    { voiceId: 'ja-JP-Wavenet-A', name: 'Mizuki', language: 'ja-JP', gender: 'female', styles: ['neutral', 'cheerful'] },
    { voiceId: 'ja-JP-Wavenet-C', name: 'Takumi', language: 'ja-JP', gender: 'male', styles: ['neutral', 'newscast'] },
    { voiceId: 'en-US-Wavenet-F', name: 'Joanna', language: 'en-US', gender: 'female', styles: ['neutral', 'conversational'] },
    { voiceId: 'en-US-Wavenet-D', name: 'Matthew', language: 'en-US', gender: 'male', styles: ['neutral'] },
    { voiceId: 'zh-CN-Wavenet-A', name: 'Zhiyu', language: 'zh-CN', gender: 'female', styles: ['neutral'] },
    { voiceId: 'ko-KR-Wavenet-A', name: 'Seoyeon', language: 'ko-KR', gender: 'female', styles: ['neutral'] },
  ];

  async synthesize(text: string, options: TTSOptions): Promise<AudioBuffer> {
    // シミュレートした音声データ生成
    const quality = QUALITY_PRESETS[options.quality ?? 'standard'];
    const duration = this.estimateDuration(text, options.voice?.speed);
    const byteLength = Math.floor(duration * quality.bitrate * 1000 / 8);
    
    // ダミーデータを生成
    const data = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }

    return {
      data,
      format: options.format ?? 'mp3',
      sampleRate: quality.sampleRate,
      channels: 1,
      duration,
      bitrate: quality.bitrate,
    };
  }

  async listVoices(language?: LanguageCode): Promise<AvailableVoice[]> {
    if (language) {
      return this.voices.filter(v => v.language === language);
    }
    return this.voices;
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav', 'ogg'];
  }

  getMaxTextLength(): number {
    return 5000;
  }

  private estimateDuration(text: string, speed = 1.0): number {
    // 日本語: 約5文字/秒、英語: 約15文字/秒
    const isJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
    const charsPerSecond = isJapanese ? 5 : 15;
    return (text.length / charsPerSecond) / speed;
  }
}

/**
 * Google Cloud TTS プロバイダー（スタブ）
 */
class GoogleTTSProvider implements TTSProvider {
  // @ts-expect-error - Reserved for future implementation
  private readonly _apiKey?: string;
  constructor(apiKey?: string) {
    this._apiKey = apiKey;
  }

  async synthesize(_text: string, _options: TTSOptions): Promise<AudioBuffer> {
    // 実際の実装では Google Cloud TTS API を呼び出す
    throw new AudioGeneratorError(
      'Google Cloud TTS APIキーが設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'google-tts' }
    );
  }

  async listVoices(_language?: LanguageCode): Promise<AvailableVoice[]> {
    throw new AudioGeneratorError(
      'Google Cloud TTS APIキーが設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'google-tts' }
    );
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav', 'ogg'];
  }

  getMaxTextLength(): number {
    return 5000;
  }
}

/**
 * Amazon Polly プロバイダー（スタブ）
 */
class AmazonPollyProvider implements TTSProvider {
  // @ts-expect-error - Reserved for future implementation
  private readonly _credentials?: { accessKeyId: string; secretAccessKey: string; region: string };
  constructor(credentials?: { accessKeyId: string; secretAccessKey: string; region: string }) {
    this._credentials = credentials;
  }

  async synthesize(_text: string, _options: TTSOptions): Promise<AudioBuffer> {
    throw new AudioGeneratorError(
      'Amazon Pollyの認証情報が設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'amazon-polly' }
    );
  }

  async listVoices(_language?: LanguageCode): Promise<AvailableVoice[]> {
    throw new AudioGeneratorError(
      'Amazon Pollyの認証情報が設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'amazon-polly' }
    );
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'ogg'];
  }

  getMaxTextLength(): number {
    return 3000;
  }
}

/**
 * ElevenLabs プロバイダー（スタブ）
 */
class ElevenLabsProvider implements TTSProvider {
  // @ts-expect-error - Reserved for future implementation
  private readonly _apiKey?: string;
  constructor(apiKey?: string) {
    this._apiKey = apiKey;
  }

  async synthesize(_text: string, _options: TTSOptions): Promise<AudioBuffer> {
    throw new AudioGeneratorError(
      'ElevenLabs APIキーが設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'elevenlabs' }
    );
  }

  async listVoices(_language?: LanguageCode): Promise<AvailableVoice[]> {
    throw new AudioGeneratorError(
      'ElevenLabs APIキーが設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'elevenlabs' }
    );
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav'];
  }

  getMaxTextLength(): number {
    return 5000;
  }
}

/**
 * OpenAI TTS プロバイダー（スタブ）
 */
class OpenAITTSProvider implements TTSProvider {
  // @ts-expect-error - Reserved for future implementation
  private readonly _apiKey?: string;
  constructor(apiKey?: string) {
    this._apiKey = apiKey;
  }

  async synthesize(_text: string, _options: TTSOptions): Promise<AudioBuffer> {
    throw new AudioGeneratorError(
      'OpenAI APIキーが設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'openai-tts' }
    );
  }

  async listVoices(_language?: LanguageCode): Promise<AvailableVoice[]> {
    // OpenAI TTSは6つの音声をサポート
    return [
      { voiceId: 'alloy', name: 'Alloy', language: 'en-US', gender: 'neutral' },
      { voiceId: 'echo', name: 'Echo', language: 'en-US', gender: 'male' },
      { voiceId: 'fable', name: 'Fable', language: 'en-US', gender: 'neutral' },
      { voiceId: 'onyx', name: 'Onyx', language: 'en-US', gender: 'male' },
      { voiceId: 'nova', name: 'Nova', language: 'en-US', gender: 'female' },
      { voiceId: 'shimmer', name: 'Shimmer', language: 'en-US', gender: 'female' },
    ];
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav', 'ogg', 'aac', 'flac'];
  }

  getMaxTextLength(): number {
    return 4096;
  }
}

/**
 * Azure TTS プロバイダー（スタブ）
 */
class AzureTTSProvider implements TTSProvider {
  // @ts-expect-error - Reserved for future implementation
  private readonly _credentials?: { subscriptionKey: string; region: string };
  constructor(credentials?: { subscriptionKey: string; region: string }) {
    this._credentials = credentials;
  }

  async synthesize(_text: string, _options: TTSOptions): Promise<AudioBuffer> {
    throw new AudioGeneratorError(
      'Azure Speech Serviceの認証情報が設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'azure-tts' }
    );
  }

  async listVoices(_language?: LanguageCode): Promise<AvailableVoice[]> {
    throw new AudioGeneratorError(
      'Azure Speech Serviceの認証情報が設定されていません',
      AUDIO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      { provider: 'azure-tts' }
    );
  }

  getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav', 'ogg'];
  }

  getMaxTextLength(): number {
    return 10000; // Azure supports longer text
  }
}

/**
 * 音声生成クラス
 */
export class AudioGenerator {
  private readonly provider: TTSProvider;
  private readonly options: AudioGeneratorOptions;
  private readonly defaultTTSOptions: TTSOptions;

  constructor(options: AudioGeneratorOptions = {}) {
    this.options = options;
    this.provider = this.createProvider(options.provider ?? 'mock');
    this.defaultTTSOptions = {
      ...DEFAULT_TTS_OPTIONS,
      provider: options.provider,
      format: options.defaultFormat,
      quality: options.defaultQuality,
    };
  }

  /**
   * プロバイダーを作成
   */
  private createProvider(providerType: AudioProvider): TTSProvider {
    switch (providerType) {
      case 'google-tts':
        return new GoogleTTSProvider(this.options.apiKey);
      case 'amazon-polly':
        return new AmazonPollyProvider(this.options.awsCredentials);
      case 'elevenlabs':
        return new ElevenLabsProvider(this.options.apiKey);
      case 'openai-tts':
        return new OpenAITTSProvider(this.options.apiKey);
      case 'azure-tts':
        return new AzureTTSProvider(this.options.azureCredentials);
      case 'mock':
      default:
        return new MockTTSProvider();
    }
  }

  /**
   * テキストを音声に変換
   * REQ-MEDIA-005-001: テキスト音声変換
   */
  async textToSpeech(text: string, options?: TTSOptions): Promise<GeneratedAudio> {
    // バリデーション
    if (!text || typeof text !== 'string') {
      throw new AudioGeneratorError(
        'テキストが空または無効です',
        AUDIO_ERROR_CODES.INVALID_TEXT,
        { text }
      );
    }

    const mergedOptions = this.mergeOptions(options);
    
    // テキストの長さをチェック
    const maxLength = this.provider.getMaxTextLength();
    if (text.length > maxLength) {
      // 長いテキストは分割して合成
      return this.synthesizeLongText(text, mergedOptions);
    }

    try {
      // SSML構築（オプション）
      let processedText = text;
      if (mergedOptions.enableSSML) {
        processedText = buildSSML(text, {
          language: mergedOptions.voice?.language,
          rate: mergedOptions.voice?.speed,
          pitch: mergedOptions.voice?.pitch,
          volume: mergedOptions.voice?.volume,
        });
      }

      const buffer = await this.provider.synthesize(processedText, mergedOptions);
      const metadata = this.createMetadata(text, buffer, mergedOptions);

      return {
        audio: buffer,
        metadata,
        segments: [{
          startTime: 0,
          endTime: buffer.duration,
          text,
        }],
      };
    } catch (error) {
      if (error instanceof AudioGeneratorError) {
        throw error;
      }
      throw new AudioGeneratorError(
        `音声合成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        AUDIO_ERROR_CODES.SYNTHESIS_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * 複数セグメントから音声を生成
   */
  async synthesizeSegments(segments: TextSegment[], options?: TTSOptions): Promise<GeneratedAudio> {
    if (!segments || segments.length === 0) {
      throw new AudioGeneratorError(
        'セグメントが空です',
        AUDIO_ERROR_CODES.INVALID_TEXT,
        { segments }
      );
    }

    const mergedOptions = this.mergeOptions(options);
    const audioBuffers: AudioBuffer[] = [];
    const outputSegments: GeneratedAudio['segments'] = [];
    let currentTime = 0;

    for (const segment of segments) {
      const segmentOptions = {
        ...mergedOptions,
        voice: segment.voice ?? mergedOptions.voice,
      };

      // 前のポーズを追加
      if (segment.pauseBefore) {
        currentTime += segment.pauseBefore / 1000;
      }

      const buffer = await this.provider.synthesize(segment.text, segmentOptions);
      audioBuffers.push(buffer);

      outputSegments.push({
        startTime: currentTime,
        endTime: currentTime + buffer.duration,
        text: segment.text,
        speaker: segment.speakerId,
      });

      currentTime += buffer.duration;

      // 後のポーズを追加
      if (segment.pauseAfter) {
        currentTime += segment.pauseAfter / 1000;
      }
    }

    const combinedBuffer = this.combineBuffers(audioBuffers, mergedOptions.format ?? 'mp3');
    const fullText = segments.map(s => s.text).join(' ');
    const metadata = this.createMetadata(fullText, combinedBuffer, mergedOptions);

    return {
      audio: combinedBuffer,
      metadata,
      segments: outputSegments,
    };
  }

  /**
   * ポッドキャストを生成
   * REQ-MEDIA-005-002: ポッドキャスト形式生成
   */
  async generatePodcast(script: PodcastScript): Promise<GeneratedAudio> {
    // バリデーション
    if (!script.title) {
      throw new AudioGeneratorError(
        'ポッドキャストタイトルが必要です',
        AUDIO_ERROR_CODES.INVALID_SCRIPT,
        { script }
      );
    }

    if (!script.segments || script.segments.length === 0) {
      throw new AudioGeneratorError(
        'ポッドキャストセグメントが必要です',
        AUDIO_ERROR_CODES.INVALID_SCRIPT,
        { script }
      );
    }

    const speakerMap = new Map(script.speakers.map(s => [s.id, s]));
    const audioBuffers: AudioBuffer[] = [];
    const outputSegments: GeneratedAudio['segments'] = [];
    let currentTime = 0;

    // イントロを生成
    if (script.intro) {
      const introBuffer = await this.synthesizeIntroOutro(script.intro, 'intro');
      audioBuffers.push(introBuffer);
      outputSegments.push({
        startTime: currentTime,
        endTime: currentTime + introBuffer.duration,
        text: script.intro,
        speaker: '_intro',
      });
      currentTime += introBuffer.duration;
    }

    // メインセグメントを生成
    for (const segment of script.segments) {
      const speaker = speakerMap.get(segment.speakerId);
      if (!speaker) {
        throw new AudioGeneratorError(
          `スピーカーが見つかりません: ${segment.speakerId}`,
          AUDIO_ERROR_CODES.SPEAKER_NOT_FOUND,
          { speakerId: segment.speakerId }
        );
      }

      const segmentOptions: TTSOptions = {
        ...this.defaultTTSOptions,
        voice: speaker.voice,
      };

      // SSMLでスタイル適用
      let processedText = segment.text;
      if (segment.emotion || segment.style) {
        const builder = new SSMLBuilder(speaker.voice.language ?? 'ja-JP');
        if (segment.style) {
          builder.start().style(segment.text, segment.style).end();
        } else {
          builder.start().text(segment.text).end();
        }
        processedText = builder.build();
        segmentOptions.enableSSML = true;
      }

      const buffer = await this.provider.synthesize(processedText, segmentOptions);
      audioBuffers.push(buffer);

      outputSegments.push({
        startTime: currentTime,
        endTime: currentTime + buffer.duration,
        text: segment.text,
        speaker: segment.speakerId,
      });

      currentTime += buffer.duration;

      // セグメント間のポーズ
      if (segment.pauseAfter) {
        currentTime += segment.pauseAfter / 1000;
      } else {
        currentTime += 0.5; // デフォルト500ms
      }
    }

    // アウトロを生成
    if (script.outro) {
      const outroBuffer = await this.synthesizeIntroOutro(script.outro, 'outro');
      audioBuffers.push(outroBuffer);
      outputSegments.push({
        startTime: currentTime,
        endTime: currentTime + outroBuffer.duration,
        text: script.outro,
        speaker: '_outro',
      });
      currentTime += outroBuffer.duration;
    }

    const combinedBuffer = this.combineBuffers(audioBuffers, this.defaultTTSOptions.format ?? 'mp3');
    
    const metadata: AudioMetadata = {
      title: script.title,
      description: script.description,
      format: combinedBuffer.format,
      duration: combinedBuffer.duration,
      sampleRate: combinedBuffer.sampleRate,
      channels: combinedBuffer.channels,
      bitrate: combinedBuffer.bitrate,
      fileSize: combinedBuffer.data.length,
      createdAt: new Date().toISOString(),
      provider: this.options.provider ?? 'mock',
      speakers: script.speakers.map(s => s.name),
      segmentCount: script.segments.length,
    };

    return {
      audio: combinedBuffer,
      metadata,
      segments: outputSegments,
    };
  }

  /**
   * イントロ/アウトロを合成
   */
  private async synthesizeIntroOutro(text: string, type: 'intro' | 'outro'): Promise<AudioBuffer> {
    const options: TTSOptions = {
      ...this.defaultTTSOptions,
      voice: {
        ...PRESET_VOICES['ja-female-1'],
        speed: type === 'intro' ? 1.0 : 0.95, // アウトロは少しゆっくり
      },
    };

    return this.provider.synthesize(text, options);
  }

  /**
   * 利用可能な音声を取得
   */
  async listVoices(language?: LanguageCode): Promise<AvailableVoice[]> {
    try {
      return await this.provider.listVoices(language);
    } catch (error) {
      if (error instanceof AudioGeneratorError) {
        throw error;
      }
      throw new AudioGeneratorError(
        '音声リストの取得に失敗しました',
        AUDIO_ERROR_CODES.VOICE_NOT_AVAILABLE,
        { language, originalError: error }
      );
    }
  }

  /**
   * プリセット音声を取得
   */
  getPresetVoice(presetName: keyof typeof PRESET_VOICES): VoiceConfig {
    const voice = PRESET_VOICES[presetName];
    if (!voice) {
      throw new AudioGeneratorError(
        `プリセット音声が見つかりません: ${presetName}`,
        AUDIO_ERROR_CODES.VOICE_NOT_AVAILABLE,
        { presetName }
      );
    }
    return voice;
  }

  /**
   * 品質プリセットを取得
   */
  getQualityPreset(quality: AudioQuality): { sampleRate: number; bitrate: number } {
    return QUALITY_PRESETS[quality];
  }

  /**
   * サポートされているフォーマットを取得
   */
  getSupportedFormats(): AudioFormat[] {
    return this.provider.getSupportedFormats();
  }

  /**
   * テキストの推定時間を計算
   */
  estimateDuration(text: string, options?: { speed?: number; language?: LanguageCode }): number {
    const speed = options?.speed ?? 1.0;
    const language = options?.language ?? 'ja-JP';
    
    // 言語による文字/秒の調整
    const isJapanese = language.startsWith('ja') || /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
    const charsPerSecond = isJapanese ? 5 : 15;
    
    return (text.length / charsPerSecond) / speed;
  }

  /**
   * 長いテキストを分割して合成
   */
  private async synthesizeLongText(text: string, options: TTSOptions): Promise<GeneratedAudio> {
    const maxLength = this.provider.getMaxTextLength();
    const chunks = segmentText(text, { maxLength, preserveSentences: true });
    
    const audioBuffers: AudioBuffer[] = [];
    const segments: GeneratedAudio['segments'] = [];
    let currentTime = 0;

    for (const chunk of chunks) {
      const buffer = await this.provider.synthesize(chunk, options);
      audioBuffers.push(buffer);

      segments.push({
        startTime: currentTime,
        endTime: currentTime + buffer.duration,
        text: chunk,
      });

      currentTime += buffer.duration;
    }

    const combinedBuffer = this.combineBuffers(audioBuffers, options.format ?? 'mp3');
    const metadata = this.createMetadata(text, combinedBuffer, options);

    return {
      audio: combinedBuffer,
      metadata,
      segments,
    };
  }

  /**
   * オプションをマージ
   */
  private mergeOptions(options?: TTSOptions): TTSOptions {
    return {
      ...this.defaultTTSOptions,
      ...options,
      voice: {
        ...this.defaultTTSOptions.voice,
        ...options?.voice,
      },
    };
  }

  /**
   * メタデータを作成
   */
  private createMetadata(text: string, buffer: AudioBuffer, options: TTSOptions): AudioMetadata {
    return {
      format: buffer.format,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.channels,
      bitrate: buffer.bitrate,
      fileSize: buffer.data.length,
      createdAt: new Date().toISOString(),
      provider: this.options.provider ?? 'mock',
      voice: options.voice?.voiceName ?? options.voice?.voiceId,
      language: options.voice?.language,
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
    };
  }

  /**
   * 複数のバッファを結合
   */
  private combineBuffers(buffers: AudioBuffer[], format: AudioFormat): AudioBuffer {
    if (buffers.length === 0) {
      return {
        data: new Uint8Array(0),
        format,
        sampleRate: 22050,
        channels: 1,
        duration: 0,
      };
    }

    if (buffers.length === 1) {
      return buffers[0]!;
    }

    // 全バッファのデータを結合
    const totalLength = buffers.reduce((sum, b) => sum + b.data.length, 0);
    const combinedData = new Uint8Array(totalLength);
    let offset = 0;

    for (const buffer of buffers) {
      combinedData.set(buffer.data, offset);
      offset += buffer.data.length;
    }

    const totalDuration = buffers.reduce((sum, b) => sum + b.duration, 0);
    const firstBuffer = buffers[0]!;

    return {
      data: combinedData,
      format,
      sampleRate: firstBuffer.sampleRate,
      channels: firstBuffer.channels,
      duration: totalDuration,
      bitrate: firstBuffer.bitrate,
    };
  }
}

// デフォルトエクスポート
export default AudioGenerator;
