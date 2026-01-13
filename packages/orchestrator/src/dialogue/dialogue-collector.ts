/**
 * Dialogue Collector
 *
 * @fileoverview MUSUBIX風の対話型情報収集システム
 *               1問1答形式でユーザーの真の意図を引き出す
 * @module @nahisaho/katashiro-orchestrator
 * @since 0.4.1
 */

import type {
  DialogueSession,
  DialogueExchange,
  DialogueQuestion,
  DialogueCollectorConfig,
  ExtractedContext,
  InferredIntent,
} from './types';
import { DEFAULT_DIALOGUE_CONFIG } from './types';
import { QuestionGenerator } from './question-generator';
import { IntentAnalyzer } from './intent-analyzer';

/**
 * 対話型情報収集器
 *
 * MUSUBIXのように、ユーザーとの対話を通じて
 * 真の意図・目的を明らかにします
 *
 * @example
 * ```typescript
 * const collector = new DialogueCollector();
 *
 * // セッション開始
 * const session = collector.startSession('新しいシステムを導入したい');
 *
 * // 最初の質問を取得
 * let question = collector.getNextQuestion(session.id);
 *
 * while (question) {
 *   console.log(question.text);
 *   const userAnswer = await getUserInput();
 *
 *   // 回答を記録
 *   collector.recordAnswer(session.id, userAnswer);
 *
 *   // 次の質問を取得
 *   question = collector.getNextQuestion(session.id);
 * }
 *
 * // 最終結果を取得
 * const result = collector.getResult(session.id);
 * console.log('真の意図:', result.inferredIntent.trueIntent);
 * ```
 */
export class DialogueCollector {
  private readonly config: DialogueCollectorConfig;
  private readonly questionGenerator: QuestionGenerator;
  private readonly intentAnalyzer: IntentAnalyzer;
  private readonly sessions: Map<string, DialogueSession>;

  constructor(config: Partial<DialogueCollectorConfig> = {}) {
    this.config = { ...DEFAULT_DIALOGUE_CONFIG, ...config };
    this.questionGenerator = new QuestionGenerator(this.config.language);
    this.intentAnalyzer = new IntentAnalyzer(this.config.language);
    this.sessions = new Map();
  }

  /**
   * 新しい対話セッションを開始
   */
  startSession(initialInput: string): DialogueSession {
    const sessionId = this.generateSessionId();

    const session: DialogueSession = {
      id: sessionId,
      startTime: new Date(),
      status: 'in_progress',
      initialInput,
      exchanges: [],
      extractedContext: this.createEmptyContext(),
      inferredIntent: null,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): DialogueSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 次の質問を取得
   */
  getNextQuestion(sessionId: string): DialogueQuestion | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // セッションが終了している場合
    if (session.status !== 'in_progress') {
      return null;
    }

    // 最大質問数に達した場合
    if (session.exchanges.length >= this.config.maxQuestions) {
      this.finalizeSession(session);
      return null;
    }

    // 信頼度が閾値を超えた場合（最小質問数を満たしていれば）
    if (session.exchanges.length >= this.config.minQuestions) {
      const currentIntent = this.intentAnalyzer.analyzeIntent(
        session.initialInput,
        session.exchanges
      );

      if (currentIntent.confidence >= this.config.confidenceThreshold) {
        // 確認質問を生成
        const confirmQuestion = this.questionGenerator.generateConfirmationQuestion(
          session.extractedContext,
          currentIntent
        );
        return confirmQuestion;
      }
    }

    // 通常の質問を生成
    return this.questionGenerator.generateNextQuestion(
      session.extractedContext,
      session.exchanges,
      this.config.strategy
    );
  }

  /**
   * 回答を記録
   */
  recordAnswer(
    sessionId: string,
    answerText: string,
    metadata?: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 最後の未回答の質問を探す
    const lastExchange = session.exchanges[session.exchanges.length - 1];
    if (lastExchange && lastExchange.answer === null) {
      // 既存の質問に回答を追加
      lastExchange.answer = {
        text: answerText,
        timestamp: new Date(),
        confidence: 1.0,
        metadata,
      };
    } else {
      // 新しい交換を作成（質問なしで回答のみ）
      const newExchange: DialogueExchange = {
        id: this.generateExchangeId(),
        question: this.questionGenerator.generateNextQuestion(
          session.extractedContext,
          session.exchanges,
          this.config.strategy
        )!,
        answer: {
          text: answerText,
          timestamp: new Date(),
          confidence: 1.0,
          metadata,
        },
        timestamp: new Date(),
      };
      session.exchanges.push(newExchange);
    }

    // コンテキストを更新
    this.updateContext(session);

    // セッション状態を確認
    this.checkSessionState(session);
  }

  /**
   * 質問を提示（回答待ち状態にする）
   */
  presentQuestion(sessionId: string, question: DialogueQuestion): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const exchange: DialogueExchange = {
      id: this.generateExchangeId(),
      question,
      answer: null,
      timestamp: new Date(),
    };

    session.exchanges.push(exchange);
  }

  /**
   * セッションの結果を取得
   */
  getResult(sessionId: string): {
    session: DialogueSession;
    context: ExtractedContext;
    inferredIntent: InferredIntent;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // まだ意図が推測されていない場合は推測する
    if (!session.inferredIntent) {
      session.inferredIntent = this.intentAnalyzer.analyzeIntent(
        session.initialInput,
        session.exchanges
      );
      session.extractedContext = this.intentAnalyzer.extractContext(
        session.initialInput,
        session.exchanges
      );
    }

    return {
      session,
      context: session.extractedContext,
      inferredIntent: session.inferredIntent,
    };
  }

  /**
   * 追加の明確化質問を生成
   */
  generateClarificationQuestion(
    sessionId: string,
    ambiguousPoint: string
  ): DialogueQuestion {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return this.questionGenerator.generateClarificationQuestion(
      ambiguousPoint,
      session.extractedContext
    );
  }

  /**
   * セッションを完了としてマーク
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.finalizeSession(session);
  }

  /**
   * セッションをキャンセル
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'cancelled';
    session.endTime = new Date();
  }

  /**
   * セッションを削除
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 全セッションを取得
   */
  getAllSessions(): DialogueSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 対話フローを一括実行（コールバック形式）
   */
  async runDialogue(
    initialInput: string,
    answerCallback: (question: DialogueQuestion) => Promise<string>
  ): Promise<{
    context: ExtractedContext;
    inferredIntent: InferredIntent;
  }> {
    const session = this.startSession(initialInput);

    let question = this.getNextQuestion(session.id);

    while (question) {
      // 質問を提示
      this.presentQuestion(session.id, question);

      // ユーザーからの回答を待つ
      const answer = await answerCallback(question);

      // 回答を記録
      this.recordAnswer(session.id, answer);

      // 次の質問を取得
      question = this.getNextQuestion(session.id);
    }

    return this.getResult(session.id);
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `dlg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * 交換IDを生成
   */
  private generateExchangeId(): string {
    return `exc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
   * コンテキストを更新
   */
  private updateContext(session: DialogueSession): void {
    session.extractedContext = this.intentAnalyzer.extractContext(
      session.initialInput,
      session.exchanges
    );
  }

  /**
   * セッション状態をチェック
   */
  private checkSessionState(session: DialogueSession): void {
    // 確認質問への回答を確認
    const lastExchange = session.exchanges[session.exchanges.length - 1];
    if (
      lastExchange?.question.type === 'confirmation' &&
      lastExchange.answer
    ) {
      const answer = lastExchange.answer.text.toLowerCase();
      const positivePatterns = this.config.language === 'ja'
        ? /はい|そうです|その通り|ok|yes/
        : /yes|correct|right|exactly|confirm/;

      if (positivePatterns.test(answer)) {
        this.finalizeSession(session);
      }
    }
  }

  /**
   * セッションを終了
   */
  private finalizeSession(session: DialogueSession): void {
    session.status = 'completed';
    session.endTime = new Date();

    // 最終的な意図を推測
    session.inferredIntent = this.intentAnalyzer.analyzeIntent(
      session.initialInput,
      session.exchanges
    );

    // コンテキストを最終更新
    session.extractedContext = this.intentAnalyzer.extractContext(
      session.initialInput,
      session.exchanges
    );
  }
}

/**
 * シンプルな対話実行ヘルパー
 *
 * @example
 * ```typescript
 * const result = await runSimpleDialogue('新製品を開発したい', async (q) => {
 *   console.log('Q:', q.text);
 *   return await getUserInput();
 * });
 * console.log('意図:', result.inferredIntent.trueIntent);
 * ```
 */
export async function runSimpleDialogue(
  initialInput: string,
  answerCallback: (question: DialogueQuestion) => Promise<string>,
  config?: Partial<DialogueCollectorConfig>
): Promise<{
  context: ExtractedContext;
  inferredIntent: InferredIntent;
}> {
  const collector = new DialogueCollector(config);
  return collector.runDialogue(initialInput, answerCallback);
}
