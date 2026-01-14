/**
 * Token Counter - トークン数カウント
 *
 * @requirement REQ-LLM-001
 * @design DES-KATASHIRO-003-LLM §3.1
 */

/**
 * モデル別トークン推定係数
 */
const MODEL_TOKEN_FACTORS: Record<string, number> = {
  'gpt-4o': 4.0,
  'gpt-4o-mini': 4.0,
  'gpt-4-turbo': 4.0,
  'gpt-4': 4.0,
  'gpt-3.5-turbo': 4.0,
  'claude-3-5-sonnet': 4.5,
  'claude-3-opus': 4.5,
  'claude-3-sonnet': 4.5,
  'claude-3-haiku': 4.5,
  'gemini-pro': 4.0,
  'gemini-1.5-pro': 4.0,
  default: 4.0,
};

/**
 * TokenCounter - トークン数カウントユーティリティ
 */
export class TokenCounter {
  /**
   * テキストのトークン数を推定
   */
  estimate(text: string, model?: string): number {
    const factor = this.getTokenFactor(model);
    return Math.ceil(text.length / factor);
  }

  /**
   * メッセージ配列のトークン数を推定
   */
  estimateMessages(
    messages: Array<{ role: string; content: string }>,
    model?: string
  ): number {
    let total = 0;
    for (const message of messages) {
      // ロールのオーバーヘッド（約4トークン）
      total += 4;
      total += this.estimate(message.content, model);
    }
    // メッセージ区切りのオーバーヘッド
    total += 3;
    return total;
  }

  /**
   * トークン数が制限内か確認
   */
  isWithinLimit(text: string, limit: number, model?: string): boolean {
    return this.estimate(text, model) <= limit;
  }

  /**
   * 制限内に収まるようにテキストを切り詰め
   */
  truncateToLimit(text: string, limit: number, model?: string): string {
    const currentTokens = this.estimate(text, model);
    if (currentTokens <= limit) {
      return text;
    }

    const factor = this.getTokenFactor(model);
    const targetLength = Math.floor(limit * factor * 0.9); // 10%マージン
    return text.slice(0, targetLength) + '...';
  }

  /**
   * モデル別トークン係数取得
   */
  private getTokenFactor(model?: string): number {
    if (!model) {
      return MODEL_TOKEN_FACTORS.default ?? 4.0;
    }

    // モデル名の部分一致
    for (const [key, factor] of Object.entries(MODEL_TOKEN_FACTORS)) {
      if (model.includes(key)) {
        return factor;
      }
    }

    return MODEL_TOKEN_FACTORS.default ?? 4.0;
  }
}

// シングルトン
let tokenCounterInstance: TokenCounter | null = null;

/**
 * TokenCounter シングルトン取得
 */
export function getTokenCounter(): TokenCounter {
  if (!tokenCounterInstance) {
    tokenCounterInstance = new TokenCounter();
  }
  return tokenCounterInstance;
}

/**
 * TokenCounter リセット（テスト用）
 */
export function resetTokenCounter(): void {
  tokenCounterInstance = null;
}
