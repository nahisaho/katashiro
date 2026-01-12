/**
 * ClaimParser - 主張の解析・正規化
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import type {
  ExtractedClaim,
  ClaimType,
} from './types.js';

/**
 * 主張を解析し、検証可能な形式に変換
 */
export class ClaimParser {
  /**
   * テキストから主張を抽出
   */
  parse(text: string): ExtractedClaim[] {
    const sentences = this.splitSentences(text);
    const claims: ExtractedClaim[] = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) continue;

      const type = this.determineClaimType(trimmed);
      const verifiability = this.assessVerifiability(trimmed, type);

      if (verifiability !== 'low') {
        claims.push({
          original: trimmed,
          normalized: this.normalize(trimmed),
          entities: this.extractEntities(trimmed),
          type,
          verifiability,
          context: undefined,
        });
      }
    }

    return claims;
  }

  /**
   * 単一の主張を解析
   */
  parseSingle(claim: string): ExtractedClaim {
    const trimmed = claim.trim();
    const type = this.determineClaimType(trimmed);
    const verifiability = this.assessVerifiability(trimmed, type);

    return {
      original: trimmed,
      normalized: this.normalize(trimmed),
      entities: this.extractEntities(trimmed),
      type,
      verifiability,
      context: undefined,
    };
  }

  /**
   * 主張を正規化
   */
  normalize(claim: string): string {
    let normalized = claim.trim();

    // 引用符の正規化
    normalized = normalized.replace(/[""]/g, '"');
    normalized = normalized.replace(/['']/g, "'");

    // 余分な空白の削除
    normalized = normalized.replace(/\s+/g, ' ');

    // 文末のピリオド追加
    if (!/[.!?]$/.test(normalized)) {
      normalized += '.';
    }

    return normalized;
  }

  /**
   * 文を分割
   */
  private splitSentences(text: string): string[] {
    // 簡易的な文分割
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(s => s.trim().length > 0);
  }

  /**
   * 主張の種類を判定
   */
  private determineClaimType(claim: string): ClaimType {
    const lowerClaim = claim.toLowerCase();

    // 統計に関する主張
    if (/\d+%|percent|percentage|rate|ratio|\d+ out of \d+/i.test(claim)) {
      return 'statistical';
    }

    // 引用
    if (/[""].*[""]|said\s+that|according to.*,/i.test(claim)) {
      return 'quote';
    }

    // 予測
    if (/will\s+\w+|going\s+to|predict|forecast|expect|next\s+year|next\s+month|by\s+\d{4}/i.test(lowerClaim)) {
      return 'prediction';
    }

    // 意見を示す表現
    if (/i\s+think|i\s+believe|in\s+my\s+opinion|should|ought\s+to|best|worst/i.test(lowerClaim)) {
      return 'opinion';
    }

    // それ以外は事実主張
    return 'factual';
  }

  /**
   * 検証可能性を評価
   */
  private assessVerifiability(claim: string, type: ClaimType): 'high' | 'medium' | 'low' {
    // 意見は検証困難
    if (type === 'opinion') {
      return 'low';
    }

    // 予測は将来のことなので検証困難
    if (type === 'prediction') {
      return 'low';
    }

    // 具体的な数値や日付がある場合は検証しやすい
    if (/\d{4}|\d+%|[0-9]+\s*(million|billion|thousand)/i.test(claim)) {
      return 'high';
    }

    // 固有名詞が含まれる場合は中程度
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+|Dr\.|President|CEO/i.test(claim)) {
      return 'high';
    }

    // 引用は出典確認が可能
    if (type === 'quote') {
      return 'medium';
    }

    return 'medium';
  }

  /**
   * エンティティを抽出（簡易版）
   */
  private extractEntities(claim: string): string[] {
    const entities: string[] = [];

    // 大文字で始まる固有名詞を抽出（簡易的）
    const properNouns = claim.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
    if (properNouns) {
      entities.push(...properNouns);
    }

    // 数値を含む表現を抽出
    const numbers = claim.match(/\d+(?:\.\d+)?(?:\s*%|%|\s+(?:million|billion|thousand|percent))?/gi);
    if (numbers) {
      entities.push(...numbers);
    }

    // 年を抽出
    const years = claim.match(/\b(?:19|20)\d{2}\b/g);
    if (years) {
      entities.push(...years);
    }

    return [...new Set(entities)];
  }
}
