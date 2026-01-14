/**
 * LLM-Powered Dialogue Collector
 *
 * LLMを活用してユーザーの目的を深掘りする対話型情報収集システム
 *
 * @fileoverview REQ-011拡張: LLM連携による動的質問生成
 * @module @nahisaho/katashiro-orchestrator
 * @since 2.0.0
 */

import type {
  DialogueSession,
  DialogueQuestion,
  ExtractedContext,
  QuestionCategory,
  BackgroundInfo,
  Constraint,
  SuccessCriterion,
} from './types';
import { DEFAULT_DIALOGUE_CONFIG } from './types';

/**
 * LLM Provider Interface
 */
export interface LLMProvider {
  generate(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string }>;
}

/**
 * LLM連携DialogueCollector設定
 */
export interface LLMDialogueConfig {
  /** LLMプロバイダー */
  llmProvider: LLMProvider;
  /** 生成温度（0.0-1.0） */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** システムプロンプト */
  systemPrompt?: string;
  /** 深掘りの最大深度 */
  maxDepth?: number;
  /** 最大質問数 */
  maxQuestions?: number;
  /** 最小質問数 */
  minQuestions?: number;
  /** 信頼度閾値 */
  confidenceThreshold?: number;
  /** 言語 */
  language?: 'ja' | 'en';
}

/**
 * 深掘りセッション
 */
export interface DeepDiveSession extends DialogueSession {
  /** 深掘りの深度 */
  depth: number;
  /** LLMが生成した質問履歴 */
  llmGeneratedQuestions: string[];
  /** 抽出されたキーインサイト */
  keyInsights: string[];
  /** 明確化が必要なポイント */
  clarificationNeeded: string[];
}

/**
 * 深掘り結果
 */
export interface DeepDiveResult {
  /** 元の入力 */
  originalInput: string;
  /** 推定された真の目的 */
  truePurpose: string;
  /** 信頼度（0-1） */
  confidence: number;
  /** 明確化されたコンテキスト */
  clarifiedContext: ExtractedContext;
  /** 推奨アクション */
  recommendedActions: string[];
  /** 対話サマリー */
  dialogueSummary: string;
  /** 抽出されたインサイト */
  insights: string[];
}

/**
 * 深掘り質問生成プロンプト
 */
const DEEP_DIVE_SYSTEM_PROMPT = `あなたは優秀なビジネスコンサルタントです。
ユーザーの曖昧な要望から、真の目的・ニーズを引き出すための質問を生成してください。

以下の原則に従ってください：
1. 1回に1つの質問のみ
2. オープンエンドな質問を優先
3. 「なぜ」「何のために」を深掘り
4. 具体的な背景・制約を明らかにする
5. 成功の定義を明確にする

質問カテゴリ：
- purpose: 目的・ゴール
- background: 背景・経緯
- constraints: 制約条件
- stakeholders: 関係者
- success: 成功基準
- timeline: スケジュール

回答形式：
{
  "question": "質問文",
  "category": "カテゴリ",
  "reasoning": "この質問をする理由"
}`;

/**
 * 意図推定プロンプト
 */
const INTENT_ANALYSIS_PROMPT = `以下の対話履歴から、ユーザーの真の目的を分析してください。

分析観点：
1. 表層的な要望（最初に言ったこと）
2. 真の目的（対話から推測される本質的なニーズ）
3. 隠れた制約や懸念
4. 成功の定義
5. 推奨アクション

回答形式：
{
  "surfaceIntent": "表層的な要望",
  "truePurpose": "真の目的",
  "confidence": 0.0-1.0,
  "insights": ["インサイト1", "インサイト2"],
  "clarifiedContext": {
    "purpose": "明確化された目的",
    "background": "背景",
    "constraints": ["制約1", "制約2"],
    "successCriteria": ["成功基準1", "成功基準2"]
  },
  "recommendedActions": ["アクション1", "アクション2"],
  "summary": "対話サマリー"
}`;

/**
 * LLMレスポンスの型
 */
interface QuestionResponse {
  sufficient?: boolean;
  question?: string;
  category?: string;
  reasoning?: string;
}

interface TerminationResponse {
  sufficient: boolean;
  confidence: number;
  missingAspects?: string[];
}

interface AnalysisResponse {
  surfaceIntent?: string;
  truePurpose?: string;
  confidence?: number;
  insights?: string[];
  clarifiedContext?: {
    purpose?: string;
    background?: string;
    constraints?: string[];
    successCriteria?: string[];
  };
  recommendedActions?: string[];
  summary?: string;
}

/**
 * LLM連携DialogueCollector
 *
 * LLMを使用してユーザーの目的を動的に深掘りします
 *
 * @example
 * ```typescript
 * import { OllamaLLMProvider } from '@nahisaho/katashiro-llm';
 *
 * const llm = new OllamaLLMProvider({
 *   baseUrl: 'http://192.168.224.1:11434',
 *   model: 'qwen2.5:7b',
 * });
 *
 * const collector = new LLMDialogueCollector({
 *   llmProvider: {
 *     generate: (req) => llm.generate(req),
 *   },
 *   language: 'ja',
 *   maxQuestions: 5,
 * });
 *
 * // 深掘りセッション開始
 * const result = await collector.deepDive('新しいシステムを導入したい', async (q) => {
 *   console.log('Q:', q.text);
 *   return await getUserInput();
 * });
 *
 * console.log('真の目的:', result.truePurpose);
 * ```
 */
export class LLMDialogueCollector {
  private readonly config: Required<LLMDialogueConfig>;
  private readonly sessions: Map<string, DeepDiveSession>;

  constructor(config: LLMDialogueConfig) {
    this.config = {
      llmProvider: config.llmProvider,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1024,
      systemPrompt: config.systemPrompt ?? DEEP_DIVE_SYSTEM_PROMPT,
      maxDepth: config.maxDepth ?? 5,
      maxQuestions: config.maxQuestions ?? DEFAULT_DIALOGUE_CONFIG.maxQuestions,
      minQuestions: config.minQuestions ?? DEFAULT_DIALOGUE_CONFIG.minQuestions,
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_DIALOGUE_CONFIG.confidenceThreshold,
      language: config.language ?? DEFAULT_DIALOGUE_CONFIG.language,
    };
    this.sessions = new Map();
  }

  /**
   * 深掘り対話を実行
   *
   * @param initialInput ユーザーの初期入力
   * @param answerCallback 質問に対する回答を取得するコールバック
   * @returns 深掘り結果
   */
  async deepDive(
    initialInput: string,
    answerCallback: (question: DialogueQuestion) => Promise<string>
  ): Promise<DeepDiveResult> {
    const session = this.startSession(initialInput);

    try {
      // 深掘り質問ループ
      while (session.depth < this.config.maxDepth) {
        // LLMで次の質問を生成
        const question = await this.generateNextQuestion(session);

        if (!question) {
          // 十分な情報が得られた
          break;
        }

        // ユーザーの回答を取得
        const answer = await answerCallback(question);

        // 回答を記録
        this.recordAnswer(session, question, answer);

        // 終了判定
        if (await this.shouldTerminate(session)) {
          break;
        }

        session.depth++;
      }

      // 最終分析
      return await this.analyzeAndSummarize(session);
    } finally {
      session.status = 'completed';
      session.endTime = new Date();
    }
  }

  /**
   * セッション開始
   */
  private startSession(initialInput: string): DeepDiveSession {
    const sessionId = `deep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session: DeepDiveSession = {
      id: sessionId,
      startTime: new Date(),
      status: 'in_progress',
      initialInput,
      exchanges: [],
      extractedContext: this.createEmptyContext(),
      inferredIntent: null,
      depth: 0,
      llmGeneratedQuestions: [],
      keyInsights: [],
      clarificationNeeded: [],
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * LLMで次の質問を生成
   */
  private async generateNextQuestion(
    session: DeepDiveSession
  ): Promise<DialogueQuestion | null> {
    const conversationHistory = this.buildConversationHistory(session);

    const prompt = `${this.config.systemPrompt}

## これまでの対話履歴
${conversationHistory}

## 指示
上記の対話履歴を踏まえ、ユーザーの目的をさらに深掘りするための次の質問を1つ生成してください。
十分な情報が得られた場合は、"sufficient": true を返してください。

回答はJSON形式で：
{
  "sufficient": false,
  "question": "質問文",
  "category": "purpose|background|constraints|stakeholders|success|timeline",
  "reasoning": "この質問をする理由"
}`;

    try {
      const response = await this.config.llmProvider.generate({
        messages: [
          { role: 'system', content: 'あなたはJSON形式で回答するアシスタントです。' },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      const parsed = this.parseJsonResponse<QuestionResponse>(response.content);

      if (parsed.sufficient) {
        return null;
      }

      const question: DialogueQuestion = {
        id: `q-${session.depth + 1}`,
        text: parsed.question ?? '詳しく教えていただけますか？',
        type: 'open',
        category: (parsed.category as QuestionCategory) || 'purpose',
        hint: parsed.reasoning,
      };

      session.llmGeneratedQuestions.push(question.text);
      return question;
    } catch (error) {
      console.error('Failed to generate question:', error);
      return null;
    }
  }

  /**
   * 回答を記録
   */
  private recordAnswer(
    session: DeepDiveSession,
    question: DialogueQuestion,
    answer: string
  ): void {
    session.exchanges.push({
      id: `ex-${session.exchanges.length + 1}`,
      question,
      answer: {
        text: answer,
        confidence: 1.0,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    });
  }

  /**
   * 終了判定
   */
  private async shouldTerminate(session: DeepDiveSession): Promise<boolean> {
    // 最小質問数に達していない場合は継続
    if (session.exchanges.length < this.config.minQuestions) {
      return false;
    }

    // 最大質問数に達した場合は終了
    if (session.exchanges.length >= this.config.maxQuestions) {
      return true;
    }

    // LLMに終了判定を依頼
    const conversationHistory = this.buildConversationHistory(session);

    const prompt = `以下の対話履歴を見て、ユーザーの目的を明確にするための情報が十分に得られたかどうか判定してください。

## 対話履歴
${conversationHistory}

## 判定基準
- 目的が明確になったか
- 背景や制約が把握できたか
- 成功基準が定義されたか

回答は以下のJSON形式で：
{
  "sufficient": true または false,
  "confidence": 0.0-1.0,
  "missingAspects": ["不足している情報1", "不足している情報2"]
}`;

    try {
      const response = await this.config.llmProvider.generate({
        messages: [
          { role: 'system', content: 'あなたはJSON形式で回答するアシスタントです。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 512,
      });

      const parsed = this.parseJsonResponse<TerminationResponse>(response.content);

      if (!parsed.sufficient && parsed.missingAspects) {
        session.clarificationNeeded = parsed.missingAspects;
      }

      return parsed.sufficient && parsed.confidence >= this.config.confidenceThreshold;
    } catch {
      return session.exchanges.length >= 3;
    }
  }

  /**
   * 最終分析とサマリー生成
   */
  private async analyzeAndSummarize(
    session: DeepDiveSession
  ): Promise<DeepDiveResult> {
    const conversationHistory = this.buildConversationHistory(session);

    const prompt = `${INTENT_ANALYSIS_PROMPT}

## 対話履歴
${conversationHistory}

上記の対話履歴から、ユーザーの真の目的を分析してください。`;

    try {
      const response = await this.config.llmProvider.generate({
        messages: [
          { role: 'system', content: 'あなたはJSON形式で回答する分析アシスタントです。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 2048,
      });

      const parsed = this.parseJsonResponse<AnalysisResponse>(response.content);

      return {
        originalInput: session.initialInput,
        truePurpose: parsed.truePurpose ?? session.initialInput,
        confidence: parsed.confidence ?? 0.5,
        clarifiedContext: this.mergeContext(
          session.extractedContext,
          parsed.clarifiedContext
        ),
        recommendedActions: parsed.recommendedActions ?? [],
        dialogueSummary: parsed.summary ?? this.buildSimpleSummary(session),
        insights: parsed.insights ?? session.keyInsights,
      };
    } catch {
      // フォールバック
      return {
        originalInput: session.initialInput,
        truePurpose: session.initialInput,
        confidence: 0.3,
        clarifiedContext: session.extractedContext,
        recommendedActions: [],
        dialogueSummary: this.buildSimpleSummary(session),
        insights: session.keyInsights,
      };
    }
  }

  /**
   * 対話履歴を文字列に変換
   */
  private buildConversationHistory(session: DeepDiveSession): string {
    const lines: string[] = [];
    lines.push(`初期入力: ${session.initialInput}`);
    lines.push('');

    for (const exchange of session.exchanges) {
      lines.push(`Q: ${exchange.question.text}`);
      lines.push(`A: ${exchange.answer?.text ?? '(未回答)'}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * JSONレスポンスをパース
   */
  private parseJsonResponse<T>(content: string): T {
    // コードブロックを除去
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonStr = codeBlockMatch[1];
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // 部分的なJSONを抽出
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          return {} as T;
        }
      }
      return {} as T;
    }
  }

  /**
   * 空のコンテキストを作成
   */
  private createEmptyContext(): ExtractedContext {
    return {
      explicitPurpose: null,
      implicitPurpose: null,
      background: {
        reason: null,
        currentState: null,
        desiredState: null,
        attemptedSolutions: [],
      },
      constraints: [],
      stakeholders: [],
      successCriteria: [],
      priorities: [],
      risks: [],
      keywords: [],
      domain: null,
      urgency: 'medium',
      complexity: 'moderate',
    };
  }

  /**
   * コンテキストをマージ
   */
  private mergeContext(
    base: ExtractedContext,
    parsed: AnalysisResponse['clarifiedContext'] | undefined
  ): ExtractedContext {
    if (!parsed) return base;

    const background: BackgroundInfo = {
      reason: parsed.background ?? base.background.reason,
      currentState: base.background.currentState,
      desiredState: base.background.desiredState,
      attemptedSolutions: base.background.attemptedSolutions,
    };

    const constraints: Constraint[] = Array.isArray(parsed.constraints)
      ? parsed.constraints.map((c) => ({
          type: 'other' as const,
          description: c,
          strictness: 3,
        }))
      : base.constraints;

    const successCriteria: SuccessCriterion[] = Array.isArray(parsed.successCriteria)
      ? parsed.successCriteria.map((c) => ({
          criterion: c,
          measurable: false,
          importance: 4,
        }))
      : base.successCriteria;

    return {
      ...base,
      explicitPurpose: parsed.purpose ?? base.explicitPurpose,
      background,
      constraints,
      successCriteria,
    };
  }

  /**
   * シンプルなサマリーを生成
   */
  private buildSimpleSummary(session: DeepDiveSession): string {
    const questionCount = session.exchanges.length;
    return `${questionCount}回の質問を通じて、ユーザーの目的「${session.initialInput}」を深掘りしました。`;
  }
}

/**
 * シンプルな深掘り対話を実行するヘルパー関数
 */
export async function runDeepDiveDialogue(
  llmProvider: LLMProvider,
  initialInput: string,
  answerCallback: (question: DialogueQuestion) => Promise<string>,
  options: Partial<Omit<LLMDialogueConfig, 'llmProvider'>> = {}
): Promise<DeepDiveResult> {
  const collector = new LLMDialogueCollector({
    ...options,
    llmProvider,
  });

  return collector.deepDive(initialInput, answerCallback);
}
