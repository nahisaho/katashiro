/**
 * ElevenLabs TTS プロバイダー
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-011-4
 */

import type {
  AudioSynthesisConfig,
  AudioSynthesisResult,
  TTSProviderConfig,
  AudioFormat,
  GenerationMetadata,
} from '../../types.js';
import { BaseAudioProvider } from '../AudioProviderInterface.js';

/**
 * ElevenLabs モデル
 */
export type ElevenLabsModel =
  | 'eleven_monolingual_v1'
  | 'eleven_multilingual_v1'
  | 'eleven_multilingual_v2'
  | 'eleven_turbo_v2';

/**
 * ElevenLabs プロバイダー設定
 */
export interface ElevenLabsProviderConfig extends TTSProviderConfig {
  type: 'elevenlabs';
  /** ElevenLabs API キー */
  apiKey: string;
  /** 使用するモデル */
  model?: ElevenLabsModel;
  /** ベースURL（オプション） */
  baseUrl?: string;
}

/**
 * ElevenLabs API Voice レスポンス
 */
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

/**
 * ElevenLabs TTS プロバイダー
 *
 * @example
 * ```typescript
 * const provider = new ElevenLabsProvider({
 *   type: 'elevenlabs',
 *   apiKey: process.env.ELEVENLABS_API_KEY!,
 * });
 *
 * const result = await provider.synthesize({
 *   text: 'Hello, world!',
 *   voice: 'voice-id-here',
 *   format: 'mp3',
 * });
 * ```
 */
export class ElevenLabsProvider extends BaseAudioProvider {
  readonly name = 'ElevenLabs';
  readonly type = 'elevenlabs';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: ElevenLabsModel;

  constructor(config: ElevenLabsProviderConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.elevenlabs.io/v1';
    this.model = config.model ?? 'eleven_multilingual_v2';
  }

  /**
   * 音声を合成
   */
  async synthesize(config: AudioSynthesisConfig): Promise<AudioSynthesisResult> {
    const mergedConfig = this.mergeWithDefaults(config);
    const startTime = Date.now();

    // 出力形式
    const outputFormat = this.convertFormat(mergedConfig.format ?? 'mp3');

    // リクエストボディ
    const body = {
      text: mergedConfig.text,
      model_id: this.model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: mergedConfig.style ? 0.5 : 0,
        use_speaker_boost: true,
      },
    };

    // API呼び出し
    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${mergedConfig.voice}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    // 音声データを取得
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const durationMs = Date.now() - startTime;

    // 音声長を推定
    const estimatedDuration = this.estimateDuration(mergedConfig.text, mergedConfig.speed ?? 1.0);

    const metadata: GenerationMetadata = {
      provider: this.name,
      model: this.model,
      generatedAt: new Date(),
      durationMs,
      cost: this.estimateCost(mergedConfig.text.length),
    };

    return {
      audio: base64,
      format: mergedConfig.format ?? 'mp3',
      durationSeconds: estimatedDuration,
      sampleRate: 44100, // ElevenLabs default
      metadata,
    };
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 利用可能な音声一覧
   */
  async listVoices(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as { voices: ElevenLabsVoice[] };
      return data.voices.map((v) => `${v.voice_id}:${v.name}`);
    } catch {
      return [];
    }
  }

  /**
   * フォーマットをElevenLabs形式に変換
   */
  private convertFormat(format: AudioFormat): string {
    const formatMap: Record<AudioFormat, string> = {
      mp3: 'mp3_44100_128',
      wav: 'pcm_44100',
      ogg: 'mp3_44100_128', // OGGはサポートされていないのでMP3にフォールバック
      flac: 'pcm_44100', // FLACはPCMにフォールバック
      aac: 'mp3_44100_128', // AACはMP3にフォールバック
    };
    return formatMap[format] ?? 'mp3_44100_128';
  }

  /**
   * 音声長を推定（秒）
   */
  private estimateDuration(text: string, speed: number): number {
    const words = text.length / 5;
    const baseSeconds = words / 2.5;
    return baseSeconds / speed;
  }

  /**
   * コストを見積もり（USD）
   */
  private estimateCost(characterCount: number): number {
    // ElevenLabs pricing varies by plan
    // Approximate: $0.30 per 1K characters for standard
    return (characterCount / 1000) * 0.3;
  }
}
