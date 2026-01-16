/**
 * OpenAI Whisper Provider
 *
 * OpenAI Whisper 音声文字起こしプロバイダー
 *
 * @task TASK-013-2
 */

import type { TranscriptionConfig, TranscriptionResult, TranscriptionSegment, TranscriptionWord } from '../../types.js';
import {
  BaseTranscriptionProvider,
  TranscriptionProviderConfig,
} from '../TranscriptionProviderInterface.js';

/**
 * Whisper モデル
 */
export type WhisperModel = 'whisper-1';

/**
 * Whisper プロバイダー設定
 */
export interface WhisperProviderConfig extends TranscriptionProviderConfig {
  type: 'whisper';
  model?: WhisperModel;
}

/**
 * Whisper API レスポンス（verbose_json）
 */
interface WhisperVerboseResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

/**
 * OpenAI Whisper 文字起こしプロバイダー
 */
export class WhisperProvider extends BaseTranscriptionProvider {
  readonly name = 'OpenAI Whisper';
  readonly type = 'whisper';

  private readonly model: WhisperModel;

  constructor(config: WhisperProviderConfig) {
    super(config);
    this.model = config.model || 'whisper-1';
  }

  async transcribe(config: TranscriptionConfig): Promise<TranscriptionResult> {
    const startTime = Date.now();

    const formData = new FormData();

    // 音声データをBlobに変換
    const audioBlob = this.createAudioBlob(config.audio, config.format || 'mp3');
    formData.append('file', audioBlob, `audio.${config.format || 'mp3'}`);
    formData.append('model', this.model);

    // レスポンスフォーマット
    const responseFormat = config.wordTimestamps ? 'verbose_json' : 'verbose_json';
    formData.append('response_format', responseFormat);

    // 言語指定
    if (config.language) {
      formData.append('language', config.language);
    }

    // プロンプト（語彙ヒント）
    if (config.vocabulary && config.vocabulary.length > 0) {
      formData.append('prompt', config.vocabulary.join(', '));
    }

    // タイムスタンプ粒度
    if (config.wordTimestamps) {
      formData.append('timestamp_granularities[]', 'word');
      formData.append('timestamp_granularities[]', 'segment');
    }

    const response = await this.requestMultipart<WhisperVerboseResponse>(
      '/v1/audio/transcriptions',
      formData
    );

    return this.mapResponse(response, startTime, config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // OpenAI APIのヘルスチェック（モデル一覧取得）
      await this.request<{ data: unknown[] }>('/v1/models');
      return true;
    } catch {
      return false;
    }
  }

  async listLanguages(): Promise<string[]> {
    // Whisperがサポートする言語（一部）
    return [
      'en', 'ja', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'it', 'pt',
      'tr', 'pl', 'ca', 'nl', 'ar', 'sv', 'id', 'hi', 'fi', 'vi',
      'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no',
      'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy', 'sk',
      'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk',
    ];
  }

  async listModels(): Promise<string[]> {
    return ['whisper-1'];
  }

  protected getCapabilities(): string[] {
    return [
      'transcription',
      'translation',
      'language-detection',
      'word-timestamps',
      'segment-timestamps',
    ];
  }

  protected getLimits(): Record<string, number> {
    return {
      maxFileSizeMB: 25,
      maxDurationMinutes: 120,
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.openai.com';
  }

  private createAudioBlob(audio: string, format: string): Blob {
    // Base64デコード
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const mimeType = this.getMimeType(format);
    return new Blob([bytes], { type: mimeType });
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };
    return mimeTypes[format] || 'audio/mpeg';
  }

  private async requestMultipart<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const baseUrl = this.config.baseUrl || this.getDefaultBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    return response.json() as T;
  }

  private mapResponse(
    response: WhisperVerboseResponse,
    startTime: number,
    config: TranscriptionConfig
  ): TranscriptionResult {
    const segments: TranscriptionSegment[] = response.segments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: Math.exp(seg.avg_logprob), // log probを確率に変換
      words: config.wordTimestamps && response.words
        ? this.mapWordsForSegment(response.words, seg.start, seg.end)
        : undefined,
    }));

    return {
      text: response.text.trim(),
      language: response.language,
      detectedLanguage: response.language,
      durationSeconds: response.duration,
      segments,
      words: config.wordTimestamps && response.words
        ? response.words.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: 1.0, // Whisperはword単位の信頼度を返さない
          }))
        : undefined,
      metadata: {
        provider: this.name,
        model: this.model,
        generatedAt: new Date(),
        durationMs: Date.now() - startTime,
        cost: this.estimateCost(response.duration),
      },
    };
  }

  private mapWordsForSegment(
    words: Array<{ word: string; start: number; end: number }>,
    segStart: number,
    segEnd: number
  ): TranscriptionWord[] {
    return words
      .filter((w) => w.start >= segStart && w.end <= segEnd)
      .map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: 1.0,
      }));
  }

  private estimateCost(durationSeconds: number): number {
    // Whisper pricing: $0.006 per minute
    const minutes = durationSeconds / 60;
    return minutes * 0.006;
  }
}
