/**
 * AudioTranscriber
 *
 * 音声文字起こしのメインファサードクラス
 * 複数のプロバイダーを統合し、統一的なインターフェースを提供
 *
 * @task TASK-013-4
 */

import type { TranscriptionConfig, TranscriptionResult } from '../types.js';
import { TranscriptionProviderInterface } from './TranscriptionProviderInterface.js';
import { WhisperProvider, WhisperProviderConfig } from './providers/WhisperProvider.js';
import {
  SpeakerLabeler,
  SpeakerDiarizationConfig,
  SpeakerDiarizationResult,
} from './SpeakerLabeler.js';

/**
 * AudioTranscriber設定
 */
export interface AudioTranscriberConfig {
  /** デフォルトプロバイダー */
  defaultProvider?: string;
  /** プロバイダー設定 */
  providers?: {
    whisper?: WhisperProviderConfig;
    [key: string]: unknown;
  };
  /** 共通オプション */
  options?: {
    /** タイムアウト（ミリ秒） */
    timeout?: number;
    /** 話者分離を有効化 */
    enableSpeakerDiarization?: boolean;
    /** 話者分離設定 */
    speakerDiarizationConfig?: SpeakerDiarizationConfig;
  };
}

/**
 * 拡張された文字起こし結果（話者情報付き）
 */
export interface ExtendedTranscriptionResult extends TranscriptionResult {
  /** 話者分離結果 */
  speakerDiarization?: SpeakerDiarizationResult;
}

/**
 * 音声文字起こしファサードクラス
 */
export class AudioTranscriber {
  private providers: Map<string, TranscriptionProviderInterface> = new Map();
  private defaultProvider: string;
  private timeout: number;
  private enableSpeakerDiarization: boolean;
  private speakerLabeler: SpeakerLabeler;

  constructor(config: AudioTranscriberConfig = {}) {
    this.defaultProvider = config.defaultProvider || 'whisper';
    this.timeout = config.options?.timeout || 300000;
    this.enableSpeakerDiarization =
      config.options?.enableSpeakerDiarization || false;
    this.speakerLabeler = new SpeakerLabeler(
      config.options?.speakerDiarizationConfig
    );

    this.initializeProviders(config.providers);
  }

  /**
   * OpenAI Whisper プロバイダーで初期化
   */
  static withWhisper(apiKey: string): AudioTranscriber {
    return new AudioTranscriber({
      defaultProvider: 'whisper',
      providers: {
        whisper: {
          type: 'whisper',
          apiKey,
        },
      },
    });
  }

  /**
   * 音声を文字起こし
   */
  async transcribe(
    config: TranscriptionConfig,
    providerName?: string
  ): Promise<ExtendedTranscriptionResult> {
    const provider = this.getProvider(providerName || this.defaultProvider);

    if (!provider) {
      throw new Error(
        `Provider '${providerName || this.defaultProvider}' is not configured`
      );
    }

    const transcribeWithTimeout = async (): Promise<TranscriptionResult> => {
      return Promise.race([
        provider.transcribe(config),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Transcription timeout')),
            this.timeout
          )
        ),
      ]);
    };

    const result = await transcribeWithTimeout();

    // 話者分離が有効な場合
    if (this.enableSpeakerDiarization && result.segments) {
      const diarization = await this.speakerLabeler.labelSegments(
        result.segments
      );
      return {
        ...result,
        speakerDiarization: diarization,
      };
    }

    return result;
  }

  /**
   * ファイルから文字起こし（Base64エンコード済み）
   */
  async transcribeFromBase64(
    audio: string,
    options: Partial<TranscriptionConfig> = {},
    providerName?: string
  ): Promise<ExtendedTranscriptionResult> {
    return this.transcribe(
      {
        audio,
        ...options,
      },
      providerName
    );
  }

  /**
   * 話者分離を実行
   */
  async diarizeSpeakers(
    result: TranscriptionResult
  ): Promise<SpeakerDiarizationResult> {
    if (!result.segments) {
      throw new Error('Segments are required for speaker diarization');
    }
    return this.speakerLabeler.labelSegments(result.segments);
  }

  /**
   * プロバイダーを追加
   */
  addProvider(name: string, provider: TranscriptionProviderInterface): void {
    this.providers.set(name, provider);
  }

  /**
   * プロバイダーを取得
   */
  getProvider(name: string): TranscriptionProviderInterface | undefined {
    return this.providers.get(name);
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  async isProviderAvailable(providerName?: string): Promise<boolean> {
    const provider = this.getProvider(providerName || this.defaultProvider);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * サポート言語一覧を取得
   */
  async listLanguages(providerName?: string): Promise<string[]> {
    const provider = this.getProvider(providerName || this.defaultProvider);
    if (!provider) return [];
    return provider.listLanguages();
  }

  /**
   * モデル一覧を取得
   */
  async listModels(providerName?: string): Promise<string[]> {
    const provider = this.getProvider(providerName || this.defaultProvider);
    if (!provider) return [];
    return provider.listModels();
  }

  /**
   * 話者分離を有効/無効化
   */
  setSpeakerDiarization(enabled: boolean): void {
    this.enableSpeakerDiarization = enabled;
  }

  /**
   * コスト見積もり
   */
  estimateCost(durationSeconds: number, providerName?: string): number {
    const name = providerName || this.defaultProvider;

    // プロバイダーごとのコスト計算
    const costs: Record<string, number> = {
      whisper: (durationSeconds / 60) * 0.006, // $0.006/minute
    };

    return costs[name] || (durationSeconds / 60) * 0.006;
  }

  private initializeProviders(
    providersConfig?: AudioTranscriberConfig['providers']
  ): void {
    if (!providersConfig) return;

    if (providersConfig.whisper) {
      this.providers.set(
        'whisper',
        new WhisperProvider(providersConfig.whisper)
      );
    }
  }
}
