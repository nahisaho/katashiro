/**
 * OpenAI TTS プロバイダー
 *
 * @module @nahisaho/katashiro-media
 * @task TASK-011-3
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
 * OpenAI TTS モデル
 */
export type OpenAITTSModel = 'tts-1' | 'tts-1-hd';

/**
 * OpenAI TTS 音声
 */
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * OpenAI TTS プロバイダー設定
 */
export interface OpenAITTSProviderConfig extends TTSProviderConfig {
  type: 'openai';
  /** OpenAI API キー */
  apiKey: string;
  /** 使用するモデル */
  model?: OpenAITTSModel;
  /** ベースURL（オプション） */
  baseUrl?: string;
}

/**
 * OpenAI TTS プロバイダー
 *
 * @example
 * ```typescript
 * const provider = new OpenAITTSProvider({
 *   type: 'openai',
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'tts-1-hd',
 * });
 *
 * const result = await provider.synthesize({
 *   text: 'Hello, world!',
 *   voice: 'nova',
 *   format: 'mp3',
 * });
 * ```
 */
export class OpenAITTSProvider extends BaseAudioProvider {
  readonly name = 'OpenAI TTS';
  readonly type = 'openai';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: OpenAITTSModel;

  constructor(config: OpenAITTSProviderConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model ?? 'tts-1';
  }

  /**
   * 音声を合成
   */
  async synthesize(config: AudioSynthesisConfig): Promise<AudioSynthesisResult> {
    const mergedConfig = this.mergeWithDefaults(config);
    const startTime = Date.now();

    // フォーマットをOpenAI形式に変換
    const responseFormat = this.convertFormat(mergedConfig.format ?? 'mp3');

    // リクエストボディ
    const body = {
      model: this.model,
      input: mergedConfig.text,
      voice: mergedConfig.voice as OpenAIVoice,
      response_format: responseFormat,
      speed: mergedConfig.speed ?? 1.0,
    };

    // API呼び出し
    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI TTS API error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    // 音声データを取得
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const durationMs = Date.now() - startTime;

    // 音声長を推定（テキスト長に基づく簡易計算）
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
      sampleRate: 24000, // OpenAI TTS default
      metadata,
    };
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }

  /**
   * フォーマットをOpenAI形式に変換
   */
  private convertFormat(format: AudioFormat): string {
    const formatMap: Record<AudioFormat, string> = {
      mp3: 'mp3',
      wav: 'wav',
      ogg: 'opus',
      flac: 'flac',
      aac: 'aac',
    };
    return formatMap[format] ?? 'mp3';
  }

  /**
   * 音声長を推定（秒）
   */
  private estimateDuration(text: string, speed: number): number {
    // 平均的な読み上げ速度: 約150単語/分 = 2.5単語/秒
    // 英語の平均単語長: 約5文字
    const words = text.length / 5;
    const baseSeconds = words / 2.5;
    return baseSeconds / speed;
  }

  /**
   * コストを見積もり（USD）
   */
  private estimateCost(characterCount: number): number {
    // OpenAI TTS pricing: $0.015 per 1K characters (tts-1)
    // $0.030 per 1K characters (tts-1-hd)
    const pricePerThousand = this.model === 'tts-1-hd' ? 0.03 : 0.015;
    return (characterCount / 1000) * pricePerThousand;
  }
}
