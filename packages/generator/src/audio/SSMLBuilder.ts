/**
 * SSML Builder
 * SSML（Speech Synthesis Markup Language）構築ユーティリティ
 * REQ-MEDIA-005-001: テキスト音声変換
 */

import type { VoiceConfig, SpeakingStyle, TextSegment } from './types.js';

/**
 * SSMLビルダークラス
 */
export class SSMLBuilder {
  private elements: string[] = [];
  private readonly lang: string;

  constructor(language = 'ja-JP') {
    this.lang = language;
  }

  /**
   * SSMLドキュメントを開始
   */
  start(): this {
    this.elements = [];
    this.elements.push(`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.lang}">`);
    return this;
  }

  /**
   * テキストを追加
   */
  text(content: string): this {
    this.elements.push(this.escapeXml(content));
    return this;
  }

  /**
   * ポーズを追加
   * @param duration ミリ秒またはstrength ('none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong')
   */
  pause(duration: number | string): this {
    if (typeof duration === 'number') {
      this.elements.push(`<break time="${duration}ms"/>`);
    } else {
      this.elements.push(`<break strength="${duration}"/>`);
    }
    return this;
  }

  /**
   * 強調を追加
   * @param content テキスト
   * @param level 強調レベル ('strong', 'moderate', 'reduced')
   */
  emphasis(content: string, level: 'strong' | 'moderate' | 'reduced' = 'moderate'): this {
    this.elements.push(`<emphasis level="${level}">${this.escapeXml(content)}</emphasis>`);
    return this;
  }

  /**
   * 韻律（話速、ピッチ、音量）を設定
   */
  prosody(
    content: string,
    options: {
      rate?: string | number;
      pitch?: string | number;
      volume?: string | number;
    }
  ): this {
    const attrs: string[] = [];
    
    if (options.rate !== undefined) {
      attrs.push(`rate="${typeof options.rate === 'number' ? options.rate + '%' : options.rate}"`);
    }
    if (options.pitch !== undefined) {
      attrs.push(`pitch="${typeof options.pitch === 'number' ? options.pitch + 'Hz' : options.pitch}"`);
    }
    if (options.volume !== undefined) {
      attrs.push(`volume="${typeof options.volume === 'number' ? options.volume + 'dB' : options.volume}"`);
    }

    this.elements.push(`<prosody ${attrs.join(' ')}>${this.escapeXml(content)}</prosody>`);
    return this;
  }

  /**
   * 読み方を指定
   * @param content テキスト
   * @param interpretAs 読み方タイプ ('cardinal', 'ordinal', 'characters', 'spell-out', 'date', 'time', 'telephone')
   * @param format フォーマット（日付の場合: 'mdy', 'dmy', 'ymd' など）
   */
  sayAs(
    content: string,
    interpretAs: 'cardinal' | 'ordinal' | 'characters' | 'spell-out' | 'date' | 'time' | 'telephone',
    format?: string
  ): this {
    const formatAttr = format ? ` format="${format}"` : '';
    this.elements.push(`<say-as interpret-as="${interpretAs}"${formatAttr}>${this.escapeXml(content)}</say-as>`);
    return this;
  }

  /**
   * 発音を指定
   * @param content 表示テキスト
   * @param ph 発音（IPA）
   */
  phoneme(content: string, ph: string, alphabet: 'ipa' | 'x-sampa' = 'ipa'): this {
    this.elements.push(`<phoneme alphabet="${alphabet}" ph="${this.escapeXml(ph)}">${this.escapeXml(content)}</phoneme>`);
    return this;
  }

  /**
   * 読み替えを指定
   * @param content 表示テキスト
   * @param alias 読み上げテキスト
   */
  sub(content: string, alias: string): this {
    this.elements.push(`<sub alias="${this.escapeXml(alias)}">${this.escapeXml(content)}</sub>`);
    return this;
  }

  /**
   * 音声を指定（プロバイダー依存）
   */
  voice(content: string, config: Partial<VoiceConfig>): this {
    const attrs: string[] = [];
    if (config.voiceName) attrs.push(`name="${config.voiceName}"`);
    if (config.language) attrs.push(`xml:lang="${config.language}"`);
    if (config.gender) attrs.push(`gender="${config.gender}"`);

    this.elements.push(`<voice ${attrs.join(' ')}>${this.escapeXml(content)}</voice>`);
    return this;
  }

  /**
   * 段落を追加
   */
  paragraph(content: string): this {
    this.elements.push(`<p>${this.escapeXml(content)}</p>`);
    return this;
  }

  /**
   * 文を追加
   */
  sentence(content: string): this {
    this.elements.push(`<s>${this.escapeXml(content)}</s>`);
    return this;
  }

  /**
   * 話し方スタイルを指定（Azureなど一部プロバイダー）
   */
  style(content: string, styleName: SpeakingStyle, degree?: number): this {
    const degreeAttr = degree !== undefined ? ` styledegree="${degree}"` : '';
    this.elements.push(`<mstts:express-as style="${styleName}"${degreeAttr}>${this.escapeXml(content)}</mstts:express-as>`);
    return this;
  }

  /**
   * セグメントからSSMLを構築
   */
  fromSegments(segments: TextSegment[]): this {
    this.start();

    for (const segment of segments) {
      // 前のポーズ
      if (segment.pauseBefore) {
        this.pause(segment.pauseBefore);
      }

      // 音声設定がある場合
      if (segment.voice) {
        this.prosody(segment.text, {
          rate: segment.voice.speed,
          pitch: segment.voice.pitch,
          volume: segment.voice.volume,
        });
      } else {
        this.text(segment.text);
      }

      // 後のポーズ
      if (segment.pauseAfter) {
        this.pause(segment.pauseAfter);
      }
    }

    return this;
  }

  /**
   * SSMLを終了
   */
  end(): this {
    this.elements.push('</speak>');
    return this;
  }

  /**
   * SSMLを構築
   */
  build(): string {
    if (!this.elements[0]?.startsWith('<speak')) {
      this.start();
    }
    if (!this.elements[this.elements.length - 1]?.includes('</speak>')) {
      this.end();
    }
    return this.elements.join('');
  }

  /**
   * プレーンテキストに変換
   */
  toPlainText(): string {
    const ssml = this.build();
    return ssml
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * XMLをエスケープ
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * シンプルなSSML構築関数
 */
export function buildSSML(text: string, options?: {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  pauses?: boolean;
}): string {
  const builder = new SSMLBuilder(options?.language ?? 'ja-JP');
  builder.start();

  // 韻律設定がある場合
  if (options?.rate || options?.pitch || options?.volume) {
    builder.prosody(text, {
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
    });
  } else if (options?.pauses) {
    // 句読点でポーズを入れる
    const sentences = text.split(/([。．！？\.\!\?])/);
    sentences.forEach((part) => {
      if (part.match(/[。．！？\.\!\?]/)) {
        builder.text(part);
        builder.pause(500);
      } else if (part.trim()) {
        builder.text(part);
      }
    });
  } else {
    builder.text(text);
  }

  return builder.build();
}

/**
 * テキストをSSMLセグメントに分割
 */
export function segmentText(text: string, options?: {
  maxLength?: number;
  preserveSentences?: boolean;
}): string[] {
  const maxLength = options?.maxLength ?? 5000;
  
  if (text.length <= maxLength) {
    return [text];
  }

  const segments: string[] = [];
  
  if (options?.preserveSentences) {
    // 文単位で分割
    const sentences = text.split(/(?<=[。．！？\.\!\?])\s*/);
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > maxLength) {
        if (current) segments.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current) segments.push(current);
  } else {
    // 単純に長さで分割
    for (let i = 0; i < text.length; i += maxLength) {
      segments.push(text.slice(i, i + maxLength));
    }
  }

  return segments;
}
