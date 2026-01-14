/**
 * Standard Tools - Search, Scrape, Analyze
 *
 * @requirement REQ-AGENT-003
 * @design DES-KATASHIRO-003-AGENT
 */

import type {
  ToolDefinition,
  ToolExecutionContext,
} from '../action-observation-types.js';

// =============================================================================
// SearchTool
// =============================================================================

/**
 * Web検索ツールのパラメータ
 */
export interface SearchToolParams {
  /** 検索クエリ */
  query: string;
  /** 最大結果数 */
  maxResults?: number;
  /** 検索プロバイダー */
  provider?: 'duckduckgo' | 'searxng' | 'custom';
}

/**
 * 検索結果
 */
export interface SearchToolResult {
  /** 検索結果 */
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  /** 検索にかかった時間（ミリ秒） */
  searchTimeMs: number;
  /** 使用されたプロバイダー */
  provider: string;
}

/**
 * Web検索ツール定義
 */
export const SearchTool: ToolDefinition<SearchToolParams, SearchToolResult> = {
  name: 'web_search',
  description:
    'Web検索を実行し、関連する検索結果を返します。情報収集や調査に使用します。',
  category: 'network',
  defaultRiskLevel: 'low',
  defaultTimeout: 30,
  paramsSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '検索クエリ' },
      maxResults: {
        type: 'number',
        description: '最大結果数',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
      provider: {
        type: 'string',
        enum: ['duckduckgo', 'searxng', 'custom'],
        default: 'duckduckgo',
      },
    },
    required: ['query'],
  },
  resultSchema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            snippet: { type: 'string' },
          },
        },
      },
      searchTimeMs: { type: 'number' },
      provider: { type: 'string' },
    },
  },
  allowedRoles: ['agent', 'admin', 'operator'],
  execute: async (
    params: SearchToolParams,
    context: ToolExecutionContext,
  ): Promise<SearchToolResult> => {
    const startTime = Date.now();
    const maxResults = params.maxResults ?? 10;
    const provider = params.provider ?? 'duckduckgo';

    // モックモード（テスト用）
    if (process.env.MOCK_MODE === 'true') {
      return {
        results: [
          {
            title: `Mock result for: ${params.query}`,
            url: `https://example.com/search?q=${encodeURIComponent(params.query)}`,
            snippet: `This is a mock search result for query: ${params.query}`,
          },
        ],
        searchTimeMs: Date.now() - startTime,
        provider,
      };
    }

    // 実際の検索を試みる
    // 注意: 外部依存を避けるため、基本的な実装のみ
    // 実際の使用時はWebSearchClientを注入するか、外部サービスを呼び出す
    try {
      // DuckDuckGo APIを使用した簡易検索
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(params.query)}&format=json&no_redirect=1`,
        { signal: context.signal },
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };
      const results =
        data.RelatedTopics?.slice(0, maxResults).map((topic) => ({
          title: topic.Text?.split(' - ')[0] ?? '',
          url: topic.FirstURL ?? '',
          snippet: topic.Text ?? '',
        })) ?? [];

      return {
        results,
        searchTimeMs: Date.now() - startTime,
        provider,
      };
    } catch (error) {
      // エラー時は空の結果を返す（ツール自体は成功として扱う）
      return {
        results: [],
        searchTimeMs: Date.now() - startTime,
        provider,
      };
    }
  },
};

// =============================================================================
// ScrapeTool
// =============================================================================

/**
 * Webスクレイピングツールのパラメータ
 */
export interface ScrapeToolParams {
  /** スクレイピング対象URL */
  url: string;
  /** 抽出セレクタ（オプション） */
  selector?: string;
  /** タイムアウト（秒） */
  timeout?: number;
}

/**
 * スクレイピング結果
 */
export interface ScrapeToolResult {
  /** 抽出されたコンテンツ */
  content: string;
  /** ページタイトル */
  title: string;
  /** 抽出されたリンク */
  links: string[];
  /** コンテンツの文字数 */
  contentLength: number;
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
}

/**
 * Webスクレイピングツール定義
 */
export const ScrapeTool: ToolDefinition<ScrapeToolParams, ScrapeToolResult> = {
  name: 'web_scrape',
  description:
    'WebページのコンテンツをスクレイピングしてテキストとリンクEmit抽出します。',
  category: 'network',
  defaultRiskLevel: 'medium',
  defaultTimeout: 60,
  paramsSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri', description: 'スクレイピング対象URL' },
      selector: {
        type: 'string',
        description: '抽出対象のCSSセレクタ（オプション）',
      },
      timeout: {
        type: 'number',
        description: 'タイムアウト（秒）',
        default: 30,
      },
    },
    required: ['url'],
  },
  resultSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      title: { type: 'string' },
      links: { type: 'array', items: { type: 'string' } },
      contentLength: { type: 'number' },
      processingTimeMs: { type: 'number' },
    },
  },
  allowedRoles: ['agent', 'admin', 'operator'],
  execute: async (
    params: ScrapeToolParams,
    context: ToolExecutionContext,
  ): Promise<ScrapeToolResult> => {
    const startTime = Date.now();

    // モックモード
    if (process.env.MOCK_MODE === 'true') {
      const mockContent = `Mock content from ${params.url}`;
      return {
        content: mockContent,
        title: `Mock Title - ${params.url}`,
        links: [`${params.url}/link1`, `${params.url}/link2`],
        contentLength: mockContent.length,
        processingTimeMs: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch(params.url, {
        signal: context.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; KATASHIRO/2.0; +https://github.com/nahisaho/katashiro)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const html = await response.text();

      // 簡易的なHTML解析（実運用では専用パーサーを使用）
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? '';

      // リンク抽出
      const linkRegex = /href="(https?:\/\/[^"]+)"/g;
      const links: string[] = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        if (match[1]) links.push(match[1]);
      }

      // コンテンツ抽出（HTMLタグを除去）
      const content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        content: content.slice(0, 10000), // 最大10000文字
        title,
        links: [...new Set(links)].slice(0, 50), // 最大50リンク
        contentLength: content.length,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        content: '',
        title: '',
        links: [],
        contentLength: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }
  },
};

// =============================================================================
// AnalyzeTool
// =============================================================================

/**
 * テキスト分析ツールのパラメータ
 */
export interface AnalyzeToolParams {
  /** 分析対象テキスト */
  text: string;
  /** 分析オプション */
  options?: {
    extractKeywords?: boolean;
    extractEntities?: boolean;
    analyzeSentiment?: boolean;
    analyzeStructure?: boolean;
  };
}

/**
 * 分析結果
 */
export interface AnalyzeToolResult {
  /** テキスト長 */
  textLength: number;
  /** 単語数 */
  wordCount: number;
  /** 文数 */
  sentenceCount: number;
  /** キーワード */
  keywords: string[];
  /** エンティティ */
  entities: Array<{
    text: string;
    type: string;
  }>;
  /** センチメント */
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
}

/**
 * テキスト分析ツール定義
 */
export const AnalyzeTool: ToolDefinition<AnalyzeToolParams, AnalyzeToolResult> = {
  name: 'text_analyze',
  description:
    'テキストを分析し、キーワード、エンティティ、センチメントなどを抽出します。',
  category: 'read',
  defaultRiskLevel: 'low',
  defaultTimeout: 30,
  paramsSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '分析対象テキスト' },
      options: {
        type: 'object',
        properties: {
          extractKeywords: { type: 'boolean', default: true },
          extractEntities: { type: 'boolean', default: true },
          analyzeSentiment: { type: 'boolean', default: false },
          analyzeStructure: { type: 'boolean', default: false },
        },
      },
    },
    required: ['text'],
  },
  resultSchema: {
    type: 'object',
    properties: {
      textLength: { type: 'number' },
      wordCount: { type: 'number' },
      sentenceCount: { type: 'number' },
      keywords: { type: 'array', items: { type: 'string' } },
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
      sentiment: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          label: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        },
      },
      processingTimeMs: { type: 'number' },
    },
  },
  allowedRoles: ['agent', 'admin', 'operator', 'viewer'],
  execute: async (
    params: AnalyzeToolParams,
    _context: ToolExecutionContext,
  ): Promise<AnalyzeToolResult> => {
    const startTime = Date.now();
    const options = params.options ?? {
      extractKeywords: true,
      extractEntities: true,
    };

    const text = params.text;

    // 基本統計
    const textLength = text.length;
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const sentences = text.split(/[.!?。！？]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;

    // キーワード抽出（簡易実装）
    let keywords: string[] = [];
    if (options.extractKeywords) {
      const wordFreq = new Map<string, number>();
      for (const word of words) {
        const normalized = word.toLowerCase().replace(/[^\w]/g, '');
        if (normalized.length >= 3) {
          wordFreq.set(normalized, (wordFreq.get(normalized) ?? 0) + 1);
        }
      }
      keywords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    }

    // エンティティ抽出（簡易実装）
    let entities: Array<{ text: string; type: string }> = [];
    if (options.extractEntities) {
      // URL抽出
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = text.match(urlRegex) ?? [];
      entities.push(...urls.map((url) => ({ text: url, type: 'URL' })));

      // メールアドレス抽出
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      const emails = text.match(emailRegex) ?? [];
      entities.push(...emails.map((email) => ({ text: email, type: 'EMAIL' })));

      // 数値・金額抽出
      const amountRegex = /[¥$€]\s?\d{1,3}(,\d{3})*(\.\d+)?|\d{1,3}(,\d{3})+(\.\d+)?円/g;
      const amounts = text.match(amountRegex) ?? [];
      entities.push(...amounts.map((amount) => ({ text: amount, type: 'AMOUNT' })));
    }

    // センチメント分析（簡易実装）
    let sentiment: AnalyzeToolResult['sentiment'];
    if (options.analyzeSentiment) {
      const positiveWords = ['good', 'great', 'excellent', 'amazing', '良い', '素晴らしい'];
      const negativeWords = ['bad', 'terrible', 'awful', 'poor', '悪い', 'ひどい'];

      let positiveCount = 0;
      let negativeCount = 0;

      for (const word of words) {
        const lower = word.toLowerCase();
        if (positiveWords.some((p) => lower.includes(p))) positiveCount++;
        if (negativeWords.some((n) => lower.includes(n))) negativeCount++;
      }

      const total = positiveCount + negativeCount;
      const score = total > 0 ? (positiveCount - negativeCount) / total : 0;

      sentiment = {
        score,
        label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      };
    }

    return {
      textLength,
      wordCount,
      sentenceCount,
      keywords,
      entities,
      sentiment,
      processingTimeMs: Date.now() - startTime,
    };
  },
};

// =============================================================================
// ツール登録ヘルパー
// =============================================================================

/**
 * 標準ツール一覧
 */
export const STANDARD_TOOLS = [SearchTool, ScrapeTool, AnalyzeTool] as const;

/**
 * 標準ツールをレジストリに登録
 */
export function registerStandardTools(
  registry: { register: (tool: ToolDefinition) => unknown },
): void {
  for (const tool of STANDARD_TOOLS) {
    registry.register(tool as unknown as ToolDefinition);
  }
}
