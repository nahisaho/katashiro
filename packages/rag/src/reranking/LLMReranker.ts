/**
 * LLM Reranker
 *
 * LLMを使用して検索結果をリランキングするモジュール
 *
 * @requirement REQ-RAG-103
 */

import {
  getDefaultLLMProvider,
  type LLMProvider,
  type GenerateRequest,
} from '@nahisaho/katashiro-llm';
import type { RetrievalResult } from '../types.js';

/**
 * リランキング設定
 */
export interface LLMRerankerConfig {
  /** LLMプロバイダー名 */
  provider?: string;
  /** モデル名 */
  model?: string;
  /** 上位K件を返す */
  topK?: number;
  /** スコアしきい値 */
  scoreThreshold?: number;
  /** バッチサイズ */
  batchSize?: number;
  /** 詳細スコアを含める */
  includeDetails?: boolean;
  /** キャッシュを使用 */
  useCache?: boolean;
  /** カスタムプロンプトテンプレート */
  promptTemplate?: string;
  /** 並列実行数 */
  concurrency?: number;
}

/**
 * リランキング結果
 */
export interface RerankedResult extends RetrievalResult {
  /** リランクスコア (0-1) */
  rerankedScore: number;
  /** 元のスコア */
  originalScore: number;
  /** 元の順位 */
  originalRank: number;
  /** 詳細情報 */
  details?: {
    reasoning?: string;
    relevanceFactors?: string[];
    confidence?: number;
  };
}

/**
 * リランキングレスポンス
 */
export interface RerankerResponse {
  /** リランクされた結果 */
  results: RerankedResult[];
  /** 処理時間（ミリ秒） */
  durationMs: number;
  /** トークン使用量 */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * デフォルト設定
 */
export const DEFAULT_RERANKER_CONFIG: Required<
  Omit<LLMRerankerConfig, 'promptTemplate'>
> & { promptTemplate?: string } = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  topK: 5,
  scoreThreshold: 0.3,
  batchSize: 10,
  includeDetails: false,
  useCache: true,
  concurrency: 3,
  promptTemplate: undefined,
};

/**
 * デフォルトプロンプトテンプレート
 */
export const DEFAULT_RERANKER_PROMPT = `You are a relevance scoring assistant. Given a query and a document, rate how relevant the document is to answering the query.

Query: {query}

Document:
{document}

Rate the relevance on a scale of 0-10, where:
- 0: Completely irrelevant
- 5: Somewhat relevant
- 10: Highly relevant and directly answers the query

Respond with ONLY a JSON object in this format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<brief explanation>",
  "relevanceFactors": ["factor1", "factor2"],
  "confidence": <number between 0 and 1>
}`;

/**
 * スコアレスポンス型
 */
interface ScoreResponse {
  score: number;
  reasoning?: string;
  relevanceFactors?: string[];
  confidence?: number;
}

/**
 * LLMリランカー
 */
export class LLMReranker {
  private config: Required<Omit<LLMRerankerConfig, 'promptTemplate'>> & {
    promptTemplate?: string;
  };
  private provider: LLMProvider | null = null;
  private cache: Map<string, ScoreResponse> = new Map();

  constructor(config: LLMRerankerConfig = {}) {
    this.config = { ...DEFAULT_RERANKER_CONFIG, ...config };
  }

  /**
   * 検索結果をリランキング
   */
  async rerank(
    query: string,
    results: RetrievalResult[],
  ): Promise<RerankerResponse> {
    const startTime = Date.now();
    let totalTokens = { prompt: 0, completion: 0, total: 0 };

    if (results.length === 0) {
      return {
        results: [],
        durationMs: Date.now() - startTime,
      };
    }

    // プロバイダーの初期化
    await this.initializeProvider();

    // バッチ処理
    const scoredResults: RerankedResult[] = [];
    const batches = this.createBatches(results, this.config.batchSize);

    for (const batch of batches) {
      const batchResults = await this.processBatch(query, batch);
      scoredResults.push(...batchResults.results);

      if (batchResults.tokensUsed) {
        totalTokens.prompt += batchResults.tokensUsed.prompt;
        totalTokens.completion += batchResults.tokensUsed.completion;
        totalTokens.total += batchResults.tokensUsed.total;
      }
    }

    // スコアでソートしてtopK件を返す
    const sortedResults = scoredResults
      .sort((a, b) => b.rerankedScore - a.rerankedScore)
      .filter((r) => r.rerankedScore >= this.config.scoreThreshold)
      .slice(0, this.config.topK);

    return {
      results: sortedResults,
      durationMs: Date.now() - startTime,
      tokensUsed: totalTokens.total > 0 ? totalTokens : undefined,
    };
  }

  /**
   * 単一ドキュメントをスコアリング
   */
  async scoreDocument(
    query: string,
    document: string,
  ): Promise<ScoreResponse> {
    // キャッシュ確認
    const cacheKey = this.getCacheKey(query, document);
    if (this.config.useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    await this.initializeProvider();

    const prompt = this.formatPrompt(query, document);

    try {
      const request: GenerateRequest = {
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        maxTokens: 200,
      };

      const response = await this.provider!.generate(request);

      const result = this.parseScoreResponse(response.content);

      // キャッシュに保存
      if (this.config.useCache) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      // エラー時はデフォルトスコアを返す
      return {
        score: 0,
        reasoning: `Error scoring document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  /**
   * バッチ処理
   */
  private async processBatch(
    query: string,
    batch: Array<{ result: RetrievalResult; originalRank: number }>,
  ): Promise<{
    results: RerankedResult[];
    tokensUsed?: { prompt: number; completion: number; total: number };
  }> {
    const results: RerankedResult[] = [];
    let tokensUsed = { prompt: 0, completion: 0, total: 0 };

    // 並列処理
    const chunks = this.createChunks(batch, this.config.concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async ({ result, originalRank }) => {
        const scoreResult = await this.scoreDocument(query, result.content);
        const normalizedScore = scoreResult.score / 10;

        const rerankedResult: RerankedResult = {
          ...result,
          rerankedScore: normalizedScore,
          originalScore: result.score,
          originalRank,
        };

        if (this.config.includeDetails) {
          rerankedResult.details = {
            reasoning: scoreResult.reasoning,
            relevanceFactors: scoreResult.relevanceFactors,
            confidence: scoreResult.confidence,
          };
        }

        return rerankedResult;
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return { results, tokensUsed };
  }

  /**
   * プロンプトをフォーマット
   */
  private formatPrompt(query: string, document: string): string {
    const template = this.config.promptTemplate ?? DEFAULT_RERANKER_PROMPT;
    return template
      .replace('{query}', query)
      .replace('{document}', document.slice(0, 2000)); // 2000文字に制限
  }

  /**
   * スコアレスポンスをパース
   */
  private parseScoreResponse(content: string): ScoreResponse {
    try {
      // JSON部分を抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as ScoreResponse;

      // スコアの正規化 (0-10の範囲に収める)
      const score = Math.max(0, Math.min(10, Number(parsed.score) || 0));

      return {
        score,
        reasoning: parsed.reasoning,
        relevanceFactors: parsed.relevanceFactors,
        confidence: parsed.confidence,
      };
    } catch {
      // パース失敗時は数値のみ抽出を試みる
      const numMatch = content.match(/\d+(\.\d+)?/);
      const score = numMatch ? Math.min(10, Number(numMatch[0])) : 0;

      return { score, confidence: 0.3 };
    }
  }

  /**
   * プロバイダー初期化
   */
  private async initializeProvider(): Promise<void> {
    if (this.provider) return;

    this.provider = getDefaultLLMProvider();
  }

  /**
   * バッチ作成
   */
  private createBatches<T>(
    items: T[],
    batchSize: number,
  ): Array<{ result: T; originalRank: number }[]> {
    const batches: Array<{ result: T; originalRank: number }[]> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((result, idx) => ({
        result,
        originalRank: i + idx + 1,
      }));
      batches.push(batch);
    }

    return batches;
  }

  /**
   * 並列処理用チャンク作成
   */
  private createChunks<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * キャッシュキー生成
   */
  private getCacheKey(query: string, document: string): string {
    return `${query.slice(0, 100)}::${document.slice(0, 100)}`;
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズ取得
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 設定取得
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }
}

/**
 * シンプルなリランキングヘルパー
 */
export async function rerankResults(
  query: string,
  results: RetrievalResult[],
  config?: LLMRerankerConfig,
): Promise<RerankedResult[]> {
  const reranker = new LLMReranker(config);
  const response = await reranker.rerank(query, results);
  return response.results;
}
