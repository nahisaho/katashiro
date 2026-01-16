/**
 * AudioSynthesizer - 音声合成メインクラス
 *
 * 複数の音声合成プロバイダーを統合して使用できるファサード
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-011-2
 */

import type {
  AudioSynthesisConfig,
  AudioSynthesisResult,
  TTSProviderType,
  MediaGenerationOptions,
} from '../types.js';
import type { AudioProviderInterface } from './AudioProviderInterface.js';
import { OpenAITTSProvider, type OpenAITTSProviderConfig } from './providers/OpenAITTSProvider.js';
import { ElevenLabsProvider, type ElevenLabsProviderConfig } from './providers/ElevenLabsProvider.js';

/**
 * AudioSynthesizer 設定
 */
export interface AudioSynthesizerConfig {
  /** デフォルトプロバイダー */
  defaultProvider?: TTSProviderType;
  /** プロバイダー設定 */
  providers?: {
    openai?: OpenAITTSProviderConfig;
    elevenlabs?: ElevenLabsProviderConfig;
  };
  /** 共通オプション */
  options?: MediaGenerationOptions;
}

/**
 * 音声合成ファサードクラス
 *
 * 複数の音声合成プロバイダー（OpenAI TTS, ElevenLabs等）を
 * 統一されたインターフェースで使用できます。
 *
 * @example
 * ```typescript
 * const synthesizer = new AudioSynthesizer({
 *   defaultProvider: 'openai',
 *   providers: {
 *     openai: {
 *       type: 'openai',
 *       apiKey: process.env.OPENAI_API_KEY!,
 *       model: 'tts-1-hd',
 *     },
 *   },
 * });
 *
 * const result = await synthesizer.synthesize({
 *   text: 'Hello, world!',
 *   voice: 'nova',
 *   format: 'mp3',
 * });
 *
 * // Base64でエンコードされた音声データ
 * console.log(result.audio);
 * ```
 */
export class AudioSynthesizer {
  private readonly providers: Map<TTSProviderType, AudioProviderInterface> = new Map();
  private readonly defaultProvider: TTSProviderType;
  private readonly options: MediaGenerationOptions;

  constructor(config: AudioSynthesizerConfig = {}) {
    this.defaultProvider = config.defaultProvider ?? 'openai';
    this.options = config.options ?? {};

    // プロバイダーを初期化
    if (config.providers?.openai) {
      this.providers.set('openai', new OpenAITTSProvider(config.providers.openai));
    }
    if (config.providers?.elevenlabs) {
      this.providers.set('elevenlabs', new ElevenLabsProvider(config.providers.elevenlabs));
    }
  }

  /**
   * 音声を合成
   *
   * @param config - 合成設定
   * @param providerType - 使用するプロバイダー（省略時はデフォルト）
   * @returns 合成結果
   */
  async synthesize(
    config: AudioSynthesisConfig,
    providerType?: TTSProviderType
  ): Promise<AudioSynthesisResult> {
    const type = providerType ?? this.defaultProvider;
    const provider = this.providers.get(type);

    if (!provider) {
      throw new Error(
        `Provider '${type}' is not configured. Available: ${[...this.providers.keys()].join(', ')}`
      );
    }

    // タイムアウト付きで実行
    const timeout = this.options.timeout ?? 60000;
    const result = await Promise.race([
      provider.synthesize(config),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Synthesis timeout')), timeout)
      ),
    ]);

    return result;
  }

  /**
   * テキストを分割して合成（長文対応）
   *
   * @param text - 合成するテキスト
   * @param config - 合成設定（textは上書きされる）
   * @returns 結合された合成結果
   */
  async synthesizeLongText(
    text: string,
    config: Omit<AudioSynthesisConfig, 'text'>
  ): Promise<AudioSynthesisResult> {
    // テキストを文単位で分割（最大4000文字程度）
    const chunks = this.splitText(text, 4000);

    if (chunks.length === 1) {
      return this.synthesize({ ...config, text: chunks[0]! });
    }

    // 各チャンクを合成
    const results: AudioSynthesisResult[] = [];
    let totalDuration = 0;

    for (const chunk of chunks) {
      const result = await this.synthesize({ ...config, text: chunk });
      results.push(result);
      totalDuration += result.durationSeconds;
    }

    // 音声データを結合（Base64）
    // 注: 実際の結合にはffmpegなどが必要
    const combinedAudio = results.map((r) => r.audio).join('');

    return {
      audio: combinedAudio,
      format: results[0]?.format ?? 'mp3',
      durationSeconds: totalDuration,
      sampleRate: results[0]?.sampleRate ?? 24000,
      metadata: {
        provider: results[0]?.metadata.provider ?? 'unknown',
        model: results[0]?.metadata.model ?? 'unknown',
        generatedAt: new Date(),
        durationMs: results.reduce((sum, r) => sum + r.metadata.durationMs, 0),
        cost: results.reduce((sum, r) => sum + (r.metadata.cost ?? 0), 0),
      },
    };
  }

  /**
   * プロバイダーを追加
   */
  addProvider(type: TTSProviderType, provider: AudioProviderInterface): void {
    this.providers.set(type, provider);
  }

  /**
   * プロバイダーを取得
   */
  getProvider(type: TTSProviderType): AudioProviderInterface | undefined {
    return this.providers.get(type);
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  listProviders(): TTSProviderType[] {
    return [...this.providers.keys()];
  }

  /**
   * 利用可能な音声一覧
   */
  async listVoices(providerType?: TTSProviderType): Promise<string[]> {
    const type = providerType ?? this.defaultProvider;
    const provider = this.providers.get(type);
    if (!provider) return [];
    return provider.listVoices();
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isProviderAvailable(type?: TTSProviderType): Promise<boolean> {
    const providerType = type ?? this.defaultProvider;
    const provider = this.providers.get(providerType);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * ファクトリーメソッド: OpenAI プロバイダーで作成
   */
  static withOpenAI(apiKey: string, model?: 'tts-1' | 'tts-1-hd'): AudioSynthesizer {
    return new AudioSynthesizer({
      defaultProvider: 'openai',
      providers: {
        openai: {
          type: 'openai',
          apiKey,
          model: model ?? 'tts-1',
        },
      },
    });
  }

  /**
   * ファクトリーメソッド: ElevenLabs プロバイダーで作成
   */
  static withElevenLabs(apiKey: string): AudioSynthesizer {
    return new AudioSynthesizer({
      defaultProvider: 'elevenlabs',
      providers: {
        elevenlabs: {
          type: 'elevenlabs',
          apiKey,
        },
      },
    });
  }

  /**
   * テキストを分割
   */
  private splitText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?。！？])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
