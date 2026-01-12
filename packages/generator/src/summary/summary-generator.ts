/**
 * SummaryGenerator - 要約生成
 *
 * @requirement REQ-GEN-002
 * @design DES-KATASHIRO-001 §2.3 Generator Container
 * @task TSK-031
 */

import { ok, err, type Result, type Content } from '@nahisaho/katashiro-core';

/**
 * 要約設定
 */
export interface SummaryConfig {
  readonly maxLength: number;
  readonly style?: 'extractive' | 'abstractive';
  readonly preserveKeywords?: boolean;
}

/**
 * 要約生成実装
 */
export class SummaryGenerator {
  /**
   * テキストを要約（AGENTS.md互換API）
   * @param text 要約対象テキスト
   * @param options 要約オプション
   */
  async summarize(
    text: string,
    options?: { maxLength?: number; style?: 'paragraph' | 'bullets' | 'headline' }
  ): Promise<Result<string, Error>> {
    try {
      const result = await this.generate(text, options);
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * テキストから要約を生成（簡易API）
   * @param text 要約対象テキスト
   * @param options オプション（maxLength, style）
   */
  async generate(
    text: string,
    options?: { maxLength?: number; style?: 'paragraph' | 'bullets' | 'headline' }
  ): Promise<string> {
    const maxLength = options?.maxLength ?? 300;
    const style = options?.style ?? 'paragraph';
    
    if (style === 'bullets') {
      const keyPoints = this.extractKeyPoints(text, 5);
      if (keyPoints.length > 0) {
        return keyPoints.map(p => `• ${p}`).join('\n');
      }
    }
    
    return this.extractiveSummarize(text, maxLength);
  }

  /**
   * コンテンツから要約を生成
   */
  async generateSummary(
    content: Content,
    config: SummaryConfig
  ): Promise<Result<string, Error>> {
    try {
      const text = content.body.trim();
      
      if (!text) {
        return ok('');
      }

      // Simple extractive summarization
      const summary = this.extractiveSummarize(text, config.maxLength);
      return ok(summary);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 複数ソースから統合要約を生成
   */
  async generateMultiSourceSummary(
    contents: Content[],
    config: SummaryConfig
  ): Promise<Result<string, Error>> {
    try {
      if (contents.length === 0) {
        return ok('');
      }

      // Combine all content
      const allText = contents
        .map(c => `【${c.title}】${c.body}`)
        .join('\n\n');

      const summary = this.extractiveSummarize(allText, config.maxLength);
      return ok(summary);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * キーポイントを抽出
   * @since 0.2.11 - 重複除去・元の順序維持
   */
  extractKeyPoints(text: string, maxPoints: number): string[] {
    // Split into sentences
    const sentences = text
      .split(/[。！？.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    if (sentences.length === 0) {
      return [];
    }

    // Score sentences by importance indicators while preserving original index
    const scored = sentences.map((sentence, originalIndex) => {
      let score = 0;
      
      // Boost sentences with key phrases
      if (/第[一二三四五]に|まず|次に|最後に|重要/u.test(sentence)) {
        score += 3;
      }
      // Boost sentences that appear to be conclusions or summaries
      if (/結論|結果|まとめ|要約|つまり|したがって|このため/u.test(sentence)) {
        score += 4;
      }
      if (/です|ます|である/u.test(sentence)) {
        score += 1;
      }
      // Penalize very short sentences
      if (sentence.length < 10) {
        score -= 2;
      }
      // Boost longer, substantial sentences
      if (sentence.length > 30 && sentence.length < 100) {
        score += 2;
      }
      // Boost first few sentences (often contain key info)
      if (originalIndex < 3) {
        score += 2;
      }

      return { sentence, score, originalIndex };
    });

    // Sort by score, select top points, then restore original order
    const topScored = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints);
    
    // Remove duplicates based on similarity
    const unique = this.removeSimilarSentences(topScored);
    
    // Restore original order for coherent reading
    return unique
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map(s => s.sentence);
  }

  /**
   * 類似した文を除去
   * @since 0.2.11
   */
  private removeSimilarSentences(
    sentences: Array<{ sentence: string; score: number; originalIndex: number }>
  ): Array<{ sentence: string; score: number; originalIndex: number }> {
    const unique: Array<{ sentence: string; score: number; originalIndex: number }> = [];
    
    for (const item of sentences) {
      const isDuplicate = unique.some(u => {
        // Check for high similarity (> 70% character overlap)
        const shorter = Math.min(item.sentence.length, u.sentence.length);
        const longer = Math.max(item.sentence.length, u.sentence.length);
        if (shorter / longer < 0.5) return false;
        
        // Simple overlap check
        const words1 = new Set(item.sentence.split(/\s+/));
        const words2 = new Set(u.sentence.split(/\s+/));
        const intersection = [...words1].filter(w => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;
        return union > 0 && intersection / union > 0.7;
      });
      
      if (!isDuplicate) {
        unique.push(item);
      }
    }
    
    return unique;
  }

  /**
   * 箇条書き形式の要約を生成
   */
  async generateBulletSummary(
    content: Content,
    maxBullets: number
  ): Promise<Result<string, Error>> {
    try {
      const keyPoints = this.extractKeyPoints(content.body, maxBullets);
      
      if (keyPoints.length === 0) {
        // Fallback: split into chunks
        const chunks = content.body.split(/[。！？.!?]+/).filter(s => s.trim());
        const limited = chunks.slice(0, maxBullets);
        const bullets = limited.map(p => `• ${p.trim()}`).join('\n');
        return ok(bullets || '• ' + content.body.slice(0, 50));
      }

      const bullets = keyPoints.map(p => `• ${p}`).join('\n');
      return ok(bullets);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 抽出型要約を実行
   */
  private extractiveSummarize(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Split into sentences
    const sentences = text.split(/([。！？.!?]+)/).filter(s => s.trim());
    
    // Reconstruct sentences with punctuation
    const fullSentences: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const content = sentences[i] ?? '';
      const punctuation = sentences[i + 1] ?? '';
      if (content.trim()) {
        fullSentences.push(content + punctuation);
      }
    }

    // Take sentences until we exceed maxLength
    let result = '';
    for (const sentence of fullSentences) {
      if ((result + sentence).length > maxLength) {
        break;
      }
      result += sentence;
    }

    // If we couldn't fit any sentence, truncate
    if (!result) {
      return text.slice(0, maxLength - 3) + '...';
    }

    return result.trim();
  }
}
