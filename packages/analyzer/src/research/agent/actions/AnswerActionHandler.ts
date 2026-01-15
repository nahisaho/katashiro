/**
 * AnswerActionHandler - 回答生成アクション
 *
 * @requirement REQ-DR-001
 * @requirement REQ-DR-004
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { LLMClientInterface, AnswerParams, KnowledgeItem } from '../types.js';
import type { AnswerEvaluator } from '../AnswerEvaluator.js';
import { BaseActionHandler, type ExecutionContext, type ActionResult, type ActionHandlerOptions } from './BaseActionHandler.js';

/**
 * 回答アクションハンドラのオプション
 */
export interface AnswerActionHandlerOptions extends ActionHandlerOptions {
  /** LLMクライアント */
  llmClient: LLMClientInterface;
  /** 回答評価器 */
  evaluator: AnswerEvaluator;
}

/**
 * 回答を生成するアクションハンドラ
 */
export class AnswerActionHandler extends BaseActionHandler<AnswerParams> {
  readonly actionType = 'answer' as const;

  private llmClient: LLMClientInterface;
  private evaluator: AnswerEvaluator;

  constructor(options: AnswerActionHandlerOptions) {
    super(options);
    this.llmClient = options.llmClient;
    this.evaluator = options.evaluator;
  }

  /**
   * 回答を生成
   */
  async execute(params: AnswerParams, context: ExecutionContext): Promise<ActionResult> {
    const { isFinal } = params;

    try {
      // ナレッジから回答を生成
      const generatedAnswer = await this.generateAnswer(
        context.question,
        context.currentKnowledge
      );

      // 回答を評価
      const evaluation = await this.evaluator.evaluate(
        context.question,
        generatedAnswer.answer,
        context.currentKnowledge
      );

      // 評価結果をナレッジアイテムとして保存
      const item = this.createKnowledgeItem(
        `Answer Attempt:\n\n${generatedAnswer.answer}\n\nEvaluation: ${evaluation.pass ? 'PASS' : 'FAIL'}\nDetails: ${evaluation.think}`,
        {
          type: 'reflection',
          title: isFinal ? 'Final Answer' : 'Answer Attempt',
        }
      );

      return {
        success: evaluation.pass || isFinal === true,
        knowledgeItems: [item],
        metadata: {
          answer: generatedAnswer.answer,
          references: generatedAnswer.references,
          evaluation,
          isFinal: isFinal === true,
        },
      };
    } catch (error) {
      return {
        success: false,
        knowledgeItems: [],
        error: error instanceof Error ? error.message : 'Answer generation failed',
      };
    }
  }

  /**
   * ナレッジから回答を生成
   */
  private async generateAnswer(
    question: string,
    knowledge: KnowledgeItem[]
  ): Promise<{ answer: string; references: string[] }> {
    // ナレッジをコンテキストとして構築
    const knowledgeContext = knowledge
      .map((k) => `[${k.id}] ${k.summary}\nSource: ${k.sourceId}`)
      .join('\n\n');

    const prompt = `Based on the gathered knowledge, provide a comprehensive answer to the question.

Question: "${question}"

Available Knowledge:
${knowledgeContext || 'No knowledge available.'}

Instructions:
1. Synthesize information from multiple sources
2. Provide a well-structured answer
3. Cite sources using [source-id] format
4. Acknowledge any gaps in the available information
5. Be factual and avoid speculation

Respond in JSON format:
{
  "answer": "Your comprehensive answer here...",
  "references": ["source-id-1", "source-id-2"]
}`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 2000,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          answer: string;
          references: string[];
        };
        return parsed;
      }
    } catch {
      // パース失敗
    }

    // デフォルト
    return {
      answer: response.content,
      references: knowledge.map((k) => k.sourceId),
    };
  }

  /**
   * Beastモード用の強制回答生成
   */
  async generateForcedAnswer(
    question: string,
    knowledge: KnowledgeItem[]
  ): Promise<{ answer: string; references: string[] }> {
    const knowledgeContext = knowledge
      .map((k) => k.summary)
      .join('\n')
      .slice(0, 5000);

    const prompt = `You MUST provide an answer now, even if incomplete.

Question: "${question}"

Available Information:
${knowledgeContext || 'Limited information available.'}

Instructions:
1. Provide the best possible answer with available information
2. Clearly indicate what is known vs. unknown
3. Suggest areas for further research if needed

Respond in JSON format:
{
  "answer": "Your answer here...",
  "references": [],
  "limitations": "What is not covered..."
}`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 2000,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          answer: string;
          references: string[];
        };
        return parsed;
      }
    } catch {
      // パース失敗
    }

    return {
      answer: response.content,
      references: [],
    };
  }
}
