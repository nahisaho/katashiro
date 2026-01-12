/**
 * TextAnalyzer - テキスト分析
 *
 * @requirement REQ-ANALYZE-001, REQ-ANALYZE-006
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-020
 */

import {
  type Result,
  ok,
  err,
  generateId,
  formatTimestamp,
  type Content,
} from '@nahisaho/katashiro-core';
import type { ISummarizer } from '../interfaces.js';
import type { Summary, SentimentResult, AspectSentiment } from '../types.js';

/**
 * 停止語リスト（英語）
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'over', 'into', 'about',
]);

/**
 * ポジティブワードリスト
 */
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
  'best', 'happy', 'joy', 'beautiful', 'perfect', 'awesome', 'brilliant',
  'outstanding', 'superb', 'magnificent', 'delightful', 'pleasant', 'nice',
  'positive', 'success', 'successful', 'win', 'winning', 'benefit', 'improve',
  'improvement', 'helpful', 'useful', 'valuable', 'impressive', 'incredible',
]);

/**
 * ネガティブワードリスト
 */
const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointed',
  'disappointing', 'frustrating', 'frustrated', 'angry', 'sad', 'poor',
  'failure', 'fail', 'failed', 'problem', 'issue', 'wrong', 'error',
  'mistake', 'difficult', 'hard', 'impossible', 'negative', 'loss', 'lose',
  'losing', 'damage', 'harmful', 'dangerous', 'risk', 'threat', 'concern',
  'worried', 'worry', 'fear', 'scary', 'terrible', 'dreadful', 'miserable',
]);

/**
 * テキスト分析実装
 * ISentimentAnalyzerの実装はanalyzeSentimentメソッドで提供
 */
export class TextAnalyzer implements ISummarizer {
  /**
   * テキストを要約
   */
  async summarize(
    content: Content,
    maxLength?: number
  ): Promise<Result<Summary, Error>> {
    const text = content.body?.trim() ?? '';
    
    if (!text) {
      return err(new Error('Content text is empty'));
    }

    const sentences = this.splitSentences(text);
    const keyPoints = this.extractKeyPoints(sentences);
    const summaryText = this.generateSummary(sentences, maxLength ?? 200);

    const summary: Summary = {
      id: generateId('SUM'),
      text: summaryText,
      keyPoints,
      wordCount: this.countWords(text),
      createdAt: formatTimestamp(),
    };

    return ok(summary);
  }

  /**
   * テキスト分析（文字列またはContent型を受付）
   * AGENTS.md互換: analyze(text: string) でも使用可能
   */
  async analyze(textOrContent: string | Content): Promise<{
    keywords: string[];
    complexity: { score: number; level: string };
    sentiment: { sentiment: string; score: number };
    wordCount: number;
    sentenceCount: number;
  }> {
    // 文字列の場合はそのまま、Contentの場合はbodyを取得
    const text = typeof textOrContent === 'string' 
      ? textOrContent 
      : (textOrContent.body?.trim() ?? '');
    
    return this.analyzeText(text);
  }

  /**
   * 感情分析（ISentimentAnalyzerインターフェース実装）
   */
  async analyzeSentimentContent(content: Content): Promise<Result<SentimentResult, Error>> {
    return this.analyzeSentiment(content);
  }

  /**
   * 総合テキスト分析（AGENTS.md互換API）
   * @param text 分析対象テキスト
   */
  async analyzeText(text: string): Promise<{
    keywords: string[];
    complexity: { score: number; level: string };
    sentiment: { sentiment: string; score: number };
    wordCount: number;
    sentenceCount: number;
  }> {
    if (!text || text.trim().length === 0) {
      return {
        keywords: [],
        complexity: { score: 0, level: 'unknown' },
        sentiment: { sentiment: 'neutral', score: 0 },
        wordCount: 0,
        sentenceCount: 0,
      };
    }

    // キーワード抽出
    const keywords = this.extractKeywords(text, 10);
    
    // 複雑度計算
    const complexity = this.calculateComplexity(text);
    
    // 感情分析（簡易版）
    const words = this.tokenize(text.toLowerCase());
    let positiveCount = 0;
    let negativeCount = 0;
    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) positiveCount++;
      if (NEGATIVE_WORDS.has(word)) negativeCount++;
    }
    const total = positiveCount + negativeCount;
    const sentimentScore = total > 0 ? (positiveCount - negativeCount) / total : 0;
    let sentimentLabel = 'neutral';
    if (sentimentScore > 0.2) sentimentLabel = 'positive';
    else if (sentimentScore < -0.2) sentimentLabel = 'negative';
    
    // 単語数・文数
    const wordCount = this.countWords(text);
    const sentences = this.splitSentences(text);
    
    return {
      keywords,
      complexity,
      sentiment: { sentiment: sentimentLabel, score: sentimentScore },
      wordCount,
      sentenceCount: sentences.length,
    };
  }

  /**
   * 複雑度を計算
   */
  private calculateComplexity(text: string): { score: number; level: string } {
    const sentences = this.splitSentences(text);
    const words = this.countWords(text);
    
    if (sentences.length === 0 || words === 0) {
      return { score: 0, level: 'unknown' };
    }
    
    // 平均文長
    const avgSentenceLength = words / sentences.length;
    
    // 長い単語の割合（6文字以上）
    const allWords = text.split(/\s+/).filter(w => w.length > 0);
    const longWords = allWords.filter(w => w.length >= 6).length;
    const longWordRatio = allWords.length > 0 ? longWords / allWords.length : 0;
    
    // 複雑度スコア（0-100）
    const score = Math.min(100, Math.round(
      (avgSentenceLength * 2) + (longWordRatio * 50)
    ));
    
    // レベル判定
    let level: string;
    if (score < 30) level = 'simple';
    else if (score < 50) level = 'moderate';
    else if (score < 70) level = 'complex';
    else level = 'very_complex';
    
    return { score, level };
  }

  /**
   * 感情分析
   */
  async analyzeSentiment(content: Content): Promise<Result<SentimentResult, Error>> {
    const text = content.body?.trim() ?? '';
    
    if (!text) {
      return err(new Error('Content text is empty'));
    }

    const words = this.tokenize(text.toLowerCase());
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) positiveCount++;
      if (NEGATIVE_WORDS.has(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    let score = 0;
    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';

    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
      
      if (score > 0.2) {
        sentiment = 'positive';
      } else if (score < -0.2) {
        sentiment = 'negative';
      } else if (positiveCount > 0 && negativeCount > 0) {
        sentiment = 'mixed';
      }
    }

    // Confidence based on total sentiment words found
    const confidence = Math.min(total / 10, 1);

    const result: SentimentResult = {
      sentiment,
      score,
      confidence,
      aspects: this.extractAspectSentiments(text),
    };

    return ok(result);
  }

  /**
   * キーワードを抽出
   */
  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    // 日本語キーワード抽出
    const japaneseKeywords = this.extractJapaneseKeywords(text);
    
    // 英語キーワード抽出
    const words = this.tokenize(text.toLowerCase());
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue;
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }

    const englishKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);

    // 日本語と英語のキーワードを統合
    const combined = [...new Set([...japaneseKeywords, ...englishKeywords])];
    return combined.slice(0, maxKeywords);
  }

  /**
   * 日本語キーワードを抽出
   */
  private extractJapaneseKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // カタカナ語（2文字以上）
    const katakana = text.match(/[ァ-ヶー]{2,}/g) || [];
    keywords.push(...katakana);
    
    // 漢字語（2文字以上）
    const kanji = text.match(/[一-龯]{2,}/g) || [];
    keywords.push(...kanji);
    
    // 英数字混じり（技術用語など）
    const alphanumeric = text.match(/[A-Za-z][A-Za-z0-9]{2,}/g) || [];
    keywords.push(...alphanumeric.filter(w => !STOP_WORDS.has(w.toLowerCase())));
    
    // 頻度カウント
    const freq = new Map<string, number>();
    for (const kw of keywords) {
      freq.set(kw, (freq.get(kw) ?? 0) + 1);
    }
    
    // 頻度順でソートして重複除去
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 20);
  }

  /**
   * 単語数をカウント
   */
  countWords(text: string): number {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  /**
   * 文に分割
   */
  splitSentences(text: string): string[] {
    // Simple sentence splitting - handles common abbreviations
    const normalized = text
      .replace(/([.!?])\s+/g, '$1\n')
      .replace(/\n+/g, '\n');

    return normalized
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * トークン化
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * キーポイントを抽出
   */
  private extractKeyPoints(sentences: string[]): string[] {
    // Score sentences by importance indicators
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      const lower = sentence.toLowerCase();

      // Indicators of important sentences
      if (lower.includes('important')) score += 2;
      if (lower.includes('key')) score += 2;
      if (lower.includes('main')) score += 2;
      if (lower.includes('significant')) score += 2;
      if (lower.includes('conclusion')) score += 3;
      if (lower.includes('result')) score += 2;
      if (lower.includes('finding')) score += 2;
      if (/^\d+\.\s/.test(sentence)) score += 1; // Numbered items
      if (sentence.includes(':')) score += 1;

      // Penalize very short or very long sentences
      const wordCount = this.countWords(sentence);
      if (wordCount < 5) score -= 2;
      if (wordCount > 40) score -= 1;

      return { sentence, score };
    });

    // Get top sentences as key points
    return scoredSentences
      .filter(s => s.score > 0 || scoredSentences.length <= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.sentence);
  }

  /**
   * 要約を生成
   */
  private generateSummary(sentences: string[], maxLength: number): string {
    if (sentences.length === 0) return '';

    // Use extractive summarization - pick most important sentences
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;

      // Position score - first sentences often contain key info
      if (index === 0) score += 3;
      if (index < 3) score += 1;

      // Length score - medium length sentences are often better summaries
      const wordCount = this.countWords(sentence);
      if (wordCount >= 10 && wordCount <= 25) score += 2;

      // Keyword density
      const keywords = this.extractKeywords(sentence, 3);
      score += keywords.length * 0.5;

      return { sentence, score, index };
    });

    // Sort by score and build summary
    const sortedSentences = scoredSentences
      .sort((a, b) => b.score - a.score);

    let summary = '';
    const usedIndices = new Set<number>();

    for (const { sentence, index } of sortedSentences) {
      if (summary.length + sentence.length > maxLength) {
        if (summary.length > 0) break;
      }
      
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        summary += (summary ? ' ' : '') + sentence;
      }
    }

    return summary || sentences[0] || '';
  }

  /**
   * アスペクトごとの感情を抽出
   */
  private extractAspectSentiments(text: string): AspectSentiment[] {
    // Simple aspect extraction based on common patterns
    const aspects: AspectSentiment[] = [];
    const sentences = this.splitSentences(text);

    const aspectPatterns = [
      { pattern: /quality/i, aspect: 'quality' },
      { pattern: /price|cost/i, aspect: 'price' },
      { pattern: /service/i, aspect: 'service' },
      { pattern: /design|look/i, aspect: 'design' },
      { pattern: /performance|speed/i, aspect: 'performance' },
    ];

    for (const { pattern, aspect } of aspectPatterns) {
      for (const sentence of sentences) {
        if (pattern.test(sentence)) {
          const words = this.tokenize(sentence.toLowerCase());
          let positiveCount = 0;
          let negativeCount = 0;

          for (const word of words) {
            if (POSITIVE_WORDS.has(word)) positiveCount++;
            if (NEGATIVE_WORDS.has(word)) negativeCount++;
          }

          const total = positiveCount + negativeCount;
          if (total > 0) {
            const score = (positiveCount - negativeCount) / total;
            const sentiment = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
            
            aspects.push({ aspect, sentiment, score });
          }
        }
      }
    }

    return aspects;
  }
}
